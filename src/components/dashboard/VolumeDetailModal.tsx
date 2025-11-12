import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VolumeLead {
  id: string;
  first_name: string;
  last_name: string;
  loan_amount: number | null;
  close_date?: string | null;
  closed_at?: string | null;
}

interface VolumeDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: VolumeLead[];
  onLeadClick?: (leadId: string) => void;
}

export function VolumeDetailModal({
  open,
  onOpenChange,
  title,
  data,
  onLeadClick,
}: VolumeDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title} ({data.length})</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Borrower Name</TableHead>
                <TableHead>Loan Amount</TableHead>
                <TableHead>Close Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No data available
                  </TableCell>
                </TableRow>
              ) : (
                data.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell 
                      className="font-medium cursor-pointer hover:text-primary hover:underline"
                      onClick={() => onLeadClick?.(lead.id)}
                    >
                      {lead.first_name} {lead.last_name}
                    </TableCell>
                    <TableCell>
                      {lead.loan_amount 
                        ? new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(lead.loan_amount)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {(lead.close_date || lead.closed_at)
                        ? new Date(lead.close_date || lead.closed_at!).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
