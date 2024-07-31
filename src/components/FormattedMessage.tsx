import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parseCommand } from '@/utils/commandParser';
import { PencilIcon } from '@heroicons/react/24/solid';
import EditCodePopup from './EditCodePopup';

interface FormattedMessageProps {
  content: string;
  onDiff: (filePath: string, newContent: string) => void;
  role: 'user' | 'assistant';
  isComplete: boolean;
  onEditCommand: (oldCommand: string, newCommand: string) => void;
  messageIndex: number;
}

interface CodeBlockProps {
  node: any;
  inline: boolean;
  className: string;
  children: React.ReactNode;
  isNewFile: boolean;
  setIsNewFile: (isNew: boolean) => void;
  isRestored: boolean;
  setIsRestored: (isRestored: boolean) => void;
  isComplete: boolean;
  setExecutionResult: (id: string, result: string) => void;
  handleDiffClick: (filePath: string, newContent: string) => void;
  handleRestore: (filePath: string, originalContent: string) => Promise<void>;
  executionResults: Record<string, string>;
  originalFileContents: Record<string, string>;
  setOriginalFileContent: (key: string, content: string) => void;
  generateId: () => string;
  codeBlockIds: Record<number, string>;
  onEditCommand: (oldCommand: string, newCommand: string) => void;
  messageIndex: number;
  getPreviousLine: (nodeIndex: number) => string;
  fetchFileContent: (filePath: string) => Promise<string | false>;
}

