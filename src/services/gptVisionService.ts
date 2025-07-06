import { ComponentAnalysis, FigmaFile } from './figmaService';
import { SemanticGroup, SemanticGroupingResult } from './semanticGroupingService';

export interface GPTVisionAnalysis {
  components: IdentifiedComponent[];
  layout: LayoutAnalysis;
  designSystem: DesignSystemAnalysis;
  confidence: number;
  suggestions: string[];
}

export interface IdentifiedComponent {
  id: string;
  type: 'button' | 'input' | 'text' | 'image' | 'card' | 'header' | 'navigation' | 'form' | 'list' | 'modal' | 'other';
  name: string;
  description: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  properties: {
    text?: string;
    placeholder?: string;
    variant?: string;
    color?: string;
    size?: string;
    interactive?: boolean;
    [key: string]: any;
  };
  materialUIMapping: {
    component: string;
    props: Record<string, any>;
  };
  figmaNodeId?: string;
}

export interface LayoutAnalysis {
  structure: 'grid' | 'flexbox' | 'absolute' | 'mixed';
  responsive: boolean;
  breakpoints: string[];
  spacing: {
    consistent: boolean;
    units: number[];
  };
}

export interface DesignSystemAnalysis {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent?: string;
  };
  typography: {
    fontFamily: string;
    sizes: number[];
    weights: number[];
  };
  spacing: {
    baseUnit: number;
    scale: number[];
  };
  borderRadius: number[];
}

