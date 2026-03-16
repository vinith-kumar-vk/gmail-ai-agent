import { generateReply } from '../src/lib/agent/services/aiService';
import * as dotenv from 'dotenv';
dotenv.config();

async function testAi() {
    console.log('--- TESTING AI DIRECTLY ---');
    console.log('Using Key:', process.env.GEMINI_API_KEY?.substring(0, 8) + '...');

    try {
        const result = await generateReply({
            subject: "Help with order delay",
            from: "Vinith <vinithkumar78878@gmail.com>",
            body: "My order #12345 is delayed. Please help.",
            threadHistory: []
        });
        console.log('SUCCESS!');
        console.log('Reply:', result.reply);
    } catch (error: any) {
        console.error('FAILED!');
        // aiService already logs details
    }
}

testAi();
