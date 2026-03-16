import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function setup() {
    const email = 'vinithkumar78876@gmail.com';
    const password = 'admin'; // User can change this later
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: { password: hashedPassword },
        create: {
            email,
            password: hashedPassword,
            name: 'Vinith Kumar'
        }
    });

    console.log('✅ Admin user setup complete:', user.email);
}

setup().catch(console.error);
