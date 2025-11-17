import { randomUUID } from "crypto";

/**
 * Tile represents a subset of the solution space
 * All children of a tile should be mutually exclusive and collectively exhaustive (MECE)
 */
export interface Tile {
  id: string;
  title: string;
  description: string; // Precise definition of this subset
  parentId?: string;
  childrenIds: string[];

  // Split information - how this tile was subdivided
  splitAttribute?: string; // The attribute/dimension used to split (e.g., "energy source", "scale", "mechanism")
  splitRationale?: string; // Why this attribute was chosen

  // MECE validation
  isMECE?: boolean; // Whether children are verified as mutually exclusive & collectively exhaustive
  coverageNotes?: string; // Notes on completeness of the split

  // For leaf nodes (concrete ideas/projects)
  isLeaf: boolean;

  // Evaluation (primarily for leaves)
  evaluation?: {
    impact?: number; // 1-10 scale
    feasibility?: number; // 1-10 scale
    uniqueness?: number; // 1-10 scale
    timeframe?: string; // e.g., "1-2 years"
    notes?: string;
    calculationsOrPilots?: string; // Studies done to evaluate
  };

  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

/**
 * TilingTree represents a complete problem-solution exploration
 */
export interface TilingTree {
  id: string;
  name: string;
  problemStatement: string; // The original problem/challenge being explored
  rootTileId: string; // The complete solution space
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

export class ResearchTreeManager {
  private trees: Map<string, TilingTree> = new Map();
  private tiles: Map<string, Tile> = new Map();

