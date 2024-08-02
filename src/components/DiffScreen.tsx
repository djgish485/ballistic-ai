import React, { useEffect, useState, useRef } from 'react';
import { diffLines, Change } from 'diff';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface DiffScreenProps {
  filePath: string;
  newContent: string;
  onClose: () => void;
}

const DiffScreen: React.FC<DiffScreenProps> = ({ filePath, newContent, onClose }) => {
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

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div
        ref={popupRef}
        className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white p-4 rounded-t-lg border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">File Diff: {filePath}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="overflow-auto p-4 flex-grow">
          {error ? (
            <p className="text-red-500">{error}</p>
          ) : diff.length === 0 ? (
            <p>Loading diff...</p>
          ) : (
            <div className="bg-gray-100 p-4 rounded overflow-x-auto">
              {renderDiff()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiffScreen;