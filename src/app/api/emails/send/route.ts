import { NextResponse } from 'next/server';
import { authorize } from '@/lib/agent/utils/auth';
import { GmailService } from '@/lib/agent/services/gmailService';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { to, subject, content } = await req.json();

        if (!to || !subject || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const auth = await authorize();
        const gmail = new GmailService(auth);

        // Sanitize recipient
        const cleanTo = to.match(/<(.+)>|([^ ]+@[^ ]+)/)?.[1] || to;

        // Send generic email
        const res = await gmail.sendNewEmail(cleanTo, subject, content);

        // Save to database
        if (res.threadId && res.id) {
            await prisma.thread.upsert({
                where: { gmailThreadId: res.threadId },
                update: { lastUpdate: new Date() },
                create: {
                    gmailThreadId: res.threadId,
                    subject: subject,
                }
            });

            await prisma.message.create({
                data: {
                    gmailMessageId: res.id,
                    threadId: (await prisma.thread.findUnique({ where: { gmailThreadId: res.threadId } }))!.id,
                    from: 'me',
                    to: cleanTo,
                    content: content,
                    role: 'ai',
                    contextType: 'sent',
                    sentiment: 'neutral',
                    timestamp: new Date(),
                }
            });
        }

        return NextResponse.json({ message: 'Email sent successfully', data: res });
    } catch (error: any) {
        console.error('Send email error:', error);
        return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
    }
}
