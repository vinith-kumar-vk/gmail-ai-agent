import { authorize } from '../src/lib/agent/utils/auth';
import { google } from 'googleapis';

async function main() {
    const auth = await authorize();
    const gmail = google.gmail({ version: 'v1', auth });

    const res = await gmail.users.messages.list({
        userId: 'me',
        includeSpamTrash: true,
        maxResults: 10
    });

    const messages = res.data.messages || [];
    for (const msg of messages) {
        const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id! });
        const from = detail.data.payload?.headers?.find(h => h.name === 'From')?.value || '';
        const subject = detail.data.payload?.headers?.find(h => h.name === 'Subject')?.value || '';
        const labels = detail.data.labelIds || [];
        console.log(`- ID: ${msg.id} | Labels: ${labels.join(',')} | Sub: ${subject}`);
    }
}
main().catch(console.error);
