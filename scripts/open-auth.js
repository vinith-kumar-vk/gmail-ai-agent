const { google } = require('googleapis');
const fs = require('fs');

const CREDENTIALS_PATH = 'credentials.json';
const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
const credentials = JSON.parse(content);
const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const url = auth.generateAuthUrl({
    access_type: 'offline',
    scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.send'
    ],
    prompt: 'consent'
});

console.log('Opening:', url);
require('child_process').exec(`start "" "${url}"`);
