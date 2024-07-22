'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ExecutionResult {
  id: string;
  output: string;
}

const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);
  const [codeBlockIds, setCodeBlockIds] = useState<Record<number, string>>({});

  const generateId = () => `code-${Math.random().toString(36).substr(2, 9)}`;

  const handleExecute = async (code: string, id: string) => {
    try {
      const response = await fetch('/api/execute-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const result = await response.json();
      const linesCount = code.split('\n').length;

      console.log(`Execution result (${id}):`, result);

      setExecutionResults((prevResults) => {
        const newResult = { id, output: `Executed ${linesCount} lines of code.\n\n${result.output}` };
        return [...prevResults.filter((res) => res.id !== id), newResult];
      });
    } catch (error) {
      console.error(`Error executing code block (${id}):`, error);
      setExecutionResults((prevResults) => {
        const newResult = { id, output: 'Error executing code, please check the console for more details.' };
        console.log('Setting error execution result:', newResult);
        return [...prevResults.filter((res) => res.id !== id), newResult];
      });
    }
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          if (inline) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          } else {
            const nodeIndex = node.position?.start.line ?? Math.random();
            let id = codeBlockIds[nodeIndex];
            if (!id) {
              id = generateId();
              setCodeBlockIds((prevIds) => ({
                ...prevIds,
                [nodeIndex]: id,
              }));
            }

            const match = /language-(\w+)/.exec(className || '');

            return match ? (
              <div>
                <SyntaxHighlighter
                  style={tomorrow as any}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
                <button
                  onClick={() => handleExecute(String(children), id)}
                  className="px-2 py-1 bg-green-500 text-white rounded mt-2 hover:bg-green-600"
                >
                  Execute
                </button>
                <div className="mt-2 bg-gray-100 p-2 rounded">
                  {executionResults.find((res) => res.id === id)?.output}
                </div>
              </div>
            ) : (
              <div>
                <pre className={className} {...props}>
                  {children}
                </pre>
                <button
                  onClick={() => handleExecute(String(children), id)}
                  className="px-2 py-1 bg-green-500 text-white rounded mt-2 hover:bg-green-600"
                >
                  Execute
                </button>
                <div className="mt-2 bg-gray-100 p-2 rounded">
                  {executionResults.find((res) => res.id === id)?.output}
                </div>
              </div>
            );
          }
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default FormattedMessage;
