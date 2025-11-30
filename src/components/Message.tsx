import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  role: 'user' | 'assistant';
  content: string;
}

export const Message: React.FC<Props> = ({ role, content }) => {
  const color = role === 'user' ? 'green' : 'blue';
  const label = role === 'user' ? 'you' : 'claude';
  
  return (
    <Box marginBottom={1}>
      <Text bold color={color}>{label}&gt; </Text>
      <Text>{content}</Text>
    </Box>
  );
};
