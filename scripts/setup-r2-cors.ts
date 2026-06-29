import "dotenv/config";
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function endpointUrl() {
  if (process.env.R2_ENDPOINT) return process.env.R2_ENDPOINT;
  const accountId = process.env.R2_ACCOUNT_ID;
  if (accountId) return `https://${accountId}.r2.cloudflarestorage.com`;
  throw new Error("R2_ENDPOINT or R2_ACCOUNT_ID is required.");
}

const client = new S3Client({
  region: "auto",
  endpoint: endpointUrl(),
  credentials: {
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
  },
});

async function main() {
  const bucket = requireEnv("R2_BUCKET_NAME");
  console.log(`Setting CORS policy for bucket: ${bucket}`);

  const command = new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET", "HEAD"],
          AllowedOrigins: ["*"],
          MaxAgeSeconds: 3000,
        },
      ],
    },
  });

  await client.send(command);
  console.log("CORS policy successfully updated.");
}

main().catch((err) => {
  console.error("Failed to update CORS:", err);
  process.exit(1);
});
