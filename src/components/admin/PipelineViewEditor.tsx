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
import { Search, Plus, X, GripVertical, Eye, EyeOff, Save } from "lucide-react";
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
  onToggleVisibility,
  onWidthChange 
}: { 
  column: ColumnConfig; 
  onRemove: () => void;
  onToggleVisibility: () => void;
  onWidthChange: (delta: number) => void;
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

  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    setStartX(e.clientX);
    e.preventDefault();
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      if (Math.abs(delta) > 5) {
        onWidthChange(delta);
        setStartX(e.clientX);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, startX, onWidthChange]);

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
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary"
        onMouseDown={handleMouseDown}
      />
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
}: PipelineViewEditorProps) {
  const { allFields, loading: fieldsLoading } = useFields();
  const [name, setName] = useState(viewName);
  const [selectedPipeline, setSelectedPipeline] = useState(pipelineType);
  const [isDefaultView, setIsDefaultView] = useState(isDefault);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [columns, setColumns] = useState<ColumnConfig[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Initialize columns from props or defaults
  useEffect(() => {
    // Wait for fields to load before initializing columns
    if (fieldsLoading || allFields.length === 0) return;
    
    if (columnOrder.length > 0) {
      const initialColumns = columnOrder
        .map(fieldName => {
          // Try to find in crm_fields first
          const field = allFields.find(f => f.field_name === fieldName);
          if (field) {
            return {
              field_name: field.field_name,
              display_name: field.display_name,
              width: columnWidths[fieldName] || 150,
              visible: true,
            };
          }
          
          // If not found, check if it's a custom accessorKey
          const displayName = ACCESSOR_KEY_DISPLAY_NAMES[fieldName];
          if (displayName) {
            return {
              field_name: fieldName,
              display_name: displayName,
              width: columnWidths[fieldName] || 150,
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
  }, [viewId, allFields, columnOrder, columnWidths, fieldsLoading]);

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
  };

  const removeColumn = (fieldName: string) => {
    setColumns(columns.filter(col => col.field_name !== fieldName));
  };

  const toggleColumnVisibility = (fieldName: string) => {
    setColumns(columns.map(col =>
      col.field_name === fieldName ? { ...col, visible: !col.visible } : col
    ));
  };

  const updateColumnWidth = (fieldName: string, delta: number) => {
    setColumns(columns.map(col => {
      if (col.field_name === fieldName) {
        const newWidth = Math.max(80, Math.min(600, col.width + delta));
        return { ...col, width: newWidth };
      }
      return col;
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setColumns((items) => {
      const oldIndex = items.findIndex((item) => item.field_name === active.id);
      const newIndex = items.findIndex((item) => item.field_name === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleSave = async () => {
    const columnOrderArray = columns.map(col => col.field_name);
    const columnWidthsObj = columns.reduce((acc, col) => {
      acc[col.field_name] = col.width;
      return acc;
    }, {} as Record<string, number>);

    await onSave({
      name,
      pipeline_type: selectedPipeline,
      column_order: columnOrderArray,
      column_widths: columnWidthsObj,
      is_default: isDefaultView,
    });
  };

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
    <div className="flex h-full gap-4">
      {/* Left Sidebar - Available Fields */}
      <Card className="w-80 flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold mb-3">Available Fields</h3>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {allFields.length} fields available
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {Object.entries(filteredGroups).map(([section, fields]) => (
              <div key={section} className="mb-2">
                <button
                  onClick={() => toggleSection(section)}
                  className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-muted rounded text-sm font-medium"
                >
                  <span>{section}</span>
                  <Badge variant="secondary" className="text-xs">
                    {fields.length}
                  </Badge>
                </button>
                {expandedSections.has(section) && (
                  <div className="ml-2 mt-1 space-y-1">
                    {fields.map(field => (
                      <div
                        key={field.field_name}
                        className={cn(
                          "flex items-center justify-between px-2 py-1.5 rounded text-xs group hover:bg-muted",
                          isFieldSelected(field.field_name) && "bg-muted/50"
                        )}
                      >
                        <span className="truncate flex-1">{field.display_name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
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
      </Card>

      {/* Right Side - Editor */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Top Toolbar */}
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="view-name">View Name</Label>
              <Input
                id="view-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter view name..."
              />
            </div>
            <div>
              <Label htmlFor="pipeline-type">Pipeline</Label>
              <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
                <SelectTrigger id="pipeline-type">
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
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Switch
                id="default-view"
                checked={isDefaultView}
                onCheckedChange={setIsDefaultView}
              />
              <Label htmlFor="default-view">Set as Default View</Label>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!name || columns.length === 0}>
                <Save className="h-4 w-4 mr-2" />
                Save View
              </Button>
            </div>
          </div>
        </Card>

        {/* Live Preview Table */}
        <Card className="flex-1 flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Live Preview</h3>
              <Badge variant="secondary">
                {columns.filter(c => c.visible).length} columns visible
              </Badge>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4">
              {columns.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <p>No columns selected</p>
                  <p className="text-sm mt-2">Add fields from the left sidebar to start building your view</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
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
                                onWidthChange={(delta) => updateColumnWidth(column.field_name, delta)}
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
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
