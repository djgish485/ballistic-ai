'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Layout from '../components/Layout';
import { useProjectDir } from '../hooks/useProjectDir';

const ChatInterface = dynamic(() => import('../components/ChatInterface'), { ssr: false });
const FileList = dynamic(() => import('../components/FileList'), { ssr: false });
const APIKeyManager = dynamic(() => import('../components/APIKeyManager'), { ssr: false });

export default function Home() {
  const { projectDir, loading, error } = useProjectDir();
  const [includePaths, setIncludePaths] = useState<string[]>([]);

  useEffect(() => {
    if (projectDir) {
      fetchIncludePaths();
    }
  }, [projectDir]);

  const fetchIncludePaths = async () => {
    try {
      const response = await fetch(`/api/context-settings?projectDir=${encodeURIComponent(projectDir)}`);
      if (response.ok) {
        const settings = await response.json();
        setIncludePaths(settings.includePaths);
      }
    } catch (error) {
      console.error('Error fetching include paths:', error);
    }
  };

  const handleSettingsUpdate = (newIncludePaths: string[]) => {
    setIncludePaths(newIncludePaths);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 h-screen flex flex-col">
        <h1 className="text-2xl font-bold mb-4">Superhero</h1>
        {loading ? (
          <p>Loading project directory...</p>
        ) : error ? (
          <p className="text-red-500">Error: {error.message}</p>
        ) : (
          <>
            <p className="mb-2">Project Directory: {projectDir}</p>
            {includePaths.length > 0 && (
              <p className="mb-4">Only Include Paths: {includePaths.join(', ')}</p>
            )}
            <div className="flex flex-grow">
              <div className="flex-grow mr-4">
                <div className="bg-white p-4 rounded shadow h-full">
                  {projectDir && <ChatInterface projectDir={projectDir} />}
                </div>
              </div>
              <div className="w-1/3 space-y-4">
                {projectDir && <FileList projectDir={projectDir} onSettingsUpdate={handleSettingsUpdate} />}
                <APIKeyManager />
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
