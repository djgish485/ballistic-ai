'use client';

import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { ArrowUpTrayIcon, Cog6ToothIcon, TrashIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import ContextSettings from './ContextSettings';

interface FileInfo {
  name: string;
  size: number;
  path: string;
}

interface Props {
  projectDir: string;
  onSettingsUpdate: (newIncludePaths: string[]) => void;
  isChatStarted: boolean;
  onAnalyzeProject: () => Promise<void>;
  setIsDynamicContext: React.Dispatch<React.SetStateAction<boolean>>;
  isDynamicContext: boolean;
}

const FileList = forwardRef<{ fetchFiles: () => Promise<void> }, Props>(({ projectDir, onSettingsUpdate, isChatStarted, onAnalyzeProject, setIsDynamicContext, isDynamicContext }, ref) => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [totalSize, setTotalSize] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hoveredFile, setHoveredFile] = useState<string | null>(null);

  const allowedFileTypes = [
    '.txt', '.md', '.json', '.js', '.ts', '.html', '.css', '.xml', '.yml', '.yaml',
    '.py', '.tsx', '.scss', '.less', '.ini', '.cfg', '.sh', '.bat', '.java', '.c',
    '.cpp', '.h', '.hpp', '.cs', '.rb', '.php', '.swift', '.kt', '.dart', '.rs',
    '.go', '.pl', '.lua', '.r', '.jl'
  ];

  useEffect(() => {
    fetchFiles();
  }, [projectDir]);

  useImperativeHandle(ref, () => ({
    fetchFiles,
  }));

  const fetchFiles = async () => {
    if (!projectDir) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/list-files?projectDir=${encodeURIComponent(projectDir)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch file list');
      }
      const data = await response.json();
      setFiles(data.files);
      setTotalSize(data.totalSize);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const formData = new FormData();
    let hasInvalidFile = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (allowedFileTypes.includes(fileExtension)) {
        formData.append('files', file);
      } else {
        hasInvalidFile = true;
      }
    }

    if (hasInvalidFile) {
      alert('One or more files have unsupported file types and were not uploaded. Only the following file types are allowed: ' + allowedFileTypes.join(', '));
    }

    if (formData.getAll('files').length === 0) {
      return;
    }

    formData.append('projectDir', projectDir);

    try {
      const response = await fetch('/api/upload-files', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload files');
      }

      fetchFiles(); // Refresh the file list
    } catch (err) {
      console.error('Error uploading files:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileClick = (filePath: string) => {
    window.open(`/api/file-content?filePath=${encodeURIComponent(filePath)}`, '_blank');
  };

  const handleDeleteFile = async (filePath: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        const response = await fetch('/api/delete-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ filePath }),
        });

        if (!response.ok) {
          throw new Error('Failed to delete file');
        }

        fetchFiles(); // Refresh the file list
      } catch (err) {
        console.error('Error deleting file:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
    }
  };

  const handleDynamicContextChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setIsDynamicContext(newValue);

    try {
      const response = await fetch('/api/save-dynamic-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectDir, isDynamicContext: newValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to save Dynamic Context preference');
      }

      fetchFiles(); // Refresh the file list after changing dynamic context
    } catch (err) {
      console.error('Error saving Dynamic Context preference:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const renderFileList = () => (
    <div>
      {files.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300 mb-4"><i>Project files will be added when you click Start.</i></p>
      ) : (
        <>
          <ul className="space-y-1 mb-4">
            {files.map((file, index) => (
              <li 
                key={index} 
                className="flex justify-between hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded text-gray-900 dark:text-gray-200"
                onMouseEnter={() => setHoveredFile(file.path)}
                onMouseLeave={() => setHoveredFile(null)}
              >
                <span
                  className="cursor-pointer hover:underline"
                  onClick={() => handleFileClick(file.path)}
                >
                  {file.name}
                </span>
                {hoveredFile === file.path ? (
                  <button
                    onClick={(e) => handleDeleteFile(file.path, e)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</span>
                )}
              </li>
            ))}
          </ul>
          <div className="text-right text-gray-600 dark:text-gray-300 mb-4">
            Total size: {formatFileSize(totalSize)}
          </div>
          {totalSize > 400 * 1024 && (
            <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-md mb-4">
              Context length may be too long. Use Dynamic Context or adjust context settings to target the specific areas.
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="bg-white dark:bg-darkBox p-4 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-darkText">Context</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleAddFile}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
            title="Upload file"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
          </button>
          <button
            onClick={handleSettingsClick}
            className="p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
            title="Settings"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </button>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          multiple
          accept={allowedFileTypes.join(',')}
        />
      </div>
      {loading ? (
        <p className="text-gray-600 dark:text-gray-300">Loading files...</p>
      ) : error ? (
        <p className="text-red-500 dark:text-red-400">{error}</p>
      ) : (
        <>
          {renderFileList()}
          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="dynamicContext"
              checked={isDynamicContext}
              onChange={handleDynamicContextChange}
              className="mr-2"
            />
            <label htmlFor="dynamicContext" className="text-gray-700 dark:text-gray-300 flex items-center">
              Dynamic Context
              <div className="relative ml-1 group">
                <InformationCircleIcon className="h-6 w-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 p-2 rounded shadow-lg hidden group-hover:block w-64 text-sm text-gray-700 dark:text-gray-300">
                  <div>Guesses from your request a list of files to include in the context.</div>
                  <div>Tip: if wrong files are included, give hints in your message of where the code could be.</div>
                </div>
              </div>
            </label>
          </div>
        </>
      )}
      <ContextSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        projectDir={projectDir}
        onSettingsUpdate={onSettingsUpdate}
        isChatStarted={isChatStarted}
        onAnalyzeProject={onAnalyzeProject}
      />
    </div>
  );
});

FileList.displayName = 'FileList';

export default FileList;