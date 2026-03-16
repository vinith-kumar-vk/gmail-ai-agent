import { authorize } from '../src/lib/agent/utils/auth';
import { google } from 'googleapis';

async function main() {
    console.log("Connecting to Gmail...");
    const auth = await authorize();
    const gmail = google.gmail({ version: 'v1', auth });

    const profile = await gmail.users.getProfile({ userId: 'me' });
    console.log("Logged in as:", profile.data.emailAddress);
}
main().catch(console.error);
