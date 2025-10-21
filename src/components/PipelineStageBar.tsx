import React from 'react';
import { cn } from '@/lib/utils';

type Size = 'md' | 'lg';

interface PipelineStageBarProps {
  stages: string[];
  currentStage: string;
  size?: Size;
  className?: string;
  clickable?: boolean;
  onStageClick?: (stage: string) => void;
}

export function PipelineStageBar({
  stages,
  currentStage,
  size = 'md',
  className = '',
  clickable = false,
  onStageClick
}: PipelineStageBarProps) {
  const sizeClasses =
    size === 'lg'
      ? 'h-10 text-[clamp(12px,1.4vw,16px)]'
      : 'h-10 text-[clamp(10px,1vw,14px)]';

  return (
    <div className={cn('w-full overflow-x-auto md:overflow-visible mx-auto max-w-4xl', className)}>
      <div className="flex w-full isolate">
        {stages.map((label, idx) => {
          const first = idx === 0;
          const last = idx === stages.length - 1;
          const active = label.toUpperCase() === currentStage.toUpperCase();
          
          return (
            <div
              key={label}
              className={cn(
                'flex-1 flex items-center justify-center',
                'border border-black',
                first ? '' : 'border-l-0',
                sizeClasses,
                'px-2 uppercase font-semibold tracking-[0.015em] whitespace-nowrap',
                active ? 'bg-[#F5C400]' : 'bg-white',
                clickable && 'cursor-pointer transition-colors hover:bg-[#F5C400]/60'
              )}
              aria-current={active ? 'step' : undefined}
              onClick={() => clickable && onStageClick?.(label)}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}