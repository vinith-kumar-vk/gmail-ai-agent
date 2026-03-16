import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get('code');

    if (!code) {
        return NextResponse.json({ error: 'No code found in URL' }, { status: 400 });
    }

    try {
        const credentialsPath = path.join(process.cwd(), 'credentials.json');
        if (!fs.existsSync(credentialsPath)) {
            throw new Error('credentials.json not found on server');
        }
        
        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
        const { client_secret, client_id } = credentials.installed || credentials.web;

        const oAuth2Client = new google.auth.OAuth2(
            client_id, 
            client_secret, 
            'http://localhost:3000/api/auth/callback'
        );
        
        const { tokens } = await oAuth2Client.getToken(code);

        if (!tokens.refresh_token) {
            // If we don't get a refresh token, we might already have one or need to re-consent
            console.warn('No refresh token received. User might need to re-prompt for consent.');
        }

        // Get user info to store the connected email
        oAuth2Client.setCredentials(tokens);
        const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
        const profile = await gmail.users.getProfile({ userId: 'me' });
        const connectedEmail = profile.data.emailAddress;

        // Store in DB instead of file
        await prisma.gmailToken.upsert({
            where: { id: 'default' },
            update: {
                clientId: client_id,
                clientSecret: client_secret,
                refreshToken: tokens.refresh_token || undefined, // Only update if we got a new one
                connectedEmail: connectedEmail || undefined,
                updatedAt: new Date()
            },
            create: {
                id: 'default',
                clientId: client_id,
                clientSecret: client_secret,
                refreshToken: tokens.refresh_token || '',
                connectedEmail: connectedEmail || ''
            }
        });

        // Also update setting targetEmail if it's the default or empty
        const setting = await prisma.setting.findUnique({ where: { id: 'default' } });
        if (!setting || setting.targetEmail === 'vinithkumar78876@gmail.com') {
            await prisma.setting.upsert({
                where: { id: 'default' },
                update: { targetEmail: connectedEmail || undefined },
                create: { id: 'default', targetEmail: connectedEmail || 'vinithkumar78876@gmail.com' }
            });
        }

        return new NextResponse(
            `<html><body style="font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:white">
                <div style="max-width:500px;margin:0 auto;background:#1e293b;padding:30px;border-radius:20px;box-shadow:0 10px 25px rgba(0,0,0,0.3)">
                    <h1 style="color:#10b981;margin-bottom:20px">✅ Authorization Successful!</h1>
                    <p style="font-size:18px;opacity:0.9">Gmail account <b>${connectedEmail}</b> is now connected to Tekquora.</p>
                    <p style="margin:30px 0"><a href="/" style="display:inline-block;background:#4f46e5;color:white;padding:12px 30px;border-radius:10px;text-decoration:none;font-weight:bold">Return to Dashboard</a></p>
                    <p style="font-size:12px;opacity:0.5">You can now close this window.</p>
                </div>
            </body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        );
    } catch (error: any) {
        console.error('Token exchange error:', error);
        return new NextResponse(
            `<html><body style="font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:white">
                <div style="max-width:500px;margin:0 auto;background:#1e293b;padding:30px;border-radius:20px;box-shadow:0 10px 25px rgba(0,0,0,0.3)">
                    <h1 style="color:#ef4444;margin-bottom:20px">❌ Authorization Failed</h1>
                    <p style="opacity:0.9">${error.message}</p>
                    <p style="margin:30px 0"><a href="/api/auth/url" style="display:inline-block;background:#4f46e5;color:white;padding:12px 30px;border-radius:10px;text-decoration:none;font-weight:bold">Try Again</a></p>
                </div>
            </body></html>`,
            { status: 500, headers: { 'Content-Type': 'text/html' } }
        );
    }
}
