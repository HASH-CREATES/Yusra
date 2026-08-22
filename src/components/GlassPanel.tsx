import * as React from 'react';
import { cn } from '@/lib/utils';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: 'low' | 'med' | 'high';
}

export function GlassPanel({
  className,
  intensity = 'med',
  ...props
}: GlassPanelProps) {
  const blur = { low: 'backdrop-blur-sm', med: 'backdrop-blur-2xl', high: 'backdrop-blur-3xl' };
  return (
    <div
      className={cn(
        'bg-glass-surface border-refractive-edge border',
        blur[intensity],
        'shadow-glass',
        className,
      )}
      {...props}
    />
  );
}