import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Download, ExternalLink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InlineEditNotes } from "@/components/ui/inline-edit-notes";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

interface ConditionAuditRow {
  id: string;
  description: string;
  lead_id: string;
  borrower_first_name: string;
  borrower_last_name: string;
  mb_loan_number: string | null;
  needed_from: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  created_by_first_name: string | null;
  created_by_last_name: string | null;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "1_added", label: "Added" },
  { value: "2_requested", label: "Requested" },
  { value: "3_received", label: "Received" },
  { value: "4_cleared", label: "Cleared" },
  { value: "5_waived", label: "Waived" },
];

const FROM_OPTIONS = [
  { value: "all", label: "All Sources" },
  { value: "Borrower", label: "Borrower" },
  { value: "Third Party", label: "Third Party" },
  { value: "Lender", label: "Lender" },
  { value: "Title", label: "Title" },
  { value: "Other", label: "Other" },
];

export function ConditionAuditTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromFilter, setFromFilter] = useState("all");

  const { data: conditions = [], isLoading } = useQuery({
    queryKey: ['condition-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_conditions')
        .select(`
          id,
          description,
          lead_id,
          needed_from,
          status,
          notes,
          created_at,
          leads!inner (
            first_name,
            last_name,
            mb_loan_number
          ),
          created_by_user:users!lead_conditions_created_by_fkey (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        description: item.description,
        lead_id: item.lead_id,
        borrower_first_name: item.leads?.first_name || '',
        borrower_last_name: item.leads?.last_name || '',
        mb_loan_number: item.leads?.mb_loan_number || null,
        needed_from: item.needed_from,
        status: item.status,
        notes: item.notes,
        created_at: item.created_at,
        created_by_first_name: item.created_by_user?.first_name || null,
        created_by_last_name: item.created_by_user?.last_name || null,
      })) as ConditionAuditRow[];
    }
  });

  const handleNotesUpdate = async (conditionId: string, notes: string | null) => {
    const { error } = await supabase
      .from('lead_conditions')
      .update({ notes })
      .eq('id', conditionId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update notes",
        variant: "destructive"
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['condition-audit'] });
    toast({
      title: "Updated",
      description: "Notes saved successfully"
    });
  };

  const filteredConditions = useMemo(() => {
    return conditions.filter(condition => {
      const matchesSearch = 
        condition.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${condition.borrower_first_name} ${condition.borrower_last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (condition.mb_loan_number || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || condition.status === statusFilter;
      const matchesFrom = fromFilter === "all" || condition.needed_from === fromFilter;

      return matchesSearch && matchesStatus && matchesFrom;
    });
  }, [conditions, searchQuery, statusFilter, fromFilter]);

  const exportToCSV = () => {
    const headers = ['Condition', 'Borrower', 'Loan #', 'From', 'Status', 'Notes', 'Created At', 'Created By'];
    const rows = filteredConditions.map(c => [
      c.description,
      `${c.borrower_first_name} ${c.borrower_last_name}`,
      c.mb_loan_number || '',
      c.needed_from || '',
      c.status,
      c.notes || '',
      format(new Date(c.created_at), 'MM/dd/yyyy'),
      c.created_by_first_name ? `${c.created_by_first_name} ${c.created_by_last_name}` : ''
    ]);

    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `condition-audit-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: ColumnDef<ConditionAuditRow>[] = [
    {
      accessorKey: 'description',
      header: 'Condition',
      width: 400,
      cell: ({ row }) => (
        <div className="text-sm font-medium whitespace-normal" title={row.original.description}>
          {row.original.description}
        </div>
      )
    },
    {
      accessorKey: 'borrower_name',
      header: 'Borrower',
      width: 150,
      cell: ({ row }) => (
        <a 
          href={`/leads?lead=${row.original.lead_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          {row.original.borrower_first_name} {row.original.borrower_last_name}
          <ExternalLink className="h-3 w-3" />
        </a>
      )
    },
    {
      accessorKey: 'mb_loan_number',
      header: 'Loan #',
      width: 100,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.mb_loan_number || '—'}
        </span>
      )
    },
    {
      accessorKey: 'needed_from',
      header: 'From',
      width: 100,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {row.original.needed_from || 'N/A'}
        </Badge>
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      width: 100,
      cell: ({ row }) => {
        const status = row.original.status;
        const statusLabel = STATUS_OPTIONS.find(s => s.value === status)?.label || status;
        return (
          <Badge 
            variant={status === '4_cleared' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {statusLabel}
          </Badge>
        );
      }
    },
    {
      accessorKey: 'notes',
      header: 'Audit Notes',
      width: 200,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditNotes
            value={row.original.notes}
            onValueChange={(value) => handleNotesUpdate(row.original.id, value)}
            placeholder="Add audit note..."
          />
        </div>
      )
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      width: 100,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.original.created_at), 'MM/dd/yy')}
        </span>
      )
    },
    {
      accessorKey: 'created_by',
      header: 'By',
      width: 120,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.created_by_first_name 
            ? `${row.original.created_by_first_name} ${row.original.created_by_last_name}`
            : '—'}
        </span>
      )
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Condition Audit</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Track all conditions added to files across the CRM
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="col-span-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by condition, borrower, or loan #..."
                className="pl-8"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fromFilter} onValueChange={setFromFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FROM_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-4 text-sm text-muted-foreground">
          <span>Showing {filteredConditions.length} of {conditions.length} conditions</span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-8">Loading conditions...</div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredConditions}
            searchTerm=""
            lockSort={false}
            lockReorder={false}
            lockResize={false}
            storageKey="condition-audit-table"
            showRowNumbers={false}
          />
        )}
      </CardContent>
    </Card>
  );
}
