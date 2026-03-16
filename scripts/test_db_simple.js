const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDB() {
    try {
        const counts = await prisma.thread.count();
        console.log("DB SUCCESS: Total threads =", counts);
    } catch (e) {
        console.error("DB FAILURE:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

testDB();
