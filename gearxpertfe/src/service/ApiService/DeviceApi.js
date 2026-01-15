import axios from "../AxiosCustomize";

export const getDevices = (params = {}) =>
  axios.get(`/devices`, { params });

export const getDeviceDetail = (id) =>
  axios.get(`/devices/${id}`);

export const getDeviceAddons = (id) =>
  axios.get(`/devices/${id}/addons`);

export const getRelatedDevices = (id) =>
  axios.get(`/devices/${id}/related`);
