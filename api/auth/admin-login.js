const jwt = require('jsonwebtoken');

// 관리자 이메일 설정
const ADMIN_EMAIL = 'admin@eiaisoft.com';

module.exports = async (req, res) => {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('관리자 로그인 API 호출됨');
    console.log('Request body:', req.body);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('이메일 또는 비밀번호 누락');
      return res.status(400).json({ error: '이메일과 비밀번호가 필요합니다.' });
    }
    
    console.log('입력된 이메일:', email);
    console.log('관리자 이메일:', ADMIN_EMAIL);
    
    if (email !== ADMIN_EMAIL) {
      console.log('관리자 이메일 불일치');
      return res.status(401).json({ error: '관리자 이메일이 아닙니다.' });
    }

    // 관리자 계정 확인
    const adminPassword = process.env.ADMIN_PASSWORD || 'rlaalgp0501@@';
    console.log('비밀번호 확인 중...');
    
    if (password !== adminPassword) {
      console.log('비밀번호 불일치');
      return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
    }

    console.log('관리자 인증 성공, 토큰 생성 중...');
    const token = jwt.sign(
      { 
        id: 'admin',
        email: ADMIN_EMAIL, 
        role: 'admin'
      },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    console.log('토큰 생성 완료');
    return res.status(200).json({
      token,
      user: {
        id: 'admin',
        name: '관리자',
        email: ADMIN_EMAIL,
        role: 'admin'
      }
    });
    
  } catch (error) {
    console.error('관리자 로그인 오류:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};