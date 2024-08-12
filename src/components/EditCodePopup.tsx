import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface EditCodePopupProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent: string;
  onSave: (newContent: string) => void;
}

const EditCodePopup: React.FC<EditCodePopupProps> = ({ isOpen, onClose, initialContent, onSave }) => {
  const [editedContent, setEditedContent] = useState(initialContent);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditedContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={popupRef} className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="bg-white dark:bg-gray-700 p-2 rounded-t-lg border-b dark:border-gray-600 flex justify-between items-center">
          <h2 className="text-xl font-bold dark:text-white">Edit Command</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 focus:outline-none"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="overflow-auto p-4 flex-grow">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-full min-h-[400px] p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>
        <div className="bg-white dark:bg-gray-700 p-4 rounded-b-lg border-t dark:border-gray-600 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(editedContent);
              onClose();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditCodePopup;