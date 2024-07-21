'use client';

import React, { useEffect, useState, useRef } from 'react';

interface Props {
  projectDir: string;
}

const FileList: React.FC<Props> = ({ projectDir }) => {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Files</h2>
        <button
          onClick={handleAddFile}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add File
        </button>
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
        <ul className="space-y-1">
          {files.map((file, index) => (
            <li key={index} className="hover:bg-gray-100 p-1 rounded text-gray-900">
              {file}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FileList;
