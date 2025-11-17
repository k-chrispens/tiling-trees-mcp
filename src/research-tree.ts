import { randomUUID } from "crypto";

export type NodeType =
  | "question"
  | "hypothesis"
  | "observation"
  | "method"
  | "result"
  | "insight";

export type NodeStatus = "exploring" | "active" | "completed" | "archived";

export type RelationshipType =
  | "supports"
  | "contradicts"
  | "extends"
  | "relates_to"
  | "prerequisite";

export interface ResearchNode {
  id: string;
  title: string;
  content: string;
  type: NodeType;
  status: NodeStatus;
  tags: string[];
  parentId?: string;
  childrenIds: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

export interface NodeLink {
  id: string;
  sourceId: string;
  targetId: string;
  relationshipType: RelationshipType;
  notes?: string;
  createdAt: Date;
}

export class ResearchTreeManager {
  private nodes: Map<string, ResearchNode> = new Map();
  private links: Map<string, NodeLink> = new Map();

  createNode(
    title: string,
    content: string,
    parentId?: string,
    tags: string[] = [],
    type: NodeType = "question"
  ): ResearchNode {
    // Validate parent exists if provided
    if (parentId && !this.nodes.has(parentId)) {
      throw new Error(`Parent node ${parentId} not found`);
    }

    const node: ResearchNode = {
      id: randomUUID(),
      title,
      content,
      type,
      status: "exploring",
      tags,
      parentId,
      childrenIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    this.nodes.set(node.id, node);

    // Update parent's children
    if (parentId) {
      const parent = this.nodes.get(parentId)!;
      parent.childrenIds.push(node.id);
      parent.updatedAt = new Date();
    }

    return node;
  }

  splitNode(
    nodeId: string,
    subNodes: Array<{ title: string; content: string; type?: NodeType }>
  ): { originalNode: ResearchNode; createdNodes: ResearchNode[] } {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const createdNodes = subNodes.map((sub) =>
      this.createNode(
        sub.title,
        sub.content,
        nodeId,
        node.tags,
        sub.type || node.type
      )
    );

    node.updatedAt = new Date();

    return {
      originalNode: node,
      createdNodes,
    };
  }

  linkNodes(
    sourceId: string,
    targetId: string,
    relationshipType: RelationshipType,
    notes?: string
  ): NodeLink {
    if (!this.nodes.has(sourceId)) {
      throw new Error(`Source node ${sourceId} not found`);
    }
    if (!this.nodes.has(targetId)) {
      throw new Error(`Target node ${targetId} not found`);
    }

    const link: NodeLink = {
      id: randomUUID(),
      sourceId,
      targetId,
      relationshipType,
      notes,
      createdAt: new Date(),
    };

    this.links.set(link.id, link);
    return link;
  }

  explorePath(
    nodeId?: string,
    depth: number = 3,
    includeLinks: boolean = true
  ): any {
    if (!nodeId) {
      // Return all root nodes
      const roots = Array.from(this.nodes.values()).filter(
        (n) => !n.parentId
      );
      return {
        type: "roots",
        nodes: roots.map((root) => this.buildNodeTree(root, depth, includeLinks)),
      };
    }

    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    return this.buildNodeTree(node, depth, includeLinks);
  }

  private buildNodeTree(
    node: ResearchNode,
    depth: number,
    includeLinks: boolean
  ): any {
    const tree: any = {
      ...node,
      children: [],
    };

    if (depth > 0) {
      tree.children = node.childrenIds
        .map((childId) => {
          const child = this.nodes.get(childId);
          return child ? this.buildNodeTree(child, depth - 1, includeLinks) : null;
        })
        .filter((child) => child !== null);
    }

    if (includeLinks) {
      tree.outgoingLinks = Array.from(this.links.values())
        .filter((link) => link.sourceId === node.id)
        .map((link) => ({
          ...link,
          targetNode: this.nodes.get(link.targetId),
        }));

      tree.incomingLinks = Array.from(this.links.values())
        .filter((link) => link.targetId === node.id)
        .map((link) => ({
          ...link,
          sourceNode: this.nodes.get(link.sourceId),
        }));
    }

    return tree;
  }

  search(
    query?: string,
    tags?: string[],
    type?: string
  ): ResearchNode[] {
    let results = Array.from(this.nodes.values());

    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(
        (node) =>
          node.title.toLowerCase().includes(lowerQuery) ||
          node.content.toLowerCase().includes(lowerQuery)
      );
    }

    if (tags && tags.length > 0) {
      results = results.filter((node) =>
        tags.some((tag) => node.tags.includes(tag))
      );
    }

    if (type) {
      results = results.filter((node) => node.type === type);
    }

    return results;
  }

