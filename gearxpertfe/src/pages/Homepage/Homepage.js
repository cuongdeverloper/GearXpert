import { useEffect, useState, useCallback } from "react";
import { getDevices, getDeviceDetail } from "../../service/ApiService/DeviceApi";
import { getDeviceReviews } from "../../service/ApiService/RentalApi";
import Header from "../../components/navigation/Header";
import CategoryPills from "../../components/common/CategoryPills";
import ScrollAnimation from "../../components/common/ScrollAnimation";
import FeaturedProductsSection from "../../components/homepage/FeaturedProductsSection";
import AISuggestedSection from "../../components/homepage/AISuggestedSection";
import TrendingNowSection from "../../components/homepage/TrendingNowSection";
import NewArrivalsSection from "../../components/homepage/NewArrivalsSection";
import TopBannerAds from "../../components/homepage/TopBannerAds";
import PopupAds from "../../components/homepage/PopupAds";
import Footer from "../../components/homepage/Footer";
import SmartGearPromoSection from "../../components/homepage/SmartGearPromoSection";
import TestimonialsSection from "../../components/homepage/TestimonialsSection";
import { useTranslation } from "react-i18next";
import WhyChooseUsSection from "../../components/homepage/WhyChooseUsSection";
import { RentalInstructionsSection, PaymentMethodsSection } from "../../components/homepage/InstructionSections";

export default function Homepage() {
  const { t } = useTranslation();
  const [devices, setDevices] = useState([]);
  const [suggestedDevices, setSuggestedDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendingDevice, setTrendingDevice] = useState(null);
  const [newArrivals, setNewArrivals] = useState([]);
  const [homeTestimonials, setHomeTestimonials] = useState([]);

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const baseParams = {
        limit: 20,
      };

      // Fetch popular devices for Trending/Featured
      const popularResponse = await getDevices({ ...baseParams, sort: 'popular' });
      const popularDevices = popularResponse.devices || [];

      // Fetch newest devices for New Arrivals
      const newestResponse = await getDevices({ ...baseParams, sort: 'newest', limit: 8 });
      const newestDevices = newestResponse.devices || [];

      setDevices(popularDevices);

      // Handle AI Suggested Section (Personalized)
      const viewedIds = JSON.parse(localStorage.getItem("viewedDevices") || "[]");
      const searches = JSON.parse(localStorage.getItem("searchQueries") || "[]");

      let finalSuggestions = [];

      if (viewedIds.length > 0) {
        // Fetch up to 3 most recently viewed
        try {
          const viewedDetails = await Promise.all(
            viewedIds.slice(0, 3).map(id => getDeviceDetail(id).catch(() => null))
          );
          finalSuggestions = viewedDetails.filter(d => d).map(d => ({ ...d, match: 95 }));
        } catch (err) {
          console.error("Viewed fetch error:", err);
        }
      }

      // If less than 3, fill with search matches
      if (finalSuggestions.length < 3 && searches.length > 0) {
        try {
          const searchRes = await getDevices({ search: searches[0], limit: 3 });
          const searchDevices = (searchRes.devices || [])
            .filter(d => !finalSuggestions.some(s => s._id === d._id))
            .map(d => ({ ...d, match: 88 }));
          
          finalSuggestions = [...finalSuggestions, ...searchDevices].slice(0, 3);
        } catch (err) {
          console.error("Search fetch error:", err);
        }
      }

      // Fallback to general popular devices
      if (finalSuggestions.length < 3) {
        const fallbacks = popularDevices.slice(6, 9)
          .filter(d => !finalSuggestions.some(s => s._id === d._id));
        finalSuggestions = [...finalSuggestions, ...fallbacks].slice(0, 3);
      }

      setSuggestedDevices(finalSuggestions);

      // Set trending device (first popular device)
      if (popularDevices.length > 0) {
        setTrendingDevice(popularDevices[0]);
      }

      // Set new arrivals from the newest batch
      if (newestDevices.length > 0) {
        setNewArrivals(newestDevices);
      }

      const collected = [];
      const seenIds = new Set();
      if (popularDevices.length > 0) {
        try {
          const reviewBatches = await Promise.all(
            popularDevices.slice(0, 8).map((d) =>
              getDeviceReviews(d._id).catch(() => ({ data: [] }))
            )
          );
          for (const batch of reviewBatches) {
            const list = batch.data || [];
            for (const rev of list) {
              if (!rev.comment?.trim()) continue;
              const rid = rev._id?.toString();
              if (!rid || seenIds.has(rid)) continue;
              seenIds.add(rid);
              collected.push({
                id: rid,
                name: rev.userName || "Khách hàng",
                avatar: rev.avatar || "",
                role: "Khách hàng",
                content: rev.comment,
              });
              if (collected.length >= 4) break;
            }
            if (collected.length >= 4) break;
          }
        } catch (err) {
          console.error("Home testimonials:", err);
        }
      }
      setHomeTestimonials(collected);
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleCategorySelect = (categoryId) => {
    // Chuyển hướng cứng sang trang products với category
    window.location.href = `/products?category=${categoryId}`;
  };

  const categories = [
    { name: t('categories.CAMERA'), id: 'CAMERA', category: 'CAMERA' },
    { name: t('categories.LIGHTING'), id: 'LIGHTING', category: 'LIGHTING' },
    { name: t('categories.AUDIO'), id: 'AUDIO', category: 'AUDIO' },
    { name: t('categories.OFFICE'), id: 'OFFICE', category: 'OFFICE' },
    { name: t('categories.GAMING'), id: 'GAMING', category: 'GAMING' },
    { name: t('categories.ACCESSORY'), id: 'ACCESSORY', category: 'ACCESSORY' },
    { name: t('categories.DRONE'), id: 'DRONE', category: 'DRONE' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light">
        <div className="text-xl font-semibold text-gray-600 animate-pulse">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-light">
      <Header />

      <main className="flex-grow w-full max-w-[1440px] mx-auto pt-32 pb-12" data-theme="light">
        <ScrollAnimation effect="fade" delay={0.05} className="w-full" data-theme="dark">
          <SmartGearPromoSection />
        </ScrollAnimation>

        <section className="px-6 lg:px-10 mb-12">
          <ScrollAnimation direction="up" delay={0.2}>
            <CategoryPills
              categories={categories}
              activeCategory={null}
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
          <AISuggestedSection devices={suggestedDevices} />
        </ScrollAnimation>

        <WhyChooseUsSection />

        <section className="px-6 lg:px-10 mt-16" data-theme="dark">
          <ScrollAnimation effect="fade" viewportAmount={0.3}>
            <TestimonialsSection testimonials={homeTestimonials} />
          </ScrollAnimation>
        </section>

        <RentalInstructionsSection />
        <PaymentMethodsSection />

        <section className="px-6 lg:px-10 mt-20">
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
