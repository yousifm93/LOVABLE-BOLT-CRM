import { useState, useMemo, useEffect } from "react";
import { useFields } from "@/contexts/FieldsContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, Plus, X, GripVertical, Eye, EyeOff, Save, ChevronRight, Settings } from "lucide-react";
import { generateTestRows } from "@/utils/testDataGenerator";
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

// Map accessorKey IDs used in pages to display names
const ACCESSOR_KEY_DISPLAY_NAMES: Record<string, string> = {
  // Common computed fields
  name: "Borrower Name",
  createdOn: "Lead Created",
  pendingAppOn: "Pending App On",
  appCompleteOn: "App Complete On",
  preQualifiedOn: "Pre-Qualified On",
  preApprovedOn: "Pre-Approved On",
  closedOn: "Closed On",
  
  // Relationship fields
  realEstateAgent: "Real Estate Agent",
  user: "User/Team Member",
  team: "Team Member",
  lender: "Lender",
  buyer_agent: "Buyer's Agent",
  listing_agent: "Listing Agent",
  
  // Status/tracking fields
  status: "Status",
  dueDate: "Due Date",
  notes: "About the Borrower",
  latestFileUpdates: "Latest File Updates",
  
  // Financial fields
  loanNumber: "Loan #",
  loanAmount: "Loan Amount",
  salesPrice: "Sales Price",
  ltv: "LTV",
  dti: "DTI",
  creditScore: "Credit Score",
  
  // Status columns
  baStatus: "BA Status",
  
  // Computed/alias fields
  borrower_name: "Borrower Name",
  real_estate_agent: "Real Estate Agent",
};

interface PipelineView {
  id: string;
  name: string;
  pipeline_type: string;
  column_order: string[];
  column_widths?: Record<string, number>;
  is_default: boolean;
}

