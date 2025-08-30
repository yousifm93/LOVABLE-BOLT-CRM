import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

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
}

export function ColumnVisibilityModal({
  isOpen,
  onClose,
  columns,
  onColumnToggle,
  onToggleAll,
  onSaveView
}: ColumnVisibilityModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewName, setViewName] = useState("");

  const filteredColumns = columns.filter(column =>
    column.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const visibleCount = columns.filter(col => col.visible).length;
  const allVisible = visibleCount === columns.length;

  const handleSaveView = () => {
    if (viewName.trim()) {
      onSaveView(viewName.trim());
      setViewName("");
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

          {/* Column List */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredColumns.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox
                  id={column.id}
                  checked={column.visible}
                  onCheckedChange={() => onColumnToggle(column.id)}
                />
                <label
                  htmlFor={column.id}
                  className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {column.label}
                </label>
              </div>
            ))}
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