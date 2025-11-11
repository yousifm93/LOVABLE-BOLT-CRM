import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDateShort } from "@/utils/formatters";
import { useNavigate } from "react-router-dom";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  lead_on_date?: string;
  pending_app_at?: string | null;
  pipeline_stage_id?: string;
  assigned_user_id?: string | null;
}

const STAGE_ID_TO_NAME: Record<string, string> = {
  'c54f417b-3f67-43de-80f5-954cf260d571': 'Leads',
  '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945': 'Pending App',
  '24eff8b7-ad28-4085-8507-dc133179c07d': 'Screening',
  'd0733afe-9fce-4e30-9e6a-07207b6cc6c4': 'Pre-Qualified',
  'efc8ff8c-71fb-4e79-8e59-e7e7be1b3a40': 'Pre-Approved',
  '77dd193b-aa1d-407f-b84f-d9e07a61d883': 'Active',
  '60fca0c6-fc4a-40d1-9681-d11f56e3d07a': 'Past Clients'
};

interface Agent {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  face_to_face_meeting?: string | null;
  last_agent_call?: string | null;
}

interface DashboardDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: Lead[] | Agent[];
  type: "leads" | "applications" | "meetings" | "calls";
}

export function DashboardDetailModal({
  open,
  onOpenChange,
  title,
  data,
  type,
}: DashboardDetailModalProps) {
  const navigate = useNavigate();

  const renderDate = (item: Lead | Agent) => {
    if (type === "leads" && "lead_on_date" in item) {
      return item.lead_on_date ? formatDateShort(item.lead_on_date) : "—";
    }
    if (type === "applications" && "pending_app_at" in item) {
      return item.pending_app_at ? new Date(item.pending_app_at).toLocaleDateString() : "—";
    }
    if (type === "meetings" && "face_to_face_meeting" in item) {
      return item.face_to_face_meeting ? new Date(item.face_to_face_meeting).toLocaleDateString() : "—";
    }
    if (type === "calls" && "last_agent_call" in item) {
      return item.last_agent_call ? new Date(item.last_agent_call).toLocaleDateString() : "—";
    }
    return "—";
  };

  const getDateColumnTitle = () => {
    switch (type) {
      case "leads":
        return "Lead On Date";
      case "applications":
        return "Pending App Date";
      case "meetings":
        return "Meeting Date";
      case "calls":
        return "Call Date";
      default:
        return "Date";
    }
  };

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
                <TableHead>Name</TableHead>
                <TableHead>{getDateColumnTitle()}</TableHead>
                <TableHead>Current Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell 
                    className="font-medium cursor-pointer hover:text-primary hover:underline"
                    onClick={() => navigate(`/leads/${item.id}`)}
                  >
                    {item.first_name} {item.last_name}
                  </TableCell>
                  <TableCell>{renderDate(item)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {STAGE_ID_TO_NAME[item.pipeline_stage_id || ''] || "Unknown"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
