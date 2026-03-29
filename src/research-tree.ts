import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Tile represents a subset of the solution space
 * All children of a tile should be mutually exclusive and collectively exhaustive (MECE)
 */
export interface Tile {
  id: string;
  treeId: string; // Reverse lookup for persistence
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

/**
 * Validation issue types based on common failure modes
 */
export type ValidationIssueType =
  | "vague_language" // Imprecise terms like "natural", "forced"
  | "catch_all_bucket" // Categories like "other" that prevent systematic exploration
  | "mixed_dimensions" // Splitting along inconsistent dimensions
  | "retroactive_splitting" // Using pre-existing solution taxonomies
  | "incomplete_coverage"; // Missing possibilities in the split

export interface ValidationIssue {
  type: ValidationIssueType;
  severity: "warning" | "error";
  message: string;
  tileId: string;
  tilePath?: string;
  suggestion?: string;
}

export interface SplitQualityReport {
  tileId: string;
  tileTitle: string;
  issues: ValidationIssue[];
  score: number; // 0-100
  recommendations: string[];
}

// ─── Persistence helpers ────────────────────────────────────────────────────

function csvEscape(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function mermaidEscape(s: string): string {
  return s
    .replace(/\r?\n|\r/g, " ")
    .replace(/#/g, "#35;")
    .replace(/"/g, "#34;")
    .replace(/</g, "#60;")
    .replace(/>/g, "#62;")
    .replace(/\(/g, "#40;")
    .replace(/\)/g, "#41;");
}

function dotEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n|\r/g, "\\n");
}

function clampScore(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value)));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_TREE_DEPTH = 100;

// ─── Manager ────────────────────────────────────────────────────────────────

export class ResearchTreeManager {
  private trees: Map<string, TilingTree> = new Map();
  private tiles: Map<string, Tile> = new Map();
  private dataDir: string;
  private activeTreeId?: string;

  constructor() {
    this.dataDir =
      process.env.TILING_TREES_DATA_DIR ||
      path.join(os.homedir(), ".tiling-trees");
    this.ensureDataDir();
    this.loadAllTrees();
  }

  // ─── Persistence ────────────────────────────────────────────────────────

  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Build a safe file path within the data directory.
   * Rejects any treeId that would escape the data dir via path traversal.
   */
  private safeFilePath(treeId: string): string {
    if (!UUID_RE.test(treeId)) {
      throw new Error(`Invalid tree ID format: ${treeId}`);
    }
    const filePath = path.resolve(this.dataDir, `${treeId}.json`);
    const resolvedDir = path.resolve(this.dataDir);
    if (!filePath.startsWith(resolvedDir + path.sep)) {
      throw new Error("Invalid tree ID: path traversal detected");
    }
    return filePath;
  }

  private loadAllTrees(): void {
    let files: string[];
    try {
      files = fs.readdirSync(this.dataDir).filter((f) => f.endsWith(".json"));
    } catch {
      return;
    }
    for (const file of files) {
      try {
        const content = fs.readFileSync(
          path.join(this.dataDir, file),
          "utf-8"
        );
        const data = JSON.parse(content);

        // Validate tree ID is a proper UUID (prevents path traversal on save)
        if (!data.tree?.id || !UUID_RE.test(data.tree.id)) {
          console.error(`Skipping ${file}: invalid or missing tree ID`);
          continue;
        }

        // Construct objects with explicit fields only (no arbitrary spread)
        const tree: TilingTree = {
          id: String(data.tree.id),
          name: String(data.tree.name || ""),
          problemStatement: String(data.tree.problemStatement || ""),
          rootTileId: String(data.tree.rootTileId || ""),
          createdAt: new Date(data.tree.createdAt),
          updatedAt: new Date(data.tree.updatedAt),
          metadata: (typeof data.tree.metadata === "object" && data.tree.metadata !== null)
            ? data.tree.metadata
            : {},
        };
        this.trees.set(tree.id, tree);

        if (!Array.isArray(data.tiles)) continue;
        for (const td of data.tiles) {
          if (!td?.id || !UUID_RE.test(td.id)) continue;
          const tile: Tile = {
            id: String(td.id),
            treeId: String(td.treeId || tree.id),
            title: String(td.title || ""),
            description: String(td.description || ""),
            parentId: td.parentId ? String(td.parentId) : undefined,
            childrenIds: Array.isArray(td.childrenIds)
              ? td.childrenIds.map(String)
              : [],
            splitAttribute: td.splitAttribute ? String(td.splitAttribute) : undefined,
            splitRationale: td.splitRationale ? String(td.splitRationale) : undefined,
            isMECE: typeof td.isMECE === "boolean" ? td.isMECE : undefined,
            coverageNotes: td.coverageNotes ? String(td.coverageNotes) : undefined,
            isLeaf: Boolean(td.isLeaf),
            evaluation: td.evaluation && typeof td.evaluation === "object"
              ? {
                  impact: typeof td.evaluation.impact === "number" ? td.evaluation.impact : undefined,
                  feasibility: typeof td.evaluation.feasibility === "number" ? td.evaluation.feasibility : undefined,
                  uniqueness: typeof td.evaluation.uniqueness === "number" ? td.evaluation.uniqueness : undefined,
                  timeframe: td.evaluation.timeframe ? String(td.evaluation.timeframe) : undefined,
                  notes: td.evaluation.notes ? String(td.evaluation.notes) : undefined,
                  calculationsOrPilots: td.evaluation.calculationsOrPilots ? String(td.evaluation.calculationsOrPilots) : undefined,
                }
              : undefined,
            createdAt: new Date(td.createdAt),
            updatedAt: new Date(td.updatedAt),
            metadata: (typeof td.metadata === "object" && td.metadata !== null)
              ? td.metadata
              : {},
          };
          this.tiles.set(tile.id, tile);
        }
      } catch (e) {
        console.error(`Failed to load tree from ${file}:`, e);
      }
    }
  }

