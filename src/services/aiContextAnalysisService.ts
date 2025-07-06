// Core interface types that our system should recognize and handle
export type InterfaceType = 
  | 'mobile-app' 
  | 'web-app' 
  | 'desktop-app'
  | 'landing-page' 
  | 'dashboard' 
  | 'form'
  | 'ecommerce'
  | 'social'
  | 'productivity'
  | 'entertainment'
  | 'unknown';

export type UIPattern = 
  | 'navigation-header'
  | 'hero-section'
  | 'card-grid'
  | 'list-view'
  | 'carousel'
  | 'tabs'
  | 'sidebar'
  | 'bottom-navigation'
  | 'floating-action'
  | 'modal'
  | 'drawer'
  | 'status-indicators'
  | 'media-gallery'
  | 'form-fields'
  | 'data-visualization'
  | 'content-sections'
  | 'unknown';

export interface SemanticSection {
  name: string;
  businessPurpose: string;
  uiPattern: UIPattern;
  priority: 'primary' | 'secondary' | 'tertiary';
  expectedComponents: string[];
  userInteractions: string[];
  position: {
    description: string;
    relativeOrder: number;
  };
}

export interface AIContextAnalysis {
  // High-level understanding
  interfaceType: InterfaceType;
  domain: string;
  primaryPurpose: string;
  targetDevice: 'mobile' | 'desktop' | 'tablet' | 'responsive';
  designStyle: 'modern' | 'minimal' | 'corporate' | 'playful' | 'luxury' | 'utility';
  
  // Semantic structure
  semanticSections: SemanticSection[];
  userJourney: string[];
  keyInteractions: string[];
  
  // Component intelligence
  expectedComponentLibrary: 'material-ui' | 'ant-design' | 'chakra-ui' | 'tailwind' | 'custom';
  responsiveStrategy: string;
  
  // Content understanding
  contentThemes: string[];
  dataTypes: string[];
  
  // Technical guidance
  recommendedArchitecture: string;
  complexityLevel: 'simple' | 'moderate' | 'complex' | 'enterprise';
  
  // Quality metrics
  analysisConfidence: number;
  reasoning: string;
}

