import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface InlineEditAssigneeProps {
  value?: string;
  assigneeId?: string;
  users: User[];
  onValueChange: (userId: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showNameText?: boolean;
}

export function InlineEditAssignee({
  value,
  assigneeId,
  users,
  onValueChange,
  placeholder = "Assign to...",
  className,
  disabled = false,
  showNameText = true
}: InlineEditAssigneeProps) {
  const [open, setOpen] = React.useState(false);
  
  const currentUser = users.find(user => user.id === assigneeId);

  const handleSelect = (user: User) => {
    onValueChange(user.id);
    setOpen(false);
  };

  const handleClear = () => {
    onValueChange(null);
    setOpen(false);
  };

  if (disabled) {
    return currentUser ? (
      <UserAvatar
        firstName={currentUser.first_name}
        lastName={currentUser.last_name}
        email={currentUser.email}
        size="sm"
        className={className}
      />
    ) : (
      <span className={cn("text-sm", className)}>{placeholder}</span>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-9 px-0 py-1 font-normal hover:bg-muted/50 w-full relative",
            showNameText ? "justify-start" : "justify-center",
            !currentUser && "text-muted-foreground",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={cn("flex items-center w-full relative", showNameText ? "pl-8" : "justify-center")}>
            {currentUser ? (
              <>
                <UserAvatar
                  firstName={currentUser.first_name}
                  lastName={currentUser.last_name}
                  email={currentUser.email}
                  size="sm"
                  className={cn("flex-shrink-0", showNameText ? "absolute left-1 top-1/2 -translate-y-1/2" : "")}
                />
                {showNameText && (
                  <span className="text-sm truncate flex-1">{currentUser.first_name} {currentUser.last_name}</span>
                )}
                {showNameText && <ChevronDown className="h-3 w-3 opacity-50 flex-shrink-0 ml-auto" />}
              </>
            ) : (
              <>
                <span className="text-sm flex-1">{placeholder}</span>
                <ChevronDown className="h-3 w-3 opacity-50 flex-shrink-0 ml-auto" />
              </>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60 bg-popover border z-50">
        {currentUser && (
          <DropdownMenuItem
            onClick={handleClear}
            className="cursor-pointer text-muted-foreground"
          >
            Clear assignment
          </DropdownMenuItem>
        )}
        {users.map((user) => (
          <DropdownMenuItem
            key={user.id}
            onClick={() => handleSelect(user)}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <UserAvatar
                firstName={user.first_name}
                lastName={user.last_name}
                email={user.email}
                size="sm"
              />
              <span>{user.first_name} {user.last_name}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}