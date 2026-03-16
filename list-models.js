
const https = require('https');
require('dotenv').config();

const key = process.env.GEMINI_API_KEY;

if (!key) {
  console.error('No GEMINI_API_KEY found in environment');
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.models) {
        console.log('Available Models:');
        json.models.forEach(m => console.log(`- ${m.name}`));
      } else {
        console.log('No models found or error:', data);
      }
    } catch (e) {
      console.log('Raw output:', data);
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
