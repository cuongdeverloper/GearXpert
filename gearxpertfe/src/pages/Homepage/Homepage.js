import { useEffect, useState, useCallback } from "react";
import { getDevices } from "../../service/ApiService/DeviceApi";
import Header from "../../components/navigation/Header";
import HeroSection from "../../components/homepage/HeroSection";
import CategoryPills from "../../components/common/CategoryPills";
import ScrollAnimation from "../../components/common/ScrollAnimation";
import FeaturedProductsSection from "../../components/homepage/FeaturedProductsSection";
import AISuggestedSection from "../../components/homepage/AISuggestedSection";
import TrendingNowSection from "../../components/homepage/TrendingNowSection";
import NewArrivalsSection from "../../components/homepage/NewArrivalsSection";
import TopBannerAds from "../../components/homepage/TopBannerAds";
import PopupAds from "../../components/homepage/PopupAds";
import Footer from "../../components/homepage/Footer";

export default function Homepage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [trendingDevice, setTrendingDevice] = useState(null);
  const [newArrivals, setNewArrivals] = useState([]);

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        limit: 20,
        ...(selectedCategory && { category: selectedCategory }),
      };
      const response = await getDevices(params);
      const fetchedDevices = response.devices || [];

      setDevices(fetchedDevices);

      // Set trending device (first device)
      if (fetchedDevices.length > 0) {
        setTrendingDevice(fetchedDevices[0]);
      }

      if (fetchedDevices.length > 0) {
        setNewArrivals(fetchedDevices.slice(-3).reverse());
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
  };

  const categories = [
    { name: 'Cinematography', id: 'CAMERA', category: 'CAMERA' },
    { name: 'Lighting Kits', id: 'LIGHTING', category: 'LIGHTING' },
    { name: 'Audio Gear', id: 'AUDIO', category: 'AUDIO' },
    { name: 'Gimbal & Grip', id: 'ACCESSORY', category: 'ACCESSORY' },
    { name: 'Aerial / Drones', id: 'DRONE', category: 'DRONE' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light">
        <div className="text-xl font-semibold text-gray-600 animate-pulse">Loading gear...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-light">
      <Header />

      <main className="flex-grow w-full max-w-[1440px] mx-auto pb-12">
        <ScrollAnimation direction="down" duration={0.8}>
          <HeroSection />
        </ScrollAnimation>

        <section className="px-6 lg:px-10 mb-12">
          <ScrollAnimation direction="up" delay={0.2}>
            <CategoryPills
              categories={categories}
              activeCategory={selectedCategory}
              onSelect={handleCategorySelect}
            />
          </ScrollAnimation>
        </section>

        <ScrollAnimation direction="up" viewportAmount={0.2}>
          <FeaturedProductsSection devices={devices.slice(0, 6)} />
        </ScrollAnimation>

        <ScrollAnimation direction="up" delay={0.1} className="px-6 lg:px-10">
          <TopBannerAds />
        </ScrollAnimation>

        <ScrollAnimation effect="scale" viewportAmount={0.4}>
          <AISuggestedSection devices={devices.slice(6, 9)} />
        </ScrollAnimation>

        <section className="px-6 lg:px-10">
          <div className="flex flex-col lg:flex-row gap-10">
            <ScrollAnimation direction="left" className="w-full lg:w-5/12">
              <TrendingNowSection device={trendingDevice} />
            </ScrollAnimation>

            <ScrollAnimation direction="right" className="w-full lg:w-7/12" delay={0.2}>
              <NewArrivalsSection devices={newArrivals} />
            </ScrollAnimation>
          </div>
        </section>
      </main>

      <Footer />
      <PopupAds />
    </div>
  );
}