import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
dotenv.config();

async function testSDK() {
    const key = process.env.GEMINI_API_KEY || "";
    console.log("Testing SDK with key:", key.substring(0, 8) + "...");
    const genAI = new GoogleGenerativeAI(key);
    
    const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"];
    
    for (const m of models) {
        console.log(`\n--- Testing model: ${m} ---`);
        try {
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("Hello");
            console.log(`Success with ${m}:`, result.response.text());
        } catch (e: any) {
            console.error(`Error with ${m}:`, e.message);
            if (e.stack) console.error(e.stack.split('\n')[0]);
        }
    }
}

testSDK();
