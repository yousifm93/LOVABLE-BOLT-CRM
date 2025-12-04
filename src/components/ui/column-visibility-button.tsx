import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColumnVisibilityModal } from "./column-visibility-modal";

interface Column {
  id: string;
  label: string;
  visible: boolean;
}

interface ColumnVisibilityButtonProps {
  columns: Column[];
  onColumnToggle: (columnId: string, label?: string) => void;
  onToggleAll: (visible: boolean) => void;
  onSaveView: (viewName: string) => void;
  onReorderColumns: (oldIndex: number, newIndex: number) => void;
  onViewSaved?: (viewName: string) => void;
}

export function ColumnVisibilityButton({
  columns,
  onColumnToggle,
  onToggleAll,
  onSaveView,
  onReorderColumns,
  onViewSaved
}: ColumnVisibilityButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const visibleCount = columns.filter(col => col.visible).length;
  const hasHiddenColumns = visibleCount < columns.length;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className="gap-2"
      >
        {hasHiddenColumns ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        Hide/Show
      </Button>

      <ColumnVisibilityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        columns={columns}
        onColumnToggle={onColumnToggle}
        onToggleAll={onToggleAll}
        onSaveView={onSaveView}
        onReorderColumns={onReorderColumns}
        onViewSaved={onViewSaved}
      />
    </>
  );
}