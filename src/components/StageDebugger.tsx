import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Grid,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  GroupWork as GroupIcon,
  Visibility as VisualIcon,
  Compare as CompareIcon
} from '@mui/icons-material';
import FigmaService from '../services/figmaService';
import SemanticGroupingService, { SemanticGroupingResult } from '../services/semanticGroupingService';
import GPTVisionService, { GPTVisionAnalysis } from '../services/gptVisionService';

interface StageDebuggerProps {
  figmaToken: string;
  openaiApiKey: string;
}

const StageDebugger: React.FC<StageDebuggerProps> = ({
  figmaToken,
  openaiApiKey
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [figmaUrl, setFigmaUrl] = useState('CbS1cPHwdvmOJfPJFzKodU');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Results state
  const [figmaData, setFigmaData] = useState<any>(null);
  const [semanticGrouping, setSemanticGrouping] = useState<SemanticGroupingResult | null>(null);
  const [gptAnalysis, setGptAnalysis] = useState<GPTVisionAnalysis | null>(null);

  const runStage3A = async () => {
    if (!figmaData) {
      setError('Please fetch Figma data first');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      console.log('🔍 Running Stage 3A: Semantic Grouping...');
      const semanticGroupingService = new SemanticGroupingService(openaiApiKey);
      
      const result = await semanticGroupingService.groupComponents(
        figmaData.figmaFile,
        figmaData.figmaComponents
      );
      
      setSemanticGrouping(result);
      console.log('✅ Stage 3A Complete:', result);
      
    } catch (err: any) {
      setError(`Stage 3A failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runStage3B = async () => {
    if (!figmaData || !semanticGrouping) {
      setError('Please run Stage 3A first');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      console.log('🎨 Running Stage 3B: Visual Validation...');
      const gptVisionService = new GPTVisionService(openaiApiKey);
      
      const result = await gptVisionService.analyzeSemanticGroups(
        figmaData.figmaFile,
        figmaData.imageUrl,
        semanticGrouping
      );
      
      setGptAnalysis(result);
      console.log('✅ Stage 3B Complete:', result);
      
    } catch (err: any) {
      setError(`Stage 3B failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFigmaData = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const figmaService = new FigmaService(figmaToken);
      
      // Extract file key and fetch data
      const fileKey = figmaService.extractFileKey(figmaUrl);
      const figmaFile = await figmaService.getFile(fileKey);
      
      // Get main frames and export image
      const mainFrames = figmaService.getMainFrames(figmaFile);
      if (mainFrames.length === 0) {
        throw new Error('No frames found in Figma file');
      }

      const images = await figmaService.getImages(fileKey, [mainFrames[0]], {
        format: 'png',
        scale: 2
      });
      
      const imageUrl = images[mainFrames[0]];
      if (!imageUrl) {
        throw new Error('Failed to export image from Figma');
      }

      // Analyze structure
      const figmaComponents = figmaService.analyzeFileStructure(figmaFile);
      
      setFigmaData({
        figmaFile,
        imageUrl,
        figmaComponents
      });
      
      console.log('📊 Figma data fetched:', { 
        fileName: figmaFile.name, 
        componentsCount: figmaComponents.length,
        imageUrl 
      });
      
    } catch (err: any) {
      setError(`Figma fetch failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🔬 Stage Debugger - 3A & 3B Testing
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Test and debug Stage 3A (Semantic Grouping) and Stage 3B (Visual Validation) independently.
      </Typography>

      {/* Setup Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Setup & Data Fetching
          </Typography>
          
          <TextField
            fullWidth
            label="Figma File ID or URL"
            placeholder="CbS1cPHwdvmOJfPJFzKodU"
            value={figmaUrl}
            onChange={(e) => setFigmaUrl(e.target.value)}
            disabled={isLoading}
            sx={{ mb: 2 }}
          />

          <Button
            variant="contained"
            startIcon={<RunIcon />}
            onClick={fetchFigmaData}
            disabled={!figmaUrl.trim() || isLoading}
            sx={{ mr: 2 }}
          >
            Fetch Figma Data
          </Button>

          {figmaData && (
            <Chip 
              label={`✅ ${figmaData.figmaFile.name} (${figmaData.figmaComponents.length} nodes)`}
              color="success"
            />
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Stage Controls */}
      {figmaData && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Stage Testing Controls
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Button
                  variant="outlined"
                  startIcon={<GroupIcon />}
                  onClick={runStage3A}
                  disabled={isLoading}
                  fullWidth
                  color={semanticGrouping ? 'success' : 'primary'}
                >
                  {isLoading ? <CircularProgress size={20} /> : 'Run Stage 3A'}
                </Button>
                {semanticGrouping && (
                  <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
                    ✅ {semanticGrouping.groups.length} groups ({(semanticGrouping.confidence * 100).toFixed(0)}%)
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} md={4}>
                <Button
                  variant="outlined"
                  startIcon={<VisualIcon />}
                  onClick={runStage3B}
                  disabled={isLoading || !semanticGrouping}
                  fullWidth
                  color={gptAnalysis ? 'success' : 'primary'}
                >
                  {isLoading ? <CircularProgress size={20} /> : 'Run Stage 3B'}
                </Button>
                {gptAnalysis && (
                  <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
                    ✅ {gptAnalysis.components.length} components ({(gptAnalysis.confidence * 100).toFixed(0)}%)
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} md={4}>
                <Button
                  variant="contained"
                  startIcon={<CompareIcon />}
                  disabled={!semanticGrouping || !gptAnalysis}
                  fullWidth
                  onClick={() => setCurrentTab(3)}
                >
                  Compare Results
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Results Tabs */}
      {(semanticGrouping || gptAnalysis) && (
        <Box>
          <Tabs 
            value={currentTab} 
            onChange={(_, newValue) => setCurrentTab(newValue)}
            sx={{ mb: 3 }}
          >
            <Tab label="Stage 3A Results" />
            <Tab label="Stage 3B Results" />
            <Tab label="Raw Data" />
            <Tab label="Comparison" />
          </Tabs>

          {/* Stage 3A Results */}
          {currentTab === 0 && semanticGrouping && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Stage 3A: Semantic Grouping Results
                </Typography>
                
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item>
                    <Chip 
                      label={`${semanticGrouping.groups.length} Groups`}
                      color="primary"
                    />
                  </Grid>
                  <Grid item>
                    <Chip 
                      label={`${(semanticGrouping.confidence * 100).toFixed(0)}% Confidence`}
                      color={semanticGrouping.confidence > 0.8 ? 'success' : 'warning'}
                    />
                  </Grid>
                  <Grid item>
                    <Chip 
                      label={`${semanticGrouping.processingTime}ms`}
                      variant="outlined"
                    />
                  </Grid>
                </Grid>

                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Group Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Children</TableCell>
                        <TableCell>Properties</TableCell>
                        <TableCell>Confidence</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {semanticGrouping.groups.map((group, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {group.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {group.description}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={group.type} />
                          </TableCell>
                          <TableCell>{group.children?.length || 0}</TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {group.properties?.interactive ? '🔘' : '📄'} 
                              {group.properties?.text && ` "${group.properties.text}"`}
                            </Typography>
                          </TableCell>
                          <TableCell>{(group.confidence * 100).toFixed(0)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {/* Stage 3B Results */}
          {currentTab === 1 && gptAnalysis && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Stage 3B: Visual Validation Results
                </Typography>
                
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item>
                    <Chip 
                      label={`${gptAnalysis.components.length} Components`}
                      color="primary"
                    />
                  </Grid>
                  <Grid item>
                    <Chip 
                      label={`${(gptAnalysis.confidence * 100).toFixed(0)}% Confidence`}
                      color={gptAnalysis.confidence > 0.8 ? 'success' : 'warning'}
                    />
                  </Grid>
                  <Grid item>
                    <Chip 
                      label={`Layout: ${gptAnalysis.layout.structure}`}
                      variant="outlined"
                    />
                  </Grid>
                </Grid>

                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Component Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Material-UI</TableCell>
                        <TableCell>Properties</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {gptAnalysis.components.map((comp, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {comp.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {comp.description}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={comp.type} />
                          </TableCell>
                          <TableCell>{comp.materialUIMapping.component}</TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {comp.properties?.interactive ? '🔘' : '📄'} 
                              {comp.properties?.text && ` "${comp.properties.text}"`}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {/* Raw Data */}
          {currentTab === 2 && (
            <Box>
              {semanticGrouping && (
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Raw Stage 3A Data</Typography>
                    <Paper sx={{ p: 2, backgroundColor: 'grey.50', maxHeight: 400, overflow: 'auto' }}>
                      <pre style={{ fontSize: '0.8rem', margin: 0 }}>
                        {JSON.stringify(semanticGrouping, null, 2)}
                      </pre>
                    </Paper>
                  </CardContent>
                </Card>
              )}
              
              {gptAnalysis && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Raw Stage 3B Data</Typography>
                    <Paper sx={{ p: 2, backgroundColor: 'grey.50', maxHeight: 400, overflow: 'auto' }}>
                      <pre style={{ fontSize: '0.8rem', margin: 0 }}>
                        {JSON.stringify(gptAnalysis, null, 2)}
                      </pre>
                    </Paper>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}

          {/* Comparison */}
          {currentTab === 3 && semanticGrouping && gptAnalysis && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Stage 3A vs Stage 3B Comparison
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom color="primary">
                      Stage 3A (Semantic Grouping)
                    </Typography>
                    <Box sx={{ p: 2, backgroundColor: 'primary.light', borderRadius: 1, mb: 2 }}>
                      <Typography variant="body2">
                        • {semanticGrouping.groups.length} semantic groups identified<br/>
                        • {(semanticGrouping.confidence * 100).toFixed(0)}% confidence<br/>
                        • {semanticGrouping.processingTime}ms processing time<br/>
                        • Based on JSON structure analysis
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>Groups:</Typography>
                    {semanticGrouping.groups.map((group, i) => (
                      <Typography key={i} variant="caption" display="block">
                        {i + 1}. {group.name} ({group.type})
                      </Typography>
                    ))}
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom color="success">
                      Stage 3B (Visual Validation)
                    </Typography>
                    <Box sx={{ p: 2, backgroundColor: 'success.light', borderRadius: 1, mb: 2 }}>
                      <Typography variant="body2">
                        • {gptAnalysis.components.length} components validated<br/>
                        • {(gptAnalysis.confidence * 100).toFixed(0)}% confidence<br/>
                        • Layout: {gptAnalysis.layout.structure}<br/>
                        • Based on visual + semantic analysis
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>Components:</Typography>
                    {gptAnalysis.components.map((comp, i) => (
                      <Typography key={i} variant="caption" display="block">
                        {i + 1}. {comp.name} ({comp.type}) → {comp.materialUIMapping.component}
                      </Typography>
                    ))}
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="subtitle2" gutterBottom>
                  Enhancement Analysis
                </Typography>
                <Box sx={{ p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>Improvement:</strong> {gptAnalysis.components.length - semanticGrouping.groups.length} components difference<br/>
                    <strong>Confidence Change:</strong> {((gptAnalysis.confidence - semanticGrouping.confidence) * 100).toFixed(1)}% points<br/>
                    <strong>Stage 3B Impact:</strong> {gptAnalysis.components.length > semanticGrouping.groups.length ? 'Enhanced and refined groups into more specific components' : 'Validated and consolidated semantic groups'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      )}
    </Box>
  );
};

export default StageDebugger; 