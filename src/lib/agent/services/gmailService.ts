import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GmailService {
    private gmail: gmail_v1.Gmail;

    constructor(auth: OAuth2Client) {
        this.gmail = google.gmail({ version: 'v1', auth });
    }

    async listUnreadMessages(): Promise<gmail_v1.Schema$Message[]> {
        const res = await this.gmail.users.messages.list({
            userId: 'me',
            q: 'is:unread',
        });
        return res.data.messages || [];
    }

    async listRecentMessages(maxResults: number = 20): Promise<gmail_v1.Schema$Message[]> {
        const res = await this.gmail.users.messages.list({
            userId: 'me',
            maxResults,
            // q: 'in:inbox',
        });
        return res.data.messages || [];
    }

    async getMessage(id: string): Promise<gmail_v1.Schema$Message> {
        const res = await this.gmail.users.messages.get({
            userId: 'me',
            id,
        });
        return res.data;
    }

    async createDraft(threadId: string, to: string, subject: string, body: string) {
        const message = [
            `To: ${to}`,
            `Subject: ${subject}`,
            'Content-Type: text/plain; charset=utf-8',
            '',
            body,
        ].join('\n');

        const encodedMessage = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        await this.gmail.users.drafts.create({
            userId: 'me',
            requestBody: {
                message: {
                    threadId,
                    raw: encodedMessage,
                },
            },
        });
    }

    async sendReply(threadId: string, to: string, subject: string, body: string, inReplyTo?: string, references?: string) {
        // Clean up subject - avoid multiple "Re:"
        const cleanSubject = subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`;
        
        // Ensure recipient is a clean email address
        const emailMatch = to.match(/<(.+)>|(\S+@\S+\.\S+)/);
        const recipient = emailMatch ? (emailMatch[1] || emailMatch[0]).trim() : to.trim();

        const headers = [
            `To: ${recipient}`,
            `Subject: ${cleanSubject}`,
            'Content-Type: text/plain; charset=utf-8',
            'MIME-Version: 1.0',
        ];

        if (inReplyTo) {
            headers.push(`In-Reply-To: ${inReplyTo}`);
        }
        if (references) {
            headers.push(`References: ${references}`);
        }

        const message = [
            ...headers,
            '',
            body,
        ].join('\r\n');

        const encodedMessage = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        console.log(`[GmailService] Sending raw size: ${message.length}, Base64 size: ${encodedMessage.length}`);

        try {
            const res = await this.gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    threadId,
                    raw: encodedMessage,
                },
            });
            console.log(`[GmailService] Send response ID: ${res.data.id}`);
            return res.data;
        } catch (error: any) {
            console.error('[GmailService] Send error details:', error.response?.data || error.message);
            throw error;
        }
    }

    async sendNewEmail(to: string, subject: string, body: string) {
        const headers = [
            `To: ${to}`,
            `Subject: ${subject}`,
            'Content-Type: text/plain; charset=utf-8',
            'MIME-Version: 1.0',
        ];

        const message = [
            ...headers,
            '',
            body,
        ].join('\r\n');

        const encodedMessage = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        try {
            const res = await this.gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage,
                },
            });
            return res.data;
        } catch (error: any) {
            console.error('[GmailService] SendNewEmail error:', error.response?.data || error.message);
            throw error;
        }
    }

    async markAsRead(id: string) {
        await this.gmail.users.messages.batchModify({
            userId: 'me',
            requestBody: {
                ids: [id],
                removeLabelIds: ['UNREAD'],
            },
        });
    }
}
