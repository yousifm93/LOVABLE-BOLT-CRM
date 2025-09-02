import React from 'react';
import { cn } from '@/lib/utils';

type Size = 'md' | 'lg';

interface PipelineStageBarProps {
  stages: string[];
  currentStage: string;
  size?: Size;
  className?: string;
}

export function PipelineStageBar({
  stages,
  currentStage,
  size = 'md',
  className = ''
}: PipelineStageBarProps) {
  const sizeClasses =
    size === 'lg'
      ? 'h-12 text-[clamp(14px,1.6vw,18px)]'
      : 'h-12 text-[clamp(12px,1.2vw,16px)]';

  return (
    <div className={cn('w-full overflow-x-auto md:overflow-visible', className)}>
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
                first ? 'rounded-l-full' : 'border-l-0',
                last ? 'rounded-r-full' : 'rounded-none',
                sizeClasses,
                'px-5 uppercase font-semibold tracking-[0.015em] whitespace-nowrap',
                active ? 'bg-[#F5C400]' : 'bg-white'
              )}
              aria-current={active ? 'step' : undefined}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}