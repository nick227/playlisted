import { Film, ImageIcon } from "lucide-react";

import type { VisualMediaAssetRecord } from "@/lib/visualMediaApi";

import { resolveAssetUrl } from "./types";

type MediaAssetThumbProps = {
  asset: VisualMediaAssetRecord;
  className?: string;
};

export function MediaAssetThumb({ asset, className = "" }: MediaAssetThumbProps) {
  const previewUrl = asset.thumbnailUrl ?? (asset.mediaType === "image" ? asset.url : null);

  return (
    <div className={["relative overflow-hidden bg-black", className].join(" ")}>
      {previewUrl ? (
        asset.mediaType === "video" && !asset.thumbnailUrl ? (
          <video
            src={resolveAssetUrl(asset.url)}
            className="h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <img
            src={resolveAssetUrl(previewUrl)}
            alt={asset.originalName}
            className="h-full w-full object-cover"
          />
        )
      ) : (
        <div className="flex h-full items-center justify-center text-white/30">
          {asset.mediaType === "video" ? <Film size={16} /> : <ImageIcon size={16} />}
        </div>
      )}
    </div>
  );
}
