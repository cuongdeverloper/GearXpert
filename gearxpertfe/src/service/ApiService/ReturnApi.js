import axios from "../AxiosCustomize";

export const getReturnRecordsByRental = (rentalId) =>
  axios.get(`/api/returns/rentals/${rentalId}`);

export const createReturnDraft = (rentalId, payload = {}) =>
  axios.post(`/api/returns/rentals/${rentalId}/draft`, payload);

export const startReturnRecord = (returnRecordId) =>
  axios.patch(`/api/returns/${returnRecordId}/start`);

export const saveReturnInspection = (returnRecordId, payload) =>
  axios.patch(`/api/returns/${returnRecordId}/inspection`, payload);

export const confirmReturnRecordSuccess = (returnRecordId, payload) =>
  axios.post(`/api/returns/${returnRecordId}/confirm-success`, payload);

export const failReturnRecord = (returnRecordId, payload) =>
  axios.post(`/api/returns/${returnRecordId}/fail`, payload);

export const createReturnRetryAttempt = (rentalId, payload = {}) =>
  axios.post(`/api/returns/rentals/${rentalId}/retry`, payload);
