import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  firstName: string;
  lastName: string;
  email?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showTooltip?: boolean;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base"
};

const colors = [
  "bg-blue-500",
  "bg-green-500", 
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500"
];

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
}

function getColorForUser(email: string = "") {
  const hash = email.split("").reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return colors[Math.abs(hash) % colors.length];
}

export function UserAvatar({
  firstName,
  lastName,
  email = "",
  size = "md",
  className,
  showTooltip = false
}: UserAvatarProps) {
  const initials = getInitials(firstName, lastName);
  const colorClass = getColorForUser(email);
  
  const avatar = (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src="" alt={`${firstName} ${lastName}`} />
      <AvatarFallback className={cn("text-white font-medium", colorClass)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  if (showTooltip) {
    return (
      <div className="group relative">
        {avatar}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {firstName} {lastName}
        </div>
      </div>
    );
  }

  return avatar;
}