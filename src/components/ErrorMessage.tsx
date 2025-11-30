import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  message: string;
  type?: 'auth' | 'rate-limit' | 'network' | 'server' | 'unknown';
}

export const ErrorMessage: React.FC<Props> = ({ message, type = 'unknown' }) => {
  const hints: Record<string, string> = {
    'auth': 'Check your ANTHROPIC_API_KEY in ~/.ai-client/config.json',
    'rate-limit': 'Please wait a moment and try again',
    'network': 'Check your internet connection',
    'server': 'Anthropic service issue, try again in a moment',
    'unknown': 'An unexpected error occurred'
  };
  
  return (
    <Box flexDirection="column" marginY={1}>
      <Text color="red" bold>✗ Error: {message}</Text>
      <Text dimColor>{hints[type]}</Text>
    </Box>
  );
};
