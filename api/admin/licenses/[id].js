const { createClient } = require('@supabase/supabase-js');
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 인증 확인
    const user = authenticateToken(req);
    
    // URL에서 ID 추출
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: '라이선스 ID가 필요합니다.' });
    }

    if (req.method === 'PUT') {
      const { name, organization, license_id, max_loan_days } = req.body;

      if (!name || !organization || !license_id || !max_loan_days) {
        return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
      }

      try {
        const { data: updatedLicense, error: updateError } = await supabase
          .from('ai_licenses')
          .update({
            name: name.trim(),
            description: `${name.trim()} License`,
            organization: organization.trim(),
            license_id: license_id.trim(),
            max_loan_days: parseInt(max_loan_days),
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          console.error('라이선스 수정 오류:', updateError);
          return res.status(500).json({ 
            error: '라이선스 수정 중 오류가 발생했습니다.',
            details: updateError.message 
          });
        }

        return res.json({
          message: '라이선스가 성공적으로 수정되었습니다.',
          license: updatedLicense
        });
        
      } catch (err) {
        console.error('라이선스 수정 예외:', err);
        return res.status(500).json({ 
          error: '라이선스 수정 중 예외가 발생했습니다.',
          details: err.message 
        });
      }
    }

    if (req.method === 'DELETE') {
      try {
        // 해당 라이선스의 대출 내역 확인
        const { data: loans, error: loanError } = await supabase
          .from('license_loans')
          .select('id')
          .eq('license_id', id)
          .eq('status', 'active');

        if (loanError) {
          return res.status(500).json({ error: '대출 내역 확인 중 오류가 발생했습니다.' });
        }

        if (loans && loans.length > 0) {
          return res.status(400).json({ 
            error: '현재 대출 중인 라이선스는 삭제할 수 없습니다.' 
          });
        }

        const { error: deleteError } = await supabase
          .from('ai_licenses')
          .delete()
          .eq('id', id);

        if (deleteError) {
          return res.status(500).json({ error: '라이선스 삭제 중 오류가 발생했습니다.' });
        }

        return res.json({ message: '라이선스가 성공적으로 삭제되었습니다.' });
        
      } catch (err) {
        console.error('라이선스 삭제 예외:', err);
        return res.status(500).json({ 
          error: '라이선스 삭제 중 예외가 발생했습니다.',
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