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
  Snackbar
} from '@mui/material';
import { 
  Send, 
  Description, 
  Code, 
  Save, 
  Download,
  ContentCopy,
  PlayArrow,
  Refresh
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import Editor from '@monaco-editor/react';
import { LiveProvider, LiveError, LivePreview, withLive } from 'react-live';
import { queryClaude, ClaudeRequest, ClaudeResponse } from '../../services/claude';
import { figmaService, FigmaService } from '../../services/figma';
import * as MuiComponents from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import { 
  Google, 
  Microsoft, 
  Visibility, 
  VisibilityOff
} from '@mui/icons-material';
import { CLAUDE_ANALYSIS_PROMPT } from './prompt';

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
  const [figmaUrl, setFigmaUrl] = useState('https://www.figma.com/design/CbS1cPHwdvmOJfPJFzKodU/Forkable-Testing-V3?node-id=66-186&m=draw');
  const [figmaImageUrl, setFigmaImageUrl] = useState<string | null>(null);
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ClaudeResponse | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleFetchFigmaImage = async () => {
    if (!figmaPat.trim() || !figmaUrl.trim()) {
      setSnackbarMessage('Please enter both Figma PAT and URL');
      setSnackbarOpen(true);
      return;
    }

    setIsFetchingImage(true);
    try {
      const fileId = FigmaService.extractFileId(figmaUrl);
      const nodeId = FigmaService.extractNodeId(figmaUrl);
      
      console.log('Extracted File ID:', fileId);
      console.log('Extracted Node ID:', nodeId);
      
      const config = {
        pat: figmaPat,
        fileId,
        nodeId
      };

      const imageUrl = await figmaService.getFileScreenshot(config);
      setFigmaImageUrl(imageUrl);
      setSnackbarMessage('Figma image fetched successfully!');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error fetching Figma image:', error);
      setSnackbarMessage(`Failed to fetch Figma image: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                <Tab label="Code Editor" />
                <Tab label="Live Preview" />
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
    </Box>
  );
}; 