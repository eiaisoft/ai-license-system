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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
        // organization_id 의존성 제거 - 직접 라이선스 추가
        const insertData = {
          id: uuidv4(),
          name,
          organization,  // 이것은 organization_id (UUID)여야 함
          license_id,    // 이 필드는 스키마에 없음
          max_loan_days: parseInt(max_loan_days),
          is_available: true,  // 이 필드는 스키마에 없음
          created_at: new Date().toISOString()
        };
        // 누락된 필드: description, total_licenses, available_licenses

        const { data, error } = await supabase
          .from('ai_licenses')
          .insert([insertData])
          .select();

        if (error) {
          console.error('라이선스 추가 오류:', error);
          return res.status(500).json({ 
            error: '라이선스 추가에 실패했습니다.',
            details: error.message 
          });
        }

        return res.status(201).json({ 
          message: '라이선스가 성공적으로 추가되었습니다.',
          license: data[0]
        });

      } catch (err) {
        console.error('예외 발생:', err);
        return res.status(500).json({ 
          error: '서버 내부 오류가 발생했습니다.',
          details: err.message 
        });
      }
    }
    
    // PUT 메서드 추가 (라이선스 수정)
    if (req.method === 'PUT') {
      const { name, organization, license_id, max_loan_days } = req.body;
      const licenseId = req.url.split('/').pop(); // URL에서 ID 추출

      if (!name || !organization || !license_id || !max_loan_days) {
        return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
      }

      try {
        const { data: updatedLicense, error: updateError } = await supabase
          .from('ai_licenses')
          .update({
            name: name.trim(),
            organization: organization.trim(),
            license_id: license_id.trim(),
            max_loan_days: parseInt(max_loan_days)
          })
          .eq('id', licenseId)
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
    
    // DELETE 메서드 추가 (라이선스 삭제)
    if (req.method === 'DELETE') {
      const licenseId = req.url.split('/').pop(); // URL에서 ID 추출

      try {
        const { error: deleteError } = await supabase
          .from('ai_licenses')
          .delete()
          .eq('id', licenseId);

        if (deleteError) {
          console.error('라이선스 삭제 오류:', deleteError);
          return res.status(500).json({ 
            error: '라이선스 삭제 중 오류가 발생했습니다.',
            details: deleteError.message 
          });
        }

        return res.json({
          message: '라이선스가 성공적으로 삭제되었습니다.'
        });
        
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

### 3. **Supabase RLS (행 수준 보안) 문제**
Supabase 대시보드에서 테이블들에 RLS가 활성화되지 않았다는 보안 경고가 표시되어 접근 문제를 일으킬 수 있습니다.

## 해결방안:

### 방법 1: 코드 수정 (권장)
<mcfile name="licenses.js" path="c:\Users\jbnu\ai-license-system\api\admin\licenses.js"></mcfile> 파일을 올바른 데이터베이스 스키마에 맞게 수정:
```javascript
if (req.method === 'POST') {
  const { name, description, total_licenses, max_loan_days } = req.body;

  if (!name || !description || !total_licenses || !max_loan_days) {
    return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
  }

  try {
    // JBNU 기관 ID 조회
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('email_domain', 'jbnu.ac.kr')
      .single();

    if (orgError || !organization) {
      return res.status(500).json({ 
        error: 'JBNU 기관 정보를 찾을 수 없습니다. 먼저 기관을 등록해주세요.' 
      });
    }

    const insertData = {
      id: uuidv4(),
      name,
      description,
      organization_id: organization.id,
      total_licenses: parseInt(total_licenses),
      available_licenses: parseInt(total_licenses),
      max_loan_days: parseInt(max_loan_days),
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('ai_licenses')
      .insert([insertData])
      .select();

    if (error) {
      console.error('라이선스 추가 오류:', error);
      return res.status(500).json({ 
        error: '라이선스 추가에 실패했습니다.',
        details: error.message 
      });
    }

    return res.status(201).json({ 
      message: '라이선스가 성공적으로 추가되었습니다.',
      license: data[0]
    });

  } catch (err) {
    console.error('예외 발생:', err);
    return res.status(500).json({ 
      error: '서버 내부 오류가 발생했습니다.',
      details: err.message 
    });
  }
}