import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, createToken } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();
        console.log('Login attempt for:', email);

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email }
        });

        console.log('User found:', !!user);
        if (user) {
            const isMatch = await comparePassword(password, user.password);
            console.log('Password match:', isMatch);
        }

        if (!user || !(await comparePassword(password, user.password))) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const token = await createToken({ id: user.id, email: user.email, name: user.name });

        const response = NextResponse.json({ message: 'Login successful', name: user.name });
        
        // Set cookie
        response.cookies.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 // 24 hours
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
