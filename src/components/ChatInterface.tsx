'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styles from './ChatInterface.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={tomorrow}
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

const ChatInterface: React.FC<{ projectDir: string }> = ({ projectDir }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const processStreamResponse = async (response: Response) => {
    console.log('Processing stream response');
    if (!response.body) {
      console.error('No response body');
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let currentContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      console.log('Received chunk:', chunk);

      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            console.log('Parsed data:', data);
            if (data.content) {
              currentContent += data.content;
              setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
                  newMessages[newMessages.length - 1].content = currentContent;
                } else {
                  newMessages.push({ role: 'assistant', content: currentContent });
                }
                return newMessages;
              });
            } else if (data.conversationHistory) {
              console.log('Received conversation history:', data.conversationHistory);
              setMessages(data.conversationHistory);
            }
          } catch (error) {
            console.error('Error parsing JSON:', error);
          }
        }
      }
    }
    console.log('Stream processing completed');
  };

  const handleStart = async () => {
    console.log('Start button clicked');
    setIsStarted(true);
    setMessages([]);
    setIsLoading(true);

    try {
      console.log('Analyzing project');
      const analyzeResponse = await fetch('/api/analyze-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir })
      });
      const analyzeData = await analyzeResponse.json();
      console.log('Analyze project response:', analyzeData);

      console.log('Starting chat');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir, isInitial: true, conversationHistory: [] })
      });

      await processStreamResponse(response);
    } catch (error) {
      console.error('Error starting chat:', error);
      setMessages([{ role: 'assistant', content: 'An error occurred while starting the chat.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (input.trim() && !isLoading) {
      console.log('Sending message:', input);
      const userMessage: Message = { role: 'user', content: input };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectDir, message: input, isInitial: false, conversationHistory: messages })
        });

        await processStreamResponse(response);
      } catch (error) {
        console.error('Error sending message:', error);
        setMessages(prev => [...prev, { role: 'assistant', content: 'An error occurred while processing your message.' }]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <button
          onClick={handleStart}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          disabled={isLoading}
        >
          {isStarted ? 'Next feature/fix' : 'Start'}
        </button>
      </div>
      <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-100 rounded">
        {messages.map((msg, index) => (
          <div key={index} className={`p-4 rounded ${styles.markdownContent} ${msg.role === 'user' ? 'bg-blue-100' : 'bg-white'}`}>
            <strong>{msg.role === 'user' ? 'You: ' : 'AI: '}</strong>
            <FormattedMessage content={msg.content} />
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <div className="p-4 bg-gray-200 rounded-b">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-grow px-2 py-1 border rounded"
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            disabled={isLoading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;