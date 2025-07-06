import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  AutoFixHigh as ProcessingIcon,
  Code as CodeIcon,
  CheckCircle as CompleteIcon,
  Error as ErrorIcon,
  Visibility as PreviewIcon,
  ExpandMore as ExpandMoreIcon,
  Analytics as AnalyticsIcon,
  Palette as PaletteIcon,
  ViewModule as ComponentIcon
} from '@mui/icons-material';
import { useCreate, useUpdate } from '@refinedev/core';
import FigmaService, { FigmaAnalysisResult, ComponentAnalysis } from '../services/figmaService';
import GPTVisionService, { GPTVisionAnalysis, IdentifiedComponent } from '../services/gptVisionService';
import SemanticGroupingService, { SemanticGroupingResult } from '../services/semanticGroupingService';
import StyleMapperService, { StyleMapping } from '../services/styleMapperService';
import LivePreview from './LivePreview';
import { AIContextAnalysisService, AIContextAnalysis } from '../services/aiContextAnalysisService';
import { AIContentMappingService, EnhancedContentMapping } from '../services/aiContentMappingService';
import { AISemanticComponentService, SemanticComponentAnalysis } from '../services/aiSemanticComponentService';

interface Screen {
  id: string;
  project_id: string;
  name: string;
  original_image_url: string;
  figma_url?: string;
  figma_file_key?: string;
  current_code?: string;
  status: 'processing' | 'iterating' | 'ready' | 'error';
  iteration_count: number;
  confidence_score?: number;
  analysis_data?: any;
}

interface FigmaToCodeProcessorProps {
  screen: Screen;
  onComplete: () => void;
  figmaToken: string;
  openaiApiKey: string;
}

const steps = [
  'Stage 1: AI Context Analysis',
  'Fetching Figma file data',
  'Exporting screen images',
  'Stage 2: AI Content Mapping',
  'Stage 3: AI Semantic Component Recognition',
  'Stage 4: AI-Guided Semantic Grouping',
  'Stage 5: AI-Enhanced Component Mapping',
  'Stage 6: AI-Intelligent Code Generation',
  'Ready for vibe-coding'
];

