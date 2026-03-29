import axios from "../AxiosCustomize";

export const getHandoverAttemptsByRental = (rentalId) =>
  axios.get(`/api/handovers/rentals/${rentalId}`);

export const createHandoverDraft = (rentalId, payload = {}) =>
  axios.post(`/api/handovers/rentals/${rentalId}/draft`, payload);

export const startHandover = (handoverId) =>
  axios.patch(`/api/handovers/${handoverId}/start`);

export const saveHandoverInspection = (handoverId, payload) =>
  axios.patch(`/api/handovers/${handoverId}/inspection`, payload);

export const confirmHandoverSuccess = (handoverId, payload) =>
  payload instanceof FormData
    ? axios.post(`/api/handovers/${handoverId}/confirm-success`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    : axios.post(`/api/handovers/${handoverId}/confirm-success`, payload);

export const failHandover = (handoverId, payload) =>
  payload instanceof FormData
    ? axios.post(`/api/handovers/${handoverId}/fail`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    : axios.post(`/api/handovers/${handoverId}/fail`, payload);

export const createHandoverRedelivery = (rentalId, payload = {}) =>
  axios.post(`/api/handovers/rentals/${rentalId}/redelivery`, payload);
