import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
  is_assignable: boolean;
  email_signature?: string | null;
  auth_user_id?: string | null;
}

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onUserUpdated: () => void;
}

export function EditUserModal({ open, onOpenChange, user, onUserUpdated }: EditUserModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    role: "LO" as "Admin" | "LO" | "LO Assistant" | "Processor" | "ReadOnly",
    is_active: true,
    is_assignable: true,
    email_signature: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone || "",
        role: user.role as "Admin" | "LO" | "LO Assistant" | "Processor" | "ReadOnly",
        is_active: user.is_active,
        is_assignable: user.is_assignable ?? true,
        email_signature: user.email_signature || "",
      });
      setNewPassword("");
      setShowPassword(false);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate password if provided
    if (newPassword && newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Update user table first
      const updateData: Record<string, any> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone || null,
        role: formData.role,
        is_active: formData.is_active,
        is_assignable: formData.is_assignable,
        email_signature: formData.email_signature || null,
        updated_at: new Date().toISOString(),
      };

      // If password provided, also update display_password
      if (newPassword) {
        updateData.display_password = newPassword;
      }

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", user.id);

      if (error) throw error;

      // If password provided and user has auth account, update Supabase auth password
      if (newPassword && user.auth_user_id) {
        const { error: authError } = await supabase.functions.invoke('admin-update-user', {
          body: { 
            userId: user.auth_user_id, 
            password: newPassword 
          }
        });

        if (authError) {
          toast({
            title: "Warning",
            description: "User updated but password change failed: " + authError.message,
            variant: "destructive",
          });
          onUserUpdated();
          onOpenChange(false);
          return;
        }
      }

      toast({
        title: "Success",
        description: newPassword ? "User and password updated successfully" : "User updated successfully",
      });

      onUserUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="352-328-9828"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="LO">LO</SelectItem>
                <SelectItem value="LO Assistant">LO Assistant</SelectItem>
                <SelectItem value="Processor">Processor</SelectItem>
                <SelectItem value="ReadOnly">Read Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password">New Password</Label>
            <p className="text-xs text-muted-foreground">Leave blank to keep current password</p>
            <div className="relative">
              <Input
                id="new_password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password..."
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="is_active">Active</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="is_assignable">Assignable</Label>
              <p className="text-xs text-muted-foreground">Show in team assignment dropdowns</p>
            </div>
            <Switch
              id="is_assignable"
              checked={formData.is_assignable}
              onCheckedChange={(checked) => setFormData({ ...formData, is_assignable: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email_signature">Email Signature (HTML)</Label>
            <p className="text-xs text-muted-foreground">
              Paste the HTML source code of the email signature
            </p>
            <Textarea
              id="email_signature"
              value={formData.email_signature}
              onChange={(e) => setFormData({ ...formData, email_signature: e.target.value })}
              placeholder="Paste HTML signature here..."
              rows={8}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
