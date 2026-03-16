# Professional AI Email Agent

This is a real-time, hybrid AI Gmail agent designed for Customer Support and Personal Assistance.

## Features
- **Hybrid AI Logic**: Automatically switches between Support and Assistant roles.
- **Persistent Memory**: Uses SQLite to remember conversation history.
- **Gmail Integration**: Reads unread emails and creates drafts for review.
- **Real-time Ready**: Built with a modular architecture for professional use.

## Setup Instructions

1. **Google Cloud Credentials**:
   - Follow the `gmail_setup_guide.md` to get your `credentials.json`.
   - Place `credentials.json` in the root folder of this project.

2. **API Keys**:
   - Open `.env` and replace `YOUR_GEMINI_API_KEY_HERE` with your actual Google Gemini API Key.

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Initialize Database**:
   - Run the migration (if not already done):
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Run the Agent**:
   ```bash
   npx ts-node src/index.ts
   ```

## How it works
The agent checks for unread emails every minute. It analyzes the context using AI, checks the database for previous history, and creates a **Draft** reply in your Gmail. You can then review and send it!
