import axios from "../AxiosCustomize";

export const getCurrentUser = () =>
  axios.get(`/api/auths/me`);

export const updateProfile = (formData) =>
  axios.put(`/api/auths/update-profile`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

export const changePassword = (data) =>
  axios.post(`/api/auths/change-password`, data);

export const sendOTPForPasswordChange = (oldPassword) =>
  axios.post(`/api/auths/send-otp-change-password`, { oldPassword });

export const saveSignature = (signatureDataUrl) =>
  axios.post(`/api/auths/save-signature`, { signatureDataUrl });
