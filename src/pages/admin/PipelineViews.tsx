import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { databaseService } from "@/services/database";
import { PipelineViewEditor } from "@/components/admin/PipelineViewEditor";

interface PipelineView {
  id: string;
  name: string;
  pipeline_type: string;
  column_order: string[];
  column_widths?: Record<string, number>;
  is_default: boolean;
  created_by?: string;
  created_at?: string;
}

const PIPELINE_TYPES = [
  "active",
  "leads",
  "pending_app",
  "screening",
  "pre_qualified",
  "pre_approved",
  "past_clients",
];

export default function PipelineViews() {
  const [selectedPipeline, setSelectedPipeline] = useState("active");
  const [views, setViews] = useState<PipelineView[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingView, setEditingView] = useState<PipelineView | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    loadViews();
  }, [selectedPipeline]);

  const loadViews = async () => {
    setLoading(true);
    try {
      const data = await databaseService.getPipelineViews(selectedPipeline);
      // Cast Json types to proper TypeScript types
      const typedViews: PipelineView[] = (data || []).map(view => ({
        ...view,
        column_order: view.column_order as unknown as string[],
        column_widths: view.column_widths as unknown as Record<string, number> | undefined,
      }));
      setViews(typedViews);
      
      // Auto-select default view or first view or Main View
      const defaultView = typedViews.find(v => v.is_default);
      const mainView = typedViews.find(v => v.name.toLowerCase() === 'main view');
      const viewToSelect = defaultView || mainView || typedViews[0];
      
      if (viewToSelect) {
        setEditingView(viewToSelect);
        setShowEditor(true);
      }
    } catch (error) {
      console.error("Error loading pipeline views:", error);
      toast.error("Failed to load pipeline views");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateView = () => {
    setEditingView(null);
    setShowEditor(true);
  };

  const handleEditView = (view: PipelineView) => {
    setEditingView(view);
    setShowEditor(true);
  };

  const handleSaveView = async (viewData: {
    name: string;
    pipeline_type: string;
    column_order: string[];
    column_widths: Record<string, number>;
    is_default: boolean;
  }) => {
    setSaving(true);
    try {
      if (editingView?.id) {
        // Update existing view
        await databaseService.updatePipelineView(editingView.id, viewData);
        toast.success("View updated successfully");
      } else {
        // Create new view
        await databaseService.createPipelineView(viewData);
        toast.success("View created successfully");
      }
      
      await loadViews();
    } catch (error) {
      console.error("Error saving view:", error);
      toast.error("Failed to save view");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingView(null);
    setShowEditor(false);
  };

  return (
    <div className="h-[calc(100vh-12rem)]">
      <PipelineViewEditor
        viewId={editingView?.id}
        viewName={editingView?.name}
        pipelineType={editingView?.pipeline_type || selectedPipeline}
        columnOrder={editingView?.column_order}
        columnWidths={editingView?.column_widths}
        isDefault={editingView?.is_default}
        onSave={handleSaveView}
        onCancel={handleCancelEdit}
        views={views}
        selectedPipeline={selectedPipeline}
        onPipelineChange={setSelectedPipeline}
        onCreateView={handleCreateView}
        onEditView={handleEditView}
        isSaving={saving}
      />
    </div>
  );
}