interface PipelineViewEditorProps {
  viewId?: string;
  viewName?: string;
  pipelineType?: string;
  columnOrder?: string[];
  columnWidths?: Record<string, number>;
  isDefault?: boolean;
  onSave: (viewData: {
    name: string;
    pipeline_type: string;
    column_order: string[];
    column_widths: Record<string, number>;
    is_default: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  views: PipelineView[];
  selectedPipeline: string;
  onPipelineChange: (pipeline: string) => void;
  onCreateView: () => void;
  onEditView: (view: PipelineView) => void;
  isSaving?: boolean;
}

interface ColumnConfig {
  field_name: string;
  display_name: string;
  width: number;
  visible: boolean;
}

function SortableColumnHeader({ 
  column, 
  onRemove, 
  onToggleVisibility
}: { 
  column: ColumnConfig; 
  onRemove: () => void;
  onToggleVisibility: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.field_name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableHead
      ref={setNodeRef}
      style={{ ...style, width: column.width }}
      className="relative border-r border-border/60 bg-muted/50"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            className="cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-xs font-semibold uppercase truncate">
            {column.display_name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onToggleVisibility}
          >
            {column.visible ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </TableHead>
  );
}

export function PipelineViewEditor({
  viewId,
  viewName = "",
  pipelineType = "active",
  columnOrder = [],
  columnWidths = {},
  isDefault = false,
  onSave,
  onCancel,
  views,
  selectedPipeline,
  onPipelineChange,
  onCreateView,
  onEditView,
  isSaving = false,
}: PipelineViewEditorProps) {
  const { allFields, loading: fieldsLoading } = useFields();
  const [name, setName] = useState(viewName);
  const [isDefaultView, setIsDefaultView] = useState(isDefault);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [isFieldsPanelOpen, setIsFieldsPanelOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showWidthCalibration, setShowWidthCalibration] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Initialize columns from props or defaults when view changes
  useEffect(() => {
    // Wait for fields to load before initializing columns
    if (fieldsLoading || allFields.length === 0) return;
    
    // Store the columnWidths in a stable reference for this effect
    const widths = columnWidths || {};
    
    if (columnOrder && columnOrder.length > 0) {
      const initialColumns = columnOrder
        .map(fieldName => {
          // Try to find in crm_fields first
          const field = allFields.find(f => f.field_name === fieldName);
          if (field) {
            return {
              field_name: field.field_name,
              display_name: field.display_name,
              width: widths[fieldName] || 150,
              visible: true,
            };
          }
          
          // If not found, check if it's a custom accessorKey
          const displayName = ACCESSOR_KEY_DISPLAY_NAMES[fieldName];
          if (displayName) {
            return {
              field_name: fieldName,
              display_name: displayName,
              width: widths[fieldName] || 150,
              visible: true,
            };
          }
          
          console.warn(`Field not found: ${fieldName}`);
          return null;
        })
        .filter(Boolean) as ColumnConfig[];
      setColumns(initialColumns);
    } else {
      // Default columns for new view
      const defaultFields = ['borrower_name', 'email', 'phone', 'sales_price', 'close_date'];
      const initialColumns = defaultFields
        .map(fieldName => {
          const field = allFields.find(f => f.field_name === fieldName);
          if (!field) return null;
          return {
            field_name: field.field_name,
            display_name: field.display_name,
            width: 150,
            visible: true,
          };
        })
        .filter(Boolean) as ColumnConfig[];
      setColumns(initialColumns);
    }
  }, [viewId, allFields, fieldsLoading]); // Only depend on viewId, allFields, and fieldsLoading

  // Sync column widths when columnWidths prop changes (from DB reload)
  useEffect(() => {
    if (!columnWidths || Object.keys(columnWidths).length === 0) return;
    
    setColumns(prev => prev.map(col => ({
      ...col,
      width: columnWidths[col.field_name] || col.width
    })));
  }, [columnWidths]);

  // Sync local state when switching views
  useEffect(() => {
    setName(viewName || "");
    setIsDefaultView(isDefault || false);
    setHasUnsavedChanges(false); // Reset unsaved changes when switching views
  }, [viewId, viewName, isDefault]);

  // Group fields by section
  const groupedFields = useMemo(() => {
    const groups: Record<string, typeof allFields> = {};
    allFields.forEach(field => {
      if (!groups[field.section]) {
        groups[field.section] = [];
      }
      groups[field.section].push(field);
    });
    return groups;
  }, [allFields]);

  // Filter fields based on search
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groupedFields;

    const filtered: Record<string, typeof allFields> = {};
    Object.entries(groupedFields).forEach(([section, fields]) => {
      const matchingFields = fields.filter(field =>
        field.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        field.field_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (matchingFields.length > 0) {
        filtered[section] = matchingFields;
      }
    });
    return filtered;
  }, [groupedFields, searchQuery]);

  // Generate test data
  const testData = useMemo(() => {
    const visibleFields = columns
      .filter(col => col.visible)
      .map(col => allFields.find(f => f.field_name === col.field_name))
      .filter(Boolean);
    return generateTestRows(visibleFields as any, 5);
  }, [columns, allFields]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const addColumn = (fieldName: string) => {
    if (columns.some(col => col.field_name === fieldName)) return;
    
    const field = allFields.find(f => f.field_name === fieldName);
    if (!field) return;

    setColumns([...columns, {
      field_name: field.field_name,
      display_name: field.display_name,
      width: 150,
      visible: true,
    }]);
    setHasUnsavedChanges(true);
  };

  const removeColumn = (fieldName: string) => {
    setColumns(columns.filter(col => col.field_name !== fieldName));
    setHasUnsavedChanges(true);
  };

  const toggleColumnVisibility = (fieldName: string) => {
    setColumns(columns.map(col =>
      col.field_name === fieldName ? { ...col, visible: !col.visible } : col
    ));
    setHasUnsavedChanges(true);
  };

  const updateColumnWidth = (fieldName: string, delta: number) => {
    setColumns(columns.map(col => {
      if (col.field_name === fieldName) {
        const newWidth = Math.max(80, Math.min(600, col.width + delta));
        return { ...col, width: newWidth };
      }
      return col;
    }));
    setHasUnsavedChanges(true);
  };

  const setColumnWidth = (fieldName: string, newWidth: number) => {
    setColumns(columns.map(col => {
      if (col.field_name === fieldName) {
        return { ...col, width: Math.max(80, Math.min(600, newWidth)) };
      }
      return col;
    }));
    setHasUnsavedChanges(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setColumns((items) => {
      const oldIndex = items.findIndex((item) => item.field_name === active.id);
      const newIndex = items.findIndex((item) => item.field_name === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    const columnOrderArray = columns.map(col => col.field_name);
    const columnWidthsObj: Record<string, number> = {};
    
    // Explicitly build the widths object from all columns
    columns.forEach(col => {
      columnWidthsObj[col.field_name] = col.width;
    });
    
    console.log('📊 Saving column widths:', columnWidthsObj);

    await onSave({
      name,
      pipeline_type: pipelineType,
      column_order: columnOrderArray,
      column_widths: columnWidthsObj,
      is_default: isDefaultView,
    });
    setHasUnsavedChanges(false);
  };

  const formatPipelineName = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  const currentPipelineViews = views.filter(v => v.pipeline_type === selectedPipeline);

  const isFieldSelected = (fieldName: string) => {
    return columns.some(col => col.field_name === fieldName);
  };

  // Show loading state while fields are being fetched
  if (fieldsLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading fields...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Consolidated Top Toolbar */}
      <Card className="p-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Pipeline Selector - FIRST */}
          <div className="flex items-center gap-2">
            <Label htmlFor="pipeline-type" className="text-sm whitespace-nowrap">Pipeline:</Label>
            <Select value={selectedPipeline} onValueChange={onPipelineChange}>
              <SelectTrigger id="pipeline-type" className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="leads">Leads</SelectItem>
                <SelectItem value="screening">Screening</SelectItem>
                <SelectItem value="pre_qualified">Pre Qualified</SelectItem>
                <SelectItem value="pre_approved">Pre Approved</SelectItem>
                <SelectItem value="pending_app">Pending App</SelectItem>
                <SelectItem value="past_clients">Past Clients</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Saved Views Dropdown - SECOND */}
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Saved Views:</Label>
            <Select 
              value={viewId || "new"} 
              onValueChange={(value) => {
                if (value === "new") {
                  onCreateView();
                } else {
                  const view = views.find(v => v.id === value);
                  if (view) onEditView(view);
                }
              }}
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">+ New View</SelectItem>
                {currentPipelineViews.map((view) => (
                  <SelectItem key={view.id} value={view.id}>
                    {view.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* View Name */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Label htmlFor="view-name" className="text-sm whitespace-nowrap">View Name:</Label>
            <Input
              id="view-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Enter view name..."
              className="h-9"
            />
          </div>

          {/* Default Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="default-view"
              checked={isDefaultView}
              onCheckedChange={(checked) => {
                setIsDefaultView(checked);
                setHasUnsavedChanges(true);
              }}
            />
            <Label htmlFor="default-view" className="text-sm whitespace-nowrap">Set as Default</Label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 ml-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowWidthCalibration(!showWidthCalibration)}
              className={showWidthCalibration ? "bg-muted" : ""}
            >
              <Settings className="h-4 w-4 mr-2" />
              Calibrate Widths
            </Button>
            <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!name || columns.length === 0 || isSaving} className="relative">
              {hasUnsavedChanges && !isSaving && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-yellow-500 rounded-full" />
              )}
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save View
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Column Width Calibration Panel */}
      <Collapsible open={showWidthCalibration} onOpenChange={setShowWidthCalibration}>
        <CollapsibleContent>
          <Card className="border-blue-500/50 bg-blue-500/5">
            <div className="p-3 border-b">
              <h3 className="font-semibold text-sm">Column Width Calibration</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Set exact pixel widths for each column (80-600px)
              </p>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {columns.filter(c => c.visible).map(column => (
                  <div key={column.field_name} className="flex flex-col gap-1">
                    <Label className="text-xs truncate" title={column.display_name}>
                      {column.display_name}
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={column.width}
                        onChange={(e) => setColumnWidth(column.field_name, parseInt(e.target.value) || 150)}
                        className="h-8 text-xs px-2"
                        min={80}
                        max={600}
                      />
                      <span className="text-[10px] text-muted-foreground">px</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Horizontal Collapsible Available Fields Section */}
      <Collapsible open={isFieldsPanelOpen} onOpenChange={setIsFieldsPanelOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <ChevronRight className={cn("h-4 w-4 transition-transform", isFieldsPanelOpen && "rotate-90")} />
                <span className="font-semibold text-sm">Available Fields</span>
                <Badge variant="secondary" className="text-xs">{allFields.length} fields</Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {isFieldsPanelOpen ? "Click to collapse" : "Click to expand"}
              </span>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t p-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search fields..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
              </div>
              <ScrollArea className="w-full">
                <div className="flex gap-4 pb-2">
                  {Object.entries(filteredGroups).map(([section, fields]) => (
                    <div key={section} className="min-w-[200px]">
                      <button
                        onClick={() => toggleSection(section)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted rounded-md text-sm font-medium mb-2 bg-muted/30"
                      >
                        <span>{section}</span>
                        <Badge variant="secondary" className="text-xs">
                          {fields.length}
                        </Badge>
                      </button>
                      {expandedSections.has(section) && (
                        <div className="space-y-1">
                          {fields.map(field => (
                            <div
                              key={field.field_name}
                              className={cn(
                                "flex items-center justify-between px-3 py-2 rounded-md text-xs group hover:bg-muted transition-colors",
                                isFieldSelected(field.field_name) && "bg-muted/50"
                              )}
                            >
                              <span className="truncate flex-1">{field.display_name}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => addColumn(field.field_name)}
                                disabled={isFieldSelected(field.field_name)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Full-Width Live Preview - Main Focus */}
      <Card className="flex-1 flex flex-col min-h-0">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Live Preview</h3>
            <Badge variant="secondary" className="text-xs">
              {columns.filter(c => c.visible).length} columns visible
            </Badge>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-x-auto">
          {columns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <p>No columns selected</p>
              <p className="text-sm mt-2">Expand "Available Fields" above to add columns to your view</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="border rounded-lg overflow-hidden">
                <Table className="min-w-max">
                  <TableHeader>
                    <TableRow>
                      <SortableContext
                        items={columns.map(c => c.field_name)}
                        strategy={horizontalListSortingStrategy}
                      >
                        {columns.filter(c => c.visible).map(column => (
                          <SortableColumnHeader
                            key={column.field_name}
                            column={column}
                            onRemove={() => removeColumn(column.field_name)}
                            onToggleVisibility={() => toggleColumnVisibility(column.field_name)}
                          />
                        ))}
                      </SortableContext>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testData.map((row, idx) => (
                      <TableRow key={idx}>
                        {columns.filter(c => c.visible).map(column => (
                          <TableCell
                            key={column.field_name}
                            style={{ width: column.width }}
                            className="text-center"
                          >
                            {row[column.field_name] || '—'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DndContext>
          )}
        </div>
      </Card>
    </div>
  );
}
