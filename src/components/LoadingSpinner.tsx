import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

export const LoadingSpinner: React.FC = () => {
  return (
    <Box marginBottom={1}>
      <Text color="yellow">
        <Spinner type="dots" /> Thinking...
      </Text>
    </Box>
  );
};
