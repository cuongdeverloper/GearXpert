import axios from "../AxiosCustomize";

// ===== Existing APIs — DO NOT MODIFY =====

const getSupplierProfile = async (supplierId) => {
  const res = await axios.get(`/api/suppliers/${supplierId}`);
  return res;
};

const updateSupplierProfile = async (formData) => {
  const res = await axios.put("/api/suppliers/profile", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res;
};

const getSupplierDevices = async (supplierId, params = {}) => {
  const res = await axios.get(`/api/suppliers/${supplierId}/devices`, {
    params,
  });
  return res;
};

// ===== NEW APIs — Storefront (public shop page) =====

const getSupplierStorefront = async (supplierId) => {
  const res = await axios.get(`/api/suppliers/${supplierId}/storefront`);
  return res;
};

const getSupplierStorefrontDevices = async (supplierId, params = {}) => {
  const res = await axios.get(
    `/api/suppliers/${supplierId}/storefront/devices`,
    { params }
  );
  return res;
};

const getSupplierStorefrontVouchers = async (supplierId) => {
  const res = await axios.get(
    `/api/suppliers/${supplierId}/storefront/vouchers`
  );
  return res;
};

// ===== Follow Store =====

const toggleFollowStore = async (supplierId) => {
  const res = await axios.post(`/api/suppliers/${supplierId}/follow`);
  return res;
};

const getFollowStatus = async (supplierId) => {
  const res = await axios.get(`/api/suppliers/${supplierId}/follow-status`);
  return res;
};

// ===== Customer: followed stores management =====

const getMyFollowedStores = async () => {
  const res = await axios.get("/api/suppliers/me/followed-stores");
  return res;
};

const updateFollowPrefs = async (followId, prefs) => {
  const res = await axios.patch(`/api/suppliers/me/follow-prefs/${followId}`, prefs);
  return res;
};

/** Supplier: tổng follower, mới 30 ngày, theo tháng (6 tháng) — cho dashboard */
const getMyFollowerAnalytics = async () => {
  const res = await axios.get("/api/suppliers/me/follower-analytics");
  return res;
};

const getPublicSuppliers = async (params = {}) => {
  const res = await axios.get("/api/suppliers/public", { params });
  return res;
};

const requestBecomeSupplier = (data) =>
    axios.post(`/api/suppliers-contract/become-supplier`, data); 

// Supplier contract (electronic signing)
const previewSupplierContract = (data) => {
  return axios.post(`/api/suppliers-contract/preview-contract`, data, {
    responseType: "blob",
  });
};

const getMySupplierContract = () => {
  return axios.get(`/api/suppliers-contract/my-contract`);
};

export {
  getSupplierProfile,
  updateSupplierProfile,
  getSupplierDevices,
  getSupplierStorefront,
  getSupplierStorefrontDevices,
  getSupplierStorefrontVouchers,
  toggleFollowStore,
  getFollowStatus,
  getMyFollowedStores,
  updateFollowPrefs,
  getMyFollowerAnalytics,
  getPublicSuppliers,
  requestBecomeSupplier,
  previewSupplierContract,
  getMySupplierContract
};
