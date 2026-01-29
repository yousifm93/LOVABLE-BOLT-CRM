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
  onColumnToggle: (columnId: string, label?: string) => void;
  onToggleAll: (visible: boolean) => void;
  onSaveView?: (viewName: string) => void;
  onReorderColumns: (oldIndex: number, newIndex: number) => void;
  onViewSaved?: (viewName: string) => void;
  skipDatabaseFields?: boolean;
  customSections?: Record<string, string[]>;
}

interface SortableColumnItemProps {
  column: Column;
  onToggle: (columnId: string, label?: string) => void;
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
        onCheckedChange={() => onToggle(column.id, column.label)}
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

// Default lender sections for skipDatabaseFields mode
const LENDER_SECTIONS: Record<string, string[]> = {
  'BASIC INFO': ['rowNumber', 'lender_name', 'lender_type', 'status'],
  'CONTACT INFO': ['account_executive', 'ae_email', 'ae_phone', 'broker_portal_url', 'send_email'],
  'LOAN LIMITS': ['min_loan_amount', 'max_loan_amount', 'initial_approval_date', 'renewed_on', 'epo_period'],
  'PRODUCTS': [
    'product_fha', 'product_va', 'product_conv', 'product_jumbo', 'product_bs_loan', 'product_wvoe',
    'product_1099_program', 'product_pl_program', 'product_itin', 'product_dpa', 'product_heloc',
    'product_inv_heloc', 'product_fn_heloc', 'product_nonqm_heloc', 'product_manufactured_homes',
    'product_coop', 'product_condo_hotel', 'product_high_dti', 'product_low_fico', 'product_no_credit',
    'product_dr_loan', 'product_fn', 'product_nwc', 'product_5_8_unit', 'product_9_plus_unit',
    'product_commercial', 'product_construction', 'product_land_loan', 'product_fthb_dscr',
    'product_no_income_primary', 'product_no_seasoning_cor', 'product_tbd_uw', 'product_condo_review_desk',
    'product_condo_mip_issues', 'product_558', 'product_wvoe_family', 'product_1099_less_1yr',
    'product_1099_no_biz', 'product_omit_student_loans', 'product_no_ratio_dscr'
  ],
  'LTV LIMITS': [
    'max_ltv', 'conv_max_ltv', 'fha_max_ltv', 'jumbo_max_ltv', 'bs_loan_max_ltv', 'wvoe_max_ltv',
    'dscr_max_ltv', 'ltv_1099', 'pl_max_ltv', 'fn_max_ltv', 'heloc_max_ltv', 'condo_inv_max_ltv'
  ],
  'NUMBERS': [
    'min_fico', 'min_sqft', 'condotel_min_sqft', 'asset_dep_months', 'heloc_min_fico', 'heloc_min', 'max_cash_out_70_ltv'
  ],
  'OTHER': ['notes']
};

export function ColumnVisibilityModal({
  isOpen,
  onClose,
  columns,
  onColumnToggle,
  onToggleAll,
  onSaveView,
  onReorderColumns,
  onViewSaved,
  skipDatabaseFields = false,
  customSections
}: ColumnVisibilityModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewName, setViewName] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['BASIC INFO', 'CONTACT INFO']));
  const { allFields } = useFields();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Merge all database fields with provided columns to show all 140+ fields
  // When skipDatabaseFields is true, only use the provided columns
  const allColumnsWithDbFields = useMemo(() => {
    if (skipDatabaseFields) {
      return columns;
    }
    
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
  }, [columns, allFields, skipDatabaseFields]);

  // Group columns by section
  const groupedColumns = useMemo(() => {
    const groups: Record<string, Column[]> = {};
    const sections = customSections || (skipDatabaseFields ? LENDER_SECTIONS : null);
    
    if (sections) {
      // Use custom or lender sections
      const columnMap = new Map(allColumnsWithDbFields.map(c => [c.id, c]));
      
      Object.entries(sections).forEach(([section, fieldIds]) => {
        const sectionCols = fieldIds
          .map(id => columnMap.get(id))
          .filter((c): c is Column => c !== undefined);
        
        if (sectionCols.length > 0) {
          groups[section] = sectionCols;
        }
      });
      
      // Add any columns not in predefined sections to OTHER
      const assignedIds = new Set(Object.values(sections).flat());
      const unassigned = allColumnsWithDbFields.filter(c => !assignedIds.has(c.id));
      if (unassigned.length > 0) {
        groups['OTHER'] = [...(groups['OTHER'] || []), ...unassigned];
      }
    } else {
      // Use database fields for section grouping
      allColumnsWithDbFields.forEach(col => {
        const field = allFields.find(f => f.field_name === col.id);
        const section = field?.section || 'OTHER';
        
        if (!groups[section]) {
          groups[section] = [];
        }
        groups[section].push(col);
      });
    }
    
    // Sort sections by priority
    const sectionOrder = skipDatabaseFields
      ? ['BASIC INFO', 'CONTACT INFO', 'LOAN LIMITS', 'PRODUCTS', 'LTV LIMITS', 'NUMBERS', 'OTHER']
      : [
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
  }, [allColumnsWithDbFields, allFields, skipDatabaseFields, customSections]);

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
    if (viewName.trim() && onSaveView) {
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

          {onSaveView && (
            <>
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}