  getInsights(analysisType: string, focusArea?: string): any {
    switch (analysisType) {
      case "gaps":
        return this.findResearchGaps();
      case "clusters":
        return this.identifyClusters();
      case "paths":
        return this.analyzePaths(focusArea);
      case "summary":
        return this.generateSummary();
      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }
  }

  private findResearchGaps(): any {
    const allNodes = Array.from(this.nodes.values());

    // Find leaf nodes (potential areas to expand)
    const leafNodes = allNodes.filter(
      (node) => node.childrenIds.length === 0 && node.status !== "completed"
    );

    // Find questions without hypotheses
    const unansweredQuestions = allNodes.filter(
      (node) =>
        node.type === "question" &&
        !node.childrenIds.some((childId) => {
          const child = this.nodes.get(childId);
          return child && (child.type === "hypothesis" || child.type === "result");
        })
    );

    // Find hypotheses without methods
    const hypothesesWithoutMethods = allNodes.filter(
      (node) =>
        node.type === "hypothesis" &&
        !node.childrenIds.some((childId) => {
          const child = this.nodes.get(childId);
          return child && child.type === "method";
        })
    );

    return {
      leafNodes,
      unansweredQuestions,
      hypothesesWithoutMethods,
      summary: `Found ${leafNodes.length} unexpanded nodes, ${unansweredQuestions.length} unanswered questions, and ${hypothesesWithoutMethods.length} hypotheses without methods.`,
    };
  }

  private identifyClusters(): any {
    const tagClusters = new Map<string, ResearchNode[]>();
    const typeClusters = new Map<NodeType, ResearchNode[]>();

    for (const node of this.nodes.values()) {
      // Tag clusters
      for (const tag of node.tags) {
        if (!tagClusters.has(tag)) {
          tagClusters.set(tag, []);
        }
        tagClusters.get(tag)!.push(node);
      }

      // Type clusters
      if (!typeClusters.has(node.type)) {
        typeClusters.set(node.type, []);
      }
      typeClusters.get(node.type)!.push(node);
    }

    return {
      tagClusters: Object.fromEntries(
        Array.from(tagClusters.entries()).map(([tag, nodes]) => [
          tag,
          { count: nodes.length, nodes },
        ])
      ),
      typeClusters: Object.fromEntries(
        Array.from(typeClusters.entries()).map(([type, nodes]) => [
          type,
          { count: nodes.length, nodes },
        ])
      ),
    };
  }

  private analyzePaths(focusArea?: string): any {
    const roots = Array.from(this.nodes.values()).filter((n) => !n.parentId);
    const paths: any[] = [];

    for (const root of roots) {
      if (focusArea && !root.tags.includes(focusArea)) {
        continue;
      }
      this.collectPaths(root, [], paths);
    }

    // Find longest paths
    const sortedPaths = paths.sort((a, b) => b.length - a.length);
    const longestPaths = sortedPaths.slice(0, 5);

    // Find most connected nodes (based on links)
    const linkCounts = new Map<string, number>();
    for (const link of this.links.values()) {
      linkCounts.set(link.sourceId, (linkCounts.get(link.sourceId) || 0) + 1);
      linkCounts.set(link.targetId, (linkCounts.get(link.targetId) || 0) + 1);
    }

    const mostConnected = Array.from(linkCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nodeId, count]) => ({
        node: this.nodes.get(nodeId),
        linkCount: count,
      }));

