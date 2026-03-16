
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function sendTest() {
  const setting = await prisma.setting.findUnique({ where: { id: 'default' } });
  if (!setting || !setting.targetEmail) {
    console.log('No target email configured');
    return;
  }

  console.log(`Sending TEST email to: ${setting.targetEmail}`);
  
  // We'll use the SAME credentials to send to itself
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: setting.targetEmail,
      pass: setting.appPassword,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Test Sender" <vinithkumar78876@gmail.com>`, // Sending from another account owned by user
      to: setting.targetEmail,
      subject: "Project Update Request",
      text: "Hi Vinith, can you please provide an update on the Tekquora dashboard project? Thanks!",
    });
    console.log('✅ Test email sent successfully');
  } catch (err) {
    console.error('❌ Failed to send test email:', err.message);
  }
}

sendTest().finally(() => prisma.$disconnect());