  private saveTree(treeId: string): void {
    const tree = this.trees.get(treeId);
    if (!tree) return;
    const tilesInTree = this.getTilesInTree(tree.rootTileId);
    const data = { tree, tiles: tilesInTree };
    const filePath = this.safeFilePath(treeId);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  private deleteTreeFile(treeId: string): void {
    const filePath = this.safeFilePath(treeId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // ─── Active tree context ────────────────────────────────────────────────

  setActiveTree(treeId: string): TilingTree | null {
    if (!treeId || treeId.trim() === "") {
      this.activeTreeId = undefined;
      return null;
    }
    const tree = this.trees.get(treeId);
    if (!tree) throw new Error(`Tree ${treeId} not found`);
    this.activeTreeId = treeId;
    return tree;
  }

  getActiveTreeId(): string | undefined {
    return this.activeTreeId;
  }

  // ─── Tile ID resolution (UUID or path) ──────────────────────────────────

  /**
   * Resolve a tile identifier. Accepts a UUID (returned as-is if it exists)
   * or a slash-separated path like "Energy Source/Chemical" resolved against
   * the active tree (or a specified tree).
   */
  resolveTileId(idOrPath: string, treeId?: string): string {
    // Direct UUID lookup
    if (this.tiles.has(idOrPath)) return idOrPath;

    // Path-based lookup
    const effectiveTreeId = treeId || this.activeTreeId;
    if (!effectiveTreeId) {
      throw new Error(
        `Tile "${idOrPath}" not found. For path-based lookup, set an active tree with set_active_tree.`
      );
    }

    const tree = this.trees.get(effectiveTreeId);
    if (!tree)
      throw new Error(`Tree ${effectiveTreeId} not found`);

    const rootTile = this.tiles.get(tree.rootTileId);
    if (!rootTile)
      throw new Error(
        `Root tile not found for tree ${effectiveTreeId}`
      );

    const parts = idOrPath
      .split("/")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (parts.length === 0)
      throw new Error(`Invalid tile path: "${idOrPath}"`);

    let current = rootTile;

    // Skip root title if it matches the first path segment
    let startIdx = 0;
    if (parts[0].toLowerCase() === current.title.toLowerCase()) {
      startIdx = 1;
    }

    // If only the root was specified
    if (startIdx >= parts.length) return current.id;

    for (let i = startIdx; i < parts.length; i++) {
      const target = parts[i].toLowerCase();
      const child = current.childrenIds
        .map((id) => this.tiles.get(id))
        .filter((c): c is Tile => c !== undefined)
        .find((c) => c.title.toLowerCase() === target);

      if (!child) {
        const available = current.childrenIds
          .map((id) => this.tiles.get(id))
          .filter((c): c is Tile => c !== undefined)
          .map((c) => c.title);
        throw new Error(
          `No child "${parts[i]}" under "${current.title}". Available: ${available.join(", ") || "none"}`
        );
      }
      current = child;
    }

    return current.id;
  }

  // ─── Tree CRUD ──────────────────────────────────────────────────────────

  /**
   * Create a new tiling tree to explore a problem
   */
  createTree(name: string, problemStatement: string): TilingTree {
    if (!name.trim()) throw new Error("Tree name is required");
    if (!problemStatement.trim())
      throw new Error("Problem statement is required");

    const treeId = randomUUID();

    const rootTile: Tile = {
      id: randomUUID(),
      treeId,
      title: "Complete Solution Space",
      description: `All possible solutions to: ${problemStatement}`,
      childrenIds: [],
      isLeaf: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    const tree: TilingTree = {
      id: treeId,
      name,
      problemStatement,
      rootTileId: rootTile.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    this.tiles.set(rootTile.id, rootTile);
    this.trees.set(tree.id, tree);
    this.saveTree(tree.id);

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
   * Delete an entire tree and all its tiles
   */
  deleteTree(treeId: string): { deletedTreeId: string; deletedTileCount: number } {
    const tree = this.trees.get(treeId);
    if (!tree) throw new Error(`Tree ${treeId} not found`);

    const tiles = this.getTilesInTree(tree.rootTileId);
    for (const tile of tiles) {
      this.tiles.delete(tile.id);
    }

    this.trees.delete(treeId);
    this.deleteTreeFile(treeId);

    if (this.activeTreeId === treeId) {
      this.activeTreeId = undefined;
    }

    return { deletedTreeId: treeId, deletedTileCount: tiles.length };
  }

  /**
   * Deep-copy a tree with new IDs
   */
  cloneTree(treeId: string, newName?: string): TilingTree {
    const tree = this.trees.get(treeId);
    if (!tree) throw new Error(`Tree ${treeId} not found`);

    const allTiles = this.getTilesInTree(tree.rootTileId);
    const idMap = new Map<string, string>();
    const newTreeId = randomUUID();

    // Generate new IDs
    for (const tile of allTiles) {
      idMap.set(tile.id, randomUUID());
    }

    // Clone tiles with remapped references
    for (const tile of allTiles) {
      const newTile: Tile = {
        id: idMap.get(tile.id)!,
        treeId: newTreeId,
        title: tile.title,
        description: tile.description,
        parentId: tile.parentId ? idMap.get(tile.parentId) : undefined,
        childrenIds: tile.childrenIds
          .map((id) => idMap.get(id))
          .filter((id): id is string => id !== undefined),
        splitAttribute: tile.splitAttribute,
        splitRationale: tile.splitRationale,
        isMECE: tile.isMECE,
        coverageNotes: tile.coverageNotes,
        isLeaf: tile.isLeaf,
        evaluation: tile.evaluation ? { ...tile.evaluation } : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: { ...tile.metadata },
      };
      this.tiles.set(newTile.id, newTile);
    }

    const newTree: TilingTree = {
      id: newTreeId,
      name: newName || `${tree.name} (copy)`,
      problemStatement: tree.problemStatement,
      rootTileId: idMap.get(tree.rootTileId)!,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { ...tree.metadata },
    };

    this.trees.set(newTree.id, newTree);
    this.saveTree(newTree.id);

    return newTree;
  }

  // ─── Tile CRUD ──────────────────────────────────────────────────────────

  /**
   * Create a tile (internal — children inherit treeId from parent)
   */
  private createTile(
    title: string,
    description: string,
    parentId: string,
    isLeaf: boolean = false
  ): Tile {
    const parent = this.tiles.get(parentId);
    if (!parent) throw new Error(`Parent tile ${parentId} not found`);

    const tile: Tile = {
      id: randomUUID(),
      treeId: parent.treeId,
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

    parent.childrenIds.push(tile.id);
    parent.updatedAt = new Date();

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
    if (!tile) throw new Error(`Tile ${tileId} not found`);

    if (tile.childrenIds.length > 0) {
      throw new Error(
        `Tile ${tileId} has already been split. Use resplit_tile to replace the split, or add_tiles_to_split to add more tiles.`
      );
    }

    if (subsets.length < 2) {
      throw new Error(
        "A split must have at least 2 subsets to partition the space"
      );
    }

    const createdTiles = subsets.map((subset) =>
      this.createTile(
        subset.title,
        subset.description,
        tileId,
        subset.isLeaf || false
      )
    );

    tile.splitAttribute = splitAttribute;
    tile.splitRationale = splitRationale;
    tile.isMECE = undefined; // Needs validation
    tile.isLeaf = false;
    tile.updatedAt = new Date();

    this.saveTree(tile.treeId);

    return { parentTile: tile, createdTiles };
  }

  /**
   * Add additional tiles to an existing split
   */
  addTilesToSplit(
    parentId: string,
    newTiles: Array<{ title: string; description: string; isLeaf?: boolean }>
  ): Tile[] {
    const parent = this.tiles.get(parentId);
    if (!parent) throw new Error(`Parent tile ${parentId} not found`);

    if (parent.childrenIds.length === 0) {
      throw new Error(
        `Tile ${parentId} has not been split yet. Use split_tile first.`
      );
    }

    if (newTiles.length === 0) {
      throw new Error("At least one new tile is required");
    }

    const createdTiles = newTiles.map((t) =>
      this.createTile(
        t.title,
        t.description,
        parentId,
        t.isLeaf || false
      )
    );

    // Invalidate MECE since we changed the split
    parent.isMECE = undefined;
    parent.updatedAt = new Date();

    this.saveTree(parent.treeId);

    return createdTiles;
  }

  /**
   * Re-split a tile — removes all children/subtrees and creates new ones
   */
  resplitTile(
    tileId: string,
    splitAttribute: string,
    splitRationale: string,
    subsets: Array<{ title: string; description: string; isLeaf?: boolean }>
  ): {
    parentTile: Tile;
    createdTiles: Tile[];
    destroyedTileCount: number;
    warning?: string;
  } {
    const tile = this.tiles.get(tileId);
    if (!tile) throw new Error(`Tile ${tileId} not found`);

    if (subsets.length < 2) {
      throw new Error(
        "A split must have at least 2 subsets to partition the space"
      );
    }

    // Collect all descendants to remove
    const destroyedIds: string[] = [];
    const destroyedEvaluated: string[] = [];

    const seen = new Set<string>();
    const collectDescendants = (id: string, depth: number) => {
      if (seen.has(id) || depth > MAX_TREE_DEPTH) return;
      seen.add(id);
      const t = this.tiles.get(id);
      if (!t) return;
      destroyedIds.push(id);
      if (t.isLeaf && t.evaluation) {
        destroyedEvaluated.push(t.title);
      }
      for (const childId of t.childrenIds) {
        collectDescendants(childId, depth + 1);
      }
    };

    for (const childId of tile.childrenIds) {
      collectDescendants(childId, 0);
    }

    // Delete descendants
    for (const id of destroyedIds) {
      this.tiles.delete(id);
    }

    // Reset tile split state
    tile.childrenIds = [];
    tile.splitAttribute = undefined;
    tile.splitRationale = undefined;
    tile.isMECE = undefined;
    tile.coverageNotes = undefined;

    // Create new children
    const createdTiles = subsets.map((subset) =>
      this.createTile(
        subset.title,
        subset.description,
        tileId,
        subset.isLeaf || false
      )
    );

    tile.splitAttribute = splitAttribute;
    tile.splitRationale = splitRationale;
    tile.isLeaf = false;
    tile.updatedAt = new Date();

    this.saveTree(tile.treeId);

    const warning =
      destroyedEvaluated.length > 0
        ? `Destroyed ${destroyedEvaluated.length} evaluated leaf tile(s): ${destroyedEvaluated.join(", ")}`
        : undefined;

    return {
      parentTile: tile,
      createdTiles,
      destroyedTileCount: destroyedIds.length,
      warning,
    };
  }

  /**
   * Delete a tile and its entire subtree
   */
  deleteTile(
    tileId: string
  ): { deletedTileIds: string[]; warning?: string } {
    const tile = this.tiles.get(tileId);
    if (!tile) throw new Error(`Tile ${tileId} not found`);

    if (!tile.parentId) {
      throw new Error(
        "Cannot delete root tile. Use delete_tree to remove the entire tree."
      );
    }

    // Collect descendants
    const deletedIds: string[] = [];
    const seen = new Set<string>();
    const collectDescendants = (id: string, depth: number) => {
      if (seen.has(id) || depth > MAX_TREE_DEPTH) return;
      seen.add(id);
      const t = this.tiles.get(id);
      if (!t) return;
      deletedIds.push(id);
      for (const childId of t.childrenIds) {
        collectDescendants(childId, depth + 1);
      }
    };
    collectDescendants(tileId, 0);

    // Check for evaluated leaves being destroyed
    const destroyedEvaluated: string[] = [];
    for (const id of deletedIds) {
      const t = this.tiles.get(id);
      if (t?.isLeaf && t.evaluation) destroyedEvaluated.push(t.title);
    }

    // Update parent
    const parent = this.tiles.get(tile.parentId);
    if (!parent) {
      throw new Error(`Parent tile ${tile.parentId} not found — data may be corrupted`);
    }
    parent.childrenIds = parent.childrenIds.filter((id) => id !== tileId);
    parent.updatedAt = new Date();

    // If parent has no more children, clear split metadata
    if (parent.childrenIds.length === 0) {
      parent.splitAttribute = undefined;
      parent.splitRationale = undefined;
      parent.isMECE = undefined;
      parent.coverageNotes = undefined;
    } else {
      // Invalidate MECE since children changed
      parent.isMECE = undefined;
    }

    // Delete tiles
    for (const id of deletedIds) {
      this.tiles.delete(id);
    }

    this.saveTree(tile.treeId);

    const warning =
      destroyedEvaluated.length > 0
        ? `Destroyed ${destroyedEvaluated.length} evaluated leaf tile(s): ${destroyedEvaluated.join(", ")}`
        : undefined;

    return { deletedTileIds: deletedIds, warning };
  }

  /**
   * Mark a split as MECE validated
   */
  markMECE(tileId: string, isMECE: boolean, coverageNotes?: string): Tile {
    const tile = this.tiles.get(tileId);
    if (!tile) throw new Error(`Tile ${tileId} not found`);

    if (tile.childrenIds.length === 0) {
      throw new Error(
        `Tile ${tileId} has no children to validate for MECE.`
      );
    }

    tile.isMECE = isMECE;
    tile.coverageNotes = coverageNotes;
    tile.updatedAt = new Date();

    this.saveTree(tile.treeId);

    return tile;
  }

  /**
   * Evaluate a leaf tile — merges with existing evaluation, clamps scores 1-10
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
  ): { tile: Tile; warning?: string } {
    const tile = this.tiles.get(tileId);
    if (!tile) throw new Error(`Tile ${tileId} not found`);

    let warning: string | undefined;
    if (!tile.isLeaf) {
      warning = `Tile ${tileId} is not a leaf node. Consider evaluating leaf nodes for best practice.`;
    }

    // Build merged evaluation, clamping scores and filtering undefined values
    const merged: Record<string, any> = { ...(tile.evaluation || {}) };

    if (evaluation.impact !== undefined)
      merged.impact = clampScore(evaluation.impact);
    if (evaluation.feasibility !== undefined)
      merged.feasibility = clampScore(evaluation.feasibility);
    if (evaluation.uniqueness !== undefined)
      merged.uniqueness = clampScore(evaluation.uniqueness);
    if (evaluation.timeframe !== undefined)
      merged.timeframe = evaluation.timeframe;
    if (evaluation.notes !== undefined)
      merged.notes = evaluation.notes;
    if (evaluation.calculationsOrPilots !== undefined)
      merged.calculationsOrPilots = evaluation.calculationsOrPilots;

    tile.evaluation = merged as Tile["evaluation"];
    tile.updatedAt = new Date();

    this.saveTree(tile.treeId);

    return { tile, warning };
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
    if (!tile) throw new Error(`Tile ${tileId} not found`);

    if (updates.isLeaf === true && tile.childrenIds.length > 0) {
      throw new Error(
        `Cannot mark tile as leaf — it has ${tile.childrenIds.length} children. Remove children first.`
      );
    }

    if (updates.title !== undefined) {
      if (!updates.title.trim()) throw new Error("Title cannot be empty");
      tile.title = updates.title;
    }
    if (updates.description !== undefined) tile.description = updates.description;
    if (updates.splitAttribute !== undefined)
      tile.splitAttribute = updates.splitAttribute;
    if (updates.splitRationale !== undefined)
      tile.splitRationale = updates.splitRationale;
    if (updates.isLeaf !== undefined) tile.isLeaf = updates.isLeaf;

    tile.updatedAt = new Date();

    this.saveTree(tile.treeId);

    return tile;
  }

  /**
   * Get a tile by ID — throws if not found
   */
  getTile(tileId: string): Tile {
    const tile = this.tiles.get(tileId);
    if (!tile) throw new Error(`Tile ${tileId} not found`);
    return tile;
  }

  /**
   * Get the ancestry path from root to a tile
   */
  getTilePath(
    tileId: string
  ): { path: Tile[]; pathString: string } {
    const pathTiles: Tile[] = [];
    const visited = new Set<string>();
    let current = this.tiles.get(tileId);

    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      pathTiles.unshift(current);
      if (current.parentId) {
        current = this.tiles.get(current.parentId);
      } else {
        break;
      }
    }

    return {
      path: pathTiles,
      pathString: pathTiles.map((t) => t.title).join(" → "),
    };
  }

  /**
   * Get all siblings of a tile (other children of same parent)
   */
  getSiblings(tileId: string): Tile[] {
    const tile = this.tiles.get(tileId);
    if (!tile) throw new Error(`Tile ${tileId} not found`);

    if (!tile.parentId) return []; // root has no siblings

    const parent = this.tiles.get(tile.parentId);
    if (!parent) return [];

    return parent.childrenIds
      .filter((id) => id !== tileId)
      .map((id) => this.tiles.get(id))
      .filter((t): t is Tile => t !== undefined);
  }

  /**
   * Explore the tree from a specific tile
   */
  explorePath(tileId: string, depth: number = 10): any {
    const tile = this.tiles.get(tileId);
    if (!tile) throw new Error(`Tile ${tileId} not found`);
    return this.buildTileTree(tile, depth);
  }

  private buildTileTree(tile: Tile, depth: number, visited: Set<string> = new Set()): any {
    if (visited.has(tile.id)) return null;
    visited.add(tile.id);

    const tree: any = {
      ...tile,
      children: [],
    };

    if (depth > 0 && tile.childrenIds.length > 0) {
      tree.children = tile.childrenIds
        .map((childId) => {
          const child = this.tiles.get(childId);
          return child ? this.buildTileTree(child, depth - 1, visited) : null;
        })
        .filter((child) => child !== null);
    }

    return tree;
  }

  // ─── Queries ────────────────────────────────────────────────────────────

  /**
   * Get all leaf tiles (concrete ideas/projects)
   */
  getLeafTiles(treeId?: string): Tile[] {
    let tilesToSearch = Array.from(this.tiles.values());

    if (treeId) {
      const tree = this.trees.get(treeId);
      if (!tree) throw new Error(`Tree ${treeId} not found`);
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
      if (!tree) throw new Error(`Tree ${treeId} not found`);
      tilesToSearch = this.getTilesInTree(tree.rootTileId);
    }

    return tilesToSearch.filter(
      (tile) => !tile.isLeaf && tile.childrenIds.length === 0
    );
  }

  /**
   * Get all tiles in a tree (depth-first traversal)
   */
  private getTilesInTree(rootTileId: string): Tile[] {
    const result: Tile[] = [];
    const visited = new Set<string>();

    const traverse = (tileId: string, depth: number) => {
      if (visited.has(tileId) || depth > MAX_TREE_DEPTH) return;
      visited.add(tileId);

      const tile = this.tiles.get(tileId);
      if (!tile) return;

      result.push(tile);

      for (const childId of tile.childrenIds) {
        traverse(childId, depth + 1);
      }
    };

    traverse(rootTileId, 0);
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
   * Search tiles — returns empty for empty/whitespace queries
   */
  search(query: string, treeId?: string): Tile[] {
    if (!query.trim()) return [];

    let tilesToSearch = Array.from(this.tiles.values());

    if (treeId) {
      const tree = this.trees.get(treeId);
      if (!tree) throw new Error(`Tree ${treeId} not found`);
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

  // ─── Coverage analysis ──────────────────────────────────────────────────

  getCoverageAnalysis(treeId: string): any {
    const tree = this.trees.get(treeId);
    if (!tree) throw new Error(`Tree ${treeId} not found`);

    const allTiles = this.getTilesInTree(tree.rootTileId);
    const leaves = allTiles.filter((t) => t.isLeaf);
    const unexplored = allTiles.filter(
      (t) => !t.isLeaf && t.childrenIds.length === 0
    );
    const unvalidated = allTiles.filter(
      (t) => t.childrenIds.length > 0 && t.isMECE === undefined
    );

    // Fixed denominator: only count tiles that actually have splits
    const tilesWithSplits = allTiles.filter(
      (t) => t.childrenIds.length > 0
    );
    const validatedSplits = allTiles.filter(
      (t) => t.isMECE === true && t.childrenIds.length > 0
    );
    const evaluated = leaves.filter((t) => t.evaluation);
    const maxDepth = this.calculateMaxDepth(tree.rootTileId);

    return {
      totalTiles: allTiles.length,
      leafTiles: leaves.length,
      unexploredBranches: unexplored.length,
      validatedSplits: validatedSplits.length,
      unvalidatedSplits: unvalidated.length,
      evaluatedLeaves: evaluated.length,
      unevaluatedLeaves: leaves.length - evaluated.length,
      maxDepth,
      coveragePercentage:
        tilesWithSplits.length > 0
          ? (
              (validatedSplits.length / tilesWithSplits.length) *
              100
            ).toFixed(1)
          : "N/A",
      explorationSuggestions: this.generateSuggestions(
        unexplored,
        unvalidated,
        leaves
      ),
    };
  }

  private calculateMaxDepth(
    rootId: string,
    currentDepth: number = 0,
    visited: Set<string> = new Set()
  ): number {
    if (visited.has(rootId) || currentDepth > MAX_TREE_DEPTH) return currentDepth;
    visited.add(rootId);

    const tile = this.tiles.get(rootId);
    if (!tile || tile.childrenIds.length === 0) {
      return currentDepth;
    }

    let maxChildDepth = currentDepth;
    for (const childId of tile.childrenIds) {
      const childDepth = this.calculateMaxDepth(childId, currentDepth + 1, visited);
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
      suggestions.push(
        "Tree is well-explored! Consider revisiting as context evolves."
      );
    }

    return suggestions;
  }

  // ─── Statistics ─────────────────────────────────────────────────────────

  getStatistics(): any {
    const allTiles = Array.from(this.tiles.values());
    const leaves = allTiles.filter((t) => t.isLeaf);
    const splits = allTiles.filter((t) => t.childrenIds.length > 0);

    return {
      totalTrees: this.trees.size,
      totalTiles: allTiles.length,
      leafTiles: leaves.length,
      splits: splits.length,
      validatedSplits: splits.filter((t) => t.isMECE === true).length,
      evaluatedLeaves: leaves.filter((t) => t.evaluation).length,
      commonSplitAttributes: this.getCommonSplitAttributes(),
    };
  }

  private getCommonSplitAttributes(): Array<{
    attribute: string;
    count: number;
  }> {
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

  // ─── Validation / antipattern detection ─────────────────────────────────

  validateSplitQuality(tileId: string): SplitQualityReport {
    const tile = this.tiles.get(tileId);
    if (!tile) throw new Error(`Tile ${tileId} not found`);

    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];

    const children = tile.childrenIds
      .map((id) => this.tiles.get(id))
      .filter((t): t is Tile => t !== undefined);

    if (children.length === 0) {
      return {
        tileId: tile.id,
        tileTitle: tile.title,
        issues: [],
        score: 100,
        recommendations: ["Tile has no children - nothing to validate"],
      };
    }

    // 1. Vague language
    issues.push(...this.detectVagueLanguage(children));

    // 2. Catch-all buckets
    issues.push(...this.detectCatchAllBuckets(children));

    // 3. Mixed dimensions
    issues.push(...this.detectMixedDimensions(tile, children));

    // 4. Retroactive splitting
    issues.push(...this.detectRetroactiveSplitting(tile, children));

    // 5. Incomplete coverage — distinguish undefined vs false (Bug 7.5 fix)
    if (tile.isMECE === undefined) {
      issues.push({
        type: "incomplete_coverage",
        severity: "warning",
        message:
          "Split has not been validated for MECE completeness",
        tileId: tile.id,
        suggestion:
          "Use mark_mece to validate that the split is Mutually Exclusive and Collectively Exhaustive",
      });
    } else if (tile.isMECE === false) {
      issues.push({
        type: "incomplete_coverage",
        severity: "error",
        message:
          "Split was validated and found NOT to be MECE — review and fix overlaps or gaps",
        tileId: tile.id,
        suggestion:
          "Review the children for overlaps or missing categories, then use resplit_tile or add_tiles_to_split to fix",
      });
    }

    // Generate recommendations
    if (issues.length === 0) {
      recommendations.push("Split appears well-structured");
      if (tile.isMECE) {
        recommendations.push("MECE validation completed");
      }
    } else {
      const errorCount = issues.filter(
        (i) => i.severity === "error"
      ).length;
      const warningCount = issues.filter(
        (i) => i.severity === "warning"
      ).length;

      if (errorCount > 0) {
        recommendations.push(
          `Address ${errorCount} critical issue(s) before proceeding`
        );
      }
      if (warningCount > 0) {
        recommendations.push(
          `Review ${warningCount} warning(s) to improve split quality`
        );
      }

      if (issues.some((i) => i.type === "vague_language")) {
        recommendations.push(
          "Replace vague terms with measurable physical properties or precise definitions"
        );
      }
      if (issues.some((i) => i.type === "catch_all_bucket")) {
        recommendations.push(
          "Replace catch-all categories with specific, splittable subsets"
        );
      }
      if (issues.some((i) => i.type === "mixed_dimensions")) {
        recommendations.push(
          "Use a single consistent dimension/attribute for this split level"
        );
      }
      if (issues.some((i) => i.type === "retroactive_splitting")) {
        recommendations.push(
          "Consider physics/math-based splits instead of known solution types"
        );
      }
    }

    const errorPenalty =
      issues.filter((i) => i.severity === "error").length * 20;
    const warningPenalty =
      issues.filter((i) => i.severity === "warning").length * 10;
    const score = Math.max(0, 100 - errorPenalty - warningPenalty);

    return {
      tileId: tile.id,
      tileTitle: tile.title,
      issues,
      score,
      recommendations,
    };
  }

  private detectVagueLanguage(children: Tile[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Vague terms — only check titles to avoid false positives on descriptions
    const vagueTerms = [
      "natural",
      "artificial",
      "forced",
      "conventional",
      "traditional",
      "modern",
      "advanced",
      "simple",
      "complex",
      "normal",
      "standard",
      "typical",
      "unusual",
      "general",
      "better",
      "worse",
      "good",
      "bad",
      "easy",
      "hard",
      "misc",
      "various",
    ];

    for (const child of children) {
      const titleLower = child.title.toLowerCase();

      for (const vagueTerm of vagueTerms) {
        const regex = new RegExp(`\\b${vagueTerm}\\b`, "i");
        if (regex.test(titleLower)) {
          issues.push({
            type: "vague_language",
            severity: "warning",
            message: `Tile "${child.title}" uses vague term "${vagueTerm}" which may lack precision`,
            tileId: child.id,
            suggestion: `Replace "${vagueTerm}" with measurable properties (e.g., instead of "natural", specify "bio-derived" or "occurring without human intervention")`,
          });
        }
      }
    }

    return issues;
  }

  private detectCatchAllBuckets(children: Tile[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Patterns for catch-all buckets — check title only
    const catchAllPatterns = [
      /\bother\b/i,
      /\bmisc(ellaneous)?\b/i,
      /\beverything else\b/i,
      /\bremaining\b/i,
      /\brest of\b/i,
      /\betc\.?\b/i,
    ];

    for (const child of children) {
      const title = child.title;

      for (const pattern of catchAllPatterns) {
        if (pattern.test(title)) {
          issues.push({
            type: "catch_all_bucket",
            severity: "error",
            message: `Tile "${child.title}" appears to be a catch-all bucket that prevents systematic exploration`,
            tileId: child.id,
            suggestion:
              "Replace with specific, well-defined categories. If you're unsure what belongs here, this indicates the split dimension may need revision.",
          });
          break; // Only report once per child
        }
      }
    }

    return issues;
  }

  private detectMixedDimensions(
    parent: Tile,
    children: Tile[]
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const classificationKeywords = [
      "by size",
      "by material",
      "by mechanism",
      "by energy",
      "by type",
      "by function",
      "by location",
      "by time",
      "by cost",
      "by scale",
    ];

    const foundKeywords: string[] = [];
    for (const child of children) {
      const desc = child.description.toLowerCase();
      for (const keyword of classificationKeywords) {
        if (desc.includes(keyword)) {
          foundKeywords.push(keyword);
        }
      }
    }

    if (foundKeywords.length > 1 && new Set(foundKeywords).size > 1) {
      issues.push({
        type: "mixed_dimensions",
        severity: "error",
        message: `Children of "${parent.title}" may be split along inconsistent dimensions`,
        tileId: parent.id,
        suggestion: `Choose a single dimension for this split. Found references to: ${[...new Set(foundKeywords)].join(", ")}. Each split level should use one consistent attribute.`,
      });
    }

    const physicalTerms = [
      "electric",
      "magnetic",
      "thermal",
      "mechanical",
      "chemical",
      "nuclear",
      "optical",
    ];
    const abstractTerms = [
      "traditional",
      "innovative",
      "experimental",
      "commercial",
      "prototype",
    ];

    let hasPhysical = false;
    let hasAbstract = false;

    for (const child of children) {
      const text =
        `${child.title} ${child.description}`.toLowerCase();
      if (physicalTerms.some((term) => text.includes(term)))
        hasPhysical = true;
      if (abstractTerms.some((term) => text.includes(term)))
        hasAbstract = true;
    }

    if (hasPhysical && hasAbstract) {
      issues.push({
        type: "mixed_dimensions",
        severity: "warning",
        message:
          "Children mix physical and abstract classification bases",
        tileId: parent.id,
        suggestion:
          "Consider splitting first by physical mechanism, then by maturity/adoption in subsequent levels",
      });
    }

    return issues;
  }

  private detectRetroactiveSplitting(
    parent: Tile,
    children: Tile[]
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (parent.splitAttribute) {
      const suspiciousAttributes = [
        /\bsolution type\b/i,
        /\bknown (methods?|approaches?|techniques?)\b/i,
        /\bexisting (methods?|approaches?|techniques?)\b/i,
        /\bliterature categories\b/i,
        /\btraditional methods\b/i,
      ];

      for (const pattern of suspiciousAttributes) {
        if (pattern.test(parent.splitAttribute)) {
          issues.push({
            type: "retroactive_splitting",
            severity: "warning",
            message: `Split attribute "${parent.splitAttribute}" suggests retroactive splitting using known solution types`,
            tileId: parent.id,
            suggestion:
              "Consider physics/math-based dimensions (e.g., energy source, scale, mechanism) rather than categorizing known solutions",
          });
          break;
        }
      }
    }

    let properNounCount = 0;
    for (const child of children) {
      const words = child.title.split(" ");
      for (let i = 1; i < words.length; i++) {
        if (/^[A-Z][a-z]/.test(words[i]) && words[i].length > 3) {
          properNounCount++;
        }
      }
    }

    if (properNounCount >= children.length / 2) {
      issues.push({
        type: "retroactive_splitting",
        severity: "warning",
        message: `Many children (${properNounCount}/${children.length}) appear to reference specific named solutions`,
        tileId: parent.id,
        suggestion:
          "Instead of categorizing known solutions, split by fundamental properties that generate novel possibilities",
      });
    }

    return issues;
  }

  /**
   * Get all validation issues for a tree
   */
  getTreeValidationReport(treeId: string): {
    treeId: string;
    splitReports: SplitQualityReport[];
    overallScore: number;
    summary: string;
  } {
    const tree = this.trees.get(treeId);
    if (!tree) throw new Error(`Tree ${treeId} not found`);

    const allTiles = this.getTilesInTree(tree.rootTileId);
    const tilesWithSplits = allTiles.filter(
      (t) => t.childrenIds.length > 0
    );

    const splitReports = tilesWithSplits.map((tile) =>
      this.validateSplitQuality(tile.id)
    );

    const overallScore =
      splitReports.length > 0
        ? Math.round(
            splitReports.reduce((sum, r) => sum + r.score, 0) /
              splitReports.length
          )
        : 100;

    const totalIssues = splitReports.reduce(
      (sum, r) => sum + r.issues.length,
      0
    );
    const totalErrors = splitReports.reduce(
      (sum, r) =>
        sum +
        r.issues.filter((i) => i.severity === "error").length,
      0
    );

    let summary = `Tree has ${splitReports.length} splits with ${totalIssues} total issues (${totalErrors} errors). Overall score: ${overallScore}/100.`;

    if (overallScore >= 80) {
      summary += " Tree structure is good quality.";
    } else if (overallScore >= 60) {
      summary += " Some improvements recommended.";
    } else {
      summary += " Significant issues detected - review recommendations.";
    }

    return { treeId, splitReports, overallScore, summary };
  }

  // ─── Export ─────────────────────────────────────────────────────────────

  export(format: string, treeId: string): string {
    const tree = this.trees.get(treeId);
    if (!tree) throw new Error(`Tree ${treeId} not found`);

    switch (format) {
      case "json":
        return this.exportJSON(tree);
      case "markdown":
        return this.exportMarkdown(tree);
      case "mermaid":
        return this.exportMermaid(tree);
      case "dot":
        return this.exportDOT(tree);
      case "csv":
        return this.exportCSV(tree);
      default:
        throw new Error(`Unknown export format: ${format}`);
    }
  }

  private exportJSON(tree: TilingTree): string {
    const tiles = this.getTilesInTree(tree.rootTileId);
    return JSON.stringify({ tree, tiles }, null, 2);
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

  /**
   * Markdown tile renderer.
   * Depth 0-4 → h2-h6 headings (no indentation — CommonMark breaks at 4+ spaces).
   * Depth ≥ 5 → nested bullet lists.
   */
  private tileToMarkdown(tile: Tile, depth: number, visited: Set<string> = new Set()): string {
    if (visited.has(tile.id) || depth > MAX_TREE_DEPTH) return "";
    visited.add(tile.id);

    let md = "";

    if (depth <= 4) {
      // h2 (##{depth+2}) through h6
      const prefix = "#".repeat(depth + 2);
      md += `${prefix} ${tile.title}\n\n`;
      md += `${tile.description}\n\n`;
    } else {
      // Bullet list for deeper tiles
      const indent = "  ".repeat(depth - 5);
      md += `${indent}- **${tile.title}**: ${tile.description}\n\n`;
    }

    if (tile.splitAttribute) {
      md += `**Split by:** ${tile.splitAttribute}\n`;
      if (tile.splitRationale) {
        md += `**Rationale:** ${tile.splitRationale}\n`;
      }
      if (tile.isMECE !== undefined) {
        md += `**MECE Validated:** ${tile.isMECE ? "✓" : "✗"}\n`;
      }
      md += "\n";
    }

    if (tile.isLeaf && tile.evaluation) {
      md += `**Evaluation:**\n`;
      const e = tile.evaluation;
      if (e.impact) md += `- Impact: ${e.impact}/10\n`;
      if (e.feasibility)
        md += `- Feasibility: ${e.feasibility}/10\n`;
      if (e.uniqueness)
        md += `- Uniqueness: ${e.uniqueness}/10\n`;
      if (e.timeframe) md += `- Timeframe: ${e.timeframe}\n`;
      if (e.notes) md += `- Notes: ${e.notes}\n`;
      md += "\n";
    }

    for (const childId of tile.childrenIds) {
      const child = this.tiles.get(childId);
      if (child) {
        md += this.tileToMarkdown(child, depth + 1, visited);
      }
    }

    return md;
  }

  /**
   * Mermaid export with proper escaping, short node IDs, and safe edge labels.
   */
  private exportMermaid(tree: TilingTree): string {
    const tiles = this.getTilesInTree(tree.rootTileId);

    // Create short node IDs (n1, n2, ...) instead of 32-char hex
    const nodeIdMap = new Map<string, string>();
    let counter = 1;
    for (const tile of tiles) {
      nodeIdMap.set(tile.id, `n${counter++}`);
    }

    let mermaid = "graph TD\n";

    // Add nodes
    for (const tile of tiles) {
      const nodeId = nodeIdMap.get(tile.id)!;
      const safeLabel = mermaidEscape(tile.title);
      const shape = tile.isLeaf
        ? `["${safeLabel}"]`
        : `("${safeLabel}")`;

      let style = "";
      if (tile.isLeaf && tile.evaluation) {
        const avg =
          ((tile.evaluation.impact || 0) +
            (tile.evaluation.feasibility || 0) +
            (tile.evaluation.uniqueness || 0)) /
          3;
        if (avg >= 7) style = ":::high";
        else if (avg >= 4) style = ":::medium";
        else style = ":::low";
      }

      mermaid += `    ${nodeId}${shape}${style}\n`;
    }

    // Add edges with safe labels (pipe chars stripped)
    for (const tile of tiles) {
      for (const childId of tile.childrenIds) {
        const nodeId = nodeIdMap.get(tile.id)!;
        const childNodeId = nodeIdMap.get(childId)!;
        const attr = tile.splitAttribute || "";
        const safeAttr = mermaidEscape(attr).replace(/\|/g, "/");
        const label = safeAttr ? `|${safeAttr}|` : "";
        mermaid += `    ${nodeId} -->${label} ${childNodeId}\n`;
      }
    }

    // Add styling
    mermaid += "\n    classDef high fill:#90EE90\n";
    mermaid += "    classDef medium fill:#FFD700\n";
    mermaid += "    classDef low fill:#FFB6C1\n";

    return mermaid;
  }

  /**
   * DOT export with proper escaping of all labels.
   */
  private exportDOT(tree: TilingTree): string {
    const tiles = this.getTilesInTree(tree.rootTileId);

    let dot = "digraph TilingTree {\n";
    dot += "  node [shape=box, style=rounded];\n";
    dot += `  label="${dotEscape(tree.name)}\\n${dotEscape(tree.problemStatement)}";\n`;
    dot += "  labelloc=t;\n\n";

    // Add nodes
    for (const tile of tiles) {
      const label = dotEscape(tile.title);
      let color = "white";

      if (tile.isLeaf && tile.evaluation) {
        const avg =
          ((tile.evaluation.impact || 0) +
            (tile.evaluation.feasibility || 0) +
            (tile.evaluation.uniqueness || 0)) /
          3;
        if (avg >= 7) color = "lightgreen";
        else if (avg >= 4) color = "lightyellow";
        else color = "lightcoral";
      }

      const shape = tile.isLeaf ? "box" : "ellipse";
      dot += `  "${tile.id}" [label="${label}", fillcolor="${color}", style="rounded,filled", shape=${shape}];\n`;
    }

    dot += "\n";

    // Add edges with escaped labels
    for (const tile of tiles) {
      for (const childId of tile.childrenIds) {
        const label = dotEscape(tile.splitAttribute || "");
        dot += `  "${tile.id}" -> "${childId}" [label="${label}"];\n`;
      }
    }

    dot += "}\n";
    return dot;
  }

  /**
   * CSV export of leaf tile evaluations.
   */
  private exportCSV(tree: TilingTree): string {
    const allTiles = this.getTilesInTree(tree.rootTileId);
    const leaves = allTiles.filter((t) => t.isLeaf);

    let csv =
      "Path,Title,Impact,Feasibility,Uniqueness,Combined,Timeframe,Notes\n";

    for (const leaf of leaves) {
      const tilePath = this.getTilePath(leaf.id)
        .path.map((t) => t.title)
        .join(" > ");
      const e = leaf.evaluation;
      const impact = e?.impact ?? "";
      const feasibility = e?.feasibility ?? "";
      const uniqueness = e?.uniqueness ?? "";
      const combined =
        e?.impact && e?.feasibility && e?.uniqueness
          ? ((e.impact + e.feasibility + e.uniqueness) / 3).toFixed(1)
          : "";
      const timeframe = e?.timeframe ?? "";
      const notes = e?.notes ?? "";

      csv += `${csvEscape(tilePath)},${csvEscape(leaf.title)},${impact},${feasibility},${uniqueness},${combined},${csvEscape(timeframe)},${csvEscape(notes)}\n`;
    }

    return csv;
  }
}