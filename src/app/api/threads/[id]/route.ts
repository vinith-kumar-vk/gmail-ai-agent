import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { IMAPService } from '@/lib/agent/services/imapService';

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: threadId } = await params;

        // Fetch thread and its messages to get Gmail Message IDs for trashing
        const thread = await prisma.thread.findUnique({
            where: { id: threadId },
            include: { messages: true }
        });

        if (thread) {
            // Try to trash in Gmail if credentials exist
            const settings = await prisma.setting.findUnique({ where: { id: 'default' } });
            if (settings?.targetEmail && settings.appPassword) {
                try {
                    const imap = new IMAPService(settings.targetEmail, settings.appPassword);
                    const rawIds = thread.messages
                        .map(m => m.rawMessageId)
                        .filter((id): id is string => !!id);
                    
                    if (rawIds.length > 0) {
                        await imap.trashMessages(rawIds);
                    }
                } catch (trashErr) {
                    console.error('Gmail Trash Sync Error:', trashErr);
                }
            }
        }

        await prisma.message.deleteMany({
            where: { threadId }
        });

        await prisma.thread.delete({
            where: { id: threadId }
        });

        return NextResponse.json({ message: 'Thread deleted locally' });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Failed to delete thread' }, { status: 500 });
    }
}
