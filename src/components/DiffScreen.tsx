'use client';

import React, { useEffect, useState } from 'react';

interface DiffScreenProps {
  command: string;
  onClose: () => void;
}

const DiffScreen: React.FC<DiffScreenProps> = ({ command, onClose }) => {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFileContent = async () => {
      try {
        console.log('Command received:', command);
        const filePath = parseFilePath(command);
        console.log('Parsed file path:', filePath);

        if (!filePath) {
          setError('Matching file not found');
          return;
        }

        const response = await fetch('/api/read-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ filePath }),
        });

        console.log('API response status:', response.status);

        if (!response.ok) {
          throw new Error('Failed to fetch file content');
        }

        const data = await response.json();
        console.log('Received file content:', data.content.slice(0, 100) + '...');
        setFileContent(data.content);
      } catch (err) {
        console.error('Error in fetchFileContent:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
    };

    fetchFileContent();
  }, [command]);

  const parseFilePath = (cmd: string): string | null => {
    console.log('Parsing command:', cmd);
    const lines = cmd.split('\n');
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      console.log('Checking line:', line);
      if (line.includes("cat << 'EOF' >")) {
        const match = line.match(/cat << 'EOF' > (.+)/);
        if (match && match[1]) {
          console.log('Found file path:', match[1]);
          return match[1].trim();
        }
      }
    }
    console.log('No file path found');
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-auto">
        <h2 className="text-xl font-bold mb-4">File Diff</h2>
        {error ? (
          <p className="text-red-500">{error}</p>
        ) : fileContent === null ? (
          <p>Loading file content...</p>
        ) : (
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            <code>{fileContent}</code>
          </pre>
        )}
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default DiffScreen;