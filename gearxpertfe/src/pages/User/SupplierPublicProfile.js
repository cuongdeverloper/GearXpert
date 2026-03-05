// pages/supplier/SupplierPublicProfile.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getSupplierProfile,
  getSupplierDevices,
} from "../../service/ApiService/SupplierApi";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";

export default function SupplierPublicProfile() {
  const { id } = useParams();
  const [supplier, setSupplier] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const profileRes = await getSupplierProfile(id);
        if (profileRes?.success) {
          setSupplier(profileRes.data);
        } else {
          toast.error(profileRes.message || "Không tìm thấy cửa hàng");
        }

        const devicesRes = await getSupplierDevices(id, {
          page,
          limit: 12,
          sort: sortBy,
        });
        if (devicesRes?.success) {
          setDevices(devicesRes.data?.devices || []);
          setTotalPages(devicesRes.data?.pagination?.totalPages || 1);
        }
      } catch (err) {
        toast.error("Lỗi tải thông tin cửa hàng");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, page, sortBy]);

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setPage(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <div className="flex-grow flex items-center justify-center px-4">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-12 text-center shadow-xl border border-slate-200/50 max-w-lg mx-auto">
            <span className="material-symbols-outlined text-9xl text-slate-300 mb-6">
              storefront_off
            </span>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Không tìm thấy cửa hàng
            </h2>
            <p className="text-slate-600 text-lg mb-8">
              Cửa hàng này có thể đã bị khóa hoặc không tồn tại.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-2xl font-bold text-lg hover:from-indigo-700 hover:to-cyan-600 transition-all shadow-xl"
            >
              <span className="material-symbols-outlined">home</span>
              Khám phá cửa hàng khác
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-grow pb-12">
        {/* Shop Header - Glassmorphism, gradient accent */}
        <div className="relative bg-gradient-to-br from-indigo-50 via-white to-cyan-50 pb-16 lg:pb-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-10">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-10 lg:gap-16">
              {/* Avatar + badge */}
              <div className="relative flex-shrink-0 mx-auto lg:mx-0">
                <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-3xl overflow-hidden shadow-2xl ring-8 ring-white/50 transform hover:scale-105 transition-transform duration-500">
                  <img
                    src={
                      supplier?.businessAvatar ||
                      supplier?.userId?.avatar ||
                      "/default-shop.jpg"
                    }
                    alt={supplier?.businessName}
                    className="w-full h-full object-cover"
                    onError={(e) => (e.target.src = "/default-shop.jpg")}
                  />
                </div>
                <div className="absolute -bottom-5 left-1/2 lg:left-auto lg:right-0 -translate-x-1/2 lg:translate-x-0 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg border-4 border-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg fill-current">
                    verified
                  </span>
                  Shop Uy Tín
                </div>
              </div>

              {/* Shop Info */}
              <div className="flex-1 text-center lg:text-left">
                <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
                  {supplier?.businessName || "Cửa hàng GearXpert"}
                </h1>

                <p className="text-xl text-gray-700 mb-8 max-w-4xl leading-relaxed">
                  {supplier?.businessDescription ||
                    "Chuyên cung cấp thiết bị công nghệ chính hãng • Giá cạnh tranh • Giao hàng nhanh chóng • Hỗ trợ tận tâm"}
                </p>

                {/* Stats */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-6 mb-10">
                  <div className="bg-white px-8 py-5 rounded-2xl shadow-sm border border-gray-200 min-w-[160px] text-center">
                    <p className="text-4xl font-bold text-indigo-600">
                      {supplier?.deviceCount || 0}
                    </p>
                    <p className="text-gray-600 mt-1">Sản phẩm</p>
                  </div>
                  <div className="bg-white px-8 py-5 rounded-2xl shadow-sm border border-gray-200 min-w-[160px] text-center">
                    <p className="text-4xl font-bold text-amber-500">
                      {(supplier?.supplierRating || 0).toFixed(1)}
                    </p>
                    <p className="text-gray-600 mt-1">
                      {supplier?.supplierReviewCount || 0} đánh giá
                    </p>
                  </div>
                  <div className="bg-white px-8 py-5 rounded-2xl shadow-sm border border-gray-200 min-w-[160px] text-center">
                    <p className="text-4xl font-bold text-green-600">98%</p>
                    <p className="text-gray-600 mt-1">Phản hồi chat</p>
                  </div>
                </div>

                {/* Contact */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-5">
                  {supplier?.contactZalo && (
                    <a
                      href={`https://zalo.me/${supplier.contactZalo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold text-lg hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-emerald-800/30"
                    >
                      <span className="material-symbols-outlined text-2xl">
                        chat
                      </span>
                      Chat Zalo ngay
                    </a>
                  )}
                  {supplier?.contactFacebook && (
                    <a
                      href={supplier.contactFacebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-blue-800/30"
                    >
                      <span className="material-symbols-outlined text-2xl">
                        language
                      </span>
                      Theo dõi Facebook
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products Section - liền mạch */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
              Sản phẩm đang bán
            </h2>

            <div className="flex items-center gap-5">
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="px-6 py-3.5 bg-white border border-gray-300 rounded-xl text-gray-700 font-medium focus:ring-2 focus:ring-indigo-500 shadow-sm min-w-[220px]"
              >
                <option value="newest">Mới nhất</option>
                <option value="price-asc">Giá thấp → cao</option>
                <option value="price-desc">Giá cao → thấp</option>
                <option value="rating-desc">Đánh giá tốt nhất</option>
              </select>
            </div>
          </div>

          {devices.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center shadow border border-gray-200">
              <span className="material-symbols-outlined text-9xl text-gray-300 mb-6">
                inventory_2
              </span>
              <h3 className="text-3xl font-bold text-gray-800 mb-4">
                Chưa có sản phẩm nào
              </h3>
              <p className="text-gray-600 text-lg max-w-xl mx-auto mb-8">
                Cửa hàng hiện chưa đăng tải sản phẩm nào. Hãy liên hệ trực tiếp
                để được tư vấn nhé!
              </p>
              {supplier?.contactZalo && (
                <a
                  href={`https://zalo.me/${supplier.contactZalo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold text-lg hover:from-emerald-600 hover:to-teal-700 transition shadow-lg"
                >
                  <span className="material-symbols-outlined">chat</span>
                  Liên hệ ngay
                </a>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
              {devices.map((device) => (
                <Link
                  key={device._id}
                  to={`/device/${device._id}`}
                  className="group bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 hover:border-indigo-300 flex flex-col h-full"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    <img
                      src={device.images?.[0] || "/placeholder-device.jpg"}
                      alt={device.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) =>
                        (e.target.src = "/placeholder-device.jpg")
                      }
                    />
                    <div className="absolute top-4 right-4 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-md">
                      {device.category}
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="font-bold text-xl mb-3 line-clamp-2 group-hover:text-indigo-700 transition-colors">
                      {device.name}
                    </h3>

                    <div className="mt-auto">
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-3xl font-black text-red-600">
                          {device.rentPrice?.perDay?.toLocaleString("vi-VN")}₫
                        </span>
                        <span className="text-gray-500 text-lg">/ ngày</span>
                      </div>

                      <p className="text-sm text-gray-600 mb-4">
                        Cọc: {device.depositAmount?.toLocaleString("vi-VN")}₫
                      </p>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-amber-500 fill text-xl">
                            star
                          </span>
                          <span className="font-bold">
                            {(device.ratingAvg || 0).toFixed(1)}
                          </span>
                          <span className="text-gray-500">
                            ({device.reviewCount || 0})
                          </span>
                        </div>
                        <span className="text-green-600 font-semibold">
                          Còn hàng
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-6 mt-16">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-8 py-4 bg-white border border-gray-300 text-gray-700 rounded-2xl font-semibold hover:bg-gray-50 disabled:opacity-50 transition shadow-sm flex items-center gap-2 min-w-[140px] justify-center"
              >
                <span className="material-symbols-outlined">chevron_left</span>
                Trước
              </button>

              <span className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-2xl font-bold shadow-md text-lg min-w-[140px] text-center">
                {page} / {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === totalPages}
                className="px-8 py-4 bg-white border border-gray-300 text-gray-700 rounded-2xl font-semibold hover:bg-gray-50 disabled:opacity-50 transition shadow-sm flex items-center gap-2 min-w-[140px] justify-center"
              >
                Sau
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
