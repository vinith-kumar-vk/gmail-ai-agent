import prisma from './src/lib/prisma';
import bcrypt from 'bcryptjs';

async function verify() {
    const email = 'vinithkumar78876@gmail.com';
    const password = 'admin';

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);
    console.log('User details:', JSON.stringify({ email: user.email, name: user.name }, null, 2));
}

verify().catch(console.error).finally(() => prisma.$disconnect());
