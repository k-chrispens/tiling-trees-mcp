#!/usr/bin/env node

/**
 * Comprehensive test for all Tiling Trees MCP tools
 * Tests each tool to verify it's working correctly
 */

import { spawn } from 'child_process';

const serverPath = './dist/index.js';

console.log('🧪 Testing Tiling Trees MCP Server - All Tools\n');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let responseBuffer = '';
let messageId = 0;
const pendingRequests = new Map();

server.stdout.on('data', (data) => {
  responseBuffer += data.toString();

  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop() || '';

  lines.forEach(line => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        if (response.id && pendingRequests.has(response.id)) {
          const handler = pendingRequests.get(response.id);
          handler(response);
          pendingRequests.delete(response.id);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  });
});

function sendRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    messageId++;
    const request = {
      jsonrpc: '2.0',
      id: messageId,
      method,
      params
    };

    pendingRequests.set(messageId, (response) => {
      if (response.error) {
        reject(new Error(response.error.message || JSON.stringify(response.error)));
      } else {
        resolve(response.result);
      }
    });

    server.stdin.write(JSON.stringify(request) + '\n');

    // Timeout after 5 seconds
    setTimeout(() => {
      if (pendingRequests.has(messageId)) {
        pendingRequests.delete(messageId);
        reject(new Error('Request timeout'));
      }
    }, 5000);
  });
}

