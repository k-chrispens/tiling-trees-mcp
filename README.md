# Tiling Trees MCP Server

A Model Context Protocol (MCP) server for exploring research ideas using the tiling trees method. This server provides tools to create, organize, and analyze hierarchical research structures through a tile-based approach.

<a href="https://glama.ai/mcp/servers/@k-chrispens/tiling-trees-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@k-chrispens/tiling-trees-mcp/badge" alt="Tiling Trees Server MCP server" />
</a>

## Features

- **Hierarchical Research Nodes**: Create and organize research ideas as interconnected nodes (tiles)
- **Multiple Node Types**: Support for questions, hypotheses, observations, methods, results, and insights
- **Relationship Mapping**: Link nodes with various relationship types (supports, contradicts, extends, etc.)
- **Smart Analysis**: Identify research gaps, clusters, and patterns in your research tree
- **Multiple Export Formats**: Export to JSON, Markdown, Mermaid diagrams, and DOT graphs
- **Search & Exploration**: Query and navigate through your research structure

## Installation

```bash
npm install
npm run build
```

## Configuration

Add to your MCP settings file (e.g., `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "tiling-trees": {
      "command": "node",
      "args": ["/path/to/tiling-trees-mcp/dist/index.js"]
    }
  }
}
```

## Available Tools

### 1. create_research_node

Create a new research node/tile with a concept, question, or idea.

**Parameters:**
- `title` (required): Brief title for the research node
- `content` (required): Detailed content, question, or hypothesis
- `parentId` (optional): ID of parent node to attach this to
- `tags` (optional): Array of tags for categorization
- `type` (optional): Type of node - `question`, `hypothesis`, `observation`, `method`, `result`, or `insight`

**Example:**
```json
{
  "title": "How does attention mechanism work in transformers?",
  "content": "Investigate the self-attention mechanism and its role in transformer architectures",
  "type": "question",
  "tags": ["nlp", "transformers", "deep-learning"]
}
```

### 2. split_research_node

Split a complex research node into multiple sub-nodes for better organization.

**Parameters:**
- `nodeId` (required): ID of the node to split
- `subNodes` (required): Array of sub-nodes to create with `title`, `content`, and optional `type`

**Example:**
```json
{
  "nodeId": "abc-123",
  "subNodes": [
    {
      "title": "Query mechanism",
      "content": "How queries are computed in self-attention",
      "type": "question"
    },
    {
      "title": "Key-Value pairing",
      "content": "Understanding the key-value relationship",
      "type": "question"
    }
  ]
}
```

### 3. link_research_nodes

Create relationships between nodes beyond parent-child hierarchy.

**Parameters:**
- `sourceId` (required): Source node ID
- `targetId` (required): Target node ID
- `relationshipType` (required): Type - `supports`, `contradicts`, `extends`, `relates_to`, or `prerequisite`
- `notes` (optional): Additional notes about the relationship

### 4. explore_research_path

Explore the research tree from a specific node or view all roots.

**Parameters:**
- `nodeId` (optional): Starting node ID (omit to show all root nodes)
- `depth` (optional): How many levels deep to explore (default: 3)
- `includeLinks` (optional): Include cross-references (default: true)

### 5. search_research_tree

Search across all research nodes.

**Parameters:**
- `query` (optional): Search text (searches title and content)
- `tags` (optional): Filter by tags
- `type` (optional): Filter by node type

### 6. get_research_insights

Analyze the research tree to identify patterns and opportunities.

**Parameters:**
- `analysisType` (required): Type of analysis - `gaps`, `clusters`, `paths`, or `summary`
- `focusArea` (optional): Focus on specific tag or node ID

**Analysis Types:**
- `gaps`: Find unexpanded nodes, unanswered questions, and hypotheses without methods
- `clusters`: Identify groups of related nodes by tags and types
- `paths`: Analyze research paths and find most connected nodes
- `summary`: Get overall statistics and recent activity

### 7. update_research_node

Update an existing research node.

**Parameters:**
- `nodeId` (required): ID of the node to update
- `title` (optional): New title
- `content` (optional): Updated content
- `tags` (optional): Updated tags
- `status` (optional): Status - `exploring`, `active`, `completed`, or `archived`

### 8. export_research_tree

Export the research tree in various formats.

**Parameters:**
- `format` (required): Export format - `json`, `markdown`, `mermaid`, or `dot`
- `nodeId` (optional): Export from specific node (default: entire tree)

### 9. get_research_statistics

Get statistics about the research tree structure.

## Usage Examples

### Example 1: Building a Research Question Tree

```typescript
// 1. Create root question
const rootQuestion = await create_research_node({
  title: "How can we improve transformer efficiency?",
  content: "Explore methods to reduce computational costs of transformer models",
  type: "question",
  tags: ["efficiency", "transformers"]
});

// 2. Add hypotheses
const hypothesis1 = await create_research_node({
  title: "Sparse attention patterns reduce computation",
  content: "Using sparse attention instead of full attention can reduce O(n²) complexity",
  parentId: rootQuestion.id,
  type: "hypothesis",
  tags: ["efficiency", "attention"]
});

// 3. Add methods
const method1 = await create_research_node({
  title: "Implement sliding window attention",
  content: "Test sliding window with various window sizes on benchmark tasks",
  parentId: hypothesis1.id,
  type: "method",
  tags: ["implementation", "attention"]
});

// 4. Link related concepts
await link_research_nodes({
  sourceId: hypothesis1.id,
  targetId: anotherHypothesis.id,
  relationshipType: "relates_to",
  notes: "Both approaches aim to reduce quadratic complexity"
});
```

### Example 2: Finding Research Gaps

```typescript
// Identify areas that need more exploration
const gaps = await get_research_insights({
  analysisType: "gaps"
});

// Returns:
// - Leaf nodes (areas to expand)
// - Unanswered questions
// - Hypotheses without methods
```

### Example 3: Exporting for Visualization

```typescript
// Export as Mermaid diagram
const mermaidDiagram = await export_research_tree({
  format: "mermaid",
  nodeId: rootQuestion.id
});

// Use in Mermaid visualizer or documentation
```

## Research Workflow

1. **Start with Questions**: Create root nodes with research questions
2. **Develop Hypotheses**: Add potential answers as child nodes
3. **Design Methods**: Attach methods to test each hypothesis
4. **Record Observations**: Document what you observe during research
5. **Capture Results**: Add result nodes with findings
6. **Extract Insights**: Create insight nodes for key learnings
7. **Link Relationships**: Connect related concepts across the tree
8. **Analyze & Iterate**: Use insights tools to find gaps and new directions

## Node Types Guide

- **question**: Research questions to investigate
- **hypothesis**: Proposed answers or explanations
- **observation**: Empirical observations or data points
- **method**: Approaches or procedures to test hypotheses
- **result**: Outcomes from applying methods
- **insight**: Key learnings or conclusions

## Export Formats

### JSON
Complete data structure with all nodes and links.

### Markdown
Human-readable hierarchical document with sections for each node.

### Mermaid
Flowchart diagram syntax for visualization (use with Mermaid.js).

### DOT
GraphViz format for generating publication-quality graphs.

## Tips for Effective Research Trees

1. **Keep tiles focused**: Each node should represent one clear concept
2. **Use appropriate types**: Distinguish between questions, hypotheses, and results
3. **Tag consistently**: Use tags to create cross-cutting themes
4. **Link generously**: Connect related ideas even if not parent-child
5. **Regular analysis**: Use insights tools to guide your research direction
6. **Update status**: Mark nodes as exploring, active, completed, or archived

## Integration with Tiling Trees Web Interface

This MCP server can work alongside the tiling-trees web interface. Export your research tree and import it into the web interface for visual exploration, or use the MCP server to programmatically build structures that you visualize in the web app.

## License

MIT