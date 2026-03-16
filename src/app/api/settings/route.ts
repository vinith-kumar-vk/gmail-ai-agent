import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        let setting = await prisma.setting.findUnique({
            where: { id: 'default' }
        });

        if (!setting) {
            setting = await prisma.setting.create({
                data: { 
                    id: 'default', 
                    autoReplyEnabled: false,
                    targetEmail: ''
                }
            });
        }

        // Never expose appPassword to frontend
        const { appPassword, ...safeSettings } = setting as any;
        return NextResponse.json({
            ...safeSettings,
            hasAppPassword: !!appPassword
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { autoReplyEnabled, targetEmail, appPassword, clearData } = await req.json();

        // Fetch current setting to detect email change
        const current = await prisma.setting.findUnique({ where: { id: 'default' } });
        const emailChanged = targetEmail !== undefined && current?.targetEmail !== targetEmail;

        // If email changed and clearData confirmed, wipe all synced data
        if (emailChanged && clearData) {
            console.log('[SWITCH] Clearing data for new email:', targetEmail);
            await prisma.$transaction([
                prisma.message.deleteMany({}),
                prisma.thread.deleteMany({}),
            ]);

            // Delete legacy token.json if it exists
            const tokenPath = path.join(process.cwd(), 'token.json');
            if (fs.existsSync(tokenPath)) {
                fs.unlinkSync(tokenPath);
            }
        }

        const setting = await prisma.setting.upsert({
            where: { id: 'default' },
            update: { 
                ...(autoReplyEnabled !== undefined && { autoReplyEnabled }),
                ...(targetEmail !== undefined && { targetEmail }),
                ...(appPassword !== undefined && { appPassword }),
            },
            create: { 
                id: 'default', 
                autoReplyEnabled: autoReplyEnabled ?? false,
                targetEmail: targetEmail ?? '',
                appPassword: appPassword ?? null,
            }
        });

        const { appPassword: _, ...safeSettings } = setting as any;
        return NextResponse.json({ 
            ...safeSettings,
            hasAppPassword: !!setting.appPassword,
            dataCleared: emailChanged && clearData,
        });
    } catch (error) {
        console.error('Settings update error:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
