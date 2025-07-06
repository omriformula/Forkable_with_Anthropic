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
  CircularProgress
} from '@mui/material';
import {
  AutoFixHigh as ProcessingIcon,
  Code as CodeIcon,
  CheckCircle as CompleteIcon,
  Error as ErrorIcon,
  Visibility as PreviewIcon
} from '@mui/icons-material';
import { useCreate, useUpdate } from '@refinedev/core';

interface Screen {
  id: string;
  project_id: string;
  name: string;
  original_image_url: string;
  current_code?: string;
  status: 'processing' | 'iterating' | 'ready' | 'error';
  iteration_count: number;
  confidence_score?: number;
}

interface ImageToCodeProcessorProps {
  screen: Screen;
  onComplete: () => void;
}

const steps = [
  'Analyzing image structure',
  'Identifying UI components',
  'Generating initial code',
  'Optimizing and refining',
  'Ready for vibe-coding'
];

const ImageToCodeProcessor: React.FC<ImageToCodeProcessorProps> = ({
  screen,
  onComplete
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(true);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [error, setError] = useState<string>('');

  const { mutate: updateScreen } = useUpdate();
  const { mutate: createSession } = useCreate();

  useEffect(() => {
    if (screen.status === 'processing') {
      startProcessing();
    }
  }, [screen]);

  const startProcessing = async () => {
    setIsProcessing(true);
    setError('');

    try {
      // Step 1: Analyzing image structure
      await simulateStep(0, "Analyzing the uploaded image structure and layout patterns...");
      
      // Step 2: Identifying UI components
      await simulateStep(1, "Identifying buttons, text fields, images, and other UI elements...");
      
      // Step 3: Generating initial code
      await simulateStep(2, "Generating React component code with Material-UI components...");
      
      // Step 4: Optimizing and refining
      const code = generateInitialCode();
      const confidenceScore = Math.random() * 0.4 + 0.6; // 0.6-1.0
      setGeneratedCode(code);
      setConfidence(confidenceScore);
      await simulateStep(3, "Optimizing code structure and applying best practices...");
      
      // Step 5: Complete
      setActiveStep(4);
      
      // Update screen in database
      updateScreen({
        resource: 'screens',
        id: screen.id,
        values: {
          current_code: code,
          status: 'ready',
          confidence_score: confidenceScore,
          iteration_count: 1
        }
      }, {
        onSuccess: () => {
          // Create initial generation session
          createSession({
            resource: 'vibe_sessions',
            values: {
              screen_id: screen.id,
              session_type: 'initial_generation',
              ai_response: 'Initial code generated from your uploaded screen image.',
              generated_code: code,
              ai_provider: 'hybrid',
              confidence_score: confidenceScore,
              is_accepted: true
            }
          }, {
            onSuccess: () => {
              setIsProcessing(false);
              onComplete();
            }
          });
        },
        onError: (error) => {
          setError('Failed to save generated code');
          setIsProcessing(false);
        }
      });

    } catch (err) {
      setError('Processing failed. Please try again.');
      setIsProcessing(false);
      
      updateScreen({
        resource: 'screens',
        id: screen.id,
        values: { status: 'error' }
      });
    }
  };

  const simulateStep = (stepIndex: number, description: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setActiveStep(stepIndex);
        setTimeout(resolve, 1500 + Math.random() * 2000); // 1.5-3.5 seconds per step
      }, 500);
    });
  };

  const generateInitialCode = (): string => {
    // This would be replaced with actual AI-generated code
    return `import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  AppBar,
  Toolbar,
  IconButton,
  Avatar
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';

const GeneratedScreen = () => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            App Title
          </Typography>
          <IconButton color="inherit">
            <SearchIcon />
          </IconButton>
          <IconButton color="inherit">
            <NotificationsIcon />
          </IconButton>
          <Avatar sx={{ ml: 2 }} />
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Welcome to Your App
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button variant="contained" color="primary">
                    Primary Action
                  </Button>
                  <Button variant="outlined" color="secondary">
                    Secondary Action
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Form Section
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Enter your name"
                    variant="outlined"
                    fullWidth
                  />
                  <TextField
                    label="Enter your email"
                    type="email"
                    variant="outlined"
                    fullWidth
                  />
                  <Button variant="contained" sx={{ alignSelf: 'flex-start' }}>
                    Submit
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default GeneratedScreen;`;
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

  if (screen.status === 'ready') {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CompleteIcon color="success" sx={{ mr: 1 }} />
            <Typography variant="h6">
              Code Generation Complete!
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Your screen has been successfully converted to React code.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Chip 
              label={`Confidence: ${((screen.confidence_score || 0) * 100).toFixed(0)}%`}
              color={screen.confidence_score && screen.confidence_score > 0.8 ? 'success' : 'warning'}
            />
            <Chip label={`Iteration: ${screen.iteration_count}`} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Converting Image to Code
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Our AI is analyzing your screen and generating React code...
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            <Button 
              size="small" 
              onClick={startProcessing}
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
                  {index === 0 && "Analyzing layout structure, identifying elements and their relationships..."}
                  {index === 1 && "Detecting buttons, forms, images, text blocks and navigation elements..."}
                  {index === 2 && "Creating React components with appropriate Material-UI elements..."}
                  {index === 3 && "Applying responsive design principles and code optimization..."}
                  {index === 4 && "Your code is ready! You can now use vibe-chat to make modifications."}
                </Typography>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {activeStep === steps.length - 1 && !isProcessing && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="success">
              <Typography variant="body2">
                Code generation completed with {(confidence * 100).toFixed(0)}% confidence.
                You can now start vibe-coding to refine your design!
              </Typography>
            </Alert>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ImageToCodeProcessor; 