const CodeBlock: React.FC<CodeBlockProps> = React.memo(({ 
  node, 
  inline, 
  className, 
  children, 
  isNewFile,
  setIsNewFile,
  isRestored,
  setIsRestored,
  isComplete,
  setExecutionResult,
  handleDiffClick,
  handleRestore,
  executionResults,
  originalFileContents,
  setOriginalFileContent,
  generateId,
  codeBlockIds,
  onEditCommand,
  messageIndex,
  getPreviousLine,
  fetchFileContent,
  ...props 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [canRestore, setCanRestore] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);
  const componentId = useRef(`CodeBlock-${Math.random().toString(36).substr(2, 9)}`);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveClick = (newContent: string) => {
    setIsEditing(false);
    onEditCommand(String(children), newContent);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
  };

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
      codeBlockIds[nodeIndex] = id;
    }

    const previousLine = getPreviousLine(nodeIndex);
    const { filePath, newContent } = useMemo(() => parseCommand(String(children), previousLine), [children, previousLine]);

    const handleRestoreClick = async () => {
      if (filePath) {
        const key = `${messageIndex}-${id}`;
        const originalContent = originalFileContents[key];
        if (originalContent) {
          await handleRestore(filePath, originalContent);
          setIsRestored(true);
          setCanRestore(false);
        }
      }
    };

    const handleWrite = async () => {
      if (filePath) {
        try {
          const key = `${messageIndex}-${id}`;
          let isNewlyCreated = false;
          if (!originalFileContents[key]) {
            const originalContent = await fetchFileContent(filePath);
            if (originalContent === false) {
              isNewlyCreated = true;
              setIsNewFile(true);
            } else {
              setOriginalFileContent(key, originalContent);
            }
          }

          const truncationPatterns = [
            /Rest of the file remains unchanged\.\.\./i,
            /# Rest of the script contents\.\.\./i,
            /\/\/ Rest of the function\.\.\./i,
            /\/\/ \.\.\. \(previous code remains unchanged\)/i,
            /\/\/ \.\.\. \(rest of the function remains unchanged\)/i,
            /\/\/ \.\.\. \(rest of the file remains unchanged\)/i
          ];

          const isTruncated = truncationPatterns.some(pattern => pattern.test(newContent));

          if (isTruncated) {
            const confirmMessage = `The code appears to be truncated. Would you like to proceed?\n\nRemind the AI to show the full file when making modifications.`;
            if (!window.confirm(confirmMessage)) {
              return;
            }
          }

          const response = await fetch('/api/write-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath, content: newContent }),
          });
          if (!response.ok) throw new Error('Failed to write file');
          setExecutionResult(id, `File ${filePath} ${isNewlyCreated ? 'created' : 'updated'} successfully.`);
          setCanRestore(true);
          
          if (isNewlyCreated) {
            setIsNewFile(true);
          }
        } catch (error) {
          setExecutionResult(id, `Error updating file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      setIsRestored(false);
    };

    const handleUndo = async () => {
      if (filePath) {
        try {
          const response = await fetch('/api/delete-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath }),
          });
          if (!response.ok) throw new Error('Failed to delete file');
          
          alert(`File ${filePath} deleted successfully.`);

          setIsNewFile(false);
          setIsRestored(true);
        } catch (error) {
          alert(`Error deleting file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    };

    const handleExecute = async () => {
      try {
        const response = await fetch('/api/execute-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: String(children) }),
        });
        const result = await response.json();
        setExecutionResult(id, result.output);
      } catch (error) {
        setExecutionResult(id, `Error executing code: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      setIsRestored(false);
    };

    useEffect(() => {
      const key = `${messageIndex}-${id}`;
      if (originalFileContents[key]) {
        setCanRestore(true);
      }
    }, [originalFileContents, messageIndex, id]);

    return (
      <div 
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <pre
          ref={codeRef}
          className="bg-gray-100 p-4 rounded-lg"
        >
          <code>
            {String(children).replace(/\n$/, '')}
          </code>
        </pre>
        {!isEditing && isHovered && (
          <div className="absolute top-2 right-2">
            <div className="p-1 rounded transition-colors duration-200 group hover:bg-blue-500">
              <PencilIcon
                className="h-6 w-6 text-gray-500 group-hover:text-white cursor-pointer"
                onClick={handleEditClick}
              />
            </div>
          </div>
        )}
        <EditCodePopup
          isOpen={isEditing}
          onClose={handleCancelClick}
          initialContent={String(children)}
          onSave={handleSaveClick}
        />
        {isComplete && !isEditing && (
          <>
            <div className="mt-2 space-x-2">
              {filePath ? (
                <>
                  <button
                    onClick={handleWrite}
                    className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Write
                  </button>
                  <button
                    onClick={() => handleDiffClick(filePath, newContent)}
                    className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Diff
                  </button>
                  {isNewFile && (
                    <button
                      onClick={handleUndo}
                      className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                      Undo (Delete File)
                    </button>
                  )}
                  {canRestore && !isRestored && (
                    <button
                      onClick={handleRestoreClick}
                      className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                      Restore
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={handleExecute}
                  className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Execute
                </button>
              )}
            </div>
            {!isRestored && executionResults[id] && (
              <div className="mt-2 bg-gray-100 p-2 rounded">
                {executionResults[id]}
              </div>
            )}
          </>
        )}
      </div>
    );
  }
});

const FormattedMessage: React.FC<FormattedMessageProps> = React.memo(({ content, onDiff, role, isComplete, onEditCommand, messageIndex }) => {
  const [executionResults, setExecutionResults] = useState<Record<string, string>>({});
  const [codeBlockIds] = useState<Record<number, string>>({});
  const [originalFileContents, setOriginalFileContents] = useState<Record<string, string>>({});
  const [newFiles, setNewFiles] = useState<Record<string, boolean>>({});
  const [restoredBlocks, setRestoredBlocks] = useState<Record<string, boolean>>({});

  const generateId = useCallback(() => `code-${Math.random().toString(36).substr(2, 9)}`, []);

  const fetchFileContent = useCallback(async (filePath: string): Promise<string | false> => {
    const response = await fetch('/api/read-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filePath }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return false;
      }
      throw new Error('Failed to fetch file content');
    }

    const data = await response.json();
    return data.content;
  }, []);

  const setExecutionResult = useCallback((id: string, result: string) => {
    setExecutionResults(prev => ({ ...prev, [id]: result }));
  }, []);

  const setOriginalFileContent = useCallback((key: string, content: string) => {
    setOriginalFileContents(prev => ({ ...prev, [key]: content }));
  }, []);

  const handleRestore = useCallback(async (filePath: string, originalContent: string) => {
    try {
      const response = await fetch('/api/restore-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, content: originalContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to restore original content');
      }

      alert('File restored successfully');
    } catch (error) {
      alert('Failed to restore file content');
    }
  }, []);

  const handleDiffClick = useCallback((filePath: string, newContent: string) => {
    onDiff(filePath, newContent);
  }, [onDiff]);

  const getPreviousLine = useCallback((nodeIndex: number) => {
    const lines = content.split('\n');
    return lines[nodeIndex - 2] || '';
  }, [content]);

  const setIsNewFile = useCallback((filePath: string, isNew: boolean) => {
    setNewFiles(prev => ({ ...prev, [filePath]: isNew }));
  }, []);

  const memoizedCodeBlock = useMemo(() => {
    return (props: any) => {
      const { filePath } = parseCommand(String(props.children), getPreviousLine(props.node.position?.start.line));
      const isNewFile = newFiles[filePath] || false;
      const blockId = `${messageIndex}-${props.node.position?.start.line}`;
      return (
        <CodeBlock
          {...props}
          isComplete={isComplete}
          setExecutionResult={setExecutionResult}
          handleDiffClick={handleDiffClick}
          handleRestore={handleRestore}
          executionResults={executionResults}
          originalFileContents={originalFileContents}
          setOriginalFileContent={setOriginalFileContent}
          generateId={generateId}
          codeBlockIds={codeBlockIds}
          onEditCommand={onEditCommand}
          messageIndex={messageIndex}
          getPreviousLine={getPreviousLine}
          fetchFileContent={fetchFileContent}
          isNewFile={isNewFile}
          setIsNewFile={(isNew: boolean) => setIsNewFile(filePath, isNew)}
          isRestored={restoredBlocks[blockId] || false}
          setIsRestored={(isRestored: boolean) => setRestoredBlocks(prev => ({ ...prev, [blockId]: isRestored }))}
        />
      );
    };
  }, [isComplete, setExecutionResult, handleDiffClick, handleRestore, executionResults, originalFileContents, setOriginalFileContent, generateId, codeBlockIds, onEditCommand, messageIndex, getPreviousLine, fetchFileContent, newFiles, setIsNewFile, restoredBlocks]);

  if (role === 'user') {
    return <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>;
  }

  return (
    <div>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h4>{children}</h4>,
          code: memoizedCodeBlock,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.content === nextProps.content &&
         prevProps.role === nextProps.role &&
         prevProps.isComplete === nextProps.isComplete &&
         prevProps.messageIndex === nextProps.messageIndex;
});

FormattedMessage.displayName = 'FormattedMessage';

export default FormattedMessage;