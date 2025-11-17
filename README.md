# Tiling Trees MCP Server

A Model Context Protocol (MCP) server implementing the **Tiling Trees Method** - a systematic approach to exploring solution spaces by recursively partitioning them into mutually exclusive and collectively exhaustive (MECE) subsets.

Based on the method described in [The Tiling Tree Method](https://engineeringx.substack.com/p/the-tiling-tree-method).

## What is the Tiling Trees Method?

The tiling trees method helps you **systematically explore all possible solutions to a problem** by:

1. **Starting with the complete solution space** - all possible approaches to your challenge
2. **Splitting using MECE principles** - divide into categories that don't overlap (Mutually Exclusive) but together cover everything (Collectively Exhaustive)
3. **Recursively subdividing** - continue splitting each subset until you reach concrete ideas/projects
4. **Evaluating leaves** - assess the viability of each concrete solution

The key insight: like tiles covering a wall completely without overlaps, your categories should partition the solution space with precision.

## Why Use This Method?

- **Guarantees completeness**: You won't overlook viable solutions
- **Forces creative thinking**: Systematic exploration surfaces ideas you might not normally consider
- **Enables objective comparison**: All solutions emerge from the same structured process
- **Identifies gaps**: Missing categories become obvious
- **Evolves over time**: Revisit trees as technologies and contexts change

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

## Core Concepts

### Tiles
Each tile represents a subset of the solution space with a **precise definition** to avoid overlaps with siblings.

### MECE Splits
When splitting a tile, choose an attribute/dimension that creates **Mutually Exclusive and Collectively Exhaustive** subsets:
- **Mutually Exclusive**: No solution belongs to multiple categories
- **Collectively Exhaustive**: Every solution belongs to exactly one category

### Split Attributes
The dimension used to partition (examples):
- **Energy source**: electric, chemical, mechanical, nuclear
- **Scale**: nano, micro, meso, macro
- **Physical mechanism**: conduction, convection, radiation
- **Timeframe**: immediate, short-term, long-term
- **Cost**: low, medium, high

**Tip**: Physics and math-oriented splits often work best because physical laws are concise and comprehensive.

### Leaves
Terminal nodes representing **concrete ideas or projects** ready for evaluation.

### Evaluation
Rate leaves on:
- **Impact** (1-10): Potential effect if successful
- **Feasibility** (1-10): Likelihood of success with available resources
- **Uniqueness** (1-10): How novel compared to existing solutions
- **Timeframe**: Expected development timeline

## Available Tools

### 1. create_tree
**Create a new tiling tree to explore a problem**

Start by defining your challenge. The tree begins with a root tile representing all possible solutions.

```typescript
{
  "name": "Transportation Decarbonization",
  "problemStatement": "How can we reduce carbon emissions in transportation by 80% by 2050?"
}
```

### 2. split_tile
**Split a tile into MECE subsets** (the core operation)

Choose a meaningful attribute and create categories that completely partition the parent space.

```typescript
{
  "tileId": "root-tile-id",
  "splitAttribute": "Transportation mode",
  "splitRationale": "Different modes have distinct technical constraints and emission profiles",
  "subsets": [
    {
      "title": "Road vehicles",
      "description": "Cars, trucks, buses, motorcycles - vehicles operating on roads",
      "isLeaf": false
    },
    {
      "title": "Rail",
      "description": "Trains, trams, subways - vehicles on rails",
      "isLeaf": false
    },
    {
      "title": "Aviation",
      "description": "Airplanes, helicopters - atmospheric flight vehicles",
      "isLeaf": false
    },
    {
      "title": "Maritime",
      "description": "Ships, boats, ferries - water-based transport",
      "isLeaf": false
    }
  ]
}
```

### 3. mark_mece
**Validate that a split is truly MECE**

After creating a split, verify completeness and exclusivity.

```typescript
{
  "tileId": "parent-tile-id",
  "isMECE": true,
  "coverageNotes": "Covers all major transportation modes. Edge cases like cable cars fall under 'Rail'. Space transport excluded as not relevant to 2050 target."
}
```

### 4. add_tiles_to_split
**Add missing categories** to an existing split

When you realize a category was missed, add it (invalidates MECE status).

```typescript
{
  "parentId": "parent-tile-id",
  "newTiles": [
    {
      "title": "Pipeline transport",
      "description": "Movement of goods through pipelines (oil, gas, etc.)",
      "isLeaf": false
    }
  ]
}
```

### 5. evaluate_tile
**Evaluate a leaf tile** (concrete solution)

Assess viability with quantitative metrics.

```typescript
{
  "tileId": "leaf-tile-id",
  "impact": 8,
  "feasibility": 6,
  "uniqueness": 4,
  "timeframe": "5-10 years",
  "notes": "High impact but faces infrastructure challenges",
  "calculationsOrPilots": "Pilot study in 3 cities showed 60% reduction in emissions"
}
```

### 6. get_coverage_analysis
**Analyze solution space coverage**

Identify unexplored branches, unvalidated splits, and next steps.

```typescript
{
  "treeId": "tree-id"
}
```

Returns:
- Tiles not yet split (exploration gaps)
- Splits not validated for MECE
- Leaves not evaluated
- Coverage percentage
- Suggestions for next steps

### 7. get_unexplored_tiles
**Find gaps** in your exploration

Get tiles that haven't been split yet.

### 8. get_top_leaves
**Find the best solutions**

Get highest-rated leaves by impact, feasibility, uniqueness, or combined score.

```typescript
{
  "criteria": "combined",
  "limit": 10,
  "treeId": "tree-id"
}
```

### 9. export_tree
**Export for visualization**

Export in JSON, Markdown, Mermaid diagrams, or DOT (GraphViz) format.

```typescript
{
  "treeId": "tree-id",
  "format": "mermaid"
}
```

### Additional Tools
- `get_trees`: List all tiling trees
- `get_tile`: Get details of a specific tile
- `explore_path`: Explore tree structure from a tile
- `get_leaf_tiles`: Get all concrete ideas/projects
- `search_tiles`: Search by content
- `update_tile`: Update tile information
- `get_statistics`: Overall statistics

### 10. validate_split_quality
**Detect common antipatterns** in a split

Automatically checks for:
- **Vague language**: Imprecise terms like "natural", "traditional", "simple"
- **Catch-all buckets**: Categories like "other" or "misc" that prevent exploration
- **Mixed dimensions**: Splitting along inconsistent attributes
- **Retroactive splitting**: Using pre-existing solution taxonomies instead of first principles
- **Incomplete coverage**: Splits not validated for MECE

```typescript
{
  "tileId": "parent-tile-id"
}
```

Returns:
- Quality score (0-100)
- List of issues with severity (error/warning)
- Specific recommendations for improvement

### 11. get_tree_validation_report
**Validate entire tree** for quality

Get validation reports for all splits in a tree with an overall quality score.

```typescript
{
  "treeId": "tree-id"
}
```

## Common Failure Modes

Based on real-world usage, watch out for these antipatterns:

### 1. Retroactive Splitting (Taxonomy Import)
**Problem**: Starting with known solution types from literature locks you into existing categories.

**Bad**: Splitting "battery improvements" by {Li-ion optimizations, NiMH advancements, Lead-acid improvements}
**Good**: Splitting by {chemistry type, electrode material, electrolyte state, architecture}

**Why**: Retroactive splitting only generates variations *within* known categories. First-principles splitting discovers fundamentally new possibilities.

### 2. Catch-All Buckets
**Problem**: Creating "other materials" or "miscellaneous" categories prevents systematic exploration.

**Bad**: {Silicon, Graphite, Lithium metal, Other materials}
**Good**: {Crystalline, Amorphous, Composite, Layered}

**Why**: You can't split "everything else" systematically. If you don't know what belongs in a category, the split dimension needs revision.

Use `validate_split_quality` to automatically detect catch-all buckets (error severity).

### 3. Vague Language ("Words That Mean Nothing")
**Problem**: Terms like "natural", "forced", "traditional" lack physical precision and create unavoidable overlaps.

**Bad**: {Natural cooling, Forced cooling}
**Good**: {Passive convection, Active forced-air, Liquid cooling, Phase-change}

**Why**: "Natural" doesn't map to unique physical properties - it could mean many things. Use measurable properties instead.

Use `validate_split_quality` to automatically flag vague terms (warning severity).

### 4. Mixed Dimensions (Category Errors)
**Problem**: Splitting along inconsistent dimensions creates inherent overlaps.

**Bad**: Vegetables classified as {Red ones, Sweet ones, Crunchy ones} - mixing color, taste, and texture
**Good**: Split by ONE dimension: {Root, Stem, Leaf, Fruit, Flower} OR {Raw-edible, Requires-cooking}

**Why**: One vegetable can be red AND sweet AND crunchy. Categories must be mutually exclusive.

Use `validate_split_quality` to detect mixed dimension warnings.

### 5. Incomplete Coverage
**Problem**: Missing possibilities in the split leaves gaps unexplored.

**Solution**: Always validate splits with `mark_mece` and use `get_coverage_analysis` to find gaps.

## Validation Workflow

After creating splits, validate quality:

```typescript
// Check a specific split
validate_split_quality({
  tileId: "<parent-tile-id>"
})

// Response:
{
  "score": 70,
  "issues": [
    {
      "type": "vague_language",
      "severity": "warning",
      "message": "Tile 'Advanced materials' uses vague term 'advanced'",
      "suggestion": "Replace 'advanced' with measurable properties..."
    }
  ],
  "recommendations": [
    "Replace vague terms with measurable physical properties"
  ]
}

// Check entire tree
get_tree_validation_report({
  treeId: "<tree-id>"
})

// Response includes overall score and all split reports
```

## Workflow Example

**Problem**: Improve battery energy density

### Step 1: Create the tree
```typescript
create_tree({
  name: "Battery Energy Density Improvements",
  problemStatement: "How can we increase battery energy density by 3x?"
})
```

### Step 2: First split - by chemistry
```typescript
split_tile({
  tileId: "<root-id>",
  splitAttribute: "Battery chemistry",
  splitRationale: "Fundamental chemistry determines theoretical energy density limits",
  subsets: [
    { title: "Lithium-based", description: "Li-ion, Li-polymer, Li-metal, Li-S, Li-air" },
    { title: "Sodium-based", description: "Na-ion and variants" },
    { title: "Metal-air", description: "Zn-air, Al-air (excluding Li-air)" },
    { title: "Solid-state", description: "Solid electrolyte batteries (any chemistry)" },
    { title: "Alternative chemistries", description: "Mg, Ca, multivalent ion, organic" }
  ]
})
```

### Step 3: Validate MECE
```typescript
mark_mece({
  tileId: "<root-id>",
  isMECE: true,
  coverageNotes: "Covers main battery chemistry families. Some overlap (e.g., Li-air could be 'metal-air'), resolved by treating Li as primary classifier."
})
```

### Step 4: Continue splitting
Split "Lithium-based" by approach:
- Electrode material improvements
- Electrolyte improvements
- Cell architecture innovations
- Manufacturing process optimizations

### Step 5: Reach leaves and evaluate
When you reach concrete ideas:
```typescript
evaluate_tile({
  tileId: "<silicon-anode-id>",
  impact: 9,
  feasibility: 7,
  uniqueness: 5,
  timeframe: "2-3 years",
  calculationsOrPilots: "Lab tests show 40% capacity increase; volume expansion remains challenge"
})
```

### Step 6: Analyze coverage
```typescript
get_coverage_analysis({ treeId: "<tree-id>" })
```

### Step 7: Find top solutions
```typescript
get_top_leaves({
  criteria: "combined",
  limit: 5,
  treeId: "<tree-id>"
})
```

## Best Practices

### 1. Define Precisely
Write explicit definitions for each tile to ensure no overlaps. Be mathematical/physical when possible.

**Good**: "Electric vehicles using only battery power (no combustion engine)"
**Bad**: "Clean cars"

### 2. Choose Good Split Attributes
- Prefer physics/math-based dimensions
- Ensure the attribute creates natural, complete partitions
- Document rationale for future reference

### 3. Validate MECE Rigorously
- Check for overlaps between sibling tiles
- Verify all possibilities are covered
- Document edge cases

### 4. Split to Appropriate Depth
- Don't stop too early (you'll miss solutions)
- Don't go too deep too fast (you'll lose the forest for the trees)
- Leaf nodes should be concrete enough to evaluate

