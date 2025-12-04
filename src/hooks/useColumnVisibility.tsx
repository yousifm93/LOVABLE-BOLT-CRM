import { useState, useEffect, useCallback, useMemo } from "react";
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
  filters?: any[];
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
  const [mainViewConfig, setMainViewConfig] = useState<{ columns: Record<string, boolean>; order: string[] } | null>(null);

  // Load saved state from localStorage AND database views
  useEffect(() => {
    const loadViews = async () => {
      setIsLoadingViews(true);
      
      // Load database views first if pipelineType is provided
      let sharedViews: View[] = [];
      if (pipelineType) {
        try {
          const dbViews = await databaseService.getPipelineViews(pipelineType);
          sharedViews = dbViews.map(dbView => {
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
              isShared: true,
              filters: (dbView as any).filters || []
            };
          });
        } catch (error) {
          console.error('Failed to load database views:', error);
        }
      }

      // Check if shared "Main View" exists
      const sharedMainView = sharedViews.find(v => v.name === 'Main View');
      
      if (sharedMainView) {
        // Store Main View config for comparison
        setMainViewConfig({
          columns: sharedMainView.columns,
          order: sharedMainView.order
        });
        
        // Auto-load shared Main View
        const orderedColumns = sharedMainView.order
          .map(id => initialColumns.find(col => col.id === id))
          .filter((col): col is Column => col !== undefined);
        
        // Add any new columns not in Main View
        const existingIds = new Set(sharedMainView.order);
        const newColumns = initialColumns.filter(col => !existingIds.has(col.id));
        const allOrderedColumns = [...orderedColumns, ...newColumns];
        
        setColumns(allOrderedColumns.map(col => ({
          ...col,
          visible: sharedMainView.columns[col.id] !== undefined ? sharedMainView.columns[col.id] : false
        })));
        setActiveView('Main View');
      } else {
        // No shared Main View - use localStorage or defaults
        const saved = localStorage.getItem(storageKey);
        const savedOrder = localStorage.getItem(`${storageKey}_order`);
        
        if (saved) {
          try {
            const savedState = JSON.parse(saved);
            let orderedColumns = [...initialColumns];
            
            if (savedOrder) {
              const orderArray = JSON.parse(savedOrder) as string[];
              orderedColumns = orderArray
                .map(id => initialColumns.find(col => col.id === id))
                .filter((col): col is Column => col !== undefined);
              
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
      }

      // Load local views (filter out Main View if shared one exists)
      const savedViews = localStorage.getItem(`${storageKey}_views`);
      const localViews: View[] = [];
      if (savedViews) {
        try {
          const parsedViews = JSON.parse(savedViews);
          const filteredViews = sharedMainView 
            ? parsedViews.filter((v: View) => v.name !== 'Main View')
            : parsedViews;
          localViews.push(...filteredViews);
        } catch (error) {
          console.error('Failed to parse saved views:', error);
        }
      }
      
      // Combine: shared views first, then filtered local views
      const allViews: View[] = [...sharedViews, ...localViews];
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

  // Check if current config matches Main View (for highlighting)
  const isMainViewActive = useMemo(() => {
    if (!mainViewConfig) return activeView === 'Main View';
    
    const currentVisibleIds = new Set(columns.filter(c => c.visible).map(c => c.id));
    const mainViewVisibleIds = new Set(Object.keys(mainViewConfig.columns).filter(id => mainViewConfig.columns[id]));
    
    // Check if same columns are visible
    if (currentVisibleIds.size !== mainViewVisibleIds.size) return false;
    for (const id of currentVisibleIds) {
      if (!mainViewVisibleIds.has(id)) return false;
    }
    
    return true;
  }, [columns, mainViewConfig, activeView]);

  const toggleColumn = useCallback((columnId: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
    // When user modifies columns, clear active view (unless it was already modified)
    if (activeView === 'Main View' && isMainViewActive) {
      setActiveView(null);
    }
  }, [activeView, isMainViewActive]);

  const toggleAll = useCallback((visible: boolean) => {
    setColumns(prev => prev.map(col => ({ ...col, visible })));
    setActiveView(null);
  }, []);

  const saveView = useCallback((viewName: string) => {
    // Prevent saving a local view named "Main View" if a shared one exists
    const sharedMainView = views.find(v => v.name === 'Main View' && v.isShared);
    if (viewName === 'Main View' && sharedMainView) {
      console.warn('Cannot save local view named "Main View" - a shared Main View already exists');
      return;
    }

    const newView: View = {
      name: viewName,
      columns: columns.reduce((acc, col) => {
        acc[col.id] = col.visible;
        return acc;
      }, {} as Record<string, boolean>),
      order: columns.map(col => col.id)
    };

    // Only save/update local (non-shared) views
    const localViews = views.filter(v => !v.isShared);
    const updatedLocalViews = [...localViews.filter(v => v.name !== viewName), newView];
    const sharedViews = views.filter(v => v.isShared);
    
    setViews([...sharedViews, ...updatedLocalViews]);
    localStorage.setItem(`${storageKey}_views`, JSON.stringify(updatedLocalViews));
    setActiveView(viewName);
  }, [views, columns, storageKey]);

  const loadView = useCallback((viewName: string) => {
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
  }, [views, columns]);

  const deleteView = useCallback((viewName: string) => {
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
  }, [views, activeView, storageKey]);

  const reorderColumns = useCallback((oldIndex: number, newIndex: number) => {
    setColumns(prev => {
      const newColumns = [...prev];
      const [movedColumn] = newColumns.splice(oldIndex, 1);
      newColumns.splice(newIndex, 0, movedColumn);
      return newColumns;
    });
  }, []);

  const visibleColumns = useMemo(() => columns.filter(col => col.visible), [columns]);

  return {
    columns,
    views,
    visibleColumns,
    activeView,
    isMainViewActive,
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