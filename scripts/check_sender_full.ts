import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const senderPart = 'vinithkumar78878';
    console.log(`Checking for all data related to sender: ${senderPart}`);
    try {
        const threads = await prisma.thread.findMany({
            where: {
                messages: {
                    some: {
                        from: {
                            contains: senderPart
                        }
                    }
                }
            },
            include: {
                messages: {
                    orderBy: {
                        timestamp: 'asc'
                    }
                }
            }
        });

        console.log(`Found ${threads.length} threads.`);
        threads.forEach(t => {
            console.log(`\nThread ID: ${t.id} (Gmail: ${t.gmailThreadId}) | Subject: ${t.subject}`);
            t.messages.forEach(m => {
                console.log(`  [${m.timestamp.toISOString()}] ROLE: ${m.role.toUpperCase()} | FROM: ${m.from} | SENTIMENT: ${m.sentiment} | CONTENT: ${m.content.substring(0, 100)}...`);
            });
        });

    } catch (error) {
        console.error('DB Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
