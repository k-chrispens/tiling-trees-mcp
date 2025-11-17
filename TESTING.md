# Testing the Tiling Trees MCP Server

## Setup Verification

After configuring Claude Desktop with the MCP server, verify it's loaded by asking:

```
What MCP tools do you have available related to tiling trees?
```

You should see all 17 tools listed.

## Test Workflow 1: Basic Tree Creation

### Step 1: Create a tree
```
Create a tiling tree to explore: "How can we reduce plastic waste in oceans by 80%?"
```

**Expected**: Tree created with root tile ID returned

### Step 2: Make your first split
```
Split the root tile by intervention stage. Use these categories:
1. Prevention (stopping plastic from entering ocean)
2. Collection (removing plastic already in ocean)
3. Degradation (breaking down existing plastic)
4. Substitution (replacing plastic products)

Use split attribute "Intervention stage" with rationale "Different stages require different technologies and stakeholders"
```

**Expected**: Four tiles created as children of root

### Step 3: Validate the split
```
Validate the quality of that split
```

**Expected**: Score of 90-100 with no major issues

### Step 4: Make a problematic split
```
Now split the "Prevention" tile with these subsets:
1. Traditional methods
2. Advanced technologies
3. Other approaches
```

**Expected**: Tiles created

### Step 5: See validation catch issues
```
Validate the quality of the Prevention split
```

**Expected**: Low score (40-60) with warnings about:
- Vague language ("traditional", "advanced")
- Catch-all bucket ("other")

### Step 6: Fix the issues
```
Let's fix that split. Remove the children and split Prevention by "Control point" instead:
1. Manufacturing controls (reduce plastic production)
2. Consumer behavior (reduce plastic use)
3. Waste management (prevent leakage to waterways)
4. Regulatory interventions (policies and enforcement)
```

**Expected**: New split created

### Step 7: Validate improvement
```
Validate this new split
```

**Expected**: Score 90-100, much better

### Step 8: Get tree overview
```
Give me a coverage analysis of the entire tree
```

**Expected**: Shows explored/unexplored tiles, validation status

### Step 9: Export visualization
```
Export the tree as a Mermaid diagram
```

**Expected**: Mermaid syntax for visualization

## Test Workflow 2: Antipattern Detection

### Vague Language Test
```
Create a tree for "Improve solar panel efficiency"

Then split by:
1. Natural materials
2. Synthetic materials
3. Advanced composites

Validate it
```

**Expected**: Warnings about "natural", "synthetic", "advanced"

### Catch-All Bucket Test
```
Create a tree for "Transportation innovations"

Split by:
1. Electric vehicles
2. Hydrogen vehicles
3. Hybrid vehicles
4. Other technologies

Validate it
```

**Expected**: ERROR for "other technologies" catch-all bucket

### Mixed Dimensions Test
```
Create a tree for "Food preservation"

Split by:
1. Refrigeration (physical mechanism)
2. Traditional methods (maturity level)
3. Chemical preservatives (material type)
4. Commercial applications (use case)

Validate it
```

**Expected**: Error about mixing dimensions (mechanism, maturity, material, use)

### Retroactive Splitting Test
```
Create a tree for "Machine learning improvements"

Split by "Known ML techniques":
1. Deep Learning approaches
2. Random Forest methods
3. SVM techniques
4. Naive Bayes implementations

Validate it
```

**Expected**: Warning about retroactive splitting using known solution types

## Test Workflow 3: Full Tree Development

### Complete Example
```
Let's build a complete tree for "Improve battery charging speed by 10x"

1. Create the tree
2. Split root by "Limiting factor" (chemical kinetics, thermal management, electrical resistance, material degradation)
3. Validate each split
4. Split "Chemical kinetics" by "Intervention mechanism"
5. Continue until you have 3 levels
6. Mark some bottom tiles as leaves
7. Evaluate a few leaves with mock data
8. Get top leaves by combined score
9. Export the full tree
10. Get tree validation report
```

This tests the complete workflow with validation at each step.

## Verification Checklist

- [ ] Server loads in Claude Desktop
- [ ] Can create trees
- [ ] Can split tiles
- [ ] Can validate splits
- [ ] Vague language detection works
- [ ] Catch-all bucket detection works
- [ ] Mixed dimension detection works
- [ ] Retroactive splitting detection works
- [ ] Can mark tiles as MECE
- [ ] Can evaluate leaves
- [ ] Can search and explore
- [ ] Can get coverage analysis
- [ ] Can get top leaves
- [ ] Can export in multiple formats
- [ ] Tree validation report works
- [ ] All 17 tools accessible

## Common Issues

### Server Not Loading
- Check Claude Desktop logs: Help → Debugging → Show logs
- Verify path in config is absolute
- Ensure `npm run build` completed successfully

### Tools Not Appearing
- Restart Claude Desktop completely
- Check for JSON syntax errors in config
- Verify node version >= 18

### Validation Not Working
- Check that splits have children
- Ensure descriptions are provided (validation analyzes text)
- Try with deliberate vague terms to trigger warnings

## Performance Testing

Test with larger trees:
```
Create a tree with 50+ tiles across 4-5 levels
Run tree validation report
Check response time and quality
```

Should handle trees with 100+ tiles efficiently.

## Next Steps

After testing:
1. Try real problems from your domain
2. Experiment with different split strategies
3. Use validation to learn what makes good splits
4. Export trees for presentations/documentation
5. Iterate based on coverage analysis
