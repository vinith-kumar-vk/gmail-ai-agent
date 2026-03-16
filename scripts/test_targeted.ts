import prisma from '../src/lib/prisma';
import { authorize } from '../src/lib/agent/utils/auth';
import { GmailService } from '../src/lib/agent/services/gmailService';
import { generateReply } from '../src/lib/agent/services/aiService';

async function testOnceTargeted() {
    console.log('--- TARGETED AGENT TEST: vinithkumar78878 ---');
    try {
        const auth = await authorize();
        const gmail = new GmailService(auth);

        console.log('Fetching last 50 messages to find the specific test email...');
        const messages = await gmail.listRecentMessages(50);

        let found = false;
        for (const msg of messages) {
            const detail = await gmail.getMessage(msg.id!);
            const from = detail.payload?.headers?.find(h => h.name === 'From')?.value || "";
            const isUnread = detail.labelIds?.includes('UNREAD');

            if (from.toLowerCase().includes('vinithkumar78878')) {
                found = true;
                console.log(`\nFound target email! Unread: ${isUnread}`);
                console.log(`Subject: ${detail.payload?.headers?.find(h => h.name === 'Subject')?.value}`);

                if (!isUnread) {
                    console.warn('NOTE: Email is already marked as READ. Agent usually skips these.');
                    console.log('Proceeding with AI test anyway...');
                }

                console.log(`Attempting AI generation for ${from}...`);
                try {
                    const result = await generateReply({
                        subject: detail.payload?.headers?.find(h => h.name === 'Subject')?.value || "No Subject",
                        from,
                        body: detail.snippet || "",
                        threadHistory: []
                    });
                    console.log('>> SUCCESS! AI generated a reply.');
                    console.log('>> REPLY PREVIEW:', result.reply.substring(0, 150) + '...');

                    console.log('--- SENTIMENT ANALYSIS ---');
                    console.log('Sentiment:', result.sentiment);
                    console.log('Type:', result.type);
                } catch (err: any) {
                    console.error('>> AI FAILED.');
                    console.error('Error:', err.message);
                }
                break;
            }
        }

        if (!found) {
            console.error('Target email from vinithkumar78878 was not found in the last 50 messages.');
        }
    } catch (e) {
        console.error('Fatal Test Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

testOnceTargeted();
