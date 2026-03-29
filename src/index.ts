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
    version: "0.4.0",
  },
  {
    capabilities: {
      tools: {},
    },
    instructions:
      "Tiling Trees MCP: Systematic solution space exploration using MECE principles. " +
      "Start by calling create_tree with a problem statement, then use split_tile to " +
      "partition the space into mutually exclusive, collectively exhaustive subsets. " +
      "Validate splits with validate_split_quality and mark_mece. Evaluate leaf tiles " +
      "with evaluate_tile. Use get_coverage_analysis to identify gaps. " +
      "Key workflow: create_tree → split_tile → validate_split_quality → mark_mece → evaluate_tile → get_top_leaves. " +
      "All tile ID parameters accept either a UUID or a slash-separated path (e.g. 'Energy Source/Chemical') " +
      "when an active tree is set via set_active_tree. Data is persisted to disk automatically.",
  }
);

const treeManager = new ResearchTreeManager();

// ─── Helper: resolve optional treeId, falling back to active tree ─────────
function resolveTreeId(args: Record<string, unknown>, required: boolean = false): string | undefined {
  const treeId = args.treeId as string | undefined;
  if (treeId) return treeId;
  const active = treeManager.getActiveTreeId();
  if (active) return active;
  if (required) throw new Error("No treeId provided and no active tree set. Use set_active_tree first.");
  return undefined;
}

// ─── Tool definitions ─────────────────────────────────────────────────────

const TILE_ID_DESC = "ID of the tile (UUID or slash-separated path when active tree is set)";

