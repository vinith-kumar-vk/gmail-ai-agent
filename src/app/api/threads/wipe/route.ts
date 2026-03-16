import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST() {
  try {
    // 1. Delete all messages
    await prisma.message.deleteMany({});
    // 2. Delete all threads
    await prisma.thread.deleteMany({});
    
    return NextResponse.json({ success: true, message: 'All dashboard data has been wiped.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
