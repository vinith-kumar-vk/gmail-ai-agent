import prisma from './src/lib/prisma';

async function check() {
    const threads = await prisma.thread.findMany({
        take: 5,
        include: { messages: true },
        orderBy: { lastUpdate: 'desc' }
    });

    threads.forEach(t => {
        console.log(`Thread: ${t.gmailThreadId} | Subject: ${t.subject}`);
        t.messages.forEach(m => {
            console.log(`  - Role: ${m.role} | From: ${m.from} | To: ${m.to}`);
        });
    });
}

check();
