import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateTransaction, FeeBearer } from "@/hooks/useTransactions";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useUserRole } from "@/hooks/useProfile";
import { Calculator, ImageIcon, X, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { TermsConfirmation } from "@/components/TermsConfirmation";

const CATEGORIES = [
  { value: "game_account", label: "Tài khoản game" },
  { value: "game_item", label: "Vật phẩm game" },
  { value: "game_service", label: "Dịch vụ game (cày thuê, boost)" },
  { value: "digital_product", label: "Sản phẩm số" },
  { value: "other", label: "Khác" },
];

const formSchema = z.object({
  product_name: z.string().max(200).optional(),
  product_description: z.string().max(1000).optional(),
  category: z.string().optional(),
  amount: z.number().min(10000, "Số tiền tối thiểu là 10,000 VNĐ").optional(),
  fee_bearer: z.enum(["buyer", "seller", "split"]),
  role: z.enum(["buyer", "seller", "moderator"]),
}).refine((data) => {
  // If seller role, require product_name, category, and amount
  // Buyer and moderator roles don't need product details
  if (data.role === "seller") {
    return data.product_name && data.product_name.length >= 1 && data.category && data.category.length >= 1 && data.amount && data.amount >= 10000;
  }
  return true;
}, {
  message: "Vui lòng điền đầy đủ thông tin sản phẩm",
  path: ["product_name"],
});

type FormValues = z.infer<typeof formSchema>;

export const CreateTransactionForm = () => {
  const navigate = useNavigate();
  const createTransaction = useCreateTransaction();
  const { user } = useAuth();
  const { data: platformSettings, isLoading: settingsLoading } = usePlatformSettings();
  const { data: roles } = useUserRole();
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<FormValues | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_name: "",
      product_description: "",
      category: "",
      amount: 100000,
      fee_bearer: "buyer",
      role: "seller",
    },
  });

  const watchAmount = form.watch("amount");
  const watchFeeBearer = form.watch("fee_bearer");
  const watchRole = form.watch("role");

  const feePercent = platformSettings?.default_fee_percent || 5;
  const disputeHours = platformSettings?.default_dispute_hours || 24;

  const calculatePreview = () => {
    const fee = (watchAmount || 0) * (feePercent / 100);
    let sellerReceives = watchAmount || 0;

    if (watchFeeBearer === "seller") {
      sellerReceives = (watchAmount || 0) - fee;
    } else if (watchFeeBearer === "split") {
      sellerReceives = (watchAmount || 0) - fee / 2;
    }

    return { fee, sellerReceives };
  };

  const preview = calculatePreview();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    if (images.length + files.length > 5) {
      toast({
        title: "Lỗi",
        description: "Tối đa 5 ảnh",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const newImages: string[] = [];

    for (const file of Array.from(files)) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (error) {
        toast({
          title: "Lỗi upload",
          description: error.message,
          variant: "destructive",
        });
      } else {
        const { data: publicUrl } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);
        newImages.push(publicUrl.publicUrl);
      }
    }

    setImages([...images, ...newImages]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleFormSubmit = (values: FormValues) => {
    // If moderator role selected, skip terms and create directly
    if (values.role === "moderator") {
      onConfirmTermsWithValues(values);
      return;
    }
    // For buyer, they will see buyer-specific terms
    // For seller, they see seller/create terms
    setPendingSubmit(values);
    setShowTerms(true);
  };

  const onConfirmTermsWithValues = async (values: FormValues) => {
    // Check if user is admin/moderator - they become the room arbitrator
    const isStaff = roles?.isAdmin || roles?.isModerator;
    
    const transactionData: {
      product_name: string;
      product_description?: string;
      amount: number;
      platform_fee_percent: number;
      fee_bearer: FeeBearer;
      dispute_time_hours: number;
      buyer_id?: string;
      seller_id?: string;
      category?: string;
      images?: string[];
      moderator_id?: string;
    } = {
      product_name: values.role === "buyer" ? "Phòng người mua" : (values.product_name || "Phòng giao dịch viên"),
      product_description: values.product_description,
      amount: values.role === "buyer" ? 0 : (values.amount || 0),
      platform_fee_percent: feePercent,
      fee_bearer: values.fee_bearer as FeeBearer,
      dispute_time_hours: disputeHours,
      category: values.category || "other",
      images: images,
    };

    // If moderator role selected or staff creates room, they are the moderator (arbitrator)
    if (values.role === "moderator" && isStaff) {
      transactionData.moderator_id = user?.id;
      // Don't assign them as buyer or seller
    } else if (values.role === "seller") {
      transactionData.seller_id = user?.id;
    } else if (values.role === "buyer") {
      transactionData.buyer_id = user?.id;
    }

    try {
      const result = await createTransaction.mutateAsync(transactionData);
      // If buyer created the room, send them to waiting lobby
      if (values.role === "buyer") {
        navigate(`/waiting/${result.id}`);
      } else {
        navigate(`/transaction/${result.id}`);
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const onConfirmTerms = async () => {
    if (!pendingSubmit) return;
    await onConfirmTermsWithValues(pendingSubmit);
  };

  const onCancelTerms = () => {
    setShowTerms(false);
    setPendingSubmit(null);
  };

  if (settingsLoading) {
    return (
      <Card className="max-w-2xl mx-auto border-border shadow-sm">
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Show terms confirmation screen
  if (showTerms) {
    return (
      <TermsConfirmation
        type={pendingSubmit?.role === "buyer" ? "buyer_create" : "create"}
        onConfirm={onConfirmTerms}
        onCancel={onCancelTerms}
        loading={createTransaction.isPending}
      />
    );
  }

  return (
    <Card className="max-w-2xl mx-auto border-border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Tạo phòng giao dịch</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-5">
            {/* Role Selection */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bạn là *</FormLabel>
                  <div className={`grid gap-3 ${(roles?.isAdmin || roles?.isModerator) ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <Button
                      type="button"
                      variant={field.value === "seller" ? "default" : "outline"}
                      className="h-12"
                      onClick={() => field.onChange("seller")}
                    >
                      Người bán
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "buyer" ? "default" : "outline"}
                      className="h-12"
                      onClick={() => field.onChange("buyer")}
                    >
                      Người mua
                    </Button>
                    {(roles?.isAdmin || roles?.isModerator) && (
                      <Button
                        type="button"
                        variant={field.value === "moderator" ? "default" : "outline"}
                        className={`h-12 ${field.value === "moderator" ? (roles?.isAdmin ? "bg-red-500 hover:bg-red-600" : "bg-pink-500 hover:bg-pink-600") : ""}`}
                        onClick={() => field.onChange("moderator")}
                      >
                        Giao dịch viên
                      </Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Show form fields only for seller role */}
            {watchRole === "seller" && (
              <>
                {/* Category */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Danh mục *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Bạn đang bán gì?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="product_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên sản phẩm *</FormLabel>
                      <FormControl>
                        <Input placeholder="VD: Acc Liên Quân VIP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="product_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mô tả chi tiết</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Thông tin chi tiết về sản phẩm..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Image Upload */}
                <div>
                  <FormLabel>Ảnh sản phẩm (tối đa 5)</FormLabel>
                  <div className="mt-2 grid grid-cols-5 gap-2">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded border overflow-hidden">
                        <img src={img} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {images.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="aspect-square rounded border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {uploading ? (
                          <span className="text-xs">...</span>
                        ) : (
                          <>
                            <ImageIcon className="w-5 h-5" />
                            <span className="text-xs">Thêm</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số tiền (VNĐ) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="100000"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fee_bearer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Người chịu phí *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="buyer">Người mua</SelectItem>
                          <SelectItem value="seller">Người bán</SelectItem>
                          <SelectItem value="split">Chia đôi</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Platform Settings Info */}
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                  <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-muted-foreground">
                    <p>Phí sàn: <span className="font-medium text-foreground">{feePercent}%</span></p>
                    <p>Thời gian khiếu nại: <span className="font-medium text-foreground">{disputeHours} giờ</span></p>
                  </div>
                </div>

                {/* Fee Preview */}
                <Card className="bg-muted/50 border-border">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Tính toán</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Phí sàn:</p>
                        <p className="font-semibold text-destructive">{formatCurrency(preview.fee)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Người bán nhận:</p>
                        <p className="font-semibold text-primary">{formatCurrency(preview.sellerReceives)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Moderator quick create message */}
            {watchRole === "moderator" && (
              <div className="flex items-start gap-2 p-4 bg-primary/10 rounded-lg text-sm border border-primary/20">
                <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Tạo phòng nhanh</p>
                  <p className="text-muted-foreground mt-1">
                    Bạn đang tạo phòng với tư cách Giao dịch viên. Phòng sẽ được tạo ngay lập tức và bạn sẽ nhận 100% phí sàn khi giao dịch hoàn tất.
                  </p>
                </div>
              </div>
            )}

            {/* Buyer create message */}
            {watchRole === "buyer" && (
              <div className="flex items-start gap-2 p-4 bg-blue-500/10 rounded-lg text-sm border border-blue-500/20">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Tạo phòng với vai trò Người mua</p>
                  <p className="text-muted-foreground mt-1">
                    Phòng sẽ được tạo và bạn cần chia sẻ ID + mật khẩu cho người bán. Người bán vào phòng và điền thông tin sản phẩm, sau đó bạn mới có thể đặt cọc.
                  </p>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className={`w-full ${watchRole === "moderator" ? (roles?.isAdmin ? "bg-red-500 hover:bg-red-600" : "bg-pink-500 hover:bg-pink-600") : "glow-primary"}`}
              size="lg"
              disabled={createTransaction.isPending || uploading}
            >
              {createTransaction.isPending ? "Đang tạo..." : (watchRole === "moderator" ? "Tạo phòng ngay" : "Tạo phòng giao dịch")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
