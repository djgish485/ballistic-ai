'use client';

import React, { useState, useEffect } from 'react';

interface APIKey {
  type: string;
  key: string;
}

const APIKeyManager: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [newKey, setNewKey] = useState('');
  const [newKeyType, setNewKeyType] = useState('Claude');

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    try {
      const response = await fetch('/api/api-keys');
      if (!response.ok) throw new Error('Failed to fetch API keys');
      const data = await response.json();
      setApiKeys(data.keys);
      
      // Check sessionStorage for selectedAPIKeyIndex
      const storedIndex = sessionStorage.getItem('selectedAPIKeyIndex');
      if (storedIndex !== null) {
        const index = parseInt(storedIndex, 10);
        if (index >= 0 && index < data.keys.length) {
          setSelectedIndex(index);
          await selectKey(index);
        } else {
          // If stored index is invalid, clear it
          sessionStorage.removeItem('selectedAPIKeyIndex');
        }
      } else if (data.selected !== null) {
        // If no stored index, use the server's selected index
        setSelectedIndex(data.selected);
        sessionStorage.setItem('selectedAPIKeyIndex', data.selected.toString());
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  const addKey = async () => {
    if (newKey.trim()) {
      try {
        const response = await fetch('/api/api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: newKeyType, key: newKey }),
        });
        if (!response.ok) throw new Error('Failed to add API key');
        await fetchAPIKeys();
        setNewKey('');
      } catch (error) {
        console.error('Error adding API key:', error);
      }
    }
  };

  const deleteKey = async (index: number) => {
    try {
      const response = await fetch(`/api/api-keys?index=${index}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete API key');
      await fetchAPIKeys();
      if (selectedIndex === index) {
        setSelectedIndex(null);
        sessionStorage.removeItem('selectedAPIKeyIndex');
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
    }
  };

  const selectKey = async (index: number) => {
    try {
      const response = await fetch('/api/api-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected: index }),
      });
      if (!response.ok) throw new Error('Failed to select API key');
      setSelectedIndex(index);
      sessionStorage.setItem('selectedAPIKeyIndex', index.toString());
    } catch (error) {
      console.error('Error selecting API key:', error);
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-lg font-semibold mb-2">API Keys</h2>
      <div className="space-y-2">
        {apiKeys.map((key, index) => (
          <div key={index} className="flex justify-between items-center">
            <span className={index === selectedIndex ? 'font-bold' : ''}>
              [{key.type}] {key.key.slice(0, 8)}...{key.key.slice(-4)}
            </span>
            <div>
              <button
                onClick={() => selectKey(index)}
                className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
              >
                Select
              </button>
              <button
                onClick={() => deleteKey(index)}
                className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <select
          value={newKeyType}
          onChange={(e) => setNewKeyType(e.target.value)}
          className="w-full px-2 py-1 border rounded"
        >
          <option value="Claude">Claude</option>
          <option value="OpenAI">OpenAI</option>
        </select>
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          className="w-full px-2 py-1 border rounded"
          placeholder="Enter new API key"
        />
        <button
          onClick={addKey}
          className="w-full px-4 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Add Key
        </button>
      </div>
    </div>
  );
};

export default APIKeyManager;