import prisma from '../src/lib/prisma';
import { authorize } from '../src/lib/agent/utils/auth';
import { GmailService } from '../src/lib/agent/services/gmailService';
import { generateReply } from '../src/lib/agent/services/aiService';

async function testOnceDetail() {
    console.log('--- DETAILED AGENT TEST START ---');
    try {
        const auth = await authorize();
        const gmail = new GmailService(auth);

        console.log('Fetching last 20 messages...');
        const messages = await gmail.listRecentMessages(20);
        console.log(`Checking ${messages.length} messages.`);

        for (const msg of messages) {
            const detail = await gmail.getMessage(msg.id);
            const isUnread = detail.labelIds?.includes('UNREAD');
            const from = detail.payload?.headers?.find(h => h.name === 'From')?.value || "";
            const subject = detail.payload?.headers?.find(h => h.name === 'Subject')?.value || "";
            const snippet = detail.snippet || "";

            if (isUnread) {
                console.log(`\n[UNREAD] From: ${from} | Subject: ${subject}`);
                console.log(`Attempting AI generation...`);
                try {
                    const result = await generateReply({
                        subject,
                        from,
                        body: snippet,
                        threadHistory: []
                    });
                    console.log('>> SUCCESS: Reply:', result.reply.substring(0, 100));
                    break; // stop after first success
                } catch (err: any) {
                    console.error('>> AI FAILED.');
                    if (err.message) console.error('Error Message:', err.message);
                    if (err.stack) console.error('Stack:', err.stack.split('\n')[0]);
                }
            }
        }
    } catch (e) {
        console.error('Fatal Test Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

testOnceDetail();
