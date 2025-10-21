import { useState, useEffect } from "react";

interface Column {
  id: string;
  label: string;
  visible: boolean;
}

interface View {
  name: string;
  columns: Record<string, boolean>;
  order: string[];
}

export function useColumnVisibility(initialColumns: Column[], storageKey: string = 'columnVisibility') {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [views, setViews] = useState<View[]>([]);
  const [activeView, setActiveView] = useState<string | null>(null);

  // Load saved state from localStorage
  useEffect(() => {
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

    if (savedViews) {
      try {
        setViews(JSON.parse(savedViews));
      } catch (error) {
        console.error('Failed to parse saved views:', error);
      }
    }
  }, [storageKey]);

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
    const updatedViews = views.filter(v => v.name !== viewName);
    setViews(updatedViews);
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
    reorderColumns
  };
}