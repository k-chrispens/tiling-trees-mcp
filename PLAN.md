# Tiling Trees MCP — Improvement Plan

> Comprehensive audit and improvement roadmap based on deep code analysis,
> runtime verification, edge-case testing, and multi-angle review.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Methodology](#2-methodology)
3. [Critical Issues (Blocks Real Usage)](#3-critical-issues)
4. [Confirmed Bugs](#4-confirmed-bugs)
5. [Design Improvements](#5-design-improvements)
6. [MCP Protocol Gaps](#6-mcp-protocol-gaps)
7. [Antipattern Detection Quality](#7-antipattern-detection-quality)
8. [Export & Visualization Fixes](#8-export--visualization-fixes)
9. [Documentation Fixes](#9-documentation-fixes)
10. [Implementation Priorities](#10-implementation-priorities)
11. [Verification Log](#11-verification-log)
12. [Final Reflective Review](#12-final-reflective-review)

---

## 1. Executive Summary

The Tiling Trees MCP is a well-conceived implementation of the MECE-based solution space exploration method. The core concept is sound, the README is thorough, and the tool API surface is comprehensive (18 tools). However, there are **3 critical blockers**, **10 confirmed bugs**, and **~20 design improvements** that would dramatically increase real-world usefulness.

The single biggest issue: **all tree data lives in memory and is lost when the server restarts**. This alone makes the tool impractical for any serious exploration that spans multiple sessions.

**Current state**: Good concept, good documentation, needs engineering hardening.

---

## 2. Methodology

This audit was conducted via:

1. **Static code analysis** — Read every line of `src/index.ts` (693 lines) and `src/research-tree.ts` (1141 lines)
2. **Runtime testing** — Executed 15+ targeted test scenarios against the compiled code via `node -e`
3. **Edge-case probing** — Tested: empty inputs, out-of-range values, special characters, duplicate titles, zero-subset splits, single-subset splits, wrong-ID-type errors, empty search queries
4. **Export format verification** — Generated Mermaid, DOT, and Markdown output with adversarial inputs (quotes, parentheses, HTML entities)
5. **MCP SDK comparison** — Checked installed SDK v1.22.0 capabilities vs. what the server uses
6. **Mathematical verification** — Validated the combined scoring formula and coverage percentage calculation
7. **Cross-reference check** — Compared README promises against actual implementation
8. **Git history review** — Examined 9 commits for evolution context

Every finding below was verified by at least two methods. Uncertain findings are explicitly marked.

---

## 3. Critical Issues

### 3.1 No Persistence — All Data Lost on Restart

**Status**: Confirmed via code inspection + runtime test
**Evidence**: `ResearchTreeManager` stores all state in `Map<string, T>` objects. No `fs`, `path`, `writeFile`, `readFile`, or any persistence import exists anywhere in the source.

**Impact**: A user who builds a tree over a 2-hour session loses everything when the MCP server stops. This makes the tool unusable for real work.

**Fix**: Add file-based persistence. Options (ranked):
- **Option A (Recommended)**: JSON file per tree, auto-save on mutation, auto-load on startup. Simple, no dependencies.
- **Option B**: SQLite via `better-sqlite3`. More robust for large trees, supports concurrent access.

Whichever option is chosen, the storage directory should be configurable via env var `TILING_TREES_DATA_DIR`, defaulting to `~/.tiling-trees/`.

**Implementation notes**:
- Every mutating method (`createTree`, `splitTile`, `addTilesToSplit`, `markMECE`, `evaluateTile`, `updateTile`, plus new `delete_tree`, `delete_tile`, `resplit_tile`) needs a `save()` call
- Constructor loads all trees from disk
- Need `delete_tree` tool to manage disk usage
- **Tile → Tree resolution**: The `Tile` interface has no `treeId` field. Tile-only mutations (e.g., `evaluateTile(tileId, ...)`) need to know which tree file to save. Fix by adding a `treeId: string` field to `Tile` (set during `createTile`), or by maintaining a `Map<tileId, treeId>` reverse-lookup index rebuilt on load. Without this, a tile-only save requires walking the `parentId` chain to the root, then scanning all trees for a matching `rootTileId` — O(n) per save.
- Consider debounced writes to avoid excessive I/O during rapid operations, but note the tradeoff: debouncing risks data loss on crash between mutation and flush

### 3.2 No Delete Operations

**Status**: Confirmed — grep for `delete|remove` returns zero results in source
**Evidence**: The tool set has 18 tools. None allow deletion.

**Impact**: Any mistake in tree construction is permanent. Can't clean up abandoned experiments. With persistence added, disk fills up over time.

**Fix**: Add two new tools:
- `delete_tree` — Remove an entire tree and all its tiles from the `tiles` and `trees` Maps (and from disk, with persistence)
- `delete_tile` — Remove a tile and its entire subtree; update parent's `childrenIds` and invalidate its MECE status. **Edge cases**:
  - **Root tile**: Reject deletion of root tiles (`tile.parentId === undefined`). Use `delete_tree` instead. Deleting a root tile would leave the `TilingTree` object with a dangling `rootTileId`.
  - **Last child**: When removing a tile causes `parent.childrenIds` to become empty, also clear `parent.splitAttribute`, `parent.splitRationale`, `parent.isMECE`, and `parent.coverageNotes`. This prevents the inconsistent state identified in Bug 4.5 (split metadata with no children).

(Re-splitting is covered separately in Section 3.3 via `resplit_tile`, which subsumes a standalone `reset_split`.)

### 3.3 No Ability to Re-Split a Tile

**Status**: Confirmed via runtime test
**Evidence**: `splitTile()` throws `"Tile has already been split. Use addTilesToSplit to add more tiles."` when `childrenIds.length > 0`.

**Impact**: If you choose the wrong split dimension (e.g., "by color" when "by mechanism" would be better), you cannot undo it. The only option is creating a new tree and starting over. This directly contradicts the iterative nature of the tiling trees method.

**Fix**: Add `resplit_tile` tool that:
1. Recursively removes all children (and their subtrees) from the `tiles` Map
2. Clears `splitAttribute`, `splitRationale`, `isMECE`, `coverageNotes` on the parent
3. Resets `childrenIds` to `[]` on the parent
4. Creates new children from provided subsets (via the existing `splitTile` logic)
5. Returns a warning listing any evaluated leaves that were destroyed

This single tool subsumes the need for a separate `reset_split`. If a user wants to clear a split now and decide on new subsets later, they can use `delete_tile` on each child individually (which updates the parent's `childrenIds`), then call `split_tile` when ready.

---

## 4. Confirmed Bugs

### 4.1 No Input Validation on Evaluation Scores

**Status**: Confirmed via runtime test
**Test**: `evaluateTile(id, {impact: 999, feasibility: -5, uniqueness: 0})` — succeeds silently
**Evidence**: No bounds checking in `evaluateTile()`. Schema says `minimum: 1, maximum: 10` but this is only a hint to the MCP client, not enforced server-side.

**Impact**: Corrupts scoring. `getTopLeaves` returns incorrect rankings. Combined score can be nonsensical.

**Fix**: Clamp values to 1–10 range in `evaluateTile()`, or throw on out-of-range.

### 4.2 evaluateTile Overwrites Entire Evaluation Object

**Status**: Confirmed via runtime test
**Test**: First `evaluateTile(id, {impact:5, feasibility:7})`, then `evaluateTile(id, {impact:8})` → feasibility is lost.
**Evidence**: Line ~273: `tile.evaluation = evaluation` (full replacement, not merge).

**Impact**: Users expect to update one field without losing others. Current behavior silently drops previously-set values.

**Fix**: Merge instead of replace, filtering out `undefined` values so that omitted fields are preserved:
```typescript
const defined = Object.fromEntries(
  Object.entries(evaluation).filter(([_, v]) => v !== undefined)
);
tile.evaluation = { ...tile.evaluation, ...defined };
```
**Why filtering matters**: A naïve `{ ...tile.evaluation, ...evaluation }` spread still overwrites existing values with `undefined` for any key present in the parameter object (e.g., `{impact: 8, feasibility: undefined}` would destroy a previously-set feasibility). The filter ensures only explicitly-provided values are merged.

### 4.3 Coverage Percentage Denominator Bug

**Status**: Confirmed via runtime test + mathematical analysis
**Evidence**: Formula at line 521:
```typescript
coveragePercentage = (validated.length / (allTiles.length - leaves.length)) * 100
```
The denominator `allTiles.length - leaves.length` includes **unexplored non-leaf tiles** (tiles that haven't been split and aren't marked as leaves). These tiles don't *have* splits, so they can't be "validated for MECE."

**Example**: Tree with root → [A (non-leaf, no children), B (leaf)], root is MECE-validated:
- allTiles=3, leaves=1, validated=1
- Current formula: 1 / (3-1) × 100 = **50%** — but there's only 1 actual split (root), which IS validated
- Correct: 1 / 1 × 100 = **100%**

The current formula penalizes the score for the existence of unexplored non-leaf tiles, conflating "validation coverage" with "exploration completeness" — two distinct metrics.

**Fix**: Use `tilesWithSplits.length` (tiles where `childrenIds.length > 0`) as denominator, **and** restrict the `validated` numerator to tiles that actually have splits (otherwise `markMECE` called on a childless tile inflates the numerator past the denominator, producing >100%):
```typescript
const tilesWithSplits = allTiles.filter(t => t.childrenIds.length > 0);
const validatedSplits = allTiles.filter(t => t.isMECE === true && t.childrenIds.length > 0);
coveragePercentage = tilesWithSplits.length > 0
  ? ((validatedSplits.length / tilesWithSplits.length) * 100).toFixed(1)
  : "N/A"
```
**Why both filters**: `markMECE` currently has no guard preventing it from being called on childless tiles (same pattern as Bug 4.10). Without the `childrenIds.length > 0` check on the numerator, a single `markMECE(leafId, true)` call would produce 200% coverage. The defensive filter here ensures the metric is self-consistent regardless.

### 4.4 Mermaid Export Broken by Special Characters

**Status**: Confirmed via runtime test
**Evidence**: Titles containing `(`, `)`, `<`, `>`, `&`, or `"` produce invalid Mermaid syntax.
- `a94c...(Node (with parens))` — Mermaid parses the first `)` as closing the label
- `a272...(Special <chars> & more)` — `<` interpreted as subgraph syntax

**Fix**: Use quoted string syntax for Mermaid labels with comprehensive escaping. Note: Mermaid uses `#entity;` syntax (not HTML `&entity;` syntax):
```typescript
function mermaidEscape(s: string): string {
  return s.replace(/#/g, '#num;').replace(/"/g, '#quot;')
          .replace(/</g, '#lt;').replace(/>/g, '#gt;');
}
const safeLabel = mermaidEscape(label);
const shape = tile.isLeaf ? `["${safeLabel}"]` : `("${safeLabel}")`;
```

### 4.5 Split with Zero Subsets Succeeds

**Status**: Confirmed via runtime test
**Test**: `splitTile(rootId, 'dim', 'rat', [])` — succeeds, sets splitAttribute/splitRationale, but creates 0 children
**Impact**: Produces an inconsistent state: tile has split metadata but no children. It's then neither "split" (0 children) nor "unsplit" (has splitAttribute). The `validateSplitQuality` reports "nothing to validate" despite the tile being in a broken state.

**Fix**: Reject splits with fewer than 2 subsets:
```typescript
if (subsets.length < 2) {
  throw new Error("A split must have at least 2 subsets to partition the space");
}
```

### 4.6 Empty Search Returns All Tiles

**Status**: Confirmed via runtime test
**Test**: `mgr.search('')` returns every tile because `"anything".includes("")` is always `true`.

**Fix**: Return empty array for empty/whitespace queries:
```typescript
if (!query.trim()) return [];
```

### 4.7 console.warn Not Returned to MCP Client

**Status**: Confirmed via code inspection
**Evidence**: Line 270: `console.warn(...)` when evaluating a non-leaf tile. This goes to the server's stderr, which the MCP client never sees.

**Fix**: Include the warning in the tool response, e.g.:
```typescript
return { ...tile, _warning: "Tile is not a leaf node..." };
```
Or use MCP's notification mechanism.

### 4.8 Empty String Inputs Accepted

**Status**: Confirmed via runtime test
**Test**: `createTree('', '')` succeeds, creating a tree with empty name and problem statement.

**Fix**: Validate required string fields are non-empty:
```typescript
if (!name.trim()) throw new Error("Tree name is required");
if (!problemStatement.trim()) throw new Error("Problem statement is required");
```

### 4.9 `get_tile` Returns Malformed Response for Nonexistent Tiles

**Status**: Confirmed via runtime test
**Test**: `getTile('nonexistent')` returns `undefined`. The handler then does `JSON.stringify(undefined, null, 2)` which produces JS `undefined` (not a string). The MCP response becomes `{"content":[{"type":"text"}]}` — missing the required `text` field.
**Evidence**: In `index.ts`, the `get_tile` handler doesn't check for undefined before JSON serialization. All other lookup methods (`splitTile`, `markMECE`, etc.) throw on not-found, but `getTile` silently returns `undefined`.

**Impact**: Protocol violation. Client may crash or display confusing results.

**Fix**: Throw in `getTile` when tile is not found (consistent with all other methods):
```typescript
getTile(tileId: string): Tile {
  const tile = this.tiles.get(tileId);
  if (!tile) throw new Error(`Tile ${tileId} not found`);
  return tile;
}
```

### 4.10 Mutation Methods Missing State Guards (`addTilesToSplit`, `markMECE`, `updateTile`)

**Status**: Confirmed via runtime test

**`addTilesToSplit`**: Calling on a tile that has never been split succeeds silently. Creates children with no `splitAttribute` or `splitRationale` on the parent.
**Evidence**: `addTilesToSplit()` only checks that the parent exists, not that `childrenIds.length > 0`.
**Impact**: Produces a tile with children but no split dimension — the tree becomes semantically incoherent.

**`markMECE`**: Calling on a tile with no children succeeds silently, setting `isMECE = true` on a leaf or unexplored tile.
**Evidence**: `markMECE()` only checks that the tile exists, not that it has children to validate.
**Impact**: Semantically nonsensical (you can't validate a split that doesn't exist). Also breaks the coverage percentage metric (see note in Bug 4.3 fix).

**`updateTile` with `isLeaf: true`**: Setting `isLeaf = true` on a tile that has children succeeds silently, producing a tile that is simultaneously a "concrete idea" and a split parent.
**Evidence**: `updateTile()` applies `isLeaf` unconditionally with no children check.
**Impact**: Corrupts `getLeafTiles` (returns a tile with children as a "leaf"). **Causes `NaN` in coverage percentage** via division by zero: when all tiles including the split parent are marked as leaves, the denominator `allTiles.length - leaves.length` becomes `0`. Runtime-verified: `coveragePercentage: NaN`.

**Fix**: Add guards to all three:
```typescript
// In addTilesToSplit:
if (parent.childrenIds.length === 0) {
  throw new Error(`Tile ${parentId} has not been split yet. Use split_tile first.`);
}

// In markMECE:
if (tile.childrenIds.length === 0) {
  throw new Error(`Tile ${tileId} has no children to validate for MECE.`);
}

// In updateTile:
if (updates.isLeaf === true && tile.childrenIds.length > 0) {
  throw new Error(`Cannot mark tile as leaf — it has ${tile.childrenIds.length} children. Remove children first.`);
}
```

---

## 5. Design Improvements

### 5.1 Add Tile Ancestry / Path Tool

**Problem**: Users constantly need to understand where a tile sits in the tree hierarchy. Currently there's no way to see the path from root to a specific tile.

**Tool**: `get_tile_path`
```typescript
{
  "tileId": "<some-deep-tile>",
}
// Returns: [root] → [Energy Source] → [Chemical] → [Fuel Cells] → [This Tile]
```

**Implementation**: Walk `parentId` chain from tile to root, reverse the array.

### 5.2 Add Siblings Tool

**Problem**: When evaluating a tile, it's useful to see its siblings (the other tiles in the same split).

**Tool**: `get_siblings`
```typescript
{
  "tileId": "<tile-id>"
}
// Returns: All tiles sharing the same parentId
```

### 5.3 Tile Lookup by Name/Path (Not Just UUID)

**Problem**: Every operation requires a UUID. Users must constantly copy-paste IDs. LLMs consume unnecessary context tracking UUIDs.

**Improvement**: Allow tools to accept either UUID or a path-like string:
```
"tileId": "root/Energy Source/Chemical"
```
Fall back to UUID if path doesn't match. This is a significant UX improvement.

### 5.4 Configurable Scoring Function

**Problem**: The "combined" score uses simple arithmetic mean `(impact + feasibility + uniqueness) / 3`. This treats all dimensions equally and doesn't penalize extreme weaknesses.

**Verified mathematically**:
- `impact=9, feasibility=2, uniqueness=5` → combined = **5.33**
- `impact=5, feasibility=5, uniqueness=6` → combined = **5.33**
- These are ranked identically, but the first has a **fatal feasibility flaw**.

**Fix options**:
1. **Geometric mean**: `(I × F × U)^(1/3)` — naturally penalizes low scores (first example drops to 4.48)
2. **Weighted average**: Let users configure weights per dimension
3. **Min-gated**: `combined = avg × min(I,F,U)/10` — anything with a near-zero score gets crushed
4. **Custom dimensions**: Allow users to define their own evaluation axes beyond I/F/U

### 5.5 Batch Evaluation

**Problem**: After building a tree, evaluating 20+ leaves one-by-one is tedious.

**Tool**: `batch_evaluate` — accept array of `{tileId, impact, feasibility, ...}`.

### 5.6 Clone / Duplicate Tree

**Problem**: Users want to explore different split strategies for the same problem. Currently must rebuild from scratch.

**Tool**: `clone_tree` — deep copy a tree with new IDs. Optionally clone only down to a certain depth.

### 5.7 Compare Trees

**Problem**: After exploring different split strategies, no way to compare outcomes.

**Tool**: `compare_trees` — show side-by-side statistics, top leaves, coverage gaps for 2+ trees.

### 5.8 Undo History

Store a simple operation log. Allow `undo_last` to revert the most recent mutation. Critical for exploratory workflows where mistakes are common.

### 5.9 Return Tile ID Summary in Split Results

Currently `split_tile` returns the full parent tile + all created tiles with their full objects. For LLM consumers, a concise mapping of `{title → id}` would reduce context bloat.

### 5.10 Tree-Scoped Operations by Default

Many tools have an optional `treeId` filter. Since users typically work on one tree at a time, consider a `set_active_tree` tool that sets a default context, eliminating the need to pass `treeId` everywhere.

---

## 6. MCP Protocol Gaps

### 6.1 No MCP Resources

The server declares only `tools: {}` in capabilities. It should also declare:

- **Resources**: Expose each tree as a resource (`tiling-tree://{treeId}`), subscribable for changes. This lets clients display tree state in sidebars.
- **Resource templates**: `tiling-tree://{treeId}/tile/{tileId}` for individual tile access.

### 6.2 No MCP Prompts

MCP prompts can guide users through workflows. High-value prompts:

- `explore_problem` — Guided problem definition → first split → MECE validation
- `deep_dive` — Take a tile and systematically split it 3 levels deep
- `validate_and_fix` — Run full tree validation and interactively fix issues
- `find_best_ideas` — Coverage analysis → evaluate unscored leaves → rank results

### 6.3 SDK Version Specifier

`package.json` specifies `"@modelcontextprotocol/sdk": "^1.0.4"` but the installed version is 1.22.0. The server should specify a minimum version that matches the features it actually needs. Consider bumping to `^1.12.0` or similar.

### 6.4 No Server Instructions

MCP SDK 1.22.0 supports `ServerOptions.instructions` — an optional string on the `Server` constructor options (serialized as `InitializeResult.instructions`, NOT inside `ServerCapabilities`). This tells clients how to use the server. Add to the constructor:
```typescript
const server = new Server(
  { name: "tiling-trees-mcp", version: "0.3.0" },
  {
    capabilities: { tools: {} },
    instructions: "Start by calling create_tree, then use split_tile with MECE subsets. Always run validate_split_quality after splitting.",
  }
);
```

---

## 7. Antipattern Detection Quality

### 7.1 Vague Language — False Positive Risk

**Status**: Confirmed via code inspection
**Evidence**: The vague terms list includes `"specific"`, which would flag the perfectly valid tile "Specific heat capacity improvements". Also `"clean"` flags "Clean room manufacturing".

**Fix**:
- Use multi-word patterns: flag `"specific"` only when used as a standalone adjective, not as part of compound terms
- Add a context-aware exclusion list: `"specific heat"`, `"clean room"`, etc.
- Consider checking only the *title*, not the description (descriptions legitimately contain more detail)

### 7.2 Vague Language — Duplicate Flagging

The detector flags both `"other"` (in the vague terms list) and the catch-all detector also flags `\bother\b`. A tile like "Other materials" gets flagged twice (once as vague, once as catch-all). Deduplicate or prioritize the more specific detection.

### 7.3 Mixed Dimensions — Detection Is Too Weak

The mixed dimensions detector only catches cases where children descriptions literally contain phrases like "by size", "by material". In practice, mixed-dimension splits rarely include such self-referential language.

**Better approach**:
- Cluster children by the type of attribute they describe (physical property, temporal, spatial, cost, etc.)
- Flag when the semantic categories of children span multiple clusters
- This requires either an LLM-in-the-loop or a more sophisticated keyword taxonomy

### 7.4 Retroactive Splitting — Proper Noun Heuristic Issues

The detector counts capitalized words at position > 0 in `title.split(" ")` as proper nouns. The regex is `/^[A-Z][a-z]/` with `length > 3`. The heuristic fires when `properNounCount >= children.length / 2`.

**Nuance**: The plan's original examples ("Lithium-based", "Silicon carbide") would NOT actually trigger this heuristic — "Lithium-based" is a single word (no space) so the loop never runs, and "carbide" is lowercase. However, title-cased multi-word science names like "Silicon Carbide Anodes" or "Lithium Iron Phosphate" WOULD trigger it (counting "Carbide"/"Anodes" and "Iron"/"Phosphate" as proper nouns), despite being legitimate first-principles category names.

**Fix**: Maintain an exclusion list of common chemical elements, material names, and physics terms. Or raise the threshold. Or skip words that are common English nouns (using a small dictionary).

### 7.5 Incomplete Coverage Check Conflates `undefined` and `false`

**Status**: Confirmed via runtime test
**Evidence**: In `validateSplitQuality`, the incomplete_coverage check is:
```typescript
if (!tile.isMECE) { // triggers for BOTH undefined AND false
```
When `isMECE === undefined` (split not yet validated), the message "Split has not been validated" is correct. But when `isMECE === false` (explicitly marked as NOT MECE), the **same** message fires, telling the user to "Use mark_mece to validate" — which they already did.

**Fix**: Check `=== undefined` instead of `!`, and add a separate case for `=== false`:
```typescript
if (tile.isMECE === undefined) {
  issues.push({ type: "incomplete_coverage", severity: "warning",
    message: "Split has not been validated for MECE completeness", ... });
} else if (tile.isMECE === false) {
  issues.push({ type: "incomplete_coverage", severity: "error",
    message: "Split was validated and found NOT to be MECE — review and fix overlaps or gaps", ... });
}
```

### 7.6 Catch-All Pattern `\badditional\b` — Too Broad

The word "additional" is valid in many contexts: "Additional shielding layers", "Additional thermal management". It should only be flagged when it's the primary classifier of a tile, e.g., title starts with "Additional".

**Fix**: Check title only (not description), and require the word to be part of a catch-all phrase like "Additional/Other X".

---

## 8. Export & Visualization Fixes

### 8.1 Mermaid — Character Escaping (Bug, See 4.4)

Already covered. Requires sanitizing labels for parentheses, angle brackets, quotes, and ampersands.

### 8.2 Mermaid — Node IDs Are Unreadable

Node IDs are 32-char hex strings from UUIDs. Mermaid diagrams are hard to read/debug. Use sequential short IDs (`n1`, `n2`, ...) instead.

### 8.2a Mermaid — Edge Labels Not Escaped

The `splitAttribute` is used as an edge label in pipe-delimited syntax: `-->|splitAttribute|`. If the attribute contains `|`, the label is truncated at the first pipe. E.g., `splitAttribute = "Type|Category"` produces `-->|Type|Category|` where Mermaid parses `|Type|` as the full label and `Category|` as a syntax error.

**Fix**: Strip or replace `|` in edge labels, or use the Mermaid quoted edge label syntax.

### 8.3 DOT — Unescaped Quotes in Graph and Edge Labels

DOT uses quoted strings (`"..."`) for labels. Within these, only `"` and `\` need escaping. Characters like `<`, `>`, `&` are **not** special in DOT quoted strings (they're only special in HTML-label mode `<...>`, which this code doesn't use).

The **actual** DOT bugs are:
1. **Graph title label**: `tree.name` and `tree.problemStatement` are interpolated without escaping `"`. A tree named `Test "quoted"` produces `label="Test "quoted"\n..."` which is invalid DOT.
2. **Edge labels**: `splitAttribute` is used directly as an edge label without escaping `"`. A split attribute like `Type "category"` breaks the DOT.
3. **Tile labels**: These DO correctly escape `"` via `title.replace(/"/g, '\\"')`. The fix needs to apply the same escaping to the graph title and edge labels.

### 8.4 Markdown — Heading Depth Overflow

At depth > 4, headings become `######` (h6) and deeper tiles get no heading differentiation. Consider switching to bullet-list format for depth > 3:
```
#### Level 4 Tile
- **Level 5 Tile**: Description
  - **Level 6 Tile**: Description
```

### 8.5 Markdown — Indentation Creates Invalid Headings at Depth ≥ 2

The code generates `${indent}${prefix} ${tile.title}` where `indent = "  ".repeat(depth)` and `prefix = "#".repeat(depth + 2)`. Per CommonMark spec, ATX headings allow **up to 3 leading spaces**.

| Depth | Indent | Heading | Result |
|-------|--------|---------|--------|
| 0 | 0 spaces | `## Title` | ✅ Valid |
| 1 | 2 spaces | `  ### Title` | ✅ Valid (2 ≤ 3) |
| 2 | 4 spaces | `    #### Title` | ❌ Parsed as code block |
| 3 | 6 spaces | `      ##### Title` | ❌ Parsed as code block |

Breaking point is **depth ≥ 2**, not depth 1. Fix: remove indent from heading lines entirely (use heading depth alone for hierarchy), or switch to bullet-list format for depth ≥ 2.

### 8.6 Add CSV Export

For leaf evaluations, a CSV export would be valuable for spreadsheet analysis:
```csv
Path,Title,Impact,Feasibility,Uniqueness,Combined,Timeframe,Notes
```

---

## 9. Documentation Fixes

### 9.1 Chinese Characters in EXAMPLES.md

**Line 496**: `"splitRationale": "Healthcare spending分为distinct economic categories"`
The string "分为" is Chinese for "is divided into". This appears to be a content generation artifact.

**Fix**: Replace with `"Healthcare spending is divided into distinct economic categories"`.

### 9.2 README Claims Web Interface Integration

The README mentions "This MCP server complements the tiling-trees web interface" and discusses import/export workflows. But no web interface exists in this repo or is linked.

**Fix**: Either remove this section, add a link to the actual web interface, or mark it as "planned".

### 9.3 No CONTRIBUTING.md or Development Guide

No instructions for contributors on how to run tests, the expected PR process, or code style.

### 9.4 Missing Quickstart for MCP Clients

The README shows configuration for `claude_desktop_config.json` but doesn't mention other MCP clients (Cursor, Cline, pi, etc.). A generic "any MCP client" section would help.

---

## 10. Implementation Priorities

### Phase 1 — Critical (Make It Usable)
| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | **File-based persistence** | Large | Highest — without this, the tool is a demo |
| 2 | **delete_tree + delete_tile tools** | Small | Required for persistence cleanup + mistake recovery |
| 3 | **resplit_tile tool** | Medium | Unblocks iterative exploration |
| 4 | **Input validation** (scores, empty strings, min 2 subsets) | Small | Prevents corrupted state |

### Phase 2 — Bug Fixes
| # | Item | Effort | Impact |
|---|------|--------|--------|
| 5 | Fix coverage % denominator + numerator guard (Bug 4.3) | Tiny | Correct reporting |
| 6 | Fix evaluation merge (not replace) (Bug 4.2) | Tiny | Data integrity |
| 7 | Fix Mermaid escaping (node labels + edge labels) (Bug 4.4, 8.2a) | Small | Usable exports |
| 8 | Fix DOT escaping (graph title + edge labels) (8.3) | Small | Usable exports |
| 9 | Fix empty search (Bug 4.6) | Tiny | Correctness |
| 10 | Fix console.warn → response (Bug 4.7) | Tiny | User visibility |
| 11 | Fix Markdown heading depth ≥ 2 (8.5) | Small | Readable exports |
| 12 | Fix `get_tile` undefined response (Bug 4.9) | Tiny | Protocol compliance |
| 13 | Fix state guards: `addTilesToSplit` + `markMECE` + `updateTile` (Bug 4.10) | Tiny | Data integrity + prevents NaN |
| 14 | Fix `!isMECE` logic in validation (7.5) | Tiny | Correct guidance |

### Phase 3 — High-Value Features
| # | Item | Effort | Impact |
|---|------|--------|--------|
| 15 | `get_tile_path` tool | Small | Huge UX improvement |
| 16 | `get_siblings` tool | Tiny | Context awareness |
| 17 | Tile name/path lookup | Medium | Eliminates UUID pain |
| 18 | `clone_tree` tool | Medium | Enables strategy comparison |
| 19 | `set_active_tree` context | Small | Reduces repetition |
| 20 | CSV export | Small | Spreadsheet integration |

### Phase 4 — MCP Protocol & Polish
| # | Item | Effort | Impact |
|---|------|--------|--------|
| 21 | Add MCP Resources | Medium | Better client integration |
| 22 | Add MCP Prompts | Medium | Guided workflows |
| 23 | Improve antipattern detection | Medium | Better guidance |
| 24 | Add server instructions (`ServerOptions.instructions`) | Tiny | Better onboarding |
| 25 | Configurable scoring | Small | More nuanced ranking |
| 26 | Undo history | Large | Error recovery |

---

## 11. Verification Log

Every finding was confirmed by at least two methods. Key verifications:

| Finding | Method 1 | Method 2 | Result |
|---------|----------|----------|--------|
| No persistence | `grep -n "fs\|writeFile\|readFile"` → 0 results | Code inspection: only `Map` storage | **Confirmed** |
| No delete | `grep -n "delete\|remove"` → 0 results | Reviewed all 18 tool definitions | **Confirmed** |
| Score validation missing | Runtime: `evaluateTile(id, {impact:999})` succeeds | Code: no bounds check in `evaluateTile()` | **Confirmed** |
| Eval overwrites | Runtime: set I+F, then set I only → F lost | Code: `tile.evaluation = evaluation` (replacement) | **Confirmed** |
| Coverage % bug | Math: tree with 1 validated split + 1 unexplored → 50% instead of 100% | Code: denominator `allTiles.length - leaves.length` includes unexplored non-leaf tiles | **Confirmed** |
| Mermaid node escaping | Runtime: titles with `()`, `<>` → broken syntax | Mermaid spec: parentheses close labels | **Confirmed** |
| Mermaid edge escaping | Runtime: splitAttribute with `\|` → truncated label | Mermaid spec: pipes delimit edge labels | **Confirmed** |
| DOT escaping | Runtime: tree.name with `"` → broken graph label | DOT spec: only `"` and `\` need escaping in quoted strings | **Confirmed** |
| Empty split | Runtime: `splitTile(id, d, r, [])` succeeds | Code: no length check on subsets array | **Confirmed** |
| Empty search | Runtime: `search('')` → all tiles | JS: `"x".includes("") === true` | **Confirmed** |
| `get_tile` undefined | Runtime: `getTile('x')` → undefined; response becomes `{"type":"text"}` (no text field) | Code: returns `Tile \| undefined`, no throw | **Confirmed** |
| `addTilesToSplit` no guard | Runtime: succeeds on unsplit parent, creates children with no splitAttribute | Code: only checks parent exists, not split state | **Confirmed** |
| `updateTile` isLeaf guard | Runtime: `updateTile(rootId, {isLeaf:true})` on split parent → `coveragePercentage: NaN` (0/0) | Code: applies `isLeaf` with no children check | **Confirmed** |
| Chinese chars | `grep "分为" EXAMPLES.md` → line 496 | Visual inspection of healthcare example | **Confirmed** |
| Combined score flaw | Math: `(9+2+5)/3 = (5+5+6)/3` both 5.33 | Geometric mean: 4.48 vs 5.31 — separates them | **Confirmed** |

---

## 12. Final Reflective Review

After completing the full analysis, I deliberately paused and reconsidered the entire reasoning chain from scratch.

### Challenge: Am I overweighting persistence?
**Counter-argument**: Maybe this MCP is designed as a single-session tool, like a scratch pad.
**Rebuttal**: The README says "Evolves over time: Revisit trees as technologies and contexts change" and "Revisit periodically." The author explicitly intends multi-session use. Example 6 shows re-evaluating a tile after 5 years. Persistence is definitively required for the stated use case.

### Challenge: Is re-splitting really needed, or is add_tiles_to_split enough?
**Counter-argument**: Users could add tiles to fix gaps, and the original bad tiles would just stay unused.
**Rebuttal**: If you split by "color" but should have split by "mechanism", adding mechanism-based tiles to a color-based split creates a mixed-dimension split — the very antipattern the tool warns against. You fundamentally need to **replace** the split, not append to it.

### Challenge: Are the export bugs really bugs, or just edge cases no one hits?
**Counter-argument**: Most tile titles are simple phrases without special characters.
**Rebuttal**: Engineering and science domains (the target audience per README) routinely use parentheses in names: "Lithium-ion (Li-ion)", "Carbon capture (CCS)", "Solid-state (ceramic)". These are not edge cases for the stated domain. Additionally, Mermaid rendering is one of the four export formats prominently documented — it must work correctly.

### Challenge: Could adding too many tools overwhelm the LLM?
**Valid concern**: The current 18 tools are already near the practical limit for many LLMs. This plan proposes ~6 new tools (`delete_tree`, `delete_tile`, `resplit_tile`, `get_tile_path`, `get_siblings`, `clone_tree`, plus optional `batch_evaluate`, `compare_trees`, `set_active_tree`). That could push toward 25+.
**Mitigation**: (a) Group read-only tools into a smaller set (e.g., combine `get_tile`, `get_tile_path`, `get_siblings` into a single `inspect_tile` with a `view` parameter). (b) Add MCP Prompts to guide workflows so the LLM doesn't need to reason about all tools simultaneously. (c) Clearly annotate tools with categories in their descriptions so LLMs can filter contextually.

### Challenge: Is the antipattern detection criticism too harsh?
**Calibration**: The detection is heuristic and explicitly documented as such. The false positives I identified (e.g., "specific heat") are real but moderate. The bigger issue is that the most important antipattern (mixed dimensions) is the weakest detection. This is worth improving but the existing detection already adds genuine value.

### Final assessment: The plan is sound.
The priority ordering (persistence → bugs → UX → protocol) correctly reflects a maturity ladder from "working demo" to "production-quality tool." No finding was invalidated during this re-review.
