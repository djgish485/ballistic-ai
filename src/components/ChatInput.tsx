'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';

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
      handleSend(selectedImages);
    }
  }, [handleSend, selectedImages]);

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setSelectedImages(Array.from(files));
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSend(selectedImages); }} className="flex flex-col space-y-2">
      {selectedImages.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-gray-100 rounded">
          {selectedImages.map((file, index) => (
            <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
              {file.name}
            </span>
          ))}
        </div>
      )}
      <div className="flex space-x-2">
        <div className="flex-grow flex items-center border rounded overflow-hidden">
          <button
            type="button"
            onClick={handleImageUpload}
            className="px-2 py-1 bg-gray-200 text-gray-700 hover:bg-gray-300 focus:outline-none"
          >
            U
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-grow px-2 py-1 resize-none overflow-y-auto focus:outline-none"
            placeholder="Type your message..."
            disabled={isLoading}
            rows={1}
            style={{ minHeight: '24px', maxHeight: '216px' }}
          />
        </div>
        {isAIResponding ? (
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Cancel
          </button>
        ) : (
          <button
            type="submit"
            className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            disabled={isLoading}
          >
            Send
          </button>
        )}
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
