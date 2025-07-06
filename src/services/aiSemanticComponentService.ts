import { ComponentAnalysis } from './figmaService';
import { AIContextAnalysis } from './aiContextAnalysisService';
import { EnhancedContentMapping } from './aiContentMappingService';

export interface SemanticComponent {
  figmaNodeId: string;
  semanticType: 'avatar' | 'product_image' | 'icon' | 'pill_badge' | 'card' | 'button' | 'navigation_item' | 'status_indicator' | 'gallery_item' | 'payment_method' | 'text_content' | 'container';
  visualCharacteristics: {
    size: 'small' | 'medium' | 'large';
    shape: 'circular' | 'square' | 'rectangular' | 'pill' | 'custom';
    aspectRatio: number;
    hasImage: boolean;
    hasText: boolean;
  };
  contextualRole: string;
  businessPurpose: string;
  confidence: number;
  suggestedMuiComponent: string;
  styleHints: {
    borderRadius?: string;
    elevation?: number;
    variant?: string;
    color?: string;
  };
}

export interface SemanticComponentAnalysis {
  components: SemanticComponent[];
  patterns: {
    imageGalleries: SemanticComponent[][];
    navigationItems: SemanticComponent[];
    actionButtons: SemanticComponent[];
    statusIndicators: SemanticComponent[];
    cardGroups: SemanticComponent[][];
  };
  confidence: number;
  summary: {
    totalComponents: number;
    avatarsFound: number;
    productImagesFound: number;
    iconsFound: number;
    pillsFound: number;
    cardsFound: number;
  };
}

