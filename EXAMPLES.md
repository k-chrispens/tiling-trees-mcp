# Tiling Trees Method - Detailed Examples

This document provides complete examples of using the tiling trees method for systematic solution space exploration.

## Example 1: Reducing Food Waste

**Problem**: How can we reduce food waste by 50% in urban areas?

### Step 1: Create the tree

```
Tool: create_tree
{
  "name": "Urban Food Waste Reduction",
  "problemStatement": "How can we reduce food waste by 50% in urban areas within 5 years?"
}
```

Returns: Tree with root tile representing "All possible solutions"

### Step 2: First split - by stage in food lifecycle

```
Tool: split_tile
{
  "tileId": "<root-id>",
  "splitAttribute": "Stage in food lifecycle",
  "splitRationale": "Food waste occurs at distinct stages with different causes and interventions",
  "subsets": [
    {
      "title": "Production/Harvesting",
      "description": "Waste at farms before food enters supply chain - unharvested crops, sorting waste",
      "isLeaf": false
    },
    {
      "title": "Processing & Manufacturing",
      "description": "Waste during food processing, packaging, and manufacturing facilities",
      "isLeaf": false
    },
    {
      "title": "Distribution & Retail",
      "description": "Waste in transportation, warehouses, grocery stores, restaurants before consumer purchase",
      "isLeaf": false
    },
    {
      "title": "Consumer Use",
      "description": "Waste in homes, offices, schools after consumer acquires food",
      "isLeaf": false
    }
  ]
}
```

### Step 3: Validate MECE

```
Tool: mark_mece
{
  "tileId": "<root-id>",
  "isMECE": true,
  "coverageNotes": "Covers complete food lifecycle from farm to table. Each stage is distinct with minimal overlap. Edge case: restaurant waste split between 'retail' (prep waste) and 'consumer' (plate waste) - classified as 'distribution' since restaurant is vendor."
}
```

### Step 4: Split "Distribution & Retail" by intervention mechanism

```
Tool: split_tile
{
  "tileId": "<distribution-retail-id>",
  "splitAttribute": "Intervention mechanism",
  "splitRationale": "Different mechanisms address different root causes of retail waste",
  "subsets": [
    {
      "title": "Demand prediction improvement",
      "description": "Better forecasting to match supply with demand - AI, data analytics",
      "isLeaf": true
    },
    {
      "title": "Shelf-life extension",
      "description": "Technologies to keep food fresh longer - packaging, refrigeration, preservatives",
      "isLeaf": true
    },
    {
      "title": "Dynamic pricing",
      "description": "Price reductions on near-expiry items to increase sales velocity",
      "isLeaf": true
    },
    {
      "title": "Donation coordination",
      "description": "Systems to redirect unsold food to food banks before spoilage",
      "isLeaf": true
    }
  ]
}
```

### Step 5: Evaluate leaf tiles

```
Tool: evaluate_tile
{
  "tileId": "<demand-prediction-id>",
  "impact": 8,
  "feasibility": 7,
  "uniqueness": 6,
  "timeframe": "1-2 years",
  "notes": "Many retailers already have data infrastructure for rapid deployment",
  "calculationsOrPilots": "Pilot with grocery chain reduced waste by 30% using ML demand forecasting. Scales linearly with adoption."
}
```

```
Tool: evaluate_tile
{
  "tileId": "<dynamic-pricing-id>",
  "impact": 6,
  "feasibility": 9,
  "uniqueness": 3,
  "timeframe": "6 months",
  "notes": "Low-tech solution, already proven in multiple markets",
  "calculationsOrPilots": "European grocers using automated markdowns report 15-20% waste reduction. Simple to implement."
}
```

### Step 6: Check coverage

```
Tool: get_coverage_analysis
{
  "treeId": "<tree-id>"
}
```

Returns: "3 unexplored tiles - consider splitting these to complete coverage"

### Step 7: Continue with unexplored branches

Split "Consumer Use" by intervention type, "Production/Harvesting" by technology, etc.

### Step 8: Find top solutions

```
Tool: get_top_leaves
{
  "criteria": "combined",
  "limit": 5,
  "treeId": "<tree-id>"
}
```

