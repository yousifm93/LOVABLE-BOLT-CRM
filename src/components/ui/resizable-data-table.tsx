import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ColumnDef<T> {
  accessorKey: string;
  header: string;
  cell?: (props: { row: { original: T } }) => React.ReactNode;
  sortable?: boolean;
  minWidth?: number;
  defaultWidth?: number;
}

interface ResizableDataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  searchTerm?: string;
  onRowClick?: (row: T) => void;
  onViewDetails?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
}

export function ResizableDataTable<T extends Record<string, any>>({
  columns,
  data,
  searchTerm = "",
  onRowClick,
  onViewDetails,
  onEdit,
  onDelete,
}: ResizableDataTableProps<T>) {
  const [sortColumn, setSortColumn] = React.useState<string>("");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filteredData = React.useMemo(() => {
    let filtered = data;

    if (searchTerm) {
      filtered = data.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        
        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortColumn, sortDirection]);

  // Calculate default sizes based on content and available columns
  const totalColumns = columns.length + 1; // +1 for actions column
  const baseWidth = 100 / totalColumns;

  return (
    <div className="rounded-md border bg-card shadow-soft overflow-hidden">
      {/* Header */}
      <div className="border-b bg-muted/50">
        <ResizablePanelGroup direction="horizontal" className="min-h-[48px]">
          {columns.map((column, index) => (
            <React.Fragment key={column.accessorKey}>
              <ResizablePanel
                defaultSize={column.defaultWidth || baseWidth}
                minSize={column.minWidth || 5}
                className="flex items-center"
              >
                <div
                  className={cn(
                    "h-12 px-4 text-left align-middle font-medium text-muted-foreground flex items-center cursor-pointer hover:bg-muted/50 w-full",
                    column.sortable && "cursor-pointer"
                  )}
                  onClick={() => column.sortable && handleSort(column.accessorKey)}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && sortColumn === column.accessorKey && (
                      <span className="text-xs">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </div>
              </ResizablePanel>
              {index < columns.length - 1 && (
                <ResizableHandle withHandle className="w-px bg-border hover:bg-border" />
              )}
            </React.Fragment>
          ))}
          <ResizableHandle withHandle className="w-px bg-border hover:bg-border" />
          <ResizablePanel defaultSize={8} minSize={5}>
            <div className="h-12 px-4 text-left align-middle font-medium text-muted-foreground flex items-center">
              Actions
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Body */}
      <div className="divide-y">
        {filteredData.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={cn(
              "transition-colors hover:bg-muted/50",
              onRowClick && "cursor-pointer"
            )}
            onClick={() => onRowClick?.(row)}
          >
            <ResizablePanelGroup direction="horizontal" className="min-h-[40px]">
              {columns.map((column, index) => (
                <React.Fragment key={column.accessorKey}>
                  <ResizablePanel
                    defaultSize={column.defaultWidth || baseWidth}
                    minSize={column.minWidth || 5}
                    className="flex items-center"
                  >
                    <div className="p-4 align-middle overflow-hidden">
                      {column.cell ? (
                        column.cell({ row: { original: row } })
                      ) : (
                        <span className="hover:text-primary transition-colors">
                          {row[column.accessorKey]}
                        </span>
                      )}
                    </div>
                  </ResizablePanel>
                  {index < columns.length - 1 && (
                    <ResizableHandle withHandle className="w-px bg-border hover:bg-border" />
                  )}
                </React.Fragment>
              ))}
              <ResizableHandle withHandle className="w-px bg-border hover:bg-border" />
              <ResizablePanel defaultSize={8} minSize={5}>
                <div className="p-4 align-middle">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border border-border z-50">
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails?.(row);
                        }}
                      >
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit?.(row);
                        }}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete?.(row);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          No data found.
        </div>
      )}
    </div>
  );
}

export const StatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "lead":
        return "bg-info text-info-foreground";
      case "pending":
        return "bg-warning text-warning-foreground";
      case "screening":
        return "bg-muted text-muted-foreground";
      case "pre-qualified":
        return "bg-accent text-accent-foreground";
      case "pre-approved":
        return "bg-primary text-primary-foreground";
      case "active":
        return "bg-success text-success-foreground";
      case "closed":
        return "bg-secondary text-secondary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Badge className={getStatusColor(status)}>
      {status}
    </Badge>
  );
};