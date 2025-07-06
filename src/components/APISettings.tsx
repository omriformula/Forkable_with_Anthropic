import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
  Link
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Visibility,
  VisibilityOff,
  OpenInNew as ExternalLinkIcon
} from '@mui/icons-material';

interface APISettingsProps {
  open: boolean;
  onClose: () => void;
  onSave: (settings: APISettings) => void;
  currentSettings?: APISettings;
}

export interface APISettings {
  figmaToken: string;
  openaiApiKey: string;
}

const APISettings: React.FC<APISettingsProps> = ({
  open,
  onClose,
  onSave,
  currentSettings
}) => {
  const [figmaToken, setFigmaToken] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [showFigmaToken, setShowFigmaToken] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (currentSettings) {
      setFigmaToken(currentSettings.figmaToken);
      setOpenaiApiKey(currentSettings.openaiApiKey);
    }
  }, [currentSettings]);

  const validateSettings = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!figmaToken.trim()) {
      newErrors.figmaToken = 'Figma token is required';
    } else if (!figmaToken.startsWith('figd_') && !figmaToken.startsWith('figpat_')) {
      newErrors.figmaToken = 'Invalid Figma token format';
    }

    if (!openaiApiKey.trim()) {
      newErrors.openaiApiKey = 'OpenAI API key is required';
    } else if (!openaiApiKey.startsWith('sk-')) {
      newErrors.openaiApiKey = 'Invalid OpenAI API key format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateSettings()) {
      onSave({
        figmaToken,
        openaiApiKey
      });
      onClose();
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SettingsIcon sx={{ mr: 1 }} />
          API Settings
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          You need API keys to analyze Figma designs. Don't worry - these are stored locally in your browser.
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Figma Access Token
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Generate a personal access token from your Figma account settings.
            <Link 
              href="https://www.figma.com/developers/api#access-tokens" 
              target="_blank" 
              sx={{ ml: 1 }}
            >
              Learn how <ExternalLinkIcon fontSize="small" />
            </Link>
          </Typography>
          <TextField
            fullWidth
            label="Figma Token"
            type={showFigmaToken ? 'text' : 'password'}
            value={figmaToken}
            onChange={(e) => setFigmaToken(e.target.value)}
            error={!!errors.figmaToken}
            helperText={errors.figmaToken || 'Starts with figd_ or figpat_'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowFigmaToken(!showFigmaToken)}
                    edge="end"
                  >
                    {showFigmaToken ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            OpenAI API Key
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Get your API key from OpenAI to use GPT Vision for design analysis.
            <Link 
              href="https://platform.openai.com/api-keys" 
              target="_blank" 
              sx={{ ml: 1 }}
            >
              Get API key <ExternalLinkIcon fontSize="small" />
            </Link>
          </Typography>
          <TextField
            fullWidth
            label="OpenAI API Key"
            type={showOpenaiKey ? 'text' : 'password'}
            value={openaiApiKey}
            onChange={(e) => setOpenaiApiKey(e.target.value)}
            error={!!errors.openaiApiKey}
            helperText={errors.openaiApiKey || 'Starts with sk-'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                    edge="end"
                  >
                    {showOpenaiKey ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Alert severity="warning">
          <Typography variant="body2">
            <strong>Privacy Note:</strong> Your API keys are stored locally in your browser and never sent to our servers. 
            They are only used to communicate directly with Figma and OpenAI APIs.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default APISettings; 