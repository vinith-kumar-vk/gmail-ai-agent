import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { IMAPService } from '@/lib/agent/services/imapService';
import { SMTPService } from '@/lib/agent/services/smtpService';
import { generateReply } from '@/lib/agent/services/aiService';

const logFile = path.join(process.cwd(), 'agent.log');

export function logger(message: string) {
    const timestamp = new Date().toLocaleString();
    const logLine = `[${timestamp}] ${message}\n`;
    console.log(message);
    try {
        fs.appendFileSync(logFile, logLine);
    } catch(e) {}
}

export async function startAgent() {
    logger('--- Initializing Agent (v5.0 - EXACT 1:1 MIRROR MODE) ---');

    const pollEmails = async () => {
        try {
            const setting = await prisma.setting.findUnique({ where: { id: 'default' } });
            const targetEmail = (setting?.targetEmail || '').toLowerCase();
            const appPassword = setting?.appPassword || '';
            const autoReplyEnabled = setting?.autoReplyEnabled ?? false;

            if (!targetEmail || !appPassword) {
                logger('[WAITING] No credentials configured.');
                setTimeout(pollEmails, 15000);
                return;
            }

            logger(`--- Syncing [Account: ${targetEmail}] | Auto-Reply: ${autoReplyEnabled ? 'ON' : 'OFF'} ---`);

            const imap = new IMAPService(targetEmail, appPassword);
            const smtp = new SMTPService(targetEmail, appPassword);

            let allEmails;
            try {
                // Fetch from multiple folders (Inbox + Sent)
                allEmails = await imap.fetchRecentEmails(25);
            } catch (err: any) {
                logger(`[IMAP ERROR] ${err.message}`);
                setTimeout(pollEmails, 20000);
                return;
            }

            // Deduplicate across folders and sort by UID/Date isn't feasible easily here, 
            // so we process and handle duplicates in DB
            logger(`[SYNC] Processing ${allEmails.length} messages from all folders...`);

            for (const email of allEmails) {
                try {
                    const fromEmailLower = email.fromEmail.toLowerCase();
                    const isSelfEmail = fromEmailLower.includes(targetEmail);
                    
                    // Unified role detection: 
                    // If 'from' is the targetEmail, it's an 'ai' (sent) role. Otherwise 'user' (received).
                    const role = isSelfEmail ? 'ai' : 'user';

                    // Unique message ID across folders to prevent duplication
                    // Use standard messageId if available, clean it for Prisma if needed
                    const msgId = `msg-${Buffer.from(email.messageId).toString('base64').substring(0, 50)}`;

                    // Find or create thread
                    const gmailThreadId = `th-${email.threadKey.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 40)}`;

                    let dbThread = await prisma.thread.findUnique({
                        where: { gmailThreadId },
                        include: { messages: true }
                    });

                    if (!dbThread) {
                        dbThread = await prisma.thread.create({
                            data: { gmailThreadId, subject: email.subject },
                            include: { messages: true }
                        });
                    }

                    // Check if this message is already saved
                    const existingMsg = await prisma.message.findUnique({
                        where: { gmailMessageId: msgId }
                    });

                    if (existingMsg) {
                        // Permanent Solution: If content is empty, placeholder, or contains RAW HTML, fix it
                        const isHtml = existingMsg.content?.includes('<html') || 
                                       existingMsg.content?.includes('<!DOCTYPE') ||
                                       existingMsg.content?.includes('<div') ||
                                       existingMsg.content?.includes('<table');
                                       
                        if (!existingMsg.content || existingMsg.content.includes('(No body content)') || isHtml) {
                            const fixedBody = await imap.fetchEmailBody(email.uid, email.folder);
                            if (fixedBody && !fixedBody.includes('<html')) {
                                await prisma.message.update({
                                    where: { id: existingMsg.id },
                                    data: { content: fixedBody }
                                });
                                logger(`[FIXED HTML/EMPTY] ${email.subject}`);
                            }
                        }
                    } else {
                        logger(`[NEW ${role.toUpperCase()}] ${email.subject} | ${email.from}`);
                        const fullBody = await imap.fetchEmailBody(email.uid, email.folder);
                        
                        await prisma.message.create({
                            data: {
                                gmailMessageId: msgId,
                                rawMessageId: email.messageId, // Store raw ID for trashing later
                                threadId: dbThread.id,
                                from: email.from,
                                to: isSelfEmail ? email.toEmail : targetEmail, 
                                content: fullBody || `[Message: ${email.subject}]`,
                                role: role,
                                contextType: isSelfEmail ? 'sent-sync' : 'imap-sync',
                                sentiment: 'neutral',
                            }
                        });

                        // Update thread timestamp
                        await prisma.thread.update({
                            where: { id: dbThread.id },
                            data: { lastUpdate: new Date() }
                        });

                        // -------------------------------------------------------------
                        // AUTO-REPLY LOGIC (Only for RECEIVED and UNREAD messages)
                        // -------------------------------------------------------------
                        if (!isSelfEmail && email.isUnread && autoReplyEnabled) {
                            logger(`[AI] Generating auto-reply for: ${email.subject}`);
                            
                            const threadHistory = dbThread.messages.map(m =>
                                `${m.role.toUpperCase()}: ${m.content}`
                            );

                            try {
                                const { reply, type, sentiment } = await generateReply({
                                    subject: email.subject,
                                    from: email.from,
                                    body: fullBody,
                                    threadHistory
                                });

                                logger(`[SMTP] Transmitting AI reply...`);
                                await smtp.sendReply(email.fromEmail, email.subject, reply);

                                // Log the auto-reply so we don't repeat it
                                await prisma.message.create({
                                    data: {
                                        gmailMessageId: `ai-reply-${msgId}`,
                                        threadId: dbThread.id,
                                        from: targetEmail,
                                        to: email.fromEmail,
                                        content: reply,
                                        role: 'ai',
                                        contextType: type,
                                        sentiment: sentiment || 'neutral',
                                    }
                                });

                                await imap.markAsRead(email.uid, email.folder);
                                logger(`[SUCCESS] Auto-reply transmitted to ${email.fromEmail}`);
                            } catch (aiErr: any) {
                                logger(`[AI ERROR] ${aiErr.message}`);
                            }
                        }
                    }
                } catch (msgErr: any) {
                    if (!msgErr.message.includes('Unique constraint')) {
                        logger(`[MSG ERR] ${msgErr.message}`);
                    }
                }
            }
        } catch (pollErr: any) {
            logger(`[CRITICAL] ${pollErr.message}`);
        }

        setTimeout(pollEmails, 15000);
    };

    await pollEmails();
}
