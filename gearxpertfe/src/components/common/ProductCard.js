import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ImageWithFallback from './ImageWithFallback';
import { toggleFavorite, checkIsFavorite } from '../../service/ApiService/FavoriteApi';
import { toast } from 'react-toastify';
import AuthRequirementModal from './AuthRequirementModal';

/**
 * ProductCard Component - Reusable product card for displaying devices/equipment
 * 
 * @param {Object} device - Device/product data
 * @param {string} variant - Card variant: 'detailed' (default) or 'simple'
 * @param {number} match - Match percentage for AI suggestions (optional)
 * @param {string} buttonText - Custom button text (default: 'Rent Gear')
 * @param {Function} onClick - Custom click handler (optional)
 * @param {string} className - Additional CSS classes
 * @param {boolean} isSelectedForCompare - Whether this device is selected for comparison
 * @param {Function} onToggleCompare - Handler to toggle compare selection
 */
export default function ProductCard({
  device,
  variant = 'detailed',
  match = null,
  buttonText,
  onClick,
  onFavoriteChange,
  className = '',
  isSelectedForCompare = false,       // ← Thêm prop này
  onToggleCompare,                     // ← Thêm prop này
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isAuthenticated = useSelector(state => state.user?.isAuthenticated || false);

  // Local state for favorite
  const [isFavorited, setIsFavorited] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Extract device data
  const deviceId = device?._id || device?.id;
  const name = device?.name || '';
  const getCategoryDisplay = (cat) => {
    return t(`categories.${cat}`, { defaultValue: cat });
  };
  const category = getCategoryDisplay(device?.category);
  const description = device?.description || '';
  const originalPrice = device?.rentPrice?.perDay || device?.price || 0;
  const discountPrice = device?.discountPrice || 0;
  const expiry = device?.discountExpiry ? new Date(device.discountExpiry) : null;
  const isExpired = expiry && expiry < new Date();
  const hasDiscount = discountPrice > 0 && discountPrice < originalPrice && !isExpired;
  const price = hasDiscount ? discountPrice : originalPrice;

  const image = device?.image || device?.images?.[0] || '';
  const rating = device?.ratingAvg || device?.rating || null;

  // Check stock availability - use availableQuantity from Device model (synced from DeviceItem)
  const availableQty = device?.availableQuantity ?? 0;
  const isOutOfStock = availableQty <= 0;

  // Load initial favorite status
  useEffect(() => {
    const loadFavoriteStatus = async () => {
      if (isAuthenticated && deviceId) {
        try {
          const response = await checkIsFavorite(deviceId);
          console.log("ProductCard favorite check response:", response);
          // Backend returns isFavorited field (axios auto-unwraps response)
          const isFav = response?.isFavorited ?? false;
          console.log("ProductCard setting favorite to:", isFav);
          setIsFavorited(isFav);
        } catch (error) {
          console.log("ProductCard favorite error:", error);
          setIsFavorited(false);
        }
      } else {
        setIsFavorited(false);
      }
    };

    loadFavoriteStatus();
  }, [deviceId, isAuthenticated]);

  if (!device) return null;

  const handleClick = () => {
    if (onClick) {
      onClick(device);
    } else if (device?.slug) {
      navigate(`/device/${device.slug}`);
    } else if (deviceId) {
      navigate(`/device/${deviceId}`);
    }
  };

  const handleToggleFavorite = async (e) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    if (isTogglingFavorite) return;

    const previousState = isFavorited;
    setIsFavorited(!isFavorited);
    setIsTogglingFavorite(true);

    try {
      const response = await toggleFavorite(deviceId);
      console.log("ProductCard toggle favorite response:", response);
      // Backend returns isFavorited field (axios auto-unwraps response)
      const isFav = response?.isFavorited ?? !previousState;
      console.log("ProductCard setting favorite to:", isFav);
      setIsFavorited(isFav);

      if (onFavoriteChange) onFavoriteChange(isFav);
    } catch (error) {
      setIsFavorited(previousState);
      console.error('Toggle favorite error:', error);

      if (error.response?.status === 401) {
        setIsAuthModalOpen(true);
      } else {
        toast.error('Failed to update favorite');
      }
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  // Match badge helpers (giữ nguyên)
  const getMatchBadgeColor = (matchValue) => {
    if (matchValue >= 95) return 'bg-accent-cyan text-white';
    return 'bg-slate-900 text-white';
  };

  const getMatchIcon = (matchValue) => {
    if (matchValue >= 95) return 'star';
    if (matchValue >= 90) return 'bolt';
    return 'auto_fix_high';
  };

  // Simple variant
  if (variant === 'simple') {
    return (
      <div
        className={`flex flex-col h-full w-full max-w-[320px] mx-auto snap-start group bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 cursor-pointer ${className}`}
        onClick={handleClick}
      >
        <div className="aspect-square rounded-xl overflow-hidden isolate mb-4 bg-slate-50 relative shrink-0">
          {/* Rating Badge */}
          {rating !== null && (
            <div className="absolute top-3 left-3 z-30 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 text-xs font-semibold text-gray-900">
              <span className="material-symbols-outlined text-[14px] fill-yellow-400 text-yellow-400">star</span>
              {rating.toFixed(1)}
            </div>
          )}


          {/* Favorite + Compare Buttons - Stack vertically */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
            {isAuthenticated && (
              <button
                onClick={handleToggleFavorite}
                className="bg-white/30 backdrop-blur-md border border-white/40 shadow-lg w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/50 transition-all"
                disabled={isTogglingFavorite}
              >
                <span className={`material-symbols-outlined text-[20px] transition-all ${isFavorited ? 'material-symbols-filled bg-gradient-to-r from-accent-cyan to-indigo-500 bg-clip-text text-transparent' : 'text-slate-600'}`}>
                  {isFavorited ? 'favorite' : 'favorite_border'}
                </span>
              </button>
            )}

            {/* Nút So Sánh */}
            {onToggleCompare && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCompare();
                }}
                className={`w-9 h-9 flex items-center justify-center rounded-full shadow-md transition-all ${
                  isSelectedForCompare
                    ? 'bg-indigo-600 text-white border-2 border-indigo-700 scale-110'
                    : 'bg-white/60 text-slate-700 border border-slate-300 hover:bg-indigo-500 hover:text-white hover:border-indigo-600'
                }`}
                title={isSelectedForCompare ? 'Remove from comparison' : 'Add to compare'}
              >
                <span className="material-symbols-outlined text-[20px]">balance</span>
              </button>
            )}
          </div>

          <div className={`w-full h-full bg-cover bg-center transition-transform duration-500 ${isOutOfStock ? 'grayscale' : 'group-hover:scale-110'}`}>
            <ImageWithFallback
              src={image}
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center z-10">
              <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-xl transform rotate-[-5deg] border-2 border-red-200">
                <p className="text-red-600 font-bold text-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                  Tạm hết hàng
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col flex-1">
          <h4 className="font-bold text-slate-900 font-display text-base mb-2 line-clamp-1 h-6 leading-tight" title={name}>
            {name}
          </h4>
          <div className="mt-auto pt-2 flex items-center justify-between border-t border-slate-50">
            <div className="flex flex-col">
              {hasDiscount && (
                <span className="text-[10px] text-slate-400 line-through leading-none mb-0.5">
                  {originalPrice.toLocaleString('vi-VN')}đ
                </span>
              )}
              <p className={`${hasDiscount ? 'text-red-500' : 'text-primary'} font-bold text-sm`}>
                {price.toLocaleString('vi-VN')}đ
                <span className="text-[10px] text-slate-400 font-normal ml-0.5">{t('common.per_day')}</span>
              </p>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{category}</span>
          </div>
        </div>
      </div>
    );
  }

  // Detailed variant
  return (
    <div
      className={`group relative bg-white rounded-2xl p-0 shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100 cursor-pointer ${match ? `ring-1 ring-slate-900` : ''} ${className}`}
      onClick={handleClick}
    >
      <div className="bg-white rounded-2xl overflow-hidden isolate flex flex-col h-full">
        {/* Image Section */}
        <div className="relative h-44 overflow-hidden rounded-t-[16px]">


          {/* Rating Badge */}
          {rating !== null && (
            <div className="absolute top-3 left-3 z-30 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1 text-xs font-semibold text-gray-900">
              <span className="material-symbols-outlined text-[14px] fill-yellow-400 text-yellow-400">star</span>
              {rating.toFixed(1)}
            </div>
          )}

          {/* Match Badge hidden as requested */}
          {false && match !== null && (
            <div className={`absolute ${rating !== null ? 'top-14' : 'top-4'} left-4 z-10 ${getMatchBadgeColor(match)} text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1`}>
              <span className="material-symbols-outlined text-[12px] fill-current">{getMatchIcon(match)}</span>
              {match}% Match
            </div>
          )}

          {/* Favorite + Compare - Stack vertically */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
            {isAuthenticated && (
              <button
                onClick={handleToggleFavorite}
                className="bg-white/30 backdrop-blur-md border border-white/40 shadow-md w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 transition-all"
                disabled={isTogglingFavorite}
              >
                <span className={`material-symbols-outlined text-[18px] transition-all ${isFavorited ? 'material-symbols-filled bg-gradient-to-r from-accent-cyan to-indigo-500 bg-clip-text text-transparent scale-110' : 'text-slate-600'}`}>
                  {isFavorited ? 'favorite' : 'favorite_border'}
                </span>
              </button>
            )}

            {/* Nút So Sánh */}
            {onToggleCompare && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCompare();
                }}
                className={`w-8 h-8 flex items-center justify-center rounded-full shadow-md transition-all backdrop-blur-md border ${
                  isSelectedForCompare
                    ? 'bg-indigo-600 border-indigo-700 text-white scale-110'
                    : 'bg-white/40 border-white/50 text-slate-700 hover:bg-indigo-500/80 hover:text-white hover:border-indigo-600'
                }`}
                title={isSelectedForCompare ? 'Remove from comparison' : 'Add to compare'}
              >
                <span className="material-symbols-outlined text-[18px]">balance</span>
              </button>
            )}
          </div>

          {/* Image */}
          <div className={`w-full h-full bg-cover bg-center transition-transform duration-700 ${isOutOfStock ? 'grayscale' : 'group-hover:scale-110'}`}>
            <ImageWithFallback
              src={image}
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center z-10">
              <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-xl transform rotate-[-5deg] border-2 border-red-200">
                <p className="text-red-600 font-bold text-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                  Tạm hết hàng
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4 flex flex-col flex-1">
          <span className="text-[9px] font-bold text-primary uppercase tracking-[0.15em]">
            {category}
          </span>
          <h3 className="text-base font-bold text-slate-900 mt-0.5 font-display line-clamp-1 min-h-[1.25rem]" title={name}>
            {name}
          </h3>
          {description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 flex-1">{description}</p>
          )}
          <div className="mt-auto pt-4 flex items-center justify-between">
            <div className="flex flex-col">
              {hasDiscount && (
                <span className="text-xs text-slate-400 line-through leading-none mb-0.5">
                  {originalPrice.toLocaleString('vi-VN')}đ
                </span>
              )}
              <span className={`text-lg font-bold ${hasDiscount ? 'text-red-500' : 'text-slate-900'}`}>
                {price.toLocaleString('vi-VN')}đ
                <span className="text-xs text-slate-400 font-normal ml-1">{t('common.per_day')}</span>
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isOutOfStock) handleClick();
              }}
              disabled={isOutOfStock}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors shadow-sm ${
                isOutOfStock
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {isOutOfStock ? 'Hết hàng' : (buttonText || t('productDetail.rent_now'))}
            </button>
          </div>
        </div>
      </div>

      <AuthRequirementModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}