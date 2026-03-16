import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const sender = 'vinithkumar78878';
    console.log(`Checking for messages from: ${sender}`);
    try {
        const msgs = await prisma.message.findMany({
            where: {
                from: {
                    contains: sender
                }
            },
            orderBy: {
                timestamp: 'desc'
            }
        });
        console.log(`Found ${msgs.length} messages.`);
        if (msgs.length > 0) {
            msgs.forEach(m => {
                console.log(`- [${m.timestamp}] From: ${m.from} | Subject: (Thread: ${m.threadId}) | Content: ${m.content.substring(0, 50)}...`);
            });
        }
    } catch (error) {
        console.error('Error querying DB:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
