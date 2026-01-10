import axios from '../../service/AxiosCustomize';

export const ApiLogin = (userEmail, userPassword) => {
  return axios.post('/api/auths/login', { email: userEmail, password: userPassword });
}

export const ApiRegister = async (fullName, email, password, phone, role, imageFile) => {
  const formData = new FormData();

  formData.append('fullName', fullName);
  formData.append('email', email);
  formData.append('password', password);
  formData.append('phone', phone);
  formData.append('role', role || 'CUSTOMER');

  if (imageFile) {
    formData.append('avatar', imageFile);
  }

  try {
    const response = await axios.post('/api/auths/register', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.error('Error during registration:', error);
    throw error;
  }
};

export const sendOTPApi = async (userId, otp) => {
  try {
    const response = await axios.post('/api/auths/verify-otp', { userId, OTP: otp });
    return response;
  } catch (error) {
    console.error("Error verifying OTP:", error.response ? error.response.data : error.message);
    return { errorCode: 1, message: 'Failed to verify OTP' };
  }
};

export const requestPasswordResetApi = async (email) => {
  try {
    const response = await axios.post('/api/auths/forgot-password', { email });
    return response;
  } catch (error) {
    console.log(error);
  }
};

export const resetPasswordApi = async (token, newPassword) => {
  try {
    const response = await axios.post('/api/auths/reset-password', { token, newPassword });
    return response;
  } catch (error) {
    console.log(error);
  }
};

export const verifyAccountApi = async (token) => {
  try {
    const response = await axios.get(`/api/auths/verify-account?token=${token}`);
    return response;
  } catch (error) {
    console.error("Error verifying account:", error);
    throw error;
  }
};