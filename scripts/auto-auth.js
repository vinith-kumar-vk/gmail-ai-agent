const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.send'
];

const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');

async function automateAuth() {
    console.log('--- Start: A-to-Z Gmail Authorization ---');

    // 1. Check Credentials
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        console.error('❌ credentials.json missing!');
        return;
    }

    const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
    const credentials = JSON.parse(content);
    const { client_secret, client_id } = credentials.installed || credentials.web;

    // Use port 3001 for this temporary auth server to avoid clashing with Next.js on 3000
    const redirectUri = 'http://localhost:3001/oauth2callback';
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

    // 2. Generate forced consent URL
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent' // ALWAYS force consent screen to ensure scopes are requested
    });

    // 3. Start local server to catch the callback
    const server = http.createServer(async (req, res) => {
        if (req.url.startsWith('/oauth2callback')) {
            const url = new URL(req.url, 'http://localhost:3001');
            const code = url.searchParams.get('code');

            if (code) {
                try {
                    console.log('⏳ Captured auth code, generating token...');
                    const { tokens } = await oAuth2Client.getToken(code);
                    oAuth2Client.setCredentials(tokens);

                    // Save token payload exactly as expected by Google library
                    const payload = JSON.stringify({
                        type: 'authorized_user',
                        client_id: client_id,
                        client_secret: client_secret,
                        refresh_token: tokens.refresh_token,
                    });

                    fs.writeFileSync(TOKEN_PATH, payload);
                    console.log('✅ token.json successfully created with FULL permissions!');

                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end('<h1>✅ Success!</h1><p>You can close this window and start your agent.</p>');

                    // Kill server after success
                    setTimeout(() => process.exit(0), 1000);
                } catch (error) {
                    console.error('❌ Error getting token:', error);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Authentication failed. Check terminal.');
                    process.exit(1);
                }
            } else {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('No code found in URL');
            }
        }
    });

    server.listen(3001, () => {
        console.log(`🌍 Temporary Local Auth Server started on port 3001...`);
        console.log(`\n👉 OPEN THIS URL IN YOUR BROWSER:\n\n${authUrl}\n`);

        // Try to open the browser automatically
        const start = (process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open');
        exec(`${start} "${authUrl}"`);
    });
}

automateAuth();
