import rateLimit from "express-rate-limit";

const RATE_LIMIT_MESSAGE = { error: "rate_limited", message: "Too many requests. Please slow down." };

export const developerKeyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE,
});

// Stricter limit for uploads — large file uploads are expensive per-request
export const ingestUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE,
});
