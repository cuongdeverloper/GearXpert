export const getChatDisplayProfile = (rawProfile) => {
  const profile = rawProfile?.data || rawProfile || {};
  const storeName = profile?.supplierProfile?.businessName || "";
  const storeAvatar = profile?.supplierProfile?.businessAvatar || "";
  const fallbackName = profile?.fullName || profile?.username || "User";
  const fallbackAvatar = profile?.avatar || profile?.image || "/default-avatar.png";

  return {
    name: profile?.chatDisplayName || storeName || fallbackName,
    avatar: profile?.chatDisplayAvatar || storeAvatar || fallbackAvatar,
    isStoreIdentity: Boolean(storeName),
  };
};
