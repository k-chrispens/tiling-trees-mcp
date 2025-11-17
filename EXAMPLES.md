# Tiling Trees MCP - Usage Examples

## Example 1: Literature Review Organization

### Scenario
You're conducting a literature review on neural network interpretability.

### Steps

1. **Create the main research question**
```
Tool: create_research_node
{
  "title": "How can we make neural networks more interpretable?",
  "content": "Survey existing approaches and identify promising directions for neural network interpretability research",
  "type": "question",
  "tags": ["interpretability", "neural-networks", "literature-review"]
}
```

2. **Add major approaches as sub-questions**
```
Tool: create_research_node
{
  "title": "Attention visualization methods",
  "content": "What techniques exist for visualizing attention patterns?",
  "parentId": "<main-question-id>",
  "type": "question",
  "tags": ["interpretability", "attention", "visualization"]
}

Tool: create_research_node
{
  "title": "Feature attribution techniques",
  "content": "How can we attribute model outputs to input features?",
  "parentId": "<main-question-id>",
  "type": "question",
  "tags": ["interpretability", "attribution", "explainability"]
}
```

3. **Document observations from papers**
```
Tool: create_research_node
{
  "title": "Grad-CAM shows spatial importance",
  "content": "Grad-CAM (Selvaraju et al., 2017) uses gradients to highlight important regions in images",
  "parentId": "<attribution-question-id>",
  "type": "observation",
  "tags": ["grad-cam", "computer-vision", "attribution"]
}
```

4. **Link related concepts**
```
Tool: link_research_nodes
{
  "sourceId": "<grad-cam-observation-id>",
  "targetId": "<attention-viz-id>",
  "relationshipType": "relates_to",
  "notes": "Both highlight spatial regions of importance"
}
```

5. **Find gaps in coverage**
```
Tool: get_research_insights
{
  "analysisType": "gaps"
}
```

## Example 2: Experimental Design

### Scenario
Planning experiments for a new machine learning model.

### Steps

1. **State the hypothesis**
```
Tool: create_research_node
{
  "title": "Hybrid attention improves efficiency",
  "content": "Combining local and global attention patterns will reduce computation while maintaining accuracy",
  "type": "hypothesis",
  "tags": ["efficiency", "attention", "architecture"]
}
```

2. **Design experimental methods**
```
Tool: create_research_node
{
  "title": "Benchmark on language modeling",
  "content": "Test hybrid attention on WikiText-103 and compare perplexity vs. FLOPs",
  "parentId": "<hypothesis-id>",
  "type": "method",
  "tags": ["benchmark", "language-modeling", "evaluation"]
}

Tool: create_research_node
{
  "title": "Ablation study on attention patterns",
  "content": "Systematically test different ratios of local to global attention",
  "parentId": "<hypothesis-id>",
  "type": "method",
  "tags": ["ablation", "attention", "evaluation"]
}
```

3. **Record results**
```
Tool: create_research_node
{
  "title": "25% reduction in FLOPs achieved",
  "content": "Hybrid attention with 80/20 local/global split reduced FLOPs by 25% with only 0.3% increase in perplexity",
  "parentId": "<benchmark-method-id>",
  "type": "result",
  "tags": ["results", "efficiency", "performance"]
}
```

4. **Extract insights**
```
Tool: create_research_node
{
  "title": "Local context is sufficient for most tokens",
  "content": "Analysis shows 80% of tokens benefit primarily from local context, suggesting sparse attention is viable",
  "parentId": "<result-id>",
  "type": "insight",
  "tags": ["insight", "attention", "analysis"]
}
```

5. **Update status as you progress**
```
Tool: update_research_node
{
  "nodeId": "<hypothesis-id>",
  "status": "completed"
}
```

## Example 3: Brainstorming and Ideation

### Scenario
Exploring new research directions in reinforcement learning.

### Steps

1. **Create a broad exploration area**
```
Tool: create_research_node
{
  "title": "Novel reward shaping approaches",
  "content": "Investigate alternative methods for reward design in sparse-reward environments",
  "type": "question",
  "tags": ["reinforcement-learning", "rewards", "exploration"]
}
```

2. **Rapidly add ideas**
```
Tool: create_research_node
{
  "title": "Curiosity-driven intrinsic rewards",
  "content": "Use prediction error as intrinsic motivation signal",
  "parentId": "<exploration-id>",
  "type": "hypothesis",
  "tags": ["intrinsic-motivation", "curiosity"]
}

Tool: create_research_node
{
  "title": "Hierarchical sub-goal generation",
  "content": "Learn to set intermediate goals automatically",
  "parentId": "<exploration-id>",
  "type": "hypothesis",
  "tags": ["hierarchical-rl", "sub-goals"]
}

Tool: create_research_node
{
  "title": "Inverse RL from demonstrations",
  "content": "Infer reward function from expert trajectories",
  "parentId": "<exploration-id>",
  "type": "hypothesis",
  "tags": ["inverse-rl", "imitation"]
}
```

