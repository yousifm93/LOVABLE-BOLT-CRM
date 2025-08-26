import { Bell, Search, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-6 shadow-soft">
      <div className="flex items-center gap-6">
        <SidebarTrigger />
        {/* BOLTCRM Branding */}
        <div className="flex items-center gap-3">
          <img 
            src="https://zpsvatonxakysnbqnfcc.supabase.co/storage/v1/object/public/branding/yellow%20bolt%20logo.%20-%20bolt%20only.svg" 
            alt="Bolt Logo" 
            className="h-8 w-8"
          />
          <div className="flex items-baseline">
            <span className="text-xl font-light tracking-wide text-foreground">BOLT</span>
            <span className="text-xl font-bold tracking-tight text-foreground">CRM</span>
          </div>
        </div>
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search clients, loans, or documents..."
            className="pl-10 h-9"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
            3
          </span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {user?.email}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}