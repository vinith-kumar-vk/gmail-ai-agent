import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

const logFile = path.join(process.cwd(), 'agent.log');

export interface EmailContext {
    subject: string;
    from: string;
    body: string;
    threadHistory?: string[];
}

function logger(message: string) {
    const timestamp = new Date().toLocaleString();
    const logLine = `[${timestamp}] ${message}\n`;
    console.log(message);
    fs.appendFileSync(logFile, logLine);
}

export async function generateReply(context: EmailContext): Promise<{ reply: string; type: 'support' | 'assistant'; sentiment: 'positive' | 'neutral' | 'negative' }> {
    const key = process.env.GEMINI_API_KEY || "";
    if (!key) throw new Error("GEMINI_API_KEY is missing");

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Improved Name Extraction
    let senderName = "Customer";
    const nameMatch = context.from.match(/^"?([^"<]+)"?\s*<.*>?/);
    if (nameMatch && nameMatch[1]) {
        senderName = nameMatch[1].trim();
    } else {
        senderName = context.from.split('@')[0].trim();
    }

    const systemPrompt = `
    You are Vinith Kumar, a lead executive at Tekquora.
    
    COMMUNICATION STYLE:
    1. PRO-ACTIVE: You provide answers and make decisions. You don't ask for permission.
    2. HUMAN: Never mention you are an AI. You are a human representative of the company.
    3. CONCISE: No generic fillers like "Please let me know if you need anything else" or "Warm regards" in Every. Single. Mail.
    4. DIRECT: If a user asks for leave, say "Approved" if reasonable. If they ask a question, answer it.
    
    GUIDELINES:
    - START with: "Dear ${senderName},"
    - KEEP IT BRIEF. Max 3-4 sentences.
    - END with: "Best, Vinith Kumar | Tekquora"
    
    EMAILS HISTORY:
    ${context.threadHistory?.join('\n') || 'No previous history'}
    
    MESSAGE CONTENT:
    Subject: ${context.subject}
    Body: ${context.body}
    
    Output format:
    ---TYPE---
    support
    ---SENTIMENT---
    [positive, neutral, or negative]
    ---REPLY---
    [Your direct, human response]
    `;

    const fallbackReply = `Dear ${senderName},
    
Your request regarding "${context.subject}" has been reviewed and is officially approved. 

Best,
Vinith Kumar | Tekquora`;

    try {
        logger(`AI Decision for: ${senderName}...`);
        const result = await model.generateContent(systemPrompt);
        const text = result.response.text();

        const typeMatch = text.match(/---TYPE---\n(support|assistant)/);
        const sentimentMatch = text.match(/---SENTIMENT---\n(positive|neutral|negative)/);
        const replyMatch = text.match(/---REPLY---\n([\s\S]*)/);

        return {
            type: (typeMatch?.[1] as 'support' | 'assistant') || 'support',
            sentiment: (sentimentMatch?.[1] as 'positive' | 'neutral' | 'negative') || 'neutral',
            reply: replyMatch?.[1]?.trim() || fallbackReply
        };
    } catch (error: any) {
        logger(`Gemini Decision Error: ${error.message}`);
        return {
            type: 'support',
            sentiment: 'neutral',
            reply: fallbackReply
        };
    }
}

export async function refineManualReply(context: EmailContext, rawTranscript: string): Promise<string> {
    const key = process.env.GEMINI_API_KEY || "";
    if (!key) throw new Error("GEMINI_API_KEY is missing");

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Improved Name Extraction
    let senderName = "Customer";
    const nameMatch = context.from.match(/^"?([^"<]+)"?\s*<.*>?/);
    if (nameMatch && nameMatch[1]) {
        senderName = nameMatch[1].trim();
    } else {
        senderName = context.from.split('@')[0].trim();
    }

    const systemPrompt = `
    You are Vinith Kumar, a lead executive at Tekquora.
    A user has dictated a reply to an email. Your job is to format their dictated thoughts into a professional, human, and concise email reply.
    
    DICTATED THOUGHTS:
    "${rawTranscript}"
    
    EMAIL CONTEXT:
    Subject: ${context.subject}
    From: ${context.from}
    
    GUIDELINES:
    1. Keep it professional but human.
    2. Start with "Dear ${senderName},"
    3. End with "Best, Vinith Kumar | Tekquora"
    4. Fix grammar and phrasing while keeping the core meaning of the dictated message.
    5. Do not include any meta-talk, only the email body.
    
    Only output the text of the email reply.
    `;

    try {
        const result = await model.generateContent(systemPrompt);
        return result.response.text().trim();
    } catch (error: any) {
        console.error('Refine error:', error);
        return rawTranscript;
    }
}