Returns ranked list of most promising interventions.

---

## Example 2: Improving Solar Panel Efficiency

**Problem**: How can we increase solar panel efficiency from 20% to 35%?

### Step 1: Create tree

```
Tool: create_tree
{
  "name": "Solar Panel Efficiency Improvements",
  "problemStatement": "Increase solar panel energy conversion efficiency from 20% to 35%"
}
```

### Step 2: Split by loss mechanism

```
Tool: split_tile
{
  "tileId": "<root-id>",
  "splitAttribute": "Energy loss mechanism",
  "splitRationale": "Physics dictates specific loss mechanisms; addressing each independently",
  "subsets": [
    {
      "title": "Thermalization losses",
      "description": "Energy lost when high-energy photons create electron-hole pairs with excess energy dissipated as heat",
      "isLeaf": false
    },
    {
      "title": "Sub-bandgap transmission",
      "description": "Photons with energy below bandgap pass through without generating carriers",
      "isLeaf": false
    },
    {
      "title": "Recombination losses",
      "description": "Electron-hole pairs recombine before collection - radiative, Auger, surface, defect recombination",
      "isLeaf": false
    },
    {
      "title": "Optical losses",
      "description": "Reflection, shadowing from contacts, incomplete absorption",
      "isLeaf": false
    },
    {
      "title": "Resistive losses",
      "description": "Electrical resistance in contacts, semiconductors, interfaces",
      "isLeaf": false
    }
  ]
}
```

### Step 3: Validate (physics-based splits are naturally MECE)

```
Tool: mark_mece
{
  "tileId": "<root-id>",
  "isMECE": true,
  "coverageNotes": "Categories based on fundamental energy loss mechanisms in photovoltaics. Comprehensive per Shockley-Queisser analysis. No overlap as each mechanism is physically distinct."
}
```

### Step 4: Split "Thermalization losses" by approach

```
Tool: split_tile
{
  "tileId": "<thermalization-id>",
  "splitAttribute": "Approach to capture excess energy",
  "splitRationale": "Different physical mechanisms for harvesting energy that would otherwise thermalize",
  "subsets": [
    {
      "title": "Multi-junction cells",
      "description": "Stack multiple cells with different bandgaps to match photon energies more precisely",
      "isLeaf": true
    },
    {
      "title": "Hot carrier cells",
      "description": "Extract carriers before thermalization via energy-selective contacts",
      "isLeaf": true
    },
    {
      "title": "Multiple exciton generation",
      "description": "High-energy photons generate multiple electron-hole pairs (quantum dots, nanocrystals)",
      "isLeaf": true
    },
    {
      "title": "Up/down conversion",
      "description": "Convert photon energies before absorption - combine low-energy photons or split high-energy ones",
      "isLeaf": true
    }
  ]
}
```

### Step 5: Evaluate

```
Tool: evaluate_tile
{
  "tileId": "<multi-junction-id>",
  "impact": 9,
  "feasibility": 8,
  "uniqueness": 4,
  "timeframe": "3-5 years",
  "notes": "Proven technology (space applications), needs cost reduction for terrestrial use",
  "calculationsOrPilots": "Lab cells achieve 47.1% efficiency (NREL). Cost modeling shows path to $0.10/W with manufacturing scale."
}
```

```
Tool: evaluate_tile
{
  "tileId": "<hot-carrier-id>",
  "impact": 10,
  "feasibility": 3,
  "uniqueness": 9,
  "timeframe": "10+ years",
  "notes": "Theoretical efficiency >65% but major materials science challenges remain",
  "calculationsOrPilots": "Proof-of-concept devices show reduced thermalization but not yet practical carrier extraction. Active research area."
}
```

---

## Example 3: Reducing Traffic Congestion

**Problem**: How can we reduce urban traffic congestion by 40%?

### Step 1: Create tree

```
Tool: create_tree
{
  "name": "Urban Traffic Congestion Reduction",
  "problemStatement": "Reduce traffic congestion in major cities by 40% during peak hours"
}
```

### Step 2: Split by intervention category

