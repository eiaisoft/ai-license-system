const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

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
    console.log('사용자 회원가입 API 호출됨');
    
    // Supabase 연결
    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dbzpvobjblvlxyxhbshl.supabase.co';
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRienB2b2JqYmx2bHh5eGhic2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODg4OTcsImV4cCI6MjA2OTM2NDg5N30.JvUUUeVv3tCP1wtYmTVYShsPxJ4AdQ0fedX6nAWz1VE';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { name, email, password, organization_id } = req.body;
    
    if (!name || !email || !password || !organization_id) {
      return res.status(400).json({ error: '모든 필드가 필요합니다.' });
    }
    
    console.log('회원가입 시도 - 이메일:', email);

    // 이메일 중복 확인
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (checkError) {
      console.error('사용자 중복 확인 오류:', checkError);
      return res.status(500).json({ error: '데이터베이스 오류가 발생했습니다.' });
    }

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ error: '이미 존재하는 이메일입니다.' });
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // 사용자 생성
    const { error: insertError } = await supabase
      .from('users')
      .insert([{ 
        id: userId, 
        name, 
        email, 
        password: hashedPassword, 
        organization_id, 
        is_first_login: 1, 
        created_at: new Date().toISOString() 
      }]);

    if (insertError) {
      console.error('회원가입 오류:', insertError);
      return res.status(500).json({ error: '회원가입 중 오류가 발생했습니다.' });
    }

    console.log('회원가입 성공, 토큰 생성 중...');
    const token = jwt.sign(
      { 
        id: userId, 
        email, 
        organization_id, 
        role: 'user', 
        isFirstLogin: true 
      },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    console.log('회원가입 완료');
    return res.status(201).json({
      token,
      user: { 
        id: userId, 
        name, 
        email, 
        role: 'user', 
        organization_id, 
        isFirstLogin: true 
      }
    });
  } catch (error) {
    console.error('회원가입 오류:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};