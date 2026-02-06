import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Shield, ArrowLeft, AlertTriangle, Ban, FileWarning, Scale, Phone } from "lucide-react";
 import { Gamepad2 } from "lucide-react";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import Footer from "@/components/Footer";

const TermsOfService = () => {
  const { data: platformSettings } = usePlatformSettings();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-base">GDTG</span>
          </Link>
        </div>
      </header>

      <AnnouncementBanner />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Link>
        </Button>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl flex items-center gap-3">
              <Scale className="w-6 h-6 text-primary" />
              Điều khoản sử dụng dịch vụ
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Cập nhật lần cuối: 01/02/2026
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-300px)] pr-4">
              <div className="space-y-8">
                {/* Introduction */}
                <section>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    1. Giới thiệu chung
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Chào mừng bạn đến với GDTG - nền tảng giao dịch trung gian an toàn. Bằng việc sử dụng 
                    dịch vụ của chúng tôi, bạn đồng ý tuân thủ các điều khoản và điều kiện được nêu trong 
                    tài liệu này. Vui lòng đọc kỹ trước khi thực hiện bất kỳ giao dịch nào.
                  </p>
                </section>

                <Separator />

                {/* Account Verification */}
                <section>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-primary" />
                    2. Xác minh tài khoản
                  </h2>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Người dùng phải hoàn thành xác minh danh tính (KYC) để thực hiện giao dịch rút tiền.</li>
                    <li>Xác thực số điện thoại qua Telegram là bắt buộc để bảo vệ tài khoản.</li>
                    <li>Mỗi tài khoản chỉ được liên kết tối đa 2 tài khoản ngân hàng để rút tiền.</li>
                    <li>Tên chủ tài khoản ngân hàng phải trùng khớp hoàn toàn với tên đã đăng ký KYC.</li>
                    <li>Thông tin cá nhân phải chính xác và trung thực. Việc khai báo sai có thể dẫn đến khóa tài khoản vĩnh viễn.</li>
                  </ul>
                </section>

                <Separator />

                {/* Balance Freeze Policy */}
                <section className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="w-5 h-5" />
                    3. Quyền đóng băng số dư
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Nền tảng GDTG có quyền đóng băng (tạm khóa) toàn bộ hoặc một phần số dư trong tài khoản 
                    của bạn trong các trường hợp sau:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li><strong>Phát hiện hoạt động bất thường:</strong> Giao dịch có dấu hiệu rửa tiền, 
                    gian lận hoặc vi phạm pháp luật.</li>
                    <li><strong>Giao dịch tổng cộng vượt quá 50 triệu VNĐ/ngày</strong> mà không có giải 
                    trình hợp lý.</li>
                    <li><strong>Hơn 5 giao dịch nạp/rút trong vòng 1 giờ:</strong> Hệ thống tự động gắn 
                    cờ cảnh báo và yêu cầu xác minh thêm.</li>
                    <li><strong>Rút tiền nhanh bất thường:</strong> Rút trên 80% số dư nạp trong vòng 2 giờ 
                    mà không thông qua giao dịch trung gian.</li>
                    <li><strong>Sử dụng nhiều tài khoản ngân hàng khác nhau</strong> để nạp tiền vào cùng 
                    một tài khoản.</li>
                    <li><strong>Nhận tiền từ nhiều nguồn khác nhau</strong> trong thời gian ngắn.</li>
                    <li><strong>Yêu cầu từ cơ quan chức năng:</strong> Khi có yêu cầu từ cơ quan pháp luật 
                    có thẩm quyền.</li>
                    <li><strong>Khiếu nại từ bên thứ ba:</strong> Khi có đơn khiếu nại về giao dịch liên quan 
                    đến tài khoản của bạn.</li>
                  </ul>
                  <p className="text-sm text-amber-600 mt-4 font-medium">
                    Khi số dư bị đóng băng, bạn sẽ được yêu cầu giải trình nguồn gốc tiền và cung cấp 
                    các bằng chứng liên quan. Thời gian xử lý có thể kéo dài từ 1-30 ngày tùy theo mức độ 
                    phức tạp.
                  </p>
                </section>

                <Separator />

                {/* Reporting Policy */}
                <section className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-red-600">
                    <FileWarning className="w-5 h-5" />
                    4. Quy định báo cáo giao dịch nghi vấn
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Nhằm tuân thủ quy định phòng chống rửa tiền và bảo vệ người dùng, GDTG áp dụng các 
                    biện pháp sau:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Tự động giám sát và phát hiện các giao dịch bất thường thông qua hệ thống AI.</li>
                    <li>Lưu trữ thông tin giao dịch trong ít nhất 5 năm theo quy định pháp luật.</li>
                    <li>Báo cáo các giao dịch nghi vấn cho cơ quan chức năng có thẩm quyền khi cần thiết.</li>
                    <li>Hợp tác hoàn toàn với cơ quan điều tra trong các vụ việc liên quan đến tội phạm tài chính.</li>
                  </ul>
                  <p className="text-sm text-red-600 mt-4 font-medium">
                    Việc sử dụng nền tảng cho mục đích rửa tiền, lừa đảo hoặc bất kỳ hoạt động phi pháp 
                    nào sẽ bị xử lý nghiêm khắc và báo cáo cho cơ quan chức năng.
                  </p>
                </section>

                <Separator />

                {/* Prohibited Activities */}
                <section>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Ban className="w-5 h-5 text-destructive" />
                    5. Hành vi bị cấm
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Các hành vi sau đây bị nghiêm cấm trên nền tảng GDTG:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Sử dụng tài khoản để rửa tiền hoặc chuyển tiền có nguồn gốc bất hợp pháp.</li>
                    <li>Tạo nhiều tài khoản để lách các biện pháp bảo mật.</li>
                    <li>Cung cấp thông tin KYC giả mạo hoặc sử dụng giấy tờ của người khác.</li>
                    <li>Thực hiện giao dịch ảo để tăng điểm uy tín.</li>
                    <li>Lợi dụng lỗ hổng hệ thống để trục lợi cá nhân.</li>
                    <li>Quấy rối, đe dọa hoặc lừa đảo người dùng khác.</li>
                    <li>Mua bán hàng hóa cấm hoặc vi phạm pháp luật.</li>
                  </ul>
                </section>

                <Separator />

                 {/* Illegal Game Items Disclaimer */}
                 <section className="bg-destructive/5 border border-destructive/30 rounded-lg p-4">
                   <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-destructive">
                     <Gamepad2 className="w-5 h-5" />
                     6. Miễn trừ trách nhiệm đối với giao dịch tài khoản/vật phẩm game lậu
                   </h2>
                   <p className="text-muted-foreground leading-relaxed mb-4">
                     GDTG là nền tảng trung gian thanh toán và <strong>KHÔNG có khả năng xác minh</strong> nguồn gốc, 
                     tính hợp pháp hay quyền sở hữu của các tài khoản game, vật phẩm ảo, hoặc bất kỳ nội dung số 
                     nào được giao dịch thông qua nền tảng. Do đó, chúng tôi tuyên bố miễn trừ hoàn toàn trách 
                     nhiệm trong các trường hợp sau:
                   </p>
                   
                   <div className="space-y-4">
                     <div className="bg-background/50 rounded p-3 border border-border">
                       <h3 className="font-medium text-destructive mb-2">6.1. Game lậu (Private Server)</h3>
                       <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
                         <li>Tài khoản hoặc vật phẩm từ các máy chủ game không chính thức (private server, server lậu).</li>
                         <li>Game được crack, mod hoặc vận hành không có giấy phép từ nhà phát hành gốc.</li>
                         <li>Các vật phẩm được tạo ra bằng cách khai thác lỗ hổng, hack hoặc cheat engine.</li>
                         <li>Tiền ảo, kim cương, hoặc tài nguyên game có nguồn gốc từ các nguồn không chính thống.</li>
                       </ul>
                     </div>
                     
                     <div className="bg-background/50 rounded p-3 border border-border">
                       <h3 className="font-medium text-destructive mb-2">6.2. Vi phạm điều khoản nhà phát hành</h3>
                       <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
                         <li>Mua bán tài khoản game vi phạm Terms of Service của nhà phát hành (VD: Riot Games, Garena, VNG...).</li>
                         <li>Tài khoản bị khóa, bị ban hoặc bị thu hồi sau giao dịch do vi phạm quy định game.</li>
                         <li>Vật phẩm bị xóa, thu hồi bởi hệ thống anti-cheat hoặc ban wave của nhà phát hành.</li>
                         <li>Mất quyền truy cập do nhà phát hành phát hiện hoạt động mua bán tài khoản.</li>
                       </ul>
                     </div>
                     
                     <div className="bg-background/50 rounded p-3 border border-border">
                       <h3 className="font-medium text-destructive mb-2">6.3. Rủi ro người dùng phải chấp nhận</h3>
                       <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
                         <li><strong>Tài khoản bị khôi phục (recovery):</strong> Người bán giành lại quyền sở hữu sau giao dịch.</li>
                         <li><strong>Mật khẩu bị thay đổi:</strong> Email hoặc số điện thoại gốc vẫn còn liên kết với tài khoản.</li>
                         <li><strong>Server đóng cửa:</strong> Game lậu có thể ngừng hoạt động bất cứ lúc nào mà không thông báo.</li>
                         <li><strong>Scam nội bộ game:</strong> Các hình thức lừa đảo xảy ra bên trong game sau khi giao dịch hoàn tất.</li>
                         <li><strong>Vật phẩm không như mô tả:</strong> Thông số, giá trị thực tế khác với quảng cáo.</li>
                       </ul>
                     </div>
                   </div>
                   
                   <div className="mt-4 p-3 bg-destructive/10 rounded border border-destructive/30">
                     <p className="text-sm font-medium text-destructive mb-2">
                       ⚠️ CẢNH BÁO QUAN TRỌNG:
                     </p>
                     <ul className="list-disc list-inside space-y-1.5 text-sm text-destructive/90">
                       <li>GDTG <strong>KHÔNG</strong> chịu trách nhiệm cho bất kỳ thiệt hại nào phát sinh từ việc 
                       giao dịch tài khoản/vật phẩm game lậu hoặc vi phạm điều khoản nhà phát hành.</li>
                       <li>Người dùng tự chịu <strong>TOÀN BỘ RỦI RO</strong> khi quyết định thực hiện các giao dịch này.</li>
                       <li>Chúng tôi <strong>KHÔNG</strong> hoàn tiền cho các trường hợp tài khoản bị khóa, thu hồi 
                       hoặc mất quyền truy cập sau giao dịch do nguyên nhân từ phía nhà phát hành game.</li>
                       <li>Việc mua bán tài khoản game có thể <strong>VI PHẠM PHÁP LUẬT</strong> tại một số quốc gia. 
                       Người dùng có trách nhiệm tìm hiểu và tuân thủ quy định pháp luật địa phương.</li>
                     </ul>
                   </div>
                   
                   <p className="text-xs text-muted-foreground mt-4 italic">
                     Bằng việc sử dụng GDTG để giao dịch tài khoản hoặc vật phẩm game, bạn xác nhận đã đọc, hiểu 
                     và chấp nhận hoàn toàn các rủi ro nêu trên. GDTG chỉ đóng vai trò trung gian thanh toán và 
                     không tham gia vào quá trình xác minh, bảo đảm hay bảo hành cho các giao dịch liên quan đến 
                     game lậu hoặc vi phạm điều khoản nhà phát hành.
                   </p>
                 </section>

                 <Separator />

                 {/* Penalties - renumber to 7 */}
                <section>
                   <h2 className="text-lg font-semibold mb-3">7. Hình thức xử lý vi phạm</h2>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li><strong>Cảnh cáo:</strong> Áp dụng cho vi phạm lần đầu ở mức độ nhẹ.</li>
                    <li><strong>Tạm khóa tài khoản:</strong> Từ 7-30 ngày tùy mức độ vi phạm.</li>
                    <li><strong>Khóa tài khoản vĩnh viễn:</strong> Áp dụng cho vi phạm nghiêm trọng hoặc 
                    tái phạm nhiều lần.</li>
                    <li><strong>Đóng băng số dư:</strong> Giữ lại toàn bộ số dư để xử lý theo quy định.</li>
                    <li><strong>Báo cáo cơ quan chức năng:</strong> Chuyển hồ sơ cho cơ quan có thẩm quyền 
                    để xử lý theo pháp luật.</li>
                  </ul>
                </section>

                <Separator />

                 {/* Dispute Resolution - renumber to 8 */}
                <section>
                   <h2 className="text-lg font-semibold mb-3">8. Giải quyết tranh chấp</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Trong trường hợp có tranh chấp giữa các bên, GDTG sẽ:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Đóng vai trò trung gian hòa giải giữa người mua và người bán.</li>
                    <li>Xem xét bằng chứng từ cả hai bên trước khi đưa ra quyết định.</li>
                    <li>Quyết định của GDTG trong các vụ tranh chấp là quyết định cuối cùng.</li>
                    <li>Thời gian xử lý tranh chấp thông thường là 3-7 ngày làm việc.</li>
                  </ul>
                </section>

                <Separator />

                 {/* Liability Limitation - renumber to 9 */}
                <section>
                   <h2 className="text-lg font-semibold mb-3">9. Giới hạn trách nhiệm</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    GDTG không chịu trách nhiệm về:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-4">
                    <li>Chất lượng hàng hóa/dịch vụ do các bên tự thỏa thuận.</li>
                    <li>Thiệt hại do người dùng cung cấp thông tin không chính xác.</li>
                    <li>Mất mát do lỗi từ ngân hàng hoặc nhà cung cấp thanh toán.</li>
                    <li>Gián đoạn dịch vụ do bảo trì hoặc sự cố kỹ thuật bất khả kháng.</li>
                  </ul>
                </section>

                <Separator />

                 {/* Contact - renumber to 10 */}
                <section className="bg-muted/50 rounded-lg p-4">
                   <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                     <Phone className="w-5 h-5 text-primary" />
                     10. Liên hệ hỗ trợ
                   </h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Nếu bạn có thắc mắc về điều khoản sử dụng hoặc cần hỗ trợ, vui lòng liên hệ với đội ngũ quản trị viên:
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild variant={platformSettings?.admin_contact_link ? "default" : "secondary"} disabled={!platformSettings?.admin_contact_link}>
                      {platformSettings?.admin_contact_link ? (
                        <a href={platformSettings.admin_contact_link} target="_blank" rel="noopener noreferrer">
                          Liên hệ Admin
                        </a>
                      ) : (
                        <span>Liên hệ Admin (chưa cấu hình)</span>
                      )}
                    </Button>
                    {(platformSettings as any)?.zalo_group_link && (
                      <Button asChild variant="outline">
                        <a href={(platformSettings as any).zalo_group_link} target="_blank" rel="noopener noreferrer">
                          Nhóm Zalo hỗ trợ
                        </a>
                      </Button>
                    )}
                  </div>
                </section>

                {/* Agreement */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
                  <p className="text-sm font-medium">
                    Bằng việc tiếp tục sử dụng dịch vụ, bạn xác nhận đã đọc, hiểu và đồng ý với tất cả 
                    các điều khoản được nêu trên.
                  </p>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;