```
Tool: split_tile
{
  "tileId": "<root-id>",
  "splitAttribute": "Type of intervention",
  "splitRationale": "Fundamental approaches to congestion: reduce demand, increase supply, or optimize usage",
  "subsets": [
    {
      "title": "Reduce travel demand",
      "description": "Decrease number of trips or miles traveled - telecommuting, land use changes, trip elimination",
      "isLeaf": false
    },
    {
      "title": "Shift to other modes",
      "description": "Move travelers from cars to transit, bikes, walking - modal shift",
      "isLeaf": false
    },
    {
      "title": "Increase road capacity",
      "description": "Add lane-miles of roadway - new roads, wider roads, elevated highways",
      "isLeaf": false
    },
    {
      "title": "Optimize existing capacity",
      "description": "Use current roads more efficiently - traffic management, congestion pricing, smart signals",
      "isLeaf": false
    },
    {
      "title": "Shift timing",
      "description": "Spread demand across time - flexible work hours, off-peak incentives",
      "isLeaf": false
    }
  ]
}
```

### Step 3: Mark MECE

```
Tool: mark_mece
{
  "tileId": "<root-id>",
  "isMECE": true,
  "coverageNotes": "Exhaustive list of congestion strategies per transportation economics framework. Categories are mutually exclusive: each solution fits exactly one category based on its primary mechanism."
}
```

### Step 4: Split "Optimize existing capacity" by technology

```
Tool: split_tile
{
  "tileId": "<optimize-capacity-id>",
  "splitAttribute": "Primary technology/mechanism",
  "splitRationale": "Different technological approaches to optimization",
  "subsets": [
    {
      "title": "Adaptive traffic signals",
      "description": "AI-optimized signal timing based on real-time traffic flow",
      "isLeaf": true
    },
    {
      "title": "Congestion pricing",
      "description": "Variable tolls that increase with traffic density to manage demand",
      "isLeaf": true
    },
    {
      "title": "Autonomous vehicle platooning",
      "description": "Self-driving cars traveling in tight groups to increase effective capacity",
      "isLeaf": true
    },
    {
      "title": "Ramp metering",
      "description": "Controlled highway entrance to maintain optimal mainline flow",
      "isLeaf": true
    },
    {
      "title": "Dynamic lane assignment",
      "description": "Reversible lanes, shoulder use during peak periods",
      "isLeaf": true
    }
  ]
}
```

### Step 5: Realize missing category and add it

```
Tool: add_tiles_to_split
{
  "parentId": "<optimize-capacity-id>",
  "newTiles": [
    {
      "title": "Route optimization apps",
      "description": "Navigation systems that distribute traffic across network based on real-time conditions",
      "isLeaf": true
    }
  ]
}
```

Note: This invalidates MECE status, need to re-validate.

```
Tool: mark_mece
{
  "tileId": "<optimize-capacity-id>",
  "isMECE": true,
  "coverageNotes": "Now complete with route optimization included. Each approach uses distinct mechanism for optimization."
}
```

---

## Example 4: Discovering a Missing Category Mid-Exploration

This example shows how the method helps identify gaps in thinking.

**Problem**: Improve smartphone battery life by 3x

### Initial split - by approach type

```
Tool: split_tile
{
  "tileId": "<root-id>",
  "splitAttribute": "Approach type",
  "splitRationale": "Fundamental categories of battery improvement",
  "subsets": [
    {
      "title": "Increase battery capacity",
      "description": "More mAh in same volume - better chemistry, materials",
      "isLeaf": false
    },
    {
      "title": "Reduce power consumption",
      "description": "Make components more efficient - CPU, display, radio",
      "isLeaf": false
    }
  ]
}
```

### Try to validate MECE

```
Tool: mark_mece
{
  "tileId": "<root-id>",
  "isMECE": false,
  "coverageNotes": "INCOMPLETE - missing category for power delivery efficiency (voltage regulation losses, charging efficiency). Need to add."
}
```

### Add missing category

```
Tool: add_tiles_to_split
{
  "parentId": "<root-id>",
  "newTiles": [
    {
      "title": "Improve power delivery efficiency",
      "description": "Reduce losses in voltage regulation, charging circuits, power management",
      "isLeaf": false
    }
  ]
}
```

### Now validate

