#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { ResearchTreeManager } from "./research-tree.js";

const server = new Server(
  {
    name: "tiling-trees-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const treeManager = new ResearchTreeManager();

// Define available tools
const TOOLS: Tool[] = [
  {
    name: "create_research_node",
    description: "Create a new research node/tile with a concept, question, or idea. Can be attached to a parent node to build a hierarchical tree structure.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Brief title for the research node",
        },
        content: {
          type: "string",
          description: "Detailed content, question, or hypothesis",
        },
        parentId: {
          type: "string",
          description: "Optional ID of parent node to attach this to",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags for categorization",
        },
        type: {
          type: "string",
          enum: ["question", "hypothesis", "observation", "method", "result", "insight"],
          description: "Type of research node",
        },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "split_research_node",
    description: "Split a research node into multiple sub-nodes, useful for breaking down complex ideas into manageable tiles",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: {
          type: "string",
          description: "ID of the node to split",
        },
        subNodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              content: { type: "string" },
              type: { type: "string" },
            },
          },
          description: "Array of sub-nodes to create",
        },
      },
      required: ["nodeId", "subNodes"],
    },
  },
  {
    name: "link_research_nodes",
    description: "Create a relationship/link between two research nodes (beyond parent-child)",
    inputSchema: {
      type: "object",
      properties: {
        sourceId: {
          type: "string",
          description: "Source node ID",
        },
        targetId: {
          type: "string",
          description: "Target node ID",
        },
        relationshipType: {
          type: "string",
          enum: ["supports", "contradicts", "extends", "relates_to", "prerequisite"],
          description: "Type of relationship",
        },
        notes: {
          type: "string",
          description: "Notes about this relationship",
        },
      },
      required: ["sourceId", "targetId", "relationshipType"],
    },
  },
  {
    name: "explore_research_path",
    description: "Explore a specific research path from a node, showing the tree structure and related concepts",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: {
          type: "string",
          description: "Starting node ID (if omitted, shows all root nodes)",
        },
        depth: {
          type: "number",
          description: "How many levels deep to explore (default: 3)",
        },
        includeLinks: {
          type: "boolean",
          description: "Include cross-references and relationships (default: true)",
        },
      },
    },
  },
  {
    name: "search_research_tree",
    description: "Search across all research nodes for specific content, tags, or types",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (searches title and content)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags",
        },
        type: {
          type: "string",
          description: "Filter by node type",
        },
      },
    },
  },
  {
    name: "get_research_insights",
    description: "Analyze the research tree to identify patterns, gaps, and potential research directions",
    inputSchema: {
      type: "object",
      properties: {
        analysisType: {
          type: "string",
          enum: ["gaps", "clusters", "paths", "summary"],
          description: "Type of analysis to perform",
        },
        focusArea: {
          type: "string",
          description: "Optional focus area (tag or node ID)",
        },
      },
      required: ["analysisType"],
    },
  },
  {
    name: "update_research_node",
    description: "Update an existing research node with new information or refinements",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: {
          type: "string",
          description: "ID of the node to update",
        },
        title: {
          type: "string",
          description: "New title (optional)",
        },
        content: {
          type: "string",
          description: "New or updated content (optional)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Updated tags (optional)",
        },
        status: {
          type: "string",
          enum: ["exploring", "active", "completed", "archived"],
          description: "Research status (optional)",
        },
      },
      required: ["nodeId"],
    },
  },
  {
    name: "export_research_tree",
    description: "Export the research tree in various formats for visualization or further analysis",
    inputSchema: {
      type: "object",
      properties: {
        format: {
          type: "string",
          enum: ["json", "markdown", "mermaid", "dot"],
          description: "Export format",
        },
        nodeId: {
          type: "string",
          description: "Export from specific node (optional, default: entire tree)",
        },
      },
      required: ["format"],
    },
  },
  {
    name: "get_research_statistics",
    description: "Get statistics about the research tree (node counts, types, depth, etc.)",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// Handle tool list requests
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (!args) {
      throw new Error("No arguments provided");
    }

    switch (name) {
      case "create_research_node": {
        const result = treeManager.createNode(
          args.title as string,
          args.content as string,
          args.parentId as string | undefined,
          args.tags as string[] | undefined,
          args.type as any
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "split_research_node": {
        const result = treeManager.splitNode(
          args.nodeId as string,
          args.subNodes as any[]
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "link_research_nodes": {
        const result = treeManager.linkNodes(
          args.sourceId as string,
          args.targetId as string,
          args.relationshipType as any,
          args.notes as string | undefined
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "explore_research_path": {
        const result = treeManager.explorePath(
          args.nodeId as string | undefined,
          args.depth as number | undefined,
          args.includeLinks as boolean | undefined
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "search_research_tree": {
        const result = treeManager.search(
          args.query as string | undefined,
          args.tags as string[] | undefined,
          args.type as string | undefined
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_research_insights": {
        const result = treeManager.getInsights(
          args.analysisType as any,
          args.focusArea as string | undefined
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "update_research_node": {
        const result = treeManager.updateNode(
          args.nodeId as string,
          {
            title: args.title as string | undefined,
            content: args.content as string | undefined,
            tags: args.tags as string[] | undefined,
            status: args.status as any,
          }
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "export_research_tree": {
        const result = treeManager.export(
          args.format as any,
          args.nodeId as string | undefined
        );
        return {
          content: [
            {
              type: "text",
              text: result,
            },
          ],
        };
      }

      case "get_research_statistics": {
        const result = treeManager.getStatistics();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Tiling Trees MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
