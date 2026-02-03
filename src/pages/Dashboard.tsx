import { useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import DashboardContent from "@/components/dashboard/DashboardContent";
import MarketplaceFeed from "@/components/marketplace/MarketplaceFeed";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, ShoppingBag } from "lucide-react";
import Footer from "@/components/Footer";
import { useUserRole } from "@/hooks/useProfile";
import { AIAssistantWidget } from "@/components/admin/AIAssistantWidget";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("sanh");
  const { data: roleInfo } = useUserRole();
  
  // Show AI for Admin or Moderator
  const canAccessAI = roleInfo?.isAdmin || roleInfo?.isModerator;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <AnnouncementBanner />

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="sanh" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Sảnh
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Khu mua bán
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sanh">
            <DashboardContent />
          </TabsContent>

          <TabsContent value="marketplace">
            <MarketplaceFeed />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
      
      {/* AI Assistant for Admin/Moderator */}
      {canAccessAI && <AIAssistantWidget />}
    </div>
  );
};

export default Dashboard;
