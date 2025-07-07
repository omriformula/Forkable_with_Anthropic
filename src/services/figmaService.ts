export interface FigmaFile {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  document: FigmaNode;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  backgroundColor?: string;
  fills?: any[];
  strokes?: any[];
  effects?: any[];
  constraints?: any;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Add more properties as needed
  [key: string]: any;
}

export interface FigmaAnalysisResult {
  fileData: FigmaFile;
  imageUrl: string;
  components: ComponentAnalysis[];
}

export interface ComponentAnalysis {
  id: string;
  name: string;
  type: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  properties: Record<string, any>;
  // Enhanced styling properties
  styling?: {
    colors?: {
      background?: string;
      text?: string;
      border?: string;
    };
    typography?: {
      fontFamily?: string;
      fontSize?: number;
      fontWeight?: string;
      lineHeight?: string;
      textAlign?: string;
    };
    spacing?: {
      padding?: { top?: number; right?: number; bottom?: number; left?: number; };
      margin?: { top?: number; right?: number; bottom?: number; left?: number; };
    };
    borders?: {
      width?: number;
      style?: string;
      color?: string;
      radius?: number;
    };
    shadows?: string[];
    images?: {
      fills?: string[];
      exports?: string[];
    };
  };
}

export interface DesignTokens {
  colors: string[];
  typography: string[];
  spacing: number[];
  gradients: string[];
  fontFamilies: string[];
  fontSizes: number[];
  fontWeights: number[];
}

// NEW: Interfaces for bounds matching
export interface ComponentBounds {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  element?: Element;
}

export interface NodeMatchCandidate {
  figmaNode: ComponentAnalysis;
  componentBounds: ComponentBounds;
  matchScore: number;
  confidence: number;
  matchType: 'exact' | 'partial' | 'approximate';
  reasons: string[];
  textMatch?: boolean;
  colorMatch?: boolean;
  typeMatch?: boolean;
}

export interface ComponentMatchCandidates {
  componentBounds: ComponentBounds;
  candidates: NodeMatchCandidate[];
  confirmedMatch?: NodeMatchCandidate;
}

export interface BoundsMatchingResult {
  componentMatches: ComponentMatchCandidates[];
  unmatchedComponents: ComponentBounds[];
  unmatchedNodes: ComponentAnalysis[];
  overallConfidence: number;
}

class FigmaService {
  private baseUrl = 'https://api.figma.com/v1';
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest(endpoint: string): Promise<any> {
    console.log(`Making Figma API request to: ${this.baseUrl}${endpoint}`);
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'X-Figma-Token': this.accessToken,
      },
    });

    console.log(`Figma API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Figma API error response:', errorText);
      throw new Error(`Figma API error: ${response.status} ${response.statusText}. ${errorText}`);
    }

    const data = await response.json();
    console.log('Figma API response data keys:', Object.keys(data));
    return data;
  }

  /**
   * Extract file key from Figma URL or return file ID if already provided
   * URL format: https://www.figma.com/file/{file-key}/title
   * Or: https://www.figma.com/design/{file-key}/title
   * Or just the file ID: CbS1cPHwdvmOJfPJFzKodU
   */
  extractFileKey(figmaUrlOrId: string): string {
    // If it's already a file ID (no URL format), return it directly
    if (!figmaUrlOrId.includes('/') && figmaUrlOrId.length > 10) {
      return figmaUrlOrId;
    }
    
    // Handle both /file/ and /design/ URL formats
    const match = figmaUrlOrId.match(/\/(?:file|design)\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new Error('Invalid Figma URL or file ID format');
    }
    return match[1];
  }

  /**
   * Extract node ID from Figma URL (if present)
   * Converts from URL format (66-186) to API format (66:186)
   */
  extractNodeId(figmaUrl: string): string | undefined {
    const match = figmaUrl.match(/node-id=([^&]+)/);
    if (!match) return undefined;
    
    // Convert from URL format (66-186) to API format (66:186)
    const nodeId = decodeURIComponent(match[1]);
    return nodeId.replace(/-/g, ':');
  }

  /**
   * Fetch file data from Figma API
   * Based on: https://www.figma.com/developers/api#get-files-endpoint
   */
  async getFile(fileKey: string, nodeIds?: string[]): Promise<FigmaFile> {
    let endpoint = `/files/${fileKey}`;
    
    if (nodeIds && nodeIds.length > 0) {
      const params = new URLSearchParams({
        ids: nodeIds.join(',')
      });
      endpoint += `?${params}`;
    }

    const data = await this.makeRequest(endpoint);
    return data as FigmaFile;
  }

  /**
   * Get image exports from Figma
   * Based on: https://www.figma.com/developers/api#get-images-endpoint
   */
  async getImages(
    fileKey: string, 
    nodeIds: string[], 
    options: {
      format?: 'jpg' | 'png' | 'svg' | 'pdf';
      scale?: number;
      use_absolute_bounds?: boolean;
    } = {}
  ): Promise<{ [nodeId: string]: string }> {
    const params = new URLSearchParams({
      ids: nodeIds.join(','),
      format: options.format || 'png',
      scale: (options.scale || 2).toString(),
    });

    if (options.use_absolute_bounds) {
      params.set('use_absolute_bounds', 'true');
    }

    const endpoint = `/images/${fileKey}?${params}`;
    const data = await this.makeRequest(endpoint);
    
    return data.images;
  }

  /**
   * Analyze Figma file structure and extract meaningful components
   */
  analyzeFileStructure(figmaFile: FigmaFile): ComponentAnalysis[] {
    const components: ComponentAnalysis[] = [];

    const traverseNode = (node: FigmaNode, depth = 0) => {
      // Skip certain node types that aren't UI components
      if (['DOCUMENT', 'CANVAS', 'SLICE'].includes(node.type)) {
        if (node.children) {
          node.children.forEach(child => traverseNode(child, depth));
        }
        return;
      }

      // Extract component information
      if (node.absoluteBoundingBox) {
        const component: ComponentAnalysis = {
          id: node.id,
          name: node.name,
          type: node.type,
          bounds: {
            x: node.absoluteBoundingBox.x,
            y: node.absoluteBoundingBox.y,
            width: node.absoluteBoundingBox.width,
            height: node.absoluteBoundingBox.height,
          },
          properties: {
            visible: node.visible !== false,
            opacity: node.opacity || 1,
            backgroundColor: node.backgroundColor,
            fills: node.fills,
            strokes: node.strokes,
            effects: node.effects,
            cornerRadius: node.cornerRadius,
            // Add more properties as needed
            ...this.extractSpecificProperties(node)
          }
        };

        components.push(component);
      }

      // Recursively traverse children
      if (node.children) {
        node.children.forEach(child => traverseNode(child, depth + 1));
      }
    };

    if (figmaFile.document) {
      traverseNode(figmaFile.document);
    }

    return components;
  }

  /**
   * Extract type-specific properties from Figma nodes
   */
  private extractSpecificProperties(node: FigmaNode): Record<string, any> {
    const properties: Record<string, any> = {};

    // Enhanced styling extraction
    const styling: any = {};

    // Colors
    if (node.fills || node.strokes || node.backgroundColor) {
      styling.colors = {};
      
      if (node.backgroundColor && typeof node.backgroundColor === 'object' && 'r' in node.backgroundColor) {
        styling.colors.background = this.rgbToHex(
          (node.backgroundColor as any).r, 
          (node.backgroundColor as any).g, 
          (node.backgroundColor as any).b
        );
      }
      
      if (node.fills && node.fills.length > 0) {
        const fill = node.fills[0];
        if (fill.type === 'SOLID' && fill.color) {
          styling.colors.background = this.rgbToHex(fill.color.r, fill.color.g, fill.color.b);
        }
        if (fill.type === 'IMAGE') {
          styling.images = styling.images || {};
          styling.images.fills = styling.images.fills || [];
          styling.images.fills.push(fill.imageRef);
        }
      }
      
      if (node.strokes && node.strokes.length > 0) {
        const stroke = node.strokes[0];
        if (stroke.color) {
          styling.colors.border = this.rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
        }
      }
    }

    // Typography
    if (node.type === 'TEXT' && node.style) {
      styling.typography = {
        fontFamily: node.style.fontFamily,
        fontSize: node.style.fontSize,
        fontWeight: node.style.fontWeight,
        lineHeight: node.style.lineHeightPx ? `${node.style.lineHeightPx}px` : 'normal',
        textAlign: node.style.textAlignHorizontal?.toLowerCase() || 'left'
      };
      
      if (node.fills && node.fills[0]?.color) {
        styling.colors = styling.colors || {};
        styling.colors.text = this.rgbToHex(
          node.fills[0].color.r,
          node.fills[0].color.g,
          node.fills[0].color.b
        );
      }
    }

    // Spacing
    if (node.paddingLeft || node.paddingRight || node.paddingTop || node.paddingBottom) {
      styling.spacing = {
        padding: {
          top: node.paddingTop || 0,
          right: node.paddingRight || 0,
          bottom: node.paddingBottom || 0,
          left: node.paddingLeft || 0
        }
      };
    }

    // Borders
    if (node.cornerRadius || node.strokes) {
      styling.borders = {};
      if (node.cornerRadius) {
        styling.borders.radius = node.cornerRadius;
      }
      if (node.strokes && node.strokes.length > 0) {
        const stroke = node.strokes[0];
        styling.borders.width = stroke.strokeWeight || 1;
        styling.borders.style = 'solid';
      }
    }

    // Effects (shadows)
    if (node.effects && node.effects.length > 0) {
      styling.shadows = node.effects.map((effect: any) => {
        if (effect.type === 'DROP_SHADOW') {
          const color = effect.color ? 
            `rgba(${Math.round(effect.color.r * 255)}, ${Math.round(effect.color.g * 255)}, ${Math.round(effect.color.b * 255)}, ${effect.color.a})` 
            : 'rgba(0,0,0,0.1)';
          return `${effect.offset?.x || 0}px ${effect.offset?.y || 0}px ${effect.radius || 0}px ${color}`;
        }
        return null;
      }).filter(Boolean);
    }

    properties.styling = styling;

    // Original type-specific properties
    switch (node.type) {
      case 'TEXT':
        properties.characters = node.characters;
        properties.style = node.style;
        properties.characterStyleOverrides = node.characterStyleOverrides;
        break;
      
      case 'RECTANGLE':
      case 'ELLIPSE':
        properties.cornerRadius = node.cornerRadius;
        break;
      
      case 'FRAME':
      case 'GROUP':
        properties.clipsContent = node.clipsContent;
        properties.layoutMode = node.layoutMode;
        properties.paddingLeft = node.paddingLeft;
        properties.paddingRight = node.paddingRight;
        properties.paddingTop = node.paddingTop;
        properties.paddingBottom = node.paddingBottom;
        properties.itemSpacing = node.itemSpacing;
        break;

      case 'COMPONENT':
      case 'INSTANCE':
        properties.componentId = node.componentId;
        properties.componentProperties = node.componentProperties;
        break;
    }

    return properties;
  }

  /**
   * Get main artboard/frame nodes for image export
   */
  getMainFrames(figmaFile: FigmaFile): string[] {
    const frameIds: string[] = [];

    const traverseNode = (node: FigmaNode, depth = 0) => {
      // Look for FRAME nodes that could be screens/artboards
      if (node.type === 'FRAME' && node.absoluteBoundingBox) {
        // Filter out tiny frames (likely components) and internal frames
        const { width, height } = node.absoluteBoundingBox;
        const isLargeEnough = width > 200 && height > 200;
        const isNotInternalFrame = !node.name.startsWith('_') && !node.name.startsWith('.');
        
        if (isLargeEnough && isNotInternalFrame) {
          frameIds.push(node.id);
          console.log(`Found main frame: ${node.name} (${width}×${height})`);
        }
      }
      
      // Traverse all children, not just CANVAS children
      if (node.children) {
        node.children.forEach(child => traverseNode(child, depth + 1));
      }
    };

    if (figmaFile.document) {
      traverseNode(figmaFile.document);
    }
    
    // If no large frames found, get any frames as fallback
    if (frameIds.length === 0) {
      console.log('No large frames found, looking for any frames...');
      const fallbackTraverse = (node: FigmaNode) => {
        if (node.type === 'FRAME' && !node.name.startsWith('_')) {
          frameIds.push(node.id);
          console.log(`Found fallback frame: ${node.name}`);
        }
        if (node.children) {
          node.children.forEach(child => fallbackTraverse(child));
        }
      };
      fallbackTraverse(figmaFile.document);
    }

    console.log(`Total frames found: ${frameIds.length}`);
    return frameIds;
  }

  /**
   * Enhanced analysis with comprehensive styling data
   */
  async analyzeFileWithAssets(fileKey: string, nodeId?: string): Promise<FigmaAnalysisResult & { 
    designTokens: DesignTokens;
    assetUrls: { [nodeId: string]: string };
  }> {
    console.log('🎨 [FIGMA SERVICE] Starting enhanced analysis for fileKey:', fileKey);
    if (nodeId) {
      console.log('🎯 [FIGMA SERVICE] Specific node ID provided:', nodeId);
    }
    
    // Get file data
    const fileData = await this.getFile(fileKey);
    console.log('📄 [FIGMA SERVICE] File data fetched:', fileData.name);
    
    // Analyze components with enhanced styling
    const components = this.analyzeFileStructure(fileData);
    console.log('🔍 [FIGMA SERVICE] Components analyzed:', components.length);
    console.log('📋 [FIGMA SERVICE] Sample component styling:', components.slice(0, 3).map(c => ({
      name: c.name,
      type: c.type,
      styling: c.properties.styling
    })));
    
    // Extract design tokens (colors, typography, spacing)
    const designTokens = this.extractDesignTokens(fileData);
    console.log('🎨 [FIGMA SERVICE] Design tokens extracted:', designTokens);
    
    // Get target node for screenshot
    let targetNodeId = '';
    if (nodeId) {
      // Use specific node ID if provided
      targetNodeId = nodeId;
      console.log('🎯 [FIGMA SERVICE] Using specific node ID:', targetNodeId);
    } else {
      // Get main frames for screenshot
      const mainFrames = this.getMainFrames(fileData);
      console.log('🖼️ [FIGMA SERVICE] Main frames found:', mainFrames.length);
      if (mainFrames.length > 0) {
        targetNodeId = mainFrames[0];
      }
    }
    
    // Export screen image
    let imageUrl = '';
    if (targetNodeId) {
      const images = await this.getImages(fileKey, [targetNodeId], {
        format: 'png',
        scale: 2,
        use_absolute_bounds: true
      });
      imageUrl = Object.values(images)[0] || '';
      console.log('📸 [FIGMA SERVICE] Image URL obtained:', imageUrl ? '✅ Success' : '❌ Failed');
    }
    
    // Download all image assets
    const assetUrls = await this.downloadImageAssets(fileKey, components);
    console.log('🖼️ [FIGMA SERVICE] Asset URLs downloaded:', Object.keys(assetUrls).length);
    
    const result = {
      fileData,
      imageUrl,
      components,
      designTokens,
      assetUrls
    };
    
    console.log('✅ [FIGMA SERVICE] Enhanced analysis complete:', {
      components: result.components.length,
      designTokensColors: result.designTokens.colors.length,
      assetUrls: Object.keys(result.assetUrls).length
    });
    
    return result;
  }

  /**
   * Extract design tokens (colors, typography, spacing) from Figma file
   */
  private extractDesignTokens(figmaFile: FigmaFile): DesignTokens {
    const colors = new Set<string>();
    const typography = new Set<string>();
    const spacing = new Set<number>();
    
    // Enhanced extraction with gradients and better color detection
    const gradients = new Set<string>();
    const fontFamilies = new Set<string>();
    const fontSizes = new Set<number>();
    const fontWeights = new Set<number>();
    
    const traverseForTokens = (node: FigmaNode) => {
      // Enhanced color extraction from fills
      if (node.fills) {
        node.fills.forEach((fill: any) => {
          if (fill.type === 'SOLID' && fill.color) {
            const hex = this.rgbToHex(fill.color.r, fill.color.g, fill.color.b);
            colors.add(hex);
          } else if (fill.type === 'GRADIENT_LINEAR' && fill.gradientStops) {
            // Extract gradient colors and create CSS gradient
            const gradientColors = fill.gradientStops.map((stop: any) => {
              const color = this.rgbToHex(stop.color.r, stop.color.g, stop.color.b);
              colors.add(color); // Add individual colors too
              return `${color} ${Math.round(stop.position * 100)}%`;
            });
            
            // Calculate gradient angle from transform matrix
            const angle = this.calculateGradientAngle(fill.gradientTransform || [[1, 0, 0], [0, 1, 0]]);
            const gradientCss = `linear-gradient(${angle}deg, ${gradientColors.join(', ')})`;
            gradients.add(gradientCss);
          }
        });
      }
      
      // Enhanced color extraction from strokes
      if (node.strokes) {
        node.strokes.forEach((stroke: any) => {
          if (stroke.type === 'SOLID' && stroke.color) {
            const hex = this.rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
            colors.add(hex);
          }
        });
      }
      
      // Enhanced typography extraction from text nodes
      if (node.type === 'TEXT' && node.style) {
        const { fontFamily, fontWeight, fontSize } = node.style;
        
        if (fontFamily) fontFamilies.add(fontFamily);
        if (fontWeight) fontWeights.add(fontWeight);
        if (fontSize) fontSizes.add(fontSize);
        
        // Create detailed typography token
        typography.add(`${fontFamily || 'default'}-${fontWeight || 400}-${fontSize || 16}`);
      }
      
      // Enhanced spacing extraction with relative calculations
      const bounds = node.absoluteBoundingBox;
      if (bounds) {
        // Extract meaningful spacing values
        if (node.paddingLeft !== undefined) spacing.add(node.paddingLeft);
        if (node.paddingRight !== undefined) spacing.add(node.paddingRight);
        if (node.paddingTop !== undefined) spacing.add(node.paddingTop);
        if (node.paddingBottom !== undefined) spacing.add(node.paddingBottom);
        if (node.itemSpacing !== undefined) spacing.add(node.itemSpacing);
        
        // Calculate common spacing patterns from layout
        if (node.children && node.children.length > 1) {
          for (let i = 1; i < node.children.length; i++) {
            const prev = node.children[i - 1].absoluteBoundingBox;
            const curr = node.children[i].absoluteBoundingBox;
            if (prev && curr) {
              // Vertical spacing
              if (curr.y > prev.y + prev.height) {
                const gap = curr.y - (prev.y + prev.height);
                if (gap > 0 && gap < 100) spacing.add(gap);
              }
              // Horizontal spacing
              if (curr.x > prev.x + prev.width) {
                const gap = curr.x - (prev.x + prev.width);
                if (gap > 0 && gap < 100) spacing.add(gap);
              }
            }
          }
        }
      }
      
      if (node.children) {
        node.children.forEach(child => traverseForTokens(child));
      }
    };
    
    traverseForTokens(figmaFile.document);
    
    // Create enhanced design tokens
    const sortedSpacing = Array.from(spacing).sort((a, b) => a - b);
    const uniqueColors = Array.from(colors);
    const uniqueGradients = Array.from(gradients);
    
    return {
      colors: uniqueColors,
      typography: Array.from(typography),
      spacing: sortedSpacing,
      // Add enhanced tokens
      gradients: uniqueGradients,
      fontFamilies: Array.from(fontFamilies),
      fontSizes: Array.from(fontSizes).sort((a, b) => a - b),
      fontWeights: Array.from(fontWeights).sort((a, b) => a - b)
    };
  }

  /**
   * Calculate gradient angle from Figma transform matrix
   */
  private calculateGradientAngle(transform: number[][]): number {
    // Default to 135deg for diagonal gradients if transform is complex
    if (!transform || transform.length < 2) return 135;
    
    // Simple angle calculation for basic gradients
    const [[a, c], [b, d]] = transform;
    const angle = Math.atan2(b, a) * (180 / Math.PI);
    
    // Normalize to 0-360 and convert to CSS-friendly angles
    const normalizedAngle = ((angle + 360) % 360);
    
    // Common gradient angles used in UI design
    if (normalizedAngle < 22.5 || normalizedAngle > 337.5) return 0;   // horizontal
    if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) return 45;  // diagonal
    if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) return 90; // vertical
    if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) return 135; // diagonal
    if (normalizedAngle >= 157.5 && normalizedAngle < 202.5) return 180; // horizontal
    if (normalizedAngle >= 202.5 && normalizedAngle < 247.5) return 225; // diagonal
    if (normalizedAngle >= 247.5 && normalizedAngle < 292.5) return 270; // vertical
    if (normalizedAngle >= 292.5 && normalizedAngle < 337.5) return 315; // diagonal
    
    return 135; // Default diagonal
  }

  /**
   * Download image assets from components with image fills
   */
  private async downloadImageAssets(fileKey: string, components: ComponentAnalysis[]): Promise<{ [nodeId: string]: string }> {
    const imageNodeIds: string[] = [];
    const assetUrls: { [nodeId: string]: string } = {};
    
    // Find nodes with image fills
    components.forEach(component => {
      if (component.properties.fills) {
        const hasImageFill = component.properties.fills.some((fill: any) => 
          fill.type === 'IMAGE' || fill.type === 'SOLID' && fill.color
        );
        if (hasImageFill) {
          imageNodeIds.push(component.id);
        }
      }
    });
    
    // Download images for nodes with image content
    if (imageNodeIds.length > 0) {
      try {
        const images = await this.getImages(fileKey, imageNodeIds, {
          format: 'png',
          scale: 2
        });
        
        // Map node IDs to their image URLs
        Object.entries(images).forEach(([nodeId, imageUrl]) => {
          if (imageUrl) {
            assetUrls[nodeId] = imageUrl;
          }
        });
      } catch (error) {
        console.warn('Error downloading image assets:', error);
      }
    }
    
    return assetUrls;
  }

  /**
   * Convert RGB values to hex color
   */
  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
      const hex = Math.round(n * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  // NEW: Match React component bounds to Figma node bounds - return multiple candidates
  matchComponentsToNodes(
    componentBounds: ComponentBounds[],
    figmaComponents: ComponentAnalysis[]
  ): BoundsMatchingResult {
    const componentMatches: ComponentMatchCandidates[] = [];
    const unmatchedComponents: ComponentBounds[] = [];
    const unmatchedNodes: ComponentAnalysis[] = [...figmaComponents];
    
    for (const component of componentBounds) {
      const candidates: NodeMatchCandidate[] = [];
      
      // Get all potential matches for this component
      for (const node of figmaComponents) {
        const matchResult = this.calculateNodeMatch(component, node);
        
        // Only include candidates with some relevance (>20% confidence)
        if (matchResult.confidence > 20) {
          candidates.push(matchResult);
        }
      }
      
      // Sort candidates by confidence (best first)
      candidates.sort((a, b) => b.confidence - a.confidence);
      
      // Take top 3 candidates
      const topCandidates = candidates.slice(0, 3);
      
      if (topCandidates.length > 0) {
        componentMatches.push({
          componentBounds: component,
          candidates: topCandidates
        });
        
        // Remove the best match from unmatchedNodes to avoid duplicates
        const bestMatchIndex = unmatchedNodes.findIndex(n => n.id === topCandidates[0].figmaNode.id);
        if (bestMatchIndex > -1) {
          unmatchedNodes.splice(bestMatchIndex, 1);
        }
      } else {
        unmatchedComponents.push(component);
      }
    }
    
    // Calculate overall confidence as average of best candidates
    const overallConfidence = componentMatches.length > 0 ? 
      componentMatches.reduce((sum, match) => sum + match.candidates[0].confidence, 0) / componentMatches.length : 0;
    
    return {
      componentMatches,
      unmatchedComponents,
      unmatchedNodes,
      overallConfidence
    };
  }

  // NEW: Calculate match score between component and Figma node - enhanced with content matching
  private calculateNodeMatch(component: ComponentBounds, node: ComponentAnalysis): NodeMatchCandidate {
    const reasons: string[] = [];
    let matchScore = 0;
    let confidence = 0;
    let matchType: 'exact' | 'partial' | 'approximate' = 'approximate';
    
    // Text content matching (0-40 points) - most important now
    const textScore = this.calculateTextScore(component, node);
    matchScore += textScore;
    const textMatch = textScore > 20;
    if (textMatch) reasons.push('Similar text content');
    
    // Type/category similarity (0-30 points) - second most important
    const typeScore = this.calculateTypeScore(component, node);
    matchScore += typeScore;
    const typeMatch = typeScore > 15;
    if (typeMatch) reasons.push('Similar type');
    
    // Visual features (0-20 points) - shapes, colors, etc.
    const visualScore = this.calculateVisualScore(component, node);
    matchScore += visualScore;
    const colorMatch = visualScore > 10;
    if (colorMatch) reasons.push('Similar visual features');
    
    // Size similarity (0-10 points) - least important now
    const sizeScore = this.calculateSizeScore(component, node) * 0.25; // Much less weight
    matchScore += sizeScore;
    if (sizeScore > 5) reasons.push('Similar size');
    
    // Convert to confidence percentage
    confidence = Math.min(matchScore, 100);
    
    // Determine match type
    if (confidence > 80) {
      matchType = 'exact';
    } else if (confidence > 60) {
      matchType = 'partial';
    } else {
      matchType = 'approximate';
    }
    
    return {
      figmaNode: node,
      componentBounds: component,
      matchScore,
      confidence,
      matchType,
      reasons,
      textMatch,
      colorMatch,
      typeMatch
    };
  }

  // NEW: Calculate text content similarity
  private calculateTextScore(component: ComponentBounds, node: ComponentAnalysis): number {
    if (!component.element) return 0;
    
    const componentText = (component.element.textContent || '').toLowerCase().trim();
    const nodeText = (node.name || '').toLowerCase().trim();
    
    if (!componentText || !nodeText) return 0;
    
    // Exact match
    if (componentText === nodeText) return 40;
    
    // Partial match
    if (componentText.includes(nodeText) || nodeText.includes(componentText)) return 30;
    
    // Word matching
    const componentWords = componentText.split(/\s+/);
    const nodeWords = nodeText.split(/\s+/);
    const matchingWords = componentWords.filter(word => 
      nodeWords.some(nodeWord => word.includes(nodeWord) || nodeWord.includes(word))
    );
    
    if (matchingWords.length > 0) {
      return Math.min((matchingWords.length / componentWords.length) * 25, 25);
    }
    
    return 0;
  }

  // NEW: Calculate visual features similarity
  private calculateVisualScore(component: ComponentBounds, node: ComponentAnalysis): number {
    let score = 0;
    
    // Check for similar styling patterns
    if (component.element) {
      const style = window.getComputedStyle(component.element);
      
      // Border radius matching
      const borderRadius = parseFloat(style.borderRadius) || 0;
      if (borderRadius > 0 && node.properties.cornerRadius) {
        score += 5;
      }
      
      // Background color matching (basic detection)
      const bgColor = style.backgroundColor;
      if (bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        score += 5;
      }
      
      // Shadow detection
      const boxShadow = style.boxShadow;
      if (boxShadow !== 'none' && node.properties.effects) {
        score += 5;
      }
      
      // Border detection
      const border = style.border;
      if (border !== 'none' && node.properties.strokes) {
        score += 5;
      }
    }
    
    return score;
  }

  private calculateSizeScore(component: ComponentBounds, node: ComponentAnalysis): number {
    const widthRatio = Math.min(component.width, node.bounds.width) / Math.max(component.width, node.bounds.width);
    const heightRatio = Math.min(component.height, node.bounds.height) / Math.max(component.height, node.bounds.height);
    const averageRatio = (widthRatio + heightRatio) / 2;
    return averageRatio * 40;
  }

  private calculateTypeScore(component: ComponentBounds, node: ComponentAnalysis): number {
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
  async getNodeImages(fileKey: string, nodeIds: string[]): Promise<Record<string, string>> {
    try {
      const images = await this.getImages(fileKey, nodeIds, {
        format: 'png',
        scale: 1,
        use_absolute_bounds: true
      });
      
      return images;
    } catch (error) {
      console.error('Error fetching node images:', error);
      return {};
    }
  }
}

export default FigmaService; 