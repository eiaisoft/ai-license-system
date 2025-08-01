import axios from "axios";

// 환경에 따른 API URL 설정
const API_BASE_URL = process.env.NODE_ENV === "production" 
  ? "" 
  : "http://localhost:3000";

// axios 기본 설정
axios.defaults.baseURL = API_BASE_URL;

export default API_BASE_URL;
export { API_BASE_URL };