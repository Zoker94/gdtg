import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import Footer from "@/components/Footer";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import ModeratorsList from "@/components/ModeratorsList";
import FallingPetals from "@/components/FallingPetals";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

const Index = () => {
  const { data: settings } = usePlatformSettings();
  const showPetals = settings?.tet_falling_petals_enabled ?? true;

  return (
    <div className="min-h-screen bg-background">
      {showPetals && <FallingPetals />}
      <Header />
      <AnnouncementBanner />
      <main>
        <HeroSection />
        <section className="py-6 px-4">
          <div className="container mx-auto max-w-5xl">
            <ModeratorsList variant="compact" maxItems={9} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
