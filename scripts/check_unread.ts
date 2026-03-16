import { authorize } from '../src/lib/agent/utils/auth';
import { google } from 'googleapis';

async function main() {
    try {
        const auth = await authorize();
        const gmail = google.gmail({ version: 'v1', auth });
        const sender = 'vinithkumar78878@gmail.com';

        console.log(`--- Checking for ALL messages from: ${sender} ---`);

        const res = await gmail.users.messages.list({
            userId: 'me',
            q: `from:${sender}`,
        });

        const messages = res.data.messages || [];
        console.log(`Total messages found: ${messages.length}`);

        for (const msg of messages) {
            const detail = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id!,
            });
            const isUnread = detail.data.labelIds?.includes('UNREAD');
            console.log(`- ID: ${msg.id} | Unread: ${isUnread} | Snippet: ${detail.data.snippet}`);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