```
Tool: mark_mece
{
  "tileId": "<root-id>",
  "isMECE": true,
  "coverageNotes": "Now complete: (1) more energy stored, (2) less energy consumed, (3) less energy lost in delivery. These three categories are exhaustive and mutually exclusive."
}
```

**Key insight**: The MECE validation process forced us to think systematically and identify a category we initially overlooked!

---

## Example 5: Complex Multi-Level Exploration

**Problem**: Reduce healthcare costs by 30%

This demonstrates a deeper tree with multiple split levels.

### Level 1: Split by cost category

```
Tool: split_tile
{
  "tileId": "<root-id>",
  "splitAttribute": "Cost category",
  "splitRationale": "Healthcare spending is divided into distinct economic categories",
  "subsets": [
    {"title": "Prevention/Wellness", "description": "Costs before disease onset"},
    {"title": "Diagnosis", "description": "Identifying health conditions"},
    {"title": "Treatment", "description": "Curing or managing conditions"},
    {"title": "Administration", "description": "Insurance, billing, overhead"}
  ]
}
```

### Level 2: Split "Treatment" by intervention type

```
Tool: split_tile
{
  "tileId": "<treatment-id>",
  "splitAttribute": "Intervention type",
  "splitRationale": "Different medical intervention modalities",
  "subsets": [
    {"title": "Pharmaceuticals", "description": "Drug-based treatments"},
    {"title": "Surgery", "description": "Invasive procedures"},
    {"title": "Therapy", "description": "Physical, occupational, psychological therapy"},
    {"title": "Devices", "description": "Medical devices (pacemakers, prosthetics, etc.)"}
  ]
}
```

### Level 3: Split "Pharmaceuticals" by cost reduction mechanism

```
Tool: split_tile
{
  "tileId": "<pharmaceuticals-id>",
  "splitAttribute": "Cost reduction mechanism",
  "splitRationale": "Distinct approaches to reducing drug costs",
  "subsets": [
    {"title": "Generic adoption", "description": "Increase use of off-patent generics", "isLeaf": true},
    {"title": "Negotiation/regulation", "description": "Price controls, bulk purchasing", "isLeaf": true},
    {"title": "Manufacturing efficiency", "description": "Cheaper production processes", "isLeaf": true},
    {"title": "Drug efficacy improvement", "description": "Better drugs need shorter treatment", "isLeaf": true}
  ]
}
```

Now you can evaluate each leaf and work through other branches similarly.

---

## Example 6: Revisiting a Tree as Context Changes

**Scenario**: You created a tiling tree for "reduce building energy consumption" in 2020. It's now 2025 and heat pump technology has advanced significantly.

### Original evaluation (2020)

```
Tool: evaluate_tile
{
  "tileId": "<heat-pump-id>",
  "impact": 7,
  "feasibility": 5,
  "uniqueness": 6,
  "timeframe": "5-10 years",
  "notes": "Promising but high upfront cost limits adoption",
  "calculationsOrPilots": "ROI analysis shows 12-year payback period"
}
```

### Updated evaluation (2025)

```
Tool: evaluate_tile
{
  "tileId": "<heat-pump-id>",
  "impact": 8,
  "feasibility": 9,
  "uniqueness": 5,
  "timeframe": "1-2 years",
  "notes": "Technology matured, costs dropped 60%, policy incentives available",
  "calculationsOrPilots": "New ROI analysis shows 3-year payback with subsidies. Multiple successful deployments."
}
```

**Key lesson**: Revisit trees periodically. Technologies and contexts evolve, turning previously unviable branches into top solutions!

---

## Example 7: Using Validation to Catch and Fix Antipatterns

**Scenario**: You're building a tree for renewable energy solutions and make some common mistakes. The validation tools catch them.

### Initial problematic split

```
Tool: split_tile
{
  "tileId": "<root-id>",
  "splitAttribute": "Energy type",
  "splitRationale": "Different energy sources have different characteristics",
  "subsets": [
    {
      "title": "Solar power",
      "description": "Using sunlight to generate electricity",
      "isLeaf": false
    },
    {
      "title": "Wind power",
      "description": "Natural wind turning turbines",
      "isLeaf": false
    },
    {
      "title": "Advanced renewable technologies",
      "description": "Newer, innovative approaches to renewable energy",
      "isLeaf": false
    },
    {
      "title": "Other renewables",
      "description": "Miscellaneous other renewable energy sources",
      "isLeaf": false
    }
  ]
}
```

