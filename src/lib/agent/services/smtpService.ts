import nodemailer from 'nodemailer';

export class SMTPService {
  private email: string;
  private password: string;

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
  }

  private createTransport() {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: this.email,
        pass: this.password,
      },
    });
  }

  async sendReply(to: string, subject: string, body: string): Promise<void> {
    const transporter = this.createTransport();
    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;

    await transporter.sendMail({
      from: `Tekquora AI <${this.email}>`,
      to,
      subject: replySubject,
      text: body,
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const transporter = this.createTransport();
      await transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
