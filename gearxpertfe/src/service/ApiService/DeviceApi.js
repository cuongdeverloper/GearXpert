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

export const getDeviceDetail = (id) =>
  axios.get(`/api/devices/${id}`);

export const getDeviceAddons = (id) =>
  axios.get(`/api/devices/${id}/addons`);

export const getRelatedDevices = (id) =>
  axios.get(`/api/devices/${id}/related`);

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
