import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import LivePreview from './LivePreview';

const LivePreviewTest: React.FC = () => {
  // Simple test code to verify Live Preview works
  const simpleTestCode = `const SimpleComponent = () => {
  return (
    <Box sx={{ p: 2, border: '1px solid #ccc' }}>
      <Typography variant="h6">Hello from Live Preview!</Typography>
      <Button variant="contained" sx={{ mt: 1 }}>Test Button</Button>
    </Box>
  );
};`;

  // Sample code provided by the user
  const sampleCode = `import React from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Avatar
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon 
} from '@mui/icons-material';

const GeneratedFigmaScreen = () => {
  return (
    <Box sx={{
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      fontFamily: 'Roboto, sans-serif',
      p: 3,
      maxWidth: '375px',
      mx: 'auto'
    }}>
      
      {/* Header Section */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 12 }}>
        <IconButton sx={{ mr: 9.999954462051392, backgroundColor: '#f0f0f0' }}>
                <ArrowBackIcon />
              </IconButton>
        <IconButton sx={{ mr: 9.999954462051392, backgroundColor: '#f0f0f0' }}>
                <ArrowBackIcon />
              </IconButton>
      </Box>

      {/* Total Display Section */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 12,
        py: 4
      }}>
        <Typography variant="h6" sx={{ color: '#ff7622', fontFamily: 'Sen' }}>
          Total:
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Sen' }}>
          Value
        </Typography>
      </Box>

      {/* Payment Methods Section */}
      <Box sx={{ mb: 12 }}>
        <Typography variant="body1" sx={{ fontFamily: 'Sen', mb: 4 }}>
              Payment
            </Typography>
        <Box sx={{ 
              width: 85, 
              height: 93, 
              bgcolor: '#f0f0f0', 
              borderRadius: 1, 
              mb: 4 
            }} />
        <Box sx={{ 
              width: 85, 
              height: 72, 
              bgcolor: '#f0f0f0', 
              borderRadius: 1, 
              mb: 4 
            }} />
        <Box sx={{ 
              width: 86, 
              height: 100, 
              bgcolor: '#f0f0f0', 
              borderRadius: 1, 
              mb: 4 
            }} />
        <Box sx={{ 
              width: 85, 
              height: 72, 
              bgcolor: '#f0f0f0', 
              borderRadius: 1, 
              mb: 4 
            }} />
        <Box sx={{ 
              width: 32.221038818359375, 
              height: 24.785280227661133, 
              bgcolor: '#f0f0f0', 
              borderRadius: 1, 
              mb: 4 
            }} />
        <Box sx={{ 
              width: 24, 
              height: 24, 
              bgcolor: '#f0f0f0', 
              borderRadius: 1, 
              mb: 4 
            }} />
        <Box sx={{ 
              width: 85, 
              height: 93, 
              bgcolor: '#f0f0f0', 
              borderRadius: 1, 
              mb: 4 
            }} />
      </Box>

      {/* Action Button Section */}
      <Button 
        variant="contained" 
        fullWidth 
        size="large"
        sx={{ 
          py: 9.999954462051392,
          fontSize: '1.1rem',
          fontWeight: 700,
          backgroundColor: '#FF8C00',
          fontFamily: 'Sen',
          borderRadius: 1,
          '&:hover': {
            backgroundColor: '#FF8C00dd'
          }
        }}
      >
        Action
      </Button>
    </Box>
  );
};

export default GeneratedFigmaScreen;`;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Live Preview Test
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Testing the Live Preview component with sample generated code.
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Simple Test (No Imports):
        </Typography>
        <LivePreview 
          code={simpleTestCode}
          height={200}
          showEditor={false}
        />
      </Paper>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Generated Code Preview:
        </Typography>
        <LivePreview 
          code={sampleCode}
          height={600}
          showEditor={false}
        />
      </Paper>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          With Code Editor (for debugging):
        </Typography>
        <LivePreview 
          code={sampleCode}
          height={400}
          showEditor={true}
        />
      </Paper>
    </Box>
  );
};

export default LivePreviewTest; 