### Run validation

```
Tool: validate_split_quality
{
  "tileId": "<root-id>"
}
```

### Response reveals multiple issues:

```json
{
  "score": 40,
  "issues": [
    {
      "type": "vague_language",
      "severity": "warning",
      "message": "Tile 'Wind power' uses vague term 'natural' which may lack precision",
      "tileId": "<wind-tile-id>",
      "suggestion": "Replace 'natural' with measurable properties..."
    },
    {
      "type": "vague_language",
      "severity": "warning",
      "message": "Tile 'Advanced renewable technologies' uses vague term 'advanced'",
      "tileId": "<advanced-tile-id>",
      "suggestion": "Replace 'advanced' with measurable properties..."
    },
    {
      "type": "catch_all_bucket",
      "severity": "error",
      "message": "Tile 'Other renewables' appears to be a catch-all bucket",
      "tileId": "<other-tile-id>",
      "suggestion": "Replace with specific, well-defined categories..."
    }
  ],
  "recommendations": [
    "Address 1 critical issue(s) before proceeding",
    "Review 2 warning(s) to improve split quality",
    "Replace vague terms with measurable physical properties",
    "Replace catch-all categories with specific, splittable subsets"
  ]
}
```

### Fix the issues - revised split

```
Tool: split_tile
{
  "tileId": "<root-id>",
  "splitAttribute": "Primary energy conversion mechanism",
  "splitRationale": "Categorizing by the fundamental physical process that converts energy",
  "subsets": [
    {
      "title": "Photovoltaic conversion",
      "description": "Direct conversion of photons to electricity via semiconductor effect",
      "isLeaf": false
    },
    {
      "title": "Thermal conversion",
      "description": "Heat-based energy conversion (concentrated solar thermal, geothermal)",
      "isLeaf": false
    },
    {
      "title": "Kinetic energy harvesting",
      "description": "Converting motion to electricity - wind, hydroelectric, tidal, wave",
      "isLeaf": false
    },
    {
      "title": "Chemical/biochemical conversion",
      "description": "Energy from chemical reactions - biomass, biogas, algae",
      "isLeaf": false
    },
    {
      "title": "Gravitational potential",
      "description": "Using elevation differences - pumped hydro storage",
      "isLeaf": false
    }
  ]
}
```

### Validate again

```
Tool: validate_split_quality
{
  "tileId": "<root-id>"
}
```

### Much better result:

```json
{
  "score": 100,
  "issues": [],
  "recommendations": [
    "Split appears well-structured"
  ]
}
```

### Key improvements made:

1. **Removed vague language**: "Natural" → "motion-based"; "Advanced" → specific physical processes
2. **Eliminated catch-all bucket**: "Other renewables" → Complete MECE categories based on physics
3. **Used physics-based split**: Changed from solution types to energy conversion mechanisms
4. **Precise definitions**: Each category has clear physical meaning
5. **Complete coverage**: All renewable energy fits exactly one category

### Getting tree-wide validation

```
Tool: get_tree_validation_report
{
  "treeId": "<tree-id>"
}
```

Returns overall score and all split reports, helping identify weak spots across the entire tree.

---

## Tips from These Examples

1. **Start with clear problem statements** - Specific, measurable goals
2. **Use physics/economics/math-based splits** when possible - Natural MECE categories
3. **Validate splits immediately** - Use `validate_split_quality` after every split to catch antipatterns early
4. **Avoid vague language** - Replace "natural", "advanced", "traditional" with measurable properties
5. **Never use catch-all buckets** - "Other" categories prevent systematic exploration
6. **Document edge cases** - Record how boundary cases are classified
7. **Don't rush to leaves** - Explore breadth before depth
8. **Evaluate with data** - Use calculations and pilots, not just intuition
9. **Check tree-wide quality** - Use `get_tree_validation_report` to find weak spots
10. **Revisit periodically** - Context changes over time
