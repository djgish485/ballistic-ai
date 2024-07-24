'use client';

import { useState, useEffect } from 'react';
import { setupDirectories } from '@/utils/directoryUtils';

export function useProjectDir() {
  const [projectDir, setProjectDir] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchProjectDir() {
      try {
        const response = await fetch('/api/project-dir');
        if (!response.ok) {
          throw new Error('Failed to fetch project directory');
        }
        const data = await response.json();
        setProjectDir(data.projectDir);
        
        // Call setupDirectories after setting the project directory
        setupDirectories(data.projectDir);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('An unknown error occurred'));
      } finally {
        setLoading(false);
      }
    }

    fetchProjectDir();
  }, []);

  return { projectDir, loading, error };
}
