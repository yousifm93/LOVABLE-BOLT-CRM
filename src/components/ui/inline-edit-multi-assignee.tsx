import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_assignable?: boolean;
}

interface InlineEditMultiAssigneeProps {
  assigneeIds: string[];
  users: User[];
  onValueChange: (userIds: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxVisible?: number;
  avatarSize?: "xs" | "sm" | "md" | "lg";
}

export function InlineEditMultiAssignee({
  assigneeIds = [],
  users,
  onValueChange,
  placeholder = "Assign to...",
  className,
  disabled = false,
  maxVisible = 3,
  avatarSize = "sm"
}: InlineEditMultiAssigneeProps) {
  const [open, setOpen] = React.useState(false);
  
  const selectedUsers = users.filter(user => assigneeIds.includes(user.id));
  const assignableUsers = users.filter(u => u.is_assignable !== false);

  const handleToggle = (userId: string) => {
    if (assigneeIds.includes(userId)) {
      onValueChange(assigneeIds.filter(id => id !== userId));
    } else {
      onValueChange([...assigneeIds, userId]);
    }
  };

  const handleClearAll = () => {
    onValueChange([]);
    setOpen(false);
  };

  // Render overlapping avatars
  const renderAvatars = () => {
    if (selectedUsers.length === 0) {
      return <span className="text-sm text-muted-foreground">{placeholder}</span>;
    }

    const visibleUsers = selectedUsers.slice(0, maxVisible);
    const remainingCount = selectedUsers.length - maxVisible;

    return (
      <div className="flex items-center -space-x-2">
        {visibleUsers.map((user, index) => (
          <div 
            key={user.id} 
            className="relative border-2 border-background rounded-full"
            style={{ zIndex: maxVisible - index }}
          >
            <UserAvatar
              firstName={user.first_name}
              lastName={user.last_name}
              email={user.email}
              size={avatarSize}
            />
          </div>
        ))}
        {remainingCount > 0 && (
          <div 
            className="relative flex items-center justify-center w-7 h-7 rounded-full bg-muted border-2 border-background text-xs font-medium"
            style={{ zIndex: 0 }}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    );
  };

  if (disabled) {
    return (
      <div className={cn("flex items-center", className)}>
        {renderAvatars()}
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-9 px-2 py-1 font-normal hover:bg-muted/50 min-w-[80px]",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1">
            {renderAvatars()}
            <ChevronDown className="h-3 w-3 opacity-50 flex-shrink-0 ml-1" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 bg-popover border z-50 max-h-[300px] overflow-y-auto">
        {selectedUsers.length > 0 && (
          <>
            <DropdownMenuItem
              onClick={handleClearAll}
              className="cursor-pointer text-muted-foreground"
            >
              <X className="h-4 w-4 mr-2" />
              Clear all assignments
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {assignableUsers.map((user) => {
          const isSelected = assigneeIds.includes(user.id);
          return (
            <DropdownMenuItem
              key={user.id}
              onClick={(e) => {
                e.preventDefault();
                handleToggle(user.id);
              }}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2 w-full">
                <div className={cn(
                  "flex items-center justify-center w-4 h-4 border rounded",
                  isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                )}>
                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <UserAvatar
                  firstName={user.first_name}
                  lastName={user.last_name}
                  email={user.email}
                  size="sm"
                />
                <span className="flex-1">{user.first_name} {user.last_name}</span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}