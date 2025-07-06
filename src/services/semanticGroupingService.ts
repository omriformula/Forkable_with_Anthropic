import { ComponentAnalysis, FigmaFile } from './figmaService';

export interface SemanticGroup {
  id: string;
  name: string;
  type: 'button' | 'text' | 'card' | 'navigation' | 'input' | 'list' | 'image' | 'container' | 'other';
  description: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  children: ComponentAnalysis[];
  properties: {
    interactive?: boolean;
    text?: string;
    hasIcon?: boolean;
    isCollection?: boolean;
    [key: string]: any;
  };
  confidence: number;
}

export interface LayoutStructure {
  screenType: string;
  mainSections: string[];
  userFlow: string;
}

export interface SemanticGroupingResult {
  layoutStructure?: LayoutStructure;
  groups: SemanticGroup[];
  totalNodes: number;
  groupedNodes: number;
  ungroupedNodes: ComponentAnalysis[];
  confidence: number;
  processingTime: number;
}

class SemanticGroupingService {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Analyze Figma structure and group related components semantically
   */
  async groupComponents(
    figmaFile: FigmaFile,
    figmaComponents: ComponentAnalysis[]
  ): Promise<SemanticGroupingResult> {
    const startTime = Date.now();
    
    try {
      console.log('Starting semantic grouping analysis...');
      
      // Create analysis prompt focused on structure
      const prompt = this.createGroupingPrompt(figmaFile, figmaComponents);
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a UI structure analyst specializing in semantic component grouping. Your job is to analyze Figma JSON hierarchy and group related nodes into logical UI components that developers would work with.

              Focus on:
              - Grouping related nodes (text + background = button)
              - Identifying interactive patterns
              - Recognizing collections of similar elements
              - Understanding component hierarchy and nesting

              Always respond with valid JSON matching the expected format.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 3000,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`Semantic grouping API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);
      
      const processingTime = Date.now() - startTime;
      
      return this.validateAndEnhanceResult(result, figmaComponents, processingTime);
      
    } catch (error) {
      console.error('Semantic grouping failed:', error);
      return this.createFallbackResult(figmaComponents, Date.now() - startTime);
    }
  }

  /**
   * Create comprehensive prompt for semantic grouping analysis
   */
  private createGroupingPrompt(figmaFile: FigmaFile, components: ComponentAnalysis[]): string {
    const structuralAnalysis = this.analyzeStructure(components);
    const textContent = this.extractTextContent(components);
    const spatialGroups = this.analyzeSpatialRelationships(components);
    const layoutAnalysis = this.analyzeLayoutStructure(components);
    const designContext = this.inferDesignContext(figmaFile, components);
    
    return `
You are analyzing the Figma file "${figmaFile.name}" to identify semantic UI components and their LAYOUT RELATIONSHIPS from ${components.length} technical nodes.

**DESIGN CONTEXT ANALYSIS:**
${designContext}

**LAYOUT STRUCTURE ANALYSIS:**
${layoutAnalysis}

**STRUCTURAL ANALYSIS:**
${structuralAnalysis}

**TEXT CONTENT FOUND:**
${textContent}

**SPATIAL GROUPINGS:**
${spatialGroups}

**DETAILED NODE HIERARCHY:**
${this.formatDetailedHierarchy(components)}

**YOUR ENHANCED TASK:**
Transform these ${components.length} technical Figma nodes into 5-12 logical UI components that represent the ACTUAL DESIGN STRUCTURE, not just isolated components.

**ENHANCED GROUPING STRATEGY:**

1. **LAYOUT HIERARCHY RECOGNITION:**
   - **TOP SECTION** (y < 200): Headers, navigation, back buttons
   - **MIDDLE SECTION** (200 ≤ y < 400): Main content, forms, interactive elements
   - **BOTTOM SECTION** (y ≥ 400): Action buttons, footers, summaries
   - **FULL-WIDTH ELEMENTS**: Likely main sections or containers

2. **VISUAL RELATIONSHIPS:**
   - Elements at similar Y positions = Horizontal groups (button rows)
   - Elements with similar spacing = Collections or lists
   - Nested containers = Component hierarchies
   - Background shapes + overlapping text = Composed buttons/cards

3. **DESIGN PATTERN RECOGNITION:**
   - **Interface Pattern**: Title → Content → Summary → Action button
   - **Modal Pattern**: Close button → Content → Actions
   - **Form Pattern**: Fields → Validation → Submit
   - **Navigation Pattern**: Back → Title → Menu

4. **SEMANTIC SECTIONING:**
   - Group by visual sections, not just individual components
   - Create container groups for related elements
   - Identify the main user flow and structure

**CRITICAL LAYOUT REQUIREMENTS:**
- **Section Grouping**: Group components into logical screen sections (header, content, footer)
- **Flow Understanding**: Understand the user journey through the interface
- **Visual Hierarchy**: Identify primary vs secondary elements
- **Responsive Structure**: Consider how the layout would work on different screen sizes

**EXPECTED ENHANCED RESPONSE FORMAT:**
{
  "layoutStructure": {
    "screenType": "form|navigation|dashboard|modal|list|detail",
    "mainSections": ["header", "content", "actions"],
    "userFlow": "navigate → interact → complete"
  },
  "groups": [
    {
      "id": "header-section",
      "name": "Header Section", 
      "type": "container",
      "description": "Top section containing navigation and title",
      "bounds": { "x": 0, "y": 0, "width": 375, "height": 100 },
      "children": ["nav-button-id", "title-text-id"],
      "properties": {
        "section": "header",
        "layout": "horizontal",
        "priority": "primary"
      },
      "confidence": 0.9
    },
    {
      "id": "main-content-section",
      "name": "Main Content Section",
      "type": "container", 
      "description": "Primary content area with interactive elements",
      "bounds": { "x": 24, "y": 120, "width": 327, "height": 200 },
      "children": ["content-title-id", "interactive-element-1", "interactive-element-2"],
      "properties": {
        "section": "main_content",
        "layout": "vertical",
        "interactive": true,
        "priority": "primary"
      },
      "confidence": 0.95
    },
    {
      "id": "info-display",
      "name": "Information Display",
      "type": "card", 
      "description": "Highlighted information or summary section",
      "bounds": { "x": 24, "y": 340, "width": 327, "height": 60 },
      "children": ["label-component-id", "value-component-id"],
      "properties": {
        "section": "summary",
        "layout": "horizontal_justified",
        "emphasis": "high",
        "priority": "secondary"
      },
      "confidence": 0.9
    },
    {
      "id": "action-area",
      "name": "Action Area",
      "type": "button",
      "description": "Primary action button or controls",
      "bounds": { "x": 24, "y": 420, "width": 327, "height": 48 },
      "children": ["primary-action-button-id"],
      "properties": {
        "section": "action_area",
        "interactive": true,
        "variant": "primary",
        "priority": "primary"
      },
      "confidence": 0.95
    }
  ],
  "confidence": 0.85
}

**CRITICAL REQUIREMENTS:**
- Each group represents either a LOGICAL UI SECTION or a COMPONENT within a section
- Include layoutStructure with screenType and mainSections
- Group spatially and semantically related elements
- Identify the overall design pattern and user flow
- Use section-aware naming (header-section, content-section, action-section, etc.)
- Provide layout properties (horizontal, vertical, grid, etc.)
- Assign priority levels (primary, secondary) for visual hierarchy
`;
  }

  /**
   * Comprehensive structural analysis of Figma components
   */
  private analyzeStructure(components: ComponentAnalysis[]): string {
    const typeCount = this.getTypeDistribution(components);
    const containerAnalysis = this.analyzeContainers(components);
    const interactionCandidates = this.findInteractionCandidates(components);
    
    return `
Node Type Distribution:
${Object.entries(typeCount).map(([type, count]) => `- ${type}: ${count} nodes`).join('\n')}

Container Structure:
- Frames: ${typeCount.FRAME || 0} (layout containers)
- Groups: ${typeCount.GROUP || 0} (logical groupings)
- Components: ${typeCount.COMPONENT || 0} (reusable elements)

Interactive Elements Found:
${interactionCandidates.slice(0, 10).map(c => `- ${c.type} "${c.name}" ${c.bounds.width}×${c.bounds.height}`).join('\n')}

Layout Patterns Detected:
${containerAnalysis}
`;
  }

  /**
   * Extract all text content for semantic understanding
   */
  private extractTextContent(components: ComponentAnalysis[]): string {
    const textNodes = components.filter(c => c.type === 'TEXT' && c.properties.characters);
    const textContent = textNodes.map(node => `"${node.properties.characters}"`).join(', ');
    
    if (textNodes.length === 0) {
      return "No text content found in design.";
    }
    
    return `
Found ${textNodes.length} text elements:
${textContent}

Text Analysis:
- Interactive text: ${this.identifyInteractiveText(textNodes)}
- Headers/Labels: ${this.identifyHeaders(textNodes)}
- Values/Data: ${this.identifyValues(textNodes)}
`;
  }

  /**
   * Analyze spatial relationships between components
   */
  private analyzeSpatialRelationships(components: ComponentAnalysis[]): string {
    const clusters = this.findSpatialClusters(components);
    const verticalGroups = this.findVerticalAlignments(components);
    const horizontalGroups = this.findHorizontalAlignments(components);
    
    return `
Spatial Clustering Analysis:
- Identified ${clusters.length} spatial clusters
- ${verticalGroups.length} vertical alignments detected  
- ${horizontalGroups.length} horizontal alignments detected

Key Spatial Patterns:
${clusters.slice(0, 5).map((cluster, i) => 
  `- Cluster ${i + 1}: ${cluster.length} elements grouped around (${cluster[0].bounds.x}, ${cluster[0].bounds.y})`
).join('\n')}
`;
  }

  /**
   * Format detailed hierarchy for analysis
   */
  private formatDetailedHierarchy(components: ComponentAnalysis[]): string {
    return components
      .slice(0, 50) // Limit for prompt size
      .map(comp => {
        const text = comp.properties.characters ? ` text:"${comp.properties.characters}"` : '';
        const size = `${comp.bounds.width}×${comp.bounds.height}`;
        const pos = `(${comp.bounds.x}, ${comp.bounds.y})`;
        return `- ${comp.type} "${comp.name}" ${size} at ${pos}${text}`;
      })
      .join('\n');
  }

  /**
   * Get distribution of component types
   */
  private getTypeDistribution(components: ComponentAnalysis[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    components.forEach(comp => {
      distribution[comp.type] = (distribution[comp.type] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Analyze container patterns and nesting
   */
  private analyzeContainers(components: ComponentAnalysis[]): string {
    const containers = components.filter(c => c.type === 'FRAME' || c.type === 'GROUP');
    const averageSize = containers.length > 0 
      ? containers.reduce((sum, c) => sum + (c.bounds.width * c.bounds.height), 0) / containers.length
      : 0;
    
    return `- Average container size: ${Math.round(averageSize)} px²
- Large containers (likely sections): ${containers.filter(c => c.bounds.width * c.bounds.height > averageSize * 2).length}
- Small containers (likely components): ${containers.filter(c => c.bounds.width * c.bounds.height < averageSize * 0.5).length}`;
  }

  /**
   * Identify interactive text elements
   */
  private identifyInteractiveText(textNodes: ComponentAnalysis[]): string {
    const interactive = textNodes.filter(node => {
      const text = node.properties.characters || '';
      // Identify interactive text by characteristics (short, actionable)
      return text.length < 25 && text.length > 3 && (
        text.includes('button') || 
        text.length < 15 || // Short text often interactive
        /^[A-Z]/.test(text) // Starts with capital (often buttons/labels)
      );
    });
    
    return interactive.length > 0 
      ? interactive.map(n => `"${n.properties.characters}"`).join(', ')
      : 'None identified';
  }

  /**
   * Identify header/label text elements
   */
  private identifyHeaders(textNodes: ComponentAnalysis[]): string {
    const headers = textNodes.filter(node => {
      const text = node.properties.characters || '';
      // Identify headers by length, position, or styling patterns
      return text.length < 30 && (
        node.bounds.y < 200 || // Likely at top
        text === text.toUpperCase() ||
        text.length < 15 // Short text often headers
      );
    });
    
    return headers.length > 0 
      ? headers.map(n => `"${n.properties.characters}"`).join(', ')
      : 'None identified';
  }

  /**
   * Identify value/data text elements
   */
  private identifyValues(textNodes: ComponentAnalysis[]): string {
    const values = textNodes.filter(node => {
      const text = node.properties.characters || '';
      // Look for monetary values, numbers, or short data
      return /^\$?\d+/.test(text) || /^\d+/.test(text);
    });
    
    return values.length > 0 
      ? values.map(n => `"${n.properties.characters}"`).join(', ')
      : 'None identified';
  }

  /**
   * Find spatial clusters of components
   */
  private findSpatialClusters(components: ComponentAnalysis[]): ComponentAnalysis[][] {
    const clusters: ComponentAnalysis[][] = [];
    const processed = new Set<string>();
    const threshold = 100; // pixels
    
    components.forEach(comp => {
      if (processed.has(comp.id)) return;
      
      const cluster = [comp];
      processed.add(comp.id);
      
      // Find nearby components
      components.forEach(other => {
        if (processed.has(other.id)) return;
        
        const distance = Math.sqrt(
          Math.pow(comp.bounds.x - other.bounds.x, 2) + 
          Math.pow(comp.bounds.y - other.bounds.y, 2)
        );
        
        if (distance < threshold) {
          cluster.push(other);
          processed.add(other.id);
        }
      });
      
      if (cluster.length > 1) {
        clusters.push(cluster);
      }
    });
    
    return clusters;
  }

  /**
   * Find vertically aligned components
   */
  private findVerticalAlignments(components: ComponentAnalysis[]): ComponentAnalysis[][] {
    const alignments: ComponentAnalysis[][] = [];
    const threshold = 10; // pixels tolerance
    
    // Group by similar Y positions
    const yGroups: Record<number, ComponentAnalysis[]> = {};
    
    components.forEach(comp => {
      const roundedY = Math.round(comp.bounds.y / threshold) * threshold;
      if (!yGroups[roundedY]) yGroups[roundedY] = [];
      yGroups[roundedY].push(comp);
    });
    
    Object.values(yGroups).forEach(group => {
      if (group.length > 1) {
        alignments.push(group.sort((a, b) => a.bounds.x - b.bounds.x));
      }
    });
    
    return alignments;
  }

  /**
   * Find horizontally aligned components
   */
  private findHorizontalAlignments(components: ComponentAnalysis[]): ComponentAnalysis[][] {
    const alignments: ComponentAnalysis[][] = [];
    const threshold = 10; // pixels tolerance
    
    // Group by similar X positions
    const xGroups: Record<number, ComponentAnalysis[]> = {};
    
    components.forEach(comp => {
      const roundedX = Math.round(comp.bounds.x / threshold) * threshold;
      if (!xGroups[roundedX]) xGroups[roundedX] = [];
      xGroups[roundedX].push(comp);
    });
    
    Object.values(xGroups).forEach(group => {
      if (group.length > 1) {
        alignments.push(group.sort((a, b) => a.bounds.y - b.bounds.y));
      }
    });
    
    return alignments;
  }

  /**
   * Find components that are likely interactive
   */
  private findInteractionCandidates(components: ComponentAnalysis[]): ComponentAnalysis[] {
    return components.filter(comp => {
      // Look for button-like patterns by name
      if (comp.name.toLowerCase().includes('button')) return true;
      
      // Look for clickable text (short text elements)
      if (comp.type === 'TEXT' && comp.bounds.height > 20 && 
          comp.properties.characters && comp.properties.characters.length < 25) return true;
      
      // Look for rectangular containers that might be buttons (button-sized)
      if (comp.type === 'RECTANGLE' && comp.bounds.width > 50 && comp.bounds.height > 30) return true;
      
      // Look for instances that might be interactive components
      if (comp.type === 'INSTANCE' && comp.bounds.width > 40 && comp.bounds.height > 25) return true;
      
      return false;
    });
  }

  /**
   * Format hierarchy for prompt
   */
  private formatHierarchy(components: ComponentAnalysis[]): string {
    return components
      .map(comp => `${comp.type} "${comp.name}" (${comp.bounds.width}×${comp.bounds.height}) at (${comp.bounds.x}, ${comp.bounds.y})`)
      .join('\n');
  }

  /**
   * Validate and enhance the grouping result
   */
  private validateAndEnhanceResult(
    result: any,
    originalComponents: ComponentAnalysis[],
    processingTime: number
  ): SemanticGroupingResult {
    const groups: SemanticGroup[] = (result.groups || []).map((group: any) => ({
      id: group.id || `group-${Math.random()}`,
      name: group.name || 'Unnamed Group',
      type: group.type || 'other',
      description: group.description || '',
      bounds: group.bounds || { x: 0, y: 0, width: 100, height: 50 },
      children: this.findChildrenByIds(group.children || [], originalComponents),
      properties: group.properties || {},
      confidence: Math.max(0.1, Math.min(1.0, group.confidence || 0.7))
    }));

    // If children are empty (common issue), auto-map components to groups
    const emptyGroups = groups.filter(g => g.children.length === 0);
    if (emptyGroups.length > 0) {
      console.log(`🔧 Auto-mapping components to ${emptyGroups.length} empty groups...`);
      this.autoMapComponentsToGroups(groups, originalComponents);
    }

    const groupedNodeIds = new Set(
      groups.flatMap(g => g.children.map(c => c.id))
    );
    
    const ungroupedNodes = originalComponents.filter(comp => !groupedNodeIds.has(comp.id));
    
    // Extract layout structure from result
    let layoutStructure: LayoutStructure | undefined;
    if (result.layoutStructure) {
      layoutStructure = {
        screenType: result.layoutStructure.screenType || 'general',
        mainSections: result.layoutStructure.mainSections || [],
        userFlow: result.layoutStructure.userFlow || 'User interacts with interface'
      };
    }
    
    return {
      layoutStructure,
      groups,
      totalNodes: originalComponents.length,
      groupedNodes: originalComponents.length - ungroupedNodes.length,
      ungroupedNodes,
      confidence: Math.max(0.1, Math.min(1.0, result.confidence || 0.7)),
      processingTime
    };
  }

  /**
   * Auto-map components to semantic groups based on content and position - GENERIC VERSION
   */
  private autoMapComponentsToGroups(groups: SemanticGroup[], components: ComponentAnalysis[]): void {
    const availableComponents = [...components];

    // Calculate dynamic layout properties for adaptive mapping
    const bounds = this.calculateOverallBounds(components);
    const verticalSections = this.identifyVerticalSections(components);
    
    // Create dynamic Y-section thresholds based on actual content
    const topThreshold = bounds.minY + (bounds.height * 0.25);
    const middleThreshold = bounds.minY + (bounds.height * 0.75);
    
    groups.forEach(group => {
      if (group.children.length > 0) return; // Skip groups that already have children

      const mappedComponents: ComponentAnalysis[] = [];
      
      // GENERIC MAPPING STRATEGY - works for any screen type
      const groupName = group.name.toLowerCase();
      const groupDescription = group.description.toLowerCase();
      const groupKeywords = [...groupName.split(' '), ...groupDescription.split(' ')];
      
      // Strategy 1: Map by semantic keywords in group name/description
      const keywordComponents = availableComponents.filter(comp => {
        const compText = (comp.properties.characters || '').toLowerCase();
        const compName = comp.name.toLowerCase();
        
        // Check if component text/name contains any group keywords
        return groupKeywords.some(keyword => {
          if (keyword.length < 3) return false; // Skip short words
          return compText.includes(keyword) || compName.includes(keyword);
        });
      });
      
      // Strategy 2: Map by position-based heuristics
      let positionComponents: ComponentAnalysis[] = [];
      
      if (groupName.includes('header') || groupName.includes('top') || groupName.includes('navigation')) {
        // Top section components
        positionComponents = availableComponents.filter(comp => comp.bounds.y < topThreshold);
      } else if (groupName.includes('footer') || groupName.includes('bottom') || groupName.includes('action')) {
        // Bottom section components  
        positionComponents = availableComponents.filter(comp => comp.bounds.y > middleThreshold);
      } else if (groupName.includes('content') || groupName.includes('main') || groupName.includes('body')) {
        // Middle section components
        positionComponents = availableComponents.filter(comp => 
          comp.bounds.y >= topThreshold && comp.bounds.y <= middleThreshold
        );
      } else if (groupName.includes('section')) {
        // For generic "section" groups, find spatially clustered components
        const sectionY = group.bounds?.y || 0;
        const tolerance = 100; // 100px tolerance
        positionComponents = availableComponents.filter(comp => 
          Math.abs(comp.bounds.y - sectionY) < tolerance
        );
      }
      
      // Strategy 3: Map by component type matching
      let typeComponents: ComponentAnalysis[] = [];
      
      if (group.type === 'button' || groupName.includes('button')) {
        typeComponents = availableComponents.filter(comp => 
          comp.type === 'INSTANCE' || comp.name.toLowerCase().includes('button') ||
          (comp.type === 'RECTANGLE' && comp.bounds.width > 100) // Wide rectangles likely buttons
        );
      } else if (group.type === 'text' || groupName.includes('text') || groupName.includes('label')) {
        typeComponents = availableComponents.filter(comp => comp.type === 'TEXT');
      } else if (group.type === 'container' || groupName.includes('container') || groupName.includes('card')) {
        typeComponents = availableComponents.filter(comp => 
          comp.type === 'FRAME' || comp.type === 'GROUP' || comp.type === 'RECTANGLE'
        );
      }
      
      // Strategy 4: Map by bounds proximity (for spatially defined groups)
      let proximityComponents: ComponentAnalysis[] = [];
      if (group.bounds && group.bounds.width > 0 && group.bounds.height > 0) {
        proximityComponents = availableComponents.filter(comp => {
          // Check if component overlaps or is near the group bounds
          const xOverlap = comp.bounds.x < group.bounds.x + group.bounds.width && 
                          comp.bounds.x + comp.bounds.width > group.bounds.x;
          const yOverlap = comp.bounds.y < group.bounds.y + group.bounds.height && 
                          comp.bounds.y + comp.bounds.height > group.bounds.y;
          
          // Also include components within reasonable distance
          const distance = Math.sqrt(
            Math.pow(comp.bounds.x - group.bounds.x, 2) + 
            Math.pow(comp.bounds.y - group.bounds.y, 2)
          );
          
          return xOverlap && yOverlap || distance < 150;
        });
      }
      
      // Combine all strategies and deduplicate
      const candidateComponents = [
        ...keywordComponents,
        ...positionComponents, 
        ...typeComponents,
        ...proximityComponents
      ];
      
      // Remove duplicates and prioritize by relevance
      const uniqueCandidates = candidateComponents.filter((comp, index, arr) => 
        arr.findIndex(c => c.id === comp.id) === index
      );
      
      // Score and select best matches
      const scoredCandidates = uniqueCandidates.map(comp => {
        let score = 0;
        
        // Keyword matching score
        if (keywordComponents.includes(comp)) score += 3;
        
        // Position matching score  
        if (positionComponents.includes(comp)) score += 2;
        
        // Type matching score
        if (typeComponents.includes(comp)) score += 2;
        
        // Proximity score
        if (proximityComponents.includes(comp)) score += 1;
        
        // Size relevance (prefer appropriately sized components)
        const sizeScore = comp.bounds.width > 20 && comp.bounds.height > 10 ? 1 : 0;
        score += sizeScore;
        
        return { component: comp, score };
      }).sort((a, b) => b.score - a.score);
      
      // Select top scoring components (limit to reasonable number)
      const maxComponents = groupName.includes('section') ? 8 : 
                           groupName.includes('button') ? 3 : 
                           groupName.includes('text') ? 5 : 4;
      
      mappedComponents.push(...scoredCandidates.slice(0, maxComponents).map(sc => sc.component));
      
      // Assign mapped components to group and remove from available
      group.children = mappedComponents;
      mappedComponents.forEach(comp => {
        const index = availableComponents.indexOf(comp);
        if (index > -1) availableComponents.splice(index, 1);
      });

      console.log(`📍 Mapped ${mappedComponents.length} components to "${group.name}" using generic strategies`);
    });

    console.log(`✅ Generic auto-mapping complete. ${availableComponents.length} components remain unmapped.`);
  }

  /**
   * Find child components by their IDs
   */
  private findChildrenByIds(childIds: string[], allComponents: ComponentAnalysis[]): ComponentAnalysis[] {
    return childIds
      .map(id => allComponents.find(comp => comp.id === id))
      .filter(comp => comp !== undefined) as ComponentAnalysis[];
  }

  /**
   * Create fallback result when AI analysis fails
   */
  private createFallbackResult(
    components: ComponentAnalysis[],
    processingTime: number
  ): SemanticGroupingResult {
    // Simple fallback: group by type and position
    const groups: SemanticGroup[] = [];
    const processed = new Set<string>();
    
    components.forEach(comp => {
      if (processed.has(comp.id)) return;
      
      // Create simple groups based on component type
      const group: SemanticGroup = {
        id: `fallback-${comp.id}`,
        name: comp.name || `${comp.type} Component`,
        type: this.mapTypeToSemantic(comp.type),
        description: `${comp.type} component`,
        bounds: comp.bounds,
        children: [comp],
        properties: {
          interactive: comp.type === 'BUTTON' || comp.name.toLowerCase().includes('button'),
          text: comp.properties.characters
        },
        confidence: 0.5
      };
      
      groups.push(group);
      processed.add(comp.id);
    });
    
    return {
      groups: groups.slice(0, 15), // Limit fallback groups
      totalNodes: components.length,
      groupedNodes: Math.min(15, components.length),
      ungroupedNodes: components.slice(15),
      confidence: 0.5,
      processingTime
    };
  }

  /**
   * Map Figma type to semantic type
   */
  private mapTypeToSemantic(figmaType: string): SemanticGroup['type'] {
    const typeMap: Record<string, SemanticGroup['type']> = {
      'TEXT': 'text',
      'RECTANGLE': 'container',
      'FRAME': 'container',
      'GROUP': 'container',
      'COMPONENT': 'other',
      'INSTANCE': 'other',
      'ELLIPSE': 'other'
    };
    
    return typeMap[figmaType] || 'other';
  }

  /**
   * Analyze the overall layout structure and visual hierarchy
   */
  private analyzeLayoutStructure(components: ComponentAnalysis[]): string {
    const bounds = this.calculateOverallBounds(components);
    const verticalSections = this.identifyVerticalSections(components);
    const layoutPatterns = this.identifyLayoutPatterns(components);
    
    return `
**OVERALL CANVAS:**
- Total bounds: ${bounds.width} × ${bounds.height}
- Y-axis range: ${bounds.minY} to ${bounds.maxY}

**VERTICAL SECTIONS IDENTIFIED:**
${verticalSections.map((section, i) => 
  `- Section ${i + 1} (y: ${section.startY}-${section.endY}): ${section.components.length} components
    Types: ${section.types.join(', ')}
    Key elements: ${section.keyElements.join(', ')}`
).join('\n')}

**LAYOUT PATTERNS:**
${layoutPatterns.join('\n')}

**SECTION ANALYSIS:**
- Header area (top 25%): ${components.filter(c => c.bounds.y < bounds.height * 0.25).length} components
- Main content (middle 50%): ${components.filter(c => c.bounds.y >= bounds.height * 0.25 && c.bounds.y < bounds.height * 0.75).length} components  
- Footer area (bottom 25%): ${components.filter(c => c.bounds.y >= bounds.height * 0.75).length} components
`;
  }

  /**
   * Infer the design context and purpose
   */
  private inferDesignContext(figmaFile: FigmaFile, components: ComponentAnalysis[]): string {
    const textNodes = components.filter(c => c.type === 'TEXT' && c.properties.characters);
    const textContent = textNodes.map(t => t.properties.characters).join(' ').toLowerCase();
    const allText = textNodes.map(t => t.properties.characters).join(' ');
    
    // Generic structural analysis instead of keyword matching
    const hasInteractiveElements = components.some(c => 
      c.name.toLowerCase().includes('button') || 
      c.type === 'BUTTON' ||
      (c.properties.characters && c.properties.characters.length < 20)
    );
    
    const hasFormElements = components.some(c => 
      c.name.toLowerCase().includes('input') ||
      c.name.toLowerCase().includes('field')
    );
    
    const hasNavigationElements = components.some(c =>
      c.name.toLowerCase().includes('back') ||
      c.name.toLowerCase().includes('close') ||
      c.name.toLowerCase().includes('menu')
    );

    return `
**DESIGN ANALYSIS:**
- File name: "${figmaFile.name}"
- Text content sample: "${allText.slice(0, 100)}${allText.length > 100 ? '...' : ''}"
- Component count: ${components.length}
- Interactive elements detected: ${hasInteractiveElements ? 'Yes' : 'No'}
- Form elements detected: ${hasFormElements ? 'Yes' : 'No'}  
- Navigation elements detected: ${hasNavigationElements ? 'Yes' : 'No'}

**DESIGN PURPOSE:** Generic interface with ${components.length} components requiring structural analysis based on actual layout and content, not predetermined patterns.

**EXPECTED USER FLOW:** User interacts with interface elements based on visual hierarchy and spatial relationships.

**UI PATTERN APPROACH:** Analyze spatial relationships and component types to determine appropriate groupings.
`;
  }

  /**
   * Calculate overall design bounds
   */
  private calculateOverallBounds(components: ComponentAnalysis[]) {
    const allX = components.map(c => c.bounds.x);
    const allY = components.map(c => c.bounds.y);
    const allRight = components.map(c => c.bounds.x + c.bounds.width);
    const allBottom = components.map(c => c.bounds.y + c.bounds.height);

    return {
      minX: Math.min(...allX),
      minY: Math.min(...allY),
      maxX: Math.max(...allRight),
      maxY: Math.max(...allBottom),
      width: Math.max(...allRight) - Math.min(...allX),
      height: Math.max(...allBottom) - Math.min(...allY)
    };
  }

  /**
   * Identify vertical sections in the design
   */
  private identifyVerticalSections(components: ComponentAnalysis[]): Array<{
    startY: number;
    endY: number;
    components: ComponentAnalysis[];
    types: string[];
    keyElements: string[];
  }> {
    const sortedByY = [...components].sort((a, b) => a.bounds.y - b.bounds.y);
    const sections: Array<{
      startY: number;
      endY: number;
      components: ComponentAnalysis[];
      types: string[];
      keyElements: string[];
    }> = [];
    let currentSection = { 
      startY: 0, 
      endY: 0, 
      components: [] as ComponentAnalysis[], 
      types: [] as string[], 
      keyElements: [] as string[] 
    };

    for (let i = 0; i < sortedByY.length; i++) {
      const component = sortedByY[i];
      const nextComponent = sortedByY[i + 1];

      if (!currentSection.components.length) {
        currentSection.startY = component.bounds.y;
      }

      currentSection.components.push(component);
      currentSection.types.push(component.type);
      
      if (component.properties.characters) {
        currentSection.keyElements.push(component.properties.characters);
      } else if (component.name) {
        currentSection.keyElements.push(component.name);
      }

      // Check if we should start a new section (significant Y gap)
      if (nextComponent && (nextComponent.bounds.y - (component.bounds.y + component.bounds.height) > 50)) {
        currentSection.endY = component.bounds.y + component.bounds.height;
        sections.push({ ...currentSection });
        currentSection = { 
          startY: 0, 
          endY: 0, 
          components: [] as ComponentAnalysis[], 
          types: [] as string[], 
          keyElements: [] as string[] 
        };
      } else if (!nextComponent) {
        currentSection.endY = component.bounds.y + component.bounds.height;
        sections.push({ ...currentSection });
      }
    }

    return sections;
  }

  /**
   * Identify common layout patterns
   */
  private identifyLayoutPatterns(components: ComponentAnalysis[]): string[] {
    const patterns = [];
    
    // Button grid pattern
    const buttons = components.filter(c => 
      c.name.toLowerCase().includes('button') ||
      c.type === 'BUTTON' ||
      (c.properties.characters && c.properties.characters.length < 20 && 
       c.bounds.width > 50 && c.bounds.height > 25) // Button-sized text elements
    );
    
    if (buttons.length >= 3) {
      patterns.push(`- Button grid detected: ${buttons.length} interactive elements`);
    }

    // Header pattern (top-aligned elements)
    const topElements = components.filter(c => c.bounds.y < 100);
    if (topElements.length > 0) {
      patterns.push(`- Header pattern: ${topElements.length} elements in top area`);
    }

    // Bottom action pattern
    const bottomElements = components.filter(c => {
      const totalHeight = Math.max(...components.map(comp => comp.bounds.y + comp.bounds.height));
      return c.bounds.y > totalHeight * 0.8;
    });
    
    if (bottomElements.length > 0) {
      patterns.push(`- Bottom action area: ${bottomElements.length} elements near bottom`);
    }

    // Horizontal alignment pattern
    const alignmentGroups = this.findHorizontalAlignments(components);
    if (alignmentGroups.length > 1) {
      patterns.push(`- Horizontal alignments: ${alignmentGroups.length} aligned groups detected`);
    }

    return patterns.length > 0 ? patterns : ['- No clear layout patterns detected'];
  }


}

export default SemanticGroupingService; 