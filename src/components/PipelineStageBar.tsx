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
  separatorAfterIndex?: number;
}

export function PipelineStageBar({
  stages,
  currentStage,
  size = 'md',
  className = '',
  clickable = false,
  onStageClick,
  separatorAfterIndex
}: PipelineStageBarProps) {
  const sizeClasses =
    size === 'lg'
      ? 'h-10 text-[clamp(12px,1.4vw,16px)]'
      : 'h-10 text-[clamp(10px,1vw,14px)]';

  return (
    <div className={cn('w-full overflow-x-auto md:overflow-visible mx-auto max-w-4xl', className)}>
      <div className="flex w-full items-center isolate gap-3">
        {stages.map((label, idx) => {
          const first = idx === 0;
          const last = idx === stages.length - 1;
          const active = label.toUpperCase() === currentStage.toUpperCase();
          const showSeparatorAfter = separatorAfterIndex !== undefined && idx === separatorAfterIndex;
          
          return (
            <React.Fragment key={label}>
              <div
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
              {showSeparatorAfter && (
                <div className="flex flex-col items-center gap-1 px-2">
                  <div className="h-8 w-0.5 bg-black" />
                  <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">CONVERT</span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}