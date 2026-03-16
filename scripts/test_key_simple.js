const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testKey() {
    const key = "AIzaSyDZo3mp7MbXf35M-BQs2xN9oaBJavqmlY4";
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
