import { prisma } from "./prisma.js";

type AssetKind = "audio" | "image";

interface ResolvedAsset {
  id: string;
  url: string;
  kind: string;
  mimeType: string;
  bytes: number;
}

interface AssetError {
  status: number;
  error: string;
  message: string;
}

export async function resolveUploadAsset(
  uploadId: string,
  ownerUserId: string,
  expectedKind: AssetKind,
): Promise<{ asset: ResolvedAsset } | { assetError: AssetError }> {
  const asset = await prisma.uploadAsset.findUnique({
    where: { id: uploadId },
    select: { id: true, userId: true, kind: true, url: true, mimeType: true, bytes: true },
  });

  if (!asset) {
    return {
      assetError: {
        status: 404,
        error: "upload_not_found",
        message: `Upload asset '${uploadId}' was not found.`,
      },
    };
  }

  if (asset.userId !== ownerUserId) {
    return {
      assetError: {
        status: 403,
        error: "upload_forbidden",
        message: `Upload asset '${uploadId}' does not belong to your account.`,
      },
    };
  }

  if (asset.kind !== expectedKind) {
    return {
      assetError: {
        status: 400,
        error: "upload_kind_mismatch",
        message: `Upload asset '${uploadId}' has kind '${asset.kind}' but '${expectedKind}' was expected.`,
      },
    };
  }

  return { asset: asset as ResolvedAsset };
}
