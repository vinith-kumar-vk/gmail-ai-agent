import { GoogleGenerativeAI } from "@google/generative-ai";

async function diagGemini() {
    // Using the key found in .env earlier
    const key = "AIzaSyDF4o-rj_Z08dgN7WYR8YLcjMlS8X0kk4k";
    console.log("Starting Diagnostic with hardcoded key...");

    const genAI = new GoogleGenerativeAI(key);
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro", "gemini-pro"];

    for (const mName of models) {
        console.log(`\n--- Testing ${mName} ---`);
        try {
            const model = genAI.getGenerativeModel({ model: mName });
            const result = await model.generateContent("Say 'Hello'");
            const response = await result.response;
            console.log(`SUCCESS [${mName}]:`, response.text());
        } catch (err: any) {
            console.log(`FAILURE [${mName}]:`, err.status, err.statusText);
            if (err.message) console.log("Message:", err.message);
        }
    }
}

diagGemini();
