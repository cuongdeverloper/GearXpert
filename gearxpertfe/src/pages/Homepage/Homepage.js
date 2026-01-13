import { useEffect, useState } from "react";
import { getDevices } from "../../service/ApiService/DeviceApi";
import Header from "../../components/navigation/Header";
import HeroSection from "../../components/homepage/HeroSection";
import CategoryPills from "../../components/common/CategoryPills";
import AISuggestedSection from "../../components/homepage/AISuggestedSection";
import TrendingNowSection from "../../components/homepage/TrendingNowSection";
import NewArrivalsSection from "../../components/homepage/NewArrivalsSection";
import Footer from "../../components/homepage/Footer";

export default function Homepage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [trendingDevice, setTrendingDevice] = useState(null);
  const [newArrivals, setNewArrivals] = useState([]);

  useEffect(() => {
    fetchDevices();
  }, [selectedCategory]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 20,
        ...(selectedCategory && { category: selectedCategory }),
      };
      const response = await getDevices(params);
      const fetchedDevices = response.devices || [];
      setDevices(fetchedDevices);

      // Set trending device (first device or most popular)
      if (fetchedDevices.length > 0) {
        setTrendingDevice(fetchedDevices[0]);
      }

      // Set new arrivals (last 3 devices)
      if (fetchedDevices.length > 0) {
        setNewArrivals(fetchedDevices.slice(-3).reverse());
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen flex flex-col bg-background-light">
      <Header />

      <main className="flex-grow w-full max-w-[1440px] mx-auto pb-12">
        <HeroSection />

        <section className="px-6 lg:px-10 mb-12">
          <CategoryPills
            categories={categories}
            activeCategory={selectedCategory}
            onSelect={handleCategorySelect}
          />
        </section>

        <AISuggestedSection devices={devices.slice(0, 3)} />

        <section className="px-6 lg:px-10">
          <div className="flex flex-col lg:flex-row gap-10">
            <TrendingNowSection device={trendingDevice} />
            <NewArrivalsSection devices={newArrivals} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
