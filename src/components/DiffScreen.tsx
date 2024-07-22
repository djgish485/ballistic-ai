'use client';

import React, { useEffect, useState } from 'react';
import { diffLines, Change } from 'diff';

interface DiffScreenProps {
  command: string;
  onClose: () => void;
}

const DiffScreen: React.FC<DiffScreenProps> = ({ command, onClose }) => {
  const [diff, setDiff] = useState<Change[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFileContentAndGenerateDiff = async () => {
      try {
        console.log('Command received:', command);
        const { filePath, newContent } = parseCommand(command);
        console.log('Parsed file path:', filePath);

        if (!filePath || !newContent) {
          setError('Invalid command format');
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
        const existingContent = data.content;
        console.log('Received existing file content:', existingContent.slice(0, 100) + '...');

        const diffResult = diffLines(existingContent, newContent);
        setDiff(diffResult);
      } catch (err) {
        console.error('Error in fetchFileContentAndGenerateDiff:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
    };

    fetchFileContentAndGenerateDiff();
  }, [command]);

  const parseCommand = (cmd: string): { filePath: string | null; newContent: string | null } => {
    console.log('Parsing command:', cmd);
    const lines = cmd.split('\n');
    let filePath: string | null = null;
    let newContent: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      console.log('Checking line:', line);
      if (line.includes("cat << 'EOF' >")) {
        const match = line.match(/cat << 'EOF' > (.+)/);
        if (match && match[1]) {
          filePath = match[1].trim();
          const contentLines = lines.slice(i + 1);
          const eofIndex = contentLines.findIndex(l => l.startsWith('EOF'));
          if (eofIndex !== -1) {
            newContent = contentLines.slice(0, eofIndex).join('\n');
          } else {
            newContent = contentLines.join('\n');
          }
          break;
        }
      }
    }

    console.log('File path:', filePath);
    console.log('New content:', newContent?.slice(0, 100) + '...');
    return { filePath, newContent };
  };

  const renderDiff = () => {
    return diff.map((part, index) => {
      const color = part.added ? 'bg-green-100' : part.removed ? 'bg-red-100' : 'bg-white';
      const prefix = part.added ? '+' : part.removed ? '-' : ' ';
      return (
        <pre key={index} className={`${color} p-1`}>
          {part.value.split('\n').map((line, lineIndex) => (
            <div key={lineIndex}>
              {prefix} {line}
            </div>
          ))}
        </pre>
      );
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-auto">
        <h2 className="text-xl font-bold mb-4">File Diff</h2>
        {error ? (
          <p className="text-red-500">{error}</p>
        ) : diff.length === 0 ? (
          <p>Loading diff...</p>
        ) : (
          <div className="bg-gray-100 p-4 rounded overflow-x-auto">
            {renderDiff()}
          </div>
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