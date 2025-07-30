const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// 기관 도메인 확인 및 자동 로그인 API
app.post('/api/auth/check-domain', async (req, res) => {
  const { email } = req.body;
  const domain = email.split('@')[1];
  
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('email_domain', domain)
    .eq('auto_login_enabled', true)
    .limit(1);
    
  if (error) return res.status(500).json({ error: 'DB error' });
  
  if (orgs && orgs.length > 0) {
    // 자동 로그인 허용된 기관
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);
      
    if (userError) return res.status(500).json({ error: 'DB error' });
    
    if (users && users.length > 0) {
      // 사용자 존재 - 자동 로그인
      const user = users[0];
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          organization_id: user.organization_id, 
          role: 'user',
          isFirstLogin: user.is_first_login === 1
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({
        token,
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          role: 'user', 
          organization_id: user.organization_id,
          isFirstLogin: user.is_first_login === 1
        },
        autoLogin: true
      });
    } else {
      // 사용자 없음 - 최초 로그인 필요
      return res.json({ 
        organization_id: orgs[0].id,
        organization_name: orgs[0].name,
        autoLogin: false,
        message: '최초 로그인을 진행해주세요.'
      });
    }
  } else {
    // 자동 로그인 허용되지 않은 기관
    return res.status(401).json({ 
      autoLogin: false,
      message: '일반 로그인을 진행해주세요.'
    });
  }
});

// 로그인 API
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .limit(1);

  if (error) return res.status(500).json({ error: 'DB error' });
  const user = users && users[0];
  if (!user) return res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });

  const token = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      organization_id: user.organization_id, 
      role: user.role,
      isFirstLogin: user.is_first_login === 1
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
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
});

// 최초 로그인 API
app.post('/api/auth/first-login', async (req, res) => {
  const { email, organization_id, name } = req.body;

  if (!email || !organization_id || !name) {
    return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
  }

  // 기관 메일 도메인 확인
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organization_id)
    .limit(1);

  if (orgError || !orgs || orgs.length === 0) {
    return res.status(400).json({ error: '유효하지 않은 기관입니다.' });
  }

  // 이메일이 이미 존재하는지 확인
  const { data: existingUsers, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .limit(1);

  if (userError) {
    return res.status(500).json({ error: '사용자 확인 중 오류가 발생했습니다.' });
  }

  if (existingUsers && existingUsers.length > 0) {
    return res.status(400).json({ error: '이미 등록된 이메일입니다.' });
  }

  // 임시 비밀번호 생성 (이메일 도메인 기반)
  const emailDomain = email.split('@')[1];
  const tempPassword = emailDomain.replace(/[^a-zA-Z0-9]/g, '') + '123';
  const hashedPassword = await bcrypt.hash(tempPassword, 10);
  const userId = uuidv4();

  const { data: insertedUser, error: insertError } = await supabase
    .from('users')
    .insert([
      {
        id: userId,
        organization_id,
        name,
        email,
        password: hashedPassword,
        is_first_login: true
      }
    ]);

  if (insertError) {
    return res.status(500).json({ error: '사용자 생성 중 오류가 발생했습니다.' });
  }

  const token = jwt.sign(
    { id: userId, email, organization_id, role: 'user', isFirstLogin: true },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.status(201).json({
    token,
    user: {
      id: userId,
      name,
      email,
      role: 'user',
      organization_id,
      isFirstLogin: true
    },
    tempPassword: tempPassword
  });
});

// 비밀번호 변경 (최초 로그인 후)
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { id } = req.user;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: '새 비밀번호는 최소 6자 이상이어야 합니다.' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !user) {
    return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  const { error: updateError } = await supabase
    .from('users')
    .update({ password: hashedNewPassword, is_first_login: false })
    .eq('id', id);

  if (updateError) {
    return res.status(500).json({ error: '비밀번호 변경 중 오류가 발생했습니다.' });
  }

  res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
});

// 기관별 사용 가능한 라이선스 목록 조회
app.get('/api/licenses', async (req, res) => {
  const { organization_id } = req.query;
  const { data: licenses, error } = await supabase
    .from('ai_licenses')
    .select('*')
    .eq('organization_id', organization_id);

  if (error) return res.status(500).json({ error: 'DB error' });
  res.json(licenses);
});

