'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Layout from '../components/Layout';
import { useProjectDir } from '../hooks/useProjectDir';

const ChatInterface = dynamic(() => import('../components/ChatInterface'), { ssr: false });
const FileList = dynamic(() => import('../components/FileList'), { ssr: false });
const APIKeyManager = dynamic(() => import('../components/APIKeyManager'), { ssr: false });

export default function Home() {
  const { projectDir, loading, error } = useProjectDir();

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
            <p className="mb-4">Project Directory: {projectDir}</p>
            <div className="flex flex-grow">
              <div className="flex-grow mr-4">
                <div className="bg-white p-4 rounded shadow h-full">
                  {projectDir && <ChatInterface projectDir={projectDir} />}
                </div>
              </div>
              <div className="w-1/3 space-y-4">
                {projectDir && <FileList projectDir={projectDir} />}
                <APIKeyManager />
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
