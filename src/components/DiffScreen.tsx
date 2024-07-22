'use client';

import React, { useState, useEffect } from 'react';

interface DiffScreenProps {
  filePath: string;
  onClose: () => void;
}

const DiffScreen: React.FC<DiffScreenProps> = ({ filePath, onClose }) => {
  const [diffContent, setDiffContent] = useState<string>('');

  useEffect(() => {
    // Here you would typically fetch the diff content from your backend
    // For now, we'll just display the file path
    setDiffContent(`Diff for file: ${filePath}`);
  }, [filePath]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-3/4 h-3/4 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Diff View</h2>
          <button
            onClick={onClose}
            className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Close
          </button>
        </div>
        <div className="flex-grow overflow-auto bg-gray-100 p-4 rounded">
          <pre>{diffContent}</pre>
        </div>
      </div>
    </div>
  );
};

export default DiffScreen;
