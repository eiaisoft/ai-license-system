const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// JWT 토큰 검증 미들웨어
const authenticateToken = (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new Error('토큰이 필요합니다.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    return decoded;
  } catch (error) {
    throw new Error('유효하지 않은 토큰입니다.');
  }
};

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
    console.log('비밀번호 변경 API 호출됨');
    
    // 토큰 검증
    const user = authenticateToken(req);
    
    // Supabase 연결
    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dbzpvobjblvlxyxhbshl.supabase.co';
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRienB2b2JqYmx2bHh5eGhic2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODg4OTcsImV4cCI6MjA2OTM2NDg5N30.JvUUUeVv3tCP1wtYmTVYShsPxJ4AdQ0fedX6nAWz1VE';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { currentPassword, newPassword } = req.body;
    const { id } = user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '새 비밀번호는 최소 6자 이상이어야 합니다.' });
    }

    console.log('사용자 정보 조회 중...');
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !userData) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 현재 비밀번호 확인
    const isMatch = await bcrypt.compare(currentPassword, userData.password);
    if (!isMatch) {
      return res.status(400).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
    }

    // 새 비밀번호 해싱
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 비밀번호 업데이트
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password: hashedNewPassword, 
        is_first_login: false 
      })
      .eq('id', id);

    if (updateError) {
      console.error('비밀번호 변경 오류:', updateError);
      return res.status(500).json({ error: '비밀번호 변경 중 오류가 발생했습니다.' });
    }

    console.log('비밀번호 변경 성공');
    return res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    if (error.message === '토큰이 필요합니다.' || error.message === '유효하지 않은 토큰입니다.') {
      return res.status(401).json({ error: error.message });
    }
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};