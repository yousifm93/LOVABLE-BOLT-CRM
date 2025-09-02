import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TwoColumnDetailLayout } from "./TwoColumnDetailLayout";
import { User, Phone, Mail, Home, Users, Shield } from "lucide-react";
import { formatDate, formatYesNo, maskSSN, formatAddress } from "@/utils/formatters";

interface BorrowerInfoTabProps {
  client: any;
}

export function BorrowerInfoTab({ client }: BorrowerInfoTabProps) {
  // Mock data for borrower info fields not in current client structure
  const borrowerData = [
    { icon: User, label: "Borrower First Name", value: client.person?.firstName || "John" },
    { icon: User, label: "Borrower Last Name", value: client.person?.lastName || "Smith" },
    { icon: Shield, label: "Social Security Number", value: maskSSN("123456789") },
    { icon: User, label: "Date of Birth", value: formatDate("1985-06-15") },
    { icon: Home, label: "Residence Type", value: "Owner Occupied" },
    { icon: Users, label: "Marital Status", value: "Married" },
    { icon: Mail, label: "Email", value: client.person?.email || "john.smith@email.com" },
    { icon: Phone, label: "Cell Phone", value: client.person?.phone || "(555) 123-4567" },
    { icon: Users, label: "Number of Dependents", value: "2" },
    { icon: Shield, label: "Estimated Credit Score", value: "750" },
    { icon: Home, label: "Current Address", value: formatAddress("123 Main St, Anytown, CA 90210") },
    { icon: Home, label: "Occupancy of Current Address", value: "Primary Residence" },
    { icon: Home, label: "Time at Current Address", value: "3 years" },
    { icon: Shield, label: "Military/Veteran", value: formatYesNo(false) }
  ];

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Borrower Information
          </h3>
          <TwoColumnDetailLayout items={borrowerData} />
        </div>
      </div>
    </ScrollArea>
  );
}