import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  FormControl,
  FormLabel,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Tabs,
  Tab,
  IconButton,
  Snackbar,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  Send, 
  Description, 
  Code, 
  Save, 
  Download,
  ContentCopy,
  PlayArrow,
  Refresh,
  ExpandMore,
  Palette,
  Image as ImageIcon,
  TextFormat,
  Close
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import Editor from '@monaco-editor/react';
import { LiveProvider, LiveError, LivePreview, withLive } from 'react-live';
import { queryClaude, ClaudeRequest, ClaudeResponse } from '../../services/claude';
import FigmaService, { ComponentAnalysis, DesignTokens, FigmaAnalysisResult, ComponentBounds, BoundsMatchingResult, ComponentMatchCandidates, NodeMatchCandidate } from '../../services/figmaService';
import * as MuiComponents from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import { 
  Google, 
  Microsoft, 
  Visibility, 
  VisibilityOff
} from '@mui/icons-material';
import { CLAUDE_ANALYSIS_PROMPT } from './prompt';
import { CLAUDE_ENHANCEMENT_PROMPT } from './enhancement-prompt';
import { CLAUDE_COMPONENT_EXTRACTION_PROMPT } from './component-extraction-prompt';

// Component extraction types
interface ExtractedComponent {
  name: string;
  type: 'atom' | 'molecule' | 'organism' | 'template';
  category: 'button' | 'form' | 'navigation' | 'display' | 'layout' | 'interactive';
  description: string;
  reusabilityScore: number;
  code: string;
  props: {
    required: string[];
    optional: string[];
  };
  dependencies: string[];
  styling: string;
  functionality: string;
  // NEW: Add visual matching data
  visualBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  visualAnalysis?: {
    colors: string[];
    gradients: string[];
    shadows: string[];
    borders: string[];
    typography: string[];
    spacing: string[];
    backgroundImage?: string;
  };
}

// NEW: Visual matching analysis result
interface VisualMatchingResult {
  componentName: string;
  stylingGaps: {
    colors: string[];
    gradients: string[];
    shadows: string[];
    borders: string[];
    typography: string[];
    spacing: string[];
    images: string[];
  };
  recommendedFixes: string[];
  confidenceScore: number;
}

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const scope = {
  React,
  useState: React.useState,
  useCallback: React.useCallback,
  useEffect: React.useEffect,
  useMemo: React.useMemo,
  ...MuiComponents,
  ...MuiIcons,
  // Explicitly add commonly used icons for generated components
  Google,
  Microsoft,
  Visibility,
  VisibilityOff,
  // Add more common icons with their proper names
  GoogleIcon: Google,
  MicrosoftIcon: Microsoft,
  VisibilityIcon: Visibility,
  VisibilityOffIcon: VisibilityOff,
};

