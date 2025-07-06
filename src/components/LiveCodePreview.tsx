import React from 'react';
import { Box, Typography } from '@mui/material';
import { Visibility as PreviewIcon } from '@mui/icons-material';
import LivePreview from './LivePreview';

interface LiveCodePreviewProps {
  code: string;
}

const LiveCodePreview: React.FC<LiveCodePreviewProps> = ({ code }) => {
  if (!code) {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        flexDirection: 'column',
        color: 'text.secondary'
      }}>
        <PreviewIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
        <Typography variant="h6">No Code to Preview</Typography>
        <Typography variant="body2">
          Generate code first to see the live preview
        </Typography>
      </Box>
    );
  }

  // Use our working LivePreview component
  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <LivePreview 
        code={code}
        height={600}
        showEditor={false}
      />
    </Box>
  );
};

export default LiveCodePreview; 