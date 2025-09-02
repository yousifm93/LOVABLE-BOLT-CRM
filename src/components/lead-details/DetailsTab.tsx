import React from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, DollarSign, Home, User, Mail, Phone, Calendar } from "lucide-react";

interface DetailsTabProps {
  client: any;
}

function DetailRow({ icon: Icon, label, value, badgeVariant }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | null | undefined;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}) {
  if (!value) return null;

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground min-w-0 truncate">{label}</span>
      </div>
      <div className="shrink-0">
        {badgeVariant ? (
          <Badge variant={badgeVariant} className="text-xs">
            {value}
          </Badge>
        ) : (
          <span className="text-sm font-medium">{value}</span>
        )}
      </div>
    </div>
  );
}

export function DetailsTab({ client }: DetailsTabProps) {
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'approved':
        return 'default';
      case 'pending':
      case 'working on it':
        return 'secondary';
      case 'dead':
      case 'declined':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getPriorityVariant = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <ScrollArea className="h-[400px] w-full">
      <div className="space-y-4">
        {/* Personal Information */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <User className="h-3 w-3" />
            Personal Information
          </h4>
          <div className="space-y-1">
            <DetailRow
              icon={User}
              label="Full Name"
              value={`${client.person.firstName} ${client.person.lastName}`}
            />
            <DetailRow
              icon={Mail}
              label="Email"
              value={client.person.email}
            />
            <DetailRow
              icon={Phone}
              label="Phone"
              value={client.person.phone}
            />
          </div>
        </div>

        {/* Loan Information */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <DollarSign className="h-3 w-3" />
            Loan Information
          </h4>
          <div className="space-y-1">
            <DetailRow
              icon={DollarSign}
              label="Loan Amount"
              value={client.loan.loanAmount}
            />
            <DetailRow
              icon={Home}
              label="Loan Type"
              value={client.loan.loanType}
            />
            <DetailRow
              icon={Home}
              label="Property Type"
              value={client.loan.propertyType}
            />
          </div>
        </div>

        {/* Status Information */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            Status & Timeline
          </h4>
          <div className="space-y-1">
            <DetailRow
              icon={Calendar}
              label="Current Status"
              value={client.ops.status}
              badgeVariant={getStatusVariant(client.ops.status)}
            />
            <DetailRow
              icon={Calendar}
              label="Priority"
              value={client.ops.priority}
              badgeVariant={getPriorityVariant(client.ops.priority)}
            />
            <DetailRow
              icon={Calendar}
              label="Stage"
              value={client.ops.stage?.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
            />
          </div>
        </div>

        {/* Additional Information */}
        {(client.ops.referralSource || client.location?.city) && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <MapPin className="h-3 w-3" />
              Additional Details
            </h4>
            <div className="space-y-1">
              {client.ops.referralSource && (
                <DetailRow
                  icon={User}
                  label="Referral Source"
                  value={client.ops.referralSource}
                />
              )}
              {client.location?.city && (
                <DetailRow
                  icon={MapPin}
                  label="Location"
                  value={`${client.location.city}, ${client.location.state || ''}`}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}