### 5. Evaluate Honestly
- Base ratings on data when possible
- Document assumptions
- Include calculations or pilot results
- Be consistent across evaluations

### 6. Revisit Periodically
- Technologies evolve
- Contexts change
- Previously unviable branches may become promising

## Tips for AI Assistants Using This MCP

When helping users with tiling trees:

1. **Start with problem clarification** - ensure the problem statement is specific
2. **Suggest physics/math splits** when applicable - avoid retroactive splitting from known solutions
3. **Run validation after splits** - use `validate_split_quality` to catch antipatterns early
4. **Flag vague language** - watch for terms like "natural", "traditional", "advanced"
5. **Prevent catch-all buckets** - never allow "other" or "misc" categories
6. **Enforce single dimensions** - ensure each split uses one consistent attribute
7. **Encourage precision** - push for measurable properties and explicit definitions
8. **Use coverage analysis** - regularly check for unexplored areas
9. **Balance breadth and depth** - explore widely before going deep
10. **Prompt evaluation** - remind users to rate leaves with calculations/pilots, not just intuition

**Proactive Validation**: After each split, automatically run `validate_split_quality` and present any issues with constructive suggestions. This helps users learn the method correctly.

## Integration with Web Interface

This MCP server complements the tiling-trees web interface. Use the server for:
- Systematic exploration and validation
- Programmatic tree construction
- Coverage analysis
- Bulk operations

