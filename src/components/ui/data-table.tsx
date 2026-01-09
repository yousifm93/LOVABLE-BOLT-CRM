import * as React from "react";
import { MoreHorizontal, GripVertical, ChevronLeft, ChevronRight } from "lucide-react";
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
  className?: string;
  headerClassName?: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
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
  defaultSortColumn?: string;
  defaultSortDirection?: "asc" | "desc";
  lockSort?: boolean;
  lockReorder?: boolean;
  lockResize?: boolean;
  storageKey?: string;
  showRowNumbers?: boolean;
  pageSize?: number;
  compact?: boolean;
  initialColumnWidths?: Record<string, number>;
  hideActions?: boolean;
  limitedActions?: boolean; // Show only View Details in actions menu
}

interface DraggableTableHeadProps<T> {
  column: ColumnDef<T>;
  sortColumn: string;
  sortDirection: "asc" | "desc";
  onSort: (key: string) => void;
  width: number;
  onResize: (columnKey: string, newWidth: number) => void;
  onAutoFit: (columnKey: string) => void;
  lockSort?: boolean;
  lockReorder?: boolean;
  lockResize?: boolean;
}

interface ResizeHandleProps {
  columnKey: string;
  currentWidth: number;
  onResize: (columnKey: string, newWidth: number) => void;
  onAutoFit: (columnKey: string) => void;
  minWidth?: number;
  maxWidth?: number;
}

function ResizeHandle({ columnKey, currentWidth, onResize, onAutoFit, minWidth = 50, maxWidth = 600 }: ResizeHandleProps) {
  const [isResizing, setIsResizing] = React.useState(false);
  const startXRef = React.useRef(0);
  const startWidthRef = React.useRef(0);
  const resizeLineRef = React.useRef<HTMLDivElement | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Capture pointer for reliable tracking
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    // Store initial values in refs for stable access
    startXRef.current = e.clientX;
    startWidthRef.current = currentWidth;
    setIsResizing(true);

    // Create resize line indicator
    const line = document.createElement('div');
    line.style.cssText = `
      position: fixed;
      top: 0;
      bottom: 0;
      width: 2px;
      background: hsl(var(--primary));
      z-index: 9999;
      pointer-events: none;
      left: ${e.clientX}px;
    `;
    document.body.appendChild(line);
    resizeLineRef.current = line;

    // Prevent text selection during resize
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAutoFit(columnKey);
  };

  React.useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (e: PointerEvent) => {
      // Update resize line position
      if (resizeLineRef.current) {
        resizeLineRef.current.style.left = `${e.clientX}px`;
      }

      // Calculate new width based on pointer movement
      const diff = e.clientX - startXRef.current;
      const newWidth = Math.min(Math.max(startWidthRef.current + diff, minWidth), maxWidth);
      onResize(columnKey, newWidth);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      
      // Remove resize line
      if (resizeLineRef.current) {
        resizeLineRef.current.remove();
        resizeLineRef.current = null;
      }
      
      // Restore cursor and selection
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      
      // Cleanup on unmount
      if (resizeLineRef.current) {
        resizeLineRef.current.remove();
        resizeLineRef.current = null;
      }
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, columnKey, onResize, minWidth, maxWidth]);

  return (
    <div
      className={cn(
        "absolute right-0 top-0 h-full w-2 cursor-col-resize transition-colors touch-none",
        "hover:bg-primary/60 active:bg-primary",
        "before:absolute before:right-0 before:top-0 before:h-full before:w-1 before:bg-border",
        isResizing && "bg-primary"
      )}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      style={{ zIndex: 10 }}
      title="Drag to resize, double-click to auto-fit"
    />
  );
}

