import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const threads = await prisma.thread.findMany({
            include: {
                messages: {
                    orderBy: {
                        timestamp: 'asc',
                    },
                },
            },
            orderBy: {
                lastUpdate: 'desc',
            },
        });

        const allThreads = await prisma.thread.findMany({
            include: { messages: true }
        });

        const stats = {
            total: allThreads.length,
            replied: allThreads.filter(t => t.messages.some(m => m.role === 'ai')).length,
            pending: allThreads.filter(t => !t.messages.some(m => m.role === 'ai')).length,
            flagged: allThreads.filter(t => t.messages.some(m => m.sentiment === 'negative')).length,
            // Sentiment stats for the chart
            positive: await prisma.message.count({ where: { sentiment: 'positive' } }),
            neutral: await prisma.message.count({ where: { sentiment: 'neutral' } }),
            negative: await prisma.message.count({ where: { sentiment: 'negative' } }),
        };

        const tokenPath = path.join(process.cwd(), 'token.json');
        const gmailAuthorized = fs.existsSync(tokenPath);

        return NextResponse.json({ threads, stats, gmailAuthorized });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch threads' }, { status: 500 });
    }
}