    return {
      totalPaths: paths.length,
      longestPaths,
      mostConnectedNodes: mostConnected,
      averagePathLength:
        paths.reduce((sum, p) => sum + p.length, 0) / paths.length || 0,
    };
  }

  private collectPaths(
    node: ResearchNode,
    currentPath: string[],
    allPaths: any[]
  ): void {
    const newPath = [...currentPath, node.id];

    if (node.childrenIds.length === 0) {
      // Leaf node - complete path
      allPaths.push(newPath);
    } else {
      // Continue down each child
      for (const childId of node.childrenIds) {
        const child = this.nodes.get(childId);
        if (child) {
          this.collectPaths(child, newPath, allPaths);
        }
      }
    }
  }

  private generateSummary(): any {
    const allNodes = Array.from(this.nodes.values());
    const stats = this.getStatistics();

    const recentNodes = allNodes
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 10);

    return {
      statistics: stats,
      recentActivity: recentNodes,
      statusBreakdown: this.getStatusBreakdown(),
    };
  }

  private getStatusBreakdown(): Record<NodeStatus, number> {
    const breakdown: Record<NodeStatus, number> = {
      exploring: 0,
      active: 0,
      completed: 0,
      archived: 0,
    };

    for (const node of this.nodes.values()) {
      breakdown[node.status]++;
    }

    return breakdown;
  }

  updateNode(
    nodeId: string,
    updates: {
      title?: string;
      content?: string;
      tags?: string[];
      status?: NodeStatus;
    }
  ): ResearchNode {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    if (updates.title !== undefined) node.title = updates.title;
    if (updates.content !== undefined) node.content = updates.content;
    if (updates.tags !== undefined) node.tags = updates.tags;
    if (updates.status !== undefined) node.status = updates.status;

    node.updatedAt = new Date();

    return node;
  }

  export(format: string, nodeId?: string): string {
    const rootNode = nodeId ? this.nodes.get(nodeId) : undefined;

    if (nodeId && !rootNode) {
      throw new Error(`Node ${nodeId} not found`);
    }

    switch (format) {
      case "json":
        return this.exportJSON(rootNode);
      case "markdown":
        return this.exportMarkdown(rootNode);
      case "mermaid":
        return this.exportMermaid(rootNode);
      case "dot":
        return this.exportDOT(rootNode);
      default:
        throw new Error(`Unknown export format: ${format}`);
    }
  }

  private exportJSON(rootNode?: ResearchNode): string {
    if (rootNode) {
      return JSON.stringify(this.buildNodeTree(rootNode, Infinity, true), null, 2);
    }

    return JSON.stringify(
      {
        nodes: Array.from(this.nodes.values()),
        links: Array.from(this.links.values()),
      },
      null,
      2
    );
  }

  private exportMarkdown(rootNode?: ResearchNode): string {
    const nodes = rootNode
      ? this.getNodeAndDescendants(rootNode)
      : Array.from(this.nodes.values()).filter((n) => !n.parentId);

    let md = "# Research Tree\n\n";

    for (const node of nodes) {
      if (!node.parentId || rootNode) {
        md += this.nodeToMarkdown(node, 0);
      }
    }

    return md;
  }

  private nodeToMarkdown(node: ResearchNode, depth: number): string {
    const indent = "  ".repeat(depth);
    const prefix = "#".repeat(Math.min(depth + 2, 6));

    let md = `${indent}${prefix} ${node.title}\n\n`;
    md += `${indent}**Type**: ${node.type} | **Status**: ${node.status}\n`;
    if (node.tags.length > 0) {
      md += `${indent}**Tags**: ${node.tags.join(", ")}\n`;
    }
    md += `\n${indent}${node.content}\n\n`;

    // Add children
    for (const childId of node.childrenIds) {
      const child = this.nodes.get(childId);
      if (child) {
        md += this.nodeToMarkdown(child, depth + 1);
      }
    }

    return md;
  }

  private exportMermaid(rootNode?: ResearchNode): string {
    const nodes = rootNode
      ? this.getNodeAndDescendants(rootNode)
      : Array.from(this.nodes.values());

    let mermaid = "graph TD\n";

    // Add nodes
    for (const node of nodes) {
      const shape = this.getMermaidShape(node.type);
      const label = node.title.replace(/"/g, "'");
      mermaid += `    ${node.id.replace(/-/g, "")}${shape[0]}"${label}"${shape[1]}\n`;
    }

    // Add parent-child edges
    for (const node of nodes) {
      for (const childId of node.childrenIds) {
        if (nodes.some((n) => n.id === childId)) {
          mermaid += `    ${node.id.replace(/-/g, "")} --> ${childId.replace(/-/g, "")}\n`;
        }
      }
    }

    // Add links
    for (const link of this.links.values()) {
      if (
        nodes.some((n) => n.id === link.sourceId) &&
        nodes.some((n) => n.id === link.targetId)
      ) {
        const style = this.getMermaidLinkStyle(link.relationshipType);
        mermaid += `    ${link.sourceId.replace(/-/g, "")} ${style} ${link.targetId.replace(/-/g, "")}\n`;
      }
    }

    return mermaid;
  }

  private getMermaidShape(type: NodeType): [string, string] {
    switch (type) {
      case "question":
        return ["{", "}"];
      case "hypothesis":
        return ["[", "]"];
      case "method":
        return ["[[", "]]"];
      case "result":
        return ["[(", ")]"];
      case "observation":
        return ["([", "])"];
      case "insight":
        return ["{{", "}}"];
      default:
        return ["[", "]"];
    }
  }

  private getMermaidLinkStyle(type: RelationshipType): string {
    switch (type) {
      case "supports":
        return "-.->|supports|";
      case "contradicts":
        return "-.->|contradicts|";
      case "extends":
        return "==>|extends|";
      case "relates_to":
        return "-.-|relates|";
      case "prerequisite":
        return "==>|requires|";
      default:
        return "-->";
    }
  }

  private exportDOT(rootNode?: ResearchNode): string {
    const nodes = rootNode
      ? this.getNodeAndDescendants(rootNode)
      : Array.from(this.nodes.values());

    let dot = "digraph ResearchTree {\n";
    dot += "  node [shape=box, style=rounded];\n";

    // Add nodes
    for (const node of nodes) {
      const color = this.getDOTColor(node.type);
      const label = node.title.replace(/"/g, '\\"');
      dot += `  "${node.id}" [label="${label}", fillcolor="${color}", style="rounded,filled"];\n`;
    }

    // Add edges
    for (const node of nodes) {
      for (const childId of node.childrenIds) {
        if (nodes.some((n) => n.id === childId)) {
          dot += `  "${node.id}" -> "${childId}";\n`;
        }
      }
    }

    // Add links
    for (const link of this.links.values()) {
      if (
        nodes.some((n) => n.id === link.sourceId) &&
        nodes.some((n) => n.id === link.targetId)
      ) {
        const style = this.getDOTLinkStyle(link.relationshipType);
        dot += `  "${link.sourceId}" -> "${link.targetId}" [${style}];\n`;
      }
    }

    dot += "}\n";
    return dot;
  }

  private getDOTColor(type: NodeType): string {
    switch (type) {
      case "question":
        return "lightblue";
      case "hypothesis":
        return "lightgreen";
      case "method":
        return "lightyellow";
      case "result":
        return "lightcoral";
      case "observation":
        return "lavender";
      case "insight":
        return "lightgoldenrod";
      default:
        return "white";
    }
  }

  private getDOTLinkStyle(type: RelationshipType): string {
    switch (type) {
      case "supports":
        return 'style=dashed, color=green, label="supports"';
      case "contradicts":
        return 'style=dashed, color=red, label="contradicts"';
      case "extends":
        return 'style=bold, color=blue, label="extends"';
      case "relates_to":
        return 'style=dotted, label="relates"';
      case "prerequisite":
        return 'style=bold, label="requires"';
      default:
        return "";
    }
  }

  private getNodeAndDescendants(node: ResearchNode): ResearchNode[] {
    const result: ResearchNode[] = [node];

    for (const childId of node.childrenIds) {
      const child = this.nodes.get(childId);
      if (child) {
        result.push(...this.getNodeAndDescendants(child));
      }
    }

    return result;
  }

  getStatistics(): any {
    const allNodes = Array.from(this.nodes.values());
    const allLinks = Array.from(this.links.values());

    const roots = allNodes.filter((n) => !n.parentId);
    const leaves = allNodes.filter((n) => n.childrenIds.length === 0);

    // Calculate depth
    let maxDepth = 0;
    for (const root of roots) {
      const depth = this.calculateDepth(root);
      maxDepth = Math.max(maxDepth, depth);
    }

    return {
      totalNodes: allNodes.length,
      totalLinks: allLinks.length,
      rootNodes: roots.length,
      leafNodes: leaves.length,
      maxDepth,
      nodesByType: this.countByType(),
      nodesByStatus: this.getStatusBreakdown(),
      mostUsedTags: this.getMostUsedTags(5),
    };
  }

  private calculateDepth(node: ResearchNode, currentDepth: number = 0): number {
    if (node.childrenIds.length === 0) {
      return currentDepth;
    }

    let maxChildDepth = currentDepth;
    for (const childId of node.childrenIds) {
      const child = this.nodes.get(childId);
      if (child) {
        const childDepth = this.calculateDepth(child, currentDepth + 1);
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      }
    }

    return maxChildDepth;
  }

  private countByType(): Record<NodeType, number> {
    const counts: Record<NodeType, number> = {
      question: 0,
      hypothesis: 0,
      observation: 0,
      method: 0,
      result: 0,
      insight: 0,
    };

    for (const node of this.nodes.values()) {
      counts[node.type]++;
    }

    return counts;
  }

  private getMostUsedTags(limit: number): Array<{ tag: string; count: number }> {
    const tagCounts = new Map<string, number>();

    for (const node of this.nodes.values()) {
      for (const tag of node.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}
