import prisma from './src/lib/prisma';

async function clearReplies() {
    console.log('Clearing previous AI replies for testing...');
    const deleted = await prisma.message.deleteMany({
        where: {
            gmailMessageId: {
                startsWith: 'ai-'
            }
        }
    });
    console.log(`Deleted ${deleted.count} AI reply records.`);
}

clearReplies();
