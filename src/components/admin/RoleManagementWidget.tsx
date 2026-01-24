import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Users, Shield, UserCog, Plus, Trash2 } from "lucide-react";
import type { AppRole } from "@/hooks/useProfile";

interface UserWithRoles {
  user_id: string;
  full_name: string | null;
  roles: AppRole[];
}

const RoleManagementWidget = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [roleToAdd, setRoleToAdd] = useState<AppRole>("moderator");

  // Fetch all users with their roles
  const { data: usersWithRoles, isLoading } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get all roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combine data
      const usersMap = new Map<string, UserWithRoles>();
      
      profiles?.forEach((profile) => {
        usersMap.set(profile.user_id, {
          user_id: profile.user_id,
          full_name: profile.full_name,
          roles: [],
        });
      });

      roles?.forEach((role) => {
        const user = usersMap.get(role.user_id);
        if (user) {
          user.roles.push(role.role as AppRole);
        }
      });

      return Array.from(usersMap.values());
    },
  });

  // Add role mutation
  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      
      if (error) {
        if (error.code === "23505") {
          throw new Error("Người dùng đã có role này");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({ title: "Đã thêm quyền thành công!" });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  // Remove role mutation
  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({ title: "Đã xóa quyền!" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "moderator":
        return "default";
      default:
        return "secondary";
    }
  };

  const getRoleLabel = (role: AppRole) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "moderator":
        return "Quản lý";
      default:
        return "User";
    }
  };

  // Filter to show only users with special roles or for adding roles
  const specialUsers = usersWithRoles?.filter(
    (u) => u.roles.includes("admin") || u.roles.includes("moderator")
  ) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="py-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4" />
              Quản lý quyền
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedUser(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Thêm
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {specialUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Chưa có quản lý nào
            </p>
          ) : (
            specialUsers.map((user) => (
              <div
                key={user.user_id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-sm">
                    {user.full_name || "Chưa đặt tên"}
                  </p>
                  <div className="flex gap-1 mt-1">
                    {user.roles.map((role) => (
                      <Badge
                        key={role}
                        variant={getRoleBadgeVariant(role)}
                        className="text-xs gap-1"
                      >
                        {role === "admin" && <Shield className="w-3 h-3" />}
                        {role === "moderator" && <Users className="w-3 h-3" />}
                        {getRoleLabel(role)}
                        {role !== "user" && role !== "admin" && (
                          <button
                            onClick={() => removeRole.mutate({ userId: user.user_id, role })}
                            className="ml-1 hover:text-destructive-foreground"
                            disabled={removeRole.isPending}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Add Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm quyền cho người dùng</DialogTitle>
            <DialogDescription>
              Chọn người dùng và quyền muốn thêm. Admin chỉ có thể set quyền Moderator.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Người dùng</label>
              <Select
                value={selectedUser?.user_id || ""}
                onValueChange={(value) => {
                  const user = usersWithRoles?.find((u) => u.user_id === value);
                  setSelectedUser(user || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn người dùng" />
                </SelectTrigger>
                <SelectContent>
                  {usersWithRoles?.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.full_name || "Chưa đặt tên"} 
                      {user.roles.length > 0 && ` (${user.roles.join(", ")})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Quyền</label>
              <Select
                value={roleToAdd}
                onValueChange={(value) => setRoleToAdd(value as AppRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moderator">Quản lý (Moderator)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Chỉ Admin mới có thể thêm quyền. Moderator không có quyền này.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (selectedUser) {
                  addRole.mutate({ userId: selectedUser.user_id, role: roleToAdd });
                }
              }}
              disabled={!selectedUser || addRole.isPending}
            >
              {addRole.isPending ? "Đang thêm..." : "Thêm quyền"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RoleManagementWidget;
