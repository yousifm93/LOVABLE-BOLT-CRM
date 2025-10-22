import * as React from "react";
import { MoreHorizontal, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ColumnDef<T> {
  accessorKey: string;
  header: string;
  cell?: (props: { row: { original: T } }) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  searchTerm?: string;
  onRowClick?: (row: T) => void;
  onViewDetails?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onColumnReorder?: (oldIndex: number, newIndex: number) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  getRowId?: (row: T) => string;
}

interface DraggableTableHeadProps<T> {
  column: ColumnDef<T>;
  sortColumn: string;
  sortDirection: "asc" | "desc";
  onSort: (key: string) => void;
}

function DraggableTableHead<T>({ 
  column, 
  sortColumn, 
  sortDirection, 
  onSort 
}: DraggableTableHeadProps<T>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.accessorKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className={cn(
        "h-8 px-2 text-center font-medium relative group",
        column.sortable && "cursor-pointer hover:bg-muted/50"
      )}
    >
      <div className="flex items-center justify-center gap-1">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
        
        {/* Column Header Text */}
        <div 
          className="flex items-center justify-center gap-1 flex-1"
          onClick={() => column.sortable && onSort(column.accessorKey)}
        >
          {column.header}
          {column.sortable && sortColumn === column.accessorKey && (
            <span className="text-xs">
              {sortDirection === "asc" ? "↑" : "↓"}
            </span>
          )}
        </div>
      </div>
    </TableHead>
  );
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchTerm = "",
  onRowClick,
  onViewDetails,
  onEdit,
  onDelete,
  onColumnReorder,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  getRowId = (row) => row.id,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = React.useState<string>("");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex(col => col.accessorKey === active.id);
      const newIndex = columns.findIndex(col => col.accessorKey === over.id);
      
      onColumnReorder?.(oldIndex, newIndex);
    }
  };

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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredData.map(row => getRowId(row));
      onSelectionChange?.(allIds);
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (rowId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange?.([...selectedIds, rowId]);
    } else {
      onSelectionChange?.(selectedIds.filter(id => id !== rowId));
    }
  };

  const isAllSelected = filteredData.length > 0 && 
    filteredData.every(row => selectedIds.includes(getRowId(row)));
  
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;


  return (
    <div className="rounded-md border bg-card shadow-soft">
      <Table>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-[50px] h-8 px-2">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all leads"
                      className={isSomeSelected ? "data-[state=checked]:bg-primary/50" : ""}
                    />
                  </div>
                </TableHead>
              )}
              <SortableContext
                items={columns.map(col => col.accessorKey)}
                strategy={horizontalListSortingStrategy}
              >
                {columns.map((column) => (
                  <DraggableTableHead
                    key={column.accessorKey}
                    column={column}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                ))}
              </SortableContext>
              <TableHead className="w-[50px] h-8 px-2">Actions</TableHead>
            </TableRow>
          </TableHeader>
        </DndContext>
        <TableBody>
          {filteredData.map((row, index) => {
            const rowId = getRowId(row);
            const isSelected = selectedIds.includes(rowId);
            
            return (
              <TableRow
                key={index}
                className={cn(
                  "transition-colors h-10",
                  onRowClick && "cursor-pointer",
                  isSelected && "bg-primary/10"
                )}
                onClick={() => onRowClick?.(row)}
              >
                {selectable && (
                  <TableCell className="py-2 px-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectRow(rowId, checked as boolean)}
                        aria-label={`Select lead ${rowId}`}
                      />
                    </div>
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.accessorKey} className="py-2 px-2 text-center">
                    {column.cell ? (
                      <div className="flex justify-center">
                        {column.cell({ row: { original: row } })}
                      </div>
                    ) : (
                      <span className="hover:text-primary transition-colors">{row[column.accessorKey]}</span>
                    )}
                  </TableCell>
                ))}
                <TableCell className="py-2 px-2">
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
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