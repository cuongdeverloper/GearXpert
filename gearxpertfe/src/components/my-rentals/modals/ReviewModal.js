// modals/ReviewModal.jsx
import React from "react";
import { Star, Camera, XCircle, Check } from "lucide-react";

export default function ReviewModal({
  reviewModal,
  setReviewModal,
  reviewSelectedItems,
  setReviewSelectedItems,
  hasReviewed = false,
  reviewLoading,
  handleSubmitReview,
  handleFileUpload,
}) {
  if (!reviewModal?.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
        onClick={() => setReviewModal({ ...reviewModal, isOpen: false })}
      />

      <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="p-8 text-center">
          <h3 className="text-2xl font-black text-gray-900 uppercase italic mb-2">
            Đánh giá dịch vụ
          </h3>
          <p className="text-gray-400 text-xs font-medium mb-8">
            Chia sẻ trải nghiệm thuê thiết bị của bạn
          </p>

          {/* Rating Stars */}
          <div className="flex justify-center gap-3 mb-8">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setReviewModal({ ...reviewModal, rating: star })}
                disabled={hasReviewed || reviewLoading}
                className="transition-transform hover:scale-110 disabled:opacity-50"
              >
                <Star
                  size={32}
                  className={
                    star <= reviewModal.rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-200"
                  }
                />
              </button>
            ))}
          </div>

          {/* Chọn thiết bị (nếu có nhiều) */}
          {reviewModal.order?.items?.length > 1 && (
            <div className="space-y-2 mb-6">
              <label className="text-xs font-bold text-gray-700 ml-3 uppercase tracking-wider">
                Chọn thiết bị để đánh giá ({reviewSelectedItems.length})
              </label>
              <div className="grid gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {reviewModal.order.items.map((item) => {
                  const isSelected = reviewSelectedItems.includes(item._id);
                  return (
                    <div
                      key={item._id}
                      onClick={() => {
                        const next = isSelected
                          ? reviewSelectedItems.filter((id) => id !== item._id)
                          : [...reviewSelectedItems, item._id];
                        setReviewSelectedItems(next);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-100 bg-white hover:border-gray-200"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "bg-emerald-500" : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <Check
                            size={12}
                            className="text-white"
                            strokeWidth={4}
                          />
                        )}
                      </div>
                      <img
                        src={item.deviceId?.images?.[0]}
                        className="w-10 h-10 rounded-lg object-cover"
                        alt=""
                      />
                      <div className="flex-1 text-left">
                        <p className="text-[11px] font-black text-gray-800">
                          {item.deviceId?.name}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <textarea
            rows={3}
            placeholder="Bạn cảm thấy thiết bị thế nào? Hãy chia sẻ nhé..."
            className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none resize-none text-sm mb-4"
            value={reviewModal.comment}
            onChange={(e) =>
              setReviewModal({ ...reviewModal, comment: e.target.value })
            }
            disabled={hasReviewed || reviewLoading}
          />

          {/* Upload ảnh review */}
          <div className="flex flex-wrap gap-3 mb-8 justify-center">
            {reviewModal.files.map((file, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt="preview"
                  className="w-20 h-20 rounded-xl object-cover border"
                />
                <button
                  onClick={() =>
                    setReviewModal({
                      ...reviewModal,
                      files: reviewModal.files.filter((_, i) => i !== idx),
                    })
                  }
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100"
                >
                  <XCircle size={12} />
                </button>
              </div>
            ))}
            <label className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-[10px] font-bold uppercase cursor-pointer flex items-center gap-2 hover:bg-gray-200">
              <Camera size={14} /> Thêm ảnh thực tế
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  handleFileUpload(e.target.files, setReviewModal)
                }
                disabled={hasReviewed || reviewLoading}
              />
            </label>
          </div>

          <button
            onClick={handleSubmitReview}
            disabled={reviewLoading || hasReviewed || reviewModal.rating === 0}
            className={`w-full py-4 rounded-2xl text-white font-black uppercase italic shadow-xl transition-all ${
              reviewLoading || hasReviewed
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gray-900 hover:scale-[1.02]"
            }`}
          >
            {reviewLoading
              ? "Đang gửi..."
              : hasReviewed
              ? "Đã đánh giá"
              : "Gửi đánh giá"}
          </button>
        </div>
      </div>
    </div>
  );
}
