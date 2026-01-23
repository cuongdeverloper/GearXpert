import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useState } from "react";

export default function ImageGalleryModal({ isOpen, onClose, images = [], deviceName = "" }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-slate-50 to-white">
              <h2 className="text-lg font-bold text-slate-900">{deviceName}</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Gallery */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Main Image */}
                <div className="relative w-full aspect-video bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center group">
                  <img
                    src={images[currentIndex]}
                    alt={`${deviceName} - ${currentIndex + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/400x300?text=No+Image";
                    }}
                  />

                  {/* Navigation Buttons */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={handlePrev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/80 text-slate-600 hover:bg-white transition opacity-0 group-hover:opacity-100"
                      >
                        <FiChevronLeft size={24} />
                      </button>
                      <button
                        onClick={handleNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/80 text-slate-600 hover:bg-white transition opacity-0 group-hover:opacity-100"
                      >
                        <FiChevronRight size={24} />
                      </button>
                    </>
                  )}

                  {/* Image Counter */}
                  <div className="absolute bottom-4 right-4 px-3 py-1 rounded-lg bg-black/60 text-white text-sm font-medium">
                    {currentIndex + 1} / {images.length}
                  </div>
                </div>

                {/* Thumbnail Grid */}
                {images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                          index === currentIndex
                            ? "border-primary shadow-md"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <img
                          src={image}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/100x100?text=No";
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
