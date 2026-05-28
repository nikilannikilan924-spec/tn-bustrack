let prisma = null;
let PrismaClient = null;

try {
  ({ PrismaClient } = require('@prisma/client'));
} catch (_error) {
  PrismaClient = null;
}

function getPrisma() {
  if (!PrismaClient) return null;
  if (prisma) return prisma;
  try {
    prisma = new PrismaClient();
  } catch (_error) {
    prisma = null;
  }
  return prisma;
}

async function disconnectDb() {
  if (prisma) {
    await prisma.$disconnect();
  }
}

module.exports = { getPrisma, disconnectDb };
