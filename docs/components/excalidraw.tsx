'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ExcalidrawProps {
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export function Excalidraw({ src, alt = 'Diagram', caption, width = 800, height = 500 }: ExcalidrawProps) {
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-400">
        <p className="font-semibold">Diagram not found</p>
        <p className="mt-1">{error}</p>
        <p className="mt-2 text-xs opacity-70">
          Export your Excalidraw drawing as an SVG and place it at:
          <code className="ml-1 rounded bg-amber-500/10 px-1 py-0.5">{src}</code>
        </p>
      </div>
    );
  }

  return (
    <figure className="my-6 flex flex-col items-center">
      <div className="overflow-x-auto rounded-lg border border-fd-border bg-fd-card p-4">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="max-w-full"
          onError={() => setError(`Could not load ${src}`)}
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
