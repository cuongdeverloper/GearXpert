import axios from "../AxiosCustomize";


export const getSmartGearSuggestion = (data) => 
  axios.post(`/api/smartgear/suggest`, data);

export const addComboToCart = (data) => 
  axios.post(`/api/cart/combo`, data);