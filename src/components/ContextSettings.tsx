import React, { useState, useEffect } from 'react';

interface ContextSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  projectDir: string;
  onSettingsUpdate: (newIncludePaths: string[]) => void;
  isChatStarted: boolean;
  onAnalyzeProject: () => Promise<void>;
}

const ContextSettings: React.FC<ContextSettingsProps> = ({ 
  isOpen, 
  onClose, 
  projectDir, 
  onSettingsUpdate, 
  isChatStarted,
  onAnalyzeProject
}) => {
  const [includePathsString, setIncludePathsString] = useState<string>('');
  const [excludeDirsString, setExcludeDirsString] = useState<string>('');
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
        setIncludePathsString(settings.includePaths.join(', '));
        setExcludeDirsString(settings.excludeDirs.join(', '));
        setFileExtensions(settings.fileExtensions);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const includePaths = includePathsString.split(',').map(p => p.trim()).filter(p => p !== '');
    const excludeDirs = excludeDirsString.split(',').map(d => d.trim()).filter(d => d !== '');

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
        onSettingsUpdate(includePaths);
        if (isChatStarted) {
          await onAnalyzeProject();
        }
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
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full">
        <h2 className="text-lg font-medium mb-4 dark:text-white">Context Settings</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 dark:text-gray-200">Only Include Paths (comma-separated):</label>
            <input
              type="text"
              value={includePathsString}
              onChange={(e) => setIncludePathsString(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2 dark:text-gray-200">Exclude Directories (comma-separated):</label>
            <input
              type="text"
              value={excludeDirsString}
              onChange={(e) => setExcludeDirsString(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2 dark:text-gray-200">File Extensions (pipe-separated):</label>
            <input
              type="text"
              value={fileExtensions}
              onChange={(e) => setFileExtensions(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContextSettings;