import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || 'your-api-key-here',
  dangerouslyAllowBrowser: true // Note: In production, you should proxy through your backend
});

export interface ClaudeRequest {
  prompt: string;
  image?: File;
  mode?: 'description' | 'code-generation';
}

export interface ClaudeResponse {
  content: string;
  error?: string;
  code?: string; // Extracted code for code generation mode
}

export const queryClaude = async (request: ClaudeRequest): Promise<ClaudeResponse> => {
  try {
    const messages: any[] = [];
    
    // System prompt for code generation mode
    const systemPrompt = request.mode === 'code-generation' 
      ? `You are a React component generator. When given a UI description or image, generate a complete React component using Material-UI (@mui/material) components. 

Requirements:
- Use TypeScript
- Use Material-UI components only
- Include all necessary imports
- Make the component fully functional and responsive
- Use proper Material-UI styling with sx prop
- Component should be named 'GeneratedComponent'
- Return ONLY the React component code, no explanation

Example structure:
\`\`\`typescript
import React from 'react';
import { Box, Typography, Button } from '@mui/material';

export const GeneratedComponent = () => {
  return (
    <Box sx={{ p: 2 }}>
      {/* Your component JSX */}
    </Box>
  );
};
\`\`\``
      : undefined;
    
    if (request.image) {
      // Convert image to base64
      const base64Image = await fileToBase64(request.image);
      const mimeType = request.image.type;
      
      messages.push({
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType,
              data: base64Image
            }
          },
          {
            type: "text",
            text: request.mode === 'code-generation' 
              ? `Generate a React component that recreates this UI: ${request.prompt}`
              : request.prompt
          }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: request.mode === 'code-generation' 
          ? `Generate a React component based on this description: ${request.prompt}`
          : request.prompt
      });
    }

    const apiCall: any = {
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      messages: messages
    };

    // Add system prompt as top-level parameter if in code generation mode
    if (systemPrompt) {
      apiCall.system = systemPrompt;
    }

    const response = await anthropic.messages.create(apiCall);

    const content = response.content[0].type === 'text' ? response.content[0].text : 'No text response';
    
    // Extract code if in code generation mode
    let extractedCode = '';
    if (request.mode === 'code-generation') {
      extractedCode = extractCodeFromResponse(content);
    }

    return {
      content,
      code: extractedCode || undefined
    };
  } catch (error) {
    console.error('Error querying Claude:', error);
    return {
      content: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      // Remove the data:image/jpeg;base64, prefix
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
};

const extractCodeFromResponse = (content: string): string => {
  // Try to extract code from markdown code blocks
  const codeBlockRegex = /```(?:typescript|tsx|javascript|jsx)?\n([\s\S]*?)```/g;
  const matches = content.match(codeBlockRegex);
  
  if (matches && matches.length > 0) {
    // Get the largest code block (most likely to be the main component)
    const codeBlocks = matches.map(match => {
      return match.replace(/```(?:typescript|tsx|javascript|jsx)?\n/, '').replace(/```$/, '');
    });
    
    // Return the longest code block
    return codeBlocks.reduce((longest, current) => 
      current.length > longest.length ? current : longest
    );
  }
  
  // If no code blocks found, return the content as is
  return content;
}; 