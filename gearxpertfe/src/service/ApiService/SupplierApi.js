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

export {
  getSupplierProfile,
  updateSupplierProfile,
  getSupplierDevices,
  getSupplierStorefront,
  getSupplierStorefrontDevices,
  getSupplierStorefrontVouchers,
  toggleFollowStore,
  getFollowStatus,
};
