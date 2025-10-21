import React from "react";
import { cn } from "@/lib/utils";

interface DetailItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | null | undefined;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

interface TwoColumnDetailLayoutProps {
  items: DetailItem[];
}

function DetailRow({ icon: Icon, label, value, badgeVariant }: DetailItem) {
  if (!value && value !== 0) return null;

  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function TwoColumnDetailLayout({ items }: TwoColumnDetailLayoutProps) {
  // Split items into two columns
  const midpoint = Math.ceil(items.length / 2);
  const leftColumn = items.slice(0, midpoint);
  const rightColumn = items.slice(midpoint);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-1">
        {leftColumn.map((item, index) => (
          <DetailRow key={`left-${index}`} {...item} />
        ))}
      </div>
      <div className="space-y-1">
        {rightColumn.map((item, index) => (
          <DetailRow key={`right-${index}`} {...item} />
        ))}
      </div>
    </div>
  );
}