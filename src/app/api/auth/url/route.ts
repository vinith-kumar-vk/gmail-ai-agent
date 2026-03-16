import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const credentialsPath = path.join(process.cwd(), 'credentials.json');

        if (!fs.existsSync(credentialsPath)) {
            return Response.json({ error: 'credentials.json not found' }, { status: 404 });
        }

        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
        const { client_secret, client_id } = credentials.installed || credentials.web;

        const oAuth2Client = new google.auth.OAuth2(
            client_id,
            client_secret,
            'http://localhost:3000/api/auth/callback'
        );

        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.modify',
                'https://www.googleapis.com/auth/gmail.send'
            ],
            prompt: 'consent'
        });

        return NextResponse.redirect(authUrl);
    } catch (error: any) {
        console.error('Error generating auth url:', error.message);
        return NextResponse.json({ error: 'Failed to generate auth url' }, { status: 500 });
    }
}
