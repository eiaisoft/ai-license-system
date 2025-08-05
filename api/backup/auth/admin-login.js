const jwt = require('jsonwebtoken');

// 관리자 이메일 설정
const ADMIN_EMAIL = 'admin@eiaisoft.com';

export default async function handler(req, res) {
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

  const { email, password } = req.body;
  
  if (email !== ADMIN_EMAIL) {
    return res.status(401).json({ error: '관리자 이메일이 아닙니다.' });
  }

  // 관리자 계정 확인
  const adminPassword = process.env.ADMIN_PASSWORD || 'rlaalgp0501@@';
  const isMatch = password === adminPassword;
  
  if (!isMatch) {
    return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
  }

  const token = jwt.sign(
    { 
      id: 'admin',
      email: ADMIN_EMAIL, 
      role: 'admin'
    },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: 'admin',
      name: '관리자',
      email: ADMIN_EMAIL,
      role: 'admin'
    }
  });
}