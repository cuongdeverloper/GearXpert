import axios from "../AxiosCustomize";

export const createDevice = (data) => {
  // Nếu là FormData (có upload ảnh), set content-type multipart
  if (data instanceof FormData) {
    return axios.post(`/api/devices`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
  return axios.post(`/api/devices`, data);
};

export const getDevices = (params = {}) => {
  // Ensure dates are in ISO format if present
  const formattedParams = { ...params };
  if (params.rentalStartDate) {
    formattedParams.rentalStartDate = new Date(params.rentalStartDate).toISOString();
  }
  if (params.rentalEndDate) {
    formattedParams.rentalEndDate = new Date(params.rentalEndDate).toISOString();
  }
  return axios.get(`/api/devices`, { params: formattedParams });
};

export const getSupplierDevices = (supplierId, params = {}) =>
  axios.get(`/api/devices/supplier/${supplierId}`, { params });

export const getDeviceDetail = (slug) =>
  axios.get(`/api/devices/${slug}`);

/** Supplier: danh sách DeviceItem của một thiết bị (ObjectId) */
export const getDeviceItemsForSupplier = (deviceId, params = {}) =>
  axios.get(`/api/devices/${deviceId}/items`, { params });

/**
 * Supplier: tạo DeviceItem mới.
 * `files` — mảng File (tối đa 5); gửi multipart field `images` giống tạo Device.
 */
export const createDeviceItemForSupplier = (deviceId, data, files = null) => {
  if (files && files.length > 0) {
    const fd = new FormData();
    if (data.serialNumber != null) fd.append("serialNumber", String(data.serialNumber));
    if (data.internalCode != null) fd.append("internalCode", String(data.internalCode));
    if (data.condition != null) fd.append("condition", String(data.condition));
    if (data.location && typeof data.location === "object") {
      fd.append("location", JSON.stringify(data.location));
    }
    files.slice(0, 5).forEach((file) => {
      if (file) fd.append("images", file);
    });
    return axios.post(`/api/devices/${deviceId}/items`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }
  return axios.post(`/api/devices/${deviceId}/items`, data);
};

export const getDeviceAvailableCount = (slug) =>
  axios.get(`/api/devices/${slug}/available-count`);

export const getDeviceAddons = (slug) =>
  axios.get(`/api/devices/${slug}/addons`);

export const getRelatedDevices = (slug) =>
  axios.get(`/api/devices/${slug}/related`);

export const updateDevice = (id, data) => {
  if (data instanceof FormData) {
    return axios.put(`/api/devices/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
  return axios.put(`/api/devices/${id}`, data);
};

export const deleteDevice = (id) =>
  axios.delete(`/api/devices/${id}`);
