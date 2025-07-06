import React, { useState, useCallback } from 'react';
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
import FigmaService, { ComponentAnalysis, DesignTokens, FigmaAnalysisResult } from '../../services/figmaService';
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
        setActiveTab(1); // Switch to code/preview tab
        
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
              setActiveTab(2); // Switch to components tab
              setSnackbarMessage(`Successfully extracted ${components.length} components!`);
              setSnackbarOpen(true);
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
      
      // Create preview with full context
      const wrappedCode = `
        ${allComponentDefinitions}
        
        const PreviewComponent = () => {
          // Mock props
          ${Object.entries(props).map(([key, value]) => `const ${key} = ${JSON.stringify(value)};`).join('\n          ')}
          
          // Mock state variables
          ${Object.entries(stateVariables).map(([key, value]) => `const ${key} = ${JSON.stringify(value)};`).join('\n          ')}
          
          // Mock common handlers
          const onClick = () => console.log('Clicked');
          const onSelect = () => console.log('Selected');
          const onBack = () => console.log('Back');
          const onSubmit = () => console.log('Submit');
          const onChange = () => console.log('Changed');
          
          return (
            ${componentCode}
          );
        };
        
        render(<PreviewComponent />);
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

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h4" gutterBottom>
          Claude-4-Sonnet UI Generator
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Mode:
          </Typography>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            size="small"
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
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Query Panel */}
        <Box sx={{ width: '350px', borderRight: 1, borderColor: 'divider', p: 2, overflow: 'auto' }}>
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
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%'}}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                <Tab label="Code Editor" />
                <Tab label="Live Preview" />
                <Tab label={`Components ${extractedComponents.length > 0 ? `(${extractedComponents.length})` : ''}`} />
              </Tabs>
            </Box>

            {/* Code Editor Tab */}
            {activeTab === 0 && (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
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
                </Box>
                <Box sx={{ flex: 1, p: 2, overflow: 'auto', bgcolor: 'grey.50' }}>
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
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
                              
                              <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  startIcon={<ContentCopy />}
                                  onClick={() => {
                                    navigator.clipboard.writeText(component.code);
                                    setSnackbarMessage(`Copied ${component.name} component!`);
                                    setSnackbarOpen(true);
                                  }}
                                  fullWidth
                                >
                                  Copy Code
                                </Button>
                                <IconButton
                                  size="small"
                                  onClick={() => handlePreviewComponent(component)}
                                >
                                  <MuiIcons.Visibility />
                                </IconButton>
                              </Box>
                            </Card>
                          </Grid>
                        ))}
                    </Grid>
                  )}
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
                    code={prepareComponentCodeForPreview(previewComponent, previewProps)} 
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
                <Typography variant="h6" gutterBottom>
                  Component Code
                </Typography>
                <Box sx={{ flex: 1, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                  <Editor
                    height="100%"
                    defaultLanguage="typescript"
                    value={previewComponent.code}
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
            </Box>
          </DialogContent>

          <DialogActions>
            <Button 
              startIcon={<ContentCopy />}
              onClick={() => {
                navigator.clipboard.writeText(previewComponent.code);
                setSnackbarMessage('Component code copied to clipboard!');
                setSnackbarOpen(true);
              }}
            >
              Copy Code
            </Button>
            <Button onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}; 