import axios from "../AxiosCustomize";

// GET /api/admin/disputes
export const getDisputes = (params = {}) =>
  axios.get("/api/admin/disputes", { params });

// GET /api/admin/disputes/:caseType/:id
export const getDisputeDetail = (caseType, id) =>
  axios.get(`/api/admin/disputes/${caseType}/${id}`);

// PATCH /api/admin/disputes/:caseType/:id
export const updateDispute = (caseType, id, data) =>
  axios.patch(`/api/admin/disputes/${caseType}/${id}`, data);

// GET /api/admin/admins
export const getAdminList = () =>
  axios.get("/api/admin/admins");
