import { NextResponse } from 'next/server';
import { refineManualReply } from '@/lib/agent/services/aiService';

export async function POST(req: Request) {
    try {
        const { context, transcript } = await req.json();

        if (!context || !transcript) {
            return NextResponse.json({ error: 'Missing context or transcript' }, { status: 400 });
        }

        const refinedReply = await refineManualReply(context, transcript);
        return NextResponse.json({ refinedReply });
    } catch (error: any) {
        console.error('Refine API Error:', error);
        return NextResponse.json({ error: 'Failed to refine reply' }, { status: 500 });
    }
}
