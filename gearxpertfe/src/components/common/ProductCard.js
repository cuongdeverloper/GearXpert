import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useState, useEffect } from 'react';
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
 */
export default function ProductCard({
  device,
  variant = 'detailed',
  match = null,
  buttonText = 'Rent Gear',
  onClick,
  onFavoriteChange,
  className = ''
}) {
  const navigate = useNavigate();
  // const user = useSelector(state => state.user.account); // Removed unnecessary user selector
  const isAuthenticated = useSelector(state => state.user?.isAuthenticated || false);
  // const socket = user?.socketConnection; // Removed unused socket variable

  // Local state for favorite status with optimistic updates
  const [isFavorited, setIsFavorited] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Extract device data
  const deviceId = device?._id || device?.id;
  const name = device?.name || '';
  const category = device?.category || 'Equipment';
  const description = device?.description || '';
  const price = device?.price || device?.rentPrice?.perDay || 0;
  const image = device?.image || device?.images?.[0] || '';
  const rating = device?.ratingAvg || device?.rating || null;

  // Load initial favorite status
  useEffect(() => {
    const loadFavoriteStatus = async () => {
      if (isAuthenticated && deviceId) {
        try {
          const response = await checkIsFavorite(deviceId);
          // Handle both response.data.isFavorited and response.isFavorited
          const isFav = response?.data?.isFavorited ?? response?.isFavorited ?? false;
          setIsFavorited(isFav);
        } catch (error) {
          // Silently fail - not critical, just set to false
          setIsFavorited(false);
        }
      } else {
        // Reset to false if not authenticated
        setIsFavorited(false);
      }
    };

    loadFavoriteStatus();
  }, [deviceId, isAuthenticated]);

  // Early return after all hooks
  if (!device) return null;

  // Handle click
  const handleClick = () => {
    if (onClick) {
      onClick(device);
    } else if (deviceId) {
      navigate(`/device/${deviceId}`);
    }
  };

  // Handle favorite toggle
  const handleToggleFavorite = async (e) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    if (isTogglingFavorite) return;

    // Optimistic update
    const previousState = isFavorited;
    setIsFavorited(!isFavorited);
    setIsTogglingFavorite(true);

    try {
      const response = await toggleFavorite(deviceId);

      // Handle both response.data.isFavorited and response.isFavorited
      const isFav = response?.data?.isFavorited ?? response?.isFavorited ?? !previousState;
      setIsFavorited(isFav);

      // Notify parent if callback exists
      if (onFavoriteChange) {
        onFavoriteChange(isFav);
      }

      // Removed toast messages as requested
    } catch (error) {
      // Revert on error
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

  // Match badge helpers
  const getMatchBadgeColor = (matchValue) => {
    if (matchValue >= 95) return 'bg-accent-cyan text-white';
    return 'bg-slate-900 text-white';
  };

  const getMatchIcon = (matchValue) => {
    if (matchValue >= 95) return 'star';
    if (matchValue >= 90) return 'bolt';
    return 'auto_fix_high';
  };

  const getRingColor = (matchValue) => {
    if (matchValue >= 95) return 'ring-accent-cyan/50';
    if (matchValue >= 90) return 'ring-accent-cyan/30';
    return 'ring-accent-cyan/20';
  };

  // Simple variant (for NewArrivalsSection)
  if (variant === 'simple') {
    return (
      <div
        className={`min-w-[280px] snap-start group bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer ${className}`}
        onClick={handleClick}
      >
        <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-4 bg-slate-50 relative">
          {/* Rating Badge - Top Left */}
          {rating !== null && (
            <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 text-xs font-semibold text-gray-900">
              <span className="material-symbols-outlined text-[14px] fill-yellow-400 text-yellow-400">star</span>
              {rating.toFixed(1)}
            </div>
          )}

          {/* Favorite Heart - Top Right */}
          {isAuthenticated && (
            <button
              onClick={handleToggleFavorite}
              className="absolute top-3 right-3 z-10 bg-white/30 backdrop-blur-md border border-white/40 shadow-lg w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/50 transition-all"
              disabled={isTogglingFavorite}
            >
              <span className={`material-symbols-outlined text-[20px] transition-all ${isFavorited ? 'material-symbols-filled bg-gradient-to-r from-accent-cyan to-indigo-500 bg-clip-text text-transparent' : 'text-slate-600'
                }`}>
                {isFavorited ? 'favorite' : 'favorite_border'}
              </span>
            </button>
          )}

          <div className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110">
            <ImageWithFallback
              src={image}
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <h4 className="font-bold text-slate-900 font-display text-lg">{name}</h4>
        <div className="flex items-center justify-between mt-2">
          <p className="text-primary font-bold">${price.toLocaleString('vi-VN')}/day</p>
          <span className="text-xs text-slate-400">{category}</span>
        </div>
      </div>
    );
  }

  // Detailed variant (for AISuggestedSection)
  return (
    <div
      className={`group relative bg-white rounded-3xl p-1 shadow-lg hover:shadow-glow-cyan transition-all duration-300 border border-slate-100 ${match ? `ring-2 ${getRingColor(match)}` : ''
        } ${className}`}
    >
      <div className="bg-white rounded-[22px] overflow-hidden flex flex-col h-full">
        {/* Image Section */}
        <div className="relative h-64">
          {/* Rating Badge - Top Left (always show if available) */}
          {rating !== null && (
            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 text-sm font-semibold text-gray-900">
              <span className="material-symbols-outlined text-[16px] fill-yellow-400 text-yellow-400">star</span>
              {rating.toFixed(1)}
            </div>
          )}

          {/* Match Badge - Below Rating if both exist */}
          {match !== null && (
            <div className={`absolute ${rating !== null ? 'top-14' : 'top-4'} left-4 z-10 ${getMatchBadgeColor(match)} text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1`}>
              <span className="material-symbols-outlined text-[12px] fill-current">{getMatchIcon(match)}</span>
              {match}% Match
            </div>
          )}

          {/* Favorite Heart - Top Right */}
          {isAuthenticated && (
            <button
              onClick={handleToggleFavorite}
              className="absolute top-4 right-4 z-10 bg-white/30 backdrop-blur-md border border-white/40 shadow-lg w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/50 transition-all hover:shadow-glow-indigo"
              disabled={isTogglingFavorite}
            >
              <span className={`material-symbols-outlined text-[24px] transition-all ${isFavorited ? 'material-symbols-filled bg-gradient-to-r from-accent-cyan to-indigo-500 bg-clip-text text-transparent scale-110' : 'text-slate-600'
                }`}>
                {isFavorited ? 'favorite' : 'favorite_border'}
              </span>
            </button>
          )}

          {/* Image */}
          <div className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-700">
            <ImageWithFallback
              src={image}
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6">
          {/* Category */}
          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
            {category}
          </span>

          {/* Name */}
          <h3 className="text-xl font-bold text-slate-900 mt-1 font-display">{name}</h3>

          {/* Description */}
          {description && (
            <p className="text-sm text-slate-500 mt-2 line-clamp-2">{description}</p>
          )}

          {/* Price & Button */}
          <div className="mt-6 flex items-center justify-between">
            <span className="text-2xl font-bold text-slate-900">
              ${price.toLocaleString('vi-VN')}
              <span className="text-sm text-slate-400 font-normal">/day</span>
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-md"
            >
              {buttonText}
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
