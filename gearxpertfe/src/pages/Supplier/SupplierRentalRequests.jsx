import { FiCheck, FiX, FiClock, FiUser, FiMapPin, FiCalendar } from "react-icons/fi";

export default function SupplierRentalRequests() {
  // Mock data
  const requests = [
    {
      id: 1,
      customerName: "Nguyễn Văn A",
      deviceName: "Canon EOS R5",
      startDate: "2024-01-20",
      endDate: "2024-01-25",
      status: "PENDING",
      location: "Hồ Chí Minh",
      totalPrice: 2500000,
      avatar: "👤"
    },
    {
      id: 2,
      customerName: "Trần Thị B",
      deviceName: "Sony A7IV",
      startDate: "2024-01-22",
      endDate: "2024-01-28",
      status: "APPROVED",
      location: "Hà Nội",
      totalPrice: 1800000,
      avatar: "👩"
    },
    {
      id: 3,
      customerName: "Lê Minh C",
      deviceName: "DJI Mini 3 Pro",
      startDate: "2024-01-25",
      endDate: "2024-02-01",
      status: "PENDING",
      location: "Đà Nẵng",
      totalPrice: 900000,
      avatar: "👨"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Rental Requests</h2>
        <p className="mt-1 text-sm text-slate-600">Review and manage incoming rental bookings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-semibold uppercase tracking-tighter">Pending</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">3</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-xl">
              <FiClock size={24} className="text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-semibold uppercase tracking-tighter">Approved</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">8</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-xl">
              <FiCheck size={24} className="text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-semibold uppercase tracking-tighter">Revenue</p>
              <p className="text-3xl font-bold text-primary mt-2">12.3M</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
              💰
            </div>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Customer & Device Info */}
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
                  {req.avatar}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-slate-900 truncate">{req.deviceName}</h3>
                    <span className={`h-fit rounded-lg px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap ${
                      req.status === "PENDING"
                        ? "bg-amber-100 text-amber-700 border border-amber-200"
                        : "bg-green-100 text-green-700 border border-green-200"
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <FiUser size={14} />
                      <span>{req.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <FiMapPin size={14} />
                      <span>{req.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <FiCalendar size={14} />
                      <span>{req.startDate} → {req.endDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price & Actions */}
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-tighter">Total Price</p>
                  <p className="text-2xl font-bold text-primary mt-1">{(req.totalPrice / 1000000).toFixed(1)}M</p>
                </div>

                {req.status === "PENDING" && (
                  <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all hover:shadow-lg hover:shadow-green-600/20">
                      <FiCheck size={18} />
                      <span className="hidden sm:inline">Approve</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-red-100 text-red-600 rounded-xl font-semibold hover:bg-red-200 transition-all border border-red-200">
                      <FiX size={18} />
                      <span className="hidden sm:inline">Reject</span>
                    </button>
                  </div>
                )}

                {req.status === "APPROVED" && (
                  <div className="px-4 py-2.5 bg-green-50 rounded-xl border border-green-200 text-green-700 text-sm font-semibold">
                    ✓ Approved
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
