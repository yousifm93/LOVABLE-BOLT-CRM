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
  columns?: 3 | 4;
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

export function FourColumnDetailLayout({ items, columns = 4 }: FourColumnDetailLayoutProps) {
  // Split items into specified number of columns
  const itemsPerColumn = Math.ceil(items.length / columns);
  const columnData: DetailItem[][] = [];
  
  for (let i = 0; i < columns; i++) {
    columnData.push(items.slice(i * itemsPerColumn, (i + 1) * itemsPerColumn));
  }

  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 gap-6",
      columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
    )}>
      {columnData.map((columnItems, colIndex) => (
        <div key={`col-${colIndex}`} className="space-y-1">
          {columnItems.map((item, index) => (
            <DetailRow key={`col${colIndex}-${index}`} {...item} />
          ))}
        </div>
      ))}
    </div>
  );
}
