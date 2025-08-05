const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://dbzpvobjblvlxyxhbshl.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRienB2b2JqYmx2bHh5eGhic2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODg4OTcsImV4cCI6MjA2OTM2NDg5N30.JvUUUeVv3tCP1wtYmTVYShsPxJ4AdQ0fedX6nAWz1VE'
);

function authenticateToken(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return null;
  
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 인증 확인
  const user = authenticateToken(req);
  if (!user || user.role !== 'admin') {
    return res.status(401).json({ error: '관리자 권한이 필요합니다.' });
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    // 특정 라이선스 조회
    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: '라이선스를 찾을 수 없습니다.' });
    }

    return res.json(license);
  }

  if (req.method === 'PUT') {
    // 라이선스 수정
    const { name, description, max_users, is_active } = req.body;

    const { data: updatedLicense, error } = await supabase
      .from('licenses')
      .update({ name, description, max_users, is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: '라이선스 수정 중 오류가 발생했습니다.' });
    }

    return res.json({
      message: '라이선스가 성공적으로 수정되었습니다.',
      license: updatedLicense
    });
  }

  if (req.method === 'DELETE') {
    // 라이선스 삭제
    const { error } = await supabase
      .from('licenses')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: '라이선스 삭제 중 오류가 발생했습니다.' });
    }

    return res.json({ message: '라이선스가 성공적으로 삭제되었습니다.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};