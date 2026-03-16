const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
    console.log("Starting database cleanup...");
    const targetEmail = "vinithkumar78876@gmail.com";

    try {
        // Delete messages that are NOT related to the target email
        const deleteMessages = await prisma.message.deleteMany({
            where: {
                NOT: {
                    OR: [
                        { from: { contains: targetEmail } },
                        { to: { contains: targetEmail } }
                    ]
                }
            }
        });
        console.log(`Deleted ${deleteMessages.count} irrelevant messages.`);

        // Delete threads that now have no messages
        const threads = await prisma.thread.findMany({
            include: { messages: true }
        });

        let deletedThreads = 0;
        for (const thread of threads) {
            if (thread.messages.length === 0) {
                await prisma.thread.delete({ where: { id: thread.id } });
                deletedThreads++;
            }
        }
        console.log(`Deleted ${deletedThreads} empty threads.`);

        console.log("Cleanup complete!");
    } catch (error) {
        console.error("Cleanup failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
