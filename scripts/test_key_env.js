const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function testKey() {
    const key = process.env.GEMINI_API_KEY;
    console.log("Testing Key:", key?.substring(0, 10) + "...");
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        const result = await model.generateContent("Hello?");
        console.log("SUCCESS:", result.response.text());
    } catch (e) {
        console.error("FAILURE:", e.message);
    }
}

testKey();