const FigmaToCodeProcessor: React.FC<FigmaToCodeProcessorProps> = ({
  screen,
  onComplete,
  figmaToken,
  openaiApiKey
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(true);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [aiContextAnalysis, setAiContextAnalysis] = useState<AIContextAnalysis | null>(null);
  const [contentMapping, setContentMapping] = useState<EnhancedContentMapping | null>(null);
  const [semanticComponentAnalysis, setSemanticComponentAnalysis] = useState<SemanticComponentAnalysis | null>(null);
  const [analysis, setAnalysis] = useState<GPTVisionAnalysis | null>(null);
  const [figmaData, setFigmaData] = useState<FigmaAnalysisResult | null>(null);
  const [semanticGrouping, setSemanticGrouping] = useState<SemanticGroupingResult | null>(null);
  const [styleMapping, setStyleMapping] = useState<StyleMapping | null>(null);
  const [designTokens, setDesignTokens] = useState<any>(null);

  const { mutate: updateScreen } = useUpdate();
  const { mutate: createSession } = useCreate();

  useEffect(() => {
    if (screen.status === 'processing' && screen.figma_url) {
      startFigmaProcessing();
    }
  }, [screen]);

  const startFigmaProcessing = async () => {
    setIsProcessing(true);
    setError('');

    try {
      console.log('Starting Figma processing with tokens:', {
        figmaToken: figmaToken ? '✓ Present' : '✗ Missing',
        openaiApiKey: openaiApiKey ? '✓ Present' : '✗ Missing',
        figmaUrl: screen.figma_url
      });

      const figmaService = new FigmaService(figmaToken);
      const gptVisionService = new GPTVisionService(openaiApiKey);
      const semanticGroupingService = new SemanticGroupingService(openaiApiKey);
      const styleMapperService = new StyleMapperService();
      const aiContextAnalysisService = new AIContextAnalysisService(openaiApiKey);
      const aiContentMappingService = new AIContentMappingService(openaiApiKey);
      const aiSemanticComponentService = new AISemanticComponentService(openaiApiKey);

      // Step 1: AI Context Analysis - The Intelligence Foundation
      setActiveStep(0);
      await delay(1000);
      
      console.log('🧠 [AI CONTEXT] Starting AI Context Analysis - the intelligence layer...');
      
      // Get basic Figma data first to get screenshot URL
      if (!screen.figma_url) {
        throw new Error('No Figma URL provided');
      }

      console.log('Extracting file key from:', screen.figma_url);
      const fileKey = figmaService.extractFileKey(screen.figma_url);
      console.log('Extracted file key:', fileKey);
      
      // Get initial Figma data and screenshot
      const initialFigmaData = await figmaService.analyzeFileWithAssets(fileKey);
      const figmaFileName = initialFigmaData.fileData.name;
      const screenshotUrl = initialFigmaData.imageUrl;
      
      // AI Context Analysis - This replaces mechanical processing with intelligence
      const contextAnalysis = await aiContextAnalysisService.analyzeInterfaceContext(
        screenshotUrl,
        figmaFileName,
        `Figma file conversion for React/Material-UI application`
      );
      
      setAiContextAnalysis(contextAnalysis);
      
      console.log('✅ [AI CONTEXT] Context Analysis Complete:', {
        interfaceType: contextAnalysis.interfaceType,
        domain: contextAnalysis.domain,
        sectionsFound: contextAnalysis.semanticSections.length,
        confidence: contextAnalysis.analysisConfidence,
        targetDevice: contextAnalysis.targetDevice
      });

      // Step 2: Enhanced Figma file data extraction guided by AI context
      setActiveStep(1);
      await delay(1000);
      
      // Step 3: Enhanced analysis with comprehensive styling data and assets
      setActiveStep(2);
      await delay(1500);
      
      console.log('🎨 Using enhanced Figma data from AI context analysis...');
      const enhancedFigmaData = initialFigmaData; // Already fetched in Step 1
      
      console.log('✅ Enhanced Figma analysis complete:', {
        file: enhancedFigmaData.fileData.name,
        components: enhancedFigmaData.components.length,
        designTokens: enhancedFigmaData.designTokens,
        assetUrls: Object.keys(enhancedFigmaData.assetUrls).length
      });
      
      setFigmaData({
        fileData: enhancedFigmaData.fileData,
        imageUrl: enhancedFigmaData.imageUrl,
        components: enhancedFigmaData.components
      });
      setDesignTokens(enhancedFigmaData.designTokens);
      
      // Map components to Material-UI with proper styling
      console.log('🎭 [PROCESSOR] Mapping Figma components to Material-UI with enhanced styling...');
      let styleMap;
      try {
        styleMap = styleMapperService.mapComponentsToMui(
          enhancedFigmaData.components,
          enhancedFigmaData.designTokens,
          enhancedFigmaData.assetUrls
        );
        setStyleMapping(styleMap);
        
        console.log('✅ [PROCESSOR] Style mapping complete:', {
          mappedComponents: styleMap.components.length,
          designSystem: styleMap.designSystem
        });
      } catch (styleMapError) {
        console.error('❌ [PROCESSOR] Style mapping failed:', styleMapError);
        throw styleMapError;
      }
      
      // Step 4: AI Content Mapping - Bridge Real Content to Semantic Sections
      setActiveStep(3);
      await delay(1500);
      
      console.log('🔄 Stage 2: AI Content Mapping - solving the "Rectangle" problem...');
      console.log('🧠 Mapping real Figma content to semantic sections:', {
        interfaceType: contextAnalysis.interfaceType,
        figmaComponents: enhancedFigmaData.components.length,
        assetUrls: Object.keys(enhancedFigmaData.assetUrls).length
      });
      
      // AI Content Mapping - This solves the "Rectangle" placeholder problem
      const contentMappingResult = await aiContentMappingService.mapContentToSemanticSections(
        contextAnalysis,
        enhancedFigmaData.components,
        enhancedFigmaData.assetUrls
      );
      setContentMapping(contentMappingResult);
      
      console.log(`✅ Stage 2 Complete: ${contentMappingResult.mappings.length} content mappings created`);
      console.log(`- Content mapping confidence: ${(contentMappingResult.confidence * 100).toFixed(0)}%`);
      console.log(`- Text content found: ${contentMappingResult.summary.textContentFound}`);
      console.log(`- Image content found: ${contentMappingResult.summary.imageContentFound}`);

      // Step 5: AI Semantic Component Recognition - Transform basic shapes into meaningful components
      setActiveStep(4);
      await delay(2000);
      
      console.log('🔍 Stage 3: AI Semantic Component Recognition - the missing intelligence layer...');
      console.log('🧠 Analyzing components semantically like human visual recognition:', {
        basicComponents: enhancedFigmaData.components.length,
        interfaceType: contextAnalysis.interfaceType,
        domain: contextAnalysis.domain,
        realContentFound: contentMappingResult.summary.textContentFound + contentMappingResult.summary.imageContentFound
      });
      
      // AI Semantic Component Recognition - This transforms RECTANGLE/INSTANCE into avatar/product_image/pill_badge
      const semanticComponentResult = await aiSemanticComponentService.analyzeComponentsSemantics(
        enhancedFigmaData.components,
        contextAnalysis,
        contentMappingResult,
        enhancedFigmaData.assetUrls
      );
      setSemanticComponentAnalysis(semanticComponentResult);
      
      console.log(`✅ Stage 3 Complete: ${semanticComponentResult.components.length} semantic components identified`);
      console.log(`- Semantic recognition confidence: ${(semanticComponentResult.confidence * 100).toFixed(0)}%`);
      console.log(`- Avatars found: ${semanticComponentResult.summary.avatarsFound}`);
      console.log(`- Product images found: ${semanticComponentResult.summary.productImagesFound}`);
      console.log(`- Icons found: ${semanticComponentResult.summary.iconsFound}`);
      console.log(`- Pills/badges found: ${semanticComponentResult.summary.pillsFound}`);
      console.log(`- Cards found: ${semanticComponentResult.summary.cardsFound}`);

      // Step 6: AI-Guided Semantic Grouping (Using Context + Content Mapping + Semantic Components)
      setActiveStep(5);
      await delay(2000);
      
      console.log('🔍 Stage 4: Running AI-guided semantic grouping with content mapping and semantic components...');
      console.log('🧠 Using AI context, content mapping, and semantic component analysis:', {
        interfaceType: contextAnalysis.interfaceType,
        expectedSections: contextAnalysis.semanticSections.length,
        mappedContent: contentMappingResult.mappings.length,
        semanticComponents: semanticComponentResult.components.length,
        userJourney: contextAnalysis.userJourney
      });
      
      // Enhanced semantic grouping guided by AI context analysis and content mapping
      // TODO: Implement groupComponentsWithContext method that uses the AI context and content mapping
      const semanticGroupingResult = await semanticGroupingService.groupComponents(
        enhancedFigmaData.fileData, 
        enhancedFigmaData.components
      );
      setSemanticGrouping(semanticGroupingResult);
      
      console.log(`✅ Stage 4 Complete: ${semanticGroupingResult.groups.length} semantic groups identified`);
      console.log(`- Confidence: ${(semanticGroupingResult.confidence * 100).toFixed(0)}%`);
      console.log(`- Processing time: ${semanticGroupingResult.processingTime}ms`);
      
      // Step 7: AI-Enhanced Component Mapping (Context + Content + Semantic Components + Vision + Semantic Groups)
      setActiveStep(6);
      await delay(1000);
      
      // First, test if GPT Vision API is working at all
      console.log('🧪 Testing GPT Vision API connectivity...');
      try {
        await gptVisionService.testGPTVisionAPI();
        console.log('✅ GPT Vision API test successful');
      } catch (apiError: any) {
        console.error('❌ GPT Vision API test failed:', apiError);
        throw new Error(`GPT Vision API is not working: ${apiError?.message || apiError}`);
      }

      // Stage 5: Enhanced GPT Vision analysis with AI context, content mapping, semantic components, and semantic groups
      console.log('🎨 Stage 5: Running AI-enhanced component mapping with complete intelligence...');
      console.log('🧠 Using complete AI pipeline for intelligent component mapping:', {
        contextConfidence: contextAnalysis.analysisConfidence,
        contentMappings: contentMappingResult.mappings.length,
        semanticComponents: semanticComponentResult.components.length,
        semanticGroups: semanticGroupingResult.groups.length,
        interfaceType: contextAnalysis.interfaceType,
        realContentFound: contentMappingResult.summary.textContentFound + contentMappingResult.summary.imageContentFound
      });
      
      const gptAnalysis = await gptVisionService.analyzeSemanticGroups(
        enhancedFigmaData.fileData,
        enhancedFigmaData.imageUrl,
        semanticGroupingResult
      );

      setAnalysis(gptAnalysis);
      console.log(`✅ Stage 5 Complete: ${gptAnalysis.components.length} components validated`);
      console.log(`- Final confidence: ${(gptAnalysis.confidence * 100).toFixed(0)}%`);
      
      // Store analysis data with enhanced styling, AI context, content mapping, and semantic components
      const analysisData = {
        fileData: enhancedFigmaData.fileData,
        imageUrl: enhancedFigmaData.imageUrl,
        components: enhancedFigmaData.components,
        designTokens: enhancedFigmaData.designTokens,
        assetUrls: enhancedFigmaData.assetUrls,
        styleMapping: styleMap,
        aiContextAnalysis: contextAnalysis,
        contentMapping: contentMappingResult,
        semanticComponentAnalysis: semanticComponentResult
      };
      setFigmaData(analysisData);

      // Step 8: AI-Intelligent Code Generation with Real Content and Semantic Components
      setActiveStep(7);
      await delay(2000);
      
      console.log('🚀 [PROCESSOR] Stage 6: AI-Intelligent Code Generation with semantic components...');
      console.log('🧠 Using complete AI pipeline including semantic component recognition:', {
        contextAnalysis: !!contextAnalysis,
        contentMapping: !!contentMappingResult,
        semanticComponentAnalysis: !!semanticComponentResult,
        gptAnalysis: !!gptAnalysis,
        semanticGrouping: !!semanticGroupingResult,
        styleMap: !!styleMap,
        designTokens: !!enhancedFigmaData.designTokens,
        assetUrls: !!enhancedFigmaData.assetUrls,
        styleMapComponents: styleMap?.components?.length || 0,
        contentMappings: contentMappingResult.mappings.length,
        semanticComponents: semanticComponentResult.components.length,
        avatarsFound: semanticComponentResult.summary.avatarsFound,
        productImagesFound: semanticComponentResult.summary.productImagesFound,
        realTextContent: contentMappingResult.summary.textContentFound,
        realImageContent: contentMappingResult.summary.imageContentFound,
        interfaceType: contextAnalysis.interfaceType,
        expectedSections: contextAnalysis.semanticSections.length
      });
      
      // Enhanced code generation with semantic component understanding
      const reactCode = generateEnhancedReactCode(
        gptAnalysis, 
        semanticGroupingResult,
        styleMap,
        enhancedFigmaData.designTokens,
        enhancedFigmaData.assetUrls,
        contentMappingResult,
        contextAnalysis,
        semanticComponentResult
      );
      
      console.log('📝 [PROCESSOR] Content-aware AI-generated code length:', reactCode.length);
      console.log('🎯 [PROCESSOR] Content-aware code preview:', reactCode.substring(0, 500) + '...');
      
      setGeneratedCode(reactCode);
      setConfidence(Math.min(
        gptAnalysis.confidence, 
        contextAnalysis.analysisConfidence,
        contentMappingResult.confidence,
        semanticComponentResult.confidence
      ));

      // Step 9: Complete
      setActiveStep(8);

      // Update screen in database
      updateScreen({
        resource: 'screens',
        id: screen.id,
        values: {
          current_code: reactCode,
          status: 'ready',
          confidence_score: gptAnalysis.confidence,
          iteration_count: 1,
          analysis_data: {
            figmaData: analysisData,
            semanticGrouping: semanticGroupingResult,
            gptAnalysis: gptAnalysis
          },
          original_image_url: enhancedFigmaData.imageUrl
        }
      }, {
        onSuccess: () => {
          // Create initial generation session with unique timestamp
          createSession({
            resource: 'vibe_sessions',
            values: {
              screen_id: screen.id,
              session_type: 'initial_generation',
              ai_response: `Initial code generated from Figma design "${enhancedFigmaData.fileData.name}". Identified ${gptAnalysis.components.length} components with ${(gptAnalysis.confidence * 100).toFixed(0)}% confidence.`,
              generated_code: reactCode,
              ai_provider: 'gpt-4-vision',
              confidence_score: gptAnalysis.confidence,
              is_accepted: true
            },
            successNotification: false, // Disable notification to prevent duplicates
            errorNotification: false
          }, {
            onSuccess: () => {
              setIsProcessing(false);
              onComplete();
            },
            onError: (error) => {
              console.error('Failed to create session:', error);
              setIsProcessing(false);
              onComplete(); // Complete anyway since screen was updated
            }
          });
        },
        onError: (error) => {
          console.error('Failed to update screen:', error);
          setError('Failed to save generated code');
          setIsProcessing(false);
          
          // Update screen status to error - separate operation to avoid conflicts
          setTimeout(() => {
            updateScreen({
              resource: 'screens',
              id: screen.id,
              values: { status: 'error' },
              successNotification: false, // Disable notification to prevent duplicates
              errorNotification: false
            });
          }, 100);
        }
      });

    } catch (err: any) {
      setError(err.message || 'Processing failed. Please try again.');
      setIsProcessing(false);
      
      updateScreen({
        resource: 'screens',
        id: screen.id,
        values: { status: 'error' }
      });
    }
  };

  const delay = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  const generateReactCodeFromAnalysis = (analysis: GPTVisionAnalysis, semanticGroupingResult?: any): string => {
    console.log('⚠️ [OLD GENERATION] WARNING: Using OLD generateReactCodeFromAnalysis function!');
    console.log('🚨 [OLD GENERATION] This should NOT be called if enhanced pipeline is working');
    
    const { components, layout, designSystem } = analysis;
    
    console.log('🎨 [OLD GENERATION] React Generation:', {
      hasSemanticGrouping: !!semanticGroupingResult,
      groupCount: semanticGroupingResult?.groups?.length || 0,
      componentCount: components.length
    });
    
    // Generate imports based on identified components
    const imports = new Set(['React', 'Box', 'Typography', 'Button', 'Card', 'CardContent', 'IconButton']);
    
    // Add more imports based on component types
    components.forEach(comp => {
      if (comp.materialUIMapping?.component) {
        imports.add(comp.materialUIMapping.component);
      }
    });

    const importStatement = `import React from 'react';
import {
  ${Array.from(imports).filter(imp => imp !== 'React').join(',\n  ')}
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';`;

    // Generate component JSX using semantic grouping structure if available
    const componentJSX = generateImprovedComponentJSX(components, layout);

    // Convert background color properly
    const backgroundColor = convertFigmaColorToCSS(designSystem.colors.background) || '#ffffff';

    return `${importStatement}

const GeneratedFigmaScreen = () => {
  return (
    <Box sx={{
      minHeight: '100vh',
      backgroundColor: '${backgroundColor}',
      fontFamily: '${designSystem.typography.fontFamily || 'Roboto'}',
      p: 3,
      maxWidth: '375px',
      mx: 'auto'
    }}>
      ${componentJSX}
    </Box>
  );
};

export default GeneratedFigmaScreen;`;
  };

  /**
   * Enhanced React code generation using comprehensive styling data
   */
  const generateEnhancedReactCode = (
    analysis: GPTVisionAnalysis, 
    semanticGroupingResult: any,
    styleMapping: StyleMapping,
    designTokens: any,
    assetUrls: { [nodeId: string]: string },
    contentMapping: EnhancedContentMapping,
    contextAnalysis: AIContextAnalysis,
    semanticComponentAnalysis: SemanticComponentAnalysis
  ): string => {
    console.log('🎨 [ENHANCED GENERATION] Starting enhanced React generation');
    console.log('📊 [ENHANCED GENERATION] Input parameters:', {
      analysisComponents: analysis?.components?.length || 0,
      semanticGroups: semanticGroupingResult?.groups?.length || 0,
      mappedComponents: styleMapping?.components?.length || 0,
      designTokensColors: designTokens?.colors?.length || 0,
      assetUrls: Object.keys(assetUrls).length,
      contentMappings: contentMapping?.mappings?.length || 0,
      realTextContent: contentMapping?.summary?.textContentFound || 0,
      realImageContent: contentMapping?.summary?.imageContentFound || 0
    });
    
    console.log('🎯 [ENHANCED GENERATION] Design tokens detail:', designTokens);
    console.log('🎭 [ENHANCED GENERATION] Style mapping detail:', {
      components: styleMapping.components.map(c => ({ name: c.name, muiComponent: c.muiComponent })),
      designSystem: styleMapping.designSystem
    });
    
    console.log('🔄 [ENHANCED GENERATION] Content mapping detail:', {
      mappings: contentMapping.mappings.length,
      confidence: contentMapping.confidence,
      textContent: contentMapping.summary.textContentFound,
      imageContent: contentMapping.summary.imageContentFound,
      sampleMappings: contentMapping.mappings.slice(0, 3).map(m => ({ 
        role: m.semanticRole, 
        content: m.actualContent.text?.substring(0, 50) || m.actualContent.imageUrl?.substring(0, 50) || 'No content'
      }))
    });
    
    console.log('🎯 [ENHANCED GENERATION] Semantic component detail:', {
      components: semanticComponentAnalysis.components.length,
      confidence: semanticComponentAnalysis.confidence,
      avatars: semanticComponentAnalysis.summary.avatarsFound,
      productImages: semanticComponentAnalysis.summary.productImagesFound,
      icons: semanticComponentAnalysis.summary.iconsFound,
      pills: semanticComponentAnalysis.summary.pillsFound,
      cards: semanticComponentAnalysis.summary.cardsFound,
      sampleComponents: semanticComponentAnalysis.components.slice(0, 3).map(c => ({ 
        type: c.semanticType, 
        role: c.contextualRole,
        muiComponent: c.suggestedMuiComponent
      }))
    });

    // Generate imports based on mapped components and semantic components
    const imports = new Set(['React', 'Box', 'Typography', 'Button', 'Card', 'CardContent', 'IconButton', 'Avatar', 'Chip']);
    
    styleMapping.components.forEach(comp => {
      imports.add(comp.muiComponent);
    });
    
    // Add imports based on semantic components
    semanticComponentAnalysis.components.forEach(comp => {
      if (comp.suggestedMuiComponent && comp.suggestedMuiComponent !== 'Box') {
        imports.add(comp.suggestedMuiComponent);
      }
    });

    const importStatement = `import React from 'react';
import {
  ${Array.from(imports).filter(imp => imp !== 'React').join(',\n  ')}
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon 
} from '@mui/icons-material';`;

    // Generate theme object based on design tokens
    const themeColors = {
      primary: styleMapping.designSystem.colors.primary || designTokens.colors.find((c: string) => c.toLowerCase().includes('ff7f00') || c.toLowerCase().includes('ff8c00')) || '#FF8C00',
      secondary: styleMapping.designSystem.colors.secondary || styleMapping.designSystem.colors.border || '#f0f0f0',
      background: styleMapping.designSystem.colors.background || styleMapping.designSystem.colors.surface || '#ffffff',
      text: styleMapping.designSystem.colors.text || styleMapping.designSystem.colors.onSurface || '#000000',
      textSecondary: styleMapping.designSystem.colors.textSecondary || 'text.secondary'
    };

    // Enhanced gradient detection and usage
    const gradients = styleMapping.designSystem.gradients || {};
    const primaryGradient = gradients.primary || gradients.card || 'linear-gradient(135deg, #FF8C00, #FF7F00)';
    
    // Enhanced typography mapping
    const typography = styleMapping.designSystem.typography || {};
    const fontFamily = typography.fontFamily || 'Roboto';
    
    // Enhanced spacing system
    const spacing = styleMapping.designSystem.spacing || {};
    const baseUnit = styleMapping.designSystem.baseUnit || 8;
    
    // Helper function to get spacing value
    const getSpacing = (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'): number => {
      return spacing[size] || {
        xs: baseUnit * 0.5,
        sm: baseUnit,
        md: baseUnit * 2,
        lg: baseUnit * 3,
        xl: baseUnit * 4,
        xxl: baseUnit * 6
      }[size];
    };

    // Helper function to get content by semantic role from content mapping
    const getContentByRole = (role: string): string[] => {
      return contentMapping.mappings
        .filter(m => m.semanticRole.includes(role) || m.businessPurpose.includes(role))
        .map(m => m.actualContent.text || '')
        .filter(text => text.length > 0);
    };

    // Helper function to get content by UI pattern
    const getContentByPattern = (pattern: string): string[] => {
      return contentMapping.mappings
        .filter(m => m.uiPattern.includes(pattern))
        .map(m => m.actualContent.text || '')
        .filter(text => text.length > 0);
    };

    // Helper function to get semantic components by type
    const getSemanticComponentsByType = (semanticType: string) => {
      return semanticComponentAnalysis.components.filter(c => c.semanticType === semanticType);
    };

    // Helper function to generate component JSX based on semantic type
    const generateSemanticComponent = (semanticComponent: any, content?: string): string => {
      const { semanticType, suggestedMuiComponent, styleHints, figmaNodeId } = semanticComponent;
      
      // Get actual asset URL from Figma if available
      const assetUrl = figmaNodeId ? assetUrls[figmaNodeId] : null;
      
      switch (semanticType) {
        case 'avatar':
          return assetUrl ? 
            `<Avatar 
              src="${assetUrl}" 
              sx={{ 
                width: 40, 
                height: 40, 
                ${styleHints.borderRadius ? `borderRadius: '${styleHints.borderRadius}'` : ''} 
              }}
            />` :
            `<Avatar sx={{ 
              width: 40, 
              height: 40, 
              bgcolor: '${themeColors.secondary}',
              ${styleHints.borderRadius ? `borderRadius: '${styleHints.borderRadius}'` : ''} 
            }}>
              <Typography variant="caption" sx={{ fontSize: 12 }}>👤</Typography>
            </Avatar>`;
          
        case 'product_image':
        case 'gallery_item':
          return assetUrl ? 
            `<Box sx={{ 
              width: 80, 
              height: 80, 
              borderRadius: '${styleHints.borderRadius || '8px'}',
              overflow: 'hidden',
              backgroundImage: 'url(${assetUrl})',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }} />` :
            `<Box sx={{ 
              width: 80, 
              height: 80, 
              borderRadius: '${styleHints.borderRadius || '8px'}',
              bgcolor: '${themeColors.secondary}',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              <Typography variant="caption" sx={{ color: '#666', fontSize: 10 }}>📷</Typography>
            </Box>`;
          
        case 'pill_badge':
          // Enhanced pill badge with screen-agnostic content
          const badgeContent = content || 
            semanticComponent.contextualRole || 
            semanticComponent.businessPurpose || 
            'Badge';
          
          return `<Chip 
            label="${badgeContent}" 
            variant="${styleHints.variant || 'filled'}"
            color="${styleHints.color || 'primary'}"
            size="small"
            sx={{ 
              borderRadius: '${styleHints.borderRadius || '16px'}',
              fontFamily: '${fontFamily}',
              bgcolor: '${themeColors.primary}',
              color: '#fff',
              fontWeight: 500,
              px: 1
            }}
          />`;
          
        case 'icon':
          // Enhanced icon with actual icon or better placeholder
          const iconContent = assetUrl ? 
            `background: url(${assetUrl}) center/contain no-repeat` :
            `'&::before': { content: '"⚡"', fontSize: 16 }`;
            
          return `<IconButton sx={{ 
            width: 32, 
            height: 32,
            bgcolor: '${themeColors.secondary}',
            borderRadius: '${styleHints.borderRadius || '8px'}',
            ${assetUrl ? iconContent : ''},
            '&:hover': { bgcolor: '${themeColors.primary}', transform: 'scale(1.05)' }
          }}>
            ${!assetUrl ? '<Typography sx={{ fontSize: 16 }}>⚡</Typography>' : ''}
          </IconButton>`;
          
        case 'card':
          // Enhanced card with screen-agnostic content  
          const cardContent = content || 
            semanticComponent.contextualRole || 
            semanticComponent.businessPurpose || 
            'Content';
            
          return `<Card sx={{ 
            p: 2,
            borderRadius: '${styleHints.borderRadius || '12px'}',
            elevation: ${styleHints.elevation || 2},
            border: '1px solid ${themeColors.secondary}',
            transition: 'all 0.2s ease',
            '&:hover': { 
              elevation: 4, 
              borderColor: '${themeColors.primary}',
              transform: 'translateY(-2px)'
            }
          }}>
            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
              ${assetUrl ? `<Box sx={{ 
                width: '100%', 
                height: 80, 
                borderRadius: 1, 
                mb: 1,
                backgroundImage: 'url(${assetUrl})',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }} />` : ''}
              <Typography variant="body2" sx={{ fontFamily: '${fontFamily}', fontWeight: 500 }}>
                ${cardContent}
              </Typography>
            </CardContent>
          </Card>`;
          
        case 'button':
          return `<Button 
            variant="${styleHints.variant || 'contained'}"
            color="${styleHints.color || 'primary'}"
            sx={{ 
              borderRadius: '${styleHints.borderRadius || '4px'}',
              fontFamily: '${fontFamily}'
            }}
          >
            ${content || 'Button'}
          </Button>`;
          
        default:
          return `<${suggestedMuiComponent || 'Box'}>
            ${content || 'Component'}
          </${suggestedMuiComponent || 'Box'}>`;
      }
    };

    // Generate enhanced JSX with proper styling using semantic groups AND real content
    const componentJSX = (() => {
      if (!semanticGroupingResult?.groups || semanticGroupingResult.groups.length === 0) {
        return generateImprovedComponentJSX(analysis.components, analysis.layout);
      }

      // Generate sections in order: Header → Content → Summary → Actions
      const orderedSections = [...semanticGroupingResult.groups].sort((a, b) => {
        const order = { 'header': 0, 'content': 1, 'summary': 2, 'action': 3 };
        const aType = a.name.toLowerCase().includes('header') ? 'header' :
                     a.name.toLowerCase().includes('total') || a.name.toLowerCase().includes('summary') ? 'summary' :
                     a.name.toLowerCase().includes('button') || a.name.toLowerCase().includes('pay') || a.name.toLowerCase().includes('action') ? 'action' : 'content';
        const bType = b.name.toLowerCase().includes('header') ? 'header' :
                     b.name.toLowerCase().includes('total') || b.name.toLowerCase().includes('summary') ? 'summary' :
                     b.name.toLowerCase().includes('button') || b.name.toLowerCase().includes('pay') || b.name.toLowerCase().includes('action') ? 'action' : 'content';
        return (order[aType] || 1) - (order[bType] || 1);
      });

      const sections: string[] = [];
      
      orderedSections.forEach(group => {
        const sectionName = group.name.toLowerCase();
        const sectionComponents = group.children || [];
        
        // DYNAMIC SECTION GENERATION - Based on actual content AND semantic components
        if (sectionName.includes('header') || sectionName.includes('top')) {
          // Get real content for header section
          const greetingContent = getContentByRole('user_greeting');
          const navigationContent = getContentByRole('navigation');
          const headerContent = getContentByPattern('header');
          
          // Get semantic components for header
          const avatars = getSemanticComponentsByType('avatar');
          const navigationItems = getSemanticComponentsByType('navigation_item');
          
          // Combine all header-related content
          const allHeaderContent = [...greetingContent, ...navigationContent, ...headerContent];
          
          // Generate header section with real content AND semantic components
          const headerElements: string[] = [];
          
          // Add avatars if found - create avatar gallery
          if (avatars.length > 0) {
            if (avatars.length >= 3) {
              // Create horizontal avatar gallery for multiple avatars
              headerElements.push(`
        <Box sx={{ 
          display: 'flex', 
          gap: 1.5, 
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' }
        }}>
          ${avatars.slice(0, 12).map(avatar => generateSemanticComponent(avatar)).join('\n          ')}
        </Box>`);
            } else {
              // Individual avatars for small numbers
              avatars.forEach(avatar => {
                headerElements.push(generateSemanticComponent(avatar));
              });
            }
          }
          
          // Add text content
          allHeaderContent.forEach(content => {
            headerElements.push(`<Typography variant="h5" sx={{ fontWeight: ${typography.fontWeights?.semiBold || 600}, fontFamily: '${fontFamily}' }}>
                ${content}
              </Typography>`);
          });
          
          // Add navigation items
          navigationItems.forEach(navItem => {
            const navContent = getContentByRole('navigation')[0] || 'Nav';
            headerElements.push(generateSemanticComponent(navItem, navContent));
          });
          
          sections.push(`
      {/* ${group.name} */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        ${headerElements.join('\n        ')}
      </Box>`);
        } else if (sectionName.includes('content') || sectionName.includes('main')) {
          // Get real content for main content section
          const sectionTitleContent = getContentByRole('section_title');
          const contentItems = getContentByRole('content');
          const productContent = getContentByRole('product');
          
          // Get semantic components for content section
          const productImages = getSemanticComponentsByType('product_image');
          const galleryItems = getSemanticComponentsByType('gallery_item');
          const cards = getSemanticComponentsByType('card');
          
          // Combine content items and semantic components
          const allContentItems = [...contentItems, ...productContent];
          const allSemanticItems = [...productImages, ...galleryItems, ...cards];
          
          // Get a section title if available
          const sectionTitle = sectionTitleContent.length > 0 ? sectionTitleContent[0] : '';
          
          // Generate content elements
          const contentElements: string[] = [];
          
          // Add text content as cards
          allContentItems.forEach(content => {
            contentElements.push(`
        <Card 
          variant="outlined" 
          sx={{ 
            p: 2, 
            cursor: 'pointer',
            '&:hover': { borderColor: '${themeColors.primary}' },
            textAlign: 'center',
            borderRadius: 1
          }}
        >
          <Box sx={{ width: 40, height: 40, mx: 'auto', mb: 1, bgcolor: '${themeColors.secondary}', borderRadius: 1 }} />
          <Typography variant="body2" sx={{ fontFamily: '${fontFamily}' }}>${content}</Typography>
        </Card>`);
          });
          
          // Add semantic components
          allSemanticItems.forEach(semanticItem => {
            contentElements.push(generateSemanticComponent(semanticItem));
          });
          
          // Safe grid layout calculation - adjust for semantic components
          const totalItems = Math.max(allContentItems.length, allSemanticItems.length, 2);
          const gridColumns = totalItems > 2 ? 'repeat(2, 1fr)' : '1fr';
          
          // Special handling for product galleries (horizontal scroll)
          if (productImages.length >= 3) {
            sections.push(`
      {/* ${group.name} - Gallery */}
      ${sectionTitle ? `<Typography variant="h6" sx={{ mb: 2, fontWeight: ${typography.fontWeights?.medium || 500}, fontFamily: '${fontFamily}' }}>
        ${sectionTitle}
      </Typography>` : ''}
      
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        overflowX: 'auto',
        mb: 3,
        pb: 1,
        scrollbarWidth: 'thin',
        '&::-webkit-scrollbar': { height: 4 },
        '&::-webkit-scrollbar-thumb': { bgcolor: '${themeColors.secondary}', borderRadius: 2 }
      }}>
        ${productImages.slice(0, 8).map(item => generateSemanticComponent(item)).join('\n        ')}
      </Box>`);
          } else {
            sections.push(`
      {/* ${group.name} */}
      ${sectionTitle ? `<Typography variant="h6" sx={{ mb: 2, fontWeight: ${typography.fontWeights?.medium || 500}, fontFamily: '${fontFamily}' }}>
        ${sectionTitle}
      </Typography>` : ''}
      
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: '${gridColumns}', 
        gap: 2, 
        mb: 3 
      }}>
        ${contentElements.join('')}
      </Box>`);
          }
        } else if (sectionName.includes('info') || sectionName.includes('total') || sectionName.includes('summary')) {
          // Get real content for info/summary section
          const infoLabels = getContentByRole('info') || getContentByPattern('label');
          const infoValues = getContentByRole('value') || getContentByRole('status');
          
          // Use actual content or fallback to meaningful defaults
          const labelText = infoLabels.length > 0 ? infoLabels[0] : 'Info:';
          const valueText = infoValues.length > 0 ? infoValues[0] : 'Value';
          
          sections.push(`
      {/* ${group.name} */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3,
        py: 1
      }}>
        <Typography variant="h6" sx={{ color: '${themeColors.textSecondary}', fontFamily: '${fontFamily}' }}>
          ${labelText}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: ${typography.fontWeights?.bold || 700}, fontFamily: '${fontFamily}' }}>
          ${valueText}
        </Typography>
      </Box>`);
        } else if (sectionName.includes('button') || sectionName.includes('action')) {
          // Get real content for action button
          const actionContent = getContentByRole('action');
          const buttonContent = getContentByPattern('action_button');
          
          // Use actual button text or fallback to meaningful default
          const buttonText = actionContent.length > 0 ? actionContent[0] : 
                           buttonContent.length > 0 ? buttonContent[0] : 'BUTTON';
          
          sections.push(`
      {/* ${group.name} */}
      <Button 
        variant="contained" 
        fullWidth 
        size="large"
        sx={{ 
          py: 1.5,
          fontSize: '1.1rem',
          fontWeight: ${typography.fontWeights?.bold || 700},
          backgroundColor: '${themeColors.primary}',
          fontFamily: '${fontFamily}',
          borderRadius: 1,
          '&:hover': {
            backgroundColor: '${themeColors.primary}dd'
          }
        }}
      >
        ${buttonText}
      </Button>`);
        } else {
          // Generic section generation for unrecognized sections - use real content
          const sectionContent = getContentByRole('content');
          const genericContent = getContentByPattern('text_content');
          
          // Combine all available content for this section
          const allSectionContent = [...sectionContent, ...genericContent];
          
          if (allSectionContent.length > 0) {
            sections.push(`
      {/* ${group.name} */}
      <Box sx={{ mb: 3 }}>
        ${allSectionContent.map((content) => `
        <Typography variant="body1" sx={{ fontFamily: '${fontFamily}', mb: 1 }}>
          ${content}
        </Typography>`).join('')}
      </Box>`);
          } else {
            // Fallback if no content is found for this section
            sections.push(`
      {/* ${group.name} */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body1" sx={{ fontFamily: '${fontFamily}', mb: 1 }}>
          Section content will appear here
        </Typography>
      </Box>`);
          }
        }
      });

      return sections.join('\n');
    })();

    const finalCode = `${importStatement}

const GeneratedFigmaScreen = () => {
  return (
    <Box sx={{
      width: '100%',
      maxWidth: '375px',
      minHeight: '812px',
      backgroundColor: '${themeColors.background}',
      fontFamily: 'Roboto, sans-serif',
      p: 2,
      mx: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }}>
      ${componentJSX}
    </Box>
  );
};

export default GeneratedFigmaScreen;`;

    console.log('✅ [ENHANCED GENERATION] Enhanced React code generated successfully');
    console.log('📊 [ENHANCED GENERATION] Final code stats:', {
      length: finalCode.length,
      hasPaymentMethods: finalCode.includes('Payment Method'),
      hasOrangeColor: finalCode.includes('FF8C00') || finalCode.includes('#FF8C00'),
      hasIcons: finalCode.includes('visa-10.svg') || finalCode.includes('mastercard-2.svg'),
      hasGradient: finalCode.includes('linear-gradient')
    });
    
    return finalCode;
  };

  // Helper function to convert Figma colors to CSS
  const convertFigmaColorToCSS = (color: any): string => {
    if (!color) return '#ffffff';
    
    if (typeof color === 'string') return color;
    
    if (color.r !== undefined && color.g !== undefined && color.b !== undefined) {
      const r = Math.round(color.r * 255);
      const g = Math.round(color.g * 255);
      const b = Math.round(color.b * 255);
      const a = color.a !== undefined ? color.a : 1;
      return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
    }
    
    return '#ffffff';
  };

  const generateImprovedComponentJSX = (components: IdentifiedComponent[], layout: any): string => {
    // Group components by type and position
    const buttons = components.filter(c => c.type.toLowerCase().includes('button') || c.name.toLowerCase().includes('button'));
    const texts = components.filter(c => c.type === 'text' || c.properties.text);
    const cards = components.filter(c => c.type === 'card' && c.bounds.width > 100 && c.bounds.height > 50);
    
    let jsx = '';
    
    // Add header section
    const headerTexts = texts.filter(t => t.bounds.y < 100);
    if (headerTexts.length > 0) {
      jsx += `      <Box sx={{ mb: 3 }}>
        ${headerTexts.map(text => `<Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
          ${text.properties.text || text.name}
        </Typography>`).join('\n        ')}
      </Box>\n\n`;
    }
    
    // Add payment methods section
    if (buttons.length > 0) {
      jsx += `      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Payment Methods</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          ${buttons.slice(0, 4).map(btn => `<Button 
            variant="outlined" 
            sx={{ 
              minWidth: '80px',
              height: '60px',
              flexDirection: 'column',
              fontSize: '0.75rem'
            }}
          >
            ${btn.properties.text || btn.name || 'Payment'}
          </Button>`).join('\n          ')}
        </Box>
      </Box>\n\n`;
    }
    
    // Add main content card
    if (cards.length > 0) {
      jsx += `      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Payment Details
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ${texts.find(t => t.bounds.y > 300)?.properties.text || 'Payment method details will appear here'}
          </Typography>
        </CardContent>
      </Card>\n\n`;
    }
    
    // Add total section
    const totalText = texts.find(t => t.name.toLowerCase().includes('total') || (t.properties.text && t.properties.text.includes('$')));
    if (totalText) {
      jsx += `      <Box sx={{ mb: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Total:</Typography>
          <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
            ${totalText.properties.text || '$96'}
          </Typography>
        </Box>
      </Box>\n\n`;
    }
    
    // Add main action button (dynamic content)
    const actionButton = components.find(c => 
      c.name.toLowerCase().includes('button') ||
      (c.properties.characters && c.properties.characters.length < 20)
    );
    
    jsx += `      <Button 
        variant="contained" 
        fullWidth 
        size="large"
        sx={{ py: 1.5, fontSize: '1.1rem' }}
      >
        ${actionButton?.properties?.characters || actionButton?.name || 'Action'}
      </Button>`;
    
    return jsx;
  };

  const getStepIcon = (index: number) => {
    if (index < activeStep) {
      return <CompleteIcon color="success" />;
    } else if (index === activeStep && isProcessing) {
      return <CircularProgress size={20} />;
    } else if (error && index === activeStep) {
      return <ErrorIcon color="error" />;
    } else {
      return <ProcessingIcon color="disabled" />;
    }
  };

  if (screen.status === 'ready' && analysis) {
    return (
      <Box>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CompleteIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="h6">
                Figma Analysis Complete!
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Your Figma design has been successfully analyzed and converted to React code.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
              <Chip 
                label={`Confidence: ${(confidence * 100).toFixed(0)}%`}
                color={confidence > 0.8 ? 'success' : 'warning'}
              />
              <Chip label={`Components: ${analysis.components.length}`} />
              <Chip label={`Layout: ${analysis.layout.structure}`} />
            </Box>
          </CardContent>
        </Card>

        {/* AI Context Analysis Results */}
        {aiContextAnalysis && (
          <Box sx={{ mt: 2 }}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ mr: 1 }}>🧠</Typography>
                <Typography variant="h6">AI Context Analysis</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Interface Understanding
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                        <Chip size="small" label={aiContextAnalysis.interfaceType} color="primary" />
                        <Chip size="small" label={aiContextAnalysis.targetDevice} />
                        <Chip size="small" label={aiContextAnalysis.designStyle} />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {aiContextAnalysis.domain}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Analysis Confidence
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={aiContextAnalysis.analysisConfidence * 100} 
                          sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="body2">
                          {(aiContextAnalysis.analysisConfidence * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Primary Purpose
                      </Typography>
                      <Typography variant="body2">
                        {aiContextAnalysis.primaryPurpose}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Semantic Sections ({aiContextAnalysis.semanticSections.length})
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {aiContextAnalysis.semanticSections.map((section, index) => (
                          <Chip 
                            key={index} 
                            size="small" 
                            label={`${section.name} (${section.priority})`}
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        User Journey
                      </Typography>
                      <Typography variant="body2">
                        {aiContextAnalysis.userJourney.join(' → ')}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}

        {/* Live Preview */}
        {generatedCode && (
          <Box sx={{ mt: 2 }}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <PreviewIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Live Preview</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  This is what your generated React component looks like:
                </Typography>
                <LivePreview 
                  code={generatedCode} 
                  height={500}
                  showEditor={false}
                />
              </AccordionDetails>
            </Accordion>
          </Box>
        )}

        {/* Analysis Details */}
        <Box sx={{ mt: 2 }}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <ComponentIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Identified Components ({analysis.components.length})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Component</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Material-UI</TableCell>
                      <TableCell>Dimensions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analysis.components.map((comp, index) => (
                      <TableRow key={index}>
                        <TableCell>{comp.name}</TableCell>
                        <TableCell>
                          <Chip size="small" label={comp.type} />
                        </TableCell>
                        <TableCell>{comp.materialUIMapping.component}</TableCell>
                        <TableCell>
                          {comp.bounds.width}×{comp.bounds.height}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <PaletteIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Design System</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Colors</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {Object.entries(analysis.designSystem.colors).map(([key, color]) => (
                      <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box 
                          sx={{ 
                            width: 20, 
                            height: 20, 
                            backgroundColor: color,
                            border: '1px solid #ccc',
                            borderRadius: 1
                          }} 
                        />
                        <Typography variant="caption">{key}: {color}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Typography</Typography>
                  <Typography variant="body2">
                    Font: {analysis.designSystem.typography.fontFamily}<br/>
                    Sizes: {analysis.designSystem.typography.sizes.join(', ')}<br/>
                    Weights: {analysis.designSystem.typography.weights.join(', ')}
                  </Typography>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <AnalyticsIcon sx={{ mr: 1 }} />
              <Typography variant="h6">AI Suggestions</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {analysis.suggestions.length > 0 ? (
                <List>
                  {analysis.suggestions.map((suggestion, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={suggestion} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No specific suggestions. The analysis looks good!
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        </Box>
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Processing Figma Design
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Analyzing your Figma file and generating React components...
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            <Button 
              size="small" 
              onClick={startFigmaProcessing}
              sx={{ ml: 2 }}
            >
              Retry
            </Button>
          </Alert>
        )}

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel
                StepIconComponent={() => getStepIcon(index)}
                optional={
                  index === activeStep && isProcessing ? (
                    <Typography variant="caption">
                      Processing...
                    </Typography>
                  ) : null
                }
              >
                {label}
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary">
                  {index === 0 && "Connecting to Figma API and fetching file structure..."}
                  {index === 1 && "Exporting high-resolution images from your Figma frames..."}
                  {index === 2 && "Analyzing design structure with GPT Vision..."}
                  {index === 3 && "Identifying UI components and mapping to Material-UI..."}
                  {index === 4 && "Generating React component code with proper styling..."}
                  {index === 5 && "Ready for vibe-coding! You can now chat to refine your design."}
                </Typography>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {activeStep === steps.length - 1 && !isProcessing && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="success">
              <Typography variant="body2">
                Figma processing completed with {(confidence * 100).toFixed(0)}% confidence.
                Start vibe-coding to refine your design!
              </Typography>
            </Alert>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default FigmaToCodeProcessor; 