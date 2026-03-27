// components/my-rentals/RentalItemRow.jsx
import React from "react";
import { Calendar, AlertCircle, FileText } from "lucide-react";

export default function RentalItemRow({
  item,
  orderStatus,
  navigate,
  setDeliReportModal,
  setDamageReportModal,
  order,
}) {
  let latestReport = null;
  let reportType = null;

  if (orderStatus === "DELIVERING") {
    latestReport = item.deliveryIssues?.[0] || null;
    reportType = "delivery";
  } else if (orderStatus === "RENTING") {
    latestReport = item.damageReports?.[0] || null;
    reportType = "damage";
  }

  const hasReport = !!latestReport;
  const reportStatus = latestReport?.status || null;
  const isActiveReport =
    hasReport &&
    ((orderStatus === "DELIVERING" &&
      (reportStatus === "OPEN" || reportStatus === "PROCESSING")) ||
      (orderStatus === "RENTING" &&
        (reportStatus === "OPEN" || reportStatus === "VERIFIED")));

  const reportStatusLabel = hasReport
    ? isActiveReport
      ? "Processing"
      : reportStatus === "RESOLVED"
      ? "Resolved"
      : reportStatus === "REJECTED"
      ? "Rejected"
      : "Reported"
    : null;

  return (
    <div
      onClick={() =>
        navigate(`/device/${item.deviceId?.slug || item.deviceId?._id}`)
      }
      className={`group/item flex gap-5 p-5 rounded-3xl border transition-all hover:shadow-md cursor-pointer ${
        hasReport
          ? isActiveReport
            ? "bg-red-50 border-red-200"
            : "bg-emerald-50 border-emerald-200"
          : "bg-gray-50 border-gray-100 hover:border-indigo-200"
      }`}
    >
      {/* Device Image */}
      <div className="relative w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border border-gray-100 shadow-sm group-hover/item:scale-105 transition-transform duration-300">
        <img
          src={
            item.deviceId?.images?.[0] ||
            "https://via.placeholder.com/300?text=No+Image"
          }
          alt={item.deviceId?.name}
          className="w-full h-full object-cover"
        />
        {hasReport && (
          <div
            className={`absolute -top-1 -right-1 p-1.5 rounded-full shadow ${
              isActiveReport ? "bg-red-500" : "bg-emerald-500"
            }`}
          >
            <AlertCircle size={18} className="text-white" />
          </div>
        )}
      </div>

      {/* Device Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 group-hover/item:text-indigo-600 transition-colors line-clamp-2">
          {item.deviceId?.name || "Unknown Device"}
        </h4>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar size={13} />
            <span>
              {new Date(item.rentalStartDate).toLocaleDateString("en-US")} —{" "}
              {new Date(item.rentalEndDate).toLocaleDateString("en-US")}
            </span>
          </div>
          <span className="font-bold text-indigo-600">x{item.quantity}</span>
        </div>

        {item.serialNumbers?.length > 0 && (
          <p className="mt-1 text-[10px] text-gray-500 font-mono">
            Serial: {item.serialNumbers.join(", ")}
          </p>
        )}

        {hasReport && reportStatusLabel && (
          <span
            className={`mt-3 inline-block px-3 py-1 text-[10px] font-bold rounded-full border ${
              isActiveReport
                ? "bg-red-100 text-red-700 border-red-200"
                : "bg-emerald-100 text-emerald-700 border-emerald-200"
            }`}
          >
            {reportStatusLabel}
          </span>
        )}
      </div>

      {/* Report Button */}
      {(orderStatus === "DELIVERING" || orderStatus === "RENTING") &&
        reportType && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (hasReport) {
                // View existing report
                // You can add logic to open detail modal here if needed
              } else {
                if (orderStatus === "DELIVERING") {
                  setDeliReportModal({
                    isOpen: true,
                    order,
                  });
                } else if (orderStatus === "RENTING") {
                  setDamageReportModal({
                    isOpen: true,
                    order,
                  });
                }
              }
            }}
            className={`self-start mt-1 px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm ${
              hasReport
                ? reportType === "delivery"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-orange-600 hover:bg-orange-700 text-white"
                : reportType === "delivery"
                ? "bg-amber-100 hover:bg-amber-200 text-amber-800"
                : "bg-red-100 hover:bg-red-200 text-red-700"
            }`}
          >
            {hasReport ? (
              <>
                <FileText size={15} /> View Report
              </>
            ) : (
              <>
                <AlertCircle size={15} /> Report Issue
              </>
            )}
          </button>
        )}
    </div>
  );
}
