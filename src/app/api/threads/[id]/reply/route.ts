import { NextResponse } from 'next/server';
import { SMTPService } from '@/lib/agent/services/smtpService';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const logFile = path.join(process.cwd(), 'agent.log');

function logger(message: string) {
    const timestamp = new Date().toLocaleString();
    const logLine = `[${timestamp}] [MANUAL] ${message}\n`;
    console.log(`[MANUAL] ${message}`);
    try {
        fs.appendFileSync(logFile, logLine);
    } catch(e) {}
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { reply, to, subject } = await req.json();
        const { id: threadId } = await params;

        logger(`Sending to: ${to}, Thread: ${threadId}, Subject: ${subject}`);

        if (!reply || !to || !subject) {
            logger(`Missing fields: ${JSON.stringify({ reply: !!reply, to: !!to, subject: !!subject })}`);
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const setting = await prisma.setting.findUnique({ where: { id: 'default' } });
        if (!setting?.targetEmail || !setting?.appPassword) {
            logger('No app password or email configured');
            return NextResponse.json({ error: 'Mail settings not configured' }, { status: 500 });
        }

        logger('Authorizing SMTP...');
        const smtp = new SMTPService(setting.targetEmail, setting.appPassword);

        let dbThread;
        if (threadId === 'new') {
            // Creating a manual entry for a brand new thread
            dbThread = await prisma.thread.create({
                data: {
                    gmailThreadId: `manual-thread-${Date.now()}`,
                    subject: subject
                }
            });
        } else {
            // Retrieve the DB thread with messages to get context
            dbThread = await prisma.thread.findUnique({
                where: { id: threadId },
                include: { messages: { orderBy: { timestamp: 'desc' } } }
            });

            if (!dbThread) {
                dbThread = await prisma.thread.findUnique({
                    where: { gmailThreadId: threadId },
                    include: { messages: { orderBy: { timestamp: 'desc' } } }
                });
            }
        }

        if (!dbThread) {
            logger(`Thread not found in DB: ${threadId}`);
            return NextResponse.json({ error: 'Thread not found in records' }, { status: 404 });
        }

        logger('Attempting SMTP send...');
        await smtp.sendReply(to, subject, reply);
        logger(`SMTP send success`);

        // Log the manual reply in DB
        const replyMsgId = `manual-${Date.now()}`;
        await prisma.message.create({
            data: {
                gmailMessageId: replyMsgId,
                threadId: dbThread.id,
                from: setting.targetEmail,
                to: to,
                content: reply,
                role: 'ai',
                contextType: 'manual',
                sentiment: 'neutral'
            }
        });
        
        // Update thread timestamp
        await prisma.thread.update({
            where: { id: dbThread.id },
            data: { lastUpdate: new Date() }
        });

        return NextResponse.json({ message: 'Reply sent successfully' });
    } catch (error: any) {
        logger(`Error: ${error.message}`);
        console.error('Manual Reply Error Detailed:', error);
        return NextResponse.json({ error: error.message || 'Failed to send reply' }, { status: 500 });
    }
}