const prepareCodeForPreview = (code: string): string => {
  try {
    // Remove all import statements
    let cleanCode = code.replace(/import\s+[^;]+;?\s*/g, '');
    
    // Remove export statements
    cleanCode = cleanCode.replace(/export\s+(default\s+)?/g, '');
    
    // Find the component name
    const componentNameMatch = cleanCode.match(/(?:const|function)\s+(\w+)\s*[=\(]/);
    const componentName = componentNameMatch ? componentNameMatch[1] : 'GeneratedComponent';
    
    // Clean up any remaining semicolons at the start
    cleanCode = cleanCode.replace(/^\s*;\s*/, '');
    
    // Trim whitespace
    cleanCode = cleanCode.trim();
    
    // For React Live with noInline=true, we need to call render() to render the component
    if (!cleanCode.includes('render(')) {
      cleanCode += `\n\nrender(<${componentName} />);`;
    }
    
    return cleanCode;
  } catch (error) {
    console.error('Error preparing code for preview:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `
      const ErrorComponent = () => {
        return React.createElement('div', { 
          style: { padding: '20px', backgroundColor: '#fee', color: '#c33', fontFamily: 'monospace' } 
        }, 'Error preparing code for preview: ' + ${JSON.stringify(errorMessage)});
      };
      
      render(React.createElement(ErrorComponent));
    `;
  }
};

// Helper function to extract unique style patterns from component code
const extractStylePatterns = (componentCode: string): string[] => {
  const patterns: string[] = [];
  
  // Extract CSS property patterns from sx prop
  const sxMatches = componentCode.match(/sx=\{[^}]*\}/g);
  if (sxMatches) {
    sxMatches.forEach(sxMatch => {
      // Extract individual style properties
      const propMatches = sxMatch.match(/(\w+):\s*[^,}]+/g);
      if (propMatches) {
        propMatches.forEach(prop => {
          const cleanProp = prop.trim();
          if (cleanProp.length > 5) { // Only include meaningful patterns
            patterns.push(cleanProp);
          }
        });
      }
    });
  }
  
  // Extract other distinctive patterns
  const otherPatterns = [
    ...componentCode.match(/variant="[^"]*"/g) || [],
    ...componentCode.match(/startIcon=\{[^}]*\}/g) || [],
    ...componentCode.match(/endIcon=\{[^}]*\}/g) || [],
    ...componentCode.match(/fullWidth/g) || [],
    ...componentCode.match(/component="[^"]*"/g) || [],
  ];
  
  patterns.push(...otherPatterns);
  
  // Return unique patterns
  return [...new Set(patterns)];
};

// Helper function to calculate how well a potential match scores against style patterns
const calculateStyleMatchScore = (elementCode: string, stylePatterns: string[]): number => {
  let score = 0;
  
  stylePatterns.forEach((pattern: string) => {
    if (elementCode.includes(pattern)) {
      score += 1;
    }
  });
  
  return score;
};



export const Test1List = () => {
  const [mode, setMode] = useState<'description' | 'code-generation'>('description');
  const [figmaPat, setFigmaPat] = useState(import.meta.env.VITE_FIGMA_PAT || '');
  const [figmaUrl, setFigmaUrl] = useState('https://www.figma.com/design/CbS1cPHwdvmOJfPJFzKodU/Forkable-Testing-V3?node-id=96-404&m=draw');
  const [figmaImageUrl, setFigmaImageUrl] = useState<string | null>(null);
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ClaudeResponse | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Enhanced Figma data state
  const [figmaData, setFigmaData] = useState<FigmaAnalysisResult | null>(null);
  const [designTokens, setDesignTokens] = useState<DesignTokens | null>(null);
  const [assetUrls, setAssetUrls] = useState<{ [nodeId: string]: string }>({});
  const [enhancedCode, setEnhancedCode] = useState<string>('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Component extraction state
  const [extractedComponents, setExtractedComponents] = useState<ExtractedComponent[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [componentFilter, setComponentFilter] = useState<'all' | 'atom' | 'molecule' | 'organism' | 'template'>('all');
  const [componentSearch, setComponentSearch] = useState('');
  
  // Component preview state
  const [previewComponent, setPreviewComponent] = useState<ExtractedComponent | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewProps, setPreviewProps] = useState<Record<string, any>>({});
  
  // Component enhancement state
  const [enhancedComponents, setEnhancedComponents] = useState<Map<string, ExtractedComponent>>(new Map());
  const [currentEnhancement, setCurrentEnhancement] = useState<ExtractedComponent | null>(null);
  const [isEnhancingComponent, setIsEnhancingComponent] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // NEW: Visual matching state
  const [visualMatchingResults, setVisualMatchingResults] = useState<VisualMatchingResult[]>([]);
  const [isAnalyzingVisuals, setIsAnalyzingVisuals] = useState(false);
  const [selectedComponentForVisualMatch, setSelectedComponentForVisualMatch] = useState<ExtractedComponent | null>(null);
  
  // NEW: Component highlighting state
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [highlightMode, setHighlightMode] = useState(false);
  const [originalGeneratedCode, setOriginalGeneratedCode] = useState<string>('');
  
  // NEW: Bounds matching state
  const [boundsMatchingResults, setBoundsMatchingResults] = useState<BoundsMatchingResult | null>(null);
  const [isMatchingBounds, setIsMatchingBounds] = useState(false);
  const [componentBounds, setComponentBounds] = useState<ComponentBounds[]>([]);
  const [figmaComponents, setFigmaComponents] = useState<ComponentAnalysis[]>([]);
  const [nodeImages, setNodeImages] = useState<Record<string, string>>({});

  // Add event listener for visual component selection
  useEffect(() => {
    const handleComponentSelection = (event: CustomEvent) => {
      const componentName = event.detail;
      console.log('🎯 Component selected from visual selector:', componentName);
      setSelectedComponentId(componentName);
    };

    window.addEventListener('componentSelected', handleComponentSelection as EventListener);
    
    return () => {
      window.removeEventListener('componentSelected', handleComponentSelection as EventListener);
    };
  }, []);

  // Update visual selector when selectedComponentId changes
  useEffect(() => {
    // Trigger update of visual selector overlay
    window.dispatchEvent(new CustomEvent('updateSelectedOverlay'));
  }, [selectedComponentId]);

  const handleFetchFigmaImage = async () => {
    if (!figmaPat.trim() || !figmaUrl.trim()) {
      setSnackbarMessage('Please enter both Figma PAT and URL');
      setSnackbarOpen(true);
      return;
    }

    setIsFetchingImage(true);
    try {
      // Create service instance
      const figmaService = new FigmaService(figmaPat);
      
      // Extract file ID and node ID from URL
      const fileId = figmaService.extractFileKey(figmaUrl);
      const nodeId = figmaService.extractNodeId(figmaUrl);
      
      console.log('Extracted File ID:', fileId);
      console.log('Extracted Node ID:', nodeId);
      
      // Use enhanced analysis to get both image and design tokens
      const analysisResult = await figmaService.analyzeFileWithAssets(fileId, nodeId);
      
      // Store the comprehensive data
      setFigmaData(analysisResult);
      setDesignTokens(analysisResult.designTokens);
      setAssetUrls(analysisResult.assetUrls);
      setFigmaImageUrl(analysisResult.imageUrl);
      
      setSnackbarMessage('Figma data fetched successfully with design tokens!');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error fetching Figma data:', error);
      setSnackbarMessage(`Failed to fetch Figma data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSnackbarOpen(true);
    } finally {
      setIsFetchingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!figmaImageUrl) {
      setSnackbarMessage('Please fetch an image from Figma first!');
      setSnackbarOpen(true);
      return;
    }

    setIsLoading(true);
    setResponse(null);

    // Convert Figma image URL to File object for Claude API
    try {
      const response = await fetch(figmaImageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'figma-screenshot.png', { type: 'image/png' });

      const request: ClaudeRequest = {
        prompt: CLAUDE_ANALYSIS_PROMPT,
        image: file,
        mode: mode
      };

      const result = await queryClaude(request);
      setResponse(result);
      
      if (mode === 'code-generation' && result.code) {
        setGeneratedCode(result.code);
        setOriginalGeneratedCode(result.code); // Save original for version toggle
        setActiveTab(1); // Switch to code/preview tab
        
        // Reset component selection state
        setSelectedComponentId(null);
        setHighlightMode(false);
        
        // Show enhancement suggestion if design tokens are available
        if (designTokens && designTokens.colors.length > 0) {
          setTimeout(() => {
            setSnackbarMessage('💡 Use "Enhance with Design Tokens" to apply real colors and styling!');
            setSnackbarOpen(true);
          }, 2000);
        }
      }
    } catch (error) {
      setResponse({
        content: '',
        error: 'Failed to query Claude. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setFigmaImageUrl(null);
    setResponse(null);
    setGeneratedCode('');
    setOriginalGeneratedCode('');
    setActiveTab(0);
    // Clear enhanced data
    setFigmaData(null);
    setDesignTokens(null);
    setAssetUrls({});
    setEnhancedCode('');
    // Clear component extraction data
    setExtractedComponents([]);
    setComponentFilter('all');
    setComponentSearch('');
    // Clear highlighting state
    setSelectedComponentId(null);
    setHighlightMode(false);
    // Clear visual matching data
    setVisualMatchingResults([]);
  };

  const handleModeChange = (event: React.MouseEvent<HTMLElement>, newMode: 'description' | 'code-generation' | null) => {
    if (newMode !== null) {
      setMode(newMode);
      setResponse(null);
      setGeneratedCode('');
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    setGeneratedCode(value || '');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setSnackbarMessage('Code copied to clipboard!');
    setSnackbarOpen(true);
  };

  const handleSaveCode = () => {
    const blob = new Blob([generatedCode], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'GeneratedComponent.tsx';
    a.click();
    URL.revokeObjectURL(url);
    setSnackbarMessage('Code saved as file!');
    setSnackbarOpen(true);
  };

  const handleRefreshPreview = () => {
    // Force re-render by updating the key
    setActiveTab(1);
  };

  const handleEnhanceCode = async () => {
    if (!generatedCode || !designTokens) {
      setSnackbarMessage('Please generate code and fetch design tokens first!');
      setSnackbarOpen(true);
      return;
    }

    setIsEnhancing(true);
    try {
      // Create comprehensive enhancement prompt with design tokens
      const enhancementPrompt = `
${CLAUDE_ENHANCEMENT_PROMPT
  .replace('{DESIGN_TOKEN_COLORS}', designTokens.colors.join(', '))
  .replace('{DESIGN_TOKEN_FONT_FAMILIES}', designTokens.fontFamilies.join(', '))
  .replace('{DESIGN_TOKEN_FONT_SIZES}', designTokens.fontSizes.join('px, ') + 'px')
  .replace('{DESIGN_TOKEN_FONT_WEIGHTS}', designTokens.fontWeights.join(', '))
  .replace('{DESIGN_TOKEN_SPACING}', designTokens.spacing.join('px, ') + 'px')
  .replace('{DESIGN_TOKEN_IMAGES}', Object.entries(assetUrls).map(([nodeId, url]) => `- ${nodeId}: ${url}`).join('\n'))
  .replace('{DESIGN_TOKEN_GRADIENTS}', designTokens.gradients.join(', '))}

## EXISTING COMPONENT CODE TO ENHANCE:

\`\`\`typescript
${generatedCode}
\`\`\`

## TASK:
Apply the design tokens above to enhance the styling of this component while preserving its perfect structure and layout.
      `;

      const request: ClaudeRequest = {
        prompt: enhancementPrompt,
        mode: 'code-generation'
      };

      const result = await queryClaude(request);
      if (result.code) {
        setEnhancedCode(result.code);
        setGeneratedCode(result.code); // Update the main code
        setSnackbarMessage('Code enhanced with real design tokens!');
        setSnackbarOpen(true);
      }
    } catch (error) {
      setSnackbarMessage(`Failed to enhance code: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSnackbarOpen(true);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleExtractComponents = async () => {
    if (!generatedCode) {
      setSnackbarMessage('Please generate code first to extract components!');
      setSnackbarOpen(true);
      return;
    }

    setIsExtracting(true);
    try {
      const extractionPrompt = `
${CLAUDE_COMPONENT_EXTRACTION_PROMPT}

## REACT COMPONENT CODE TO ANALYZE:

\`\`\`typescript
${generatedCode}
\`\`\`

## TASK:
Analyze the code above and extract all individual reusable components following the methodology outlined. 

## CRITICAL OUTPUT FORMAT:
Return ONLY a valid JSON array of component objects. No explanations, no markdown, no additional text.
Start your response immediately with [ and end with ]. Use the exact format specified in the prompt.

Example format:
[
  {
    "name": "ComponentName",
    "type": "atom",
    "category": "button",
    "description": "Description here",
    "reusabilityScore": 8,
    "code": "JSX code here",
    "props": {"required": [], "optional": []},
    "dependencies": ["Button"],
    "styling": "Styling description",
    "functionality": "Functionality description"
  }
]
      `;

      const request: ClaudeRequest = {
        prompt: extractionPrompt,
        mode: 'code-generation'
      };

      const result = await queryClaude(request);
      if (result.content) {
        let jsonString = '';
        try {
          console.log('Raw Claude response:', result.content);
          
          // Try multiple parsing strategies
          
          // Strategy 1: Look for JSON in code blocks
          const codeBlockMatch = result.content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
          if (codeBlockMatch) {
            jsonString = codeBlockMatch[1];
          } else {
            // Strategy 2: Look for raw JSON array
            const jsonMatch = result.content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              jsonString = jsonMatch[0];
            } else {
              // Strategy 3: Try to find JSON-like structure
              const objectsMatch = result.content.match(/\{[\s\S]*\}/);
              if (objectsMatch) {
                // If we found objects but not an array, wrap in array
                jsonString = `[${objectsMatch[0]}]`;
              }
            }
          }
          
          if (jsonString) {
            console.log('Extracted JSON string:', jsonString);
            
            // Pre-process the JSON to handle template literals
            let processedJsonString = jsonString;
            
            // Convert template literals to regular strings
            // Replace `...` with "..." but be careful about nested quotes
            processedJsonString = processedJsonString.replace(/`([^`]*)`/g, (match, content) => {
              // Escape quotes in the content
              const escapedContent = content.replace(/"/g, '\\"');
              return `"${escapedContent}"`;
            });
            
            console.log('Processed JSON string:', processedJsonString);
            
            let components: ExtractedComponent[] = [];
            
            // Try parsing with multiple strategies
            try {
              components = JSON.parse(processedJsonString) as ExtractedComponent[];
            } catch (firstError) {
              console.warn('First parsing attempt failed, trying fallback...', firstError);
              
              // Fallback: Try parsing the original without template literal processing
              try {
                components = JSON.parse(jsonString) as ExtractedComponent[];
              } catch (secondError) {
                console.warn('Second parsing attempt failed, trying manual parsing...', secondError);
                
                // Last resort: Try to manually extract component data
                const componentMatches = jsonString.match(/\{[^}]*"name"[^}]*\}/g);
                if (componentMatches) {
                  components = componentMatches.map(match => {
                    try {
                      return JSON.parse(match);
                    } catch {
                      return null;
                    }
                  }).filter(Boolean) as ExtractedComponent[];
                }
              }
            }
            
            if (components.length > 0) {
              setExtractedComponents(components);
              console.log('🔍 Components extracted successfully - highlight mode will now work');
              console.log('🔍 Components:', components);
              // NEW: Store extracted components for highlighting (simpler approach)

              console.log('🎯 Components extracted successfully - highlight mode will now work');
              
              setActiveTab(3); // Switch to component editor tab
              setSnackbarMessage(`Successfully extracted ${components.length} components!`);
              setSnackbarOpen(true);
              
              // Debug: Check if components have data attributes
              console.log('🔍 Checking extracted components for data attributes:');
              components.forEach(comp => {
                const hasDataId = comp.code.includes('data-component-id');
                const hasDataType = comp.code.includes('data-component-type');
                console.log(`- ${comp.name}: data-component-id=${hasDataId}, data-component-type=${hasDataType}`);
                if (!hasDataId || !hasDataType) {
                  console.warn(`⚠️ ${comp.name} is missing data attributes!`);
                }
              });
            } else {
              console.error('No valid components found after parsing');
              setSnackbarMessage('No valid components could be extracted from the response.');
              setSnackbarOpen(true);
            }
          } else {
            console.error('No JSON found in response. Full response:', result.content);
            setSnackbarMessage('No valid component data found in response. Check console for details.');
            setSnackbarOpen(true);
          }
        } catch (parseError) {
          console.error('Failed to parse component extraction response:', parseError);
          console.error('Attempted to parse:', jsonString);
          setSnackbarMessage('Failed to parse component extraction results. Check console for details.');
          setSnackbarOpen(true);
        }
      }
    } catch (error) {
      setSnackbarMessage(`Failed to extract components: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSnackbarOpen(true);
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePreviewComponent = (component: ExtractedComponent) => {
    setPreviewComponent(component);
    
    // Initialize props with mock values
    const mockProps: Record<string, any> = {};
    component.props.required.forEach(prop => {
      // Generate mock values based on prop name
      if (prop.includes('title') || prop.includes('label') || prop.includes('text')) {
        mockProps[prop] = `Sample ${prop}`;
      } else if (prop.includes('amount') || prop.includes('count') || prop.includes('price')) {
        mockProps[prop] = '99.99';
      } else if (prop.includes('onClick') || prop.includes('onSelect') || prop.includes('onBack')) {
        mockProps[prop] = '() => {}';
      } else if (prop.includes('isSelected') || prop.includes('disabled')) {
        mockProps[prop] = 'false';
      } else {
        mockProps[prop] = `"${prop}"`;
      }
    });
    
    setPreviewProps(mockProps);
    setPreviewOpen(true);
  };

  const extractAllComponentDefinitions = (fullCode: string): string => {
    try {
      if (!fullCode || fullCode.trim() === '') {
        return '';
      }
      
      // More robust regex patterns to catch various component definition styles
      const patterns = [
        // const Component = () => { ... }
        /const\s+[A-Z][a-zA-Z0-9]*\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\n\};?/g,
        // const Component = () => ( ... )
        /const\s+[A-Z][a-zA-Z0-9]*\s*=\s*\([^)]*\)\s*=>\s*\([\s\S]*?\n\);?/g,
        // function Component() { ... }
        /function\s+[A-Z][a-zA-Z0-9]*\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g,
        // const Component = React.memo(() => { ... })
        /const\s+[A-Z][a-zA-Z0-9]*\s*=\s*React\.memo\([\s\S]*?\)\);?/g,
        // const Component = forwardRef(() => { ... })
        /const\s+[A-Z][a-zA-Z0-9]*\s*=\s*forwardRef\([\s\S]*?\)\);?/g,
      ];
      
      let definitions = '';
      const foundComponents = new Set<string>();
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(fullCode)) !== null) {
          const fullMatch = match[0];
          const componentName = fullMatch.match(/(?:const|function)\s+([A-Z][a-zA-Z0-9]*)/)?.[1];
          
          // Avoid duplicates
          if (componentName && !foundComponents.has(componentName)) {
            foundComponents.add(componentName);
            definitions += fullMatch + '\n\n';
          }
        }
      }
      
      console.log('Extracted component definitions:', foundComponents);
      return definitions;
    } catch (error) {
      console.error('Error extracting component definitions:', error);
      return '';
    }
  };

  const handleEnhanceIndividualComponent = async (component: ExtractedComponent) => {
    if (!designTokens) {
      setSnackbarMessage('Design tokens not available. Please fetch from Figma first!');
      setSnackbarOpen(true);
      return;
    }

    setIsEnhancingComponent(true);
    try {
      // Create component-specific enhancement prompt
      const componentEnhancementPrompt = `
${CLAUDE_ENHANCEMENT_PROMPT
  .replace('{DESIGN_TOKEN_COLORS}', designTokens.colors.join(', '))
  .replace('{DESIGN_TOKEN_FONT_FAMILIES}', designTokens.fontFamilies.join(', '))
  .replace('{DESIGN_TOKEN_FONT_SIZES}', designTokens.fontSizes.join('px, ') + 'px')
  .replace('{DESIGN_TOKEN_FONT_WEIGHTS}', designTokens.fontWeights.join(', '))
  .replace('{DESIGN_TOKEN_SPACING}', designTokens.spacing.join('px, ') + 'px')
  .replace('{DESIGN_TOKEN_IMAGES}', Object.entries(assetUrls).map(([nodeId, url]) => `- ${nodeId}: ${url}`).join('\n'))
  .replace('{DESIGN_TOKEN_GRADIENTS}', designTokens.gradients.join(', '))}

## COMPONENT TO ENHANCE:

**Component Name:** ${component.name}
**Component Type:** ${component.type}
**Component Category:** ${component.category}
**Component Description:** ${component.description}

**Original Component Code:**
\`\`\`typescript
${component.code}
\`\`\`

## SPECIFIC ENHANCEMENT FOCUS:

Based on the component type "${component.type}" and category "${component.category}", focus on:
${component.category === 'button' ? '- Button styling, hover states, colors from design tokens' :
  component.category === 'form' ? '- Input styling, labels, focus states using design typography' :
  component.category === 'navigation' ? '- Navigation styling, spacing, typography hierarchy' :
  component.category === 'display' ? '- Content presentation, typography, color usage' :
  component.category === 'layout' ? '- Spacing, alignment, background colors' :
  '- General styling improvements using available design tokens'}

## TASK:
Enhance ONLY the styling of this individual component while preserving its exact structure and functionality.
      `;

      const request: ClaudeRequest = {
        prompt: componentEnhancementPrompt,
        mode: 'code-generation'
      };

      const result = await queryClaude(request);
      if (result.code) {
        const enhancedComponent: ExtractedComponent = {
          ...component,
          code: result.code
        };
        
        setCurrentEnhancement(enhancedComponent);
        setShowComparison(true);
        setSnackbarMessage('Component enhancement ready! Review the comparison.');
        setSnackbarOpen(true);
      }
    } catch (error) {
      setSnackbarMessage(`Failed to enhance component: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSnackbarOpen(true);
    } finally {
      setIsEnhancingComponent(false);
    }
  };

  const handleAcceptEnhancement = () => {
    if (currentEnhancement && previewComponent) {
      const newEnhancedComponents = new Map(enhancedComponents);
      newEnhancedComponents.set(previewComponent.name, currentEnhancement);
      setEnhancedComponents(newEnhancedComponents);
      
      // Close comparison and show success
      setShowComparison(false);
      setCurrentEnhancement(null);
      setSnackbarMessage(`${previewComponent.name} enhancement accepted!`);
      setSnackbarOpen(true);
    }
  };

  const handleRejectEnhancement = () => {
    setShowComparison(false);
    setCurrentEnhancement(null);
    setSnackbarMessage('Enhancement rejected. Original component preserved.');
    setSnackbarOpen(true);
  };

  const extractStateVariables = (code: string): Record<string, any> => {
    const stateVars: Record<string, any> = {};
    
    // Common state variable patterns
    const patterns = [
      /\b(selected|isSelected|active|isActive|open|isOpen|visible|isVisible|disabled|isDisabled|loading|isLoading|checked|isChecked)\b/g,
      /\b(hover|isHover|focused|isFocused|expanded|isExpanded|collapsed|isCollapsed)\b/g,
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const varName = match[1];
        if (!stateVars[varName]) {
          // Set reasonable defaults based on variable name
          if (varName.includes('selected') || varName.includes('active') || varName.includes('checked')) {
            stateVars[varName] = true; // Show selected state for demo
          } else if (varName.includes('loading') || varName.includes('disabled')) {
            stateVars[varName] = false; // Don't show loading/disabled by default
          } else {
            stateVars[varName] = false; // Conservative default
          }
        }
      }
    });
    
    return stateVars;
  };

  const extractExistingVariables = (code: string): Set<string> => {
    const variables = new Set<string>();
    
    // Extract variable declarations from the code
    const patterns = [
      /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g,
      /let\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g,
      /var\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g,
      /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        variables.add(match[1]);
      }
    });
    
    return variables;
  };

  const prepareComponentCodeForPreview = (component: ExtractedComponent, props: Record<string, any>) => {
    try {
      let componentCode = component.code;
      
      // Replace prop references with actual values
      Object.entries(props).forEach(([key, value]) => {
        const propRegex = new RegExp(`\\{${key}\\}`, 'g');
        componentCode = componentCode.replace(propRegex, value);
      });
      
      // Extract and mock state variables
      const stateVariables = extractStateVariables(componentCode);
      
      // Get all component definitions from the full generated code
      let allComponentDefinitions = extractAllComponentDefinitions(generatedCode);
      
      // Fallback: if we couldn't extract specific components, use the entire generated code as context
      if (!allComponentDefinitions.trim()) {
        console.warn('Component extraction failed, using full code as context');
        allComponentDefinitions = generatedCode;
      }
      
      // Find existing variables to avoid conflicts
      const existingVariables = extractExistingVariables(allComponentDefinitions);
      
      // Common handlers to potentially add
      const commonHandlers = {
        onClick: '() => console.log("Clicked")',
        onSelect: '() => console.log("Selected")', 
        onBack: '() => console.log("Back")',
        onSubmit: '() => console.log("Submit")',
        onChange: '() => console.log("Changed")',
        onClose: '() => console.log("Close")',
        onToggle: '() => console.log("Toggle")'
      };
      
      // Add highlighting styles if highlight mode is enabled
      let highlightingComponent = '';
      if (highlightMode) {
        highlightingComponent = `
          const HighlightingStyles = () => {
            const cssContent = \`
              [data-component-id] {
                transition: all 0.3s ease !important;
                position: relative !important;
                border: 1px dashed rgba(0, 0, 0, 0.1) !important;
              }
              ${selectedComponentId ? `
              [data-component-id]:not([data-component-id="${selectedComponentId}"]) {
                opacity: 0.3 !important;
                filter: grayscale(0.5) !important;
              }
              [data-component-id="${selectedComponentId}"] {
                opacity: 1 !important;
                outline: 3px solid #ff6b3d !important;
                outline-offset: 4px !important;
                box-shadow: 0 0 0 6px rgba(255, 107, 61, 0.3) !important;
                background-color: rgba(255, 107, 61, 0.05) !important;
                filter: none !important;
              }
              ` : `
              [data-component-id]:hover {
                outline: 2px solid #ccc !important;
                outline-offset: 2px !important;
              }
              `}
            \`;
            
            React.useEffect(() => {
              const existingStyle = document.getElementById('component-highlighting');
              if (existingStyle) {
                existingStyle.remove();
              }
              
              const style = document.createElement('style');
              style.id = 'component-highlighting';
              style.textContent = cssContent;
              document.head.appendChild(style);
              
              // Debug: Log available components with data attributes
              setTimeout(() => {
                const componentsWithDataId = document.querySelectorAll('[data-component-id]');
                console.log('🎯 Individual Component Highlight Mode - Found components:', 
                  Array.from(componentsWithDataId).map(el => el.getAttribute('data-component-id'))
                );
                if (componentsWithDataId.length === 0) {
                  console.warn('⚠️ No components with data-component-id found in individual component preview!');
                }
              }, 500);
              
              return () => {
                const styleToRemove = document.getElementById('component-highlighting');
                if (styleToRemove) {
                  styleToRemove.remove();
                }
              };
            }, []);
            
            return null;
          };
        `;
      }
      
      // Create preview with full context
      const wrappedCode = `
        ${allComponentDefinitions}
        
        ${highlightingComponent}
        
        const PreviewComponent = () => {
          // Mock props (only if not already defined)
          ${Object.entries(props).filter(([key]) => !existingVariables.has(key)).map(([key, value]) => `const ${key} = ${JSON.stringify(value)};`).join('\n          ')}
          
          // Mock state variables (only if not already defined)
          ${Object.entries(stateVariables).filter(([key]) => !existingVariables.has(key)).map(([key, value]) => `const ${key} = ${JSON.stringify(value)};`).join('\n          ')}
          
          // Mock common handlers (only if not already defined)
          ${Object.entries(commonHandlers).filter(([key]) => !existingVariables.has(key)).map(([key, value]) => `const ${key} = ${value};`).join('\n          ')}
          
          return (
            ${componentCode}
          );
        };
        
        render(${highlightMode ? '<React.Fragment><HighlightingStyles /><PreviewComponent /></React.Fragment>' : '<PreviewComponent />'});
      `;
      
      return wrappedCode;
    } catch (error) {
      console.error('Error preparing component code:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return `
        const ErrorComponent = () => {
          return (
            <Typography color="error">
              Error preparing component preview: {${JSON.stringify(errorMessage)}}
            </Typography>
          );
        };
        render(<ErrorComponent />);
      `;
    }
  };

  // NEW: Visual matching analysis function
  const analyzeVisualMatching = async (component: ExtractedComponent) => {
    if (!figmaImageUrl || !generatedCode) {
      setSnackbarMessage('Need both original image and generated code for visual analysis!');
      setSnackbarOpen(true);
      return;
    }

    setIsAnalyzingVisuals(true);
    setSelectedComponentForVisualMatch(component);

    try {
      // Convert Figma image to File object
      const response = await fetch(figmaImageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'figma-reference.png', { type: 'image/png' });

      const visualAnalysisPrompt = `
# VISUAL ANALYSIS TASK - RETURN JSON ONLY

You are a UI/UX expert analyzing visual differences between an original design and generated component code.

## TASK: VISUAL ANALYSIS (NOT CODE GENERATION)
Analyze the attached image and compare it to the component code below. Return ONLY a JSON object with your analysis.

## COMPONENT TO ANALYZE
**Component Name:** ${component.name}
**Component Category:** ${component.category}
**Component Code:**
\`\`\`typescript
${component.code}
\`\`\`

## ANALYSIS FOCUS
Compare the original design image with the component code and identify:
1. **Color Differences**: Missing/incorrect colors, gradients, backgrounds
2. **Shadow/Effect Differences**: Missing shadows, elevation, visual effects
3. **Typography Differences**: Font sizes, weights, colors, spacing
4. **Layout/Spacing Differences**: Padding, margins, gaps, alignments
5. **Border/Shape Differences**: Border radius, border colors, border styles
6. **Missing Images/Icons**: Icons, logos, images that should be present
7. **Interactive State Differences**: Selection states, hover effects

## CRITICAL: OUTPUT FORMAT
Return ONLY this JSON structure, no other text:

{
  "componentName": "${component.name}",
  "stylingGaps": {
    "colors": ["List specific color gaps here"],
    "gradients": ["List gradient differences here"],
    "shadows": ["List shadow/effect differences here"],
    "borders": ["List border/shape differences here"],
    "typography": ["List typography differences here"],
    "spacing": ["List spacing/layout differences here"],
    "images": ["List missing images/icons here"]
  },
  "recommendedFixes": [
    "Specific actionable fixes to match the original design"
  ],
  "confidenceScore": 75
}

IMPORTANT: Return ONLY the JSON object above. Do not include any explanations, markdown formatting, or other text.
      `;

      const request: ClaudeRequest = {
        prompt: visualAnalysisPrompt,
        image: file,
        mode: 'description'
      };

      const result = await queryClaude(request);
      if (result.content) {
        try {
          console.log(`Raw analysis response for ${component.name}:`, result.content);
          
          // Extract JSON from response - try multiple patterns
          let jsonString = '';
          const patterns = [
            /```json\s*([\s\S]*?)\s*```/,
            /```\s*([\s\S]*?)\s*```/,
            /\{[\s\S]*\}/
          ];
          
          for (const pattern of patterns) {
            const match = result.content.match(pattern);
            if (match) {
              jsonString = match[1] || match[0];
              break;
            }
          }
          
          if (jsonString) {
            console.log(`Extracted JSON for ${component.name}:`, jsonString);
            const analysisResult: VisualMatchingResult = JSON.parse(jsonString);
            
            // Validate the result has required fields
            if (analysisResult.componentName && analysisResult.stylingGaps && analysisResult.confidenceScore !== undefined) {
              setVisualMatchingResults(prev => {
                // Remove any existing analysis for this component
                const filtered = prev.filter(r => r.componentName !== component.name);
                return [...filtered, analysisResult];
              });
              
              const totalGaps = Object.values(analysisResult.stylingGaps).reduce((acc, gaps) => acc + gaps.length, 0);
              console.log(`Analysis successful for ${component.name}: ${totalGaps} gaps found, ${analysisResult.confidenceScore}% confidence`);
              
              if (selectedComponentForVisualMatch?.name === component.name) {
                setSnackbarMessage(`${component.name}: Found ${totalGaps} styling gaps (${analysisResult.confidenceScore}% match)`);
                setSnackbarOpen(true);
              }
            } else {
              throw new Error('Invalid analysis result structure');
            }
          } else {
            throw new Error('No JSON found in response');
          }
        } catch (error) {
          console.error(`Failed to parse visual analysis for ${component.name}:`, error);
          console.error('Raw response:', result.content);
          
          if (selectedComponentForVisualMatch?.name === component.name) {
            setSnackbarMessage(`Failed to analyze ${component.name}. Check console for details.`);
            setSnackbarOpen(true);
          }
          throw error; // Re-throw to be caught by bulk analysis
        }
      } else {
        throw new Error('No content in Claude response');
      }
    } catch (error) {
      setSnackbarMessage(`Visual analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSnackbarOpen(true);
    } finally {
      setIsAnalyzingVisuals(false);
    }
  };

  // NEW: Apply visual fixes to component in full code context
  const applyVisualFixes = async (component: ExtractedComponent, analysisResult: VisualMatchingResult) => {
    setIsEnhancingComponent(true);
    try {
      const visualFixPrompt = `
# PRECISE COMPONENT ENHANCEMENT IN FULL CODE CONTEXT

You are an expert frontend developer tasked with enhancing a specific component within a full React component code.

## TASK
Enhance ONLY the component with data-component-id="${component.name}" in the full code below. Apply visual fixes to make it match the original design exactly.

## FULL CURRENT CODE:
\`\`\`typescript
${generatedCode}
\`\`\`

## TARGET COMPONENT TO ENHANCE
**Component Name:** ${component.name}
**Component Type:** ${component.type}
**Component Category:** ${component.category}

## VISUAL ANALYSIS RESULTS
**Styling Gaps Identified:**
${Object.entries(analysisResult.stylingGaps).map(([category, gaps]) => 
  `**${category.toUpperCase()}:**\n${gaps.map(gap => `- ${gap}`).join('\n')}`
).join('\n\n')}

**Recommended Fixes:**
${analysisResult.recommendedFixes.map(fix => `- ${fix}`).join('\n')}

## AVAILABLE DESIGN TOKENS
${designTokens ? `
**Colors:** ${designTokens.colors.join(', ')}
**Fonts:** ${designTokens.fontFamilies.join(', ')}
**Font Sizes:** ${designTokens.fontSizes.join('px, ')}px
**Spacing:** ${designTokens.spacing.join('px, ')}px
**Gradients:** ${designTokens.gradients.join(', ')}
` : 'No design tokens available'}

## AVAILABLE ASSETS
${Object.entries(assetUrls).map(([nodeId, url]) => `- ${nodeId}: ${url}`).join('\n')}

## CRITICAL REQUIREMENTS
1. **ONLY modify the component with data-component-id="${component.name}"**
2. **Keep all other components exactly the same**
3. **Preserve the data-component-id="${component.name}" attribute on the root element**
4. **Apply ALL recommended visual fixes to this component only**
5. **Use Material-UI sx prop for styling**
6. **Ensure the component integrates seamlessly with the rest of the code**

## OUTPUT FORMAT
Return the COMPLETE enhanced code with only the target component modified. Do not change any other components or the overall structure.
      `;

      const request: ClaudeRequest = {
        prompt: visualFixPrompt,
        mode: 'code-generation'
      };

      const result = await queryClaude(request);
      if (result.code) {
        // Update the full generated code with the enhancement
        setGeneratedCode(result.code);
        
        // Mark this component as enhanced
        const enhancedComponent: ExtractedComponent = {
          ...component,
          code: result.code,
          visualAnalysis: analysisResult.stylingGaps as any
        };
        setEnhancedComponents(prev => new Map(prev).set(component.name, enhancedComponent));
        
        setSnackbarMessage(`${component.name} enhanced successfully! Check the preview.`);
        setSnackbarOpen(true);
        
        // Switch to component editor tab and highlight the enhanced component
        setActiveTab(3);
        setSelectedComponentId(component.name);
      }
    } catch (error) {
      setSnackbarMessage(`Visual enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSnackbarOpen(true);
    } finally {
      setIsEnhancingComponent(false);
    }
  };

  // NEW: Bulk visual analysis function
  const handleBulkVisualAnalysis = async () => {
    if (!figmaImageUrl || extractedComponents.length === 0) {
      setSnackbarMessage('Need both Figma image and extracted components for bulk analysis!');
      setSnackbarOpen(true);
      return;
    }

    setIsAnalyzingVisuals(true);
    setSnackbarMessage(`Starting bulk visual analysis of ${extractedComponents.length} components...`);
    setSnackbarOpen(true);

    let successCount = 0;
    let failureCount = 0;

    try {
      // Analyze components one by one to avoid overwhelming the API
      for (let i = 0; i < extractedComponents.length; i++) {
        const component = extractedComponents[i];
        
        // Skip if already analyzed
        if (visualMatchingResults.find(result => result.componentName === component.name)) {
          console.log(`Skipping ${component.name} - already analyzed`);
          continue;
        }

        setSelectedComponentForVisualMatch(component);
        setSnackbarMessage(`Analyzing component ${i + 1}/${extractedComponents.length}: ${component.name}...`);
        setSnackbarOpen(true);

        try {
          await analyzeVisualMatching(component);
          successCount++;
          console.log(`Successfully analyzed ${component.name}`);
        } catch (error) {
          failureCount++;
          console.error(`Failed to analyze ${component.name}:`, error);
        }
        
        // Add a small delay between requests to be API-friendly
        if (i < extractedComponents.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      setSnackbarMessage(`Bulk analysis completed! ✅ ${successCount} success, ❌ ${failureCount} failed. Check "Visual Analysis Results" section below.`);
      setSnackbarOpen(true);
      
      // Auto-expand the results if we have any
      if (successCount > 0) {
        setTimeout(() => {
          setSnackbarMessage('💡 Scroll down to see "Visual Analysis Results" section with detailed gap analysis!');
          setSnackbarOpen(true);
        }, 3000);
      }
    } catch (error) {
      setSnackbarMessage(`Bulk analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSnackbarOpen(true);
    } finally {
      setIsAnalyzingVisuals(false);
      setSelectedComponentForVisualMatch(null);
    }
  };

  // Helper function to add visual selection capabilities to preview
  const addVisualSelectionToPreview = (selectedComponentId: string | null, extractedComponents: ExtractedComponent[]) => {
    return `
      const VisualSelector = () => {
        React.useEffect(() => {
          let overlayDiv = null;
          let hoverOverlayDiv = null;
          let selectedOverlayDiv = null;
          let isSelectionMode = true;
          
          const createOverlay = (isSelected = false) => {
            const overlay = document.createElement('div');
            overlay.style.position = 'absolute';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '9999';
            overlay.style.transition = 'all 0.2s ease';
            overlay.style.borderRadius = '4px';
            
            if (isSelected) {
              // Selected component styling
              overlay.style.border = '3px solid #ff6b3d';
              overlay.style.backgroundColor = 'rgba(255, 107, 61, 0.1)';
              overlay.style.boxShadow = '0 0 0 1px #ff6b3d, 0 4px 12px rgba(255, 107, 61, 0.3)';
            } else {
              // Hover styling
              overlay.style.border = '2px solid #ff6b3d';
              overlay.style.backgroundColor = 'rgba(255, 107, 61, 0.05)';
            }
            
            return overlay;
          };
          
          const hideHoverOverlay = () => {
            if (hoverOverlayDiv) {
              hoverOverlayDiv.style.display = 'none';
            }
          };
          
          const showHoverOverlay = (element, container) => {
            if (!hoverOverlayDiv) {
              hoverOverlayDiv = createOverlay(false);
              container.appendChild(hoverOverlayDiv);
            }
            
            const elementRect = element.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            hoverOverlayDiv.style.display = 'block';
            hoverOverlayDiv.style.left = (elementRect.left - containerRect.left) + 'px';
            hoverOverlayDiv.style.top = (elementRect.top - containerRect.top) + 'px';
            hoverOverlayDiv.style.width = elementRect.width + 'px';
            hoverOverlayDiv.style.height = elementRect.height + 'px';
          };
          
          const updateSelectedOverlay = (container) => {
            // Remove existing selected overlay
            if (selectedOverlayDiv && selectedOverlayDiv.parentNode) {
              selectedOverlayDiv.parentNode.removeChild(selectedOverlayDiv);
              selectedOverlayDiv = null;
            }
            
            // Find the selected component element
            const selectedComponent = findSelectedComponent(container);
            if (selectedComponent) {
              selectedOverlayDiv = createOverlay(true);
              container.appendChild(selectedOverlayDiv);
              
              const elementRect = selectedComponent.getBoundingClientRect();
              const containerRect = container.getBoundingClientRect();
              
              selectedOverlayDiv.style.display = 'block';
              selectedOverlayDiv.style.left = (elementRect.left - containerRect.left) + 'px';
              selectedOverlayDiv.style.top = (elementRect.top - containerRect.top) + 'px';
              selectedOverlayDiv.style.width = elementRect.width + 'px';
              selectedOverlayDiv.style.height = elementRect.height + 'px';
              
              console.log('🎯 Updated selected overlay for:', '${selectedComponentId}');
            }
          };
          
          const findSelectedComponent = (container) => {
            if (!'${selectedComponentId}') return null;
            
            // Try to find the component using our identification heuristics
            const allElements = container.querySelectorAll('*');
            for (let element of allElements) {
              const componentGuess = identifyComponent(element);
              if (componentGuess === '${selectedComponentId}') {
                return element;
              }
            }
            return null;
          };
          
          const handleMouseOver = (e) => {
            if (!isSelectionMode) return;
            e.stopPropagation();
            
            const previewContainer = e.currentTarget;
            const element = e.target;
            
            // Skip if hovering over overlays
            if (element === hoverOverlayDiv || element === selectedOverlayDiv) return;
            
            // Only highlight certain elements (avoid text nodes, small elements)
            if (element.tagName && 
                !['HTML', 'BODY', 'SCRIPT', 'STYLE'].includes(element.tagName) &&
                element.offsetWidth > 20 && element.offsetHeight > 20) {
              
              // Don't show hover overlay if this is the selected component
              const componentGuess = identifyComponent(element);
              if (componentGuess !== '${selectedComponentId}') {
                showHoverOverlay(element, previewContainer);
              }
            }
          };
          
          const handleMouseOut = (e) => {
            if (!isSelectionMode) return;
            // Don't hide if moving to child element
            if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return;
            hideHoverOverlay();
          };
          
          const handleClick = (e) => {
            if (!isSelectionMode) return;
            e.preventDefault();
            e.stopPropagation();
            
            const element = e.target;
            console.log('🎯 Clicked element:', element);
            
            // Try to identify which component this element belongs to
            const componentGuess = identifyComponent(element);
            if (componentGuess) {
              console.log('🎯 Identified component:', componentGuess);
              // Emit event to update selected component
              window.dispatchEvent(new CustomEvent('componentSelected', { detail: componentGuess }));
            }
          };
          
          const identifyComponent = (element) => {
            // Simple heuristic to guess component based on element characteristics
            const style = window.getComputedStyle(element);
            const text = element.textContent || '';
            
            // Look for button-like elements
            if (element.tagName === 'BUTTON' || 
                (style.cursor === 'pointer' && text.includes('ADD'))) {
              return 'AddNewButton';
            }
            
            // Look for header-like elements  
            if (style.display === 'flex' && style.alignItems === 'center' && 
                element.querySelector('button, [role="button"]')) {
              return 'PageHeader';
            }
            
            // Look for card-like elements
            if (style.backgroundColor === 'rgb(255, 255, 255)' && 
                style.borderRadius && element.offsetWidth > 80 && element.offsetHeight > 80) {
              return 'PaymentMethodCard';
            }
            
            // Look for total amount elements
            if (style.display === 'flex' && style.justifyContent === 'space-between' &&
                text.includes('$')) {
              return 'TotalAmount';
            }
            
            return null;
          };
          
          // Wait for React Live to render, then find the preview container
          const initializeSelector = () => {
            // Find the preview container - specifically look for the Component Editor preview
            const previewContainer = document.querySelector('[data-testid="component-editor-preview"]') || 
                                    document.querySelector('.component-editor-preview');
            
            if (previewContainer) {
              // Make sure the container is positioned relatively for our absolute overlay
              previewContainer.style.position = 'relative';
              previewContainer.style.overflow = 'hidden';
              
              previewContainer.addEventListener('mouseover', handleMouseOver, true);
              previewContainer.addEventListener('mouseout', handleMouseOut, true);
              previewContainer.addEventListener('click', handleClick, true);
              
              // Update selected overlay when component changes
              updateSelectedOverlay(previewContainer);
              
              // Listen for external selection changes (from chips)
              const handleExternalSelection = () => {
                updateSelectedOverlay(previewContainer);
              };
              
              window.addEventListener('updateSelectedOverlay', handleExternalSelection);
              
              console.log('🎯 Visual selector initialized for Component Editor');
              
              // Return cleanup function
              return () => {
                if (hoverOverlayDiv && hoverOverlayDiv.parentNode) {
                  hoverOverlayDiv.parentNode.removeChild(hoverOverlayDiv);
                }
                if (selectedOverlayDiv && selectedOverlayDiv.parentNode) {
                  selectedOverlayDiv.parentNode.removeChild(selectedOverlayDiv);
                }
                previewContainer.removeEventListener('mouseover', handleMouseOver, true);
                previewContainer.removeEventListener('mouseout', handleMouseOut, true);
                previewContainer.removeEventListener('click', handleClick, true);
                window.removeEventListener('updateSelectedOverlay', handleExternalSelection);
              };
            } else {
              console.warn('🎯 Component Editor preview container not found');
              return null;
            }
          };
          
          // Try to initialize immediately, if not found, wait a bit
          let cleanup = initializeSelector();
          
          if (!cleanup) {
            const timeout = setTimeout(() => {
              cleanup = initializeSelector();
            }, 100);
            
            return () => {
              clearTimeout(timeout);
              if (cleanup) cleanup();
            };
          }
          
          return cleanup;
        }, []);
        
        return null;
      };
    `;
  };

  // NEW: Simplified preview preparation - just clean code, no complex injection
  const prepareCodeForComponentEditor = (code: string, selectedId: string | null = null): string => {
    try {
      let processedCode = code;
      
      // Remove all import statements
      processedCode = processedCode.replace(/import\s+[^;]+;?\s*/g, '');
      
      // Remove export statements
      processedCode = processedCode.replace(/export\s+(default\s+)?/g, '');
      
      // Clean up any remaining semicolons at the start
      processedCode = processedCode.replace(/^\s*;\s*/, '');
      
      // Find the component name
      const componentNameMatch = processedCode.match(/(?:const|function)\s+(\w+)\s*[=\(]/);
      const componentName = componentNameMatch ? componentNameMatch[1] : 'GeneratedComponent';
      
      // Add visual selector with current selection
      const visualSelectorCode = addVisualSelectionToPreview(selectedId, []).replace(
        /\$\{selectedComponentId\}/g, 
        selectedId || 'null'
      );
      processedCode = visualSelectorCode + '\n\n' + processedCode;
      
      // For React Live with noInline=true, we need to call render()
      if (!processedCode.includes('render(')) {
        processedCode += `\n\nrender(<React.Fragment><VisualSelector /><${componentName} /></React.Fragment>);`;
      }
      
      return processedCode;
    } catch (error) {
      console.error('Error preparing code for component editor:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `
        const ErrorComponent = () => {
          return React.createElement('div', { 
            style: { padding: '20px', backgroundColor: '#fee', color: '#c33', fontFamily: 'monospace' } 
          }, 'Error preparing code for component editor: ' + ${JSON.stringify(errorMessage)});
        };
        
        render(React.createElement(ErrorComponent));
      `;
    }
  };

  // NEW: Extract component bounds from visual selector
  const extractComponentBounds = (): ComponentBounds[] => {
    const bounds: ComponentBounds[] = [];
    const previewContainer = document.querySelector('[data-testid="component-editor-preview"]');
    
    if (!previewContainer) {
      console.warn('Component editor preview container not found');
      return bounds;
    }
    
    // Use our existing component identification logic
    const identifyComponent = (element: Element): string | null => {
      const style = window.getComputedStyle(element);
      const text = element.textContent || '';
      
      // Look for button-like elements
      if (element.tagName === 'BUTTON' || 
          (style.cursor === 'pointer' && text.includes('ADD'))) {
        return 'AddNewButton';
      }
      
      // Look for header-like elements  
      if (style.display === 'flex' && style.alignItems === 'center' && 
          element.querySelector('button, [role="button"]')) {
        return 'PageHeader';
      }
      
      // Look for card-like elements
      if (style.backgroundColor === 'rgb(255, 255, 255)' && 
          style.borderRadius && element.getBoundingClientRect().width > 80 && 
          element.getBoundingClientRect().height > 80) {
        return 'PaymentMethodCard';
      }
      
      // Look for total amount elements
      if (style.display === 'flex' && style.justifyContent === 'space-between' &&
          text.includes('$')) {
        return 'TotalAmount';
      }
      
      return null;
    };
    
    // Get all elements in the preview container
    const allElements = previewContainer.querySelectorAll('*');
    const containerRect = previewContainer.getBoundingClientRect();
    
    for (const element of allElements) {
      const componentName = identifyComponent(element);
      if (componentName) {
        const rect = element.getBoundingClientRect();
        
        // Convert to relative coordinates within the preview container
        const componentBounds: ComponentBounds = {
          name: componentName,
          x: rect.left - containerRect.left,
          y: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
          element: element
        };
        
        bounds.push(componentBounds);
      }
    }
    
    console.log(`🔍 Extracted ${bounds.length} component bounds:`, bounds);
    return bounds;
  };

  // NEW: Trigger bounds matching process
  const handleBoundsMatching = async () => {
    if (!figmaUrl || !figmaPat) {
      setSnackbarMessage('Please provide both Figma URL and Personal Access Token');
      setSnackbarOpen(true);
      return;
    }
    
    setIsMatchingBounds(true);
    setSnackbarMessage('Starting bounds matching analysis...');
    setSnackbarOpen(true);
    
    try {
      // Initialize Figma service
      const figmaService = new FigmaService(figmaPat);
      const fileKey = figmaService.extractFileKey(figmaUrl);
      
      // Get Figma file analysis
      const analysisResult = await figmaService.analyzeFileWithAssets(fileKey);
      console.log('🎨 Figma analysis result:', analysisResult);
      
      // Store Figma components
      setFigmaComponents(analysisResult.components);
      
      // Extract React component bounds
      const reactBounds = extractComponentBounds();
      setComponentBounds(reactBounds);
      
      if (reactBounds.length === 0) {
        setSnackbarMessage('No React components found in preview. Make sure components are rendered in Component Editor.');
        setSnackbarOpen(true);
        return;
      }
      
      // Perform bounds matching
      const matchingResult = figmaService.matchComponentsToNodes(reactBounds, analysisResult.components);
      console.log('🎯 Bounds matching result:', matchingResult);
      
      setBoundsMatchingResults(matchingResult);
      
      // Get node images for all candidates
      const nodeIds = matchingResult.componentMatches.flatMap(cm => 
        cm.candidates.map(candidate => candidate.figmaNode.id)
      );
      if (nodeIds.length > 0) {
        const images = await figmaService.getNodeImages(fileKey, nodeIds);
        setNodeImages(images);
      }
      
      // Success message
      setSnackbarMessage(
        `Bounds matching completed! Found ${matchingResult.componentMatches.length} components with candidates (${Math.round(matchingResult.overallConfidence)}% avg confidence)`
      );
      setSnackbarOpen(true);
      
    } catch (error) {
      console.error('Bounds matching failed:', error);
      setSnackbarMessage(`Bounds matching failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSnackbarOpen(true);
    } finally {
      setIsMatchingBounds(false);
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h4">
          Claude-4-Sonnet UI Generator
        </Typography>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Query Panel */}
        <Box sx={{ width: '350px', borderRight: 1, borderColor: 'divider', p: 2, overflow: 'auto' }}>
          {/* Mode Selection */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Mode:
            </Typography>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={handleModeChange}
              size="small"
              fullWidth
            >
              <ToggleButton value="description">
                <Description sx={{ mr: 1 }} />
                Description
              </ToggleButton>
              <ToggleButton value="code-generation">
                <Code sx={{ mr: 1 }} />
                Code Generation
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Typography variant="h6" gutterBottom>
            Fetch from Figma
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Tip:</strong> Select a specific frame/component in Figma first, then copy the URL to get the node-id parameter for targeted screenshots.
            </Typography>
          </Alert>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <FormLabel>Figma Personal Access Token</FormLabel>
              <TextField
                value={figmaPat}
                onChange={(e) => setFigmaPat(e.target.value)}
                placeholder="Enter your Figma PAT"
                size="small"
                type="password"
                sx={{ mt: 1 }}
              />
            </FormControl>

            <FormControl fullWidth>
              <FormLabel>Figma URL</FormLabel>
              <TextField
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                placeholder="https://www.figma.com/design/...?node-id=66-186"
                size="small"
                sx={{ mt: 1 }}
              />
            </FormControl>

            <Button
              variant="outlined"
              onClick={handleFetchFigmaImage}
              disabled={isFetchingImage || !figmaPat.trim() || !figmaUrl.trim()}
              startIcon={isFetchingImage ? <CircularProgress size={16} /> : <MuiIcons.CloudUpload />}
              size="small"
              sx={{ mt: 1 }}
            >
              {isFetchingImage ? 'Fetching...' : 'Fetch from Figma'}
            </Button>

            {figmaImageUrl && (
              <Box>
                <img
                  src={figmaImageUrl}
                  alt="Figma Screenshot"
                  style={{
                    width: '100%',
                    maxHeight: '150px',
                    objectFit: 'contain',
                    borderRadius: '8px'
                  }}
                />
              </Box>
            )}

            {/* Display Design Tokens */}
            {designTokens && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Design Tokens
                </Typography>
                
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Palette sx={{ mr: 1 }} />
                    <Typography>Colors ({designTokens.colors.length})</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {designTokens.colors.map((color, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box 
                            sx={{ 
                              width: 16, 
                              height: 16, 
                              backgroundColor: color, 
                              borderRadius: '50%',
                              border: '1px solid #ccc'
                            }} 
                          />
                          <Typography variant="caption" sx={{ fontSize: '10px' }}>
                            {color}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <TextFormat sx={{ mr: 1 }} />
                    <Typography>Typography ({designTokens.fontFamilies.length})</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="caption">
                        Fonts: {designTokens.fontFamilies.join(', ')}
                      </Typography>
                      <Typography variant="caption">
                        Sizes: {designTokens.fontSizes.join(', ')}px
                      </Typography>
                      <Typography variant="caption">
                        Weights: {designTokens.fontWeights.join(', ')}
                      </Typography>
                    </Box>
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <ImageIcon sx={{ mr: 1 }} />
                    <Typography>Assets ({Object.keys(assetUrls).length})</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {Object.entries(assetUrls).map(([nodeId, url]) => (
                        <Box key={nodeId} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <img src={url} alt={nodeId} style={{ width: 24, height: 24, objectFit: 'cover' }} />
                          <Typography variant="caption" sx={{ fontSize: '10px' }}>
                            {nodeId}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={isLoading ? <CircularProgress size={16} /> : <Send />}
                disabled={isLoading || !figmaImageUrl}
                size="small"
                fullWidth
              >
                {isLoading ? 'Analyzing...' : 'Analyze Image'}
              </Button>
              <Button
                variant="outlined"
                onClick={handleClear}
                disabled={isLoading || isFetchingImage}
                size="small"
              >
                Clear
              </Button>
            </Box>
          </Box>

          {/* Response in description mode */}
          {mode === 'description' && response && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Response
              </Typography>
              {response.error ? (
                <Alert severity="error">{response.error}</Alert>
              ) : (
                <Card variant="outlined" sx={{ maxHeight: '300px', overflow: 'auto' }}>
                  <CardContent>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {response.content}
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}
        </Box>

        {/* Code Editor & Preview Panel */}
        {mode === 'code-generation' && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                <Tab label="Code Editor" />
                <Tab label="Live Preview" />
                <Tab label={`Components ${extractedComponents.length > 0 ? `(${extractedComponents.length})` : ''}`} />
                <Tab label="Component Editor" />
              </Tabs>
            </Box>

            {/* Code Editor Tab */}
            {activeTab === 0 && (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    startIcon={<ContentCopy />}
                    onClick={handleCopyCode}
                    disabled={!generatedCode}
                  >
                    Copy
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Download />}
                    onClick={handleSaveCode}
                    disabled={!generatedCode}
                  >
                    Save
                  </Button>
                  <Button
                    size="small"
                    startIcon={<PlayArrow />}
                    onClick={() => setActiveTab(1)}
                    disabled={!generatedCode}
                  >
                    Preview
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={isEnhancing ? <CircularProgress size={16} /> : <Palette />}
                    onClick={handleEnhanceCode}
                    disabled={!generatedCode || !designTokens || isEnhancing}
                    sx={{ ml: 1 }}
                  >
                    {isEnhancing ? 'Enhancing...' : 'Enhance with Design Tokens'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={isExtracting ? <CircularProgress size={16} /> : <MuiIcons.ViewModule />}
                    onClick={handleExtractComponents}
                    disabled={!generatedCode || isExtracting}
                    sx={{ ml: 1 }}
                  >
                    {isExtracting ? 'Extracting...' : 'Extract Components'}
                  </Button>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Editor
                    height="100%"
                    defaultLanguage="typescript"
                    value={generatedCode}
                    onChange={handleCodeChange}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      wordWrap: 'on',
                      automaticLayout: true,
                    }}
                  />
                </Box>
              </Box>
            )}

            {/* Live Preview Tab */}
            {activeTab === 1 && (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                  <Button
                    size="small"
                    startIcon={<Refresh />}
                    onClick={handleRefreshPreview}
                  >
                    Refresh
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Code />}
                    onClick={() => setActiveTab(0)}
                  >
                    Edit Code
                  </Button>
                  
                  {/* Component Highlighting Controls */}
                  <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button
                      size="small"
                      variant={highlightMode ? "contained" : "outlined"}
                      startIcon={<MuiIcons.HighlightAlt />}
                      onClick={() => {
                        setHighlightMode(!highlightMode);
                        if (!highlightMode) {
                          setSelectedComponentId(null);
                        }
                      }}
                      disabled={extractedComponents.length === 0}
                    >
                      {highlightMode ? 'Exit Highlight' : 'Highlight Mode'}
                    </Button>
                    
                    {highlightMode && selectedComponentId && (
                      <Chip 
                        label={`Selected: ${selectedComponentId}`}
                        onDelete={() => setSelectedComponentId(null)}
                        color="primary"
                        size="small"
                      />
                    )}
                    
                    {originalGeneratedCode !== generatedCode && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<MuiIcons.Restore />}
                        onClick={() => setGeneratedCode(originalGeneratedCode)}
                      >
                        Reset to Original
                      </Button>
                    )}
                  </Box>
                </Box>
                
                <Box sx={{ flex: 1, p: 2, overflow: 'auto', bgcolor: 'grey.50', minHeight: 0 }}>
                  {generatedCode ? (
                    <LiveProvider 
                      code={prepareCodeForPreview(generatedCode)} 
                      scope={scope} 
                      noInline={true}
                    >
                      <LiveError />
                      <LivePreview />
                    </LiveProvider>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Typography variant="body2" color="text.secondary">
                        Generate some code first to see the preview
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}

            {/* Components Tab */}
            {activeTab === 2 && (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {/* Components Toolbar */}
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Typography variant="h6">
                      Component Library ({extractedComponents.length} components)
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<MuiIcons.ViewModule />}
                      onClick={handleExtractComponents}
                      disabled={!generatedCode || isExtracting}
                    >
                      {isExtracting ? 'Extracting...' : 'Re-extract'}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={isAnalyzingVisuals ? <CircularProgress size={16} /> : <MuiIcons.Analytics />}
                      onClick={handleBulkVisualAnalysis}
                      disabled={!figmaImageUrl || extractedComponents.length === 0 || isAnalyzingVisuals}
                    >
                      {isAnalyzingVisuals ? 'Analyzing...' : 'Analyze All Visuals'}
                    </Button>
                  </Box>
                  
                  {/* Filters and Search */}
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <ToggleButtonGroup
                      value={componentFilter}
                      exclusive
                      onChange={(e, newFilter) => newFilter && setComponentFilter(newFilter)}
                      size="small"
                    >
                      <ToggleButton value="all">All</ToggleButton>
                      <ToggleButton value="atom">Atoms</ToggleButton>
                      <ToggleButton value="molecule">Molecules</ToggleButton>
                      <ToggleButton value="organism">Organisms</ToggleButton>
                      <ToggleButton value="template">Templates</ToggleButton>
                    </ToggleButtonGroup>
                    
                    <TextField
                      size="small"
                      placeholder="Search components..."
                      value={componentSearch}
                      onChange={(e) => setComponentSearch(e.target.value)}
                      sx={{ minWidth: 200 }}
                      InputProps={{
                        startAdornment: <MuiIcons.Search sx={{ color: 'text.secondary', mr: 1 }} />
                      }}
                    />
                  </Box>
                </Box>

                {/* Visual Analysis Results */}
                {visualMatchingResults.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <MuiIcons.Analytics sx={{ mr: 1 }} />
                        <Typography>Visual Analysis Results ({visualMatchingResults.length})</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {visualMatchingResults.map((result, index) => (
                            <Card key={index} variant="outlined" sx={{ p: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                  {result.componentName}
                                </Typography>
                                <Chip 
                                  label={`${result.confidenceScore}% match`} 
                                  color={result.confidenceScore > 80 ? 'success' : result.confidenceScore > 60 ? 'warning' : 'error'}
                                  size="small"
                                />
                              </Box>
                              
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Found {Object.values(result.stylingGaps).reduce((acc, gaps) => acc + gaps.length, 0)} styling gaps
                              </Typography>
                              
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {Object.entries(result.stylingGaps).map(([category, gaps]) => (
                                  gaps.length > 0 && (
                                    <Chip 
                                      key={category}
                                      label={`${category}: ${gaps.length}`}
                                      size="small"
                                      variant="outlined"
                                      color="warning"
                                    />
                                  )
                                ))}
                              </Box>
                              
                              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => {
                                    const component = extractedComponents.find(c => c.name === result.componentName);
                                    if (component) {
                                      applyVisualFixes(component, result);
                                    }
                                  }}
                                  disabled={isEnhancingComponent}
                                >
                                  Apply Fixes
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => {
                                    const details = Object.entries(result.stylingGaps)
                                      .filter(([_, gaps]) => gaps.length > 0)
                                      .map(([category, gaps]) => `${category.toUpperCase()}:\n${gaps.map(gap => `- ${gap}`).join('\n')}`)
                                      .join('\n\n');
                                    alert(`Visual Analysis for ${result.componentName}:\n\n${details}`);
                                  }}
                                >
                                  View Details
                                </Button>
                              </Box>
                            </Card>
                          ))}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                )}

                {/* Components Grid */}
                <Box sx={{ flex: 1, p: 2, overflow: 'auto', minHeight: 0 }}>
                  {extractedComponents.length === 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 2 }}>
                      <MuiIcons.ViewModule sx={{ fontSize: 64, color: 'text.secondary' }} />
                      <Typography variant="h6" color="text.secondary">
                        No Components Extracted Yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        Generate some code first, then click "Extract Components" to discover reusable components.
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<MuiIcons.ViewModule />}
                        onClick={handleExtractComponents}
                        disabled={!generatedCode || isExtracting}
                      >
                        {isExtracting ? 'Extracting...' : 'Extract Components'}
                      </Button>
                    </Box>
                  ) : (
                    <Grid container spacing={2}>
                      {extractedComponents
                        .filter(component => {
                          const matchesFilter = componentFilter === 'all' || component.type === componentFilter;
                          const matchesSearch = componentSearch === '' || 
                            component.name.toLowerCase().includes(componentSearch.toLowerCase()) ||
                            component.description.toLowerCase().includes(componentSearch.toLowerCase()) ||
                            component.category.toLowerCase().includes(componentSearch.toLowerCase());
                          return matchesFilter && matchesSearch;
                        })
                        .map((component, index) => (
                          <Grid item xs={12} sm={6} md={4} key={index}>
                            <Card 
                              sx={{ 
                                height: '100%', 
                                display: 'flex', 
                                flexDirection: 'column',
                                cursor: highlightMode ? 'pointer' : 'default',
                                border: highlightMode && selectedComponentId === component.name ? '2px solid #ff6b3d' : 'none',
                                boxShadow: highlightMode && selectedComponentId === component.name ? '0 0 0 4px rgba(255, 107, 61, 0.2)' : undefined
                              }}
                              onClick={() => {
                                if (highlightMode) {
                                  setSelectedComponentId(component.name);
                                  setActiveTab(3); // Switch to component editor tab to see highlighting
                                }
                              }}
                            >
                              <CardContent sx={{ flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <Chip 
                                    label={component.type} 
                                    size="small" 
                                    color={
                                      component.type === 'atom' ? 'success' :
                                      component.type === 'molecule' ? 'info' :
                                      component.type === 'organism' ? 'warning' : 'error'
                                    }
                                  />
                                  <Chip 
                                    label={component.category} 
                                    size="small" 
                                    variant="outlined"
                                  />
                                  {enhancedComponents.has(component.name) && (
                                    <Chip 
                                      label="Enhanced" 
                                      size="small" 
                                      color="primary"
                                      icon={<Palette sx={{ fontSize: 16 }} />}
                                    />
                                  )}
                                  {visualMatchingResults.find(result => result.componentName === component.name) && (
                                    <Chip 
                                      label="Analyzed" 
                                      size="small" 
                                      color="info"
                                      icon={<MuiIcons.Analytics sx={{ fontSize: 16 }} />}
                                    />
                                  )}
                                  {highlightMode && selectedComponentId === component.name && (
                                    <Chip 
                                      label="Selected" 
                                      size="small" 
                                      color="warning"
                                      icon={<MuiIcons.GpsFixed sx={{ fontSize: 16 }} />}
                                    />
                                  )}
                                </Box>
                                
                                <Typography variant="h6" gutterBottom>
                                  {component.name}
                                </Typography>
                                
                                <Typography variant="body2" color="text.secondary" paragraph>
                                  {component.description}
                                </Typography>
                                
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Reusability:
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    {Array.from({ length: 10 }).map((_, i) => (
                                      <Box
                                        key={i}
                                        sx={{
                                          width: 8,
                                          height: 8,
                                          borderRadius: '50%',
                                          backgroundColor: i < component.reusabilityScore ? 'primary.main' : 'grey.300'
                                        }}
                                      />
                                    ))}
                                  </Box>
                                  <Typography variant="caption" color="text.secondary">
                                    {component.reusabilityScore}/10
                                  </Typography>
                                </Box>

                                <Typography variant="caption" color="text.secondary" display="block">
                                  Dependencies: {component.dependencies.join(', ') || 'None'}
                                </Typography>
                              </CardContent>
                              
                              <Box sx={{ p: 2, pt: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Button
                                    size="small"
                                    startIcon={<ContentCopy />}
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent card click in highlight mode
                                      const componentToUse = enhancedComponents.get(component.name) || component;
                                      navigator.clipboard.writeText(componentToUse.code);
                                      const versionText = enhancedComponents.has(component.name) ? '(Enhanced)' : '';
                                      setSnackbarMessage(`Copied ${component.name} component! ${versionText}`);
                                      setSnackbarOpen(true);
                                    }}
                                    fullWidth
                                  >
                                    Copy Code
                                  </Button>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent card click in highlight mode
                                      setSelectedComponentId(component.name);
                                      setActiveTab(3); // Switch to component editor tab
                                    }}
                                    title="Open in Component Editor"
                                  >
                                    <MuiIcons.Visibility />
                                  </IconButton>
                                </Box>
                                
                                {/* Visual Matching Controls */}
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={isAnalyzingVisuals && selectedComponentForVisualMatch?.name === component.name ? 
                                      <CircularProgress size={16} /> : <MuiIcons.Compare />}
                                    onClick={() => analyzeVisualMatching(component)}
                                    disabled={!figmaImageUrl || isAnalyzingVisuals}
                                    fullWidth
                                  >
                                    {isAnalyzingVisuals && selectedComponentForVisualMatch?.name === component.name ? 
                                      'Analyzing...' : 'Visual Match'}
                                  </Button>
                                  
                                  {/* Show apply fixes button if we have analysis results */}
                                  {visualMatchingResults.find(result => result.componentName === component.name) && (
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        const analysisResult = visualMatchingResults.find(result => result.componentName === component.name);
                                        if (analysisResult) {
                                          applyVisualFixes(component, analysisResult);
                                        }
                                      }}
                                      disabled={isEnhancingComponent}
                                      sx={{ color: 'success.main' }}
                                    >
                                      <MuiIcons.AutoFixHigh />
                                    </IconButton>
                                  )}
                                </Box>
                                
                                {/* Show analysis results summary */}
                                {visualMatchingResults.find(result => result.componentName === component.name) && (
                                  <Box sx={{ mt: 1 }}>
                                    <Typography variant="caption" color="text.secondary">
                                      Visual Analysis: {visualMatchingResults.find(result => result.componentName === component.name)?.confidenceScore}% match
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            </Card>
                          </Grid>
                        ))}
                    </Grid>
                  )}
                </Box>
              </Box>
            )}

            {/* Component Editor Tab */}
            {activeTab === 3 && (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
                {/* Component Editor Toolbar */}
                <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                  <Typography variant="h6">Component Editor</Typography>
                  <Box sx={{ mx: 2, height: 24, width: 1, bgcolor: 'divider' }} />
                  
                  {/* Component Selection */}
                  <Typography variant="body2" color="text.secondary">Select:</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {extractedComponents.map((component) => (
                      <Chip
                        key={component.name}
                        label={component.name}
                        size="small"
                        color={selectedComponentId === component.name ? "primary" : "default"}
                        onClick={() => setSelectedComponentId(component.name)}
                        variant={selectedComponentId === component.name ? "filled" : "outlined"}
                      />
                    ))}
                  </Box>
                  
                  <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={isMatchingBounds ? <CircularProgress size={16} /> : <MuiIcons.CompareArrows />}
                      onClick={handleBoundsMatching}
                      disabled={isMatchingBounds || !figmaUrl || !figmaPat}
                    >
                      {isMatchingBounds ? 'Matching...' : 'Match Bounds'}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setSelectedComponentId(null)}
                      disabled={!selectedComponentId}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      size="small"
                      startIcon={<Code />}
                      onClick={() => setActiveTab(0)}
                    >
                      Edit Code
                    </Button>
                  </Box>
                </Box>
                
                {/* Main Editor Layout */}
                <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
                  {/* Left Side - Live Preview with Highlighting */}
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
                    <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50', flexShrink: 0 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Live Preview {selectedComponentId ? `- ${selectedComponentId} Selected` : ''}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ flex: 1, p: 2, overflow: 'auto', bgcolor: 'grey.50', minHeight: 0 }} data-testid="component-editor-preview">
                      {generatedCode ? (
                        <LiveProvider 
                          code={prepareCodeForComponentEditor(generatedCode, selectedComponentId)} 
                          scope={scope} 
                          noInline={true}
                        >
                          <LiveError />
                          <LivePreview />
                        </LiveProvider>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 2 }}>
                          <MuiIcons.ViewModule sx={{ fontSize: 64, color: 'text.secondary' }} />
                          <Typography variant="h6" color="text.secondary">
                            No Components Available
                          </Typography>
                          <Typography variant="body2" color="text.secondary" textAlign="center">
                            Extract components first to use the Component Editor.
                          </Typography>
                          <Button
                            variant="contained"
                            startIcon={<MuiIcons.ViewModule />}
                            onClick={handleExtractComponents}
                            disabled={!generatedCode || isExtracting}
                          >
                            {isExtracting ? 'Extracting...' : 'Extract Components'}
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </Box>
                  
                  {/* Right Side - Component Details and Analysis */}
                  <Box sx={{ width: 400, borderLeft: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {selectedComponentId ? (
                      <>
                        {/* Selected Component Details */}
                        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                          <Typography variant="h6" gutterBottom>
                            {selectedComponentId}
                          </Typography>
                          {(() => {
                            const component = extractedComponents.find(c => c.name === selectedComponentId);
                            if (!component) return null;
                            
                            return (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Chip label={component.type} size="small" color="primary" />
                                  <Chip label={component.category} size="small" variant="outlined" />
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                  {component.description}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Reusability: {component.reusabilityScore}/10
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Dependencies: {component.dependencies.join(', ')}
                                </Typography>
                              </Box>
                            );
                          })()}
                        </Box>
                        
                        {/* Component Props and Details */}
                        <Box sx={{ flex: 1, p: 2, overflow: 'auto', minHeight: 0 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Component Actions
                          </Typography>
                          
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<ContentCopy />}
                              onClick={() => {
                                const component = extractedComponents.find(c => c.name === selectedComponentId);
                                if (component) {
                                  navigator.clipboard.writeText(component.code);
                                  setSnackbarMessage(`Copied ${component.name} component!`);
                                  setSnackbarOpen(true);
                                }
                              }}
                            >
                              Copy Component Code
                            </Button>
                            
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={isAnalyzingVisuals ? <CircularProgress size={16} /> : <MuiIcons.Compare />}
                              onClick={() => {
                                const component = extractedComponents.find(c => c.name === selectedComponentId);
                                if (component) {
                                  analyzeVisualMatching(component);
                                }
                              }}
                              disabled={!figmaImageUrl || isAnalyzingVisuals}
                            >
                              {isAnalyzingVisuals ? 'Analyzing...' : 'Analyze Visual Match'}
                            </Button>
                          </Box>
                          
                          {/* Visual Analysis Results */}
                          {(() => {
                            const analysisResult = visualMatchingResults.find(r => r.componentName === selectedComponentId);
                            if (!analysisResult) return null;
                            
                            return (
                              <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                  Visual Analysis Results
                                </Typography>
                                
                                <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="subtitle2">
                                      Match Quality
                                    </Typography>
                                    <Chip 
                                      label={`${analysisResult.confidenceScore}%`}
                                      size="small"
                                      color={analysisResult.confidenceScore > 80 ? 'success' : analysisResult.confidenceScore > 60 ? 'warning' : 'error'}
                                    />
                                  </Box>
                                  
                                  <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Found {Object.values(analysisResult.stylingGaps).reduce((acc, gaps) => acc + gaps.length, 0)} styling gaps
                                  </Typography>
                                  
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {Object.entries(analysisResult.stylingGaps).map(([category, gaps]) => (
                                      gaps.length > 0 && (
                                        <Box key={category}>
                                          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                                            {category} ({gaps.length})
                                          </Typography>
                                          <Box sx={{ ml: 1 }}>
                                            {gaps.map((gap, index) => (
                                              <Typography key={index} variant="caption" display="block" color="warning.main">
                                                • {gap}
                                              </Typography>
                                            ))}
                                          </Box>
                                        </Box>
                                      )
                                    ))}
                                  </Box>
                                  
                                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      onClick={() => {
                                        const component = extractedComponents.find(c => c.name === selectedComponentId);
                                        if (component) {
                                          applyVisualFixes(component, analysisResult);
                                        }
                                      }}
                                      disabled={isEnhancingComponent}
                                    >
                                      Apply Fixes
                                    </Button>
                                  </Box>
                                </Card>
                              </Box>
                            );
                          })()}

                          {/* NEW: Match Confirmation Interface */}
                          {boundsMatchingResults && (
                            <Box sx={{ mt: 3 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Match Confirmation
                              </Typography>
                              
                              <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
                                <Typography variant="body2" gutterBottom>
                                  <strong>Overall Confidence:</strong> {Math.round(boundsMatchingResults.overallConfidence)}%
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                  <strong>Components with Candidates:</strong> {boundsMatchingResults.componentMatches.length}
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                  <strong>Unmatched Components:</strong> {boundsMatchingResults.unmatchedComponents.length}
                                </Typography>
                                <Typography variant="body2">
                                  <strong>Unmatched Figma Nodes:</strong> {boundsMatchingResults.unmatchedNodes.length}
                                </Typography>
                              </Card>

                              {/* Show candidates for selected component */}
                              {selectedComponentId && boundsMatchingResults.componentMatches.find(cm => cm.componentBounds.name === selectedComponentId) && (
                                <Card variant="outlined" sx={{ p: 2 }}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Select Match for {selectedComponentId}
                                  </Typography>
                                  {(() => {
                                    const componentMatch = boundsMatchingResults.componentMatches.find(cm => cm.componentBounds.name === selectedComponentId);
                                    if (!componentMatch) return null;
                                    
                                    return (
                                      <Box>
                                        <Typography variant="body2" gutterBottom>
                                          Found {componentMatch.candidates.length} potential matches:
                                        </Typography>
                                        
                                        {componentMatch.candidates.map((candidate, index) => (
                                          <Card 
                                            key={index}
                                            variant="outlined" 
                                            sx={{ 
                                              p: 2, 
                                              mb: 2,
                                              cursor: 'pointer',
                                              border: componentMatch.confirmedMatch?.figmaNode.id === candidate.figmaNode.id ? '2px solid #1976d2' : '1px solid #ddd',
                                              '&:hover': {
                                                backgroundColor: 'grey.50'
                                              }
                                            }}
                                            onClick={() => {
                                              // Update confirmed match
                                              setBoundsMatchingResults(prev => {
                                                if (!prev) return prev;
                                                
                                                const updatedMatches = prev.componentMatches.map(cm => 
                                                  cm.componentBounds.name === selectedComponentId 
                                                    ? { ...cm, confirmedMatch: candidate }
                                                    : cm
                                                );
                                                
                                                return {
                                                  ...prev,
                                                  componentMatches: updatedMatches
                                                };
                                              });
                                            }}
                                          >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                              <Box sx={{ flex: 1 }}>
                                                <Typography variant="subtitle2" gutterBottom>
                                                  {candidate.figmaNode.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                  {candidate.figmaNode.type} • {candidate.reasons.join(', ')}
                                                </Typography>
                                              </Box>
                                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                <Chip 
                                                  label={`${Math.round(candidate.confidence)}%`}
                                                  size="small"
                                                  color={candidate.confidence > 80 ? 'success' : candidate.confidence > 60 ? 'warning' : 'error'}
                                                />
                                                {componentMatch.confirmedMatch?.figmaNode.id === candidate.figmaNode.id && (
                                                  <Chip 
                                                    label="Selected"
                                                    size="small"
                                                    color="primary"
                                                    variant="filled"
                                                  />
                                                )}
                                              </Box>
                                            </Box>
                                            
                                            {/* Show match indicators */}
                                            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                              {candidate.textMatch && <Chip label="Text Match" size="small" color="success" variant="outlined" />}
                                              {candidate.typeMatch && <Chip label="Type Match" size="small" color="info" variant="outlined" />}
                                              {candidate.colorMatch && <Chip label="Visual Match" size="small" color="secondary" variant="outlined" />}
                                            </Box>
                                            
                                            {/* Show Figma node image if available */}
                                            {nodeImages[candidate.figmaNode.id] && (
                                              <Box sx={{ textAlign: 'center' }}>
                                                <img 
                                                  src={nodeImages[candidate.figmaNode.id]} 
                                                  alt={candidate.figmaNode.name}
                                                  style={{ 
                                                    maxWidth: '100%',
                                                    maxHeight: '120px',
                                                    height: 'auto',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '4px'
                                                  }}
                                                />
                                              </Box>
                                            )}
                                          </Card>
                                        ))}
                                        
                                        {componentMatch.confirmedMatch && (
                                          <Button
                                            variant="contained"
                                            size="small"
                                            onClick={() => {
                                              // TODO: Extract precise styling from confirmed match
                                              setSnackbarMessage(`Match confirmed for ${selectedComponentId}! Ready to extract precise styling.`);
                                              setSnackbarOpen(true);
                                            }}
                                            sx={{ mt: 1 }}
                                          >
                                            Extract Styling from Confirmed Match
                                          </Button>
                                        )}
                                      </Box>
                                    );
                                  })()}
                                </Card>
                              )}
                            </Box>
                          )}
                        </Box>
                      </>
                    ) : (
                      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                        <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                          <MuiIcons.TouchApp sx={{ fontSize: 64, mb: 2 }} />
                          <Typography variant="h6" gutterBottom>
                            Select a Component
                          </Typography>
                          <Typography variant="body2">
                            Click on any component chip above to select it and see detailed analysis.
                          </Typography>
                          
                          {/* Show match confirmation overview when no component is selected */}
                          {boundsMatchingResults && (
                            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Match Confirmation Overview
                              </Typography>
                              <Typography variant="body2" gutterBottom>
                                Found {boundsMatchingResults.componentMatches.length} components with candidates
                              </Typography>
                              <Typography variant="body2">
                                Overall confidence: {Math.round(boundsMatchingResults.overallConfidence)}%
                              </Typography>
                              
                              {/* Show all component matches overview */}
                              {boundsMatchingResults.componentMatches.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                  <Typography variant="body2" gutterBottom>
                                    <strong>Components to Confirm:</strong>
                                  </Typography>
                                  {boundsMatchingResults.componentMatches.map((componentMatch, index) => (
                                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                      <Typography variant="caption">
                                        {componentMatch.componentBounds.name} → {componentMatch.candidates.length} candidates
                                        {componentMatch.confirmedMatch && ` (✓ ${componentMatch.confirmedMatch.figmaNode.name})`}
                                      </Typography>
                                      <Chip 
                                        label={componentMatch.confirmedMatch ? 'Confirmed' : 'Pending'}
                                        size="small"
                                        color={componentMatch.confirmedMatch ? 'success' : 'warning'}
                                      />
                                    </Box>
                                  ))}
                                </Box>
                              )}
                              
                              {boundsMatchingResults.unmatchedComponents.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                  <Typography variant="body2" gutterBottom>
                                    <strong>Unmatched Components:</strong>
                                  </Typography>
                                  {boundsMatchingResults.unmatchedComponents.map((component, index) => (
                                    <Typography key={index} variant="caption" component="div">
                                      {component.name}
                                    </Typography>
                                  ))}
                                </Box>
                              )}
                              
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                                💡 Select a component above to confirm its Figma match
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />

      {/* Component Preview Modal */}
      {previewComponent && (
        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">
                {previewComponent.name} Preview
              </Typography>
              <IconButton onClick={() => setPreviewOpen(false)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent>
            <Box sx={{ height: '70vh', display: 'flex', gap: 2 }}>
              {!showComparison ? (
                /* Normal Preview Mode */
                <>
                  {/* Left side - Component Preview */}
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" gutterBottom>
                      Live Preview
                    </Typography>
                    
                    {/* Basic prop editing */}
                    {previewComponent.props.required.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Props:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                          {previewComponent.props.required.map((prop) => (
                            <TextField
                              key={prop}
                              label={prop}
                              size="small"
                              value={previewProps[prop] || ''}
                              onChange={(e) => setPreviewProps(prev => ({ ...prev, [prop]: e.target.value }))}
                              sx={{ minWidth: 120 }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* Component Preview */}
                    <Box sx={{ flex: 1, border: 1, borderColor: 'divider', borderRadius: 1, p: 2, bgcolor: 'grey.50' }}>
                      <LiveProvider 
                        code={prepareComponentCodeForPreview(
                          enhancedComponents.get(previewComponent.name) || previewComponent, 
                          previewProps
                        )} 
                        scope={scope} 
                        noInline={true}
                      >
                        <LiveError />
                        <LivePreview />
                      </LiveProvider>
                    </Box>
                  </Box>

                  {/* Right side - Code */}
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6">
                        Component Code
                      </Typography>
                      {enhancedComponents.has(previewComponent.name) && (
                        <Chip label="Enhanced" color="primary" size="small" />
                      )}
                    </Box>
                    <Box sx={{ flex: 1, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                      <Editor
                        height="100%"
                        defaultLanguage="typescript"
                        value={(enhancedComponents.get(previewComponent.name) || previewComponent).code}
                        theme="vs-light"
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 12,
                          wordWrap: 'on',
                          automaticLayout: true,
                        }}
                      />
                    </Box>
                  </Box>
                </>
              ) : (
                /* Enhancement Comparison Mode */
                <>
                  {/* Left side - Original */}
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" gutterBottom color="text.secondary">
                      Original Component
                    </Typography>
                    <Box sx={{ flex: 1, border: 1, borderColor: 'divider', borderRadius: 1, p: 2, bgcolor: 'grey.50' }}>
                      <LiveProvider 
                        code={prepareComponentCodeForPreview(previewComponent, previewProps)} 
                        scope={scope} 
                        noInline={true}
                      >
                        <LiveError />
                        <LivePreview />
                      </LiveProvider>
                    </Box>
                  </Box>

                  {/* Right side - Enhanced */}
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" gutterBottom color="primary.main">
                      Enhanced Component
                    </Typography>
                    <Box sx={{ flex: 1, border: 2, borderColor: 'primary.main', borderRadius: 1, p: 2, bgcolor: 'grey.50' }}>
                      {currentEnhancement && (
                        <LiveProvider 
                          code={prepareComponentCodeForPreview(currentEnhancement, previewProps)} 
                          scope={scope} 
                          noInline={true}
                        >
                          <LiveError />
                          <LivePreview />
                        </LiveProvider>
                      )}
                    </Box>
                  </Box>
                </>
              )}
            </Box>
          </DialogContent>

          <DialogActions>
            {!showComparison ? (
              /* Normal Mode Actions */
              <>
                <Button 
                  startIcon={<ContentCopy />}
                  onClick={() => {
                    const componentToUse = enhancedComponents.get(previewComponent.name) || previewComponent;
                    navigator.clipboard.writeText(componentToUse.code);
                    setSnackbarMessage('Component code copied to clipboard!');
                    setSnackbarOpen(true);
                  }}
                >
                  Copy Code
                </Button>
                <Button 
                  variant="contained"
                  startIcon={isEnhancingComponent ? <CircularProgress size={16} /> : <Palette />}
                  onClick={() => handleEnhanceIndividualComponent(previewComponent)}
                  disabled={isEnhancingComponent || !designTokens}
                >
                  {isEnhancingComponent ? 'Enhancing...' : 'Enhance Component'}
                </Button>
                <Button onClick={() => setPreviewOpen(false)}>
                  Close
                </Button>
              </>
            ) : (
              /* Comparison Mode Actions */
              <>
                <Button 
                  variant="outlined"
                  onClick={handleRejectEnhancement}
                >
                  Reject
                </Button>
                <Button 
                  variant="contained"
                  color="primary"
                  onClick={handleAcceptEnhancement}
                >
                  Accept Enhancement
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}; 