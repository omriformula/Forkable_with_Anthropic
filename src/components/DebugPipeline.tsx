import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Card,
  CardContent,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Grid,
  Divider,
  Avatar
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  DataObject as DataIcon,
  Image as ImageIcon,
  Psychology as AIIcon,
  ViewModule as ComponentIcon,
  Code as CodeIcon,
  CheckCircle as CompleteIcon,
  GroupWork as GroupIcon,
  Visibility as VisualIcon
} from '@mui/icons-material';

interface Screen {
  id: string;
  name: string;
  analysis_data?: {
    figmaData: any;
    semanticGrouping: any;
    gptAnalysis: any;
  };
  current_code?: string;
  confidence_score?: number;
  original_image_url?: string;
}

interface DebugPipelineProps {
  screen: Screen;
}

const DebugPipeline: React.FC<DebugPipelineProps> = ({ screen }) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  const { analysis_data } = screen;
  const figmaData = analysis_data?.figmaData;
  const semanticGrouping = analysis_data?.semanticGrouping;
  const gptAnalysis = analysis_data?.gptAnalysis;

  const steps = [
    { 
      label: 'Figma Data',
      icon: <DataIcon />,
      description: 'Raw Figma file structure and components'
    },
    { 
      label: 'Exported Images',
      icon: <ImageIcon />,
      description: 'Generated image exports from Figma'
    },
    { 
      label: 'Stage 3A: Semantic Grouping',
      icon: <GroupIcon />,
      description: 'GPT-3.5 analysis of JSON structure for semantic grouping'
    },
    { 
      label: 'Stage 3B: Visual Validation',
      icon: <VisualIcon />,
      description: 'GPT Vision analysis with image and semantic groups'
    },
    { 
      label: 'Components',
      icon: <ComponentIcon />,
      description: 'Final identified UI components with Material-UI mappings'
    },
    { 
      label: 'Generated Code',
      icon: <CodeIcon />,
      description: 'React component code generation process'
    },
    { 
      label: 'Final Result',
      icon: <CompleteIcon />,
      description: 'Summary and final output'
    }
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        🔍 Debug Pipeline - {screen.name}
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        This debug interface shows the output of each step in the Figma-to-code processing pipeline.
      </Alert>

      <Tabs 
        value={currentStep} 
        onChange={(_, newValue) => setCurrentStep(newValue)} 
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        {steps.map((step, index) => (
          <Tab 
            key={index}
            label={step.label}
            icon={step.icon}
            iconPosition="start"
          />
        ))}
      </Tabs>

      {/* Step 1: Figma Data */}
      {currentStep === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Step 1: Figma File Data
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Raw JSON structure fetched from Figma Files API
          </Typography>
          
          {figmaData?.fileData ? (
            <Card>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>File Information</Typography>
                    <Typography><strong>Name:</strong> {figmaData.fileData.name}</Typography>
                    <Typography><strong>Last Modified:</strong> {figmaData.fileData.lastModified}</Typography>
                    {figmaData.fileData.thumbnailUrl && (
                      <Box sx={{ mt: 2 }}>
                        <img 
                          src={figmaData.fileData.thumbnailUrl} 
                          alt="File thumbnail" 
                          style={{ maxWidth: '200px', height: 'auto' }}
                        />
                      </Box>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>Document Structure</Typography>
                    <Paper sx={{ p: 2, maxHeight: 300, overflow: 'auto', backgroundColor: 'grey.50' }}>
                      <pre style={{ fontSize: '0.8rem', margin: 0 }}>
                        {JSON.stringify(figmaData.fileData.document, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ) : (
            <Alert severity="warning">No Figma file data available</Alert>
          )}
        </Box>
      )}

      {/* Step 2: Exported Images */}
      {currentStep === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Step 2: Exported Images
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Images exported from Figma using the Images API
          </Typography>
          
          {figmaData?.imageUrl || screen.original_image_url ? (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Exported Image</Typography>
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <img 
                    src={figmaData?.imageUrl || screen.original_image_url} 
                    alt="Exported Figma design"
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '500px', 
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px'
                    }}
                  />
                </Box>
                <Typography variant="body2">
                  <strong>Image URL:</strong> {figmaData?.imageUrl || screen.original_image_url}
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Alert severity="warning">No exported image available</Alert>
          )}
        </Box>
      )}

      {/* Step 3A: Semantic Grouping */}
      {currentStep === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Stage 3A: Semantic Grouping Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            GPT-3.5 Turbo analysis of Figma JSON structure to identify logical UI component groups
          </Typography>
          
          {semanticGrouping ? (
            <Box>
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Semantic Grouping Summary</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Chip 
                        label={`Confidence: ${(semanticGrouping.confidence * 100).toFixed(0)}%`}
                        color={semanticGrouping.confidence > 0.8 ? 'success' : 'warning'}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <Chip label={`Groups: ${semanticGrouping.groups?.length || 0}`} />
                    </Grid>
                    <Grid item xs={4}>
                      <Chip label={`Processing: ${semanticGrouping.processingTime}ms`} />
                    </Grid>
                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        <strong>Grouped:</strong> {semanticGrouping.groupedNodes} / {semanticGrouping.totalNodes} nodes
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Semantic Groups ({semanticGrouping.groups?.length || 0})</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Group Name</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Children</TableCell>
                          <TableCell>Confidence</TableCell>
                          <TableCell>Properties</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {semanticGrouping.groups?.map((group: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {group.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {group.description}
                              </Typography>
                            </TableCell>
                            <TableCell><Chip size="small" label={group.type} /></TableCell>
                            <TableCell>
                              <Typography variant="caption">
                                {group.children?.length || 0} nodes
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">
                                {(group.confidence * 100).toFixed(0)}%
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">
                                {group.properties?.interactive ? '🔘 Interactive' : '📄 Static'}
                                {group.properties?.text && ` | "${group.properties.text}"`}
                              </Typography>
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
                  <Typography variant="h6">Ungrouped Nodes ({semanticGrouping.ungroupedNodes?.length || 0})</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Paper sx={{ p: 2, backgroundColor: 'grey.50', maxHeight: 300, overflow: 'auto' }}>
                    {semanticGrouping.ungroupedNodes?.map((node: any, index: number) => (
                      <Typography key={index} variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                        {node.type} "{node.name}" ({node.bounds?.width}×{node.bounds?.height})
                      </Typography>
                    ))}
                  </Paper>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Raw Semantic Grouping Response</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Paper sx={{ p: 2, backgroundColor: 'grey.50', maxHeight: 400, overflow: 'auto' }}>
                    <pre style={{ fontSize: '0.8rem', margin: 0 }}>
                      {JSON.stringify(semanticGrouping, null, 2)}
                    </pre>
                  </Paper>
                </AccordionDetails>
              </Accordion>
            </Box>
          ) : (
            <Alert severity="warning">No semantic grouping data available</Alert>
          )}
        </Box>
      )}

      {/* Step 3B: Visual Validation */}
      {currentStep === 3 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Stage 3B: Visual Validation Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            GPT Vision analysis using both the image and pre-processed semantic groups
          </Typography>
          
          {gptAnalysis ? (
            <Box>
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Visual Validation Summary</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Chip 
                        label={`Confidence: ${(gptAnalysis.confidence * 100).toFixed(0)}%`}
                        color={gptAnalysis.confidence > 0.8 ? 'success' : 'warning'}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <Chip label={`Components: ${gptAnalysis.components?.length || 0}`} />
                    </Grid>
                    <Grid item xs={4}>
                      <Chip label={`Layout: ${gptAnalysis.layout?.structure}`} />
                    </Grid>
                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        <strong>Stage 3B Enhancement:</strong> Visual validation {gptAnalysis.components?.length > (semanticGrouping?.groups?.length || 0) ? 'refined and expanded' : 'validated'} the semantic groups
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Visual Validation Results ({gptAnalysis.components?.length || 0})</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Material-UI</TableCell>
                          <TableCell>Properties</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {gptAnalysis.components?.map((comp: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{comp.name}</TableCell>
                            <TableCell><Chip size="small" label={comp.type} /></TableCell>
                            <TableCell>{comp.materialUIMapping?.component}</TableCell>
                            <TableCell>
                              <Typography variant="caption">
                                {Object.keys(comp.properties || {}).join(', ')}
                              </Typography>
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
                  <Typography variant="h6">Design System Analysis</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>Colors</Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {Object.entries(gptAnalysis.designSystem?.colors || {}).map(([key, color]) => (
                          <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box 
                              sx={{ 
                                width: 20, 
                                height: 20, 
                                backgroundColor: color as string,
                                border: '1px solid #ccc',
                                borderRadius: 1
                              }} 
                            />
                            <Typography variant="caption">{key}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>Typography</Typography>
                      <Typography variant="body2">
                        Font: {gptAnalysis.designSystem?.typography?.fontFamily || 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Raw GPT Vision Response</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Paper sx={{ p: 2, backgroundColor: 'grey.50', maxHeight: 400, overflow: 'auto' }}>
                    <pre style={{ fontSize: '0.8rem', margin: 0 }}>
                      {JSON.stringify(gptAnalysis, null, 2)}
                    </pre>
                  </Paper>
                </AccordionDetails>
              </Accordion>
            </Box>
          ) : (
            <Alert severity="warning">No GPT Vision analysis data available</Alert>
          )}
        </Box>
      )}

      {/* Step 4: Components */}
      {currentStep === 4 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Step 4: Component Identification
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            UI components identified and mapped to Material-UI
          </Typography>
          
          {gptAnalysis?.components ? (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Component Analysis ({gptAnalysis.components.length} components)
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Component</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Material-UI Mapping</TableCell>
                        <TableCell>Bounds</TableCell>
                        <TableCell>Properties</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {gptAnalysis.components.map((comp: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {comp.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={comp.type} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {comp.materialUIMapping?.component || 'None'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {comp.bounds ? `${comp.bounds.width}×${comp.bounds.height}` : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {comp.properties?.text ? `"${comp.properties.text}"` : 'No text'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          ) : (
            <Alert severity="warning">No component identification data available</Alert>
          )}
        </Box>
      )}

      {/* Step 5: Generated Code */}
      {currentStep === 5 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Step 5: React Code Generation
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Final React component code generated from analysis
          </Typography>
          
          {screen.current_code ? (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Generated React Component</Typography>
                <Paper sx={{ p: 2, backgroundColor: 'grey.50', maxHeight: 500, overflow: 'auto' }}>
                  <pre style={{ fontSize: '0.85rem', margin: 0 }}>
                    {screen.current_code}
                  </pre>
                </Paper>
              </CardContent>
            </Card>
          ) : (
            <Alert severity="warning">No generated code available</Alert>
          )}
        </Box>
      )}

      {/* Step 6: Final Result */}
      {currentStep === 6 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Step 6: Final Result
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Summary of the complete processing pipeline
          </Typography>
          
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Processing Summary</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Quality Metrics</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip 
                      label={`Confidence: ${(screen.confidence_score || 0) * 100}%`}
                      color={(screen.confidence_score || 0) > 0.8 ? 'success' : 'warning'}
                    />
                    <Chip label={`Components: ${gptAnalysis?.components?.length || 0}`} />
                    <Chip label={`Code Lines: ${screen.current_code?.split('\n').length || 0}`} />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Status</Typography>
                  <Chip label="Ready for Vibe-Coding" color="success" />
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>Identified Issues</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {(!gptAnalysis?.components || gptAnalysis.components.length < 3) && (
                  <Alert severity="warning">
                    Low component count - may indicate poor analysis
                  </Alert>
                )}
                {(screen.confidence_score || 0) < 0.7 && (
                  <Alert severity="warning">
                    Low confidence score - analysis may be inaccurate
                  </Alert>
                )}
                {(!screen.current_code || screen.current_code.length < 500) && (
                  <Alert severity="warning">
                    Generated code is very short - may be incomplete
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default DebugPipeline; 