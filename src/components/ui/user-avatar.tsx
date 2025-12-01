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
  sm: "h-9 w-9 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-14 w-14 text-lg"
};

// Specific colors for team members
const userColorMap: Record<string, string> = {
  'yousif@mortgagebolt.org': 'bg-gray-500',
  'yousif@mortgagebolt.com': 'bg-gray-500',
  'yousifminc@gmail.com': 'bg-gray-500',
  'herman@mortgagebolt.org': 'bg-blue-500',
  'salma@mortgagebolt.org': 'bg-pink-400',
  'juan@mortgagebolt.org': 'bg-purple-500',
  'processing@mortgagebolt.org': 'bg-orange-500'
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
  // Handle multi-word first names (e.g., "Juan Diego" → "JD")
  const firstNameParts = firstName.trim().split(/\s+/);
  
  if (lastName && lastName.trim()) {
    // Normal case: First initial + Last initial
    return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
  } else if (firstNameParts.length >= 2) {
    // Multi-word first name with no last name: Use first letters of each word
    return `${firstNameParts[0].charAt(0).toUpperCase()}${firstNameParts[1].charAt(0).toUpperCase()}`;
  }
  
  // Fallback: Just first initial
  return firstName.charAt(0).toUpperCase();
}

function getColorForUser(email: string = "") {
  const lowerEmail = email.toLowerCase();
  if (userColorMap[lowerEmail]) {
    return userColorMap[lowerEmail];
  }
  // Fallback to hash-based for unknown users
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