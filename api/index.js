const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const app = express();

// CORS 설정
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://dbzpvobjblvlxyxhbshl.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRienB2b2JqYmx2bHh5eGhic2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODg4OTcsImV4cCI6MjA2OTM2NDg5N30.JvUUUeVv3tCP1wtYmTVYShsPxJ4AdQ0fedX6nAWz1VE'
);

// JWT 토큰 인증 미들웨어
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  console.log('토큰 인증 시도:', {
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    tokenStart: token ? token.substring(0, 20) + '...' : 'none'
  });
  
  if (!token) {
    console.log('토큰이 없음');
    return res.status(401).json({ error: '토큰이 필요합니다.' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production', (err, user) => {
    if (err) {
      console.log('토큰 검증 실패:', err.message);
      return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
    }
    
    console.log('토큰 검증 성공:', {
      userId: user.id,
      email: user.email,
      organization_id: user.organization_id
    });
    
    req.user = user;
    next();
  });
}

// 관리자 권한 확인 미들웨어
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
  next();
}

// 인증 관련 라우트들
app.use('/api/auth/admin-login', require('./auth/admin-login'));
app.use('/api/auth/check-domain', require('./auth/check-domain'));
app.use('/api/auth/login', require('./auth/login'));
app.use('/api/auth/register', require('./auth/register'));
app.use('/api/auth/change-password', require('./auth/change-password'));

// 조직 관련 라우트
app.use('/api/organizations', require('./organizations'));

// 관리자 조직 관리 라우트
app.use('/api/admin/organizations', authenticateToken, requireAdmin, require('./admin/organizations'));

// 관리자 라이선스 관리 라우트
app.use('/api/admin/licenses', authenticateToken, requireAdmin, require('./admin/licenses'));

