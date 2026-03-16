import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const stats = {
            total: await prisma.message.count({ where: { role: 'user' } }),
            positive: await prisma.message.count({ where: { sentiment: 'positive' } }),
            neutral: await prisma.message.count({ where: { sentiment: 'neutral' } }),
            negative: await prisma.message.count({ where: { sentiment: 'negative' } }),
            byRole: await prisma.message.groupBy({
                by: ['role'],
                _count: { _all: true }
            })
        };
        console.log('Sentiment Stats:', JSON.stringify(stats, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
