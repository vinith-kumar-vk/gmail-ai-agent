import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const tokens = await prisma.gmailToken.findMany();
    console.log('Successfully accessed gmailToken table:', tokens);
  } catch (err) {
    console.error('Failed to access gmailToken table:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
