import { createReadStream } from "node:fs";
import fs from "node:fs/promises";

import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

/** Use multipart upload for large files (slow uplinks, R2/S3 reliability). */
const R2_MULTIPART_THRESHOLD_BYTES = 8 * 1024 * 1024;

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required when STORAGE_PROVIDER=r2.`);
  return value;
}

function publicBaseUrl() {
  return (process.env.UPLOADS_PUBLIC_BASE_URL ?? process.env.R2_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
}

let client: S3Client | null = null;

function endpointUrl() {
  if (process.env.R2_ENDPOINT) return process.env.R2_ENDPOINT;
  const accountId = process.env.R2_ACCOUNT_ID;
  if (accountId) return `https://${accountId}.r2.cloudflarestorage.com`;
  throw new Error("R2_ENDPOINT or R2_ACCOUNT_ID is required when STORAGE_PROVIDER=r2.");
}

function getClient() {
  client ??= new S3Client({
    region: "auto",
    endpoint: endpointUrl(),
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

export function isR2StorageEnabled() {
  if (process.env.NODE_ENV === "test" && process.env.STORAGE_PROVIDER_TEST_REMOTE !== "true") {
    return false;
  }
  return process.env.STORAGE_PROVIDER === "r2";
}

export function r2PublicUrlForKey(key: string) {
  const baseUrl = publicBaseUrl();
  if (!baseUrl) throw new Error("R2_PUBLIC_BASE_URL or UPLOADS_PUBLIC_BASE_URL is required when STORAGE_PROVIDER=r2.");
  return `${baseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function uploadFileToR2(input: {
  key: string;
  filePath: string;
  contentType: string;
}) {
  const stat = await fs.stat(input.filePath);
  const bucket = requireEnv("R2_BUCKET_NAME");
  const client = getClient();
  const body = createReadStream(input.filePath);

  if (stat.size >= R2_MULTIPART_THRESHOLD_BYTES) {
    const upload = new Upload({
      client,
      params: {
        Bucket: bucket,
        Key: input.key,
        Body: body,
        ContentType: input.contentType,
      },
      queueSize: 4,
      partSize: 8 * 1024 * 1024,
      leavePartsOnError: false,
    });
    await upload.done();
  } else {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: input.key,
        Body: body,
        ContentLength: stat.size,
        ContentType: input.contentType,
      }),
    );
  }

  return {
    key: input.key,
    url: r2PublicUrlForKey(input.key),
  };
}

export async function deleteObjectFromR2(key: string) {
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: requireEnv("R2_BUCKET_NAME"),
      Key: key,
    }),
  );
}

export async function headObjectFromR2(key: string) {
  return getClient().send(
    new HeadObjectCommand({
      Bucket: requireEnv("R2_BUCKET_NAME"),
      Key: key,
    }),
  );
}