function DraggableTableHead<T>({ 
  column, 
  sortColumn, 
  sortDirection, 
  onSort,
  width,
  onResize,
  onAutoFit,
  lockSort = false,
  lockReorder = false,
  lockResize = false
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
    // Width controlled by colgroup - only keep overflow handling
    overflow: 'hidden' as const,
  };

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className={cn(
        "h-8 px-2 font-medium relative group whitespace-nowrap",
        column.headerClassName || "text-center",
        column.sortable && !lockSort && "cursor-pointer hover:bg-muted/50"
      )}
    >
      <div className="flex items-center w-full">
        {/* Drag Handle - only show when not locked */}
        {!lockReorder && (
          <div
            {...attributes}
            {...listeners}
            className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
        
        {/* Column Header Text - centered across remaining space */}
        <div 
          className={cn(
            "flex items-center gap-1 flex-1",
            column.headerClassName?.includes("text-left") ? "justify-start" : "justify-center"
          )}
          onClick={() => column.sortable && !lockSort && onSort(column.accessorKey)}
        >
          {column.header}
          {column.sortable && !lockSort && sortColumn === column.accessorKey && (
            <span className="text-xs">
              {sortDirection === "asc" ? "↑" : "↓"}
            </span>
          )}
        </div>
      </div>
      
      {/* Resize Handle - only show when not locked */}
      {!lockResize && (
        <ResizeHandle 
          columnKey={column.accessorKey}
          currentWidth={width}
          onResize={onResize}
          onAutoFit={onAutoFit}
          minWidth={column.minWidth || 30}
          maxWidth={column.maxWidth || 600}
        />
      )}
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
  defaultSortColumn = "",
  defaultSortDirection = "asc",
  lockSort = false,
  lockReorder = false,
  lockResize = false,
  storageKey,
  showRowNumbers = false,
  pageSize,
  compact = false,
  initialColumnWidths,
  hideActions = false,
  limitedActions = false,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = React.useState<string>(defaultSortColumn);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(defaultSortDirection);
  const [currentPage, setCurrentPage] = React.useState(1);
  
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>(() => {
    // When lockResize is true and initialColumnWidths provided, use those directly (admin-set widths)
    if (lockResize && initialColumnWidths && Object.keys(initialColumnWidths).length > 0) {
      return initialColumnWidths;
    }
    
    // Try to load from localStorage first if storageKey is provided
    if (storageKey) {
      const saved = localStorage.getItem(`${storageKey}_widths`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse saved column widths", e);
        }
      }
    }
    
    // Otherwise use default widths from columns config
    const initialWidthsFromCols: Record<string, number> = {};
    columns.forEach(col => {
      initialWidthsFromCols[col.accessorKey] = col.width || 150;
    });
    return initialWidthsFromCols;
  });

  // Stringify initialColumnWidths for proper dependency comparison during HMR
  const initialColumnWidthsString = React.useMemo(
    () => JSON.stringify(initialColumnWidths),
    [initialColumnWidths]
  );

  // Update column widths when initialColumnWidths changes (from admin settings)
  React.useEffect(() => {
    if (lockResize && initialColumnWidths && Object.keys(initialColumnWidths).length > 0) {
      // Clear any cached widths when lockResize is true - admin widths take priority
      if (storageKey) {
        localStorage.removeItem(`${storageKey}_widths`);
      }
      setColumnWidths(initialColumnWidths);
    }
  }, [lockResize, initialColumnWidthsString, initialColumnWidths, storageKey]);

  // Save column widths to localStorage whenever they change (only when not locked)
  React.useEffect(() => {
    if (storageKey && !lockResize) {
      localStorage.setItem(`${storageKey}_widths`, JSON.stringify(columnWidths));
    }
  }, [columnWidths, storageKey, lockResize]);

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
    if (lockSort) return; // Don't allow sorting when locked
    
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleResize = React.useCallback((columnKey: string, newWidth: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [columnKey]: newWidth
    }));
  }, []);

  const handleAutoFit = React.useCallback((columnKey: string) => {
    const column = columns.find(col => col.accessorKey === columnKey);
    if (!column) return;

    // Find the column index (accounting for selection checkbox if present)
    const columnIndex = columns.findIndex(col => col.accessorKey === columnKey);
    const actualColumnIndex = selectable ? columnIndex + 1 : columnIndex;

    // Find all cells in this column
    const cells = document.querySelectorAll(
      `table tbody tr td:nth-child(${actualColumnIndex + 1})`
    );
    const header = document.querySelector(
      `table thead tr th:nth-child(${actualColumnIndex + 1})`
    );

    let maxWidth = 0;

    // Measure header
    if (header) {
      const headerContent = header.querySelector('div');
      if (headerContent) {
        maxWidth = Math.max(maxWidth, headerContent.scrollWidth);
      }
    }

    // Measure all cells
    cells.forEach(cell => {
      maxWidth = Math.max(maxWidth, (cell as HTMLElement).scrollWidth);
    });

    // Add padding buffer
    const totalWidth = maxWidth + 32;

    // Apply constraints
    const constrainedWidth = Math.min(
      Math.max(totalWidth, column.minWidth || 50),
      column.maxWidth || 500
    );

    setColumnWidths(prev => ({
      ...prev,
      [columnKey]: constrainedWidth
    }));
  }, [columns, selectable]);

  // Helper function to extract searchable text from a value, handling nested objects
  const extractSearchableText = React.useCallback((value: any, depth: number = 0): string => {
    if (value === null || value === undefined) return '';
    if (depth > 2) return ''; // Prevent infinite recursion
    
    if (typeof value === 'string') return value.toLowerCase();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value).toLowerCase();
    
    if (Array.isArray(value)) {
      return value.map(v => extractSearchableText(v, depth + 1)).join(' ');
    }
    
    if (typeof value === 'object') {
      // For objects, extract common name-like fields + all string values
      const parts: string[] = [];
      
      // Common name fields to prioritize
      const nameFields = ['first_name', 'last_name', 'name', 'title', 'lender_name', 'email'];
      for (const field of nameFields) {
        if (value[field] && typeof value[field] === 'string') {
          parts.push(value[field].toLowerCase());
        }
      }
      
      // Also include other string values
      for (const [key, val] of Object.entries(value)) {
        if (!nameFields.includes(key) && typeof val === 'string') {
          parts.push(val.toLowerCase());
        }
      }
      
      return parts.join(' ');
    }
    
    return '';
  }, []);

  const filteredData = React.useMemo(() => {
    let filtered = data;

    if (searchTerm) {
      const searchWords = searchTerm.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0);
      
      filtered = data.filter((item) => {
        // Build searchable string by extracting text from all values, including nested objects
        const itemString = Object.values(item)
          .map(value => extractSearchableText(value))
          .join(' ');
        
        // All search words must be found somewhere in the item
        return searchWords.every(word => itemString.includes(word));
      });
    }

    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        // Helper to get nested property value (e.g., "borrower.first_name")
        const getNestedValue = (obj: any, path: string) => {
          const value = path.split('.').reduce((current, key) => current?.[key], obj);
          
          // Special handling for borrower objects - concatenate name for alphabetical sorting
          if (path === 'borrower' && value && typeof value === 'object') {
            return `${value.first_name || ''} ${value.last_name || ''}`.trim().toLowerCase();
          }
          
          return value;
        };

        let aValue = getNestedValue(a, sortColumn);
        let bValue = getNestedValue(b, sortColumn);
        
        // Handle null/undefined values - push to end
        if (aValue == null && bValue == null) {
          const aId = getRowId(a);
          const bId = getRowId(b);
          return aId < bId ? -1 : aId > bId ? 1 : 0;
        }
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        
        // Detect date strings (ISO format or parseable dates)
        const isDateString = (val: any) => {
          if (typeof val !== 'string') return false;
          return /^\d{4}-\d{2}-\d{2}/.test(val) || !isNaN(Date.parse(val));
        };
        
        // Handle date comparisons
        if (isDateString(aValue) && isDateString(bValue)) {
          const aDate = new Date(aValue);
          const bDate = new Date(bValue);
          const diff = aDate.getTime() - bDate.getTime();
          if (diff !== 0) return sortDirection === "asc" ? diff : -diff;
        }
        // Handle numeric comparisons
        else if (typeof aValue === 'number' && typeof bValue === 'number') {
          const diff = aValue - bValue;
          if (diff !== 0) return sortDirection === "asc" ? diff : -diff;
        }
        // Handle Date object comparisons
        else if (aValue instanceof Date && bValue instanceof Date) {
          const diff = aValue.getTime() - bValue.getTime();
          if (diff !== 0) return sortDirection === "asc" ? diff : -diff;
        }
        // String/text comparison (alphabetical)
        else {
          const aStr = String(aValue).toLowerCase();
          const bStr = String(bValue).toLowerCase();
          const comparison = aStr.localeCompare(bStr);
          if (comparison !== 0) return sortDirection === "asc" ? comparison : -comparison;
        }
        
        // Deterministic tiebreaker: use row ID
        const aId = getRowId(a);
        const bId = getRowId(b);
        return aId < bId ? -1 : aId > bId ? 1 : 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortColumn, sortDirection, getRowId, extractSearchableText]);

  // Reset to page 1 when data or searchTerm changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data.length, searchTerm]);

  // Pagination calculations
  const totalPages = pageSize ? Math.ceil(filteredData.length / pageSize) : 1;
  const paginatedData = pageSize 
    ? filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredData;

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

  // Calculate the number of fixed columns
  const hasActions = !hideActions || limitedActions;

  return (
    <div className="rounded-md border bg-card shadow-soft overflow-x-auto">
      <Table style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
        {/* Colgroup for authoritative column width control */}
        <colgroup>
          {selectable && <col style={{ width: '50px', minWidth: '50px', maxWidth: '50px' }} />}
          {showRowNumbers && <col style={{ width: '50px', minWidth: '50px', maxWidth: '50px' }} />}
          {columns.map((column) => (
            <col 
              key={column.accessorKey}
              style={{ 
                width: `${columnWidths[column.accessorKey] || column.width || 150}px`,
                minWidth: `${column.minWidth || 30}px`,
                maxWidth: `${column.maxWidth || 600}px`,
              }} 
            />
          ))}
          {hasActions && <col style={{ width: '50px', minWidth: '50px', maxWidth: '50px' }} />}
        </colgroup>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={lockReorder ? undefined : handleDragEnd}
        >
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-[50px] h-8 px-2"> {/* Fixed width for consistency across all boards */}
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
              {showRowNumbers && (
                <TableHead className="w-[50px] h-8 px-2 text-center">
                  <span className="text-xs font-medium">#</span>
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
                    width={columnWidths[column.accessorKey] || column.width || 150}
                    onResize={handleResize}
                    onAutoFit={handleAutoFit}
                    lockSort={lockSort}
                    lockReorder={lockReorder}
                    lockResize={lockResize}
                  />
                ))}
              </SortableContext>
              {(!hideActions || limitedActions) && <TableHead className="w-[50px] h-8 px-2">Actions</TableHead>}
            </TableRow>
          </TableHeader>
        </DndContext>
        <TableBody>
          {paginatedData.map((row, index) => {
            const rowId = getRowId(row);
            const isSelected = selectedIds.includes(rowId);
            const actualIndex = pageSize ? (currentPage - 1) * pageSize + index + 1 : index + 1;
            
            return (
              <React.Fragment key={rowId}>
                {hideActions && !limitedActions ? (
                  <TableRow
                    className={cn(
                      "transition-colors h-14",
                      onRowClick && "cursor-pointer",
                      isSelected && "bg-primary/10"
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <TableCell className={cn(compact ? "py-1 px-2" : "py-2 px-2", "w-[50px]")} onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectRow(rowId, checked as boolean)}
                            aria-label={`Select row ${rowId}`}
                          />
                        </div>
                      </TableCell>
                    )}
                    {showRowNumbers && (
                      <TableCell className={cn(compact ? "py-1 px-2" : "py-2 px-2", "w-[50px] text-center")} onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-muted-foreground">{actualIndex}</span>
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell 
                        key={column.accessorKey} 
                        className={cn(compact ? "py-1 px-2" : "py-2 px-2", column.className || "text-center", "overflow-hidden")}
                      >
                        {column.cell ? (
                          <div className={cn(
                            "flex overflow-hidden w-full min-w-0",
                            column.className?.includes("text-left") ? "justify-start" : "justify-center"
                          )}>
                            {column.cell({ row: { original: row } })}
                          </div>
                        ) : (
                          <span className="hover:text-primary transition-colors truncate block whitespace-nowrap overflow-hidden text-ellipsis">{row[column.accessorKey]}</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ) : (
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                    <TableRow
                      className={cn(
                        "transition-colors h-14",
                        onRowClick && "cursor-pointer",
                        isSelected && "bg-primary/10"
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {selectable && (
                        <TableCell className={cn(compact ? "py-1 px-2" : "py-2 px-2", "w-[50px]")} onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectRow(rowId, checked as boolean)}
                              aria-label={`Select lead ${rowId}`}
                            />
                          </div>
                        </TableCell>
                      )}
                      {showRowNumbers && (
                        <TableCell className={cn(compact ? "py-1 px-2" : "py-2 px-2", "w-[50px] text-center")} onClick={(e) => e.stopPropagation()}>
                          <span className="text-xs text-muted-foreground">{actualIndex}</span>
                        </TableCell>
                      )}
                      {columns.map((column) => (
                        <TableCell 
                          key={column.accessorKey} 
                          className={cn(compact ? "py-1 px-2" : "py-2 px-2", column.className || "text-center", "overflow-hidden")}
                        >
                          {column.cell ? (
                            <div className={cn(
                              "flex overflow-hidden w-full min-w-0",
                              column.className?.includes("text-left") ? "justify-start" : "justify-center"
                            )}>
                              {column.cell({ row: { original: row } })}
                            </div>
                          ) : (
                            <span className="hover:text-primary transition-colors truncate block whitespace-nowrap overflow-hidden text-ellipsis">{row[column.accessorKey]}</span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className={cn(compact ? "py-1 px-2" : "py-2 px-2")}>
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
                            {!limitedActions && (
                              <>
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
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowClick?.(row);
                        }}
                      >
                        View Details
                      </ContextMenuItem>
                      <ContextMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowClick?.(row);
                        }}
                      >
                        Edit
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
      {filteredData.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          No data found.
        </div>
      )}
      {pageSize && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length.toLocaleString()} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export const StatusBadge = ({ status }: { status?: string }) => {
  const safeStatus = status || "Active";
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
    <Badge className={getStatusColor(safeStatus)}>
      {safeStatus}
    </Badge>
  );
};