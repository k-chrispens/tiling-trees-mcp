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
    version: "0.3.0",
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
    name: "create_tree",
    description: "Create a new tiling tree to explore a problem/challenge. The tree starts with a root tile representing the complete solution space, which you'll then split recursively using MECE (Mutually Exclusive, Collectively Exhaustive) principles.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for this tiling tree",
        },
        problemStatement: {
          type: "string",
          description: "The problem or challenge to explore (e.g., 'How can we reduce carbon emissions in transportation?')",
        },
      },
      required: ["name", "problemStatement"],
    },
  },
  {
    name: "split_tile",
    description: "Split a tile into MECE (Mutually Exclusive, Collectively Exhaustive) subsets using a specific attribute/dimension. This is the core operation of the tiling trees method - partitioning the solution space systematically. Use physics/math-oriented splits when possible.",
    inputSchema: {
      type: "object",
      properties: {
        tileId: {
          type: "string",
          description: "ID of the tile to split",
        },
        splitAttribute: {
          type: "string",
          description: "The attribute/dimension used to split (e.g., 'energy source', 'scale', 'physical mechanism', 'timeframe')",
        },
        splitRationale: {
          type: "string",
          description: "Why this attribute was chosen for splitting",
        },
        subsets: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: {
                type: "string",
                description: "Precise definition of this subset to ensure no overlap with siblings",
              },
              isLeaf: {
                type: "boolean",
                description: "True if this is a concrete idea/project (leaf node)",
              },
            },
            required: ["title", "description"],
          },
          description: "The mutually exclusive and collectively exhaustive subsets",
        },
      },
      required: ["tileId", "splitAttribute", "splitRationale", "subsets"],
    },
  },
  {
    name: "add_tiles_to_split",
    description: "Add additional tiles to an existing split (when you realize a category was missed). This invalidates the MECE validation and requires re-verification.",
    inputSchema: {
      type: "object",
      properties: {
        parentId: {
          type: "string",
          description: "ID of the parent tile",
        },
        newTiles: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              isLeaf: { type: "boolean" },
            },
            required: ["title", "description"],
          },
          description: "New tiles to add to the split",
        },
      },
      required: ["parentId", "newTiles"],
    },
  },
  {
    name: "mark_mece",
    description: "Mark a split as validated for MECE (Mutually Exclusive, Collectively Exhaustive) properties. Verify that the children completely cover the parent space with no overlaps.",
    inputSchema: {
      type: "object",
      properties: {
        tileId: {
          type: "string",
          description: "ID of the tile whose split to validate",
        },
        isMECE: {
          type: "boolean",
          description: "Whether the split is truly MECE",
        },
        coverageNotes: {
          type: "string",
          description: "Notes on the completeness and exclusivity of the split",
        },
      },
      required: ["tileId", "isMECE"],
    },
  },
  {
    name: "evaluate_tile",
    description: "Evaluate a leaf tile (concrete idea/project) on impact, feasibility, and uniqueness. Include any calculations or pilot studies performed.",
    inputSchema: {
      type: "object",
      properties: {
        tileId: {
          type: "string",
          description: "ID of the tile to evaluate",
        },
        impact: {
          type: "number",
          description: "Impact rating (1-10 scale)",
          minimum: 1,
          maximum: 10,
        },
        feasibility: {
          type: "number",
          description: "Feasibility rating (1-10 scale)",
          minimum: 1,
          maximum: 10,
        },
        uniqueness: {
          type: "number",
          description: "Uniqueness rating (1-10 scale)",
          minimum: 1,
          maximum: 10,
        },
        timeframe: {
          type: "string",
          description: "Expected timeframe (e.g., '1-2 years', '5-10 years')",
        },
        notes: {
          type: "string",
          description: "Additional evaluation notes",
        },
        calculationsOrPilots: {
          type: "string",
          description: "Calculations or pilot studies performed to evaluate this idea",
        },
      },
      required: ["tileId"],
    },
  },
  {
    name: "update_tile",
    description: "Update a tile's information (title, description, split attributes, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        tileId: {
          type: "string",
          description: "ID of the tile to update",
        },
        title: {
          type: "string",
          description: "New title",
        },
        description: {
          type: "string",
          description: "New description (precise definition)",
        },
        splitAttribute: {
          type: "string",
          description: "Updated split attribute",
        },
        splitRationale: {
          type: "string",
          description: "Updated split rationale",
        },
        isLeaf: {
          type: "boolean",
          description: "Mark as leaf node",
        },
      },
      required: ["tileId"],
    },
  },
  {
    name: "get_trees",
    description: "Get all tiling trees",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_tile",
    description: "Get details of a specific tile",
    inputSchema: {
      type: "object",
      properties: {
        tileId: {
          type: "string",
          description: "ID of the tile",
        },
      },
      required: ["tileId"],
    },
  },
  {
    name: "explore_path",
    description: "Explore the tree structure from a specific tile, showing the hierarchical breakdown",
    inputSchema: {
      type: "object",
      properties: {
        tileId: {
          type: "string",
          description: "ID of the tile to explore from",
        },
        depth: {
          type: "number",
          description: "How many levels deep to explore (default: 10)",
        },
      },
      required: ["tileId"],
    },
  },
  {
    name: "get_leaf_tiles",
    description: "Get all leaf tiles (concrete ideas/projects) from a tree",
    inputSchema: {
      type: "object",
      properties: {
        treeId: {
          type: "string",
          description: "Optional tree ID to filter by",
        },
      },
    },
  },
  {
    name: "get_unexplored_tiles",
    description: "Get tiles that haven't been split yet - these are gaps in your solution space exploration",
    inputSchema: {
      type: "object",
      properties: {
        treeId: {
          type: "string",
          description: "Optional tree ID to filter by",
        },
      },
    },
  },
  {
    name: "get_top_leaves",
    description: "Get the highest-rated leaf tiles based on evaluation criteria",
    inputSchema: {
      type: "object",
      properties: {
        criteria: {
          type: "string",
          enum: ["impact", "feasibility", "uniqueness", "combined"],
          description: "Criteria to sort by",
        },
        limit: {
          type: "number",
          description: "Number of results to return (default: 10)",
        },
        treeId: {
          type: "string",
          description: "Optional tree ID to filter by",
        },
      },
      required: ["criteria"],
    },
  },
  {
    name: "search_tiles",
    description: "Search for tiles by content",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
        treeId: {
          type: "string",
          description: "Optional tree ID to filter by",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_coverage_analysis",
    description: "Analyze the completeness of solution space exploration for a tree. Shows unexplored branches, unvalidated splits, and suggestions for next steps.",
    inputSchema: {
      type: "object",
      properties: {
        treeId: {
          type: "string",
          description: "ID of the tree to analyze",
        },
      },
      required: ["treeId"],
    },
  },
  {
    name: "get_statistics",
    description: "Get overall statistics about all tiling trees",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "export_tree",
    description: "Export a tiling tree in various formats for visualization or documentation",
    inputSchema: {
      type: "object",
      properties: {
        treeId: {
          type: "string",
          description: "ID of the tree to export",
        },
        format: {
          type: "string",
          enum: ["json", "markdown", "mermaid", "dot"],
          description: "Export format",
        },
      },
      required: ["treeId", "format"],
    },
  },
  {
    name: "validate_split_quality",
    description: "Validate split quality and detect common antipatterns (vague language, catch-all buckets, mixed dimensions, retroactive splitting, incomplete coverage). Returns a detailed quality report with issues and recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        tileId: {
          type: "string",
          description: "ID of the tile whose split to validate",
        },
      },
      required: ["tileId"],
    },
  },
  {
    name: "get_tree_validation_report",
    description: "Get validation report for all splits in a tree. Identifies antipatterns and provides an overall quality score. Use this after building a tree to check for common failure modes.",
    inputSchema: {
      type: "object",
      properties: {
        treeId: {
          type: "string",
          description: "ID of the tree to validate",
        },
      },
      required: ["treeId"],
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
      case "create_tree": {
        const result = treeManager.createTree(
          args.name as string,
          args.problemStatement as string
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

      case "split_tile": {
        const result = treeManager.splitTile(
          args.tileId as string,
          args.splitAttribute as string,
          args.splitRationale as string,
          args.subsets as any[]
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

      case "add_tiles_to_split": {
        const result = treeManager.addTilesToSplit(
          args.parentId as string,
          args.newTiles as any[]
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

      case "mark_mece": {
        const result = treeManager.markMECE(
          args.tileId as string,
          args.isMECE as boolean,
          args.coverageNotes as string | undefined
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

      case "evaluate_tile": {
        const result = treeManager.evaluateTile(args.tileId as string, {
          impact: args.impact as number | undefined,
          feasibility: args.feasibility as number | undefined,
          uniqueness: args.uniqueness as number | undefined,
          timeframe: args.timeframe as string | undefined,
          notes: args.notes as string | undefined,
          calculationsOrPilots: args.calculationsOrPilots as string | undefined,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "update_tile": {
        const result = treeManager.updateTile(args.tileId as string, {
          title: args.title as string | undefined,
          description: args.description as string | undefined,
          splitAttribute: args.splitAttribute as string | undefined,
          splitRationale: args.splitRationale as string | undefined,
          isLeaf: args.isLeaf as boolean | undefined,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_trees": {
        const result = treeManager.getTrees();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_tile": {
        const result = treeManager.getTile(args.tileId as string);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "explore_path": {
        const result = treeManager.explorePath(
          args.tileId as string,
          args.depth as number | undefined
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

      case "get_leaf_tiles": {
        const result = treeManager.getLeafTiles(args.treeId as string | undefined);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_unexplored_tiles": {
        const result = treeManager.getUnexploredTiles(
          args.treeId as string | undefined
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

      case "get_top_leaves": {
        const result = treeManager.getTopLeaves(
          args.criteria as any,
          args.limit as number | undefined,
          args.treeId as string | undefined
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

      case "search_tiles": {
        const result = treeManager.search(
          args.query as string,
          args.treeId as string | undefined
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

      case "get_coverage_analysis": {
        const result = treeManager.getCoverageAnalysis(args.treeId as string);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_statistics": {
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

      case "export_tree": {
        const result = treeManager.export(
          args.format as any,
          args.treeId as string
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

      case "validate_split_quality": {
        const result = treeManager.validateSplitQuality(args.tileId as string);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_tree_validation_report": {
        const result = treeManager.getTreeValidationReport(args.treeId as string);
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
