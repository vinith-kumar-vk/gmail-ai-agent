import { startAgent } from '../src/lib/agent/index';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('--- MANUAL AGENT START ---');
console.log('DATABASE_URL:', process.env.DATABASE_URL);

startAgent().catch(err => {
    console.error('CRITICAL ERROR:', err);
});