  /**
   * Create a new tiling tree to explore a problem
   */
  createTree(name: string, problemStatement: string): TilingTree {
    const rootTile: Tile = {
      id: randomUUID(),
      title: "Complete Solution Space",
      description: `All possible solutions to: ${problemStatement}`,
      childrenIds: [],
      isLeaf: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    const tree: TilingTree = {
      id: randomUUID(),
      name,
      problemStatement,
      rootTileId: rootTile.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    this.tiles.set(rootTile.id, rootTile);
    this.trees.set(tree.id, tree);

    return tree;
  }

  /**
   * Get all trees
   */
  getTrees(): TilingTree[] {
    return Array.from(this.trees.values());
  }

  /**
   * Get a specific tree
   */
  getTree(treeId: string): TilingTree | undefined {
    return this.trees.get(treeId);
  }

  /**
   * Create a tile (subset of the solution space)
   */
  createTile(
    title: string,
    description: string,
    parentId?: string,
    isLeaf: boolean = false
  ): Tile {
    if (parentId && !this.tiles.has(parentId)) {
      throw new Error(`Parent tile ${parentId} not found`);
    }

    const tile: Tile = {
      id: randomUUID(),
      title,
      description,
      parentId,
      childrenIds: [],
      isLeaf,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    this.tiles.set(tile.id, tile);

    // Update parent's children
    if (parentId) {
      const parent = this.tiles.get(parentId)!;
      parent.childrenIds.push(tile.id);
      parent.updatedAt = new Date();
    }

    return tile;
  }

  /**
   * Split a tile into MECE subsets using a specific attribute
   */
  splitTile(
    tileId: string,
    splitAttribute: string,
    splitRationale: string,
    subsets: Array<{ title: string; description: string; isLeaf?: boolean }>
  ): { parentTile: Tile; createdTiles: Tile[] } {
    const tile = this.tiles.get(tileId);
    if (!tile) {
      throw new Error(`Tile ${tileId} not found`);
    }

    if (tile.childrenIds.length > 0) {
      throw new Error(`Tile ${tileId} has already been split. Use addTilesToSplit to add more tiles.`);
    }

    // Create the child tiles
    const createdTiles = subsets.map((subset) =>
      this.createTile(
        subset.title,
        subset.description,
        tileId,
        subset.isLeaf || false
      )
    );

    // Update parent with split information
    tile.splitAttribute = splitAttribute;
    tile.splitRationale = splitRationale;
    tile.isMECE = undefined; // Needs validation
    tile.isLeaf = false; // No longer a leaf
    tile.updatedAt = new Date();

    return {
      parentTile: tile,
      createdTiles,
    };
  }

  /**
   * Add additional tiles to an existing split (if you realize you missed a category)
   */
  addTilesToSplit(
    parentId: string,
    newTiles: Array<{ title: string; description: string; isLeaf?: boolean }>
  ): Tile[] {
    const parent = this.tiles.get(parentId);
    if (!parent) {
      throw new Error(`Parent tile ${parentId} not found`);
    }

    const createdTiles = newTiles.map((tile) =>
      this.createTile(tile.title, tile.description, parentId, tile.isLeaf || false)
    );

    // Invalidate MECE status since we're adding to the split
    parent.isMECE = undefined;
    parent.updatedAt = new Date();

    return createdTiles;
  }

  /**
   * Mark a split as MECE validated
   */
  markMECE(
    tileId: string,
    isMECE: boolean,
    coverageNotes?: string
  ): Tile {
    const tile = this.tiles.get(tileId);
    if (!tile) {
      throw new Error(`Tile ${tileId} not found`);
    }

    tile.isMECE = isMECE;
    tile.coverageNotes = coverageNotes;
    tile.updatedAt = new Date();

    return tile;
  }

  /**
   * Evaluate a leaf tile
   */
  evaluateTile(
    tileId: string,
    evaluation: {
      impact?: number;
      feasibility?: number;
      uniqueness?: number;
      timeframe?: string;
      notes?: string;
      calculationsOrPilots?: string;
    }
  ): Tile {
    const tile = this.tiles.get(tileId);
    if (!tile) {
      throw new Error(`Tile ${tileId} not found`);
    }

    if (!tile.isLeaf) {
      console.warn(`Tile ${tileId} is not a leaf node. Consider evaluating leaf nodes for best practice.`);
    }

    tile.evaluation = evaluation;
    tile.updatedAt = new Date();

    return tile;
  }

  /**
   * Update a tile's information
   */
  updateTile(
    tileId: string,
    updates: {
      title?: string;
      description?: string;
      splitAttribute?: string;
      splitRationale?: string;
      isLeaf?: boolean;
    }
  ): Tile {
    const tile = this.tiles.get(tileId);
    if (!tile) {
      throw new Error(`Tile ${tileId} not found`);
    }

    if (updates.title !== undefined) tile.title = updates.title;
    if (updates.description !== undefined) tile.description = updates.description;
    if (updates.splitAttribute !== undefined) tile.splitAttribute = updates.splitAttribute;
    if (updates.splitRationale !== undefined) tile.splitRationale = updates.splitRationale;
    if (updates.isLeaf !== undefined) tile.isLeaf = updates.isLeaf;

    tile.updatedAt = new Date();

    return tile;
  }

  /**
   * Get a tile by ID
   */
  getTile(tileId: string): Tile | undefined {
    return this.tiles.get(tileId);
  }

  /**
   * Explore the tree from a specific tile
   */
  explorePath(tileId: string, depth: number = 10): any {
    const tile = this.tiles.get(tileId);
    if (!tile) {
      throw new Error(`Tile ${tileId} not found`);
    }

    return this.buildTileTree(tile, depth);
  }

  private buildTileTree(tile: Tile, depth: number): any {
    const tree: any = {
      ...tile,
      children: [],
    };

    if (depth > 0 && tile.childrenIds.length > 0) {
      tree.children = tile.childrenIds
        .map((childId) => {
          const child = this.tiles.get(childId);
          return child ? this.buildTileTree(child, depth - 1) : null;
        })
        .filter((child) => child !== null);
    }

    return tree;
  }

  /**
   * Get all leaf tiles (concrete ideas/projects)
   */
  getLeafTiles(treeId?: string): Tile[] {
    let tilesToSearch = Array.from(this.tiles.values());

    // Filter by tree if specified
    if (treeId) {
      const tree = this.trees.get(treeId);
      if (!tree) {
        throw new Error(`Tree ${treeId} not found`);
      }
      tilesToSearch = this.getTilesInTree(tree.rootTileId);
    }

    return tilesToSearch.filter((tile) => tile.isLeaf);
  }

  /**
   * Get all tiles that haven't been split yet (unexplored branches)
   */
  getUnexploredTiles(treeId?: string): Tile[] {
    let tilesToSearch = Array.from(this.tiles.values());

    if (treeId) {
      const tree = this.trees.get(treeId);
      if (!tree) {
        throw new Error(`Tree ${treeId} not found`);
      }
      tilesToSearch = this.getTilesInTree(tree.rootTileId);
    }

    return tilesToSearch.filter(
      (tile) => !tile.isLeaf && tile.childrenIds.length === 0
    );
  }

  /**
   * Get tiles where MECE status is not validated
   */
  getUnvalidatedSplits(treeId?: string): Tile[] {
    let tilesToSearch = Array.from(this.tiles.values());

    if (treeId) {
      const tree = this.trees.get(treeId);
      if (!tree) {
        throw new Error(`Tree ${treeId} not found`);
      }
      tilesToSearch = this.getTilesInTree(tree.rootTileId);
    }

    return tilesToSearch.filter(
      (tile) => tile.childrenIds.length > 0 && tile.isMECE === undefined
    );
  }

  /**
   * Get all tiles in a tree
   */
  private getTilesInTree(rootTileId: string): Tile[] {
    const result: Tile[] = [];
    const visited = new Set<string>();

    const traverse = (tileId: string) => {
      if (visited.has(tileId)) return;
      visited.add(tileId);

      const tile = this.tiles.get(tileId);
      if (!tile) return;

      result.push(tile);

      for (const childId of tile.childrenIds) {
        traverse(childId);
      }
    };

    traverse(rootTileId);
    return result;
  }

  /**
   * Get top-rated leaf tiles based on evaluation criteria
   */
  getTopLeaves(
    criteria: "impact" | "feasibility" | "uniqueness" | "combined",
    limit: number = 10,
    treeId?: string
  ): Tile[] {
    const leaves = this.getLeafTiles(treeId).filter((tile) => tile.evaluation);

    const scored = leaves.map((tile) => {
      let score = 0;
      const evaluation = tile.evaluation!;

      switch (criteria) {
        case "impact":
          score = evaluation.impact || 0;
          break;
        case "feasibility":
          score = evaluation.feasibility || 0;
          break;
        case "uniqueness":
          score = evaluation.uniqueness || 0;
          break;
        case "combined":
          score =
            ((evaluation.impact || 0) +
              (evaluation.feasibility || 0) +
              (evaluation.uniqueness || 0)) /
            3;
          break;
      }

      return { tile, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.tile);
  }

  /**
   * Search tiles
   */
  search(query: string, treeId?: string): Tile[] {
    let tilesToSearch = Array.from(this.tiles.values());

    if (treeId) {
      const tree = this.trees.get(treeId);
      if (!tree) {
        throw new Error(`Tree ${treeId} not found`);
      }
      tilesToSearch = this.getTilesInTree(tree.rootTileId);
    }

    const lowerQuery = query.toLowerCase();
    return tilesToSearch.filter(
      (tile) =>
        tile.title.toLowerCase().includes(lowerQuery) ||
        tile.description.toLowerCase().includes(lowerQuery) ||
        tile.splitAttribute?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get coverage analysis for a tree
   */
  getCoverageAnalysis(treeId: string): any {
    const tree = this.trees.get(treeId);
    if (!tree) {
      throw new Error(`Tree ${treeId} not found`);
    }

    const allTiles = this.getTilesInTree(tree.rootTileId);
    const leaves = allTiles.filter((t) => t.isLeaf);
    const unexplored = this.getUnexploredTiles(treeId);
    const unvalidated = this.getUnvalidatedSplits(treeId);
    const validated = allTiles.filter((t) => t.isMECE === true);
    const evaluated = leaves.filter((t) => t.evaluation);

    // Calculate depth
    const maxDepth = this.calculateMaxDepth(tree.rootTileId);

    return {
      totalTiles: allTiles.length,
      leafTiles: leaves.length,
      unexploredBranches: unexplored.length,
      validatedSplits: validated.length,
      unvalidatedSplits: unvalidated.length,
      evaluatedLeaves: evaluated.length,
      unevaluatedLeaves: leaves.length - evaluated.length,
      maxDepth,
      coveragePercentage:
        allTiles.length > 1
          ? ((validated.length / (allTiles.length - leaves.length)) * 100).toFixed(1)
          : 0,
      explorationSuggestions: this.generateSuggestions(unexplored, unvalidated, leaves),
    };
  }

  private calculateMaxDepth(rootId: string, currentDepth: number = 0): number {
    const tile = this.tiles.get(rootId);
    if (!tile || tile.childrenIds.length === 0) {
      return currentDepth;
    }

    let maxChildDepth = currentDepth;
    for (const childId of tile.childrenIds) {
      const childDepth = this.calculateMaxDepth(childId, currentDepth + 1);
      maxChildDepth = Math.max(maxChildDepth, childDepth);
    }

    return maxChildDepth;
  }

  private generateSuggestions(
    unexplored: Tile[],
    unvalidated: Tile[],
    leaves: Tile[]
  ): string[] {
    const suggestions: string[] = [];

    if (unexplored.length > 0) {
      suggestions.push(
        `${unexplored.length} unexplored tiles - consider splitting these to complete coverage`
      );
    }

    if (unvalidated.length > 0) {
      suggestions.push(
        `${unvalidated.length} splits need MECE validation - verify completeness and exclusivity`
      );
    }

    const unevaluated = leaves.filter((t) => !t.evaluation);
    if (unevaluated.length > 0) {
      suggestions.push(
        `${unevaluated.length} leaf tiles need evaluation - assess impact, feasibility, uniqueness`
      );
    }

    if (suggestions.length === 0) {
      suggestions.push("Tree is well-explored! Consider revisiting as context evolves.");
    }

    return suggestions;
  }

  /**
   * Get statistics
   */
  getStatistics(): any {
    const allTiles = Array.from(this.tiles.values());
    const allTrees = Array.from(this.trees.values());
    const leaves = allTiles.filter((t) => t.isLeaf);
    const splits = allTiles.filter((t) => t.childrenIds.length > 0);

    return {
      totalTrees: allTrees.length,
      totalTiles: allTiles.length,
      leafTiles: leaves.length,
      splits: splits.length,
      validatedSplits: splits.filter((t) => t.isMECE === true).length,
      evaluatedLeaves: leaves.filter((t) => t.evaluation).length,
      commonSplitAttributes: this.getCommonSplitAttributes(),
    };
  }

  private getCommonSplitAttributes(): Array<{ attribute: string; count: number }> {
    const attributeCounts = new Map<string, number>();

    for (const tile of this.tiles.values()) {
      if (tile.splitAttribute) {
        attributeCounts.set(
          tile.splitAttribute,
          (attributeCounts.get(tile.splitAttribute) || 0) + 1
        );
      }
    }

    return Array.from(attributeCounts.entries())
      .map(([attribute, count]) => ({ attribute, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Export tree
   */
  export(format: string, treeId: string): string {
    const tree = this.trees.get(treeId);
    if (!tree) {
      throw new Error(`Tree ${treeId} not found`);
    }

    switch (format) {
      case "json":
        return this.exportJSON(tree);
      case "markdown":
        return this.exportMarkdown(tree);
      case "mermaid":
        return this.exportMermaid(tree);
      case "dot":
        return this.exportDOT(tree);
      default:
        throw new Error(`Unknown export format: ${format}`);
    }
  }

  private exportJSON(tree: TilingTree): string {
    const tiles = this.getTilesInTree(tree.rootTileId);
    return JSON.stringify(
      {
        tree,
        tiles,
      },
      null,
      2
    );
  }

  private exportMarkdown(tree: TilingTree): string {
    let md = `# ${tree.name}\n\n`;
    md += `**Problem Statement:** ${tree.problemStatement}\n\n`;
    md += `---\n\n`;

    const rootTile = this.tiles.get(tree.rootTileId);
    if (rootTile) {
      md += this.tileToMarkdown(rootTile, 0);
    }

    return md;
  }

  private tileToMarkdown(tile: Tile, depth: number): string {
    const indent = "  ".repeat(depth);
    const prefix = "#".repeat(Math.min(depth + 2, 6));

    let md = `${indent}${prefix} ${tile.title}\n\n`;
    md += `${indent}${tile.description}\n\n`;

    if (tile.splitAttribute) {
      md += `${indent}**Split by:** ${tile.splitAttribute}\n`;
      if (tile.splitRationale) {
        md += `${indent}**Rationale:** ${tile.splitRationale}\n`;
      }
      if (tile.isMECE !== undefined) {
        md += `${indent}**MECE Validated:** ${tile.isMECE ? "✓" : "✗"}\n`;
      }
      md += "\n";
    }

    if (tile.isLeaf && tile.evaluation) {
      md += `${indent}**Evaluation:**\n`;
      const evaluation = tile.evaluation;
      if (evaluation.impact) md += `${indent}- Impact: ${evaluation.impact}/10\n`;
      if (evaluation.feasibility) md += `${indent}- Feasibility: ${evaluation.feasibility}/10\n`;
      if (evaluation.uniqueness) md += `${indent}- Uniqueness: ${evaluation.uniqueness}/10\n`;
      if (evaluation.timeframe) md += `${indent}- Timeframe: ${evaluation.timeframe}\n`;
      if (evaluation.notes) md += `${indent}- Notes: ${evaluation.notes}\n`;
      md += "\n";
    }

    // Add children
    for (const childId of tile.childrenIds) {
      const child = this.tiles.get(childId);
      if (child) {
        md += this.tileToMarkdown(child, depth + 1);
      }
    }

    return md;
  }

  private exportMermaid(tree: TilingTree): string {
    const tiles = this.getTilesInTree(tree.rootTileId);

    let mermaid = "graph TD\n";

    // Add nodes
    for (const tile of tiles) {
      const nodeId = tile.id.replace(/-/g, "");
      const label = tile.title.replace(/"/g, "'");
      const shape = tile.isLeaf ? "[" + label + "]" : "(" + label + ")";

      let style = "";
      if (tile.isLeaf && tile.evaluation) {
        const avg = ((tile.evaluation.impact || 0) +
                    (tile.evaluation.feasibility || 0) +
                    (tile.evaluation.uniqueness || 0)) / 3;
        if (avg >= 7) style = ":::high";
        else if (avg >= 4) style = ":::medium";
        else style = ":::low";
      }

      mermaid += `    ${nodeId}${shape}${style}\n`;
    }

    // Add edges with split labels
    for (const tile of tiles) {
      for (const childId of tile.childrenIds) {
        const nodeId = tile.id.replace(/-/g, "");
        const childNodeId = childId.replace(/-/g, "");
        const label = tile.splitAttribute ? `|${tile.splitAttribute}|` : "";
        mermaid += `    ${nodeId} -->${label} ${childNodeId}\n`;
      }
    }

    // Add styling
    mermaid += "\n    classDef high fill:#90EE90\n";
    mermaid += "    classDef medium fill:#FFD700\n";
    mermaid += "    classDef low fill:#FFB6C1\n";

    return mermaid;
  }

  private exportDOT(tree: TilingTree): string {
    const tiles = this.getTilesInTree(tree.rootTileId);

    let dot = "digraph TilingTree {\n";
    dot += "  node [shape=box, style=rounded];\n";
    dot += `  label="${tree.name}\\n${tree.problemStatement}";\n`;
    dot += "  labelloc=t;\n\n";

    // Add nodes
    for (const tile of tiles) {
      const label = tile.title.replace(/"/g, '\\"');
      let color = "white";

      if (tile.isLeaf && tile.evaluation) {
        const avg = ((tile.evaluation.impact || 0) +
                    (tile.evaluation.feasibility || 0) +
                    (tile.evaluation.uniqueness || 0)) / 3;
        if (avg >= 7) color = "lightgreen";
        else if (avg >= 4) color = "lightyellow";
        else color = "lightcoral";
      }

      const shape = tile.isLeaf ? "box" : "ellipse";
      dot += `  "${tile.id}" [label="${label}", fillcolor="${color}", style="rounded,filled", shape=${shape}];\n`;
    }

    dot += "\n";

    // Add edges
    for (const tile of tiles) {
      for (const childId of tile.childrenIds) {
        const label = tile.splitAttribute || "";
        dot += `  "${tile.id}" -> "${childId}" [label="${label}"];\n`;
      }
    }

    dot += "}\n";
    return dot;
  }
}