const TOOLS: Tool[] = [
  // ── Tree management ──────────────────────────────────────────────────
  {
    name: "create_tree",
    description:
      "Create a new tiling tree to explore a problem/challenge. The tree starts with a root tile representing the complete solution space, which you'll then split recursively using MECE (Mutually Exclusive, Collectively Exhaustive) principles.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for this tiling tree" },
        problemStatement: {
          type: "string",
          description:
            "The problem or challenge to explore (e.g., 'How can we reduce carbon emissions in transportation?')",
        },
      },
      required: ["name", "problemStatement"],
    },
  },
  {
    name: "get_trees",
    description: "Get all tiling trees",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "delete_tree",
    description: "Delete an entire tiling tree and all its tiles permanently.",
    inputSchema: {
      type: "object",
      properties: {
        treeId: { type: "string", description: "ID of the tree to delete" },
      },
      required: ["treeId"],
    },
  },
  {
    name: "clone_tree",
    description:
      "Create a deep copy of a tree with new IDs. Useful for exploring different split strategies for the same problem.",
    inputSchema: {
      type: "object",
      properties: {
        treeId: { type: "string", description: "ID of the tree to clone" },
        newName: {
          type: "string",
          description: "Name for the cloned tree (defaults to original name + ' (copy)')",
        },
      },
      required: ["treeId"],
    },
  },
  {
    name: "set_active_tree",
    description:
      "Set the active tree context. Once set, tools with optional treeId default to this tree, and path-based tile lookup is enabled (e.g., 'Energy Source/Chemical' instead of UUIDs). Pass empty string to clear.",
    inputSchema: {
      type: "object",
      properties: {
        treeId: {
          type: "string",
          description: "ID of the tree to set as active, or empty string to clear",
        },
      },
      required: ["treeId"],
    },
  },

  // ── Tile mutation ────────────────────────────────────────────────────
  {
    name: "split_tile",
    description:
      "Split a tile into MECE (Mutually Exclusive, Collectively Exhaustive) subsets using a specific attribute/dimension. This is the core operation — partitioning the solution space systematically. Requires at least 2 subsets.",
    inputSchema: {
      type: "object",
      properties: {
        tileId: { type: "string", description: TILE_ID_DESC },
        splitAttribute: {
          type: "string",
          description:
            "The attribute/dimension used to split (e.g., 'energy source', 'scale', 'physical mechanism', 'timeframe')",
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
                description:
                  "Precise definition of this subset to ensure no overlap with siblings",
              },
              isLeaf: {
                type: "boolean",
                description: "True if this is a concrete idea/project (leaf node)",
              },
            },
            required: ["title", "description"],
          },
          description: "The mutually exclusive and collectively exhaustive subsets (minimum 2)",
        },
      },
      required: ["tileId", "splitAttribute", "splitRationale", "subsets"],
    },
  },
  {
    name: "resplit_tile",
    description:
      "Re-split a tile that has already been split. Removes ALL existing children and their subtrees, then creates new children from the provided subsets. Use when the original split dimension was wrong. Warns about any evaluated leaves that will be destroyed.",
    inputSchema: {
      type: "object",
      properties: {
        tileId: { type: "string", description: TILE_ID_DESC },
        splitAttribute: { type: "string", description: "New attribute/dimension for splitting" },
        splitRationale: { type: "string", description: "Why this new attribute was chosen" },
        subsets: {
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
          description: "New subsets (minimum 2)",
        },
      },
      required: ["tileId", "splitAttribute", "splitRationale", "subsets"],
    },
  },
  {
    name: "add_tiles_to_split",
    description:
      "Add additional tiles to an existing split (when you realize a category was missed). The parent must already have been split. This invalidates the MECE validation.",
    inputSchema: {
      type: "object",
      properties: {
        parentId: { type: "string", description: TILE_ID_DESC },
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
    name: "delete_tile",
    description:
      "Delete a tile and its entire subtree. Cannot delete root tiles (use delete_tree). If deleting the last child, the parent's split metadata is cleared.",
    inputSchema: {
      type: "object",
      properties: {
        tileId: { type: "string", description: TILE_ID_DESC },
      },
      required: ["tileId"],
    },
  },
  {
    name: "mark_mece",
    description:
      "Mark a split as validated for MECE (Mutually Exclusive, Collectively Exhaustive) properties. The tile must have children.",
    inputSchema: {
      type: "object",
      properties: {
        tileId: { type: "string", description: TILE_ID_DESC },
        isMECE: { type: "boolean", description: "Whether the split is truly MECE" },
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
    description:
      "Evaluate a leaf tile (concrete idea/project) on impact, feasibility, and uniqueness (1-10). Scores are clamped to 1-10. Merges with existing evaluation (only provided fields are updated).",
    inputSchema: {
      type: "object",
      properties: {
        tileId: { type: "string", description: TILE_ID_DESC },
        impact: { type: "number", description: "Impact rating (1-10 scale)", minimum: 1, maximum: 10 },
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
        timeframe: { type: "string", description: "Expected timeframe (e.g., '1-2 years')" },
        notes: { type: "string", description: "Additional evaluation notes" },
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
    description:
      "Update a tile's information (title, description, split attributes, etc.). Cannot mark a tile with children as a leaf.",
    inputSchema: {
      type: "object",
      properties: {
        tileId: { type: "string", description: TILE_ID_DESC },
        title: { type: "string", description: "New title" },
        description: { type: "string", description: "New description (precise definition)" },
        splitAttribute: { type: "string", description: "Updated split attribute" },
        splitRationale: { type: "string", description: "Updated split rationale" },
        isLeaf: { type: "boolean", description: "Mark as leaf node" },
      },
      required: ["tileId"],
    },
  },

  // ── Tile queries ─────────────────────────────────────────────────────
  {
    name: "get_tile",
    description: "Get details of a specific tile",
    inputSchema: {
      type: "object",
      properties: {
        tileId: { type: "string", description: TILE_ID_DESC },
      },
      required: ["tileId"],
    },
  },
  {
    name: "get_tile_path",
    description: "Get the ancestry path from root to a specific tile, showing where it sits in the hierarchy",
    inputSchema: {
      type: "object",
      properties: {
        tileId: { type: "string", description: TILE_ID_DESC },
      },
      required: ["tileId"],
    },
  },
  {
    name: "get_siblings",
    description: "Get all sibling tiles (other tiles sharing the same parent split)",
    inputSchema: {
      type: "object",
      properties: {
        tileId: { type: "string", description: TILE_ID_DESC },
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
        tileId: { type: "string", description: TILE_ID_DESC },
        depth: { type: "number", description: "How many levels deep to explore (default: 10)" },
      },
      required: ["tileId"],
    },
  },
  {
    name: "get_leaf_tiles",
    description: "Get all leaf tiles (concrete ideas/projects). Defaults to active tree if set.",
    inputSchema: {
      type: "object",
      properties: {
        treeId: { type: "string", description: "Optional tree ID to filter by" },
      },
    },
  },
  {
    name: "get_unexplored_tiles",
    description:
      "Get tiles that haven't been split yet - these are gaps in your solution space exploration. Defaults to active tree if set.",
    inputSchema: {
      type: "object",
      properties: {
        treeId: { type: "string", description: "Optional tree ID to filter by" },
      },
    },
  },
  {
    name: "get_top_leaves",
    description: "Get the highest-rated leaf tiles based on evaluation criteria. Defaults to active tree if set.",
    inputSchema: {
      type: "object",
      properties: {
        criteria: {
          type: "string",
          enum: ["impact", "feasibility", "uniqueness", "combined"],
          description: "Criteria to sort by",
        },
        limit: { type: "number", description: "Number of results to return (default: 10)" },
        treeId: { type: "string", description: "Optional tree ID to filter by" },
      },
      required: ["criteria"],
    },
  },
  {
    name: "search_tiles",
    description: "Search for tiles by content. Returns empty for empty queries. Defaults to active tree if set.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        treeId: { type: "string", description: "Optional tree ID to filter by" },
      },
      required: ["query"],
    },
  },

  // ── Analysis & validation ────────────────────────────────────────────
  {
    name: "get_coverage_analysis",
    description:
      "Analyze the completeness of solution space exploration. Shows unexplored branches, unvalidated splits, and suggestions. Defaults to active tree if set.",
    inputSchema: {
      type: "object",
      properties: {
        treeId: { type: "string", description: "ID of the tree to analyze (uses active tree if not specified)" },
      },
    },
  },
  {
    name: "get_statistics",
    description: "Get overall statistics about all tiling trees",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "validate_split_quality",
    description:
      "Validate split quality and detect antipatterns (vague language, catch-all buckets, mixed dimensions, retroactive splitting, incomplete coverage). Returns detailed quality report.",
    inputSchema: {
      type: "object",
      properties: {
        tileId: { type: "string", description: TILE_ID_DESC },
      },
      required: ["tileId"],
    },
  },
  {
    name: "get_tree_validation_report",
    description:
      "Get validation report for all splits in a tree. Identifies antipatterns and overall quality score. Defaults to active tree if set.",
    inputSchema: {
      type: "object",
      properties: {
        treeId: { type: "string", description: "ID of the tree to validate (uses active tree if not specified)" },
      },
    },
  },

  // ── Export ────────────────────────────────────────────────────────────
  {
    name: "export_tree",
    description:
      "Export a tiling tree in various formats. Defaults to active tree if set. CSV format exports leaf evaluations for spreadsheet analysis.",
    inputSchema: {
      type: "object",
      properties: {
        treeId: { type: "string", description: "ID of the tree to export (uses active tree if not specified)" },
        format: {
          type: "string",
          enum: ["json", "markdown", "mermaid", "dot", "csv"],
          description: "Export format",
        },
      },
      required: ["format"],
    },
  },
];

// ─── Tool list handler ────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// ─── Tool execution handler ───────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      // ── Tree management ────────────────────────────────────────────
      case "create_tree": {
        const result = treeManager.createTree(
          args.name as string,
          args.problemStatement as string
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_trees": {
        const result = treeManager.getTrees();
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "delete_tree": {
        const result = treeManager.deleteTree(args.treeId as string);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "clone_tree": {
        const result = treeManager.cloneTree(
          args.treeId as string,
          args.newName as string | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "set_active_tree": {
        const treeId = args.treeId as string;
        const result = treeManager.setActiveTree(treeId);
        const msg = result
          ? `Active tree set to "${result.name}" (${result.id})`
          : "Active tree cleared";
        return {
          content: [{ type: "text", text: msg }],
        };
      }

      // ── Tile mutation ──────────────────────────────────────────────
      case "split_tile": {
        const tileId = treeManager.resolveTileId(args.tileId as string);
        const result = treeManager.splitTile(
          tileId,
          args.splitAttribute as string,
          args.splitRationale as string,
          args.subsets as any[]
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "resplit_tile": {
        const tileId = treeManager.resolveTileId(args.tileId as string);
        const result = treeManager.resplitTile(
          tileId,
          args.splitAttribute as string,
          args.splitRationale as string,
          args.subsets as any[]
        );
        const content: Array<{ type: "text"; text: string }> = [
          { type: "text", text: JSON.stringify(result, null, 2) },
        ];
        if (result.warning) {
          content.push({ type: "text", text: `⚠️ ${result.warning}` });
        }
        return { content };
      }

      case "add_tiles_to_split": {
        const parentId = treeManager.resolveTileId(args.parentId as string);
        const result = treeManager.addTilesToSplit(parentId, args.newTiles as any[]);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "delete_tile": {
        const tileId = treeManager.resolveTileId(args.tileId as string);
        const result = treeManager.deleteTile(tileId);
        const content: Array<{ type: "text"; text: string }> = [
          { type: "text", text: JSON.stringify(result, null, 2) },
        ];
        if (result.warning) {
          content.push({ type: "text", text: `⚠️ ${result.warning}` });
        }
        return { content };
      }

      case "mark_mece": {
        const tileId = treeManager.resolveTileId(args.tileId as string);
        const result = treeManager.markMECE(
          tileId,
          args.isMECE as boolean,
          args.coverageNotes as string | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "evaluate_tile": {
        const tileId = treeManager.resolveTileId(args.tileId as string);
        const { tile, warning } = treeManager.evaluateTile(tileId, {
          impact: args.impact as number | undefined,
          feasibility: args.feasibility as number | undefined,
          uniqueness: args.uniqueness as number | undefined,
          timeframe: args.timeframe as string | undefined,
          notes: args.notes as string | undefined,
          calculationsOrPilots: args.calculationsOrPilots as string | undefined,
        });
        const content: Array<{ type: "text"; text: string }> = [
          { type: "text", text: JSON.stringify(tile, null, 2) },
        ];
        if (warning) {
          content.push({ type: "text", text: `⚠️ ${warning}` });
        }
        return { content };
      }

      case "update_tile": {
        const tileId = treeManager.resolveTileId(args.tileId as string);
        const result = treeManager.updateTile(tileId, {
          title: args.title as string | undefined,
          description: args.description as string | undefined,
          splitAttribute: args.splitAttribute as string | undefined,
          splitRationale: args.splitRationale as string | undefined,
          isLeaf: args.isLeaf as boolean | undefined,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // ── Tile queries ───────────────────────────────────────────────
      case "get_tile": {
        const tileId = treeManager.resolveTileId(args.tileId as string);
        const result = treeManager.getTile(tileId);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_tile_path": {
        const tileId = treeManager.resolveTileId(args.tileId as string);
        const result = treeManager.getTilePath(tileId);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_siblings": {
        const tileId = treeManager.resolveTileId(args.tileId as string);
        const result = treeManager.getSiblings(tileId);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "explore_path": {
        const tileId = treeManager.resolveTileId(args.tileId as string);
        const result = treeManager.explorePath(
          tileId,
          args.depth as number | undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_leaf_tiles": {
        const treeId = resolveTreeId(args as Record<string, unknown>);
        const result = treeManager.getLeafTiles(treeId);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_unexplored_tiles": {
        const treeId = resolveTreeId(args as Record<string, unknown>);
        const result = treeManager.getUnexploredTiles(treeId);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_top_leaves": {
        const treeId = resolveTreeId(args as Record<string, unknown>);
        const result = treeManager.getTopLeaves(
          args.criteria as any,
          args.limit as number | undefined,
          treeId
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "search_tiles": {
        const treeId = resolveTreeId(args as Record<string, unknown>);
        const result = treeManager.search(args.query as string, treeId);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // ── Analysis & validation ──────────────────────────────────────
      case "get_coverage_analysis": {
        const treeId = resolveTreeId(args as Record<string, unknown>, true);
        const result = treeManager.getCoverageAnalysis(treeId!);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_statistics": {
        const result = treeManager.getStatistics();
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "validate_split_quality": {
        const tileId = treeManager.resolveTileId(args.tileId as string);
        const result = treeManager.validateSplitQuality(tileId);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_tree_validation_report": {
        const treeId = resolveTreeId(args as Record<string, unknown>, true);
        const result = treeManager.getTreeValidationReport(treeId!);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // ── Export ─────────────────────────────────────────────────────
      case "export_tree": {
        const treeId = resolveTreeId(args as Record<string, unknown>, true);
        const result = treeManager.export(args.format as any, treeId!);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// ─── Start ────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Tiling Trees MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
