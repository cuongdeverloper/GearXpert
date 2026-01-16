import axios from "../AxiosCustomize";

export const getDevices = (params = {}) =>
  axios.get(`/api/devices`, { params });

export const getDeviceDetail = (id) =>
  axios.get(`/api/devices/${id}`);

export const getDeviceAddons = (id) =>
  axios.get(`/api/devices/${id}/addons`);

export const getRelatedDevices = (id) =>
  axios.get(`/api/devices/${id}/related`);
