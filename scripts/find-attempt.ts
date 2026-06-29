import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const all = await prisma.recording.findMany({
    include: { subtitle: { include: { attempts: true } } }
  });
  const matches = all.filter(r => r.title.toLowerCase().includes("summer"));
  console.dir(matches, { depth: null });
}
main().finally(() => prisma.$disconnect());
