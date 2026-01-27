import React, { useState, useEffect } from 'react';
import { databaseService } from '@/services/database';

interface AttachmentImageProps {
  attachmentUrl: string;
  alt?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function AttachmentImage({ attachmentUrl, alt = "Attached image", className = "", onClick }: AttachmentImageProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!attachmentUrl) {
      setLoading(false);
      return;
    }

    // If already a full URL, use it directly
    if (attachmentUrl.startsWith('http')) {
      setResolvedUrl(attachmentUrl);
      setLoading(false);
      return;
    }

    // Otherwise, get a signed URL
    databaseService.getDocumentSignedUrl(attachmentUrl)
      .then(url => {
        setResolvedUrl(url);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error getting signed URL:', err);
        setError(true);
        setLoading(false);
      });
  }, [attachmentUrl]);

  if (loading) {
    return (
      <div className={`animate-pulse bg-muted rounded-md h-32 w-32 ${className}`} />
    );
  }

  if (error || !resolvedUrl) {
    return (
      <div className={`bg-muted/50 rounded-md p-4 text-xs text-muted-foreground ${className}`}>
        Could not load attachment
      </div>
    );
  }

  return (
    <a 
      href={resolvedUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      onClick={onClick}
    >
      <img 
        src={resolvedUrl} 
        alt={alt} 
        className={`rounded-md border cursor-pointer hover:opacity-80 transition-opacity ${className}`}
        onError={() => setError(true)}
      />
    </a>
  );
}
