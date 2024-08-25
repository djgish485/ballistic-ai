'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Layout from '../components/Layout';
import { useProjectDir } from '../hooks/useProjectDir';
import { SystemMessage } from '@/types/chat';

const ChatInterface = dynamic(() => import('../components/ChatInterface'), { ssr: false });
const FileList = dynamic(() => import('../components/FileList'), { ssr: false });
const APIKeyManager = dynamic(() => import('../components/APIKeyManager'), { ssr: false });
const History = dynamic(() => import('../components/History'), { ssr: false });

export default function Home() {
  const { projectDir, loading, error } = useProjectDir();
  const [includePaths, setIncludePaths] = useState<string[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [showRestoreAlert, setShowRestoreAlert] = useState(false);
  const [isDynamicContext, setIsDynamicContext] = useState(false);
  const fileListRef = useRef<{ fetchFiles: () => Promise<void> } | null>(null);
  const [fileListKey, setFileListKey] = useState(0);
  const [isBackupInProgress, setIsBackupInProgress] = useState(false);

  useEffect(() => {
    if (projectDir) {
      fetchIncludePaths();
      fetchDynamicContextPreference();
    }
  }, [projectDir]);

  const fetchIncludePaths = async () => {
    try {
      if (projectDir) {
        const response = await fetch(`/api/context-settings?projectDir=${encodeURIComponent(projectDir)}`);
        if (response.ok) {
          const settings = await response.json();
          setIncludePaths(settings.includePaths);
        }
      }
    } catch (error) {
      console.error('Error fetching include paths:', error);
    }
  };

  const fetchDynamicContextPreference = async () => {
    try {
      if (projectDir) {
        const response = await fetch(`/api/save-dynamic-context?projectDir=${encodeURIComponent(projectDir)}`);
        if (response.ok) {
          const settings = await response.json();
          setIsDynamicContext(settings.isDynamicContext);
        }
      }
    } catch (error) {
      console.error('Error fetching Dynamic Context preference:', error);
    }
  };

  const handleSettingsUpdate = (newIncludePaths: string[]) => {
    setIncludePaths(newIncludePaths);
  };

  const handleStart = useCallback(async () => {
    if (!projectDir) return;

    const selectedAPIKeyIndex = sessionStorage.getItem('selectedAPIKeyIndex');
    if (!selectedAPIKeyIndex) {
      alert('Please add and select an API key before starting.');
      return;
    }

    if (isStarted) {
      const confirmed = window.confirm("Are you sure? Chat will be reloaded.");
      if (confirmed) {
        window.location.reload();
        return;
      } else {
        return;
      }
    }

    console.log('Start button clicked. Current state:', { isStarted, hasBackup, projectDir });
    setSystemMessages([]); // Clear previous system messages
    console.log('Starting project analysis and backup...');

    try {
      console.log('Creating backup...');
      setIsBackupInProgress(true);
      const backupResponse = await fetch('/api/project-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir }),
      });
      const backupData = await backupResponse.json();
      if (backupResponse.ok) {
        setHasBackup(true);
        setSystemMessages(prev => [...prev, { type: 'backup', content: 'Project backup created successfully.' }]);
        console.log('Backup created successfully:', backupData.message);
      } else {
        throw new Error(backupData.error || 'Failed to create backup');
      }
      setIsBackupInProgress(false);

      await analyzeProject();

      setIsStarted(true); // Set isStarted to true after successful analysis
      console.log('Project started successfully. Current state:', { isStarted: true, hasBackup: true });
    } catch (error) {
      console.error('Error starting project:', error);
      setIsStarted(false);
      setSystemMessages(prev => [...prev, { type: 'error', content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }]);
      console.log('Project start failed. isStarted set back to false.');
      setIsBackupInProgress(false);
    }
  }, [projectDir, isStarted]);

  const analyzeProject = async () => {
    console.log('Analyzing project...');
    const analyzeResponse = await fetch('/api/analyze-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectDir }),
    });
    const analyzeData = await analyzeResponse.json();
    setSystemMessages(prev => [...prev, { type: 'analysis', content: analyzeData.message }]);
    console.log('Analyze project response:', analyzeData);

    // Update the file list after analysis
    console.log('Attempting to update file list after analysis');
    setFileListKey(prevKey => prevKey + 1);
    console.log('FileList key updated to trigger re-render');
  };

  const handleRestore = useCallback(async () => {
    if (!hasBackup || !projectDir) return;

    const confirmed = window.confirm(
      'Are you sure you want to restore the project to the latest backup? This will replace your current project with the backup.'
    );
    if (!confirmed) return;

    try {
      console.log('Restoring project...');
      const response = await fetch('/api/project-backup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir }),
      });
      const data = await response.json();
      if (response.ok) {
        setIsStarted(false);
        setHasBackup(false);
        setShowRestoreAlert(true);
        console.log('Project restored successfully. showRestoreAlert set to true');
        console.log('Attempting to update file list after restore');
        setFileListKey(prevKey => prevKey + 1);
        console.log('FileList key updated to trigger re-render');
      } else {
        throw new Error(data.error || 'Failed to restore backup');
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      setSystemMessages(prev => [...prev, { type: 'error', content: `Error restoring backup: ${error instanceof Error ? error.message : 'Unknown error'}` }]);
    }
  }, [hasBackup, projectDir]);

  const updateFileList = useCallback(() => {
    console.log('Updating file list after dynamic context build');
    setFileListKey(prevKey => prevKey + 1);
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 h-screen flex flex-col dark:bg-darkBg dark:text-darkText">
        <h1 className="text-2xl font-bold mb-4">Ballistic</h1>
        {loading ? (
          <p>Loading project directory...</p>
        ) : error ? (
          <p className="text-red-500 dark:text-red-400">Error: {error.message}</p>
        ) : (
          <>
            <p className="mb-2">Project Directory: {projectDir}</p>
            {includePaths.length > 0 && (
              <p className="mb-4">Only Include Paths: {includePaths.join(', ')}</p>
            )}
            <div className="mb-4 flex space-x-2">
              <button
                onClick={handleStart}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 dark:bg-green-600 dark:hover:bg-green-700 dark:disabled:bg-gray-600"
              >
                {isStarted ? 'Next Modification' : 'Start'}
              </button>
              {hasBackup && (
                <button
                  onClick={handleRestore}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400 dark:bg-yellow-600 dark:hover:bg-yellow-700 dark:disabled:bg-gray-600"
                  disabled={!isStarted}
                >
                  Undo All & Restore Backup
                </button>
              )}
            </div>
            <div className="flex flex-grow">
              <div className="flex-grow mr-4">
                {projectDir && (
                  <ChatInterface
                    projectDir={projectDir}
                    isStarted={isStarted}
                    hasBackup={hasBackup}
                    onStart={handleStart}
                    onRestore={handleRestore}
                    systemMessages={systemMessages}
                    setIsStarted={setIsStarted}
                    showRestoreAlert={showRestoreAlert}
                    setShowRestoreAlert={setShowRestoreAlert}
                    isDynamicContext={isDynamicContext}
                    updateFileList={updateFileList}
                    setIsDynamicContext={setIsDynamicContext}
                  />
                )}
              </div>
              <div className="min-w-260 w-260 space-y-4">
                {projectDir && (
                  <FileList
                    key={fileListKey}
                    ref={fileListRef}
                    projectDir={projectDir}
                    onSettingsUpdate={handleSettingsUpdate}
                    isChatStarted={isStarted}
                    onAnalyzeProject={analyzeProject}
                    setIsDynamicContext={setIsDynamicContext}
                    isDynamicContext={isDynamicContext}
                  />
                )}
                <APIKeyManager />
                {projectDir && <History projectDir={projectDir} />}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}