import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const token = await prisma.gmailToken.findUnique({
            where: { id: 'default' }
        });

        if (!token) {
            return NextResponse.json({ connected: false });
        }

        return NextResponse.json({
            connected: true,
            email: token.connectedEmail,
            connectedAt: token.connectedAt
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to check auth status' }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        await prisma.gmailToken.delete({
            where: { id: 'default' }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to disconnect Gmail' }, { status: 500 });
    }
}
