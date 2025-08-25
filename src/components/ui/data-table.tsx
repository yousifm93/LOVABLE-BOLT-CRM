import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ColumnDef<T> {
  accessorKey: string;
  header: string;
  cell?: (props: { row: { original: T } }) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  searchTerm?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchTerm = "",
  onRowClick,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = React.useState<string>("");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filteredData = React.useMemo(() => {
    let filtered = data;

    if (searchTerm) {
      filtered = data.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        
        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortColumn, sortDirection]);

  return (
    <div className="rounded-md border bg-card shadow-soft">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.accessorKey}
                className={cn(
                  "h-12 text-left font-medium",
                  column.sortable && "cursor-pointer hover:bg-muted/50"
                )}
                onClick={() => column.sortable && handleSort(column.accessorKey)}
              >
                <div className="flex items-center gap-2">
                  {column.header}
                  {column.sortable && sortColumn === column.accessorKey && (
                    <span className="text-xs">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </TableHead>
            ))}
            <TableHead className="w-[50px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.map((row, index) => (
            <TableRow
              key={index}
              className="hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <TableCell key={column.accessorKey} className="p-4">
                  {column.cell ? (
                    column.cell({ row: { original: row } })
                  ) : (
                    <span>{row[column.accessorKey]}</span>
                  )}
                </TableCell>
              ))}
              <TableCell className="p-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover border border-border">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {filteredData.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          No data found.
        </div>
      )}
    </div>
  );
}

export const StatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "lead":
        return "bg-info text-info-foreground";
      case "pending":
        return "bg-warning text-warning-foreground";
      case "screening":
        return "bg-muted text-muted-foreground";
      case "pre-qualified":
        return "bg-accent text-accent-foreground";
      case "pre-approved":
        return "bg-primary text-primary-foreground";
      case "active":
        return "bg-success text-success-foreground";
      case "closed":
        return "bg-secondary text-secondary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Badge className={getStatusColor(status)}>
      {status}
    </Badge>
  );
};