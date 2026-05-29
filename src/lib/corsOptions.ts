import type { CorsOptions } from "cors";

export function getCorsOptions(): CorsOptions {
  const origin = process.env.CORS_ORIGIN?.trim();
  if (!origin) {
    return {};
  }

  return { origin };
}
