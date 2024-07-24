'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ArrowUpTrayIcon, Cog6ToothIcon, TrashIcon } from '@heroicons/react/24/outline';
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
}

const FileList: React.FC<Props> = ({ projectDir, onSettingsUpdate, isChatStarted, onAnalyzeProject }) => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [totalSize, setTotalSize] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hoveredFile, setHoveredFile] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, [projectDir]);

  const fetchFiles = async () => {
    if (!projectDir) {
      console.log('Project directory not available, skipping file fetch');
      return;
    }

    console.log('Fetching files for project directory:', projectDir);
    try {
      const response = await fetch(`/api/list-files?projectDir=${encodeURIComponent(projectDir)}`);
      console.log('API response status:', response.status);
      if (!response.ok) {
        throw new Error('Failed to fetch file list');
      }
      const data = await response.json();
      console.log('Received file list:', data.files);
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
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
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

      console.log('Files uploaded successfully');
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

        console.log('File deleted successfully');
        fetchFiles(); // Refresh the file list
      } catch (err) {
        console.error('Error deleting file:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Context</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleAddFile}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            title="Upload file"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
          </button>
          <button
            onClick={handleSettingsClick}
            className="p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
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
        />
      </div>
      {loading ? (
        <p className="text-gray-600">Loading files...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : files.length === 0 ? (
        <p className="text-gray-600">No files found.</p>
      ) : (
        <>
          <ul className="space-y-1 mb-4">
            {files.map((file, index) => (
              <li 
                key={index} 
                className="flex justify-between hover:bg-gray-100 p-1 rounded text-gray-900"
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
                    className="text-red-500 hover:text-red-700"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                ) : (
                  <span className="text-gray-500">{formatFileSize(file.size)}</span>
                )}
              </li>
            ))}
          </ul>
          <div className="text-right text-gray-600">
            Total size: {formatFileSize(totalSize)}
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
};

export default FileList;
