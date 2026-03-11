import React from 'react';
import { QrCode, Camera } from 'lucide-react';

export default function QRTab() {
  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-64 h-64 border-2 border-dashed border-primary/50 relative mb-6 rounded-3xl flex items-center justify-center bg-black/20 overflow-hidden">
          <div className="absolute top-0 w-full h-1 bg-primary shadow-[0_0_15px_rgba(99,102,241,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
          <QrCode size={48} className="text-slate-600" />
        </div>
        <h2 className="text-xl font-bold mb-2">Đưa mã QR vào khung hình</h2>
        <p className="text-slate-400 text-sm max-w-xs">
          Quét mã trên thiết bị để xác nhận tình trạng hoặc xem chi tiết hợp đồng.
        </p>
        <button className="mt-8 px-8 py-3 bg-white text-slate-900 rounded-full font-bold hover:bg-slate-100 active:scale-95 transition-all flex items-center gap-2">
          <Camera size={18} /> Nhập thủ công mã
        </button>
      </div>
    </div>
  );
}
