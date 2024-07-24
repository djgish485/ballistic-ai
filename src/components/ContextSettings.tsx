import React, { useState, useEffect } from 'react';

interface ContextSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  projectDir: string;
}

const ContextSettings: React.FC<ContextSettingsProps> = ({ isOpen, onClose, projectDir }) => {
  const [includePaths, setIncludePaths] = useState<string[]>([]);
  const [excludeDirs, setExcludeDirs] = useState<string[]>([]);
  const [fileExtensions, setFileExtensions] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen, projectDir]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/context-settings?projectDir=${encodeURIComponent(projectDir)}`);
      if (response.ok) {
        const settings = await response.json();
        setIncludePaths(settings.includePaths);
        setExcludeDirs(settings.excludeDirs);
        setFileExtensions(settings.fileExtensions);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/context-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectDir,
          includePaths,
          excludeDirs,
          fileExtensions,
        }),
      });
      if (response.ok) {
        onClose();
      } else {
        console.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h2 className="text-lg font-medium mb-4">Context Settings</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2">Include Paths (comma-separated):</label>
            <input
              type="text"
              value={includePaths.join(',')}
              onChange={(e) => setIncludePaths(e.target.value.split(',').map(p => p.trim()))}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2">Exclude Directories (comma-separated):</label>
            <input
              type="text"
              value={excludeDirs.join(',')}
              onChange={(e) => setExcludeDirs(e.target.value.split(',').map(d => d.trim()))}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2">File Extensions (pipe-separated):</label>
            <input
              type="text"
              value={fileExtensions}
              onChange={(e) => setFileExtensions(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContextSettings;
