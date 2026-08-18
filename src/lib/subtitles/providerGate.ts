import { prisma } from "../prisma.js";

const PROVIDER = "modal";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export async function getActivePause(): Promise<{ pausedUntil: Date; lastError: string | null } | null> {
  const row = await prisma.subtitleProviderPause.findUnique({ where: { provider: PROVIDER } });
  if (!row?.pausedUntil) return null;
  if (row.pausedUntil.getTime() <= Date.now()) return null;
  return { pausedUntil: row.pausedUntil, lastError: row.lastError };
}

export async function pauseProvider(cooldownMs: number, lastError: string): Promise<Date> {
  const pausedUntil = new Date(Date.now() + cooldownMs);
  await prisma.subtitleProviderPause.upsert({
    where: { provider: PROVIDER },
    create: { provider: PROVIDER, pausedUntil, lastError },
    update: { pausedUntil, lastError },
  });
  return pausedUntil;
}

export async function clearPause(): Promise<void> {
  await prisma.subtitleProviderPause.updateMany({
    where: { provider: PROVIDER, pausedUntil: { not: null } },
    data: { pausedUntil: null, lastError: null },
  });
}

/**
 * Pessimistic, no-refund duration budget check. Sums already-reserved
 * inputDurationSeconds (attempts are created immediately before the Modal
 * call and never deleted, so a failed/crashed call still counts) plus the
 * duration this job would add, against the daily/monthly ceilings.
 */
export async function checkDurationBudget(
  additionalSeconds: number,
  dailyMaxSeconds: number,
  monthlyMaxSeconds: number,
): Promise<{ dailyUsed: number; monthlyUsed: number; dailyExceeded: boolean; monthlyExceeded: boolean }> {
  const now = new Date();
  const [dailySum, monthlySum] = await Promise.all([
    prisma.recordingSubtitleAttempt.aggregate({
      where: { provider: PROVIDER, startedAt: { gte: startOfDay(now) } },
      _sum: { inputDurationSeconds: true },
    }),
    prisma.recordingSubtitleAttempt.aggregate({
      where: { provider: PROVIDER, startedAt: { gte: startOfMonth(now) } },
      _sum: { inputDurationSeconds: true },
    }),
  ]);

  const dailyUsed = dailySum._sum.inputDurationSeconds ?? 0;
  const monthlyUsed = monthlySum._sum.inputDurationSeconds ?? 0;

  return {
    dailyUsed,
    monthlyUsed,
    dailyExceeded: dailyUsed + additionalSeconds > dailyMaxSeconds,
    monthlyExceeded: monthlyUsed + additionalSeconds > monthlyMaxSeconds,
  };
}
