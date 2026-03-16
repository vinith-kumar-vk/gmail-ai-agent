import { google } from 'googleapis';
import { authorize } from '../src/lib/agent/utils/auth';

async function markUnread() {
    const auth = await authorize();
    const gmail = google.gmail({ version: 'v1', auth });

    console.log('Searching for messages from vinithkumar78878@gmail.com...');
    const res = await gmail.users.messages.list({
        userId: 'me',
        q: 'from:vinithkumar78878@gmail.com',
        maxResults: 1
    });

    const messages = res.data.messages || [];
    if (messages.length > 0) {
        const msgId = messages[0].id!;
        console.log(`Found message ${msgId}. Marking as UNREAD...`);
        await gmail.users.messages.batchModify({
            userId: 'me',
            ids: [msgId],
            requestBody: {
                addLabelIds: ['UNREAD']
            }
        });
        console.log('Success! Message is now UNREAD. The agent should process it in the next 20s.');
    } else {
        console.log('No messages found from that sender.');
    }
}

markUnread();
