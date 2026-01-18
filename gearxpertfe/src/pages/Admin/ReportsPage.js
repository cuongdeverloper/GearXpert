import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { mockReports, mockDashboard } from "../../mocks/adminMock";
import { showAdminLoading, hideAdminLoading } from "../../redux/action/appAction";
import { FiDownload, FiBarChart2, FiTrendingUp, FiUsers, FiBox } from "react-icons/fi";

export default function ReportsPage() {
  const dispatch = useDispatch();

  // Simulate data loading
  useEffect(() => {
    dispatch(showAdminLoading());
    const timer = setTimeout(() => {
      dispatch(hideAdminLoading());
    }, 800);
    return () => clearTimeout(timer);
  }, [dispatch]);
  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {mockDashboard.stats.map((stat, idx) => (
          <div
            key={idx}
            className={`rounded-xl border border-slate-200 bg-white p-4 ${stat.color}`}
          >
            <div className="text-xs font-medium text-slate-600 mb-2">{stat.label}</div>
            <div className="text-2xl font-bold mb-1">{stat.value}</div>
            <div className="text-xs font-medium text-green-600">{stat.change} from last month</div>
          </div>
        ))}
      </div>

      {/* Reports List */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Reports</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mockReports.map((report) => (
            <div
              key={report.id}
              className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition"
            >
              {/* Icon & Title */}
              <div className="mb-3 flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  {report.type === "revenue" && <FiBarChart2 size={20} />}
                  {report.type === "device" && <FiBox size={20} />}
                  {report.type === "user" && <FiUsers size={20} />}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{report.title}</h3>
                  <p className="text-xs text-slate-500">{report.period}</p>
                </div>
              </div>

              {/* Content */}
              <div className="mb-4 space-y-2 border-t border-slate-200 pt-3 text-sm">
                {report.type === "revenue" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Revenue:</span>
                      <span className="font-semibold text-slate-900">${report.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Rentals:</span>
                      <span className="font-semibold text-slate-900">{report.totalRentals}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Active Users:</span>
                      <span className="font-semibold text-slate-900">{report.totalUsers}</span>
                    </div>
                  </>
                )}
                {report.type === "device" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Top Device:</span>
                      <span className="font-semibold text-slate-900">{report.topDevice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Rentals:</span>
                      <span className="font-semibold text-slate-900">{report.totalRentals}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Avg Rating:</span>
                      <span className="font-semibold text-slate-900">{report.averageRating} ⭐</span>
                    </div>
                  </>
                )}
                {report.type === "user" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-600">New Users:</span>
                      <span className="font-semibold text-slate-900">{report.newUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Active Users:</span>
                      <span className="font-semibold text-slate-900">{report.activeUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Churn Rate:</span>
                      <span className="font-semibold text-slate-900">{report.churnRate}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Download Button */}
              <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                <FiDownload size={16} />
                Download Report
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Generate Report Button */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
        <h3 className="mb-2 font-semibold text-slate-900">Generate Custom Report</h3>
        <p className="mb-4 text-sm text-slate-600">Create a custom report with specific filters and date ranges</p>
        <button className="px-6 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition">
          Generate Report
        </button>
      </div>
    </div>
  );
}