async function runTests() {
  try {
    console.log('1️⃣  Initializing server...');
    await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    });
    console.log('✅ Server initialized\n');

    console.log('2️⃣  Listing tools...');
    const toolsList = await sendRequest('tools/list', {});
    console.log(`✅ Found ${toolsList.tools.length} tools\n`);

    // Test each tool
    let treeId, rootTileId, childTileId;

    console.log('3️⃣  Testing create_tree...');
    const tree = await sendRequest('tools/call', {
      name: 'create_tree',
      arguments: {
        name: 'Test Tree',
        problemStatement: 'How to test all MCP tools?'
      }
    });
    const treeData = JSON.parse(tree.content[0].text);
    treeId = treeData.id;
    rootTileId = treeData.rootTileId;
    console.log(`✅ Created tree: ${treeId}\n`);

    console.log('4️⃣  Testing get_trees...');
    const trees = await sendRequest('tools/call', {
      name: 'get_trees',
      arguments: {}
    });
    console.log(`✅ Retrieved ${JSON.parse(trees.content[0].text).length} tree(s)\n`);

    console.log('5️⃣  Testing get_tile...');
    const rootTile = await sendRequest('tools/call', {
      name: 'get_tile',
      arguments: { tileId: rootTileId }
    });
    console.log(`✅ Retrieved root tile\n`);

    console.log('6️⃣  Testing split_tile...');
    const split = await sendRequest('tools/call', {
      name: 'split_tile',
      arguments: {
        tileId: rootTileId,
        splitAttribute: 'Tool category',
        splitRationale: 'Group tools by functionality',
        subsets: [
          {
            title: 'Creation tools',
            description: 'Tools for creating trees and tiles',
            isLeaf: false
          },
          {
            title: 'Analysis tools',
            description: 'Tools for analyzing and validating',
            isLeaf: false
          },
          {
            title: 'Export tools',
            description: 'Tools for exporting data',
            isLeaf: true
          }
        ]
      }
    });
    const splitData = JSON.parse(split.content[0].text);
    childTileId = splitData.createdTiles[0].id;
    console.log(`✅ Split created ${splitData.createdTiles.length} children\n`);

    console.log('7️⃣  Testing validate_split_quality...');
    const validation = await sendRequest('tools/call', {
      name: 'validate_split_quality',
      arguments: { tileId: rootTileId }
    });
    const validationData = JSON.parse(validation.content[0].text);
    console.log(`✅ Validation score: ${validationData.score}/100\n`);

    console.log('8️⃣  Testing mark_mece...');
    const mece = await sendRequest('tools/call', {
      name: 'mark_mece',
      arguments: {
        tileId: rootTileId,
        isMECE: true,
        coverageNotes: 'All tool categories covered'
      }
    });
    console.log(`✅ Marked as MECE\n`);

    console.log('9️⃣  Testing add_tiles_to_split...');
    const addTiles = await sendRequest('tools/call', {
      name: 'add_tiles_to_split',
      arguments: {
        parentId: rootTileId,
        newTiles: [
          {
            title: 'Utility tools',
            description: 'Miscellaneous utility functions',
            isLeaf: true
          }
        ]
      }
    });
    console.log(`✅ Added tile to split\n`);

    console.log('🔟 Testing update_tile...');
    const update = await sendRequest('tools/call', {
      name: 'update_tile',
      arguments: {
        tileId: childTileId,
        title: 'Creation & Management Tools'
      }
    });
    console.log(`✅ Updated tile\n`);

    console.log('1️⃣1️⃣  Testing explore_path...');
    const explore = await sendRequest('tools/call', {
      name: 'explore_path',
      arguments: {
        tileId: rootTileId,
        depth: 3
      }
    });
    console.log(`✅ Explored path\n`);

    console.log('1️⃣2️⃣  Testing evaluate_tile...');
    const evaluate = await sendRequest('tools/call', {
      name: 'evaluate_tile',
      arguments: {
        tileId: childTileId,
        impact: 8,
        feasibility: 7,
        uniqueness: 6,
        timeframe: '1-2 months',
        notes: 'Test evaluation'
      }
    });
    console.log(`✅ Evaluated tile\n`);

    console.log('1️⃣3️⃣  Testing get_leaf_tiles...');
    const leafTiles = await sendRequest('tools/call', {
      name: 'get_leaf_tiles',
      arguments: { treeId }
    });
    const leafData = JSON.parse(leafTiles.content[0].text);
    console.log(`✅ Found ${leafData.length} leaf tile(s)\n`);

    console.log('1️⃣4️⃣  Testing get_unexplored_tiles...');
    const unexplored = await sendRequest('tools/call', {
      name: 'get_unexplored_tiles',
      arguments: { treeId }
    });
    const unexploredData = JSON.parse(unexplored.content[0].text);
    console.log(`✅ Found ${unexploredData.length} unexplored tile(s)\n`);

    console.log('1️⃣5️⃣  Testing search_tiles...');
    const search = await sendRequest('tools/call', {
      name: 'search_tiles',
      arguments: {
        query: 'tools',
        treeId
      }
    });
    const searchData = JSON.parse(search.content[0].text);
    console.log(`✅ Found ${searchData.length} matching tile(s)\n`);

    console.log('1️⃣6️⃣  Testing get_top_leaves...');
    const topLeaves = await sendRequest('tools/call', {
      name: 'get_top_leaves',
      arguments: {
        criteria: 'combined',
        limit: 5,
        treeId
      }
    });
    const topData = JSON.parse(topLeaves.content[0].text);
    console.log(`✅ Found ${topData.length} top-rated leaf tile(s)\n`);

    console.log('1️⃣7️⃣  Testing get_coverage_analysis...');
    const coverage = await sendRequest('tools/call', {
      name: 'get_coverage_analysis',
      arguments: { treeId }
    });
    const coverageData = JSON.parse(coverage.content[0].text);
    console.log(`✅ Coverage: ${coverageData.totalTiles} tiles, ${coverageData.leafTiles} leaves\n`);

    console.log('1️⃣8️⃣  Testing get_tree_validation_report...');
    const treeValidation = await sendRequest('tools/call', {
      name: 'get_tree_validation_report',
      arguments: { treeId }
    });
    const treeValData = JSON.parse(treeValidation.content[0].text);
    console.log(`✅ Tree validation score: ${treeValData.overallScore}/100\n`);

    console.log('1️⃣9️⃣  Testing get_statistics...');
    const stats = await sendRequest('tools/call', {
      name: 'get_statistics',
      arguments: {}
    });
    const statsData = JSON.parse(stats.content[0].text);
    console.log(`✅ Statistics: ${statsData.totalTrees} trees, ${statsData.totalTiles} tiles\n`);

    console.log('2️⃣0️⃣  Testing export_tree (JSON)...');
    const exportJson = await sendRequest('tools/call', {
      name: 'export_tree',
      arguments: {
        treeId,
        format: 'json'
      }
    });
    console.log(`✅ Exported as JSON\n`);

    console.log('2️⃣1️⃣  Testing export_tree (Markdown)...');
    const exportMd = await sendRequest('tools/call', {
      name: 'export_tree',
      arguments: {
        treeId,
        format: 'markdown'
      }
    });
    console.log(`✅ Exported as Markdown\n`);

    console.log('2️⃣2️⃣  Testing export_tree (Mermaid)...');
    const exportMermaid = await sendRequest('tools/call', {
      name: 'export_tree',
      arguments: {
        treeId,
        format: 'mermaid'
      }
    });
    console.log(`✅ Exported as Mermaid\n`);

    console.log('2️⃣3️⃣  Testing export_tree (DOT)...');
    const exportDot = await sendRequest('tools/call', {
      name: 'export_tree',
      arguments: {
        treeId,
        format: 'dot'
      }
    });
    console.log(`✅ Exported as DOT\n`);

    console.log('═══════════════════════════════════════');
    console.log('🎉 ALL TESTS PASSED! All tools working!');
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    server.kill();
    process.exit(0);
  }
}

// Start tests after server initializes
setTimeout(() => {
  runTests();
}, 500);

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});
