import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

interface CollapsiblePipelineSectionProps {
  title: string;
  data: any[];
  columns: ColumnDef<any>[];
  searchTerm: string;
  defaultOpen?: boolean;
  className?: string;
  onViewDetails?: (row: any) => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onRowClick?: (row: any) => void;
  onColumnReorder?: (oldIndex: number, newIndex: number) => void;
}

export function CollapsiblePipelineSection({ 
  title, 
  data, 
  columns, 
  searchTerm, 
  defaultOpen = true,
  className,
  onViewDetails,
  onEdit,
  onDelete,
  onRowClick,
  onColumnReorder
}: CollapsiblePipelineSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className={cn("bg-gradient-card shadow-soft", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="h-6 w-6 p-0"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          </div>
          <span className="text-sm text-muted-foreground">
            {data.length} loan{data.length !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      
      {isOpen && (
        <CardContent className="pt-0">
          <DataTable
            columns={columns}
            data={data}
            searchTerm={searchTerm}
            onRowClick={onRowClick}
            onViewDetails={onViewDetails}
            onEdit={onEdit}
            onDelete={onDelete}
            onColumnReorder={onColumnReorder}
          />
        </CardContent>
      )}
    </Card>
  );
}