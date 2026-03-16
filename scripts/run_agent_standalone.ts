import { startAgent } from '../src/lib/agent/index';
import * as dotenv from 'dotenv';
dotenv.config();

console.log('--- RUNNING AGENT STANDALONE (FIXED PATHS) ---');
startAgent().catch(err => {
    console.error('CRITICAL AGENT ERROR:', err);
    process.exit(1);
});
