import axios from "../AxiosCustomize";

export const postAdvertisement = (formData) =>
    axios.post(`/api/advertisements`, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

export const getMyAdvertisements = () =>
    axios.get(`/api/advertisements/my-ads`);

export const getAllAdvertisementsForAdmin = () =>
    axios.get(`/api/advertisements`);

export const updateAdvertisementStatus = (id, status) =>
    axios.patch(`/api/advertisements/${id}/status`, { status });

export const getApprovedBanners = () =>
    axios.get(`/api/advertisements/public/banners`);

export const getApprovedPopups = () =>
    axios.get(`/api/advertisements/public/popups`);

export const deleteAdvertisement = (id) =>
    axios.delete(`/api/advertisements/${id}`);
