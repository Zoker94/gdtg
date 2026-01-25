import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Shield, ArrowLeft, LogIn, ShieldCheck, ShoppingBag, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";
import { TermsConfirmation } from "@/components/TermsConfirmation";
import { SellerProductForm } from "@/components/SellerProductForm";

interface VerifiedTransaction {
  id: string;
  room_id: string;
  room_password: string;
  buyer_id: string | null;
  seller_id: string | null;
  moderator_id: string | null;
  arbiter_id: string | null;
  amount: number;
  platform_fee_amount: number;
  fee_bearer: string;
  product_name: string;
  roleToAssign?: "buyer" | "seller";
  isEmptyRoom?: boolean;
}

type JoinStep = "credentials" | "role_select" | "seller_form" | "terms";

const JoinRoom = () => {
  const navigate = useNavigate();
  const { roomId: urlRoomId } = useParams();
  const { user } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useUserRole();
  const [roomId, setRoomId] = useState(urlRoomId || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<JoinStep>("credentials");
  const [verifiedTransaction, setVerifiedTransaction] = useState<VerifiedTransaction | null>(null);
  
  const isStaff = userRole?.isAdmin || userRole?.isModerator;

  // Step 1: Verify room credentials
  const handleVerifyRoom = async () => {
    if (!roomId.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập ID phòng", variant: "destructive" });
      return;
    }
    
    // Admin/Moderator can skip password
    if (!isStaff && !password.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập mật khẩu phòng", variant: "destructive" });
      return;
    }

    setLoading(true);

    const { data: transaction, error } = await supabase
      .from("transactions")
      .select("id, room_id, room_password, buyer_id, seller_id, moderator_id, arbiter_id, amount, platform_fee_amount, fee_bearer, product_name")
      .eq("room_id", roomId.toUpperCase())
      .maybeSingle();

    if (error || !transaction) {
      toast({ title: "Lỗi", description: "Không tìm thấy phòng", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Regular users need correct password, staff can skip
    if (!isStaff && transaction.room_password !== password) {
      toast({ title: "Lỗi", description: "Sai mật khẩu phòng", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Check if user is already a participant
    const isAlreadyParticipant = user && (transaction.buyer_id === user.id || transaction.seller_id === user.id);
    
    if (isAlreadyParticipant) {
      toast({ title: "Thành công", description: "Đã vào phòng giao dịch" });
      navigate(`/transaction/${transaction.id}`);
      setLoading(false);
      return;
    }

    // Staff can join any room for moderation (without becoming buyer/seller)
    if (isStaff) {
      await handleStaffJoin(transaction);
      setLoading(false);
      return;
    }

    // Check if room is full (buyer + seller slots)
    if (transaction.buyer_id && transaction.seller_id) {
      toast({ title: "Lỗi", description: "Phòng đã có đủ 2 người giao dịch (mua và bán)", variant: "destructive" });
      setLoading(false);
      return;
    }
    
    // Check total participant limit (4 max)
    const participantCount = [
      transaction.buyer_id,
      transaction.seller_id,
      transaction.moderator_id,
      transaction.arbiter_id
    ].filter(Boolean).length;
    
    if (participantCount >= 4) {
      toast({ 
        title: "Phòng đã đầy", 
        description: "Phòng giao dịch đã có đủ 4 người", 
        variant: "destructive" 
      });
      setLoading(false);
      return;
    }

    // Check if this is an empty room created by GDV (no buyer, no seller, and default product name)
    const isEmptyRoom = !transaction.buyer_id && !transaction.seller_id && 
      (transaction.product_name === "Phòng giao dịch viên" || transaction.amount === 0);

    // Store verified transaction
    setVerifiedTransaction({ 
      ...transaction, 
      isEmptyRoom,
    });

    // If empty room, show role selection
    if (isEmptyRoom) {
      setStep("role_select");
    } else {
      // Determine role and proceed to terms
      let roleToAssign: "buyer" | "seller" = "seller";
      
      if (transaction.seller_id && !transaction.buyer_id) {
        roleToAssign = "buyer";
      } else if (transaction.buyer_id && !transaction.seller_id) {
        roleToAssign = "seller";
      } else if (!transaction.seller_id && !transaction.buyer_id) {
        roleToAssign = "seller";
      }

      // If joining as buyer, check balance
      if (roleToAssign === "buyer" && user) {
        const canJoinAsBuyer = await checkBuyerBalance(transaction);
        if (!canJoinAsBuyer) {
          setLoading(false);
          return;
        }
      }

      setVerifiedTransaction(prev => prev ? { ...prev, roleToAssign } : null);
      setStep("terms");
    }

    setLoading(false);
  };

  // Check buyer balance
  const checkBuyerBalance = async (transaction: VerifiedTransaction): Promise<boolean> => {
    if (!user) return false;

    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    const userBalance = profile?.balance || 0;
    
    // Calculate total buyer needs to pay
    let buyerTotal = transaction.amount;
    if (transaction.fee_bearer === "buyer") {
      buyerTotal = transaction.amount + transaction.platform_fee_amount;
    } else if (transaction.fee_bearer === "split") {
      buyerTotal = transaction.amount + (transaction.platform_fee_amount / 2);
    }
    
    if (userBalance < buyerTotal) {
      toast({ 
        title: "Số dư không đủ", 
        description: `Bạn cần có ít nhất ${buyerTotal.toLocaleString()}đ để vào phòng này. Số dư hiện tại: ${userBalance.toLocaleString()}đ`, 
        variant: "destructive" 
      });
      return false;
    }

    return true;
  };

  // Handle staff joining
  const handleStaffJoin = async (transaction: VerifiedTransaction) => {
    if (!user) return;

    // Check if staff is already in room
    const isAlreadyStaff = transaction.moderator_id === user.id || transaction.arbiter_id === user.id;
    
    if (isAlreadyStaff) {
      toast({ title: "Thành công", description: "Đã vào phòng giao dịch" });
      navigate(`/transaction/${transaction.id}`);
      return;
    }
    
    // Determine which staff slot to fill
    let updateData: Record<string, string> = {};
    let roleDescription = "";
    
    if (userRole?.isAdmin) {
      // Admin goes to arbiter_id slot
      if (!transaction.arbiter_id) {
        updateData = { arbiter_id: user.id };
        roleDescription = "Admin phân xử";
      } else if (!transaction.moderator_id) {
        // Fallback to moderator slot if arbiter is taken
        updateData = { moderator_id: user.id };
        roleDescription = "Hỗ trợ giao dịch";
      }
    } else {
      // Moderator goes to moderator_id slot
      if (!transaction.moderator_id) {
        updateData = { moderator_id: user.id };
        roleDescription = "Giao dịch viên";
      } else if (!transaction.arbiter_id) {
        // Fallback to arbiter slot
        updateData = { arbiter_id: user.id };
        roleDescription = "Hỗ trợ phân xử";
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      toast({ 
        title: "Phòng đã có đủ nhân viên", 
        description: "Phòng đã có GDV và Admin", 
        variant: "destructive" 
      });
      return;
    }
    
    // Update transaction with staff ID
    const { error: updateError } = await supabase
      .from("transactions")
      .update(updateData)
      .eq("id", transaction.id);
      
    if (updateError) {
      console.error("Staff join error:", updateError);
      toast({ title: "Lỗi", description: "Không thể vào phòng", variant: "destructive" });
      return;
    }
    
    // Send system message announcing staff entry
    await sendStaffJoinMessage(transaction.id);
    toast({ 
      title: "Vào phòng phán xử", 
      description: `Bạn đã vào phòng với vai trò ${roleDescription}` 
    });
    navigate(`/transaction/${transaction.id}`);
  };
  
  // Send a system message when staff joins the room
  const sendStaffJoinMessage = async (transactionId: string) => {
    if (!user) return;
    
    const roleLabel = userRole?.isAdmin ? "Admin" : "Quản lý";
    const message = `🛡️ ${roleLabel} đã vào phòng để hỗ trợ phán xử giao dịch.`;
    
    await supabase.from("messages").insert({
      transaction_id: transactionId,
      sender_id: user.id,
      content: message,
    });
  };

  // Handle role selection for empty rooms
  const handleRoleSelect = async (role: "buyer" | "seller") => {
    if (!verifiedTransaction || !user) return;

    // If buyer, check balance (but for empty room, amount is 0, so we'll skip for now)
    // The seller will set the amount later
    if (role === "buyer" && verifiedTransaction.amount > 0) {
      const canJoin = await checkBuyerBalance(verifiedTransaction);
      if (!canJoin) return;
    }

    if (role === "seller") {
      // Show seller product form
      setStep("seller_form");
    } else {
      // Buyer - show terms
      setVerifiedTransaction(prev => prev ? { ...prev, roleToAssign: "buyer" } : null);
      setStep("terms");
    }
  };

  // Handle seller form success
  const handleSellerFormSuccess = () => {
    if (verifiedTransaction) {
      toast({ title: "Thành công", description: "Đã vào phòng với vai trò Người bán" });
      navigate(`/transaction/${verifiedTransaction.id}`);
    }
  };

  // Step: After confirming terms, actually join
  const handleConfirmJoin = async () => {
    if (!verifiedTransaction || !user) return;
    
    setLoading(true);
    
    const { roleToAssign, id: transactionId } = verifiedTransaction;
    
    const updateData = roleToAssign === "buyer" 
      ? { buyer_id: user.id } 
      : { seller_id: user.id };
    
    const { error: updateError } = await supabase
      .from("transactions")
      .update(updateData)
      .eq("id", transactionId);

    if (updateError) {
      console.error("Update error:", updateError);
      toast({ 
        title: "Lỗi", 
        description: "Không thể tham gia phòng. Vui lòng thử lại.", 
        variant: "destructive" 
      });
      setLoading(false);
      return;
    }

    toast({ 
      title: "Thành công", 
      description: `Bạn đã vào phòng với vai trò ${roleToAssign === "buyer" ? "Người mua" : "Người bán"}` 
    });

    navigate(`/transaction/${transactionId}`);
    setLoading(false);
  };

  const handleCancel = () => {
    setStep("credentials");
    setVerifiedTransaction(null);
    setPassword("");
  };

  // Render role selection screen
  const renderRoleSelection = () => (
    <Card className="max-w-md mx-auto border-border">
      <CardHeader>
        <CardTitle className="text-center">Chọn vai trò của bạn</CardTitle>
        <CardDescription className="text-center">
          Phòng này được tạo bởi Giao dịch viên. Bạn muốn tham gia với vai trò nào?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 hover:border-primary hover:bg-primary/5"
            onClick={() => handleRoleSelect("seller")}
          >
            <ShoppingBag className="w-8 h-8 text-primary" />
            <span className="font-medium">Người bán</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 hover:border-primary hover:bg-primary/5"
            onClick={() => handleRoleSelect("buyer")}
          >
            <ShoppingCart className="w-8 h-8 text-primary" />
            <span className="font-medium">Người mua</span>
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Nếu bạn là người bán, bạn sẽ được yêu cầu đăng thông tin sản phẩm
        </p>

        <Button variant="ghost" onClick={handleCancel} className="w-full">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>
      </CardContent>
    </Card>
  );

  // Render credentials input screen
  const renderCredentialsInput = () => (
    <Card className="max-w-md mx-auto border-border">
      <CardHeader>
        <CardTitle className="text-center flex items-center justify-center gap-2">
          {isStaff ? <ShieldCheck className="w-5 h-5 text-primary" /> : <LogIn className="w-5 h-5" />}
          {isStaff ? "Vào phòng phán xử" : "Vào phòng giao dịch"}
        </CardTitle>
        {isStaff && (
          <CardDescription className="text-center text-primary">
            {userRole?.isAdmin ? "Bạn đang vào với quyền Admin" : "Bạn đang vào với quyền Quản lý"}
            {" - Không cần mật khẩu"}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">ID Phòng</label>
          <Input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            placeholder="VD: ABC123"
            className="text-center text-lg tracking-widest font-mono"
            maxLength={6}
          />
        </div>

        {!isStaff && (
          <div>
            <label className="text-sm font-medium mb-1 block">Mật khẩu</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="4 số"
              className="text-center text-lg tracking-widest font-mono"
              maxLength={4}
            />
          </div>
        )}

        <Button
          onClick={handleVerifyRoom}
          className="w-full glow-primary"
          size="lg"
          disabled={loading || roleLoading}
        >
          {loading ? "Đang kiểm tra..." : isStaff ? "Vào phòng phán xử" : "Vào phòng"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Bạn cần ID và mật khẩu từ người tạo phòng
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-xl">GDTG</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => step === "credentials" ? navigate(-1) : handleCancel()}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>

        {step === "credentials" && renderCredentialsInput()}
        
        {step === "role_select" && renderRoleSelection()}
        
        {step === "seller_form" && verifiedTransaction && (
          <SellerProductForm
            transactionId={verifiedTransaction.id}
            onSuccess={handleSellerFormSuccess}
            onCancel={handleCancel}
            loading={loading}
          />
        )}
        
        {step === "terms" && (
          <TermsConfirmation
            type="join"
            onConfirm={handleConfirmJoin}
            onCancel={handleCancel}
            loading={loading}
          />
        )}
      </main>
    </div>
  );
};

export default JoinRoom;
