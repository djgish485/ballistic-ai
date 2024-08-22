import React, { useState, useEffect } from 'react';

interface ImageThumbnailProps {
  file: File;
}

const ImageThumbnail: React.FC<ImageThumbnailProps> = ({ file }) => {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setThumbnail(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [file]);

  return (
    <div className="relative w-16 h-16 overflow-hidden rounded">
      {thumbnail && (
        <img
          src={thumbnail}
          alt={file.name}
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
};

export default ImageThumbnail;