import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  List,
  ListItem,
  Avatar,
  Chip,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Send as SendIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  Code as CodeIcon,
  Refresh as RefreshIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { useCreate, useUpdate } from '@refinedev/core';

interface VibeSession {
  id: string;
  screen_id: string;
  session_type: 'initial_generation' | 'iteration' | 'chat' | 'refinement';
  user_prompt?: string;
  ai_response?: string;
  generated_code?: string;
  ai_provider?: string;
  confidence_score?: number;
  is_accepted: boolean;
  created_at: string;
}

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

interface VibeChatInterfaceProps {
  screen: Screen;
  sessions: VibeSession[];
  onSessionUpdate: () => void;
  onScreenUpdate: () => void;
}

const VibeChatInterface: React.FC<VibeChatInterfaceProps> = ({
  screen,
  sessions,
  onSessionUpdate,
  onScreenUpdate
}) => {
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { mutate: createSession } = useCreate();
  const { mutate: updateScreen } = useUpdate();
  const { mutate: updateSession } = useUpdate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessions]);

  const handleSendMessage = async () => {
    if (!message.trim() || isProcessing) return;

    setIsProcessing(true);
    const userMessage = message;
    setMessage('');

    try {
      // Create user message session
      const sessionData = {
        screen_id: screen.id,
        session_type: 'chat' as const,
        user_prompt: userMessage,
        is_accepted: false
      };

      createSession({
        resource: 'vibe_sessions',
        values: sessionData
      }, {
        onSuccess: async () => {
          // Simulate AI processing (replace with actual API call)
          await simulateAIResponse(userMessage);
          onSessionUpdate();
        },
        onError: (error) => {
          console.error('Failed to create session:', error);
          setIsProcessing(false);
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setIsProcessing(false);
    }
  };

  const simulateAIResponse = async (userPrompt: string) => {
    // This would be replaced with actual AI API calls
    return new Promise((resolve) => {
      setTimeout(() => {
        const aiResponse = generateMockAIResponse(userPrompt);
        const generatedCode = generateMockCode(userPrompt);

        createSession({
          resource: 'vibe_sessions',
          values: {
            screen_id: screen.id,
            session_type: 'chat' as const,
            user_prompt: userPrompt,
            ai_response: aiResponse,
            generated_code: generatedCode,
            ai_provider: 'mock',
            confidence_score: Math.random() * 0.3 + 0.7, // 0.7-1.0
            is_accepted: false
          }
        }, {
          onSuccess: () => {
            setIsProcessing(false);
            resolve(null);
          }
        });
      }, 2000);
    });
  };

  const generateMockAIResponse = (prompt: string): string => {
    if (prompt.toLowerCase().includes('color')) {
      return "I've updated the color scheme based on your request. The new design uses a more vibrant palette that should better match your brand.";
    } else if (prompt.toLowerCase().includes('button')) {
      return "I've modified the button styles to be more modern and accessible. The new buttons have better spacing and hover effects.";
    } else if (prompt.toLowerCase().includes('layout')) {
      return "I've restructured the layout to be more responsive and user-friendly. The new layout works better on mobile devices.";
    } else {
      return "I've analyzed your request and made the appropriate changes to the code. The updated version should better match your requirements.";
    }
  };

  const generateMockCode = (prompt: string): string => {
    return `// Updated code based on: "${prompt}"
import React from 'react';
import { Box, Button, Typography, Card } from '@mui/material';

const GeneratedComponent = () => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Updated Design
      </Typography>
      <Card sx={{ p: 2, mt: 2 }}>
        <Typography variant="body1">
          This code has been updated based on your feedback.
        </Typography>
        <Button variant="contained" sx={{ mt: 2 }}>
          Action Button
        </Button>
      </Card>
    </Box>
  );
};

export default GeneratedComponent;`;
  };

  const handleAcceptCode = (session: VibeSession) => {
    if (!session.generated_code) return;

    // Update screen with new code
    updateScreen({
      resource: 'screens',
      id: screen.id,
      values: {
        current_code: session.generated_code,
        status: 'ready',
        iteration_count: screen.iteration_count + 1
      }
    }, {
      onSuccess: () => {
        // Mark session as accepted
        updateSession({
          resource: 'vibe_sessions',
          id: session.id,
          values: { is_accepted: true }
        }, {
          onSuccess: () => {
            onScreenUpdate();
            onSessionUpdate();
          }
        });
      }
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    // Could add a toast notification here
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Chat Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">
          Vibe Coding Chat - {screen.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Describe changes you'd like to make to your screen
        </Typography>
      </Box>

      {/* Messages Area */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: 'grey.50' }}>
        <List>
          {sessions.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Start a conversation to modify your screen design. Try asking to change colors, layout, or add new features.
            </Alert>
          )}
          
          {sessions.map((session) => (
            <Box key={session.id} sx={{ mb: 2 }}>
              {/* User Message */}
              {session.user_prompt && (
                <ListItem sx={{ justifyContent: 'flex-end', px: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', maxWidth: '80%' }}>
                    <Paper sx={{ p: 2, bgcolor: 'primary.main', color: 'white', ml: 2 }}>
                      <Typography variant="body2">
                        {session.user_prompt}
                      </Typography>
                    </Paper>
                    <Avatar sx={{ ml: 1, bgcolor: 'primary.main' }}>
                      <PersonIcon />
                    </Avatar>
                  </Box>
                </ListItem>
              )}

              {/* AI Response */}
              {session.ai_response && (
                <ListItem sx={{ justifyContent: 'flex-start', px: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', maxWidth: '80%' }}>
                    <Avatar sx={{ mr: 1, bgcolor: 'secondary.main' }}>
                      <BotIcon />
                    </Avatar>
                    <Paper sx={{ p: 2, bgcolor: 'white' }}>
                      <Typography variant="body2" gutterBottom>
                        {session.ai_response}
                      </Typography>
                      
                      {session.generated_code && (
                        <Card sx={{ mt: 2, bgcolor: 'grey.100' }}>
                          <CardContent sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center' }}>
                                <CodeIcon sx={{ mr: 1, fontSize: 16 }} />
                                Generated Code
                              </Typography>
                              <Box>
                                <Tooltip title="Copy Code">
                                  <IconButton 
                                    size="small"
                                    onClick={() => handleCopyCode(session.generated_code!)}
                                  >
                                    <CopyIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Box>
                            <pre style={{ 
                              fontSize: '12px', 
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              margin: 0
                            }}>
                              {session.generated_code.split('\n')[0]}...
                            </pre>
                            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<ThumbUpIcon />}
                                onClick={() => handleAcceptCode(session)}
                                disabled={session.is_accepted}
                              >
                                {session.is_accepted ? 'Accepted' : 'Accept'}
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<ThumbDownIcon />}
                              >
                                Reject
                              </Button>
                            </Box>
                          </CardContent>
                        </Card>
                      )}
                      
                      {session.confidence_score && (
                        <Box sx={{ mt: 1 }}>
                          <Chip 
                            label={`Confidence: ${(session.confidence_score * 100).toFixed(0)}%`}
                            size="small"
                            color={session.confidence_score > 0.8 ? 'success' : 'warning'}
                          />
                        </Box>
                      )}
                    </Paper>
                  </Box>
                </ListItem>
              )}
            </Box>
          ))}

          {isProcessing && (
            <ListItem sx={{ justifyContent: 'flex-start', px: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ mr: 1, bgcolor: 'secondary.main' }}>
                  <BotIcon />
                </Avatar>
                <Paper sx={{ p: 2, bgcolor: 'white' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    <Typography variant="body2">
                      AI is processing your request...
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            </ListItem>
          )}
        </List>
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'white' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Describe what you'd like to change about your screen..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isProcessing}
            variant="outlined"
            size="small"
          />
          <IconButton
            onClick={handleSendMessage}
            disabled={!message.trim() || isProcessing}
            color="primary"
            sx={{ alignSelf: 'flex-end' }}
          >
            <SendIcon />
          </IconButton>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Press Enter to send, Shift+Enter for new line
        </Typography>
      </Box>
    </Box>
  );
};

export default VibeChatInterface; 