import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAllModerators, useCreateModeratorProfile, useUpdateModeratorProfile, useDeleteModeratorProfile, ModeratorProfile } from "@/hooks/useModerators";
import { useAllUsers } from "@/hooks/useAdminActions";
import { Users, Plus, Edit, Trash2, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ModeratorManagementWidget = () => {
  const { data: moderators, isLoading } = useAllModerators();
  const { data: allUsers } = useAllUsers();
  const createProfile = useCreateModeratorProfile();
  const updateProfile = useUpdateModeratorProfile();
  const deleteProfile = useDeleteModeratorProfile();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMod, setEditingMod] = useState<ModeratorProfile | null>(null);
  const [form, setForm] = useState({
    user_id: "",
    display_name: "",
    facebook_url: "",
    zalo_contact: "",
    phone: "",
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
    specialization: "",
    bio: "",
    avatar_url: "",
    is_active: true,
  });

  const resetForm = () => {
    setForm({
      user_id: "",
      display_name: "",
      facebook_url: "",
      zalo_contact: "",
      phone: "",
      bank_name: "",
      bank_account_number: "",
      bank_account_name: "",
      specialization: "",
      bio: "",
      avatar_url: "",
      is_active: true,
    });
  };

  const handleCreate = async () => {
    if (!form.user_id || !form.display_name) {
      toast({ title: "Vui lòng điền User ID và Tên hiển thị", variant: "destructive" });
      return;
    }

    await createProfile.mutateAsync({
      user_id: form.user_id,
      display_name: form.display_name,
      facebook_url: form.facebook_url || null,
      zalo_contact: form.zalo_contact || null,
      phone: form.phone || null,
      bank_name: form.bank_name || null,
      bank_account_number: form.bank_account_number || null,
      bank_account_name: form.bank_account_name || null,
      specialization: form.specialization || null,
      bio: form.bio || null,
      avatar_url: form.avatar_url || null,
      is_active: form.is_active,
    });
    
    setIsCreateOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingMod) return;

    await updateProfile.mutateAsync({
      id: editingMod.id,
      updates: {
        display_name: form.display_name,
        facebook_url: form.facebook_url || null,
        zalo_contact: form.zalo_contact || null,
        phone: form.phone || null,
        bank_name: form.bank_name || null,
        bank_account_number: form.bank_account_number || null,
        bank_account_name: form.bank_account_name || null,
        specialization: form.specialization || null,
        bio: form.bio || null,
        avatar_url: form.avatar_url || null,
        is_active: form.is_active,
      },
    });
    
    setEditingMod(null);
    resetForm();
  };

  const startEdit = (mod: ModeratorProfile) => {
    setEditingMod(mod);
    setForm({
      user_id: mod.user_id,
      display_name: mod.display_name,
      facebook_url: mod.facebook_url || "",
      zalo_contact: mod.zalo_contact || "",
      phone: mod.phone || "",
      bank_name: mod.bank_name || "",
      bank_account_number: mod.bank_account_number || "",
      bank_account_name: mod.bank_account_name || "",
      specialization: mod.specialization || "",
      bio: mod.bio || "",
      avatar_url: mod.avatar_url || "",
      is_active: mod.is_active,
    });
  };

  // Get moderator users from allUsers
  const moderatorUsers = allUsers?.filter(u => {
    // Check if this user is already a moderator
    return !moderators?.some(m => m.user_id === u.user_id);
  });

  const FormFields = () => (
    <div className="space-y-4">
      {!editingMod && (
        <div className="space-y-2">
          <Label>Chọn người dùng (Moderator)</Label>
          <select
            className="w-full p-2 border rounded-md bg-background"
            value={form.user_id}
            onChange={(e) => {
              const selectedUser = allUsers?.find(u => u.user_id === e.target.value);
              setForm(prev => ({ 
                ...prev, 
                user_id: e.target.value,
                display_name: selectedUser?.full_name || prev.display_name
              }));
            }}
          >
            <option value="">-- Chọn người dùng --</option>
            {moderatorUsers?.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.full_name || u.user_id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tên hiển thị *</Label>
          <Input
            value={form.display_name}
            onChange={(e) => setForm(prev => ({ ...prev, display_name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Chuyên môn</Label>
          <Input
            value={form.specialization}
            onChange={(e) => setForm(prev => ({ ...prev, specialization: e.target.value }))}
            placeholder="VD: Game, Điện tử..."
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Số điện thoại</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Zalo</Label>
          <Input
            value={form.zalo_contact}
            onChange={(e) => setForm(prev => ({ ...prev, zalo_contact: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Facebook URL</Label>
        <Input
          value={form.facebook_url}
          onChange={(e) => setForm(prev => ({ ...prev, facebook_url: e.target.value }))}
          placeholder="https://facebook.com/..."
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-2">
          <Label>Ngân hàng</Label>
          <Input
            value={form.bank_name}
            onChange={(e) => setForm(prev => ({ ...prev, bank_name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Số TK</Label>
          <Input
            value={form.bank_account_number}
            onChange={(e) => setForm(prev => ({ ...prev, bank_account_number: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Chủ TK</Label>
          <Input
            value={form.bank_account_name}
            onChange={(e) => setForm(prev => ({ ...prev, bank_account_name: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Giới thiệu</Label>
        <Textarea
          value={form.bio}
          onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Avatar URL</Label>
        <Input
          value={form.avatar_url}
          onChange={(e) => setForm(prev => ({ ...prev, avatar_url: e.target.value }))}
        />
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" />
          Quản lý Giao Dịch Viên
          <Badge variant="secondary" className="ml-auto">
            {moderators?.length || 0}
          </Badge>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="ml-2">
                <Plus className="w-3 h-3 mr-1" />
                Thêm
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Thêm Giao Dịch Viên</DialogTitle>
              </DialogHeader>
              <FormFields />
              <Button onClick={handleCreate} disabled={createProfile.isPending} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {createProfile.isPending ? "Đang tạo..." : "Tạo hồ sơ"}
              </Button>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : moderators?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Chưa có giao dịch viên nào
          </p>
        ) : (
          <ScrollArea className={moderators && moderators.length > 3 ? "h-[300px]" : ""}>
            <div className="space-y-2">
              {moderators?.map((mod) => (
                <div
                  key={mod.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={mod.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {mod.display_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{mod.display_name}</p>
                      {!mod.is_active && (
                        <Badge variant="secondary" className="text-xs">Ẩn</Badge>
                      )}
                    </div>
                    {mod.specialization && (
                      <p className="text-xs text-muted-foreground">{mod.specialization}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Dialog open={editingMod?.id === mod.id} onOpenChange={(open) => !open && setEditingMod(null)}>
                      <DialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(mod)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Sửa thông tin GDV</DialogTitle>
                        </DialogHeader>
                        <FormFields />
                        <Button onClick={handleUpdate} disabled={updateProfile.isPending} className="w-full">
                          <Save className="w-4 h-4 mr-2" />
                          {updateProfile.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                        </Button>
                      </DialogContent>
                    </Dialog>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        if (confirm("Xóa giao dịch viên này?")) {
                          deleteProfile.mutate(mod.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default ModeratorManagementWidget;
