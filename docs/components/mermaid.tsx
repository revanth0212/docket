'use client';

import { useEffect, useRef, useState } from 'react';

interface MermaidProps {
  chart: string;
}

export function Mermaid({ chart }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chart || !ref.current) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    import('mermaid').then((mermaidModule) => {
      if (cancelled) return;
      const mermaid = mermaidModule.default;

      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'strict',
        themeVariables: {
          primaryColor: '#1e1e2e',
          primaryTextColor: '#cdd6f4',
          primaryBorderColor: '#45475a',
          secondaryColor: '#313244',
          secondaryTextColor: '#cdd6f4',
          secondaryBorderColor: '#585b70',
          tertiaryColor: '#45475a',
          tertiaryTextColor: '#cdd6f4',
          tertiaryBorderColor: '#585b70',
          lineColor: '#89b4fa',
          textColor: '#cdd6f4',
          mainBkg: '#1e1e2e',
          secondBkg: '#313244',
          tertiaryBkg: '#45475a',
          nodeBorder: '#45475a',
          clusterBkg: '#181825',
          clusterBorder: '#585b70',
          titleColor: '#cdd6f4',
          edgeLabelBackground: '#1e1e2e',
          nodeTextColor: '#cdd6f4',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          fontSize: '14px'
        },
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis',
          padding: 16
        },
        sequence: {
          useMaxWidth: true,
          diagramMarginX: 20,
          diagramMarginY: 20,
          actorMargin: 40,
          width: 120,
          height: 40,
          boxMargin: 8,
          boxTextMargin: 4,
          noteMargin: 8,
          messageMargin: 24,
          mirrorActors: false,
          bottomMarginAdj: 1,
          useMaxWidth: true,
          rightAngles: false,
          showSequenceNumbers: false
        }
      });

      const id = `mermaid-${Math.random().toString(36).slice(2, 11)}`;

      mermaid
        .render(id, chart.trim())
        .then(({ svg }) => {
          if (cancelled) return;
          setSvg(svg);
          setError(null);
          setLoading(false);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err.message || 'Failed to render diagram');
          setLoading(false);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
        <p className="font-semibold">Mermaid error</p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="my-6 flex justify-center overflow-x-auto rounded-lg border border-fd-border bg-[#181825] p-4"
    >
      {loading ? (
        <div className="flex h-[120px] items-center gap-2 text-sm text-fd-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-fd-border border-t-fd-primary" />
          Rendering diagram...
        </div>
      ) : (
        <div
          className="mermaid-content min-w-[640px] transition-opacity duration-300"
          style={{ opacity: svg ? 1 : 0 }}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  );
}
