# Gmail API Setup Guide

To use this Professional AI Email Agent, you need to set up a Google Cloud Project and obtain a `credentials.json` file.

## Step 1: Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click on the project dropdown and select **New Project**.
3. Name your project (e.g., `Gmail AI Agent`) and click **Create**.

## Step 2: Enable the Gmail API
1. In the sidebar, go to **APIs & Services > Library**.
2. Search for **Gmail API**.
3. Click on it and then click **Enable**.

## Step 3: Configure OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**.
2. Select **External** (if you don't have a Workspace account) and click **Create**.
3. Fill in the required fields (App name, support email, developer contact info).
4. Click **Save and Continue** until you reach the dashboard.
5. **CRITICAL**: Add your own email address as a **Test User**.

## Step 4: Create OAuth2 Credentials
1. Go to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Select **Desktop Client** as the Application type.
4. Name it `Gmail Agent Client` and click **Create**.
5. Download the JSON file.

## Step 5: Add to Project
1. Rename the downloaded file to `credentials.json`.
2. Move it to the root folder of this project (`gmail-ai-agent/`).

## Step 6: Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create a new API Key.
3. Replace `YOUR_GEMINI_API_KEY_HERE` in the `.env` file with this key.

## Step 7: Run it!
1. Open your terminal and run:
   ```bash
   npx ts-node src/index.ts
   ```
2. A browser window will open asking you to log in to your Gmail. After authorizing, tokens will be saved locally in `token.json` for future use.
