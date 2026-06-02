import { Prisma } from "@prisma/client";
import { Router } from "express";

import { resolveRecordingArtworkUrl } from "../../lib/mediaUrls.js";
import { prisma } from "../../lib/prisma.js";
import { requireAdmin } from "../../lib/requireAdmin.js";

export const adminDashboardRouter = Router();

adminDashboardRouter.get("/", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const [
      totalUsers, newUsersToday, newUsersWeek,
      totalSongs, publishedSongs, draftSongs,
      totalPlaylists, publishedPlaylists,
      totalPlays, playsToday,
      totalPlaySeconds, playSecondsToday,
      totalSaves, totalFollows,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.recording.count(),
      prisma.recording.count({ where: { status: "PUBLISHED" } }),
      prisma.recording.count({ where: { status: "DRAFT" } }),
      prisma.playlist.count(),
      prisma.playlist.count({ where: { status: "PUBLISHED" } }),
      prisma.playbackEvent.count(),
      prisma.playbackEvent.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.playbackEvent.aggregate({ _sum: { playedSeconds: true } }).then((r) => r._sum.playedSeconds ?? 0),
      prisma.playbackEvent.aggregate({ where: { createdAt: { gte: todayStart } }, _sum: { playedSeconds: true } }).then((r) => r._sum.playedSeconds ?? 0),
      Promise.all([prisma.recordingSave.count(), prisma.playlistSave.count()]).then(([r, p]) => r + p),
      prisma.userFollow.count(),
    ]);

    // Hourly plays — last 24 hours (MySQL DATE_FORMAT)
    const hourlyRows = await prisma.$queryRaw<{ hour: string; plays: bigint }[]>(
      Prisma.sql`
        SELECT DATE_FORMAT(createdAt, '%Y-%m-%d %H:00') AS hour, COUNT(*) AS plays
        FROM PlaybackEvent
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY hour
        ORDER BY hour ASC`
    );

    // Daily plays — last 30 days
    const dailyPlaysRows = await prisma.$queryRaw<{ day: string; plays: bigint }[]>(
      Prisma.sql`
        SELECT DATE(createdAt) AS day, COUNT(*) AS plays
        FROM PlaybackEvent
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY day
        ORDER BY day ASC`
    );

    // Daily new users — last 30 days
    const dailyUsersRows = await prisma.$queryRaw<{ day: string; newUsers: bigint }[]>(
      Prisma.sql`
        SELECT DATE(createdAt) AS day, COUNT(*) AS newUsers
        FROM User
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY day
        ORDER BY day ASC`
    );

    // Top 5 songs today
    const topSongsToday = await prisma.playbackEvent.groupBy({
      by: ["recordingId"],
      where: { createdAt: { gte: todayStart } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });
    const topSongIds = topSongsToday.map((r) => r.recordingId);
    const topSongDetails = topSongIds.length > 0
      ? await prisma.recording.findMany({
          where: { id: { in: topSongIds } },
          select: {
            id: true,
            title: true,
            artworkUrl: true,
            uploader: { select: { displayName: true } },
            publishedPlaylist: { select: { coverArtUrl: true } },
          },
        })
      : [];
    const topSongMap = new Map(topSongDetails.map((r) => [r.id, r]));

    return res.json({
      totals: {
        users: { total: totalUsers, newToday: newUsersToday, newThisWeek: newUsersWeek },
        songs: { total: totalSongs, published: publishedSongs, draft: draftSongs },
        playlists: { total: totalPlaylists, published: publishedPlaylists },
        plays: { total: totalPlays, today: playsToday },
        playSeconds: { total: totalPlaySeconds, today: playSecondsToday },
        saves: totalSaves,
        follows: totalFollows,
      },
      hourlyPlays: hourlyRows.map((r) => ({ hour: r.hour, plays: Number(r.plays) })),
      dailyPlays: dailyPlaysRows.map((r) => ({ day: String(r.day), plays: Number(r.plays) })),
      dailyNewUsers: dailyUsersRows.map((r) => ({ day: String(r.day), newUsers: Number(r.newUsers) })),
      topSongsToday: topSongsToday.map((r) => {
        const detail = topSongMap.get(r.recordingId);
        return {
          recordingId: r.recordingId,
          plays: r._count.id,
          title: detail?.title ?? "Unknown",
          artworkUrl: detail ? resolveRecordingArtworkUrl(detail, detail.publishedPlaylist) : null,
          artist: detail?.uploader.displayName ?? "Unknown",
        };
      }),
    });
  } catch (error) {
    next(error);
  }
});
