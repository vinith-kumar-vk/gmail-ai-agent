import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.send'
];

const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');

async function setup() {
    console.log('--- Manual Gmail Authorization ---');
    try {
        const content = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
        const credentials = JSON.parse(content);
        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });

        console.log('Please visit this URL to authorize the app:');
        console.log(authUrl);
        console.log('\nAfter authorizing, you will be redirected to a page (which might fail to load).');
        console.log('Copy the "code" parameter from the URL of that page and paste it here:');

        // We will wait for the user to provide the code in the next step.
    } catch (err) {
        console.error('Error during setup:', err);
    }
}

setup();
