import React from 'react';
import type { LayoutType, FrameType } from '../../types';

interface LayoutGridProps {
  layout: LayoutType;
  capturedCount: number;
  totalSlots: number;
  children: React.ReactNode;
  className?: string;
  frameType?: FrameType;
}

function getSlotCount(layout: LayoutType): number {
  switch (layout) {
    case 'single': return 1;
    case 'strip': return 4;
    case '2x2': return 4;
    case '2x1_side': return 3;
    default: return 1;
  }
}

const FRAME_STYLES: Record<string, string> = {
  none: '',
  simple: 'shadow-[0_0_0_2px_#e5e5e5] rounded-xl',
  instax: 'shadow-[0_0_0_12px_white,0_0_0_13px_#ddd,0_4px_16px_rgba(0,0,0,0.1)] rounded-sm',
  polaroid: 'shadow-[0_0_0_8px_#f5f5f0,0_0_0_9px_#ddd,0_0_0_14px_#f5f5f0,0_0_0_15px_#ccc,0_4px_16px_rgba(0,0,0,0.12)] rounded-sm',
  film: 'shadow-[inset_0_0_0_3px_#1a1a1a,0_0_0_4px_#1a1a1a,inset_0_0_30px_rgba(0,0,0,0.3)] rounded-sm',
};

export const LayoutGrid: React.FC<LayoutGridProps> = ({
  layout,
  capturedCount,
  totalSlots,
  children,
  className = '',
  frameType = 'simple',
}) => {
  const slots = getSlotCount(layout);
  const childrenArray = React.Children.toArray(children);
  const frameStyle = FRAME_STYLES[frameType] || '';

  const content = () => {
    if (layout === '2x1_side') {
      return (
        <div className={`grid grid-cols-[1fr_1.5fr] gap-1.5 w-full h-full`}>
          <div className="space-y-1.5">
            {[0, 1].map((i) => (
              <div key={i} className={`rounded-lg overflow-hidden bg-gray-100 aspect-[1386/1266] ${childrenArray[i] ? '' : 'border-2 border-dashed border-gray-200'}`}>
                {childrenArray[i] || <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">{i + 1}</div>}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center">
            <div className={`w-full rounded-lg overflow-hidden bg-gray-100 aspect-[1386/1266] ${childrenArray[2] ? '' : 'border-2 border-dashed border-gray-200'}`}>
              {childrenArray[2] || <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">3</div>}
            </div>
          </div>
        </div>
      );
    }

    const gridClass = layout === 'strip' ? 'grid-cols-1' : layout === '2x2' ? 'grid-cols-2' : 'grid-cols-1';

    return (
      <div className={`grid ${gridClass} gap-1.5 w-full h-full ${layout === 'strip' ? '' : ''}`}>
        {childrenArray.map((child, i) => (
          <div key={i} className={`rounded-lg overflow-hidden bg-gray-100 ${layout === 'strip' ? '' : 'aspect-[1386/1266]'}`}>
            {child}
          </div>
        ))}
        {Array.from({ length: slots - capturedCount }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="aspect-[1386/1266] rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300 text-sm"
          >
            Empty
          </div>
        ))}
      </div>
    );
  };

  if (capturedCount === 0) {
    return <div className={className}>{content()}</div>;
  }

  return (
    <div className={`${frameStyle} ${className}`}>
      {content()}
    </div>
  );
};
