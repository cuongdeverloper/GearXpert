import axios from "../AxiosCustomize";

export const toggleFavorite = (deviceId) =>
    axios.post(`/api/favorites/toggle`, { deviceId });

export const getUserFavorites = (params = {}) =>
    axios.get(`/api/favorites`, { params });

export const checkIsFavorite = (deviceId) =>
    axios.get(`/api/favorites/check/${deviceId}`);

export const getFavoriteDeviceIds = () =>
    axios.get(`/api/favorites/list`);
