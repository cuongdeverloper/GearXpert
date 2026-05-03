import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getDevices, getDeviceDetail } from "../../service/ApiService/DeviceApi";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import ProductCard from "../../components/common/ProductCard";
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';

// Headless UI cho modal & dropdown
import { Dialog, Transition, Popover } from "@headlessui/react";
import { Fragment } from "react";

export default function ProductsPage() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get("category");

  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [priceRange, setPriceRange] = useState([0, 10000000]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  // New filter states
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(true);
  const [rentalStartDate, setRentalStartDate] = useState("");
  const [rentalEndDate, setRentalEndDate] = useState("");

  // Compare states
  const [selectedForCompare, setSelectedForCompare] = useState([]); // max 2 _id
  const [compareData, setCompareData] = useState({ device1: null, device2: null });
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [compareSearchQuery, setCompareSearchQuery] = useState("");
  const [compareError, setCompareError] = useState("");

  const notifyChatbotSearch = useCallback((query) => {
    const q = String(query || "").trim();
    if (!q) return;
    window.dispatchEvent(
      new CustomEvent("gearxpert:product-search", { detail: { query: q } })
    );
  }, []);

  const triggerAIFromCurrentFilters = useCallback(() => {
    const q = String(searchQuery || "").trim();
    if (q) {
      notifyChatbotSearch(q);
      return;
    }

    // If user only filters by category, still allow AI to suggest within that category.
    const categoryHintMap = {
      CAMERA: "camera",
      LIGHTING: "lighting",
      AUDIO: "audio",
      OFFICE: "office",
      GAMING: "gaming",
      ACCESSORY: "gimbal",
      DRONE: "drone",
      OTHER: "gear",
    };

    if (selectedCategory && categoryHintMap[selectedCategory]) {
      notifyChatbotSearch(categoryHintMap[selectedCategory]);
    }
  }, [notifyChatbotSearch, searchQuery, selectedCategory]);

  const categories = [
    { name: t("products.all_devices"), id: null, icon: "grid_view" },
    { name: t("categories.CAMERA"), id: "CAMERA", icon: "videocam" },
    { name: t("categories.LIGHTING"), id: "LIGHTING", icon: "lightbulb" },
    { name: t("categories.AUDIO"), id: "AUDIO", icon: "mic" },
    { name: t("categories.OFFICE"), id: "OFFICE", icon: "business_center" },
    { name: t("categories.GAMING"), id: "GAMING", icon: "sports_esports" },
    { name: t("categories.ACCESSORY"), id: "ACCESSORY", icon: "handyman" },
    { name: t("categories.DRONE"), id: "DRONE", icon: "flight" },
    { name: t("categories.OTHER"), id: "OTHER", icon: "category" },
  ];

  const sortOptions = [
    { id: "featured", label: t("products.sort.featured"), icon: "auto_awesome" },
    { id: "newest", label: t("products.sort.newest"), icon: "new_releases" },
    { id: "price_asc", label: t("products.sort.price_asc"), icon: "trending_up" },
    { id: "price_desc", label: t("products.sort.price_desc"), icon: "trending_down" },
    { id: "rating_desc", label: t("products.sort.rating_desc"), icon: "star" },
  ];

  const ratingOptions = [
    { value: 0, label: t("products.all_ratings") },
    { value: 5, label: `5 ${t("products.stars")}` },
    { value: 4, label: `4 ${t("products.stars")} ${t("products.and_up")}` },
    { value: 3, label: `3 ${t("products.stars")} ${t("products.and_up")}` },
    { value: 2, label: `2 ${t("products.stars")} ${t("products.and_up")}` },
    { value: 1, label: `1 ${t("products.stars")} ${t("products.and_up")}` },
  ];

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        limit: 100,
        ...(selectedCategory && { category: selectedCategory }),
        ...(minRating > 0 && { minRating }),
        ...(inStockOnly && { inStock: true }),
        ...(rentalStartDate && { rentalStartDate }),
        ...(rentalEndDate && { rentalEndDate }),
        ...(sortBy === "rating_desc" ? { sort: "ratingDesc" } : {}),
      };
      const response = await getDevices(params);
      setDevices(response.devices || []);
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, minRating, inStockOnly, rentalStartDate, rentalEndDate, sortBy]);

  const applyFiltersAndSort = useCallback(() => {
    let result = [...devices];

    if (searchQuery) {
      result = result.filter(
        (device) =>
          device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          device.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Price Filter
    result = result.filter(
      (device) =>
        (device.rentPrice?.perDay || 0) >= priceRange[0] &&
        (device.rentPrice?.perDay || 0) <= priceRange[1]
    );

    // Stock Filter (local backup for API filter)
    if (inStockOnly) {
      result = result.filter(
        (device) => (device?.availableQuantity ?? 0) > 0
      );
    }

    switch (sortBy) {
      case "price_asc":
        result.sort((a, b) => (a.rentPrice?.perDay || 0) - (b.rentPrice?.perDay || 0));
        break;
      case "price_desc":
        result.sort((a, b) => (b.rentPrice?.perDay || 0) - (a.rentPrice?.perDay || 0));
        break;
      case "newest":
        result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      default:
        break;
    }

    setFilteredDevices(result);
  }, [devices, searchQuery, sortBy, priceRange, inStockOnly]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Debounced fetch for date filters
  useEffect(() => {
    if (rentalStartDate && rentalEndDate) {
      const timer = setTimeout(() => {
        fetchDevices();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [rentalStartDate, rentalEndDate, fetchDevices]);

  useEffect(() => {
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    }
  }, [categoryFromUrl]);

  useEffect(() => {
    applyFiltersAndSort();

    // Track search queries for AI suggestions
    if (searchQuery.trim().length > 2) {
      const timer = setTimeout(() => {
        const searches = JSON.parse(localStorage.getItem("searchQueries") || "[]");
        const updated = [searchQuery.trim(), ...searches.filter(s => s !== searchQuery.trim())].slice(0, 5);
        localStorage.setItem("searchQueries", JSON.stringify(updated));
      }, 1500); // 1.5s delay to avoid tracking every keystroke
      return () => clearTimeout(timer);
    }
  }, [applyFiltersAndSort, searchQuery, priceRange]);

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedCategory,
    searchQuery,
    sortBy,
    priceRange,
    minRating,
    inStockOnly,
    rentalStartDate,
    rentalEndDate,
  ]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Logic for pagination
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentDevices = filteredDevices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDevices.length / ITEMS_PER_PAGE);

  const getPageNumbers = () => {
    const pages = [];
    const siblingCount = 1; // Number of pages to show on each side of current page

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
      const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

      const showLeftDots = leftSiblingIndex > 2;
      const showRightDots = rightSiblingIndex < totalPages - 1;

      if (!showLeftDots && showRightDots) {
        let leftItemCount = 3 + 2 * siblingCount;
        for (let i = 1; i <= leftItemCount; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (showLeftDots && !showRightDots) {
        let rightItemCount = 3 + 2 * siblingCount;
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - rightItemCount + 1; i <= totalPages; i++) pages.push(i);
      } else if (showLeftDots && showRightDots) {
        pages.push(1);
        pages.push("...");
        for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  // Compare logic
  const handleToggleCompare = (device) => {
    setCompareError("");

    if (selectedForCompare.includes(device._id)) {
      setSelectedForCompare((prev) => prev.filter((id) => id !== device._id));
    } else {
      if (selectedForCompare.length >= 2) {
        setCompareError(t("products.error_max_compare"));
        return;
      }

      if (selectedForCompare.length === 1) {
        const firstId = selectedForCompare[0];
        const firstDevice = devices.find((d) => d._id === firstId);
        if (firstDevice && firstDevice.category !== device.category) {
          setCompareError(t("products.error_same_category"));
          return;
        }
      }

      setSelectedForCompare((prev) => [...prev, device._id]);
    }
  };

  const fetchCompareData = async () => {
    if (selectedForCompare.length !== 2) return;

    setLoadingCompare(true);
    setCompareError("");

    try {
      const [dev1, dev2] = await Promise.all([
        getDeviceDetail(selectedForCompare[0]),
        getDeviceDetail(selectedForCompare[1]),
      ]);

      setCompareData({ device1: dev1, device2: dev2 });
      setIsCompareModalOpen(true);
    } catch (err) {
      console.error("Compare fetch error:", err);
      setCompareError(t("products.error_load_compare"));
    } finally {
      setLoadingCompare(false);
    }
  };

  // Filtered candidates for second device
  const getCompareCandidates = () => {
    if (selectedForCompare.length === 0) return [];

    const firstId = selectedForCompare[0];
    const first = devices.find((d) => d._id === firstId);
    if (!first) return [];

    let candidates = devices.filter(
      (d) => d.category === first.category && d._id !== first._id
    );

    if (compareSearchQuery.trim()) {
      const q = compareSearchQuery.toLowerCase();
      candidates = candidates.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.description || "").toLowerCase().includes(q)
      );
    }

    return candidates;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" data-theme="light">
      <Header />

      <main className="flex-grow w-full pb-12">
        {/* Premium Hero Section - giữ nguyên */}
        <section className="relative w-full bg-slate-900 overflow-hidden mb-6 pt-32 pb-16 lg:pt-40 lg:pb-24" data-theme="dark">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=2070')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/80 to-slate-50"></div>

          <div className="relative z-10 max-w-[1200px] mx-auto px-4 lg:px-8 text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 font-display tracking-tight">
              {t("products.title")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-indigo-400">{t("products.subtitle")}</span>
            </h1>
            <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto font-light mb-6">
              {t("products.hero_desc")}
            </p>

            <div className="max-w-xl mx-auto relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-accent-cyan to-indigo-500 rounded-xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-1.5 flex items-center shadow-xl">
                <span className="material-symbols-outlined text-white/50 ml-2 mr-2 text-xl">search</span>
                <input
                  type="text"
                  placeholder={t("products.search_placeholder")}
                  className="flex-1 bg-transparent border-none text-white placeholder-white/50 focus:ring-0 text-base h-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      triggerAIFromCurrentFilters();
                    }
                  }}
                />
                <button
                  onClick={triggerAIFromCurrentFilters}
                  className="px-4 py-2 bg-white text-slate-900 font-bold rounded-lg hover:bg-indigo-50 transition-colors text-sm"
                >
                  {t("products.search_btn")}
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-[1200px] mx-auto px-4 lg:px-8 -mt-12 relative z-20">
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Sidebar - giữ nguyên */}
            <aside className="w-full lg:w-64 flex-shrink-0">
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-white/60 sticky top-20">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">{t("products.filter_category")}</h3>
                
                <Popover as="div" className="relative">
                  <Popover.Button className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-900 shadow-lg shadow-slate-200/50 text-white transition-all hover:bg-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-accent-cyan text-lg">
                        {categories.find(c => c.id === selectedCategory)?.icon || "grid_view"}
                      </span>
                      <span className="font-bold tracking-tight">
                        {categories.find(c => c.id === selectedCategory)?.name || t("products.all_devices")}
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">unfold_more</span>
                  </Popover.Button>

                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Popover.Panel className="absolute left-0 right-0 mt-3 p-2 origin-top rounded-2xl bg-white border border-slate-100 shadow-2xl focus:outline-none z-50 max-h-[70vh] overflow-y-auto">
                        {({ close }) => (
                          <div className="space-y-1">
                            {categories.map((cat) => (
                              <div key={cat.name}>
                                <button
                                  onClick={() => {
                                    setSelectedCategory(cat.id);
                                    close();
                                  }}
                                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                                    selectedCategory === cat.id
                                      ? "bg-slate-100 text-slate-900 font-bold"
                                      : "hover:bg-slate-50 text-slate-600 hover:text-indigo-600"
                                  }`}
                                >
                                  <span className={`material-symbols-outlined text-[20px] ${
                                    selectedCategory === cat.id ? "text-accent-cyan" : "text-slate-400"
                                  }`}>
                                    {cat.icon}
                                  </span>
                                  <span className="text-sm">{cat.name}</span>
                                  {selectedCategory === cat.id && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-cyan"></div>
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                    </Popover.Panel>
                  </Transition>
                </Popover>

                <div className="mt-6 border-t border-slate-100 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t("products.price_range")}</h3>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{t("products.price_unit")}</span>
                  </div>
                  
                  <div className="px-2">
                    <div className="relative h-2 w-full bg-slate-100 rounded-full mb-8">
                      {/* Track highlight */}
                      <div 
                        className="absolute h-full bg-indigo-500 rounded-full transition-all duration-75"
                        style={{
                          left: `${(priceRange[0] / 10000000) * 100}%`,
                          right: `${100 - (priceRange[1] / 10000000) * 100}%`
                        }}
                      />
                      
                      <input
                        type="range"
                        min="0"
                        max="10000000"
                        step="100000"
                        value={priceRange[0]}
                        onChange={(e) => {
                          const val = Math.min(Number(e.target.value), priceRange[1] - 500000);
                          setPriceRange([val, priceRange[1]]);
                        }}
                        className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none cursor-pointer z-30 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-600 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
                      />
                      <input
                        type="range"
                        min="0"
                        max="10000000"
                        step="100000"
                        value={priceRange[1]}
                        onChange={(e) => {
                          const val = Math.max(Number(e.target.value), priceRange[0] + 500000);
                          setPriceRange([priceRange[0], val]);
                        }}
                        className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none cursor-pointer z-30 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-600 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
                      />
                    </div>
                    
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{t("products.min_price")}</p>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700">
                          {priceRange[0].toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}đ
                        </div>
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{t("products.max_price")}</p>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700">
                          {priceRange[1].toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}đ
                        </div>
                      </div>
                    </div>
                  </div>
                </div>


                <div className="mt-6 p-4 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl text-white relative overflow-hidden" data-theme="dark">
                  <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
                  <h4 className="font-bold font-display text-sm mb-1 relative z-10">{t("products.combo_title")}</h4>
                  <p className="text-[10px] text-indigo-100 mb-3 relative z-10 leading-relaxed">{t("products.combo_desc")}</p>
                  <button className="px-3 py-1.5 bg-white text-indigo-700 text-[11px] font-bold rounded-md hover:bg-indigo-50 transition-colors w-full shadow-md relative z-10">
                    {t("products.view_combo")}
                  </button>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1">
              {/* Filters Bar */}
              <div className="bg-white rounded-2xl p-4 mb-4 border border-slate-200/60 shadow-lg shadow-slate-200/50">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {/* Sort - Custom Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-indigo-500 text-[16px]">sort</span>
                    <Popover className="relative">
                      <Popover.Button className="flex items-center gap-2 px-3 py-2 pr-2 bg-gradient-to-r from-white to-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-700 font-medium cursor-pointer hover:border-indigo-200 hover:from-indigo-50 hover:to-white hover:text-indigo-700 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 shadow-sm">
                        {sortOptions.find(o => o.id === sortBy)?.label}
                        <span className="material-symbols-outlined text-[14px] text-slate-400">expand_more</span>
                      </Popover.Button>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Popover.Panel className="absolute z-50 mt-1 w-44 bg-white rounded-xl shadow-xl border border-indigo-100 overflow-hidden">
                          <div className="py-1">
                            {sortOptions.map((option) => (
                              <button
                                key={option.id}
                                onClick={() => setSortBy(option.id)}
                                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                                  sortBy === option.id
                                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[14px] text-slate-400">{option.icon}</span>
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </Popover.Panel>
                      </Transition>
                    </Popover>
                  </div>

                  {/* Rating Filter - Custom Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-indigo-500 text-[16px]">star</span>
                    <Popover className="relative">
                      <Popover.Button className="flex items-center gap-2 px-3 py-2 pr-2 bg-gradient-to-r from-white to-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-700 font-medium cursor-pointer hover:border-indigo-200 hover:from-indigo-50 hover:to-white hover:text-indigo-700 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 shadow-sm">
                        {ratingOptions.find(o => o.value === minRating)?.label}
                        <span className="material-symbols-outlined text-[14px] text-slate-400">expand_more</span>
                      </Popover.Button>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Popover.Panel className="absolute z-50 mt-1 w-40 bg-white rounded-xl shadow-xl border border-amber-100 overflow-hidden">
                          <div className="py-1">
                            {ratingOptions.map((option) => (
                              <button
                                key={option.value}
                                onClick={() => setMinRating(option.value)}
                                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                                  minRating === option.value
                                    ? 'bg-amber-50 text-amber-700 font-medium'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {option.value > 0 ? (
                                  <div className="flex items-center gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                      <span
                                        key={i}
                                        className={`material-symbols-outlined text-[12px] ${
                                          i < option.value ? 'text-amber-400' : 'text-slate-200'
                                        }`}
                                      >
                                        star
                                      </span>
                                    ))}
                                    <span className="ml-1 text-slate-500">{t("products.and_up")}</span>
                                  </div>
                                ) : (
                                  <span>{t("products.all_ratings")}</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </Popover.Panel>
                      </Transition>
                    </Popover>
                  </div>

                  {/* In Stock */}
                  <label className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-white to-slate-50 border border-slate-200/60 rounded-xl cursor-pointer hover:border-indigo-200 hover:from-indigo-50 hover:to-white hover:text-indigo-700 hover:shadow-md transition-all duration-200 group shadow-sm">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-indigo-500">inventory_2</span>
                      {t("products.in_stock")}
                    </span>
                  </label>

                  {/* Rental Period - Styled Date Inputs */}
                  <div className="flex items-center gap-2 ml-auto bg-gradient-to-r from-white to-slate-50 border border-slate-200/60 px-3 py-2 rounded-xl shadow-sm">
                    <span className="material-symbols-outlined text-indigo-500 text-[16px]">calendar_month</span>
                    <div className="flex items-center gap-2">
                      {/* Start Date Button */}
                      <Popover className="relative">
                        <Popover.Button className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200/60 rounded-xl text-xs text-slate-700 font-medium cursor-pointer hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-[100px] justify-between shadow-sm">
                          {rentalStartDate ? new Date(rentalStartDate).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit' }) : t("products.rent")}
                          <span className="material-symbols-outlined text-[12px] text-slate-400">calendar_today</span>
                        </Popover.Button>
                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-100"
                          enterFrom="transform opacity-0 scale-95"
                          enterTo="transform opacity-100 scale-100"
                          leave="transition ease-in duration-75"
                          leaveFrom="transform opacity-100 scale-100"
                          leaveTo="transform opacity-0 scale-95"
                        >
                          <Popover.Panel className="absolute z-50 mt-1 p-3 bg-white rounded-xl shadow-xl border border-emerald-100">
                            <input
                              type="date"
                              value={rentalStartDate}
                              onChange={(e) => setRentalStartDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                              className="px-2 py-1 border border-emerald-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </Popover.Panel>
                        </Transition>
                      </Popover>
                      
                      <span className="material-symbols-outlined text-slate-400 text-[16px]">arrow_forward</span>
                      
                      {/* End Date Button */}
                      <Popover className="relative">
                        <Popover.Button className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200/60 rounded-xl text-xs text-slate-700 font-medium cursor-pointer hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-[100px] justify-between shadow-sm">
                          {rentalEndDate ? new Date(rentalEndDate).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit' }) : t("products.return")}
                          <span className="material-symbols-outlined text-[12px] text-slate-400">event</span>
                        </Popover.Button>
                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-100"
                          enterFrom="transform opacity-0 scale-95"
                          enterTo="transform opacity-100 scale-100"
                          leave="transition ease-in duration-75"
                          leaveFrom="transform opacity-100 scale-100"
                          leaveTo="transform opacity-0 scale-95"
                        >
                          <Popover.Panel className="absolute z-50 mt-1 p-3 bg-white rounded-xl shadow-xl border border-emerald-100 right-0">
                            <input
                              type="date"
                              value={rentalEndDate}
                              onChange={(e) => setRentalEndDate(e.target.value)}
                              min={rentalStartDate || new Date().toISOString().split('T')[0]}
                              className="px-2 py-1 border border-emerald-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </Popover.Panel>
                        </Transition>
                      </Popover>
                    </div>
                    {rentalStartDate && rentalEndDate && (
                      <button
                        onClick={() => {
                          setRentalStartDate("");
                          setRentalEndDate("");
                        }}
                        className="ml-1 p-1 text-emerald-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                        title={t("products.clear_date")}
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls Bar */}
              <div className="bg-white/50 backdrop-blur-md rounded-xl p-3 mb-5 flex flex-wrap items-center justify-between gap-3 border border-white/60 shadow-sm">
                <h2 className="text-sm font-bold text-slate-700">
                  {t("products.showing")} <span className="text-slate-900">{filteredDevices.length}</span> {t("products.results")}
                </h2>

                <div className="flex items-center gap-3">
                  {selectedForCompare.length > 0 && (
                    <div className="flex gap-1.5">
                      {selectedForCompare.map((id) => {
                        const dev = devices.find((d) => d._id === id);
                        return dev ? (
                          <div
                            key={id}
                            className="bg-indigo-100 px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1.5 shadow-sm border border-indigo-200"
                          >
                            <span className="font-semibold text-indigo-700 truncate max-w-[100px]">{dev.name}</span>
                            <button
                              onClick={() => handleToggleCompare(dev)}
                              className="text-red-500 hover:text-red-700 font-bold leading-none"
                            >
                              ×
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}

                  <div className="flex flex-col items-end">
                    <button
                      onClick={fetchCompareData}
                      disabled={selectedForCompare.length !== 2 || loadingCompare}
                      className={`px-4 py-2 rounded-lg font-bold text-white transition-all transform active:scale-95 shadow-sm text-xs ${
                        selectedForCompare.length === 2 && !loadingCompare
                          ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
                          : "bg-slate-300 cursor-not-allowed"
                      }`}
                    >
                      {loadingCompare ? t("products.comparing") : t("products.compare")}
                    </button>
                    {compareError && <p className="text-red-600 text-[9px] mt-0.5 font-bold">{compareError}</p>}
                  </div>
                </div>
              </div>

              {/* Search + Grid candidates khi chọn 1 thiết bị */}
              {selectedForCompare.length === 1 && (
                <div className="mb-8">
                  <input
                    type="text"
                    value={compareSearchQuery}
                    onChange={(e) => setCompareSearchQuery(e.target.value)}
                    placeholder={t("products.compare_placeholder")}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm mb-4"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {getCompareCandidates().length > 0 ? (
                      getCompareCandidates().map((candidate) => (
                        <div
                          key={candidate._id}
                          className="relative cursor-pointer group"
                          onClick={() => handleToggleCompare(candidate)}
                        >
                          <ProductCard
                            device={candidate}
                            variant="detailed"
                            className="h-full scale-95 hover:scale-100 transition-transform"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl">
                            <span className="text-white font-bold text-lg bg-indigo-600 px-6 py-3 rounded-xl shadow-lg">
                              {t("products.select_to_compare")}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 col-span-full text-center py-8">
                        {t("products.no_compare_candidates")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-[420px] bg-white rounded-3xl animate-pulse ring-1 ring-slate-100 shadow-sm"></div>
                  ))}
                </div>
              ) : currentDevices.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {currentDevices.map((device) => (
                      <ProductCard
                        key={device._id || device.id}
                        device={device}
                        variant="detailed"
                        className="hover:-translate-y-2 transition-transform duration-500 h-full"
                        isSelectedForCompare={selectedForCompare.includes(device._id)}
                        onToggleCompare={() => handleToggleCompare(device)}
                      />
                    ))}
                  </div>

                  {/* Pagination Section */}
                  <div className="mt-12 flex flex-col items-center gap-4 py-8 select-none">
                    {/* Premium Page Indicator */}
                    <div className="px-4 py-1 bg-slate-50 rounded-full border border-slate-100 shadow-sm flex items-center gap-2 group hover:bg-white transition-colors duration-300">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trang</span>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md min-w-[24px] text-center">{currentPage}</span>
                      <span className="text-slate-300">/</span>
                      <span className="text-xs font-bold text-slate-600">{totalPages}</span>
                    </div>

                    <nav className="flex items-center gap-1.5 md:gap-2" aria-label="Pagination">
                      {/* First Page */}
                      <button
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-lg hover:shadow-indigo-100 transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
                        title="Trang đầu"
                      >
                        <FiChevronsLeft className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-0.5 transition-transform" />
                      </button>

                      {/* Previous */}
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-lg hover:shadow-indigo-100 transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
                        title="Trang trước"
                      >
                        <FiChevronLeft className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-0.5 transition-transform" />
                      </button>

                      {/* Page Numbers */}
                      <div className="flex items-center gap-1.5 md:gap-2 px-1">
                        {getPageNumbers().map((page, index) => (
                          page === "..." ? (
                            <span key={`dots-${index}`} className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-slate-400 font-bold">
                              &hellip;
                            </span>
                          ) : (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl font-bold text-xs md:text-sm transition-all duration-300 ${currentPage === page
                                ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-xl shadow-indigo-200 scale-110 z-10 border-none'
                                : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-slate-50'
                                }`}
                            >
                              {page}
                            </button>
                          )
                        ))}
                      </div>

                      {/* Next */}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-lg hover:shadow-indigo-100 transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
                        title="Trang sau"
                      >
                        <FiChevronRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      {/* Last Page */}
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-lg hover:shadow-indigo-100 transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
                        title="Trang cuối"
                      >
                        <FiChevronsRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </nav>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-xl text-center p-8">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-5xl text-slate-300">manage_search</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2 font-display">{t("products.no_results")}</h3>
                  <p className="text-slate-500 max-w-md mx-auto mb-8">
                    {t("products.no_results_desc", { query: searchQuery })}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={triggerAIFromCurrentFilters}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      {t("products.ask_ai")}
                    </button>
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory(null);
                        setPriceRange([0, 10000000]);
                        setMinRating(0);
                        setInStockOnly(true);
                        setRentalStartDate("");
                        setRentalEndDate("");
                        setSortBy("featured");
                      }}
                      className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-primary transition-colors cursor-pointer"
                    >
                      {t("products.clear_filters")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Compare Modal with Highlight */}
      <Transition appear show={isCompareModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsCompareModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all">
                  <div className="p-6 border-b flex justify-between items-center">
                    <Dialog.Title as="h3" className="text-2xl font-bold text-slate-900">
                      {t("products.compare_modal_title")}
                    </Dialog.Title>
                    <button
                      onClick={() => setIsCompareModalOpen(false)}
                      className="text-3xl text-slate-500 hover:text-slate-700"
                    >
                      ×
                    </button>
                  </div>

                  {loadingCompare ? (
                    <div className="p-12 text-center">
                      <div className="inline-block w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-slate-600">{t("products.compare_loading")}</p>
                    </div>
                  ) : (
                    <div className="p-6 overflow-x-auto max-h-[70vh]">
                      <table className="w-full min-w-[800px] border-collapse text-sm">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr className="bg-slate-50">
                            <th className="border p-4 text-left font-semibold w-1/4">{t("products.feature")}</th>
                            <th className="border p-4 text-center font-semibold">{compareData.device1?.name}</th>
                            <th className="border p-4 text-center font-semibold">{compareData.device2?.name}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const d1 = compareData.device1;
                            const d2 = compareData.device2;

                            const compareFn = (v1, v2, better = "higher") => {
                              if (v1 == null || v2 == null || v1 === v2) return { cls1: "", cls2: "", icon: "" };
                              const isHigherBetter = better === "higher";
                              const win = isHigherBetter ? v1 > v2 : v1 < v2;
                              return {
                                cls1: win ? "bg-green-50 text-green-800 font-medium" : "bg-red-50 text-red-800",
                                cls2: win ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800 font-medium",
                                icon1: win ? (isHigherBetter ? "↑" : "↓") : "",
                                icon2: win ? "" : (isHigherBetter ? "↑" : "↓"),
                              };
                            };

                            const rows = [
                              { label: t("products.specs.category"), v1: t(`categories.${d1?.category}`), v2: t(`categories.${d2?.category}`), type: "text" },
                              { label: t("products.specs.rent_day"), v1: d1?.rentPrice?.perDay, v2: d2?.rentPrice?.perDay, type: "lower" },
                              { label: t("products.specs.rent_week"), v1: d1?.rentPrice?.perWeek, v2: d2?.rentPrice?.perWeek, type: "lower" },
                              { label: t("products.specs.rent_month"), v1: d1?.rentPrice?.perMonth, v2: d2?.rentPrice?.perMonth, type: "lower" },
                              { label: t("products.specs.deposit"), v1: d1?.depositAmount, v2: d2?.depositAmount, type: "lower" },
                              { label: t("products.specs.stock"), v1: d1?.stockQuantity, v2: d2?.stockQuantity, type: "higher" },
                              { label: t("products.specs.available"), v1: d1?.availableQuantity, v2: d2?.availableQuantity, type: "higher" },
                              { label: t("products.specs.rating"), v1: d1?.ratingAvg, v2: d2?.ratingAvg, type: "higher" },
                              { label: t("products.specs.description"), v1: d1?.description || "—", v2: d2?.description || "—", type: "text", full: true },
                            ];

                            return rows.map((row, i) => {
                              if (row.full) {
                                return (
                                  <tr key={i} className="bg-slate-50/30">
                                    <td className="border p-3 font-medium">{row.label}</td>
                                    <td colSpan={2} className="border p-3">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className={row.v1 !== row.v2 ? "bg-yellow-50 p-2 rounded" : ""}>{row.v1}</div>
                                        <div className={row.v1 !== row.v2 ? "bg-yellow-50 p-2 rounded" : ""}>{row.v2}</div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              const cmp = compareFn(row.v1, row.v2, row.type);

                              return (
                                <tr key={i}>
                                  <td className="border p-3 font-medium">{row.label}</td>
                                  <td className={`border p-3 text-center ${cmp.cls1}`}>
                                    {row.v1 ?? "—"}
                                    {cmp.icon1 && <span className="ml-1 font-bold text-green-600">{cmp.icon1}</span>}
                                  </td>
                                  <td className={`border p-3 text-center ${cmp.cls2}`}>
                                    {row.v2 ?? "—"}
                                    {cmp.icon2 && <span className="ml-1 font-bold text-green-600">{cmp.icon2}</span>}
                                  </td>
                                </tr>
                              );
                            });
                          })()}

                          {/* Specs */}
                          {(() => {
                            const keys = new Set([
                              ...Object.keys(compareData.device1?.specs || {}),
                              ...Object.keys(compareData.device2?.specs || {}),
                            ]);
                            return [...keys].map((key) => {
                              const v1 = compareData.device1?.specs?.[key];
                              const v2 = compareData.device2?.specs?.[key];
                              const diff = v1 !== v2 && v1 !== undefined && v2 !== undefined;
                              return (
                                <tr key={key}>
                                  <td className="border p-3 font-medium">{key}</td>
                                  <td className={`border p-3 text-center ${diff ? "bg-yellow-50" : ""}`}>
                                    {v1 ?? "—"}
                                  </td>
                                  <td className={`border p-3 text-center ${diff ? "bg-yellow-50" : ""}`}>
                                    {v2 ?? "—"}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="p-6 border-t flex justify-end">
                    <button
                      onClick={() => setIsCompareModalOpen(false)}
                      className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition"
                    >
                      {t("products.close")}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
