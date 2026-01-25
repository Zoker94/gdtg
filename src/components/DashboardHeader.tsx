import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Shield,
  LogOut,
  Settings,
  Search,
  User,
  Wallet,
  Package,
  TrendingUp,
  Menu,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUserRole } from "@/hooks/useProfile";
import { useProfileRealtime } from "@/hooks/useProfileRealtime";

const DashboardHeader = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: roles } = useUserRole();

  // Enable realtime updates for profile balance
  useProfileRealtime();

  const isAdmin = roles?.isAdmin;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
  };

  return (
    <TooltipProvider>
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-2.5 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-base">GDTG</span>
          </Link>

          {/* Stats Widget - Desktop - Clickable to MyProfile */}
          <div className="hidden md:flex items-center gap-1">
            {profileLoading ? (
              <Skeleton className="h-7 w-32 rounded-full" />
            ) : (
              <button
                onClick={() => navigate("/my-profile")}
                className="flex items-center gap-1 hover:bg-muted/80 rounded-full transition-colors"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-muted/50 rounded-full text-xs cursor-pointer">
                      <Wallet className="w-3.5 h-3.5 text-primary" />
                      <span className="font-medium">{formatCurrency(profile?.balance || 0)}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Số dư - Click để xem hồ sơ</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-muted/50 rounded-full text-xs cursor-pointer">
                      <Package className="w-3.5 h-3.5 text-primary" />
                      <span className="font-medium">{profile?.total_transactions || 0}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Tổng giao dịch</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-muted/50 rounded-full text-xs cursor-pointer">
                      <TrendingUp className="w-3.5 h-3.5 text-primary" />
                      <span className="font-medium">{profile?.reputation_score || 100}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Điểm uy tín</TooltipContent>
                </Tooltip>
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Room Search */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/search-room")}>
                  <Search className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tìm phòng</TooltipContent>
            </Tooltip>

            {/* Profile Search */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/search-profile")}>
                  <User className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tìm người dùng</TooltipContent>
            </Tooltip>

            {/* Admin */}
            {isAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/admin")}>
                    <Settings className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Quản trị</TooltipContent>
              </Tooltip>
            )}

            {/* Mobile Menu */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Menu className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {!profileLoading && (
                    <>
                      <DropdownMenuItem onClick={() => navigate("/my-profile")} className="flex justify-between">
                        <span className="flex items-center gap-2">
                          <Wallet className="w-4 h-4" /> Số dư
                        </span>
                        <span className="font-medium">{formatCurrency(profile?.balance || 0)}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/my-profile")} className="flex justify-between">
                        <span className="flex items-center gap-2">
                          <Package className="w-4 h-4" /> Giao dịch
                        </span>
                        <span className="font-medium">{profile?.total_transactions || 0}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/my-profile")} className="flex justify-between">
                        <span className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" /> Uy tín
                        </span>
                        <span className="font-medium">{profile?.reputation_score || 100}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/my-profile")}>
                        <User className="w-4 h-4 mr-2" /> Hồ sơ của tôi
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Sign Out - Desktop */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hidden md:flex" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Đăng xuất</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
};

export default DashboardHeader;
