import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  Paper,
  Divider
} from '@mui/material';
import FigmaService from '../services/figmaService';

interface FigmaAPITestProps {
  figmaToken: string;
}

const FigmaAPITest: React.FC<FigmaAPITestProps> = ({ figmaToken }) => {
  const [fileId, setFileId] = useState('CbS1cPHwdvmOJfPJFzKodU');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const testFigmaAPI = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('Testing Figma API with token:', figmaToken ? '✓ Present' : '✗ Missing');
      console.log('Testing with file ID:', fileId);

      const figmaService = new FigmaService(figmaToken);

      // Test 1: Extract file key
      const extractedKey = figmaService.extractFileKey(fileId);
      console.log('Extracted file key:', extractedKey);

      // Test 2: Fetch file data
      const figmaFile = await figmaService.getFile(extractedKey);
      console.log('Figma file data:', figmaFile);

      // Test 3: Get main frames
      const mainFrames = figmaService.getMainFrames(figmaFile);
      console.log('Main frames:', mainFrames);

      // Test 4: Analyze structure
      const components = figmaService.analyzeFileStructure(figmaFile);
      console.log('Analyzed components:', components);

      setResult({
        fileKey: extractedKey,
        fileName: figmaFile.name,
        mainFrames: mainFrames,
        componentCount: components.length,
        components: components.slice(0, 5), // First 5 components
        frameDetails: mainFrames.map(frameId => {
          // Find the frame in components to get its details
          const frame = components.find(c => c.id === frameId);
          return frame ? `FRAME "${frame.name}" (${frame.bounds.width}×${frame.bounds.height})` : frameId;
        }),
        success: true
      });

    } catch (err: any) {
      console.error('Figma API test failed:', err);
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        🔧 Figma API Test
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Test Figma API Connection
          </Typography>
          
          <TextField
            fullWidth
            label="Figma File ID"
            value={fileId}
            onChange={(e) => setFileId(e.target.value)}
            sx={{ mb: 2 }}
            helperText="Your file ID"
          />

          <Alert severity="info" sx={{ mb: 2 }}>
            Token status: {figmaToken ? '✅ Provided' : '❌ Missing'}
          </Alert>

          <Button
            variant="contained"
            onClick={testFigmaAPI}
            disabled={loading || !figmaToken || !fileId}
            fullWidth
          >
            {loading ? 'Testing...' : 'Test Figma API'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Error:</strong> {error}
          </Typography>
        </Alert>
      )}

      {result && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="h6" component="div" sx={{ mb: 1 }}>
            ✅ Figma API Test Results
          </Typography>
          <Typography variant="body2" component="div" sx={{ mb: 1 }}>
            <strong>File Key:</strong> {result.fileKey}<br/>
            <strong>File Name:</strong> {result.fileName}<br/>
            <strong>Main Frames:</strong> {result.mainFrames.length} found<br/>
            <strong>Components:</strong> {result.componentCount} total
          </Typography>
          
          {result.mainFrames.length > 0 && (
            <Typography variant="body2" component="div" sx={{ mt: 2, mb: 1 }}>
              <strong>Main Frames for Export:</strong>
            </Typography>
          )}
          {result.mainFrames.length > 0 && (
            <Box sx={{ bgcolor: 'rgba(0,0,0,0.05)', p: 1, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85em' }}>
              {result.frameDetails.map((frame: string, i: number) => (
                <div key={i}>{frame}</div>
              ))}
            </Box>
          )}
          
          {result.components.length > 0 && (
            <>
              <Typography variant="body2" component="div" sx={{ mt: 2, mb: 1 }}>
                <strong>First 5 Components:</strong>
              </Typography>
              <Box sx={{ bgcolor: 'rgba(0,0,0,0.05)', p: 1, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85em' }}>
                {result.components.slice(0, 5).map((comp: any, i: number) => (
                  <div key={i}>{comp.type} "{comp.name}" ({comp.bounds.width}×{comp.bounds.height})</div>
                ))}
              </Box>
            </>
          )}

          <Typography variant="body2" component="div" sx={{ mt: 2, mb: 1 }}>
            <strong>Frame IDs (for image export):</strong>
          </Typography>
          <Box sx={{ bgcolor: 'rgba(0,0,0,0.05)', p: 1, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85em', wordBreak: 'break-all' }}>
            {result.mainFrames.join(', ') || 'None found'}
          </Box>
        </Alert>
      )}
    </Box>
  );
};

export default FigmaAPITest; 