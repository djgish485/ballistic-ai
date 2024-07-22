'use client';

import React from 'react';

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
  return (
    <div className="flex space-x-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="flex-grow px-2 py-1 border rounded"
        placeholder="Type your message..."
        disabled={isLoading}
      />
      {isAIResponding ? (
        <button
          onClick={handleCancel}
          className="px-4 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Cancel
        </button>
      ) : (
        <button
          onClick={handleSend}
          className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          disabled={isLoading}
        >
          Send
        </button>
      )}
    </div>
  );
};

export default ChatInput;
