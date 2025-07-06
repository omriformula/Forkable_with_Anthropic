import { ComponentAnalysis } from './figmaService';
import { AIContextAnalysis, SemanticSection } from './aiContextAnalysisService';
import { IdentifiedComponent } from './gptVisionService';

export interface ContentMapping {
  figmaNodeId: string;
  actualContent: {
    text?: string;
    imageUrl?: string;
    type: 'text' | 'image' | 'icon' | 'container';
  };
  semanticRole: string;
  businessPurpose: string;
  uiPattern: string;
}

export interface EnhancedContentMapping {
  mappings: ContentMapping[];
  confidence: number;
  unmappedComponents: ComponentAnalysis[];
  summary: {
    totalComponents: number;
    mappedComponents: number;
    textContentFound: number;
    imageContentFound: number;
  };
}

export class AIContentMappingService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * The critical bridge between AI Context Analysis and real Figma content
   * This solves the "Rectangle" placeholder problem by mapping real content to semantic sections
   */
  async mapContentToSemanticSections(
    contextAnalysis: AIContextAnalysis,
    figmaComponents: ComponentAnalysis[],
    assetUrls: { [nodeId: string]: string }
  ): Promise<EnhancedContentMapping> {
    console.log('🔄 [CONTENT MAPPING] Starting intelligent content mapping...');
    console.log('📊 [CONTENT MAPPING] Input data:', {
      contextSections: contextAnalysis.semanticSections.length,
      figmaComponents: figmaComponents.length,
      interfaceType: contextAnalysis.interfaceType,
      domain: contextAnalysis.domain
    });

    try {
      // Step 1: Extract all text content from Figma components
      const textComponents = this.extractTextContent(figmaComponents);
      
      // Step 2: Extract all image/visual content
      const imageComponents = this.extractImageContent(figmaComponents, assetUrls);
      
      // Step 3: Use AI to intelligently map content to semantic sections
      const contentMappings = await this.intelligentContentMapping(
        contextAnalysis,
        textComponents,
        imageComponents,
        figmaComponents
      );

      const summary = {
        totalComponents: figmaComponents.length,
        mappedComponents: contentMappings.length,
        textContentFound: textComponents.length,
        imageContentFound: imageComponents.length
      };

      const confidence = this.calculateMappingConfidence(contentMappings, figmaComponents);

      console.log('✅ [CONTENT MAPPING] Mapping complete:', {
        mappedComponents: contentMappings.length,
        confidence: confidence,
        textContent: textComponents.length,
        imageContent: imageComponents.length
      });

      return {
        mappings: contentMappings,
        confidence,
        unmappedComponents: this.findUnmappedComponents(figmaComponents, contentMappings),
        summary
      };

    } catch (error) {
      console.error('❌ [CONTENT MAPPING] Mapping failed:', error);
      return this.createFallbackMapping(figmaComponents);
    }
  }

  /**
   * Extract all meaningful text content from Figma components
   */
  private extractTextContent(components: ComponentAnalysis[]): Array<{
    nodeId: string;
    text: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    style?: any;
  }> {
    return components
      .filter(comp => comp.type === 'TEXT' && comp.properties.characters)
      .map(comp => ({
        nodeId: comp.id,
        text: comp.properties.characters,
        position: { x: comp.bounds.x, y: comp.bounds.y },
        size: { width: comp.bounds.width, height: comp.bounds.height },
        style: comp.properties.style || {}
      }))
      .filter(item => item.text.trim().length > 0);
  }

  /**
   * Extract all image/visual content from Figma components
   */
  private extractImageContent(
    components: ComponentAnalysis[], 
    assetUrls: { [nodeId: string]: string }
  ): Array<{
    nodeId: string;
    imageUrl?: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    type: 'image' | 'icon' | 'shape';
  }> {
    return components
      .filter(comp => {
        return (
          comp.type === 'RECTANGLE' || 
          comp.type === 'ELLIPSE' || 
          comp.type === 'INSTANCE' ||
          assetUrls[comp.id] // Has an associated image
        );
      })
      .map(comp => ({
        nodeId: comp.id,
        imageUrl: assetUrls[comp.id],
        position: { x: comp.bounds.x, y: comp.bounds.y },
        size: { width: comp.bounds.width, height: comp.bounds.height },
        type: this.classifyVisualType(comp, !!assetUrls[comp.id])
      }));
  }

  /**
   * Classify visual component type based on properties
   */
  private classifyVisualType(
    component: ComponentAnalysis, 
    hasImage: boolean
  ): 'image' | 'icon' | 'shape' {
    if (hasImage) return 'image';
    
    const { width, height } = component.bounds;
    
    // Small square = likely icon
    if (width <= 50 && height <= 50 && Math.abs(width - height) <= 10) {
      return 'icon';
    }
    
    // Circular or small = likely icon
    if (component.type === 'ELLIPSE' || (width <= 80 && height <= 80)) {
      return 'icon';
    }
    
    return 'shape';
  }

  /**
   * Use AI to intelligently map real content to semantic sections
   */
  private async intelligentContentMapping(
    contextAnalysis: AIContextAnalysis,
    textComponents: any[],
    imageComponents: any[],
    allComponents: ComponentAnalysis[]
  ): Promise<ContentMapping[]> {
    const prompt = this.buildContentMappingPrompt(
      contextAnalysis,
      textComponents,
      imageComponents
    );

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
            content: `You are an expert at mapping real interface content to semantic UI sections. Your job is to take actual text and images from a design and map them to their correct semantic roles so that generated code uses REAL content instead of placeholder text.

You understand that:
- User names should be mapped to greeting/header sections
- Product images should be mapped to content/gallery sections  
- Action text should be mapped to button/CTA sections
- Navigation text should be mapped to header/navigation sections
- Status text should be mapped to indicator/status sections

Always prioritize using REAL content over generic placeholders.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      throw new Error(`Content mapping API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.choices[0]?.message?.content;

    return this.parseContentMappingResponse(responseText);
  }

  /**
   * Build prompt for intelligent content mapping
   */
  private buildContentMappingPrompt(
    contextAnalysis: AIContextAnalysis,
    textComponents: any[],
    imageComponents: any[]
  ): string {
    return `Map real interface content to semantic sections for a ${contextAnalysis.interfaceType} in the ${contextAnalysis.domain} domain.

INTERFACE CONTEXT:
- Type: ${contextAnalysis.interfaceType}
- Domain: ${contextAnalysis.domain}  
- Purpose: ${contextAnalysis.primaryPurpose}
- Semantic Sections Identified: ${contextAnalysis.semanticSections.map(s => s.name).join(', ')}

REAL TEXT CONTENT FOUND:
${textComponents.map((text, i) => `${i + 1}. "${text.text}" at position (${text.position.x}, ${text.position.y})`).join('\n')}

REAL IMAGE/VISUAL CONTENT FOUND:
${imageComponents.map((img, i) => `${i + 1}. ${img.type} at position (${img.position.x}, ${img.position.y}) size ${img.size.width}x${img.size.height}${img.imageUrl ? ' [HAS_IMAGE]' : ''}`).join('\n')}

TASK: Map each piece of real content to its most appropriate semantic role and business purpose.

For text content, determine:
- Is this a user greeting? (e.g., "Hello, [Name]")
- Is this navigation text? (e.g., "My Activity", "Settings")  
- Is this a section title? (e.g., "Recently viewed", "My Orders")
- Is this action text? (e.g., "Continue", "Buy Now")
- Is this informational? (e.g., descriptions, labels)

For visual content, determine:
- Is this a user avatar/profile image?
- Is this a product image?
- Is this an icon for navigation/actions?
- Is this decorative content?

RESPOND with JSON array:
[
  {
    "figmaNodeId": "component_id",
    "actualContent": {
      "text": "Hello, Romina!" // or null for images
      "imageUrl": "url" // or null for text
      "type": "text|image|icon|container"
    },
    "semanticRole": "user_greeting|navigation|section_title|action|content|status",
    "businessPurpose": "greet user|navigate app|show products|trigger action|display info",
    "uiPattern": "header|navigation|content_grid|action_button|status_indicator"
  }
]

Use REAL content, not placeholders. Map intelligently based on position, content, and semantic understanding.`;
  }

  /**
   * Parse AI response for content mappings
   */
  private parseContentMappingResponse(responseText: string): ContentMapping[] {
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const mappings = JSON.parse(jsonMatch[0]);
      
      return mappings.filter((mapping: any) => 
        mapping.figmaNodeId && 
        mapping.actualContent && 
        mapping.semanticRole
      );

    } catch (error) {
      console.error('❌ [CONTENT MAPPING] Failed to parse AI response:', error);
      return [];
    }
  }

  /**
   * Calculate confidence score for content mapping
   */
  private calculateMappingConfidence(
    mappings: ContentMapping[], 
    totalComponents: ComponentAnalysis[]
  ): number {
    if (totalComponents.length === 0) return 0;
    
    const mappingRatio = mappings.length / totalComponents.length;
    const textMappings = mappings.filter(m => m.actualContent.text).length;
    const imageMappings = mappings.filter(m => m.actualContent.imageUrl).length;
    
    // Higher confidence if we have good ratio of real content mappings
    const contentQuality = (textMappings + imageMappings) / mappings.length;
    
    return Math.min(0.95, mappingRatio * 0.6 + contentQuality * 0.4);
  }

  /**
   * Find components that weren't mapped to any content
   */
  private findUnmappedComponents(
    allComponents: ComponentAnalysis[], 
    mappings: ContentMapping[]
  ): ComponentAnalysis[] {
    const mappedIds = new Set(mappings.map(m => m.figmaNodeId));
    return allComponents.filter(comp => !mappedIds.has(comp.id));
  }

  /**
   * Fallback mapping when AI analysis fails
   */
  private createFallbackMapping(components: ComponentAnalysis[]): EnhancedContentMapping {
    const textComponents = components.filter(c => c.type === 'TEXT' && c.properties.characters);
    
    const fallbackMappings: ContentMapping[] = textComponents.map(comp => ({
      figmaNodeId: comp.id,
      actualContent: {
        text: comp.properties.characters,
        type: 'text' as const
      },
      semanticRole: 'content',
      businessPurpose: 'display information',
      uiPattern: 'text_content'
    }));

    return {
      mappings: fallbackMappings,
      confidence: 0.5,
      unmappedComponents: components.filter(c => c.type !== 'TEXT'),
      summary: {
        totalComponents: components.length,
        mappedComponents: fallbackMappings.length,
        textContentFound: textComponents.length,
        imageContentFound: 0
      }
    };
  }

  /**
   * Get content mapping for a specific semantic section
   */
  getContentForSection(
    sectionName: string, 
    mappings: ContentMapping[]
  ): ContentMapping[] {
    return mappings.filter(mapping => 
      mapping.semanticRole.includes(sectionName.toLowerCase()) ||
      mapping.businessPurpose.includes(sectionName.toLowerCase())
    );
  }

  /**
   * Get all text content with semantic roles
   */
  getTextContentByRole(mappings: ContentMapping[]): { [role: string]: string[] } {
    const textByRole: { [role: string]: string[] } = {};
    
    mappings.forEach(mapping => {
      if (mapping.actualContent.text) {
        if (!textByRole[mapping.semanticRole]) {
          textByRole[mapping.semanticRole] = [];
        }
        textByRole[mapping.semanticRole].push(mapping.actualContent.text);
      }
    });
    
    return textByRole;
  }

  /**
   * Get all image content with semantic roles  
   */
  getImageContentByRole(mappings: ContentMapping[]): { [role: string]: string[] } {
    const imagesByRole: { [role: string]: string[] } = {};
    
    mappings.forEach(mapping => {
      if (mapping.actualContent.imageUrl) {
        if (!imagesByRole[mapping.semanticRole]) {
          imagesByRole[mapping.semanticRole] = [];
        }
        imagesByRole[mapping.semanticRole].push(mapping.actualContent.imageUrl);
      }
    });
    
    return imagesByRole;
  }
} 