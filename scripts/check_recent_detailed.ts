import { authorize } from '../src/lib/agent/utils/auth';
import { google } from 'googleapis';

async function main() {
    console.log("Connecting to Gmail...");
    const auth = await authorize();
    const gmail = google.gmail({ version: 'v1', auth });

    const res = await gmail.users.messages.list({
        userId: 'me',
        includeSpamTrash: true,
        maxResults: 5
    });

    const messages = res.data.messages || [];
    console.log(`Found ${messages.length} recent messages.`);
    
    for (const msg of messages) {
        const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id! });
        const from = detail.data.payload?.headers?.find(h => h.name === 'From')?.value || '';
        const subject = detail.data.payload?.headers?.find(h => h.name === 'Subject')?.value || '';
        const labels = detail.data.labelIds || [];
        console.log(`- ID: ${msg.id} | Unread: ${labels.includes('UNREAD')} | From: ${from} | Subject: ${subject}`);
    }
}
main().catch(console.error);
