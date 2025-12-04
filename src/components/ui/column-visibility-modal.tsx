import { useState, useMemo } from "react";
import { Search, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { useFields } from "@/contexts/FieldsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from "@/lib/utils";

interface Column {
  id: string;
  label: string;
  visible: boolean;
}

interface ColumnVisibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: Column[];
  onColumnToggle: (columnId: string) => void;
  onToggleAll: (visible: boolean) => void;
  onSaveView: (viewName: string) => void;
  onReorderColumns: (oldIndex: number, newIndex: number) => void;
  onViewSaved?: (viewName: string) => void;
}

interface SortableColumnItemProps {
  column: Column;
  onToggle: (columnId: string) => void;
}

function SortableColumnItem({ column, onToggle }: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center space-x-2 p-2 rounded-md bg-background",
        isDragging && "opacity-50 shadow-lg z-50"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <Checkbox
        id={column.id}
        checked={column.visible}
        onCheckedChange={() => onToggle(column.id)}
      />
      <label
        htmlFor={column.id}
        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
      >
        {column.label}
      </label>
    </div>
  );
}

export function ColumnVisibilityModal({
  isOpen,
  onClose,
  columns,
  onColumnToggle,
  onToggleAll,
  onSaveView,
  onReorderColumns,
  onViewSaved
}: ColumnVisibilityModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewName, setViewName] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['CONTACT INFO', 'LEAD INFO']));
  const { allFields } = useFields();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Merge all database fields with provided columns to show all 140+ fields
  const allColumnsWithDbFields = useMemo(() => {
    const existingIds = new Set(columns.map(c => c.id));
    
    // Get all additional fields from database that aren't in columns
    const additionalFields = allFields
      .filter(f => f.is_in_use && !existingIds.has(f.field_name))
      .map(field => ({
        id: field.field_name,
        label: field.display_name,
        visible: false
      }));
    
    return [...columns, ...additionalFields];
  }, [columns, allFields]);

  // Group columns by section
  const groupedColumns = useMemo(() => {
    const groups: Record<string, Column[]> = {};
    
    allColumnsWithDbFields.forEach(col => {
      const field = allFields.find(f => f.field_name === col.id);
      const section = field?.section || 'OTHER';
      
      if (!groups[section]) {
        groups[section] = [];
      }
      groups[section].push(col);
    });
    
    // Sort sections by priority
    const sectionOrder = [
      'CONTACT INFO',
      'BORROWER INFO',
      'LEAD INFO',
      'LOAN INFO',
      'LOAN STATUS',
      'ADDRESS',
      'DATE',
      'OBJECT',
      'NOTES',
      'FILE',
      'TRACKING DATA',
      'OTHER'
    ];
    
    const sortedGroups: Record<string, Column[]> = {};
    sectionOrder.forEach(section => {
      if (groups[section]) {
        sortedGroups[section] = groups[section];
      }
    });
    
    // Add any remaining sections not in priority list
    Object.keys(groups).forEach(section => {
      if (!sectionOrder.includes(section)) {
        sortedGroups[section] = groups[section];
      }
    });
    
    return sortedGroups;
  }, [allColumnsWithDbFields, allFields]);

  // Filter columns by search term
  const filteredColumns = useMemo(() => {
    if (!searchTerm) return null;
    return allColumnsWithDbFields.filter(column =>
      column.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      column.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allColumnsWithDbFields, searchTerm]);

  const visibleCount = columns.filter(col => col.visible).length;
  const totalCount = allColumnsWithDbFields.length;
  const allVisible = visibleCount === totalCount;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleSaveView = () => {
    if (viewName.trim()) {
      onSaveView(viewName.trim());
      onViewSaved?.(viewName.trim());
      setViewName("");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex((col) => col.id === active.id);
      const newIndex = columns.findIndex((col) => col.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderColumns(oldIndex, newIndex);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Display Columns</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* All Columns Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="all-columns"
              checked={allVisible}
              onCheckedChange={(checked) => onToggleAll(checked as boolean)}
            />
            <label
              htmlFor="all-columns"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              All Columns ({visibleCount}/{totalCount} shown)
            </label>
          </div>

          <Separator />

          {/* Column List with Section Grouping */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {filteredColumns ? (
              // Search results - flat list
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filteredColumns.map(col => col.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {filteredColumns.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No columns found</p>
                    ) : (
                      filteredColumns.map((column) => (
                        <SortableColumnItem
                          key={column.id}
                          column={column}
                          onToggle={onColumnToggle}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              // Grouped by section
              <div className="space-y-2">
                {Object.entries(groupedColumns).map(([section, sectionColumns]) => {
                  const isExpanded = expandedSections.has(section);
                  const sectionVisibleCount = sectionColumns.filter(c => c.visible).length;
                  
                  return (
                    <div key={section} className="border rounded-md">
                      <button
                        onClick={() => toggleSection(section)}
                        className="w-full flex items-center justify-between p-2 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium text-sm">{section}</span>
                          <span className="text-xs text-muted-foreground">
                            ({sectionVisibleCount}/{sectionColumns.length})
                          </span>
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="p-2 pt-0 space-y-1">
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={sectionColumns.map(col => col.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {sectionColumns.map((column) => (
                                <SortableColumnItem
                                  key={column.id}
                                  column={column}
                                  onToggle={onColumnToggle}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Save View Section */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Save current configuration as a new view:</p>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter view name"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && viewName.trim()) {
                    handleSaveView();
                  }
                }}
              />
              <Button 
                onClick={handleSaveView}
                disabled={!viewName.trim()}
                size="sm"
              >
                Save as New View
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}