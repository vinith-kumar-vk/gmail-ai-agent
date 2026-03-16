import { startAgent } from '../src/lib/agent/index.js';

async function runOnce() {
    console.log("Starting agent manually for an immediate run...");
    // We will call startAgent, which sets up a setInterval.
    // However, to force an immediate run, let's just let it start.
    await startAgent();
}
runOnce();
