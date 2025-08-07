const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://dbzpvobjblvlxyxhbshl.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRienB2b2JqYmx2bHh5eGhic2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODg4OTcsImV4cCI6MjA2OTM2NDg5N30.JvUUUeVv3tCP1wtYmTVYShsPxJ4AdQ0fedX6nAWz1VE'
);

// JWT 토큰 인증 함수
function authenticateToken(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    throw new Error('토큰이 필요합니다.');
  }
  
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    if (user.role !== 'admin') {
      throw new Error('관리자 권한이 필요합니다.');
    }
    return user;
  } catch (err) {
    throw new Error('유효하지 않은 토큰입니다.');
  }
}

module.exports = async (req, res) => {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 인증 확인
    const user = authenticateToken(req);
    
    if (req.method === 'GET') {
      // 기관 목록 조회
      const { data: organizations, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: '기관 목록 조회 중 오류가 발생했습니다.' });
      }

      return res.json(organizations || []);
    }
    
    if (req.method === 'POST') {
      // 기관 추가
      const { name, email_domain, auto_login_enabled = true } = req.body;

      if (!name || !email_domain) {
        return res.status(400).json({ error: '기관명과 이메일 도메인을 입력해주세요.' });
      }

      // 도메인 중복 확인
      const { data: existingOrg, error: checkError } = await supabase
        .from('organizations')
        .select('*')
        .eq('email_domain', email_domain)
        .limit(1);

      if (checkError) {
        return res.status(500).json({ error: '도메인 확인 중 오류가 발생했습니다.' });
      }

      if (existingOrg && existingOrg.length > 0) {
        return res.status(400).json({ error: '이미 등록된 도메인입니다.' });
      }

      const orgId = uuidv4();
      const { data: newOrg, error: insertError } = await supabase
        .from('organizations')
        .insert([
          {
            id: orgId,
            name,
            email_domain,
            auto_login_enabled,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (insertError) {
        return res.status(500).json({ error: '기관 등록 중 오류가 발생했습니다.' });
      }

      return res.status(201).json({
        message: '기관이 성공적으로 등록되었습니다.',
        organization: newOrg
      });
    }

    return res.status(405).json({ error: '지원하지 않는 메소드입니다.' });
    
  } catch (error) {
    console.error('API 오류:', error);
    if (error.message.includes('토큰') || error.message.includes('권한')) {
      return res.status(401).json({ error: error.message });
    }
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};