const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.send'
];

const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
const credentials = JSON.parse(content);
const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
});

console.log('\n=== Gmail Authorization URL ===');
console.log(authUrl);
console.log('\nStep 1: Open the above URL in your browser');
console.log('Step 2: Login & click Allow');
console.log('Step 3: Copy the "code" from the URL bar and share it here');
