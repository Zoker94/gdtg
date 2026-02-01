import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  Shield,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Wallet,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/Footer";

interface Deposit {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  transaction_ref: string | null;
  created_at: string;
  confirmed_at: string | null;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  created_at: string;
  completed_at: string | null;
  admin_note: string | null;
}

const TransactionWallet = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [activeTab, setActiveTab] = useState("deposits");

  const { data: deposits, isLoading: depositsLoading } = useQuery({
    queryKey: ["my-deposits", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("deposits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Deposit[];
    },
    enabled: !!user?.id,
  });

  const { data: withdrawals, isLoading: withdrawalsLoading } = useQuery({
    queryKey: ["my-withdrawals", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Withdrawal[];
    },
    enabled: !!user?.id,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Thành công
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Đang chờ
          </Badge>
        );
      case "on_hold":
        return (
          <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            Tạm giữ
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Từ chối
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full border-border">
          <CardContent className="py-12 text-center">
            <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Vui lòng đăng nhập</p>
            <Button onClick={() => navigate("/auth")}>Đăng nhập</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-base">GDTG</span>
          </Link>
          {profile && (
            <div className="text-sm">
              Số dư: <span className="font-bold text-primary">{formatCurrency(profile.balance)}</span>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Lịch sử ví tiền
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Quick Actions */}
              <div className="flex gap-2 mb-4">
                <Button onClick={() => navigate("/deposit")} size="sm" className="flex-1 gap-2">
                  <ArrowDownLeft className="w-4 h-4" />
                  Nạp tiền
                </Button>
                <Button onClick={() => navigate("/withdraw")} size="sm" variant="outline" className="flex-1 gap-2">
                  <ArrowUpRight className="w-4 h-4" />
                  Rút tiền
                </Button>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="deposits" className="gap-2">
                    <ArrowDownLeft className="w-4 h-4" />
                    Nạp tiền
                  </TabsTrigger>
                  <TabsTrigger value="withdrawals" className="gap-2">
                    <ArrowUpRight className="w-4 h-4" />
                    Rút tiền
                  </TabsTrigger>
                </TabsList>

                {/* Deposits Tab */}
                <TabsContent value="deposits" className="mt-4 space-y-3">
                  {depositsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))
                  ) : deposits && deposits.length > 0 ? (
                    deposits.map((deposit) => (
                      <Card key={deposit.id} className="border-border">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                                <ArrowDownLeft className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-green-600">
                                  +{formatCurrency(deposit.amount)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(deposit.created_at), "HH:mm dd/MM/yyyy", { locale: vi })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {getStatusBadge(deposit.status)}
                              {deposit.confirmed_at && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Duyệt: {format(new Date(deposit.confirmed_at), "HH:mm dd/MM", { locale: vi })}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <ArrowDownLeft className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Chưa có lịch sử nạp tiền</p>
                      <Button onClick={() => navigate("/deposit")} className="mt-3">
                        Nạp tiền ngay
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Withdrawals Tab */}
                <TabsContent value="withdrawals" className="mt-4 space-y-3">
                  {withdrawalsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))
                  ) : withdrawals && withdrawals.length > 0 ? (
                    withdrawals.map((withdrawal) => (
                      <Card key={withdrawal.id} className="border-border">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                                <ArrowUpRight className="w-5 h-5 text-orange-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-orange-600">
                                  -{formatCurrency(withdrawal.amount)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {withdrawal.bank_name} - ***{withdrawal.bank_account_number.slice(-4)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(withdrawal.created_at), "HH:mm dd/MM/yyyy", { locale: vi })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {getStatusBadge(withdrawal.status)}
                              {withdrawal.completed_at && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Hoàn tất: {format(new Date(withdrawal.completed_at), "HH:mm dd/MM", { locale: vi })}
                                </p>
                              )}
                            </div>
                          </div>
                          {withdrawal.admin_note && withdrawal.status === "rejected" && (
                            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600">
                              Lý do: {withdrawal.admin_note}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <ArrowUpRight className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Chưa có lịch sử rút tiền</p>
                      <Button onClick={() => navigate("/withdraw")} variant="outline" className="mt-3">
                        Rút tiền
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default TransactionWallet;