// 라이선스 대출 신청
app.post('/api/licenses/:licenseId/loan', authenticateToken, async (req, res) => {
  const { licenseId } = req.params;
  const { userId } = req.user;

  // 라이선스 사용 가능 여부 확인
  const { data: license, error: licenseError } = await supabase
    .from('ai_licenses')
    .select('*')
    .eq('id', licenseId)
    .single();

  if (licenseError) {
    return res.status(500).json({ error: '라이선스 확인 중 오류가 발생했습니다.' });
  }

  if (!license || license.available_licenses <= 0) {
    return res.status(400).json({ error: '사용 가능한 라이선스가 없습니다.' });
  }

  // 이미 대출 중인지 확인
  const { data: existingLoan, error: loanError } = await supabase
    .from('license_loans')
    .select('*')
    .eq('license_id', licenseId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (loanError) {
    return res.status(500).json({ error: '대출 상태 확인 중 오류가 발생했습니다.' });
  }

  if (existingLoan) {
    return res.status(400).json({ error: '이미 대출 중인 라이선스입니다.' });
  }

  // 대출 처리
  const loanId = uuidv4();
  const returnDate = new Date();
  returnDate.setDate(returnDate.getDate() + license.max_loan_days);

  const { error: loanInsertError } = await supabase
    .from('license_loans')
    .insert([
      {
        id: loanId,
        license_id: licenseId,
        user_id: userId,
        return_date: returnDate.toISOString()
      }
    ]);

  if (loanInsertError) {
    return res.status(500).json({ error: '대출 처리 중 오류가 발생했습니다.' });
  }

  // 사용 가능한 라이선스 수 감소
  const { error: updateLicenseError } = await supabase
    .from('ai_licenses')
    .update({ available_licenses: license.available_licenses - 1 })
    .eq('id', licenseId);

  if (updateLicenseError) {
    return res.status(500).json({ error: '라이선스 수량 감소 중 오류가 발생했습니다.' });
  }

  res.status(201).json({
    message: '라이선스 대출이 완료되었습니다.',
    loan: {
      id: loanId,
      license_id: licenseId,
      return_date: returnDate.toISOString()
    }
  });
});

// 사용자의 대출 내역 조회
app.get('/api/loans', authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { data: loans, error } = await supabase
    .from('license_loans')
    .select(`
      ll.id,
      ll.loan_date,
      ll.return_date,
      ll.status,
      al.name as license_name,
      al.description as license_description
    `)
    .eq('user_id', userId)
    .order('ll.loan_date', { ascending: false });

  if (error) return res.status(500).json({ error: '대출 내역 조회 중 오류가 발생했습니다.' });
  res.json(loans);
});

// 라이선스 반납
app.post('/api/loans/:loanId/return', authenticateToken, async (req, res) => {
  const { loanId } = req.params;
  const { userId } = req.user;

  const { data: loan, error } = await supabase
    .from('license_loans')
    .select('*')
    .eq('id', loanId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (error) {
    return res.status(500).json({ error: '대출 정보 확인 중 오류가 발생했습니다.' });
  }

  if (!loan) {
    return res.status(404).json({ error: '대출 정보를 찾을 수 없습니다.' });
  }

  // 대출 상태를 반납으로 변경
  const { error: updateLoanError } = await supabase
    .from('license_loans')
    .update({ status: 'returned' })
    .eq('id', loanId);

  if (updateLoanError) {
    return res.status(500).json({ error: '반납 처리 중 오류가 발생했습니다.' });
  }

  // 사용 가능한 라이선스 수 증가
  const { error: updateLicenseError } = await supabase
    .from('ai_licenses')
    .update({ available_licenses: license.available_licenses + 1 })
    .eq('id', loan.license_id);

  if (updateLicenseError) {
    return res.status(500).json({ error: '라이선스 수량 증가 중 오류가 발생했습니다.' });
  }

  res.json({ message: '라이선스가 성공적으로 반납되었습니다.' });
});

// 기관 정보 조회
app.get('/api/organizations', async (req, res) => {
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('id, name, email');

  if (error) return res.status(500).json({ error: '기관 목록 조회 중 오류가 발생했습니다.' });
  res.json(organizations);
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 