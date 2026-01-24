import { useState } from "react";
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
  FormDescription,
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
import { Calculator } from "lucide-react";

const formSchema = z.object({
  product_name: z.string().min(1, "Vui lòng nhập tên sản phẩm").max(200),
  product_description: z.string().max(1000).optional(),
  amount: z.number().min(10000, "Số tiền tối thiểu là 10,000 VNĐ"),
  platform_fee_percent: z.number().min(1).max(20),
  fee_bearer: z.enum(["buyer", "seller", "split"]),
  dispute_time_hours: z.number().min(1).max(168),
});

type FormValues = z.infer<typeof formSchema>;

export const CreateTransactionForm = () => {
  const navigate = useNavigate();
  const createTransaction = useCreateTransaction();
  const [previewFee, setPreviewFee] = useState({ fee: 0, sellerReceives: 0 });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_name: "",
      product_description: "",
      amount: 100000,
      platform_fee_percent: 5,
      fee_bearer: "buyer",
      dispute_time_hours: 24,
    },
  });

  const watchAmount = form.watch("amount");
  const watchFeePercent = form.watch("platform_fee_percent");
  const watchFeeBearer = form.watch("fee_bearer");

  // Calculate preview
  const calculatePreview = () => {
    const fee = (watchAmount || 0) * ((watchFeePercent || 0) / 100);
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

  const onSubmit = async (values: FormValues) => {
    const result = await createTransaction.mutateAsync({
      product_name: values.product_name,
      product_description: values.product_description,
      amount: values.amount,
      platform_fee_percent: values.platform_fee_percent,
      fee_bearer: values.fee_bearer as FeeBearer,
      dispute_time_hours: values.dispute_time_hours,
    });
    navigate(`/transaction/${result.id}`);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Tạo giao dịch mới</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="product_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên sản phẩm / dịch vụ *</FormLabel>
                  <FormControl>
                    <Input placeholder="VD: iPhone 15 Pro Max" {...field} />
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
                      placeholder="Mô tả sản phẩm, tình trạng, các điều khoản..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                name="platform_fee_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phí sàn (%) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        step={0.5}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>Từ 1% đến 20%</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fee_bearer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Người chịu phí *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn người chịu phí" />
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

              <FormField
                control={form.control}
                name="dispute_time_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thời gian khiếu nại (giờ) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={168}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>Tối đa 168 giờ (7 ngày)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Fee Preview */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="w-4 h-4 text-primary" />
                  <span className="font-medium">Tính toán phí</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Phí sàn:</p>
                    <p className="font-semibold text-destructive">{formatCurrency(preview.fee)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Người bán nhận:</p>
                    <p className="font-semibold text-primary">{formatCurrency(preview.sellerReceives)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={createTransaction.isPending}
            >
              {createTransaction.isPending ? "Đang tạo..." : "Tạo giao dịch"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
