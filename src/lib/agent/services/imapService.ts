import { ImapFlow } from 'imapflow';
import { logger } from '../index';
import * as qp from 'quoted-printable';
import * as utf8 from 'utf8';

/**
 * Converts raw HTML email content to clean, readable plain text.
 * Strips all HTML tags, markdown artifacts, URLs, and formatting codes.
 * This is the PERMANENT fix to prevent code/markdown from showing in UI.
 */
function htmlToPlainText(html: string): string {
  let text = html;

  // Remove <style> and <script> blocks entirely
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Replace block-level tags with newlines for readability
  text = text.replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<hr\s*\/?>/gi, '\n---\n');

  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&zwnj;/gi, '')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/gi, (_, code) => String.fromCharCode(parseInt(code, 10)));

  // Remove leftover QP/encoding artifacts
  text = text.replace(/=\r?\n/g, '');
  text = text.replace(/3D"/g, '"');
  text = text.replace(/\\=/g, '=');

  // Collapse whitespace but preserve paragraph breaks
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  return text || '(Empty content)';
}

export interface EmailMessage {
  uid: number;
  messageId: string;
  from: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  body: string;
  isUnread: boolean;
  threadKey: string;
  folder: string;
}

export class IMAPService {
  private email: string;
  private password: string;

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
  }

  async fetchRecentEmails(limit = 50): Promise<EmailMessage[]> {
    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: this.email,
        pass: this.password,
      },
      logger: false,
    });

    const allEmails: EmailMessage[] = [];

    try {
      await client.connect();
      const mailboxes = await client.list();
      const sentFolder = mailboxes.find(m => m.specialUse === '\\Sent')?.path || '[Gmail]/Sent Mail';
      const targetFolders = Array.from(new Set(['INBOX', sentFolder]));

      for (const folder of targetFolders) {
        try {
          await client.mailboxOpen(folder);
          const total = (client.mailbox as any)?.exists || 0;
          if (total === 0) continue;

          const startSeq = Math.max(1, total - limit + 1);

          for await (const msg of client.fetch(`${startSeq}:*`, {
            uid: true,
            flags: true,
            envelope: true,
            bodyStructure: true,
          })) {
            const envelope = msg.envelope as any;
            const fromAddr = envelope?.from?.[0];
            const toAddr = envelope?.to?.[0];
            
            let from = '';
            let fromEmail = '';
            let toEmail = '';

            if (fromAddr) {
              const name = fromAddr.name || '';
              const address = fromAddr.address || (fromAddr.mailbox && fromAddr.host ? `${fromAddr.mailbox}@${fromAddr.host}` : '');
              fromEmail = address;
              from = name ? `${name} <${address}>` : address;
            }

            if (toAddr) {
              toEmail = toAddr.address || (toAddr.mailbox && toAddr.host ? `${toAddr.mailbox}@${toAddr.host}` : '');
            }
            
            const subject = envelope?.subject || '(No Subject)';
            const messageId = envelope?.messageId || `uid-${msg.uid}-${folder}`;
            const threadKey = subject.replace(/^(Re:|Fwd:|Fw:)\s*/gi, '').trim() || messageId;

            allEmails.push({
              uid: msg.uid,
              messageId,
              from,
              fromEmail,
              toEmail,
              subject,
              body: '',
              isUnread: !(msg.flags as Set<string>).has('\\Seen'),
              threadKey,
              folder,
            });
          }
        } catch (folderErr: any) {
          logger(`[IMAP Warning] Folder ${folder}: ${folderErr.message}`);
        }
      }
      await client.logout();
    } catch (err: any) {
      await client.logout().catch(() => {});
      throw err;
    }
    return allEmails;
  }

  async fetchEmailBody(uid: number, folder: string = 'INBOX'): Promise<string> {
    const client = new ImapFlow({
      host: 'imap.gmail.com', port: 993, secure: true,
      auth: { user: this.email, pass: this.password },
      logger: false,
    });

    try {
      await client.connect();
      await client.mailboxOpen(folder);

      const message = await client.fetchOne(String(uid), { bodyStructure: true }, { uid: true });
      let bodyPart = '1';
      let isHtml = false;
      
      if (message && message.bodyStructure) {
        const findBestPart = (part: any, path: string = ''): { path: string, isHtml: boolean } | null => {
          const currentPath = path || '1';
          // Prefer plain text
          if (part.type === 'text/plain') return { path: currentPath, isHtml: false };
          
          if (part.childNodes) {
            let htmlPart: { path: string, isHtml: boolean } | null = null;
            for (let i = 0; i < part.childNodes.length; i++) {
              const childPath = path ? `${path}.${i + 1}` : `${i + 1}`;
              const res = findBestPart(part.childNodes[i], childPath);
              if (res && !res.isHtml) return res; // Found plain text deep, return immediately
              if (res && res.isHtml) htmlPart = res;
            }
            return htmlPart; // Only return HTML if no plain text found anywhere
          }
          
          if (part.type === 'text/html') return { path: currentPath, isHtml: true };
          return null;
        };

        const best = findBestPart(message.bodyStructure);
        if (best) {
          bodyPart = best.path;
          isHtml = best.isHtml;
        }
      }

      let rawContent = '';
      for await (const msg of client.fetch(String(uid), { uid: true, bodyParts: [bodyPart] }, { uid: true })) {
        const part = (msg as any).bodyParts.get(bodyPart);
        if (part) rawContent = part.toString('utf-8');
      }

      await client.logout();
      if (!rawContent) return '(No content detected)';

      let processed = rawContent;

      // 1. Handle Quoted-Printable if present
      if (processed.includes('=3D') || processed.includes('=20') || processed.includes('=\r\n')) {
          try {
              processed = qp.decode(processed);
              // Handle potential UTF-8 issues after decoding QP
              try { processed = utf8.decode(processed); } catch {}
          } catch (e: any) {
              logger(`[DECODE WARN] QP decoding failed: ${e.message}`);
          }
      }

      const hasHtmlMarkers = processed.toLowerCase().includes('<html') || 
                             processed.toLowerCase().includes('<!doctype') || 
                             processed.toLowerCase().includes('<div') ||
                             processed.toLowerCase().includes('<table');

      if (isHtml || hasHtmlMarkers) {
        // Use our clean HTML→PlainText converter (no markdown artifacts)
        return htmlToPlainText(processed);
      }

      // For plain text, just clean up whitespace
      return processed.replace(/\s+/g, ' ').trim() || '(Empty content)';
    } catch (err: any) {
      await client.logout().catch(() => {});
      logger(`[BODY ERROR] ${err.message}`);
      return '(Error fetching content)';
    }
  }

  async markAsRead(uid: number, folder: string = 'INBOX'): Promise<void> {
    const client = new ImapFlow({
      host: 'imap.gmail.com', port: 993, secure: true,
      auth: { user: this.email, pass: this.password },
      logger: false,
    });

    try {
      await client.connect();
      await client.mailboxOpen(folder);
      await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
      await client.logout();
    } catch {
      await client.logout().catch(() => {});
    }
  }

  async trashMessages(messageIds: string[]): Promise<void> {
    const client = new ImapFlow({
      host: 'imap.gmail.com', port: 993, secure: true,
      auth: { user: this.email, pass: this.password },
      logger: false,
    });

    try {
      await client.connect();
      const mailboxes = await client.list();
      const trashFolder = mailboxes.find(m => m.specialUse === '\\Trash')?.path || '[Gmail]/Trash';

      await client.mailboxOpen('INBOX');
      for (const msgId of messageIds) {
        const searchResult = await client.search({ header: { 'Message-ID': msgId } });
        if (searchResult && (searchResult as number[]).length > 0) {
          await client.messageMove((searchResult as number[]).join(','), trashFolder);
        }
      }
      await client.logout();
    } catch (err) {
      await client.logout().catch(() => {});
      throw err;
    }
  }
}
