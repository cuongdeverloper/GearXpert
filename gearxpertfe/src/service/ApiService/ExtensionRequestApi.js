import axios from "../AxiosCustomize";

export const getExtensionRequests = (supplierId) => {
  return axios.get(`/api/extension-requests/supplier/${supplierId}`);
};

export const approveExtension = (requestId) => {
  return axios.patch(`/api/extension-requests/${requestId}/approve`);
};

export const rejectExtension = (requestId, reason) => {
  return axios.patch(`/api/extension-requests/${requestId}/reject`, { reason });
};