class GPTVisionService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Analyze Figma design using both JSON structure and visual image
   */
  async analyzeSemanticGroups(
    figmaFile: FigmaFile,
    imageUrl: string,
    semanticGrouping: SemanticGroupingResult
  ): Promise<GPTVisionAnalysis> {
    const prompt = this.createVisualAnalysisPrompt(figmaFile, semanticGrouping);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a UI/UX expert specializing in converting Figma designs to React components using Material-UI. 
              You analyze both the visual design and the structural JSON data to provide comprehensive component identification and mapping.
              
              Your task is to:
              1. Identify all UI components in the design
              2. Map them to appropriate Material-UI components
              3. Analyze the layout structure and design system
              4. Provide confidence scores and improvement suggestions
              
              Always respond with valid JSON matching the GPTVisionAnalysis interface.`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 4000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`GPT Vision API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Strip markdown code blocks if present
      const jsonContent = content.replace(/^```json\s*/g, '').replace(/\s*```$/g, '');
      console.log('Raw GPT response length:', content.length);
      console.log('Cleaned JSON length:', jsonContent.length);
      
      const analysis = JSON.parse(jsonContent);
      
      console.log('🎨 GPT Vision Analysis Results:');
      console.log('- Components identified:', analysis.components?.length || 0);
      console.log('- Layout structure:', analysis.layout?.structure || 'unknown');
      console.log('- Confidence score:', analysis.confidence || 'unknown');
      console.log('- Raw analysis:', analysis);
      
      // For now, return the raw analysis without complex validation
      // TODO: Implement proper validation later
      return {
        components: analysis.components || [],
        layout: analysis.layout || { structure: 'mixed', responsive: false, breakpoints: ['xs', 'sm', 'md', 'lg'], spacing: { consistent: false, units: [8, 16, 24] } },
        designSystem: analysis.designSystem || { colors: { primary: '#1976d2', secondary: '#dc004e', background: '#ffffff', text: '#333333' }, typography: { fontFamily: 'Roboto', sizes: [14, 16, 18, 24], weights: [400, 500, 700] }, spacing: { baseUnit: 8, scale: [8, 16, 24, 32] }, borderRadius: [4, 8, 12] },
        confidence: analysis.confidence || 0.7,
        suggestions: analysis.suggestions || ['GPT Vision analysis completed']
      };
    } catch (error) {
      console.error('GPT Vision analysis failed:', error);
      // Fallback to basic analysis
      return this.createFallbackAnalysis(semanticGrouping);
    }
  }

  /**
   * Create a visual analysis prompt for GPT Vision working with semantic groups
   */
  private createVisualAnalysisPrompt(figmaFile: FigmaFile, semanticGrouping: SemanticGroupingResult): string {
    return `
You are analyzing a visual design that has already been pre-processed into semantic component groups. 
Your task is to validate these groups against the actual visual design and enhance them with Material-UI mapping.

**Pre-Processing Results:**
- File: ${figmaFile.name}
- Semantic Groups Identified: ${semanticGrouping.groups.length}
- Structural Analysis Confidence: ${(semanticGrouping.confidence * 100).toFixed(0)}%
- Total Nodes Processed: ${semanticGrouping.totalNodes}

**Identified Semantic Groups:**
${this.formatSemanticGroups(semanticGrouping.groups)}

**Your Visual Validation Tasks:**

1. **Verify Groups**: Look at the visual design and confirm if the identified groups make sense
2. **Enhance Properties**: Add visual properties (colors, styles, states) that weren't captured structurally  
3. **Material-UI Mapping**: Map each validated group to the most appropriate Material-UI component
4. **Interactive States**: Identify visual states (selected, hover, disabled) for interactive elements
5. **Missing Elements**: Identify any interactive elements that were missed in structural analysis

**Response Format (JSON):**
{
  "components": [
    {
      "id": "back-button",
      "type": "button", 
      "name": "Back Button",
      "description": "Navigation button to return to previous screen",
      "bounds": { "x": 24, "y": 50, "width": 45, "height": 45 },
      "properties": {
        "interactive": true,
        "hasIcon": true,
        "variant": "text",
        "color": "default"
      },
      "materialUIMapping": {
        "component": "IconButton",
        "props": { "color": "default" }
      }
    }
  ],
  "layout": {
    "structure": "flexbox",
    "responsive": true,
    "spacing": { "consistent": true, "units": [8, 16, 24] }
  },
  "designSystem": {
    "colors": {
      "primary": "#FF7522",
      "secondary": "#1976d2",
      "background": "#ffffff",
      "text": "#333333"
    },
    "typography": {
      "fontFamily": "Sen",
      "sizes": [14, 16, 17, 30],
      "weights": [400, 700]
    },
    "spacing": { "baseUnit": 8, "scale": [8, 16, 24] },
    "borderRadius": [8, 10, 12, 20]
  },
  "confidence": 0.85,
  "suggestions": ["Visual enhancement suggestions"]
}

Focus on visual validation and enhancement, not re-identification.
`;
  }

  /**
   * Format semantic groups for the prompt
   */
  private formatSemanticGroups(groups: SemanticGroup[]): string {
    return groups
      .map(group => 
        `- ${group.type.toUpperCase()} "${group.name}" (${group.bounds.width}×${group.bounds.height}) at (${group.bounds.x}, ${group.bounds.y}) - ${group.description} [${group.children.length} nodes]`
      )
      .join('\n');
  }

  /**
   * Create a basic analysis (public method for temporary use)
   */
  async createBasicAnalysis(): Promise<GPTVisionAnalysis> {
    return {
      components: [
        {
          id: 'main-button',
          type: 'button',
          name: 'Main Button',
          description: 'Primary action button',
          bounds: { x: 0, y: 0, width: 200, height: 50 },
          properties: { interactive: true, variant: 'contained' },
          materialUIMapping: { component: 'Button', props: { variant: 'contained' } }
        }
      ],
      layout: {
        structure: 'flexbox',
        responsive: false,
        breakpoints: ['xs', 'sm', 'md', 'lg'],
        spacing: { consistent: true, units: [8, 16, 24] }
      },
      designSystem: {
        colors: { primary: '#1976d2', secondary: '#dc004e', background: '#ffffff', text: '#333333' },
        typography: { fontFamily: 'Roboto', sizes: [14, 16, 18, 24], weights: [400, 500, 700] },
        spacing: { baseUnit: 8, scale: [8, 16, 24, 32] },
        borderRadius: [4, 8, 12]
      },
      confidence: 0.7,
      suggestions: ['This is a basic analysis placeholder']
    };
  }

  /**
   * Validate and enhance the GPT analysis result
   */
  private validateAndEnhanceAnalysis(
    analysis: any, 
    semanticGrouping: SemanticGroupingResult
  ): GPTVisionAnalysis {
    // Ensure all required fields exist
    const enhancedAnalysis: GPTVisionAnalysis = {
      components: analysis.components || [],
      layout: analysis.layout || {
        structure: 'mixed',
        responsive: false,
        breakpoints: ['xs', 'sm', 'md', 'lg'],
        spacing: { consistent: false, units: [8, 16, 24] }
      },
      designSystem: analysis.designSystem || this.extractBasicDesignSystemFromGroups(semanticGrouping),
      confidence: Math.max(0.1, Math.min(1.0, analysis.confidence || 0.7)),
      suggestions: analysis.suggestions || []
    };

    // Enhance components with validation and semantic group cross-referencing
    enhancedAnalysis.components = this.enhanceIdentifiedComponentsFromGroups(
      enhancedAnalysis.components, 
      semanticGrouping
    );

    // Add quality validation suggestions
    enhancedAnalysis.suggestions.push(...this.generateQualityInsights(enhancedAnalysis));

    return enhancedAnalysis;
  }

  /**
   * Enhance identified components with semantic group data and validation
   */
  private enhanceIdentifiedComponentsFromGroups(
    components: IdentifiedComponent[], 
    semanticGrouping: SemanticGroupingResult
  ): IdentifiedComponent[] {
    return components.map(comp => {
      // Find matching semantic group
      const groupMatch = semanticGrouping.groups.find(group => 
        group.id === comp.id || 
        this.isPositionMatch(comp.bounds, group.bounds) ||
        this.isSemanticMatchWithGroup(comp, group)
      );
      
      if (groupMatch) {
        // Enhance with semantic group properties
        comp.properties = {
          ...comp.properties,
          ...groupMatch.properties,
          confidence: groupMatch.confidence
        };

        // Add Figma node references
        if (groupMatch.children.length > 0) {
          comp.figmaNodeId = groupMatch.children[0].id;
        }
      }

      // Validate component properties
      comp = this.validateComponentProperties(comp);
      
      return comp;
    });
  }

  /**
   * Check if component matches semantic group
   */
  private isSemanticMatchWithGroup(component: IdentifiedComponent, group: SemanticGroup): boolean {
    // Check if the component name relates to the group
    if (component.name.toLowerCase().includes(group.name.toLowerCase()) ||
        group.name.toLowerCase().includes(component.name.toLowerCase())) {
      return true;
    }
    
    // Check if component type matches
    if (component.type === group.type) {
      // Check position proximity (within 50px)
      const distance = Math.sqrt(
        Math.pow(component.bounds.x - group.bounds.x, 2) + 
        Math.pow(component.bounds.y - group.bounds.y, 2)
      );
      
      return distance < 50;
    }
    
    return false;
  }

  /**
   * Extract basic design system from semantic groups
   */
  private extractBasicDesignSystemFromGroups(semanticGrouping: SemanticGroupingResult): DesignSystemAnalysis {
    // Extract colors from semantic groups
    const colors = this.extractColorPaletteFromGroups(semanticGrouping.groups);
    const typography = this.extractTypographyFromGroups(semanticGrouping.groups);
    const spacing = this.extractSpacingFromGroups(semanticGrouping.groups);
    const borderRadius = this.extractBorderRadiusFromGroups(semanticGrouping.groups);

    return {
      colors: {
        primary: colors[0] || '#1976d2',
        secondary: colors[1] || '#dc004e',
        background: '#ffffff',
        text: '#333333',
        accent: colors[2]
      },
      typography: {
        fontFamily: typography.fontFamily || 'Roboto',
        sizes: typography.sizes,
        weights: typography.weights
      },
      spacing: {
        baseUnit: spacing.baseUnit,
        scale: spacing.scale
      },
      borderRadius: borderRadius
    };
  }

  private extractColorPaletteFromGroups(groups: SemanticGroup[]): string[] {
    const colors = new Set<string>();
    
    groups.forEach(group => {
      // Extract colors from group children
      group.children.forEach(child => {
        if (child.properties.fills) {
          const color = this.extractColor(child.properties.fills);
          if (color !== '#000000') {
            colors.add(color);
          }
        }
      });
    });
    
    return Array.from(colors).slice(0, 5);
  }

  private extractTypographyFromGroups(groups: SemanticGroup[]): { fontFamily: string; sizes: number[]; weights: number[] } {
    const sizes = new Set<number>();
    const weights = new Set<number>();
    let fontFamily = 'Roboto';

    groups.forEach(group => {
      group.children.forEach(child => {
        if (child.type === 'TEXT' && child.properties.style) {
          const style = child.properties.style;
          if (style.fontSize) sizes.add(style.fontSize);
          if (style.fontWeight) weights.add(style.fontWeight);
          if (style.fontFamily) fontFamily = style.fontFamily;
        }
      });
    });

    return {
      fontFamily,
      sizes: Array.from(sizes).sort((a, b) => a - b) || [12, 14, 16, 18, 24],
      weights: Array.from(weights).sort((a, b) => a - b) || [400, 500, 700]
    };
  }

  private extractSpacingFromGroups(groups: SemanticGroup[]): { baseUnit: number; scale: number[] } {
    const spacings = new Set<number>();
    
    groups.forEach(group => {
      Object.values(group.bounds).forEach(value => {
        if (typeof value === 'number' && value > 0 && value < 100) {
          spacings.add(value);
        }
      });
    });

    const sortedSpacings = Array.from(spacings).sort((a, b) => a - b);
    const baseUnit = sortedSpacings[0] || 8;
    
    return {
      baseUnit,
      scale: sortedSpacings.slice(0, 8) || [8, 16, 24, 32]
    };
  }

  private extractBorderRadiusFromGroups(groups: SemanticGroup[]): number[] {
    const radii = new Set<number>();
    
    groups.forEach(group => {
      group.children.forEach(child => {
        if (child.properties.cornerRadius) {
          radii.add(child.properties.cornerRadius);
        }
      });
    });
    
    return Array.from(radii).sort((a, b) => a - b) || [4, 8, 16];
  }

  /**
   * Create fallback analysis when GPT Vision fails
   */
  private createFallbackAnalysis(semanticGrouping: SemanticGroupingResult): GPTVisionAnalysis {
    const components: IdentifiedComponent[] = semanticGrouping.groups.map(group => ({
      id: group.id,
      type: this.mapSemanticTypeToComponentType(group.type),
      name: group.name,
      description: group.description,
      bounds: group.bounds,
      properties: {
        interactive: group.properties.interactive || false,
        ...group.properties
      },
      materialUIMapping: this.getFallbackMaterialUIMappingForGroup(group.type),
      figmaNodeId: group.children[0]?.id
    }));

    return {
      components,
      layout: {
        structure: 'mixed',
        responsive: false,
        breakpoints: ['xs', 'sm', 'md', 'lg'],
        spacing: { consistent: false, units: [8, 16, 24] }
      },
      designSystem: this.extractBasicDesignSystemFromGroups(semanticGrouping),
      confidence: Math.max(0.6, semanticGrouping.confidence),
      suggestions: ['Consider using GPT Vision for more accurate visual analysis']
    };
  }

  private getFallbackMaterialUIMappingForGroup(groupType: string): IdentifiedComponent['materialUIMapping'] {
    const mappings: Record<string, IdentifiedComponent['materialUIMapping']> = {
      'button': { component: 'Button', props: { variant: 'contained' } },
      'text': { component: 'Typography', props: { variant: 'body1' } },
      'card': { component: 'Card', props: {} },
      'navigation': { component: 'AppBar', props: {} },
      'input': { component: 'TextField', props: {} },
      'list': { component: 'List', props: {} },
      'image': { component: 'Avatar', props: {} },
      'container': { component: 'Box', props: {} },
    };
    
    return mappings[groupType] || { component: 'Box', props: {} };
  }

  /**
   * Generate quality insights for the analysis
   */
  private generateQualityInsights(analysis: GPTVisionAnalysis): string[] {
    const insights: string[] = [];
    
    if (analysis.components.length === 0) {
      insights.push('No components identified - consider reviewing the design structure');
    }
    
    if (analysis.confidence < 0.7) {
      insights.push('Low confidence analysis - manual review recommended');
    }
    
    const buttonCount = analysis.components.filter(c => c.type === 'button').length;
    if (buttonCount === 0) {
      insights.push('No interactive buttons detected - verify user actions are properly designed');
    }
    
    return insights;
  }

  /**
   * Check if two bounds are positionally similar
   */
  private isPositionMatch(bounds1: any, bounds2: any): boolean {
    const threshold = 20; // pixels
    return Math.abs(bounds1.x - bounds2.x) < threshold && 
           Math.abs(bounds1.y - bounds2.y) < threshold;
  }

  /**
   * Validate and clean component properties
   */
  private validateComponentProperties(component: IdentifiedComponent): IdentifiedComponent {
    // Ensure bounds are valid numbers
    if (!component.bounds || isNaN(component.bounds.x)) {
      component.bounds = { x: 0, y: 0, width: 100, height: 40 };
    }
    
    // Ensure required properties exist
    if (!component.properties) {
      component.properties = {};
    }
    
    return component;
  }

  /**
   * Extract color from Figma fills property
   */
  private extractColor(fills: any): string {
    if (!fills || !Array.isArray(fills) || fills.length === 0) {
      return '#000000';
    }
    
    const fill = fills[0];
    if (fill.type === 'SOLID' && fill.color) {
      const { r, g, b } = fill.color;
      return `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`;
    }
    
    return '#000000';
  }

  /**
   * Map semantic group types to IdentifiedComponent types
   */
  private mapSemanticTypeToComponentType(semanticType: string): IdentifiedComponent['type'] {
    const typeMap: Record<string, IdentifiedComponent['type']> = {
      'button': 'button',
      'text': 'text',
      'card': 'card',
      'navigation': 'navigation',
      'input': 'input',
      'list': 'list',
      'image': 'image',
      'container': 'other', // Map container to other
      'other': 'other'
    };
    
    return typeMap[semanticType] || 'other';
  }

  /**
   * Simple test method to verify GPT Vision API works
   */
  async testGPTVisionAPI(): Promise<any> {
    console.log('Testing GPT Vision API with simple request...');
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'What do you see in this image? Please describe it briefly.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg',
                    detail: 'low'
                  }
                }
              ]
            }
          ],
          max_tokens: 300,
          temperature: 0.1
        })
      });

      console.log('GPT Vision API Response status:', response.status);
      console.log('GPT Vision API Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('GPT Vision API error response:', errorText);
        throw new Error(`GPT Vision API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('GPT Vision API success:', data);
      return data;
      
    } catch (error) {
      console.error('GPT Vision test failed:', error);
      throw error;
    }
  }
}

export default GPTVisionService; 