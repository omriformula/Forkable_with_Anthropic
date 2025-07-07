export interface FigmaConfig {
  pat: string;
  fileId: string;
  nodeId?: string;
}

export interface FigmaFileResponse {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  document: {
    id: string;
    name: string;
    type: string;
    children: any[];
  };
}

export interface FigmaImageResponse {
  err?: string;
  images: Record<string, string>;
  status?: number;
}

// NEW: Interfaces for bounds matching
export interface FigmaNodeBounds {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fills?: any[];
  strokes?: any[];
  effects?: any[];
  cornerRadius?: number;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  children?: FigmaNodeBounds[];
}

export interface ComponentBounds {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  element?: Element;
}

export interface NodeMatchResult {
  figmaNode: FigmaNodeBounds;
  componentBounds: ComponentBounds;
  matchScore: number;
  confidence: number;
  matchType: 'exact' | 'partial' | 'approximate';
  reasons: string[];
}

export interface BoundsMatchingResult {
  matches: NodeMatchResult[];
  unmatchedComponents: ComponentBounds[];
  unmatchedNodes: FigmaNodeBounds[];
  overallScore: number;
}

export class FigmaService {
  private baseUrl = 'https://api.figma.com/v1';

  private async makeRequest(endpoint: string, pat: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'X-Figma-Token': pat,
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getFile(config: FigmaConfig): Promise<FigmaFileResponse> {
    return this.makeRequest(`/files/${config.fileId}`, config.pat);
  }

  async getFileNodes(config: FigmaConfig, nodeIds: string[]): Promise<any> {
    const nodeIdsParam = nodeIds.join(',');
    return this.makeRequest(`/files/${config.fileId}/nodes?ids=${nodeIdsParam}`, config.pat);
  }

  async getImages(config: FigmaConfig, nodeIds: string[], format: 'png' | 'svg' | 'pdf' = 'png', scale: number = 2): Promise<FigmaImageResponse> {
    const nodeIdsParam = nodeIds.join(',');
    const endpoint = `/images/${config.fileId}?ids=${nodeIdsParam}&format=${format}&scale=${scale}`;
    return this.makeRequest(endpoint, config.pat);
  }

  async getFileScreenshot(config: FigmaConfig, scale: number = 2): Promise<string> {
    try {
      // First, get the file to find the root node or a frame
      const fileData = await this.getFile(config);
      
      // Get the document ID (root node)
      const rootNodeId = fileData.document.id;
      
      // If a specific node ID is provided, use it; otherwise use the root
      const nodeId = config.nodeId || rootNodeId;
      
      // Get the image URL for the node
      const imageResponse = await this.getImages(config, [nodeId], 'png', scale);
      
      if (imageResponse.err) {
        throw new Error(`Failed to get image: ${imageResponse.err}`);
      }
      
      const imageUrl = imageResponse.images[nodeId];
      if (!imageUrl) {
        throw new Error('No image URL returned from Figma API');
      }
      
      return imageUrl;
    } catch (error) {
      console.error('Error fetching Figma screenshot:', error);
      throw error;
    }
  }

  // Helper method to extract file ID from Figma URL
  static extractFileId(figmaUrl: string): string {
    // Handle different Figma URL formats:
    // https://www.figma.com/file/cbs1cphwdvmojfpjfzkodu/LoginScreen
    // https://www.figma.com/design/cbs1cphwdvmojfpjfzkodu/LoginScreen
    const match = figmaUrl.match(/\/(?:file|design)\/([a-zA-Z0-9]+)/);
    if (!match) {
      throw new Error('Invalid Figma URL format');
    }
    return match[1];
  }

  // Helper method to extract node ID from Figma URL (if present)
  static extractNodeId(figmaUrl: string): string | undefined {
    const match = figmaUrl.match(/node-id=([^&]+)/);
    if (!match) return undefined;
    
    // Convert from URL format (66-186) to API format (66:186)
    const nodeId = decodeURIComponent(match[1]);
    return nodeId.replace(/-/g, ':');
  }

  // NEW: Extract all nodes with bounds from a Figma file
  async extractAllNodesWithBounds(config: FigmaConfig): Promise<FigmaNodeBounds[]> {
    try {
      const fileData = await this.getFile(config);
      const allNodes: FigmaNodeBounds[] = [];
      
      // Recursively extract all nodes with bounds
      const extractNodes = (node: any, parentX = 0, parentY = 0): void => {
        if (!node) return;
        
        const bounds = node.absoluteBoundingBox || {};
        const nodeWithBounds: FigmaNodeBounds = {
          id: node.id,
          name: node.name || 'Unnamed',
          type: node.type,
          x: bounds.x || 0,
          y: bounds.y || 0,
          width: bounds.width || 0,
          height: bounds.height || 0,
          fills: node.fills,
          strokes: node.strokes,
          effects: node.effects,
          cornerRadius: node.cornerRadius,
          absoluteBoundingBox: bounds,
          children: []
        };
        
        // Only include nodes that have meaningful bounds (not tiny or zero-sized)
        if (nodeWithBounds.width > 20 && nodeWithBounds.height > 20) {
          allNodes.push(nodeWithBounds);
        }
        
        // Recursively process children
        if (node.children && Array.isArray(node.children)) {
          node.children.forEach((child: any) => {
            extractNodes(child, bounds.x || 0, bounds.y || 0);
          });
        }
      };
      
      // Start extraction from document root
      extractNodes(fileData.document);
      
      console.log(`🔍 Extracted ${allNodes.length} nodes with bounds from Figma file`);
      return allNodes;
    } catch (error) {
      console.error('Error extracting nodes with bounds:', error);
      throw error;
    }
  }

  // NEW: Match React component bounds to Figma node bounds
  async matchComponentsToNodes(
    componentBounds: ComponentBounds[],
    figmaNodes: FigmaNodeBounds[]
  ): Promise<BoundsMatchingResult> {
    const matches: NodeMatchResult[] = [];
    const unmatchedComponents: ComponentBounds[] = [];
    const unmatchedNodes: FigmaNodeBounds[] = [...figmaNodes];
    
    for (const component of componentBounds) {
      let bestMatch: NodeMatchResult | null = null;
      let bestMatchIndex = -1;
      
      for (let i = 0; i < unmatchedNodes.length; i++) {
        const node = unmatchedNodes[i];
        const matchResult = this.calculateNodeMatch(component, node);
        
        if (matchResult.matchScore > 0.3 && (!bestMatch || matchResult.matchScore > bestMatch.matchScore)) {
          bestMatch = matchResult;
          bestMatchIndex = i;
        }
      }
      
      if (bestMatch) {
        matches.push(bestMatch);
        unmatchedNodes.splice(bestMatchIndex, 1);
      } else {
        unmatchedComponents.push(component);
      }
    }
    
    const overallScore = matches.length > 0 ? 
      matches.reduce((sum, match) => sum + match.matchScore, 0) / matches.length : 0;
    
    return {
      matches,
      unmatchedComponents,
      unmatchedNodes,
      overallScore
    };
  }

  // NEW: Calculate match score between component and Figma node
  private calculateNodeMatch(component: ComponentBounds, node: FigmaNodeBounds): NodeMatchResult {
    const reasons: string[] = [];
    let matchScore = 0;
    let confidence = 0;
    let matchType: 'exact' | 'partial' | 'approximate' = 'approximate';
    
    // Size similarity (0-40 points)
    const sizeScore = this.calculateSizeScore(component, node);
    matchScore += sizeScore;
    if (sizeScore > 30) reasons.push('Similar size');
    
    // Position similarity (0-20 points) - less important since layouts differ
    const positionScore = this.calculatePositionScore(component, node);
    matchScore += positionScore * 0.5; // Weight position less heavily
    if (positionScore > 15) reasons.push('Similar position');
    
    // Name similarity (0-20 points)
    const nameScore = this.calculateNameScore(component, node);
    matchScore += nameScore;
    if (nameScore > 10) reasons.push('Similar name');
    
    // Type/category similarity (0-20 points)
    const typeScore = this.calculateTypeScore(component, node);
    matchScore += typeScore;
    if (typeScore > 10) reasons.push('Similar type');
    
    // Determine match type and confidence
    if (matchScore > 80) {
      matchType = 'exact';
      confidence = 95;
    } else if (matchScore > 60) {
      matchType = 'partial';
      confidence = 80;
    } else if (matchScore > 30) {
      matchType = 'approximate';
      confidence = 60;
    } else {
      confidence = 30;
    }
    
    return {
      figmaNode: node,
      componentBounds: component,
      matchScore,
      confidence,
      matchType,
      reasons
    };
  }

  private calculateSizeScore(component: ComponentBounds, node: FigmaNodeBounds): number {
    const widthRatio = Math.min(component.width, node.width) / Math.max(component.width, node.width);
    const heightRatio = Math.min(component.height, node.height) / Math.max(component.height, node.height);
    const averageRatio = (widthRatio + heightRatio) / 2;
    return averageRatio * 40;
  }

  private calculatePositionScore(component: ComponentBounds, node: FigmaNodeBounds): number {
    // Since layouts can differ significantly, we use relative position
    const xDiff = Math.abs(component.x - node.x);
    const yDiff = Math.abs(component.y - node.y);
    const maxDiff = Math.max(xDiff, yDiff);
    const score = Math.max(0, 20 - (maxDiff / 50));
    return score;
  }

  private calculateNameScore(component: ComponentBounds, node: FigmaNodeBounds): number {
    const componentName = component.name.toLowerCase();
    const nodeName = node.name.toLowerCase();
    
    // Exact match
    if (componentName === nodeName) return 20;
    
    // Partial match
    if (componentName.includes(nodeName) || nodeName.includes(componentName)) return 15;
    
    // Keyword matching
    const componentKeywords = componentName.split(/[^a-z0-9]/);
    const nodeKeywords = nodeName.split(/[^a-z0-9]/);
    const matchCount = componentKeywords.filter(k => nodeKeywords.includes(k)).length;
    
    return Math.min(matchCount * 3, 10);
  }

  private calculateTypeScore(component: ComponentBounds, node: FigmaNodeBounds): number {
    const nodeType = node.type.toLowerCase();
    const componentName = component.name.toLowerCase();
    
    // Direct type matching
    if (componentName.includes('button') && nodeType === 'instance') return 20;
    if (componentName.includes('card') && nodeType === 'frame') return 15;
    if (componentName.includes('text') && nodeType === 'text') return 20;
    if (componentName.includes('image') && nodeType === 'rectangle') return 15;
    
    // Generic matching
    if (nodeType === 'frame' || nodeType === 'instance') return 10;
    
    return 5;
  }

  // NEW: Get individual node images for debugging
  async getNodeImages(config: FigmaConfig, nodeIds: string[]): Promise<Record<string, string>> {
    try {
      const imageResponse = await this.getImages(config, nodeIds, 'png', 1);
      
      if (imageResponse.err) {
        console.error('Error getting node images:', imageResponse.err);
        return {};
      }
      
      return imageResponse.images;
    } catch (error) {
      console.error('Error fetching node images:', error);
      return {};
    }
  }
}

export const figmaService = new FigmaService(); 