'use client';

import React, { useRef, useEffect } from 'react';

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  handleSend: () => void;
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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight();
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 9 * 24); // Assuming 24px line height
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex space-x-2">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className="flex-grow px-2 py-1 border rounded resize-none overflow-y-auto"
        placeholder="Type your message..."
        disabled={isLoading}
        rows={1}
        style={{ minHeight: '24px', maxHeight: '216px' }} // 9 lines maximum
      />
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
    </form>
  );
};

export default ChatInput;
