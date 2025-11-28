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
      
      setEditingView(null);
      setShowEditor(false);
      loadViews();
    } catch (error) {
      console.error("Error saving view:", error);
      toast.error("Failed to save view");
    }
  };

  const handleCancelEdit = () => {
    setEditingView(null);
    setShowEditor(false);
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex gap-4">
      {/* Left Sidebar - Saved Views List */}
      <Card className="w-60 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Saved Views</CardTitle>
            <Button size="sm" onClick={handleCreateView}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 pt-0">
          <div>
            <Label className="text-xs text-muted-foreground mb-2">Pipeline</Label>
            <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
            ) : views.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No views yet
              </div>
            ) : (
              <div className="space-y-1">
                {views.map((view) => (
                  <button
                    key={view.id}
                    onClick={() => handleEditView(view)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors ${
                      editingView?.id === view.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="font-medium">{view.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {view.column_order.length} columns
                      {view.is_default && " • Default"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right Side - Editor or Empty State */}
      <div className="flex-1">
        {showEditor ? (
          <PipelineViewEditor
            viewId={editingView?.id}
            viewName={editingView?.name}
            pipelineType={editingView?.pipeline_type || selectedPipeline}
            columnOrder={editingView?.column_order}
            columnWidths={editingView?.column_widths}
            isDefault={editingView?.is_default}
            onSave={handleSaveView}
            onCancel={handleCancelEdit}
          />
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium mb-2">No view selected</p>
              <p className="text-sm">Select a view to edit or create a new one</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
