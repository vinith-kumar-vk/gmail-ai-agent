import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import prisma from '@/lib/prisma';

/**
 * Loads credentials from the database.
 */
async function loadCredentialsFromDB(): Promise<OAuth2Client | null> {
  try {
    const tokenRecord = await prisma.gmailToken.findUnique({
      where: { id: 'default' }
    });

    if (!tokenRecord) return null;

    const oAuth2Client = new google.auth.OAuth2(
      tokenRecord.clientId,
      tokenRecord.clientSecret,
      'http://localhost:3000/api/auth/callback'
    );

    oAuth2Client.setCredentials({
      refresh_token: tokenRecord.refreshToken
    });

    return oAuth2Client as OAuth2Client;
  } catch (err) {
    console.error('Error loading credentials from DB:', err);
    return null;
  }
}

/**
 * Authorize and return an OAuth2Client.
 */
export async function authorize(): Promise<OAuth2Client> {
  const client = await loadCredentialsFromDB();
  
  if (client) {
    return client;
  }

  throw new Error('No Gmail account connected! Please go to Settings and click "Connect Gmail".');
}
