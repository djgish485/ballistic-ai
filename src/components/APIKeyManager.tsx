'use client';

import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface APIKey {
  type: string;
  key: string;
}

interface APIKeyPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onAddKey: (type: string, key: string) => void;
}

const APIKeyPopup: React.FC<APIKeyPopupProps> = ({ isOpen, onClose, onAddKey }) => {
  const [newKeyType, setNewKeyType] = useState('Claude');
  const [newKey, setNewKey] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddKey(newKeyType, newKey);
    setNewKey('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h2 className="text-lg font-medium mb-4">Add New API Key</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2">API Type:</label>
            <select
              value={newKeyType}
              onChange={(e) => setNewKeyType(e.target.value)}
              className="w-full px-2 py-1 border rounded"
            >
              <option value="Claude">Claude</option>
              <option value="OpenAI">OpenAI</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block mb-2">API Key:</label>
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="w-full px-2 py-1 border rounded"
              placeholder="Enter new API key"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Add Key
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const APIKeyManager: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    try {
      const response = await fetch('/api/api-keys');
      if (!response.ok) throw new Error('Failed to fetch API keys');
      const data = await response.json();
      setApiKeys(data.keys);
      
      const storedIndex = sessionStorage.getItem('selectedAPIKeyIndex');
      if (storedIndex !== null) {
        const index = parseInt(storedIndex, 10);
        if (index >= 0 && index < data.keys.length) {
          setSelectedIndex(index);
          sessionStorage.setItem('selectedAPIKeyType', data.keys[index].type);
        } else {
          sessionStorage.removeItem('selectedAPIKeyIndex');
          sessionStorage.removeItem('selectedAPIKeyType');
        }
      } else if (data.selected !== null) {
        setSelectedIndex(data.selected);
        sessionStorage.setItem('selectedAPIKeyIndex', data.selected.toString());
        sessionStorage.setItem('selectedAPIKeyType', data.keys[data.selected].type);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  const addKey = async (newKeyType: string, newKey: string) => {
    if (newKey.trim()) {
      try {
        const response = await fetch('/api/api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: newKeyType, key: newKey }),
        });
        if (!response.ok) throw new Error('Failed to add API key');
        await fetchAPIKeys();
      } catch (error) {
        console.error('Error adding API key:', error);
      }
    }
  };

  const deleteKey = async (index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    const confirmDelete = window.confirm('Are you sure you want to delete this API key?');
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/api-keys?index=${index}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete API key');
      await fetchAPIKeys();
      
      if (selectedIndex === index) {
        let newSelectedIndex = null;
        if (apiKeys.length > 1) {
          newSelectedIndex = (index === 0) ? 0 : index - 1;
        }
        setSelectedIndex(newSelectedIndex);
        if (newSelectedIndex !== null) {
          sessionStorage.setItem('selectedAPIKeyIndex', newSelectedIndex.toString());
          sessionStorage.setItem('selectedAPIKeyType', apiKeys[newSelectedIndex].type);
        } else {
          sessionStorage.removeItem('selectedAPIKeyIndex');
          sessionStorage.removeItem('selectedAPIKeyType');
        }
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
      sessionStorage.setItem('selectedAPIKeyType', apiKeys[index].type);
    } catch (error) {
      console.error('Error selecting API key:', error);
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">API Keys</h2>
        <button
          onClick={() => setIsPopupOpen(true)}
          className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          title="Add new API key"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="space-y-2">
        {apiKeys.map((key, index) => (
          <div 
            key={index} 
            className={`flex justify-between items-center p-2 rounded cursor-pointer ${
              index === selectedIndex ? 'bg-blue-100' : 
              index === hoveredIndex ? 'bg-gray-100' : ''
            }`}
            onClick={() => selectKey(index)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <span className={index === selectedIndex ? 'font-bold' : ''}>
              [{key.type}] {key.key.slice(0, 8)}...{key.key.slice(-4)}
            </span>
            {index === hoveredIndex && (
              <button
                onClick={(e) => deleteKey(index, e)}
                className="text-red-500 hover:text-red-700"
                title="Delete API key"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        ))}
      </div>
      <APIKeyPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        onAddKey={addKey}
      />
    </div>
  );
};

export default APIKeyManager;
