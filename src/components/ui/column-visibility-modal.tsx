import { useState } from "react";
import { Search, GripVertical } from "lucide-react";
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
        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredColumns = columns.filter(column =>
    column.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const visibleCount = columns.filter(col => col.visible).length;
  const allVisible = visibleCount === columns.length;

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
      onReorderColumns(oldIndex, newIndex);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Display Columns</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Find Columns to Show/Hide"
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
              All Columns, {visibleCount} selected
            </label>
          </div>

          <Separator />

          {/* Column List with Drag and Drop */}
          <div className="max-h-64 overflow-y-auto">
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
                  {filteredColumns.map((column) => (
                    <SortableColumnItem
                      key={column.id}
                      column={column}
                      onToggle={onColumnToggle}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <Separator />

          {/* Save View Section */}
          <div className="space-y-2">
            <div className="flex space-x-2">
              <Input
                placeholder="Enter view name"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleSaveView}
                disabled={!viewName.trim()}
                size="sm"
              >
                Save To This View
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}