export class AIContextAnalysisService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Core AI Context Analysis - The intelligence layer that replaces mechanical processing
   * This is where we leverage the same reasoning I demonstrated with the screenshot
   */
  async analyzeInterfaceContext(
    screenshotUrl: string,
    figmaFileName?: string,
    additionalContext?: string
  ): Promise<AIContextAnalysis> {
    console.log('🧠 [AI CONTEXT] Starting intelligent interface analysis...');
    
    try {
      const analysisPrompt = this.buildContextAnalysisPrompt(figmaFileName, additionalContext);
      
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
              content: `You are an expert UI/UX analyst with the intelligence of a senior designer. Your role is to analyze interface screenshots and provide comprehensive semantic understanding that will guide code generation.

You understand the difference between:
- Mobile apps vs web applications vs dashboards vs landing pages
- E-commerce vs social vs productivity vs entertainment domains  
- Navigation patterns, content sections, user flows, and interaction patterns
- Modern UI component libraries and their appropriate usage

Your analysis will be the foundation for generating accurate React code, so be thorough and intelligent in your semantic understanding.`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: analysisPrompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: screenshotUrl,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 2000,
          temperature: 0.3 // Lower temperature for more consistent analysis
        })
      });

      if (!response.ok) {
        throw new Error(`AI Context Analysis API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const analysisText = data.choices[0]?.message?.content;
      
      if (!analysisText) {
        throw new Error('No analysis received from AI');
      }

      // Parse the structured response
      const contextAnalysis = this.parseAIResponse(analysisText);
      
      console.log('✅ [AI CONTEXT] Analysis complete:', {
        interfaceType: contextAnalysis.interfaceType,
        domain: contextAnalysis.domain,
        sectionsFound: contextAnalysis.semanticSections.length,
        confidence: contextAnalysis.analysisConfidence
      });

      return contextAnalysis;

    } catch (error) {
      console.error('❌ [AI CONTEXT] Analysis failed:', error);
      
      // Fallback to basic analysis
      return this.createFallbackAnalysis();
    }
  }

  /**
   * Intelligent prompt that asks AI to analyze like I analyzed the screenshot
   * Covers all interface types: mobile apps, web apps, dashboards, etc.
   */
  private buildContextAnalysisPrompt(figmaFileName?: string, additionalContext?: string): string {
    return `You are analyzing this interface screenshot to understand its semantic structure and purpose. Analyze it with the same intelligence a senior designer would use.

CONTEXT:
${figmaFileName ? `- Figma file name: "${figmaFileName}"` : ''}
${additionalContext ? `- Additional context: ${additionalContext}` : ''}

ANALYZE THE INTERFACE:

1. **INTERFACE TYPE & PURPOSE**:
   - What type of interface is this? (mobile app, web app, dashboard, landing page, etc.)
   - What's the primary business domain/purpose?
   - Who is the target user and what are they trying to accomplish?

2. **SEMANTIC STRUCTURE**:
   - Break down the interface into logical sections based on their business purpose
   - For each section, identify:
     * Business purpose (e.g., "user authentication", "product discovery", "checkout flow")
     * UI pattern used (e.g., "navigation-header", "card-grid", "carousel")
     * Priority level and user interaction expectations

3. **USER JOURNEY & INTERACTIONS**:
   - What's the intended user flow through this interface?
   - What are the key interactions and call-to-actions?

4. **TECHNICAL CHARACTERISTICS**:
   - Target device (mobile, desktop, responsive)
   - Design style and component library fit
   - Complexity level

5. **CONTENT & DATA UNDERSTANDING**:
   - What types of content/data are displayed?
   - What are the main content themes?

RESPOND WITH A JSON OBJECT matching this exact structure:
{
  "interfaceType": "mobile-app|web-app|dashboard|landing-page|etc",
  "domain": "string describing the business domain",
  "primaryPurpose": "string describing main user goal",
  "targetDevice": "mobile|desktop|tablet|responsive",
  "designStyle": "modern|minimal|corporate|playful|luxury|utility",
  "semanticSections": [
    {
      "name": "section name",
      "businessPurpose": "what this section accomplishes for the user",
      "uiPattern": "navigation-header|card-grid|carousel|etc",
      "priority": "primary|secondary|tertiary",
      "expectedComponents": ["component types expected"],
      "userInteractions": ["interaction types"],
      "position": {
        "description": "where this appears in layout",
        "relativeOrder": 1
      }
    }
  ],
  "userJourney": ["step 1", "step 2", "step 3"],
  "keyInteractions": ["main actions user can take"],
  "expectedComponentLibrary": "material-ui|ant-design|chakra-ui|tailwind|custom",
  "responsiveStrategy": "how this should adapt to different screen sizes",
  "contentThemes": ["theme 1", "theme 2"],
  "dataTypes": ["user data", "product data", "etc"],
  "recommendedArchitecture": "suggested technical approach",
  "complexityLevel": "simple|moderate|complex|enterprise",
  "analysisConfidence": 0.95,
  "reasoning": "brief explanation of analysis"
}

Be thorough and intelligent - analyze like a senior designer who understands both user experience and technical implementation.`;
  }

  /**
   * Parse AI response and convert to structured format
   */
  private parseAIResponse(responseText: string): AIContextAnalysis {
    try {
      // Extract JSON from response (handle cases where AI adds explanation text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);
      
      // Validate and ensure all required fields are present
      return {
        interfaceType: parsedResponse.interfaceType || 'unknown',
        domain: parsedResponse.domain || 'general',
        primaryPurpose: parsedResponse.primaryPurpose || 'user interface',
        targetDevice: parsedResponse.targetDevice || 'responsive',
        designStyle: parsedResponse.designStyle || 'modern',
        semanticSections: parsedResponse.semanticSections || [],
        userJourney: parsedResponse.userJourney || [],
        keyInteractions: parsedResponse.keyInteractions || [],
        expectedComponentLibrary: parsedResponse.expectedComponentLibrary || 'material-ui',
        responsiveStrategy: parsedResponse.responsiveStrategy || 'mobile-first responsive design',
        contentThemes: parsedResponse.contentThemes || [],
        dataTypes: parsedResponse.dataTypes || [],
        recommendedArchitecture: parsedResponse.recommendedArchitecture || 'component-based React application',
        complexityLevel: parsedResponse.complexityLevel || 'moderate',
        analysisConfidence: parsedResponse.analysisConfidence || 0.8,
        reasoning: parsedResponse.reasoning || 'AI analysis completed'
      };

    } catch (error) {
      console.error('❌ [AI CONTEXT] Failed to parse AI response:', error);
      return this.createFallbackAnalysis();
    }
  }

  /**
   * Fallback analysis for when AI analysis fails
   */
  private createFallbackAnalysis(): AIContextAnalysis {
    return {
      interfaceType: 'unknown',
      domain: 'general',
      primaryPurpose: 'user interface',
      targetDevice: 'responsive',
      designStyle: 'modern',
      semanticSections: [
        {
          name: 'Main Content',
          businessPurpose: 'primary user interaction area',
          uiPattern: 'content-sections',
          priority: 'primary',
          expectedComponents: ['Box', 'Typography', 'Button'],
          userInteractions: ['view', 'click'],
          position: {
            description: 'center of interface',
            relativeOrder: 1
          }
        }
      ],
      userJourney: ['view content', 'interact with elements'],
      keyInteractions: ['navigation', 'primary actions'],
      expectedComponentLibrary: 'material-ui',
      responsiveStrategy: 'mobile-first responsive design',
      contentThemes: ['general content'],
      dataTypes: ['user interface data'],
      recommendedArchitecture: 'React component-based application',
      complexityLevel: 'moderate',
      analysisConfidence: 0.5,
      reasoning: 'Fallback analysis - AI analysis was not available'
    };
  }

  /**
   * Validate analysis quality and provide confidence scoring
   */
  validateAnalysisQuality(analysis: AIContextAnalysis): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (analysis.analysisConfidence < 0.7) {
      issues.push('Low confidence score - analysis may be unreliable');
    }

    if (analysis.semanticSections.length === 0) {
      issues.push('No semantic sections identified');
    }

    if (analysis.interfaceType === 'unknown') {
      issues.push('Could not determine interface type');
    }

    if (analysis.userJourney.length === 0) {
      issues.push('No user journey identified');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
} 