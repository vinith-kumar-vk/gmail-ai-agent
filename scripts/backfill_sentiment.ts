import { PrismaClient } from '@prisma/client';
import { generateReply } from '../src/lib/agent/services/aiService';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Sentiment Backfill ---');
    try {
        const msgs = await prisma.message.findMany({
            where: {
                role: 'user',
                sentiment: 'neutral'
            }
        });

        console.log(`Analyzing ${msgs.length} messages...`);

        for (const m of msgs) {
            try {
                const thread = await prisma.thread.findUnique({
                    where: { id: m.threadId }
                });

                const { type, sentiment } = await generateReply({
                    subject: thread?.subject || 'No Subject',
                    from: m.from,
                    body: m.content
                });

                await prisma.message.update({
                    where: { id: m.id },
                    data: {
                        contextType: type,
                        sentiment: sentiment
                    }
                });
                console.log(`- Updated message ${m.gmailMessageId} from ${m.from}: ${sentiment}`);
            } catch (err) {
                console.error(`Failed to analyze message ${m.id}:`, err);
            }
        }
        console.log('--- Backfill Completed ---');
    } catch (error) {
        console.error('Error during backfill:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
