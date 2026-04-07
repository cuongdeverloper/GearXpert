import axios from "../AxiosCustomize";

export const getExtensionRequests = (supplierId, status = null) => {
  let url = `/api/extension-requests/supplier/${supplierId}`;
  if (status) {
    url += `?status=${status}`;
  }
  return axios.get(url);
};

export const approveExtension = (requestId) => {
  return axios.patch(`/api/extension-requests/${requestId}/approve`);
};

export const rejectExtension = (requestId, reason) => {
  return axios.patch(`/api/extension-requests/${requestId}/reject`, { reason });
};