3. **Identify relationships**
```
Tool: link_research_nodes
{
  "sourceId": "<curiosity-id>",
  "targetId": "<hierarchical-id>",
  "relationshipType": "extends",
  "notes": "Curiosity can help discover useful sub-goals"
}
```

4. **Find clusters of related work**
```
Tool: get_research_insights
{
  "analysisType": "clusters"
}
```

5. **Split complex ideas**
```
Tool: split_research_node
{
  "nodeId": "<curiosity-id>",
  "subNodes": [
    {
      "title": "Prediction-based curiosity",
      "content": "Measure prediction error in forward dynamics model",
      "type": "method"
    },
    {
      "title": "Count-based exploration",
      "content": "Track state visitation counts for bonus rewards",
      "type": "method"
    },
    {
      "title": "Random network distillation",
      "content": "Use random network predictions as novelty measure",
      "type": "method"
    }
  ]
}
```

## Example 4: Multi-Project Research Management

### Scenario
Managing multiple research projects with shared concepts.

### Steps

1. **Create separate trees for each project**
```
Tool: create_research_node
{
  "title": "Project A: Medical image segmentation",
  "content": "Develop models for accurate organ segmentation in CT scans",
  "type": "question",
  "tags": ["medical-imaging", "segmentation", "project-a"]
}

Tool: create_research_node
{
  "title": "Project B: Real-time video analysis",
  "content": "Efficient models for live video understanding",
  "type": "question",
  "tags": ["video-analysis", "real-time", "project-b"]
}
```

2. **Link shared techniques across projects**
```
Tool: link_research_nodes
{
  "sourceId": "<project-a-convnet-id>",
  "targetId": "<project-b-convnet-id>",
  "relationshipType": "relates_to",
  "notes": "Both projects use similar convolutional architectures"
}
```

3. **Search for shared concepts**
```
Tool: search_research_tree
{
  "tags": ["efficiency"]
}
```

4. **Analyze project progress**
```
Tool: get_research_insights
{
  "analysisType": "summary",
  "focusArea": "project-a"
}
```

## Example 5: Exporting for Collaboration

### Scenario
Sharing your research structure with collaborators.

### Steps

1. **Export as Markdown for documentation**
```
Tool: export_research_tree
{
  "format": "markdown",
  "nodeId": "<project-root-id>"
}
```

2. **Create Mermaid diagram for presentations**
```
Tool: export_research_tree
{
  "format": "mermaid",
  "nodeId": "<specific-section-id>"
}
```

3. **Export full data for archival**
```
Tool: export_research_tree
{
  "format": "json"
}
```

## Example 6: Daily Research Workflow

### Morning: Plan the day
```
# Check recent activity
Tool: get_research_insights
{ "analysisType": "summary" }

# Find what needs attention
Tool: search_research_tree
{ "tags": ["active"] }

# Identify gaps to fill today
Tool: get_research_insights
{ "analysisType": "gaps" }
```

### During the day: Capture ideas
```
# Quick capture of observations
Tool: create_research_node
{
  "title": "Model trains faster with warmup",
  "content": "Learning rate warmup for 1000 steps improved convergence",
  "type": "observation",
  "tags": ["training", "learning-rate"]
}

# Update progress
Tool: update_research_node
{
  "nodeId": "<experiment-id>",
  "status": "active"
}
```

### Evening: Review and organize
```
# Explore what you built today
Tool: explore_research_path
{
  "depth": 2,
  "includeLinks": true
}

# Find related work to read tomorrow
Tool: search_research_tree
{
  "query": "similar concepts"
}

# Get statistics
Tool: get_research_statistics
```

## Tips from the Examples

1. **Start broad, narrow down**: Begin with high-level questions and progressively add detail
2. **Use consistent tagging**: Makes searching and clustering more effective
3. **Link liberally**: Cross-references reveal unexpected connections
4. **Regular insights checks**: Identify gaps and patterns weekly
5. **Mix node types**: Use the full range (question → hypothesis → method → result → insight)
6. **Update status**: Keep track of what's active vs. completed
7. **Split when needed**: Don't let individual nodes become too complex
8. **Export often**: Share progress and visualize structure regularly
