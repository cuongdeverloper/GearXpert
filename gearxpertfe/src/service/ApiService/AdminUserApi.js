import axios from "../AxiosCustomize";

export const getAdminUsers = () => {
    return axios.get("/api/admin/users");
};

export const toggleUserStatus = (id) => {
    return axios.patch(`/api/admin/users/${id}/status`);
};
