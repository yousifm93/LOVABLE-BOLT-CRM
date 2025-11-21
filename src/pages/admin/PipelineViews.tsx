import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, Save, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { databaseService } from "@/services/database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  { value: "active", label: "Active Pipeline" },
  { value: "leads", label: "Leads Board" },
  { value: "pending_app", label: "Pending App" },
  { value: "screening", label: "Screening" },
  { value: "pre_qualified", label: "Pre-Qualified" },
  { value: "pre_approved", label: "Pre-Approved" },
  { value: "past_clients", label: "Past Clients" },
];

// Sample column configuration for Active pipeline
const ACTIVE_PIPELINE_COLUMNS = [
  { id: "borrower_name", label: "BORROWER" },
  { id: "team", label: "USER" },
  { id: "lender", label: "LENDER" },
  { id: "arrive_loan_number", label: "LOAN #" },
  { id: "loan_amount", label: "LOAN AMT" },
  { id: "disclosure_status", label: "DISC" },
  { id: "close_date", label: "CLOSE DATE" },
  { id: "loan_status", label: "LOAN STATUS" },
  { id: "appraisal_status", label: "APPRAISAL" },
  { id: "title_status", label: "TITLE" },
  { id: "hoi_status", label: "HOI" },
  { id: "condo_status", label: "CONDO" },
  { id: "cd_status", label: "CD" },
  { id: "package_status", label: "PACKAGE" },
  { id: "lock_expiration_date", label: "LOCK EXP" },
  { id: "ba_status", label: "BA" },
  { id: "epo_status", label: "EPO" },
  { id: "buyer_agent", label: "BUYER'S AGENT" },
  { id: "listing_agent", label: "LISTING AGENT" },
];

export default function PipelineViews() {
  const [selectedPipeline, setSelectedPipeline] = useState<string>("active");
  const [views, setViews] = useState<PipelineView[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingView, setEditingView] = useState<Partial<PipelineView> | null>(null);
  const { toast } = useToast();

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
      toast({
        title: "Error",
        description: "Failed to load pipeline views",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateView = () => {
    setEditingView({
      name: "New View",
      pipeline_type: selectedPipeline,
      column_order: ACTIVE_PIPELINE_COLUMNS.map(col => col.id),
      is_default: false,
    });
  };

  const handleSaveView = async () => {
    if (!editingView) return;

    try {
      if (editingView.id) {
        await databaseService.updatePipelineView(editingView.id, {
          name: editingView.name,
          column_order: editingView.column_order,
          column_widths: editingView.column_widths,
          is_default: editingView.is_default,
        });
      } else {
        await databaseService.createPipelineView({
          name: editingView.name!,
          pipeline_type: editingView.pipeline_type!,
          column_order: editingView.column_order!,
          column_widths: editingView.column_widths,
          is_default: editingView.is_default,
        });
      }
      
      toast({
        title: "Success",
        description: `View "${editingView.name}" saved successfully`,
      });
      
      setEditingView(null);
      loadViews();
    } catch (error) {
      console.error("Error saving view:", error);
      toast({
        title: "Error",
        description: "Failed to save view",
        variant: "destructive",
      });
    }
  };

  const handleDeleteView = async (viewId: string) => {
    try {
      await databaseService.deletePipelineView(viewId);
      
      toast({
        title: "Success",
        description: "View deleted successfully",
      });
      
      loadViews();
    } catch (error) {
      console.error("Error deleting view:", error);
      toast({
        title: "Error",
        description: "Failed to delete view",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Views Management</CardTitle>
          <CardDescription>
            Create and manage custom column views for each pipeline board
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pipeline Selector */}
          <div className="space-y-2">
            <Label>Select Pipeline</Label>
            <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Select a pipeline" />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_TYPES.map(pipeline => (
                  <SelectItem key={pipeline.value} value={pipeline.value}>
                    {pipeline.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Create New View Button */}
          <div>
            <Button onClick={handleCreateView} className="gap-2">
              <Plus className="h-4 w-4" />
              Create New View
            </Button>
          </div>

          {/* Views List */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading views...</div>
          ) : views.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <p className="mb-2">No custom views found for this pipeline</p>
                <p className="text-sm">Click "Create New View" to get started</p>
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>VIEW NAME</TableHead>
                  <TableHead>COLUMNS</TableHead>
                  <TableHead>DEFAULT</TableHead>
                  <TableHead>CREATED</TableHead>
                  <TableHead className="text-right">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {views.map(view => (
                  <TableRow key={view.id}>
                    <TableCell className="font-medium">{view.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{view.column_order.length} columns</Badge>
                    </TableCell>
                    <TableCell>
                      {view.is_default && <Badge>Default</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {view.created_at && new Date(view.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingView(view)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteView(view.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit View Modal/Section */}
      {editingView && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingView.id ? "Edit View" : "Create New View"}
            </CardTitle>
            <CardDescription>
              Configure column visibility and order for this view
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>View Name</Label>
              <Input
                value={editingView.name}
                onChange={(e) => setEditingView({ ...editingView, name: e.target.value })}
                placeholder="Enter view name"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={editingView.is_default}
                onCheckedChange={(checked) => 
                  setEditingView({ ...editingView, is_default: checked })
                }
              />
              <Label>Set as default view for this pipeline</Label>
            </div>

            {/* Column Configuration */}
            <div className="space-y-2">
              <Label>Columns</Label>
              <div className="border rounded-md divide-y max-h-96 overflow-y-auto">
                {ACTIVE_PIPELINE_COLUMNS.map((col, index) => (
                  <div key={col.id} className="flex items-center justify-between p-3 hover:bg-accent">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <span className="text-sm font-medium">{col.label}</span>
                    </div>
                    <Switch
                      checked={editingView.column_order?.includes(col.id)}
                      onCheckedChange={(checked) => {
                        const newOrder = checked
                          ? [...(editingView.column_order || []), col.id]
                          : (editingView.column_order || []).filter(id => id !== col.id);
                        setEditingView({ ...editingView, column_order: newOrder });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingView(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveView} className="gap-2">
                <Save className="h-4 w-4" />
                Save View
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
