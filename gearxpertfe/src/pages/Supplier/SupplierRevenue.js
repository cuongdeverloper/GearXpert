import { FiTrendingUp, FiDollarSign, FiTarget, FiCalendar } from "react-icons/fi";

export default function SupplierRevenue() {
  // Mock data
  const revenueData = {
    totalRevenue: 125400000,
    monthlyRevenue: 18500000,
    activeRentals: 12,
    avgRating: 4.8
  };

  const monthlyBreakdown = [
    { month: "Jan", revenue: 8500000, rentals: 24 },
    { month: "Feb", revenue: 9200000, rentals: 28 },
    { month: "Mar", revenue: 10100000, rentals: 31 },
    { month: "Apr", revenue: 18500000, rentals: 45 }
  ];

  const topDevices = [
    { name: "Canon EOS R5", revenue: 28500000, rentals: 142 },
    { name: "Sony A7IV", revenue: 22300000, rentals: 118 },
    { name: "DJI Mini 3 Pro", revenue: 18200000, rentals: 95 },
    { name: "Rode Wireless Mic", revenue: 15600000, rentals: 78 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Revenue Analytics</h2>
        <p className="mt-1 text-sm text-slate-600">Monitor earnings and rental performance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600 font-semibold uppercase tracking-tighter">Total Revenue</p>
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <FiDollarSign size={20} className="text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-primary">{(revenueData.totalRevenue / 1000000).toFixed(1)}M</p>
          <p className="text-xs text-primary/70 mt-2">All time earnings</p>
        </div>

        <div className="bg-gradient-to-br from-green-100/10 to-green-50/5 rounded-2xl border border-green-200/30 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600 font-semibold uppercase tracking-tighter">This Month</p>
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <FiTrendingUp size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-green-600">{(revenueData.monthlyRevenue / 1000000).toFixed(1)}M</p>
          <p className="text-xs text-green-600/70 mt-2">+15% vs last month</p>
        </div>

        <div className="bg-gradient-to-br from-blue-100/10 to-blue-50/5 rounded-2xl border border-blue-200/30 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600 font-semibold uppercase tracking-tighter">Active Rentals</p>
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FiTarget size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-blue-600">{revenueData.activeRentals}</p>
          <p className="text-xs text-blue-600/70 mt-2">Current bookings</p>
        </div>

        <div className="bg-gradient-to-br from-amber-100/10 to-amber-50/5 rounded-2xl border border-amber-200/30 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600 font-semibold uppercase tracking-tighter">Rating</p>
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-lg">
              ⭐
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-600">{revenueData.avgRating}</p>
          <p className="text-xs text-amber-600/70 mt-2">Customer satisfaction</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <FiCalendar className="text-primary" />
            Monthly Revenue
          </h3>

          <div className="space-y-4">
            {monthlyBreakdown.map((item, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-700">{item.month}</span>
                  <span className="text-sm font-bold text-primary">{(item.revenue / 1000000).toFixed(1)}M</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full transition-all"
                    style={{ width: `${(item.revenue / 20000000) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 mt-1">{item.rentals} rentals</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Devices */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Top Performing Devices</h3>

          <div className="space-y-4">
            {topDevices.map((device, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-primary/30 transition-all group"
              >
                <div>
                  <p className="font-semibold text-slate-900 group-hover:text-primary transition-colors">{device.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{device.rentals} rentals</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{(device.revenue / 1000000).toFixed(1)}M</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Earnings Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Transactions</h3>

        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-primary/30 hover:bg-slate-50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FiDollarSign size={18} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Rental Payment Received</p>
                  <p className="text-xs text-slate-500">January 16, 2024 • 2:30 PM</p>
                </div>
              </div>
              <p className="font-bold text-green-600">+2.5M</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
