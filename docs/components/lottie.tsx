'use client';

import { useRef, useEffect, useState } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';

interface LabelOverlay {
  text: string;
  x: number;
  y: number;
  color?: string;
}

interface LottieAnimationProps {
  src: string;
  alt?: string;
  caption?: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  labels?: LabelOverlay[];
}

export function LottieAnimation({
  src,
  alt = 'Animation',
  caption,
  loop = true,
  autoplay = true,
  className = '',
  labels = []
}: LottieAnimationProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [animationData, setAnimationData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setAnimationData(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load animation');
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    if (animationData && autoplay && lottieRef.current) {
      const timer = setTimeout(() => {
        lottieRef.current?.play();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [animationData, autoplay]);

  if (error) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-400">
        <p className="font-semibold">Animation not found</p>
        <p className="mt-1">{error}</p>
        <p className="mt-2 text-xs opacity-70">
          Download a Lottie JSON from{' '}
          <a
            href="https://lottiefiles.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            LottieFiles
          </a>{' '}
          and place it at:{' '}
          <code className="ml-1 rounded bg-amber-500/10 px-1 py-0.5">{src}</code>
        </p>
      </div>
    );
  }

  if (!animationData) {
    return (
      <div className="my-6 flex h-[200px] items-center justify-center rounded-lg border border-fd-border bg-fd-card">
        <div className="flex items-center gap-2 text-sm text-fd-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-fd-border border-t-fd-primary" />
          Loading animation...
        </div>
      </div>
    );
  }

  return (
    <figure className={`my-6 flex flex-col items-center ${className}`}>
      <div className="relative w-full max-w-2xl overflow-hidden rounded-lg border border-fd-border bg-fd-card p-4">
        <Lottie
          lottieRef={lottieRef}
          animationData={animationData}
          loop={loop}
          autoplay={autoplay}
          aria-label={alt}
          className="w-full"
        />
        {labels.map((label, i) => (
          <span
            key={i}
            className="pointer-events-none absolute whitespace-nowrap rounded bg-fd-background/80 px-1 py-0.5 text-[10px] font-medium leading-none"
            style={{
              left: `${label.x}%`,
              top: `${label.y}%`,
              transform: 'translate(-50%, -50%)',
              color: label.color || 'var(--fd-muted-foreground)'
            }}
          >
            {label.text}
          </span>
        ))}
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
