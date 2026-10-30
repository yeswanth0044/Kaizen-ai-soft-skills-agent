import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackLabel = 'KAIZEN Coaching Studio',
}: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/60 text-slate-500 p-6 ${className}`}
        role="img"
        aria-label={alt}
      >
        <MessageSquare className="w-8 h-8 text-indigo-600 mb-2 stroke-[1.75]" />
        <span className="text-xs font-medium text-slate-600 text-center">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
