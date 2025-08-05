const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
    console.log('사용자 로그인 API 호출됨');
    
    // Supabase 연결
    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dbzpvobjblvlxyxhbshl.supabase.co';
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRienB2b2JqYmx2bHh5eGhic2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODg4OTcsImV4cCI6MjA2OTM2NDg5N30.JvUUUeVv3tCP1wtYmTVYShsPxJ4AdQ0fedX6nAWz1VE';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: '이메일과 비밀번호가 필요합니다.' });
    }

    console.log('로그인 시도 - 이메일:', email);

    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (error) {
      console.error('사용자 조회 오류:', error);
      return res.status(500).json({ error: '데이터베이스 오류가 발생했습니다.' });
    }

    const user = users && users[0];
    if (!user) {
      return res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
    }

    console.log('사용자 인증 성공, 토큰 생성 중...');
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        organization_id: user.organization_id, 
        role: user.role, 
        isFirstLogin: user.is_first_login === 1 
      },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    console.log('사용자 로그인 성공');
    return res.json({
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        organization_id: user.organization_id, 
        isFirstLogin: user.is_first_login === 1 
      }
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};