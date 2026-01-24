import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import Footer from "@/components/Footer";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import ModeratorsList from "@/components/ModeratorsList";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AnnouncementBanner />
      <main>
        <HeroSection />
        <section className="py-8 px-4">
          <div className="container mx-auto max-w-4xl">
            <ModeratorsList variant="compact" maxItems={3} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
