#!/usr/bin/env node

/**
 * Simple test script for the Tiling Trees MCP server
 * Run: node test-server.js
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';

const serverPath = './dist/index.js';

console.log('Starting Tiling Trees MCP Server test...\n');

// Start the server
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let responseBuffer = '';

server.stdout.on('data', (data) => {
  responseBuffer += data.toString();

  // Try to parse complete JSON-RPC messages
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop(); // Keep incomplete line

  lines.forEach(line => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('Response:', JSON.stringify(response, null, 2));
      } catch (e) {
        console.log('Raw:', line);
      }
    }
  });
});

// Test sequence
const tests = [
  // 1. Initialize
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    }
  },

  // 2. List tools
  {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  },

  // 3. Create a tree
  {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'create_tree',
      arguments: {
        name: 'Test Energy Storage',
        problemStatement: 'How can we improve energy storage density by 3x?'
      }
    }
  }
];

// Send tests with delay
let testIndex = 0;
function sendNextTest() {
  if (testIndex < tests.length) {
    const test = tests[testIndex];
    console.log(`\n=== Test ${testIndex + 1}: ${test.method} ===`);
    console.log('Request:', JSON.stringify(test, null, 2));
    server.stdin.write(JSON.stringify(test) + '\n');
    testIndex++;
    setTimeout(sendNextTest, 1000);
  } else {
    console.log('\n=== All tests completed ===');
    setTimeout(() => {
      server.kill();
      process.exit(0);
    }, 1000);
  }
}

// Start tests after server initializes
setTimeout(sendNextTest, 500);

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`\nServer exited with code ${code}`);
});
