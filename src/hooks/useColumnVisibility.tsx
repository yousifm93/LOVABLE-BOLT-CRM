import { useState, useEffect } from "react";
import { databaseService } from "@/services/database";

interface Column {
  id: string;
  label: string;
  visible: boolean;
}

interface View {
  name: string;
  columns: Record<string, boolean>;
  order: string[];
  isShared?: boolean;
  id?: string;
}

export function useColumnVisibility(
  initialColumns: Column[], 
  storageKey: string = 'columnVisibility',
  pipelineType?: string
) {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [views, setViews] = useState<View[]>([]);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [isLoadingViews, setIsLoadingViews] = useState(false);

  // Load saved state from localStorage AND database views
  useEffect(() => {
    const loadViews = async () => {
      setIsLoadingViews(true);
      
      // Load local state
      const saved = localStorage.getItem(storageKey);
      const savedViews = localStorage.getItem(`${storageKey}_views`);
      const savedOrder = localStorage.getItem(`${storageKey}_order`);
      
      if (saved) {
        try {
          const savedState = JSON.parse(saved);
          let orderedColumns = [...initialColumns];
          
          // Apply saved order if available
          if (savedOrder) {
            const orderArray = JSON.parse(savedOrder) as string[];
            orderedColumns = orderArray
              .map(id => initialColumns.find(col => col.id === id))
              .filter((col): col is Column => col !== undefined);
            
            // Add any new columns that weren't in the saved order
            const existingIds = new Set(orderArray);
            const newColumns = initialColumns.filter(col => !existingIds.has(col.id));
            orderedColumns = [...orderedColumns, ...newColumns];
          }
          
          setColumns(orderedColumns.map(col => ({
            ...col,
            visible: savedState[col.id] !== undefined ? savedState[col.id] : col.visible
          })));
        } catch (error) {
          console.error('Failed to parse saved column visibility state:', error);
        }
      }

      // Load local views
      const localViews: View[] = [];
      if (savedViews) {
        try {
          localViews.push(...JSON.parse(savedViews));
        } catch (error) {
          console.error('Failed to parse saved views:', error);
        }
      }

      // Load database views if pipelineType is provided
      const allViews: View[] = [...localViews];
      if (pipelineType) {
        try {
          const dbViews = await databaseService.getPipelineViews(pipelineType);
          const sharedViews: View[] = dbViews.map(dbView => {
            const columnOrder = Array.isArray(dbView.column_order) 
              ? dbView.column_order 
              : JSON.parse(dbView.column_order as string);
            
            const columns: Record<string, boolean> = {};
            columnOrder.forEach((colId: string) => {
              columns[colId] = true;
            });
            
            return {
              id: dbView.id,
              name: dbView.name,
              columns,
              order: columnOrder,
              isShared: true
            };
          });
          
          // Prepend shared views (they come first)
          allViews.unshift(...sharedViews);
        } catch (error) {
          console.error('Failed to load database views:', error);
        }
      }
      
      setViews(allViews);
      setIsLoadingViews(false);
    };

    loadViews();
  }, [storageKey, pipelineType]);

  // Save state to localStorage whenever columns change
  useEffect(() => {
    const state = columns.reduce((acc, col) => {
      acc[col.id] = col.visible;
      return acc;
    }, {} as Record<string, boolean>);
    
    const order = columns.map(col => col.id);
    
    localStorage.setItem(storageKey, JSON.stringify(state));
    localStorage.setItem(`${storageKey}_order`, JSON.stringify(order));
  }, [columns, storageKey]);

  const toggleColumn = (columnId: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };

  const toggleAll = (visible: boolean) => {
    setColumns(prev => prev.map(col => ({ ...col, visible })));
  };

  const saveView = (viewName: string) => {
    const newView: View = {
      name: viewName,
      columns: columns.reduce((acc, col) => {
        acc[col.id] = col.visible;
        return acc;
      }, {} as Record<string, boolean>),
      order: columns.map(col => col.id)
    };

    const updatedViews = [...views.filter(v => v.name !== viewName), newView];
    setViews(updatedViews);
    localStorage.setItem(`${storageKey}_views`, JSON.stringify(updatedViews));
  };

  const loadView = (viewName: string) => {
    const view = views.find(v => v.name === viewName);
    if (view) {
      // If view has order, restore order first
      if (view.order) {
        const orderedColumns = view.order
          .map(id => columns.find(col => col.id === id))
          .filter((col): col is Column => col !== undefined);
        
        // Add any new columns that weren't in the saved order
        const existingIds = new Set(view.order);
        const newColumns = columns.filter(col => !existingIds.has(col.id));
        const allOrderedColumns = [...orderedColumns, ...newColumns];
        
        setColumns(allOrderedColumns.map(col => ({
          ...col,
          visible: view.columns[col.id] !== undefined ? view.columns[col.id] : col.visible
        })));
      } else {
        // Fallback for old views without order
        setColumns(prev => prev.map(col => ({
          ...col,
          visible: view.columns[col.id] !== undefined ? view.columns[col.id] : col.visible
        })));
      }
      setActiveView(viewName);
    }
  };

  const deleteView = (viewName: string) => {
    // Only allow deleting local (non-shared) views
    const localViews = views.filter(v => !v.isShared);
    const updatedViews = localViews.filter(v => v.name !== viewName);
    const sharedViews = views.filter(v => v.isShared);
    
    // Update state with shared views + updated local views
    setViews([...sharedViews, ...updatedViews]);
    localStorage.setItem(`${storageKey}_views`, JSON.stringify(updatedViews));
    
    if (activeView === viewName) {
      setActiveView(null);
    }
  };

  const reorderColumns = (oldIndex: number, newIndex: number) => {
    setColumns(prev => {
      const newColumns = [...prev];
      const [movedColumn] = newColumns.splice(oldIndex, 1);
      newColumns.splice(newIndex, 0, movedColumn);
      return newColumns;
    });
  };

  const visibleColumns = columns.filter(col => col.visible);

  return {
    columns,
    views,
    visibleColumns,
    activeView,
    toggleColumn,
    toggleAll,
    saveView,
    loadView,
    deleteView,
    reorderColumns,
    setColumns,
    setActiveView,
    isLoadingViews
  };
}