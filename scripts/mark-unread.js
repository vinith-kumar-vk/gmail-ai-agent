const { google } = require('googleapis');
const fs = require('fs');

async function markUnread() {
    console.log('--- MARKING LATEST EMAILS AS UNREAD ---');
    try {
        const credentials = JSON.parse(fs.readFileSync('credentials.json', 'utf-8'));
        const token = JSON.parse(fs.readFileSync('token.json', 'utf-8'));
        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        oAuth2Client.setCredentials(token);

        const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

        const res = await gmail.users.messages.list({ userId: 'me', maxResults: 3 });
        const messages = res.data.messages || [];

        for (const msg of messages) {
            await gmail.users.messages.modify({
                userId: 'me',
                id: msg.id,
                requestBody: { addLabelIds: ['UNREAD'] }
            });
            console.log(`Marked as UNREAD: ${msg.id}`);
        }
    } catch (e) {
        console.error('Error:', e);
    }
}
markUnread();
