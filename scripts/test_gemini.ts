import { GoogleGenerativeAI } from "@google/generative-ai";

async function testGemini() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log("Testing Gemini API...");
    try {
        const result = await model.generateContent("Hello, are you there?");
        const response = await result.response;
        console.log("Gemini Response:", response.text());
    } catch (error) {
        console.error("Gemini API Error:");
        console.error(error);
    }
}

testGemini();
