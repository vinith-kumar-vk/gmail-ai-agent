import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
dotenv.config();

async function listModels() {
    const key = process.env.GEMINI_API_KEY || "";
    console.log("Listing models for key starting with:", key.substring(0, 8));

    // We need to use the REST API to list models or the SDK if it supports it
    // The SDK v0.24.1 has a way to list models? Actually, usually you use the fetch API for /v1/models

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();
        console.log("Available Models:");
        if (data.models) {
            data.models.forEach((m: any) => {
                console.log(`- ${m.name} (v: ${m.version})`);
            });
        } else {
            console.log("No models returned. Response:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Failed to list models:", e);
    }
}

listModels();
