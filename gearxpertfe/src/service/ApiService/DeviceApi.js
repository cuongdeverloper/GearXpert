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

export const getDevices = (params = {}) =>
  axios.get(`/api/devices`, { params });

export const getSupplierDevices = (supplierId, params = {}) =>
  axios.get(`/api/devices/supplier/${supplierId}`, { params });

export const getDeviceDetail = (slug) =>
  axios.get(`/api/devices/${slug}`);

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
