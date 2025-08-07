import axios from 'axios';

// API 기본 URL 설정
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' // 프로덕션에서는 상대 경로 사용 (Vercel rewrites 활용)
  : 'http://localhost:3002'; // 개발 환경에서는 로컬 서버

// axios 기본 설정
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.timeout = 10000;

// 요청 인터셉터
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { API_BASE_URL };
export default axios;