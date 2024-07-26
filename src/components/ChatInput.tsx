'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { PhotoIcon, PaperAirplaneIcon, StopIcon } from '@heroicons/react/24/solid';

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  handleSend: (images: File[]) => void;
  handleCancel: () => void;
  isLoading: boolean;
  isAIResponding: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  handleSend,
  handleCancel,
  isLoading,
  isAIResponding,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight();
  }, [setInput]);

  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 9 * 24);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSend, selectedImages]);

  const handleImageUpload = () => {
    const selectedAPIKeyIndex = sessionStorage.getItem('selectedAPIKeyIndex');
    console.log('handleImageUpload: Selected API Key Index:', selectedAPIKeyIndex);

    if (!selectedAPIKeyIndex) {
      alert('No API key selected.');
      return;
    }

    const selectedAPIKeyType = sessionStorage.getItem('selectedAPIKeyType');
    console.log('handleImageUpload: Selected API Key Type:', selectedAPIKeyType);

    if (selectedAPIKeyType !== 'Claude') {
      alert('Only Claude API supports image attachments.');
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setSelectedImages(prevImages => [...prevImages, ...Array.from(files)]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prevImages => prevImages.filter((_, i) => i !== index));
  };

  const handleSendMessage = () => {
    handleSend(selectedImages);
    setSelectedImages([]); // Clear selected images after sending
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex flex-col space-y-2">
      {selectedImages.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-gray-100 rounded">
          {selectedImages.map((file, index) => (
            <div key={index} className="relative group">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex-grow flex border rounded-lg overflow-hidden bg-white">
        <button
          type="button"
          onClick={handleImageUpload}
          className="p-2 text-blue-500 hover:text-blue-600 focus:outline-none self-end"
        >
          <PhotoIcon className="h-8 w-8" />
        </button>
        <div className="flex-grow flex items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-2 resize-none overflow-y-auto focus:outline-none"
            placeholder="Type your message..."
            disabled={isLoading}
            rows={1}
            style={{ minHeight: '44px', maxHeight: '216px' }}
          />
        </div>
        <button
          type="button"
          onClick={isAIResponding ? handleCancel : handleSendMessage}
          className="p-2 text-blue-500 hover:text-blue-600 focus:outline-none disabled:text-gray-400 self-end"
          disabled={!isAIResponding && (isLoading || (!input.trim() && selectedImages.length === 0))}
        >
          {isAIResponding ? (
            <StopIcon className="h-8 w-8" />
          ) : (
            <PaperAirplaneIcon className="h-8 w-8" />
          )}
        </button>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
      />
    </form>
  );
};

export default React.memo(ChatInput);
