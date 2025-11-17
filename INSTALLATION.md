# Installation Guide

## Prerequisites

- **Node.js** version 18 or higher
- **npm** (comes with Node.js)
- **Claude Desktop** app (for interactive use)

Check your versions:
```bash
node --version  # Should be v18.0.0 or higher
npm --version
```

## Installation Steps

### 1. Clone or Navigate to Repository

```bash
cd /home/user/tiling-trees-mcp
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `typescript` - TypeScript compiler
- `@types/node` - Node.js type definitions

### 3. Build the Server

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

**Verify build:**
```bash
ls -la dist/
# Should show: index.js, index.d.ts, research-tree.js, research-tree.d.ts
```

### 4. Test Standalone (Optional)

Quick test that server starts:
```bash
node dist/index.js
```

You should see: `Tiling Trees MCP server running on stdio`

Press Ctrl+C to stop.

## Configuration for Claude Desktop

### Find Your Config File

**macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```bash
~/.config/Claude/claude_desktop_config.json
```

### Add Server Configuration

Edit the config file (create if it doesn't exist):

```json
{
  "mcpServers": {
    "tiling-trees": {
      "command": "node",
      "args": ["/home/user/tiling-trees-mcp/dist/index.js"]
    }
  }
}
```

**Important**: Use the **absolute path** to your dist/index.js file.

If you have other MCP servers configured, add tiling-trees to the existing `mcpServers` object:

```json
{
  "mcpServers": {
    "some-other-server": {
      "command": "...",
      "args": ["..."]
    },
    "tiling-trees": {
      "command": "node",
      "args": ["/home/user/tiling-trees-mcp/dist/index.js"]
    }
  }
}
```

### Get Absolute Path

If you're not sure of the absolute path:

```bash
cd /home/user/tiling-trees-mcp
pwd
# Copy the output and append /dist/index.js
```

**Example paths:**
- Linux/Mac: `/home/username/projects/tiling-trees-mcp/dist/index.js`
- Windows: `C:/Users/username/tiling-trees-mcp/dist/index.js`

### Restart Claude Desktop

1. Quit Claude Desktop completely
2. Reopen Claude Desktop
3. The MCP server will load automatically

## Verification

### Check Server Loaded

In Claude Desktop, ask:
```
What MCP servers are you connected to?
```

You should see "tiling-trees" listed.

### List Available Tools

```
What tools does the tiling-trees server provide?
```

You should see all 17 tools:
1. create_tree
2. split_tile
3. add_tiles_to_split
4. mark_mece
5. evaluate_tile
6. update_tile
7. get_trees
8. get_tile
9. explore_path
10. get_leaf_tiles
11. get_unexplored_tiles
12. get_top_leaves
13. search_tiles
14. get_coverage_analysis
15. get_statistics
16. export_tree
17. validate_split_quality
18. get_tree_validation_report

### Quick Functionality Test

```
Create a tiling tree for "Test problem"
```

If this works, installation is successful!

## Troubleshooting

### Server Not Loading

**Check Claude Desktop logs:**
- Menu: Help → Debugging → Show Logs
- Look for errors mentioning "tiling-trees"

**Common issues:**
1. **Wrong path**: Ensure absolute path to dist/index.js
2. **Not built**: Run `npm run build`
3. **Node version**: Check `node --version` >= 18
4. **Syntax error in config**: Validate JSON with a JSON validator

### Build Errors

**If `npm install` fails:**
```bash
# Clear cache and retry
rm -rf node_modules package-lock.json
npm install
```

**If TypeScript compilation fails:**
```bash
# Check TypeScript is installed
npm list typescript

# Reinstall
npm install --save-dev typescript
npm run build
```

### Permission Issues (Linux/Mac)

```bash
# Make sure you own the directory
ls -la /home/user/tiling-trees-mcp

# If needed, fix permissions
chmod -R u+rw /home/user/tiling-trees-mcp
```

### Windows Path Issues

Use forward slashes or double backslashes in config:
```json
"args": ["C:/Users/username/tiling-trees-mcp/dist/index.js"]
```
or
```json
"args": ["C:\\Users\\username\\tiling-trees-mcp\\dist\\index.js"]
```

## Development Setup

### Watch Mode

For development, use watch mode to auto-rebuild on changes:

```bash
npm run watch
```

Leave this running in one terminal, and Claude Desktop will pick up changes after restart.

### Hot Reload

After making code changes:
1. Save files (watch mode rebuilds automatically)
2. Restart Claude Desktop to reload the server

### Testing Changes

Use the test script:
```bash
node test-server.js
```

Or test interactively in Claude Desktop.

## Updating

When you pull new changes or make modifications:

```bash
# Rebuild
npm run build

# Restart Claude Desktop to load new version
```

The server version is in `package.json` and will be logged on startup.

## Uninstallation

To remove the server:

1. Remove from Claude Desktop config:
   ```json
   {
     "mcpServers": {
       // Remove the "tiling-trees" entry
     }
   }
   ```

2. Restart Claude Desktop

3. (Optional) Delete the repository:
   ```bash
   rm -rf /home/user/tiling-trees-mcp
   ```

## Using with Other MCP Clients

This server works with any MCP-compatible client, not just Claude Desktop.

**Generic configuration:**
- **Command**: `node`
- **Args**: `["/absolute/path/to/dist/index.js"]`
- **Communication**: stdio (standard input/output)
- **Protocol**: MCP 2024-11-05

## Advanced Configuration

### Environment Variables

You can pass environment variables if needed:

```json
{
  "mcpServers": {
    "tiling-trees": {
      "command": "node",
      "args": ["/home/user/tiling-trees-mcp/dist/index.js"],
      "env": {
        "DEBUG": "true"
      }
    }
  }
}
```

### Custom Node Path

If you need to use a specific Node.js version:

```json
{
  "mcpServers": {
    "tiling-trees": {
      "command": "/usr/local/bin/node",
      "args": ["/home/user/tiling-trees-mcp/dist/index.js"]
    }
  }
}
```

## Getting Help

- **Documentation**: See README.md for tool descriptions
- **Examples**: See EXAMPLES.md for usage patterns
- **Testing**: See TESTING.md for test workflows
- **Issues**: Report at GitHub repository

## Next Steps

After successful installation:
1. Read TESTING.md for test workflows
2. Try the examples from EXAMPLES.md
3. Explore the validation features
4. Build your first tiling tree!
