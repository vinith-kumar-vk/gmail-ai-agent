import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

async function debugGmail() {
    const tokenPath = path.join(process.cwd(), 'token.json');
    const credentialsPath = path.join(process.cwd(), 'credentials.json');

    if (!fs.existsSync(tokenPath)) {
        console.error('token.json missing');
        return;
    }

    const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials({
        refresh_token: token.refresh_token
    });

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    console.log('--- Listing Recent Messages (no filter) ---');
    const res = await gmail.users.messages.list({ userId: 'me', maxResults: 10 });
    const messages = res.data.messages || [];

    for (const msg of messages) {
        const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id! });
        console.log(`ID: ${msg.id}`);
        console.log(`From: ${detail.data.payload?.headers?.find(h => h.name === 'From')?.value}`);
        console.log(`Subject: ${detail.data.payload?.headers?.find(h => h.name === 'Subject')?.value}`);
        console.log(`Labels: ${detail.data.labelIds?.join(', ')}`);
        console.log(`Snippet: ${detail.data.snippet}`);
        console.log('---');
    }
}

debugGmail();