// 라이선스 목록 조회 (사용자용) - 모든 라이선스 반환
app.get('/api/licenses', authenticateToken, async (req, res) => {
  try {
    console.log('=== 라이선스 조회 시작 ===');
    
    // 모든 라이선스를 조회
    const { data: licenses, error } = await supabase
      .from('ai_licenses')
      .select('*');

    if (error) {
      console.error('라이선스 목록 조회 오류:', error);
      return res.status(500).json({ error: '데이터베이스 오류가 발생했습니다.' });
    }

    console.log('조회된 라이선스 개수:', licenses?.length || 0);

    // 필드명 매핑 적용
    const mappedLicenses = (licenses || []).map(license => {
      const availableCount = license.available_count || 0;
      const availableLicenses = license.available_licenses || 0;
      const finalAvailable = Math.max(availableCount, availableLicenses);
      
      // 라이선스 ID 처리 로직 개선
      let displayLicenseId = '';
      
      // 관리자가 입력한 라이선스 ID가 있으면 우선 사용
      if (license.license_id && license.license_id.trim() !== '') {
        // 관리자가 입력한 라이선스 ID를 그대로 사용
        displayLicenseId = license.license_id;
      } else {
        // 없으면 자동 생성된 ID 사용 (형식 변경)
        const randomNum = Math.floor(1000 + Math.random() * 9000); // 1000-9999 사이의 랜덤 숫자
        displayLicenseId = `AI-${randomNum}`;
      }
      
      console.log('라이선스 데이터 상세:', {
        id: license.id,
        name: license.name,
        license_id: license.license_id,
        organization: license.organization,
        display_license_id: displayLicenseId
      });
      
      return {
        ...license,
        available_licenses: finalAvailable,
        available_count: finalAvailable,
        total_licenses: license.total_count || license.total_licenses || 0,
        organization_name: license.organization || '전북대학교',
        display_license_id: displayLicenseId
      };
    });

    console.log(`총 ${mappedLicenses.length}개의 라이선스 반환`);
    console.log('=== 라이선스 조회 완료 ===');
    
    res.json(mappedLicenses);
  } catch (error) {
    console.error('라이선스 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 라이선스 대출
// 라이선스 대출
app.post('/api/licenses/:id/loan', authenticateToken, async (req, res) => {
  try {
    const { id: licenseId } = req.params;
    const { id: userId, organization_id } = req.user;
    const { loan_start_date, loan_end_date } = req.body;

    console.log('대출 신청 요청:', { licenseId, userId, loan_start_date, loan_end_date });

    // 라이선스 정보 조회
    const { data: license, error: licenseError } = await supabase
      .from('ai_licenses')
      .select('*')
      .eq('id', licenseId)
      .single();

    if (licenseError || !license) {
      return res.status(404).json({ error: '라이선스를 찾을 수 없습니다.' });
    }

    // 사용 가능한 라이선스 확인
    if ((license.available_count || license.available_licenses || 0) <= 0) {
      return res.status(400).json({ error: '사용 가능한 라이선스가 없습니다.' });
    }

    // 기존 대출 확인
    const { data: existingLoan, error: loanCheckError } = await supabase
      .from('license_loans')
      .select('id')
      .eq('user_id', userId)
      .eq('license_id', licenseId)
      .eq('status', 'active')
      .limit(1);

    if (loanCheckError) {
      console.error('대출 확인 오류:', loanCheckError);
      return res.status(500).json({ error: '데이터베이스 오류가 발생했습니다.' });
    }

    if (existingLoan && existingLoan.length > 0) {
      return res.status(400).json({ error: '이미 대출 중인 라이선스입니다.' });
    }

    // 날짜 처리
    let loanDate, returnDate;
    
    if (loan_start_date && loan_end_date) {
      // 사용자가 지정한 날짜 사용
      loanDate = new Date(loan_start_date);
      returnDate = new Date(loan_end_date);
    } else {
      // 기본값: 오늘부터 최대 대출 기간
      loanDate = new Date();
      returnDate = new Date(loanDate.getTime() + (license.max_loan_days * 24 * 60 * 60 * 1000));
    }

    // 대출 기록 생성
    const loanId = uuidv4();

    const { error: insertError } = await supabase
      .from('license_loans')
      .insert([{
        id: loanId,
        user_id: userId,
        license_id: licenseId,
        loan_date: loanDate.toISOString(),
        due_date: returnDate.toISOString(),
        status: 'active'
      }]);

    if (insertError) {
      console.error('대출 기록 생성 오류:', insertError);
      return res.status(500).json({ error: '대출 처리 중 오류가 발생했습니다.' });
    }

    // 사용 가능한 라이선스 수 감소
    const currentAvailable = license.available_count || license.available_licenses || 0;
    const { error: updateError } = await supabase
      .from('ai_licenses')
      .update({ 
        available_count: currentAvailable - 1,
        available_licenses: currentAvailable - 1  // 호환성 유지
      })
      .eq('id', licenseId);

    if (updateError) {
      console.error('라이선스 업데이트 오류:', updateError);
      return res.status(500).json({ error: '라이선스 업데이트 중 오류가 발생했습니다.' });
    }

    console.log('대출 신청 완료:', { loanId, loanDate, returnDate });

    res.json({
      message: '라이선스 대출이 완료되었습니다.',
      loan: {
        id: loanId,
        license_name: license.name,
        loan_date: loanDate.toISOString(),
        due_date: returnDate.toISOString()
      }
    });
  } catch (error) {
    console.error('라이선스 대출 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 라이선스 반납
app.post('/api/licenses/:id/return', authenticateToken, async (req, res) => {
  try {
    const { id: licenseId } = req.params;
    const { id: userId } = req.user;

    // 대출 기록 조회
    const { data: loan, error: loanError } = await supabase
      .from('license_loans')
      .select('*')
      .eq('user_id', userId)
      .eq('license_id', licenseId)
      .eq('status', 'active')
      .single();

    if (loanError || !loan) {
      return res.status(404).json({ error: '대출 기록을 찾을 수 없습니다.' });
    }

    // 대출 상태 업데이트
    const { error: updateLoanError } = await supabase
      .from('license_loans')
      .update({ 
        status: 'returned',
        return_date: new Date().toISOString()
      })
      .eq('id', loan.id);

    if (updateLoanError) {
      console.error('대출 상태 업데이트 오류:', updateLoanError);
      return res.status(500).json({ error: '반납 처리 중 오류가 발생했습니다.' });
    }

    // 라이선스 정보 조회
    const { data: license, error: licenseError } = await supabase
      .from('ai_licenses')
      .select('available_count, available_licenses')
      .eq('id', licenseId)
      .single();

    if (licenseError || !license) {
      console.error('라이선스 조회 오류:', licenseError);
      return res.status(500).json({ error: '라이선스 정보 조회 중 오류가 발생했습니다.' });
    }

    // 사용 가능한 라이선스 수 증가
    const currentAvailable = license.available_count || license.available_licenses || 0;
    const { error: updateLicenseError } = await supabase
      .from('ai_licenses')
      .update({ 
        available_count: currentAvailable + 1,
        available_licenses: currentAvailable + 1  // 호환성 유지
      })
      .eq('id', licenseId);

    if (updateLicenseError) {
      console.error('라이선스 업데이트 오류:', updateLicenseError);
      return res.status(500).json({ error: '라이선스 업데이트 중 오류가 발생했습니다.' });
    }

    res.json({ message: '라이선스 반납이 완료되었습니다.' });
  } catch (error) {
    console.error('라이선스 반납 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 대출 내역 조회
app.get('/api/user/loans', authenticateToken, async (req, res) => {
  try {
    const { id: userId } = req.user;

    const { data: loans, error } = await supabase
      .from('license_loans')
      .select(`
        *,
        ai_licenses (
          name,
          description
        )
      `)
      .eq('user_id', userId)
      .order('loan_date', { ascending: false });

    if (error) {
      console.error('대출 내역 조회 오류:', error);
      return res.status(500).json({ error: '데이터베이스 오류가 발생했습니다.' });
    }

    res.json(loans || []);
  } catch (error) {
    console.error('대출 내역 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// /api/loans 엔드포인트 수정 (UserHome에서 사용)
app.get('/api/loans', authenticateToken, async (req, res) => {
  try {
    const { id: userId } = req.user;

    const { data: loans, error } = await supabase
      .from('license_loans')
      .select(`
        id,
        loan_date,
        return_date,
        status,
        ai_licenses!inner (
          id,
          name,
          description
        )
      `)
      .eq('user_id', userId)
      .order('loan_date', { ascending: false });

    if (error) {
      console.error('대출 내역 조회 오류:', error);
      return res.status(500).json({ error: '데이터베이스 오류가 발생했습니다.' });
    }

    // 데이터 형식을 클라이언트에서 기대하는 형태로 변환
    const formattedLoans = loans?.map(loan => ({
      id: loan.id,
      license_name: loan.ai_licenses.name,
      license_id: loan.ai_licenses.id,
      loan_date: loan.loan_date,
      return_date: loan.return_date,
      status: loan.status
    })) || [];

    res.json(formattedLoans);
  } catch (error) {
    console.error('대출 내역 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// /api/loans 엔드포인트 추가 (UserHome에서 사용)
app.get('/api/loans', authenticateToken, async (req, res) => {
  try {
    const { id: userId } = req.user;

    const { data: loans, error } = await supabase
      .from('license_loans')
      .select(`
        id,
        loan_date,
        due_date,
        return_date,
        status,
        ai_licenses!inner (
          id,
          name,
          description
        )
      `)
      .eq('user_id', userId)
      .order('loan_date', { ascending: false });

    if (error) {
      console.error('대출 내역 조회 오류:', error);
      return res.status(500).json({ error: '데이터베이스 오류가 발생했습니다.' });
    }

    // 데이터 형식을 클라이언트에서 기대하는 형태로 변환
    const formattedLoans = loans?.map(loan => ({
      id: loan.id,
      license_name: loan.ai_licenses.name,
      license_id: loan.ai_licenses.id,
      loan_date: loan.loan_date,
      due_date: loan.due_date,
      return_date: loan.return_date,
      status: loan.status
    })) || [];

    res.json(formattedLoans);
  } catch (error) {
    console.error('대출 내역 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});