import { NextResponse } from 'next/server';
import { startAgent } from '@/lib/agent/index';

let agentStarted = false;

export async function POST() {
    if (agentStarted) {
        return NextResponse.json({ message: 'Agent is already running' });
    }

    try {
        console.log('--- RECEIVED AGENT START REQUEST ---');
        startAgent().then(() => {
            console.log('--- Background Agent Loop Finished ---');
        }).catch(err => {
            console.error('--- Background Agent Error ---');
            console.error(err);
        });
        agentStarted = true;
        return NextResponse.json({ message: 'Agent started successfully' });
    } catch (error) {
        console.error('Failed to start agent:', error);
        return NextResponse.json({ error: 'Failed to start agent' }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ status: agentStarted ? 'active' : 'idle' });
}
