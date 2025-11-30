import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  model: string;
  totalCost: number;
  requestCount: number;
  lastRequestTokens?: { in: number; out: number };
}

export const UsageStats: React.FC<Props> = ({ 
  model, 
  totalCost, 
  requestCount,
  lastRequestTokens 
}) => {
  return (
    <Box flexDirection="column" marginBottom={1} borderStyle="round" borderColor="cyan" paddingX={1}>
      <Box>
        <Text bold color="cyan">Model: {model}</Text>
        <Text dimColor> | </Text>
        <Text dimColor>Session: ${totalCost.toFixed(4)} ({requestCount} requests)</Text>
      </Box>
      {lastRequestTokens && (
        <Box>
          <Text dimColor>Last: {lastRequestTokens.in} in / {lastRequestTokens.out} out tokens</Text>
        </Box>
      )}
    </Box>
  );
};
