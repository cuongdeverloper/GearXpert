import { useCallback, useEffect, useState } from "react";
import { getDevices, getDeviceDetail } from "../../service/ApiService/DeviceApi";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import ProductCard from "../../components/common/ProductCard";

// Headless UI cho modal
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

export default function ProductsPage() {
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("featured");

  // Compare states
  const [selectedForCompare, setSelectedForCompare] = useState([]); // max 2 _id
  const [compareData, setCompareData] = useState({ device1: null, device2: null });
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [compareSearchQuery, setCompareSearchQuery] = useState("");
  const [compareError, setCompareError] = useState("");

  const categories = [
    { name: "All Gear", id: null, icon: "grid_view" },
    { name: "Cinematography", id: "CAMERA", icon: "videocam" },
    { name: "Lighting Kits", id: "LIGHTING", icon: "lightbulb" },
    { name: "Audio Gear", id: "AUDIO", icon: "mic" },
    { name: "Gimbal & Grip", id: "ACCESSORY", icon: "handyman" },
    { name: "Aerial / Drones", id: "DRONE", icon: "flight" },
    { name: "Other", id: "OTHER", icon: "category" },
  ];

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        limit: 100,
        ...(selectedCategory && { category: selectedCategory }),
      };
      const response = await getDevices(params);
      setDevices(response.devices || []);
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  const applyFiltersAndSort = useCallback(() => {
    let result = [...devices];

    if (searchQuery) {
      result = result.filter(
        (device) =>
          device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          device.description?.toLowerCase().includes(searchQuery.toLowerCase())
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
  }, [devices, searchQuery, sortBy]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  // Compare logic
  const handleToggleCompare = (device) => {
    setCompareError("");

    if (selectedForCompare.includes(device._id)) {
      setSelectedForCompare((prev) => prev.filter((id) => id !== device._id));
    } else {
      if (selectedForCompare.length >= 2) {
        setCompareError("You can compare up to 2 devices only.");
        return;
      }

      if (selectedForCompare.length === 1) {
        const firstId = selectedForCompare[0];
        const firstDevice = devices.find((d) => d._id === firstId);
        if (firstDevice && firstDevice.category !== device.category) {
          setCompareError("Only devices in the same category can be compared.");
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
      setCompareError("Failed to load comparison data. Please try again.");
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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-grow w-full pb-12">
        {/* Premium Hero Section - giữ nguyên */}
        <section className="relative w-full bg-slate-900 overflow-hidden mb-10 pt-16 pb-24 lg:pt-24 lg:pb-32">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=2070')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/80 to-slate-50"></div>

          <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-10 text-center">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 font-display tracking-tight">
              Professional <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-indigo-400">Gear Catalog</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto font-light mb-10">
              Equip your vision with industry-standard cameras, lenses, and lighting. <br className="hidden md:block" /> Meticulously maintained and ready for your next shoot.
            </p>

            <div className="max-w-2xl mx-auto relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-accent-cyan to-indigo-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2 flex items-center shadow-2xl">
                <span className="material-symbols-outlined text-white/50 ml-3 mr-2 text-2xl">search</span>
                <input
                  type="text"
                  placeholder="Search for 'Sony FX3', 'Aputure', 'Ronin'..."
                  className="flex-1 bg-transparent border-none text-white placeholder-white/50 focus:ring-0 text-lg h-12"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="px-6 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-indigo-50 transition-colors">
                  Search
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 -mt-20 relative z-20">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar - giữ nguyên */}
            <aside className="w-full lg:w-72 flex-shrink-0">
              <div className="bg-white/80 backdrop-blur-xl rounded-[24px] p-6 shadow-xl border border-white/60 sticky top-24">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Filter By Category</h3>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.name}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-left relative overflow-hidden group ${selectedCategory === cat.id
                        ? "bg-slate-900 text-white shadow-lg shadow-indigo-200/50"
                        : "text-slate-600 hover:bg-white hover:shadow-md hover:text-indigo-600"
                        }`}
                    >
                      <span
                        className={`material-symbols-outlined text-[20px] transition-colors ${selectedCategory === cat.id ? "text-accent-cyan" : "text-slate-400 group-hover:text-indigo-500"
                          }`}
                      >
                        {cat.icon}
                      </span>
                      <span className="font-bold text-sm tracking-tight">{cat.name}</span>
                      {selectedCategory === cat.id && (
                        <div className="absolute right-4 w-2 h-2 rounded-full bg-accent-cyan shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="mt-8 p-6 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl text-white relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                  <h4 className="font-bold font-display text-lg mb-2 relative z-10">Need a Bundle?</h4>
                  <p className="text-xs text-indigo-100 mb-4 relative z-10 leading-relaxed">Get 15% off when you rent a complete camera kit.</p>
                  <button className="px-4 py-2 bg-white text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors w-full shadow-lg relative z-10">
                    View Bundles
                  </button>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1">
              {/* Controls Bar */}
              <div className="bg-white/50 backdrop-blur-md rounded-2xl p-4 mb-8 flex flex-wrap items-center justify-between gap-4 border border-white/60 shadow-sm">
                <h2 className="text-lg font-bold text-slate-700">
                  Showing <span className="text-slate-900">{filteredDevices.length}</span> results
                </h2>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-500">Sort by:</span>
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-bold py-2.5 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm hover:border-indigo-300 transition-colors"
                      >
                        <option value="featured">Featured</option>
                        <option value="newest">Newest Arrivals</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
                        expand_more
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {selectedForCompare.length > 0 && (
                      <div className="flex gap-2">
                        {selectedForCompare.map((id) => {
                          const dev = devices.find((d) => d._id === id);
                          return dev ? (
                            <div
                              key={id}
                              className="bg-indigo-100 px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-sm"
                            >
                              <span className="font-medium truncate max-w-[140px]">{dev.name}</span>
                              <button
                                onClick={() => handleToggleCompare(dev)}
                                className="text-red-600 hover:text-red-800 text-lg leading-none"
                              >
                                ×
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}

                    <button
                      onClick={fetchCompareData}
                      disabled={selectedForCompare.length !== 2 || loadingCompare}
                      className={`px-6 py-2.5 rounded-xl font-bold text-white transition-colors ${
                        selectedForCompare.length === 2 && !loadingCompare
                          ? "bg-indigo-600 hover:bg-indigo-700"
                          : "bg-indigo-400 cursor-not-allowed"
                      }`}
                    >
                      {loadingCompare ? "Loading..." : "Compare"}
                    </button>

                    {compareError && <p className="text-red-600 text-sm">{compareError}</p>}
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
                    placeholder="Search similar products to compare..."
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
                              Select to Compare
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 col-span-full text-center py-8">
                        No matching products found in this category.
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
              ) : filteredDevices.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                  {filteredDevices.map((device) => (
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
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-xl text-center p-8">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-5xl text-slate-300">manage_search</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2 font-display">No matches found</h3>
                  <p className="text-slate-500 max-w-md mx-auto mb-8">
                    We couldn't find any productions matching your search "{searchQuery}". Try adjusting your filters or search terms.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory(null);
                    }}
                    className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-primary transition-colors cursor-pointer"
                  >
                    Clear Filters
                  </button>
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
                      Compare Devices
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
                      <p className="text-slate-600">Loading comparison data...</p>
                    </div>
                  ) : (
                    <div className="p-6 overflow-x-auto max-h-[70vh]">
                      <table className="w-full min-w-[800px] border-collapse text-sm">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr className="bg-slate-50">
                            <th className="border p-4 text-left font-semibold w-1/4">Feature</th>
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
                              { label: "Category", v1: d1?.category, v2: d2?.category, type: "text" },
                              { label: "Daily Rent", v1: d1?.rentPrice?.perDay, v2: d2?.rentPrice?.perDay, type: "lower" },
                              { label: "Weekly Rent", v1: d1?.rentPrice?.perWeek, v2: d2?.rentPrice?.perWeek, type: "lower" },
                              { label: "Monthly Rent", v1: d1?.rentPrice?.perMonth, v2: d2?.rentPrice?.perMonth, type: "lower" },
                              { label: "Deposit", v1: d1?.depositAmount, v2: d2?.depositAmount, type: "lower" },
                              { label: "Stock", v1: d1?.stockQuantity, v2: d2?.stockQuantity, type: "higher" },
                              { label: "Available", v1: d1?.availableQuantity, v2: d2?.availableQuantity, type: "higher" },
                              { label: "Rating", v1: d1?.ratingAvg, v2: d2?.ratingAvg, type: "higher" },
                              { label: "Description", v1: d1?.description || "—", v2: d2?.description || "—", type: "text", full: true },
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
                      Close
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