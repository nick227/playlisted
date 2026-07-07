import { Router } from "express";

import { getShareOrigins } from "../share/shareRequest.js";
import { resolveShareMeta, resolveShareMetaFromUrl } from "../share/shareMeta.js";

export const shareRouter = Router();

shareRouter.get("/meta", async (req, res, next) => {
  try {
    const origins = getShareOrigins(req);
    const urlValue = typeof req.query.url === "string" ? req.query.url : null;

    const meta = urlValue
      ? await resolveShareMetaFromUrl(urlValue, origins)
      : await resolveShareMeta("/", origins);

    res.setHeader("Cache-Control", "no-store");
    return res.json(meta);
  } catch (error) {
    return next(error);
  }
});

function pathnameFromShareDebugRequest(reqPath: string, prefix: "/debug" | "/preview"): string {
  const suffix = reqPath.startsWith(prefix) ? reqPath.slice(prefix.length) : reqPath;
  if (!suffix || suffix === "/") return "/";
  return suffix.startsWith("/") ? suffix : `/${suffix}`;
}

shareRouter.get(/^\/debug(\/.*)?$/, async (req, res, next) => {
  try {
    const origins = getShareOrigins(req);
    const pathname = pathnameFromShareDebugRequest(req.path, "/debug");
    const meta = await resolveShareMeta(pathname, origins);
    res.setHeader("Cache-Control", "no-store");
    return res.json(meta);
  } catch (error) {
    return next(error);
  }
});

shareRouter.get(/^\/preview(\/.*)?$/, async (req, res, next) => {
  try {
    const origins = getShareOrigins(req);
    const pathname = pathnameFromShareDebugRequest(req.path, "/preview");
    const meta = await resolveShareMeta(pathname, origins);
    res.setHeader("Cache-Control", "no-store");
    return res.json({
      pathname,
      meta,
      preview: {
        title: meta.title,
        description: meta.description,
        image: meta.image,
        url: meta.url,
        type: meta.type,
      },
    });
  } catch (error) {
    return next(error);
  }
});