export class AISemanticComponentService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Analyze components semantically using AI intelligence like human visual recognition
   * This is the key enhancement that transforms basic shapes into meaningful UI components
   */
  async analyzeComponentsSemantics(
    figmaComponents: ComponentAnalysis[],
    contextAnalysis: AIContextAnalysis,
    contentMapping: EnhancedContentMapping,
    assetUrls: { [nodeId: string]: string }
  ): Promise<SemanticComponentAnalysis> {
    console.log('🔍 [SEMANTIC COMPONENT] Starting intelligent component recognition...');
    console.log('📊 [SEMANTIC COMPONENT] Input data:', {
      figmaComponents: figmaComponents.length,
      interfaceType: contextAnalysis.interfaceType,
      domain: contextAnalysis.domain,
      contentMappings: contentMapping.mappings.length,
      assetUrls: Object.keys(assetUrls).length
    });

    try {
      // Step 1: Pre-analyze components using visual characteristics
      const visualAnalysis = this.analyzeVisualCharacteristics(figmaComponents, assetUrls);
      
      // Step 2: Apply contextual intelligence using AI
      const semanticComponents = await this.applySemanticIntelligence(
        visualAnalysis,
        contextAnalysis,
        contentMapping
      );
      
      // Step 3: Identify interaction patterns
      const patterns = this.identifyInteractionPatterns(semanticComponents);
      
      // Step 4: Calculate confidence and summary
      const confidence = this.calculateSemanticConfidence(semanticComponents);
      const summary = this.generateSummary(semanticComponents);

      console.log('✅ [SEMANTIC COMPONENT] Analysis complete:', {
        semanticComponents: semanticComponents.length,
        confidence: confidence,
        avatars: summary.avatarsFound,
        productImages: summary.productImagesFound,
        icons: summary.iconsFound,
        pills: summary.pillsFound,
        cards: summary.cardsFound
      });

      return {
        components: semanticComponents,
        patterns,
        confidence,
        summary
      };

    } catch (error) {
      console.error('❌ [SEMANTIC COMPONENT] Analysis failed:', error);
      return this.createFallbackAnalysis(figmaComponents);
    }
  }

  /**
   * Analyze visual characteristics like I would when looking at a screenshot
   */
  private analyzeVisualCharacteristics(
    components: ComponentAnalysis[],
    assetUrls: { [nodeId: string]: string }
  ): Array<{
    component: ComponentAnalysis;
    visual: {
      size: 'small' | 'medium' | 'large';
      shape: 'circular' | 'square' | 'rectangular' | 'pill' | 'custom';
      aspectRatio: number;
      hasImage: boolean;
      hasText: boolean;
      area: number;
    };
  }> {
    return components.map(component => {
      const { width, height } = component.bounds;
      const aspectRatio = width / height;
      const area = width * height;
      
      // Determine size category
      let size: 'small' | 'medium' | 'large';
      if (area < 2500) { // < 50x50
        size = 'small';
      } else if (area < 10000) { // < 100x100
        size = 'medium';
      } else {
        size = 'large';
      }
      
      // Determine shape
      let shape: 'circular' | 'square' | 'rectangular' | 'pill' | 'custom';
      if (component.type === 'ELLIPSE') {
        shape = 'circular';
      } else if (Math.abs(aspectRatio - 1) < 0.2) { // Nearly square
        shape = 'square';
      } else if (aspectRatio > 3 || aspectRatio < 0.33) { // Very wide or tall
        shape = 'pill';
      } else {
        shape = 'rectangular';
      }
      
      // Check for content
      const hasImage = !!assetUrls[component.id];
      const hasText = !!(component.properties.characters && component.properties.characters.trim().length > 0);

      return {
        component,
        visual: {
          size,
          shape,
          aspectRatio,
          hasImage,
          hasText,
          area
        }
      };
    });
  }

  /**
   * Apply AI semantic intelligence to classify components based on context
   */
  private async applySemanticIntelligence(
    visualAnalysis: any[],
    contextAnalysis: AIContextAnalysis,
    contentMapping: EnhancedContentMapping
  ): Promise<SemanticComponent[]> {
    try {
      console.log('🔍 [SEMANTIC COMPONENT] Applying semantic intelligence...');
      
      // If we have too many components, batch them to avoid token limits
      const BATCH_SIZE = 50; // Process 50 components at a time
      
      if (visualAnalysis.length > BATCH_SIZE) {
        console.log(`🔄 [SEMANTIC COMPONENT] Batching ${visualAnalysis.length} components into chunks of ${BATCH_SIZE}`);
        
        const batches = [];
        for (let i = 0; i < visualAnalysis.length; i += BATCH_SIZE) {
          batches.push(visualAnalysis.slice(i, i + BATCH_SIZE));
        }
        
        const allComponents: SemanticComponent[] = [];
        
        for (let i = 0; i < batches.length; i++) {
          console.log(`🔍 [SEMANTIC COMPONENT] Processing batch ${i + 1}/${batches.length} (${batches[i].length} components)`);
          
          const batchResults = await this.processBatch(batches[i], contextAnalysis, contentMapping);
          allComponents.push(...batchResults);
          
          // Small delay between batches to avoid rate limiting
          if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        console.log(`✅ [SEMANTIC COMPONENT] Batch processing complete: ${allComponents.length} components analyzed`);
        return allComponents;
      }
      
      // Process small sets directly
      return await this.processBatch(visualAnalysis, contextAnalysis, contentMapping);

    } catch (error) {
      console.error('❌ [SEMANTIC COMPONENT] Semantic intelligence failed:', error);
      return [];
    }
  }

  /**
   * Process a batch of components
   */
  private async processBatch(
    visualAnalysis: any[],
    contextAnalysis: AIContextAnalysis,
    contentMapping: EnhancedContentMapping
  ): Promise<SemanticComponent[]> {
    const prompt = this.buildSemanticAnalysisPrompt(visualAnalysis, contextAnalysis, contentMapping);

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
            content: `You are an expert UI/UX analyst who can analyze interface components and determine their semantic meaning just like a human designer would. You understand that the same basic shape (RECTANGLE) can be an avatar, product image, button, or card depending on visual characteristics, position, and context.

Your job is to look at component data and determine the SEMANTIC meaning:
- Small circular/square components with images in header areas = avatars
- Medium rectangular components with images in grid layouts = product images  
- Small square components without images = icons
- Small pill-shaped components with text = badges/pills
- Large rectangular components with mixed content = cards
- Medium rectangular components with action text = buttons
- Text components in top areas = navigation
- Small colored shapes = status indicators

Always consider the interface type (mobile app, web app, dashboard) and domain (e-commerce, social, productivity) when making classifications.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 8000,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      throw new Error(`Semantic analysis API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.choices[0]?.message?.content;

    return this.parseSemanticAnalysisResponse(responseText);
  }

  /**
   * Build comprehensive prompt for semantic analysis
   */
  private buildSemanticAnalysisPrompt(
    visualAnalysis: any[],
    contextAnalysis: AIContextAnalysis,
    contentMapping: EnhancedContentMapping
  ): string {
    return `Analyze UI components semantically for a ${contextAnalysis.interfaceType} in the ${contextAnalysis.domain} domain.

INTERFACE CONTEXT:
- Type: ${contextAnalysis.interfaceType}
- Domain: ${contextAnalysis.domain}
- Primary Purpose: ${contextAnalysis.primaryPurpose}
- Expected Sections: ${contextAnalysis.semanticSections.map(s => s.name).join(', ')}

COMPONENT VISUAL ANALYSIS:
${visualAnalysis.map((item, i) => {
  const { component, visual } = item;
  return `${i + 1}. ID: ${component.id}
   - Type: ${component.type}
   - Size: ${visual.size} (${component.bounds.width}x${component.bounds.height})
   - Shape: ${visual.shape} (ratio: ${visual.aspectRatio.toFixed(2)})
   - Position: (${component.bounds.x}, ${component.bounds.y})
   - Has Image: ${visual.hasImage}
   - Has Text: ${visual.hasText ? `"${component.properties.characters}"` : 'No'}
   - Area: ${visual.area}px²`;
}).join('\n')}

CONTENT MAPPING INSIGHTS:
${contentMapping.mappings.map(m => `- ${m.semanticRole}: "${m.actualContent.text || m.actualContent.imageUrl}"`).join('\n')}

TASK: For each component, determine its SEMANTIC TYPE based on visual characteristics, position, and context.

Consider these patterns:
- AVATARS: Small (< 80px), circular/square, often has image, in header/profile areas
- PRODUCT_IMAGES: Medium size, in grids, has image content, for shopping/gallery
- ICONS: Small (< 50px), square, no image, often paired with text, for navigation/actions
- PILL_BADGES: Small, pill-shaped (ratio > 2), has text, for status/categories
- CARDS: Large (> 100px), rectangular, mixed content, for information display
- BUTTONS: Medium, rectangular, action text, for user interactions
- NAVIGATION_ITEMS: Text or small components in header/top areas
- STATUS_INDICATORS: Small, colored, circular/square, for showing state

CRITICAL: You must respond with ONLY a valid JSON array, no explanatory text before or after. 

RESPOND with ONLY this JSON array format:
[
  {
    "figmaNodeId": "component_id",
    "semanticType": "avatar|product_image|icon|pill_badge|card|button|navigation_item|status_indicator|gallery_item|payment_method|text_content|container",
    "visualCharacteristics": {
      "size": "small|medium|large",
      "shape": "circular|square|rectangular|pill|custom",
      "aspectRatio": 1.5,
      "hasImage": true,
      "hasText": false
    },
    "contextualRole": "user profile image|product showcase|navigation icon|status badge|content card|action button|menu item|activity indicator",
    "businessPurpose": "identify user|show product|navigate app|indicate status|display info|trigger action|access feature|show activity",
    "confidence": 0.9,
    "suggestedMuiComponent": "Avatar|Card|IconButton|Chip|Button|Typography|Box",
    "styleHints": {
      "borderRadius": "50%|8px|4px",
      "elevation": 2,
      "variant": "contained|outlined|text",
      "color": "primary|secondary|default"
    }
  }
]

Analyze EVERY component and classify it semantically. Use high confidence for clear patterns, lower for ambiguous cases.

IMPORTANT: Your response must start with [ and end with ] - no additional text.`;
  }

  /**
   * Parse AI response for semantic component analysis
   */
  private parseSemanticAnalysisResponse(responseText: string): SemanticComponent[] {
    try {
      console.log('🔍 [SEMANTIC COMPONENT] Raw AI response:', responseText);
      
      // Try multiple parsing strategies
      let jsonString = '';
      
      // Strategy 1: Look for JSON wrapped in markdown code blocks (most common)
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        const potentialJson = codeBlockMatch[1].trim();
        if (potentialJson.startsWith('[') && potentialJson.includes(']')) {
          jsonString = potentialJson;
        }
      }
      
      // Strategy 2: Look for JSON array with square brackets (direct response)
      if (!jsonString) {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        }
      }
      
      // Strategy 3: Look for JSON array starting with [{ and ending with }]
      if (!jsonString) {
        const altMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (altMatch) {
          jsonString = altMatch[0];
        }
      }
      
      // Strategy 4: Try to extract from the full response if it looks like JSON
      if (!jsonString) {
        const trimmed = responseText.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          jsonString = trimmed;
        }
      }
      
      if (!jsonString) {
        console.error('❌ [SEMANTIC COMPONENT] No JSON array found in response');
        console.error('Response preview:', responseText.substring(0, 500));
        throw new Error('No JSON array found in response');
      }

      console.log('🔍 [SEMANTIC COMPONENT] Extracted JSON string:', jsonString.substring(0, 300) + '...');
      
      // Try to parse JSON, handle potential truncation
      let components;
      try {
        components = JSON.parse(jsonString);
      } catch (parseError) {
        console.warn('⚠️ [SEMANTIC COMPONENT] JSON parse failed, attempting to fix truncated JSON...');
        
        // Try to fix truncated JSON by finding the last complete object
        const lastCompleteMatch = jsonString.match(/^(\[[\s\S]*\})\s*,?\s*[^\}]*$/);
        if (lastCompleteMatch) {
          const fixedJson = lastCompleteMatch[1] + ']';
          console.log('🔧 [SEMANTIC COMPONENT] Attempting to parse fixed JSON...');
          try {
            components = JSON.parse(fixedJson);
            console.log('✅ [SEMANTIC COMPONENT] Successfully parsed fixed JSON');
          } catch (fixError) {
            console.error('❌ [SEMANTIC COMPONENT] Failed to parse fixed JSON:', fixError);
            throw parseError;
          }
        } else {
          throw parseError;
        }
      }
      
      if (!Array.isArray(components)) {
        console.error('❌ [SEMANTIC COMPONENT] Parsed result is not an array:', typeof components);
        throw new Error('Parsed result is not an array');
      }
      
      const validComponents = components.filter((comp: any) => 
        comp.figmaNodeId && 
        comp.semanticType && 
        comp.confidence > 0.3
      );

      console.log('✅ [SEMANTIC COMPONENT] Successfully parsed components:', validComponents.length);
      
      return validComponents;

    } catch (error) {
      console.error('❌ [SEMANTIC COMPONENT] Failed to parse AI response:', error);
      console.error('Response text length:', responseText.length);
      console.error('Response preview:', responseText.substring(0, 1000));
      return [];
    }
  }

  /**
   * Identify interaction patterns from semantic components
   */
  private identifyInteractionPatterns(components: SemanticComponent[]): SemanticComponentAnalysis['patterns'] {
    const imageGalleries: SemanticComponent[][] = [];
    const navigationItems: SemanticComponent[] = [];
    const actionButtons: SemanticComponent[] = [];
    const statusIndicators: SemanticComponent[] = [];
    const cardGroups: SemanticComponent[][] = [];

    // Group product images that are horizontally aligned (galleries)
    const productImages = components.filter(c => c.semanticType === 'product_image' || c.semanticType === 'gallery_item');
    if (productImages.length >= 3) {
      // Simple horizontal grouping - could be enhanced
      imageGalleries.push(productImages);
    }

    // Collect navigation items
    navigationItems.push(...components.filter(c => c.semanticType === 'navigation_item'));

    // Collect action buttons
    actionButtons.push(...components.filter(c => c.semanticType === 'button'));

    // Collect status indicators
    statusIndicators.push(...components.filter(c => c.semanticType === 'status_indicator' || c.semanticType === 'pill_badge'));

    // Group cards
    const cards = components.filter(c => c.semanticType === 'card');
    if (cards.length >= 2) {
      cardGroups.push(cards);
    }

    return {
      imageGalleries,
      navigationItems,
      actionButtons,
      statusIndicators,
      cardGroups
    };
  }

  /**
   * Calculate confidence score for semantic analysis
   */
  private calculateSemanticConfidence(components: SemanticComponent[]): number {
    if (components.length === 0) return 0;
    
    const averageConfidence = components.reduce((sum, comp) => sum + comp.confidence, 0) / components.length;
    
    // Bonus for finding sophisticated components
    const sophisticatedTypes = ['avatar', 'product_image', 'pill_badge', 'card'];
    const sophisticatedCount = components.filter(c => sophisticatedTypes.includes(c.semanticType)).length;
    const sophisticationBonus = Math.min(0.2, sophisticatedCount * 0.05);
    
    return Math.min(0.95, averageConfidence + sophisticationBonus);
  }

  /**
   * Generate summary of found components
   */
  private generateSummary(components: SemanticComponent[]): SemanticComponentAnalysis['summary'] {
    return {
      totalComponents: components.length,
      avatarsFound: components.filter(c => c.semanticType === 'avatar').length,
      productImagesFound: components.filter(c => c.semanticType === 'product_image' || c.semanticType === 'gallery_item').length,
      iconsFound: components.filter(c => c.semanticType === 'icon').length,
      pillsFound: components.filter(c => c.semanticType === 'pill_badge').length,
      cardsFound: components.filter(c => c.semanticType === 'card').length
    };
  }

  /**
   * Create fallback analysis when AI fails
   */
  private createFallbackAnalysis(components: ComponentAnalysis[]): SemanticComponentAnalysis {
    const fallbackComponents: SemanticComponent[] = components.map(comp => {
      const { width, height } = comp.bounds;
      const area = width * height;
      
      // Simple heuristic classification
      let semanticType: SemanticComponent['semanticType'] = 'container';
      let suggestedMuiComponent = 'Box';
      
      if (comp.type === 'TEXT') {
        semanticType = 'text_content';
        suggestedMuiComponent = 'Typography';
      } else if (area < 2500 && Math.abs(width - height) < 20) {
        semanticType = 'icon';
        suggestedMuiComponent = 'IconButton';
      } else if (width > 100 && height > 40 && height < 80) {
        semanticType = 'button';
        suggestedMuiComponent = 'Button';
      } else if (area > 10000) {
        semanticType = 'card';
        suggestedMuiComponent = 'Card';
      }

      return {
        figmaNodeId: comp.id,
        semanticType,
        visualCharacteristics: {
          size: area < 2500 ? 'small' : area < 10000 ? 'medium' : 'large',
          shape: comp.type === 'ELLIPSE' ? 'circular' : 'rectangular',
          aspectRatio: width / height,
          hasImage: false,
          hasText: !!comp.properties.characters
        },
        contextualRole: 'generic component',
        businessPurpose: 'display content',
        confidence: 0.5,
        suggestedMuiComponent,
        styleHints: {}
      };
    });

    return {
      components: fallbackComponents,
      patterns: {
        imageGalleries: [],
        navigationItems: [],
        actionButtons: [],
        statusIndicators: [],
        cardGroups: []
      },
      confidence: 0.5,
      summary: this.generateSummary(fallbackComponents)
    };
  }

  /**
   * Get semantic components by type
   */
  getComponentsByType(
    analysis: SemanticComponentAnalysis, 
    type: SemanticComponent['semanticType']
  ): SemanticComponent[] {
    return analysis.components.filter(comp => comp.semanticType === type);
  }

  /**
   * Get components by business purpose
   */
  getComponentsByPurpose(
    analysis: SemanticComponentAnalysis, 
    purpose: string
  ): SemanticComponent[] {
    return analysis.components.filter(comp => 
      comp.businessPurpose.toLowerCase().includes(purpose.toLowerCase())
    );
  }
} 