import React from "react";

export default function RecordFlowSwitch({
  flowContext,
  setFlowContext,
  setSelectedRentalId,
  setAttempts,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm flex gap-2">
      <button
        type="button"
        onClick={() => {
          setFlowContext("DELIVERY");
          setSelectedRentalId("");
          setAttempts([]);
        }}
        className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
          flowContext === "DELIVERY"
            ? "bg-indigo-600 text-white"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        Biên bản bàn giao
      </button>
      <button
        type="button"
        onClick={() => {
          setFlowContext("RETURN");
          setSelectedRentalId("");
          setAttempts([]);
        }}
        className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
          flowContext === "RETURN"
            ? "bg-orange-600 text-white"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        Biên bản thu hồi
      </button>
    </div>
  );
}
