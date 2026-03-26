import { FiTool, FiCheckCircle, FiClock, FiUser, FiDollarSign } from "react-icons/fi";

export default function SupplierMaintenance() {
  // Mock data
  const tasks = [
    {
      id: 1,
      deviceName: "Canon EOS R5",
      issue: "Lens cleaning required",
      status: "PENDING",
      priority: "HIGH",
      assignedTo: "Technician A",
      estCost: 500000,
      dueDate: "2024-01-20"
    },
    {
      id: 2,
      deviceName: "Sony A7IV",
      issue: "Battery replacement",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      assignedTo: "Technician B",
      estCost: 800000,
      dueDate: "2024-01-22"
    },
    {
      id: 3,
      deviceName: "DJI Mini 3 Pro",
      issue: "Propeller damage",
      status: "COMPLETED",
      priority: "HIGH",
      assignedTo: "Technician C",
      estCost: 1200000,
      dueDate: "2024-01-18"
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "COMPLETED":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "HIGH":
        return "text-red-600 bg-red-50";
      case "MEDIUM":
        return "text-amber-600 bg-amber-50";
      case "LOW":
        return "text-green-600 bg-green-50";
      default:
        return "text-slate-600 bg-slate-50";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Bảo trì</h2>
        <p className="mt-1 text-sm text-slate-600">Theo dõi và quản lý các công việc bảo trì thiết bị</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-semibold uppercase tracking-tighter">Công việc chờ</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">5</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <FiClock size={24} className="text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-semibold uppercase tracking-tighter">Đang thực hiện</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">2</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <FiTool size={24} className="text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-semibold uppercase tracking-tighter">Chi phí dự tính</p>
              <p className="text-3xl font-bold text-primary mt-2">3.5M</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FiDollarSign size={24} className="text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Task Info */}
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
                  <FiTool size={24} className="text-primary" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-bold text-slate-900 truncate">{task.deviceName}</h3>
                    <span className={`h-fit rounded-lg px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap border ${getStatusColor(task.status)}`}>
                      {task.status === "PENDING" ? "Chờ xử lý" : task.status === "IN_PROGRESS" ? "Đang làm" : "Đã xong"}
                    </span>
                    <span className={`h-fit rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wider whitespace-nowrap ${getPriorityColor(task.priority)}`}>
                      {task.priority === "HIGH" ? "Cao" : task.priority === "MEDIUM" ? "Trung bình" : "Thấp"}
                    </span>
                  </div>

                  <p className="text-sm text-slate-700 font-medium mb-2">{task.issue}</p>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <FiUser size={14} />
                      <span>{task.assignedTo}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <FiClock size={14} />
                      <span>Hạn: {task.dueDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cost & Actions */}
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-tighter">Chi phí tối thiểu</p>
                  <p className="text-2xl font-bold text-primary mt-1">{(task.estCost / 1000000).toFixed(1)}M</p>
                </div>

                {task.status === "PENDING" && (
                  <button className="px-4 py-2.5 bg-primary/10 text-primary rounded-xl font-semibold hover:bg-primary/20 transition-all border border-primary/20">
                    Bắt đầu làm
                  </button>
                )}

                {task.status === "IN_PROGRESS" && (
                  <button className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all">
                    <FiCheckCircle size={18} />
                    <span className="hidden sm:inline">Hoàn tất</span>
                  </button>
                )}

                {task.status === "COMPLETED" && (
                  <div className="px-4 py-2.5 bg-green-50 rounded-xl border border-green-200 text-green-700 text-sm font-semibold flex items-center gap-2">
                    <FiCheckCircle size={18} />
                    Hoàn tất
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
