import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import Footer from "@/components/Footer";
import AnnouncementBanner from "@/components/AnnouncementBanner";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AnnouncementBanner />
      <main>
        <HeroSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
