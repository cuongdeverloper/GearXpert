import axios from "../AxiosCustomize";

// Lấy profile Supplier
 const getSupplierProfile = async (supplierId) => {
    const res = await axios.get(`/api/suppliers/${supplierId}`);
    return res;
  };
  
  // Cập nhật profile Supplier
   const updateSupplierProfile = async (formData) => {
    const res = await axios.put('/api/suppliers/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res;
  };
  
  // Lấy danh sách thiết bị
   const getSupplierDevices = async (supplierId, params = {}) => {
    const res = await axios.get(`/api/suppliers/${supplierId}/devices`, { params });
    return res;
  };
  export { 
    getSupplierProfile,updateSupplierProfile,getSupplierDevices
  };
  