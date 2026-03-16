import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
dotenv.config();

async function testGemini() {
    const key = process.env.GEMINI_API_KEY || "";
    const genAI = new GoogleGenerativeAI(key);

    // Testing with a few potential model names
    const modelsToTest = ["gemini-1.5-flash", "gemini-1.0-pro", "gemini-pro"];

    for (const modelName of modelsToTest) {
        console.log(`--- Testing model: ${modelName} ---`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello, are you there?");
            const response = await result.response;
            console.log(`Success with ${modelName}:`, response.text());
            break; // Stop if one works
        } catch (error: any) {
            console.log(`Error with ${modelName}:`, error.message || error);
        }
    }
}

testGemini();
