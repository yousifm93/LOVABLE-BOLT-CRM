import React from "react";
import { cn } from "@/lib/utils";

interface DetailItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | null | undefined;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  editComponent?: React.ReactNode;
  isCalculated?: boolean;
}

interface FourColumnDetailLayoutProps {
  items: DetailItem[];
}

function DetailRow({ icon: Icon, label, value, badgeVariant, editComponent, isCalculated }: DetailItem) {
  if (!editComponent && !value && value !== 0) return null;

  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {editComponent ? (
          <div className={isCalculated ? "opacity-60" : ""}>
            {editComponent}
          </div>
        ) : (
          <p className="text-sm font-semibold text-foreground">{value || "—"}</p>
        )}
      </div>
    </div>
  );
}

export function FourColumnDetailLayout({ items }: FourColumnDetailLayoutProps) {
  // Split items into four columns
  const itemsPerColumn = Math.ceil(items.length / 4);
  const column1 = items.slice(0, itemsPerColumn);
  const column2 = items.slice(itemsPerColumn, itemsPerColumn * 2);
  const column3 = items.slice(itemsPerColumn * 2, itemsPerColumn * 3);
  const column4 = items.slice(itemsPerColumn * 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="space-y-1">
        {column1.map((item, index) => (
          <DetailRow key={`col1-${index}`} {...item} />
        ))}
      </div>
      <div className="space-y-1">
        {column2.map((item, index) => (
          <DetailRow key={`col2-${index}`} {...item} />
        ))}
      </div>
      <div className="space-y-1">
        {column3.map((item, index) => (
          <DetailRow key={`col3-${index}`} {...item} />
        ))}
      </div>
      <div className="space-y-1">
        {column4.map((item, index) => (
          <DetailRow key={`col4-${index}`} {...item} />
        ))}
      </div>
    </div>
  );
}
