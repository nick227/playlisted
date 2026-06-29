import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const recordings = await prisma.recording.findMany({
    where: { title: { contains: "house on rising sun" } }
  });
  console.log(recordings.map(r => ({ id: r.id, title: r.title, audioUrl: r.audioUrl, created: r.createdAt })));
}
main().finally(() => prisma.$disconnect());
