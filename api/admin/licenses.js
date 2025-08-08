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
      try {
        const { data: licenses, error } = await supabase
          .from('ai_licenses')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('라이선스 조회 오류:', error);
          return res.status(500).json({ 
            error: '라이선스 목록 조회 중 오류가 발생했습니다.',
            details: error.message 
          });
        }

        return res.json(licenses || []);
        
      } catch (err) {
        console.error('예외 발생:', err);
        return res.status(500).json({ 
          error: '서버 내부 오류가 발생했습니다.',
          details: err.message 
        });
      }
    }
    
    if (req.method === 'POST') {
      const { name, organization, license_id, max_loan_days } = req.body;

      if (!name || !organization || !license_id || !max_loan_days) {
        return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
      }

      try {
        // 전북대학교 organization_id 조회
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('email_domain', 'jbnu.ac.kr')
          .single();

        if (orgError || !orgData) {
          return res.status(500).json({ 
            error: '기관 정보를 찾을 수 없습니다.',
            details: orgError?.message 
          });
        }

        const newLicenseId = uuidv4();
        const insertData = {
          id: newLicenseId,
          organization_id: orgData.id,
          name: name.trim(),
          description: '', // 빈 값으로 설정
          total_count: 1, // 기본값을 1로 변경
          available_count: 1, // 기본값을 1로 변경
          organization: organization.trim(),
          license_id: license_id.trim(),
          max_loan_days: parseInt(max_loan_days),
          status: 'active',
          created_at: new Date().toISOString()
        };

        const { data: newLicense, error: insertError } = await supabase
          .from('ai_licenses')
          .insert([insertData])
          .select()
          .single();

        if (insertError) {
          console.error('라이선스 추가 오류:', insertError);
          return res.status(500).json({ 
            error: '라이선스 추가 중 오류가 발생했습니다.',
            details: insertError.message 
          });
        }

        return res.status(201).json({
          message: '라이선스가 성공적으로 추가되었습니다.',
          license: newLicense
        });
        
      } catch (err) {
        console.error('라이선스 추가 예외:', err);
        return res.status(500).json({ 
          error: '라이선스 추가 중 예외가 발생했습니다.',
          details: err.message 
        });
      }
    }

    return res.status(405).json({ error: '지원하지 않는 메소드입니다.' });
    
  } catch (error) {
    console.error('API 오류:', error);
    if (error.message.includes('토큰') || error.message.includes('권한')) {
      return res.status(401).json({ error: error.message });
    }
    return res.status(500).json({ 
      error: '서버 오류가 발생했습니다.',
      details: error.message 
    });
  }
};