Use the web interface for:
- Visual exploration
- Presentations
- Collaborative sessions
- Quick modifications

Export from MCP → Import to web interface for best of both worlds.

## Example Split Attributes by Domain

### Engineering/Physical
- Energy source
- Scale (nano/micro/macro)
- Physical mechanism
- Material type
- Phase (solid/liquid/gas/plasma)

### Business/Strategy
- Market segment
- Revenue model
- Geographic region
- Customer type
- Distribution channel

### Software/Computing
- Architecture pattern
- Data structure
- Computational complexity class
- Deployment model
- Interface type

### Research/Science
- Methodology (experimental/theoretical/computational)
- Organism/system type
- Time scale
- Spatial scale
- Measurement technique

## Troubleshooting

**Q: My split has overlaps - what do I do?**
A: Refine definitions to make categories mutually exclusive. Sometimes this means choosing a different split attribute.

**Q: I can't cover everything with my categories**
A: Add an "Other" category temporarily, then revisit with a better split attribute that creates natural, complete partitions.

**Q: How do I know when to stop splitting?**
A: Stop when you reach concrete, evaluable ideas/projects. If a tile is still too abstract to assess impact/feasibility, keep splitting.

**Q: Can I have multiple trees for the same problem?**
A: Yes! Different split strategies yield different insights. Compare trees to find the most useful partitioning.

## License

MIT

## References

- [The Tiling Tree Method](https://engineeringx.substack.com/p/the-tiling-tree-method) - Original article
- [MECE Principle](https://en.wikipedia.org/wiki/MECE_principle) - Background on mutually exclusive and collectively exhaustive categorization
