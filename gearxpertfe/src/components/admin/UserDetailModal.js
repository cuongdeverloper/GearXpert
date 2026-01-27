import { FiX, FiMail, FiPhone, FiMapPin, FiUser, FiStar, FiCheckCircle } from "react-icons/fi";

const getStatusStyle = (status) =>
  status === "ACTIVE"
    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
    : "bg-rose-50 text-rose-700 border-rose-100";

const getRoleStyle = (role) => {
  const map = {
    CUSTOMER: "bg-blue-50 text-blue-700 border-blue-100",
    SUPPLIER: "bg-emerald-50 text-emerald-700 border-emerald-100",
    TECHNICIAN: "bg-purple-50 text-purple-700 border-purple-100",
    DELIVERY_STAFF: "bg-amber-50 text-amber-700 border-amber-100",
  };
  return map[role] || "bg-slate-50 text-slate-700 border-slate-100";
};

export default function UserDetailModal({ user, onClose }) {
  if (!user) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative border-b border-slate-100 bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 px-6 py-5 text-white">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 hover:bg-white/20"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
          <div className="flex items-center gap-4">
            <img
              src={user.avatar || "https://via.placeholder.com/64"}
              alt={user.fullName}
              className="h-16 w-16 rounded-full border-2 border-white/40 object-cover"
            />
            <div>
              <p className="text-xl font-semibold">{user.fullName}</p>
              <p className="text-sm text-white/80">{user.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${getRoleStyle(user.role)}`}>
                  <FiUser />
                  {user.role}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusStyle(user.status)}`}>
                  {user.status === "ACTIVE" ? "Hoat dong" : "Da khoa"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-semibold">
                  <FiCheckCircle />
                  {user.isVerified ? "Da xac minh" : "Chua xac minh"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-xs uppercase text-slate-400">Dien thoai</p>
            <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-800">
              <FiPhone className="text-slate-400" />
              {user.phone || "Chua cap nhat"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-xs uppercase text-slate-400">Email</p>
            <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-800">
              <FiMail className="text-slate-400" />
              {user.email}
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-xs uppercase text-slate-400">Hang</p>
            <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-800">
              <FiStar className="text-amber-500" />
              {user.rank || "N/A"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-xs uppercase text-slate-400">Diem thuong</p>
            <div className="mt-2 text-sm font-medium text-slate-800">{user.rewardPoints || 0} diem</div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:col-span-2">
            <p className="text-xs uppercase text-slate-400">Dia chi</p>
            <div className="mt-2 flex items-start gap-2 text-sm font-medium text-slate-800">
              <FiMapPin className="mt-0.5 text-slate-400" />
              <span>
                {user.address?.detail || "N/A"}, {user.address?.city || "N/A"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Dong
          </button>
        </div>
      </div>
    </div>
  );
}
