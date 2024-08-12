import React, { useEffect, useState, useRef } from 'react';
import { diffLines, Change } from 'diff';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface DiffScreenProps {
  filePath: string;
  newContent: string;
  onClose: () => void;
  projectDir: string;
}

const DiffScreen: React.FC<DiffScreenProps> = ({ filePath, newContent, onClose, projectDir }) => {
  const [diff, setDiff] = useState<Change[]>([]);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchFileContentAndGenerateDiff = async () => {
      try {
        const response = await fetch('/api/read-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ filePath }),
        });

        if (!response.ok) {
          if (response.status === 404) {
            setError('This is a new file.');
            return;
          }
          throw new Error('Failed to fetch file content');
        }

        const data = await response.json();
        const existingContent = data.content;

        if (existingContent === false) {
          setError('This is a new file.');
          return;
        }

        const diffResult = diffLines(existingContent, newContent);
        setDiff(diffResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
    };

    fetchFileContentAndGenerateDiff();
  }, [filePath, newContent]);

  const renderDiff = () => {
    const language = filePath.split('.').pop() || 'text';
    return (
      <div className="overflow-x-auto">
        <pre className="flex">
          <code className="flex-shrink-0">
            {diff.map((part, index) => {
              const backgroundColor = part.added
                ? 'bg-[#e6ffec] dark:bg-[#0f2f1a]'
                : part.removed
                ? 'bg-[#ffebe9] dark:bg-[#2d1214]'
                : 'bg-white dark:bg-gray-800';
              const textColor = part.added
                ? 'text-green-800 dark:text-green-300'
                : part.removed
                ? 'text-red-800 dark:text-red-300'
                : 'text-gray-800 dark:text-gray-200';
              const prefix = part.added ? '+' : part.removed ? '-' : ' ';
              return (
                <div key={index} className={`${backgroundColor} ${textColor}`}>
                  <SyntaxHighlighter
                    language={language}
                    style={typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? vscDarkPlus : vs}
                    customStyle={{
                      margin: 0,
                      padding: '0.5rem',
                      background: 'transparent',
                    }}
                    showLineNumbers={false}
                    wrapLines={true}
                    lineProps={() => ({
                      style: { display: 'block', width: '100%' },
                    })}
                  >
                    {part.value.split('\n').map(line => `${prefix}${line}`).join('\n')}
                  </SyntaxHighlighter>
                </div>
              );
            })}
          </code>
        </pre>
      </div>
    );
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getRelativeFilePath = (fullPath: string) => {
    if (projectDir && fullPath.startsWith(projectDir)) {
      return fullPath.slice(projectDir.length).replace(/^\//, '');
    }
    return fullPath;
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div
        ref={popupRef}
        className="bg-white dark:bg-gray-900 rounded-lg max-w-3xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 rounded-t-lg border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold dark:text-white">File Diff: {getRelativeFilePath(filePath)}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="overflow-auto p-4 flex-grow">
          {error ? (
            <p className="text-red-500 dark:text-red-400">{error}</p>
          ) : diff.length === 0 ? (
            <p className="dark:text-gray-300">Loading diff...</p>
          ) : (
            <div className="bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
              {renderDiff()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiffScreen;