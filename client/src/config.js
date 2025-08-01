// 환경에 따른 API URL 설정
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' // Vercel에서는 같은 도메인 사용
  : 'http://localhost:3000'; // 서버 포트로 수정!

export default API_BASE_URL;
export { API_BASE_URL };