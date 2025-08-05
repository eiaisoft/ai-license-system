const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// 관리자 이메일 상수 정의
const ADMIN_EMAIL = 'admin@eiaisoft.com';

// Vercel serverless function
module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Supabase 연결
    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dbzpvobjblvlxyxhbshl.supabase.co';
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRienB2b2JqYmx2bHh5eGhic2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODg4OTcsImV4cCI6MjA2OTM2NDg5N30.JvUUUeVv3tCP1wtYmTVYShsPxJ4AdQ0fedX6nAWz1VE';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    console.log('API 요청:', req.method, req.url);
    console.log('ADMIN_EMAIL 확인:', ADMIN_EMAIL); // 디버깅용

    // 관리자 로그인 - 가장 우선 처리
    if (req.method === 'POST' && req.url === '/api/auth/admin-login') {
      console.log('관리자 로그인 엔드포인트 진입');
      
      const { email, password } = req.body;
      console.log('로그인 시도 - 이메일:', email);
      
      if (!email || !password) {
        console.log('이메일 또는 비밀번호 누락');
        return res.status(400).json({ error: '이메일과 비밀번호가 필요합니다.' });
      }

      if (email !== ADMIN_EMAIL) {
        console.log('관리자 이메일 불일치:', email, '!==', ADMIN_EMAIL);
        return res.status(401).json({ error: '관리자 이메일이 아닙니다.' });
      }

      const adminPassword = process.env.ADMIN_PASSWORD || 'rlaalgp0501@@';
      console.log('비밀번호 확인 중...');
      
      if (password !== adminPassword) {
        console.log('비밀번호 불일치');
        return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
      }

      console.log('관리자 인증 성공, 토큰 생성 중...');
      const token = jwt.sign(
        { id: 'admin', email: ADMIN_EMAIL, role: 'admin' },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: '24h' }
      );

      console.log('관리자 로그인 성공');
      return res.status(200).json({
          token,
          user: { id: 'admin', name: '관리자', email: ADMIN_EMAIL, role: 'admin' }
        });
      } catch (error) {
        console.error('관리자 로그인 오류:', error);
        return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
      }
    }

    // 도메인 체크 API
    if (req.method === 'POST' && req.url === '/api/auth/check-domain') {
      try {
        const { email } = req.body;
        
        if (!email) {
          return res.status(400).json({ error: '이메일이 필요합니다.' });
        }

        const domain = email.split('@')[1];
        console.log('도메인 체크:', domain);
        
        const { data: orgs, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('email_domain', domain)
          .eq('auto_login_enabled', true)
          .limit(1);
          
        if (error) {
          console.error('조직 조회 오류:', error);
          return res.status(500).json({ error: '데이터베이스 오류가 발생했습니다.' });
        }
        
        if (orgs && orgs.length > 0) {
          const { data: users, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .limit(1);
            
          if (userError) {
            console.error('사용자 조회 오류:', userError);
            return res.status(500).json({ error: '데이터베이스 오류가 발생했습니다.' });
          }
          
          if (users && users.length > 0) {
            const user = users[0];
            const token = jwt.sign(
              { id: user.id, email: user.email, organization_id: user.organization_id, role: 'user', isFirstLogin: user.is_first_login === 1 },
              process.env.JWT_SECRET || 'your-secret-key-change-in-production',
              { expiresIn: '24h' }
            );
            
            return res.json({
              token,
              user: { id: user.id, name: user.name, email: user.email, role: 'user', organization_id: user.organization_id, isFirstLogin: user.is_first_login === 1 },
              autoLogin: true
            });
          } else {
            return res.json({ 
              organization_id: orgs[0].id,
              organization_name: orgs[0].name,
              autoLogin: false,
              message: '최초 로그인을 진행해주세요.'
            });
          }
        } else {
          return res.status(401).json({ autoLogin: false, message: '일반 로그인을 진행해주세요.' });
        }
      } catch (error) {
        console.error('도메인 체크 오류:', error);
        return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
      }
    }

    // 일반 로그인
    if (req.method === 'POST' && req.url === '/api/auth/login') {
      try {
        const { email, password } = req.body;
        
        if (!email || !password) {
          return res.status(400).json({ error: '이메일과 비밀번호가 필요합니다.' });
        }

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

        const token = jwt.sign(
          { id: user.id, email: user.email, organization_id: user.organization_id, role: user.role, isFirstLogin: user.is_first_login === 1 },
          process.env.JWT_SECRET || 'your-secret-key-change-in-production',
          { expiresIn: '24h' }
        );

        return res.json({
          token,
          user: { id: user.id, name: user.name, email: user.email, role: user.role, organization_id: user.organization_id, isFirstLogin: user.is_first_login === 1 }
        });
      } catch (error) {
        console.error('로그인 오류:', error);
        return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
      }
    }

    // 회원가입
    if (req.method === 'POST' && req.url === '/api/auth/register') {
      try {
        const { name, email, password, organization_id } = req.body;
        
        if (!name || !email || !password || !organization_id) {
          return res.status(400).json({ error: '모든 필드가 필요합니다.' });
        }
        
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

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();

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

        const token = jwt.sign(
          { id: userId, email, organization_id, role: 'user', isFirstLogin: true },
          process.env.JWT_SECRET || 'your-secret-key-change-in-production',
          { expiresIn: '24h' }
        );

        return res.status(201).json({
          token,
          user: { id: userId, name, email, role: 'user', organization_id, isFirstLogin: true }
        });
      } catch (error) {
        console.error('회원가입 오류:', error);
        return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
      }
    }

    // 조직 목록 조회
    if (req.method === 'GET' && req.url === '/api/organizations') {
      try {
        const { data: organizations, error } = await supabase
          .from('organizations')
          .select('*')
          .order('name');

        if (error) {
          console.error('조직 목록 조회 오류:', error);
          return res.status(500).json({ error: '데이터베이스 오류가 발생했습니다.' });
        }

        return res.json(organizations || []);
      } catch (error) {
        console.error('조직 목록 조회 오류:', error);
        return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
      }
    }

    // 비밀번호 변경
    if (req.method === 'POST' && req.url === '/api/auth/change-password') {
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

    // 조직 목록 조회
    if (req.method === 'GET' && req.url === '/api/organizations') {
  const { organization_id } = req.query;
  const { data: licenses, error } = await supabase
    .from('ai_licenses')
    .select('*')
    .eq('organization_id', organization_id);

  if (error) return res.status(500).json({ error: 'DB error' });
  res.json(licenses);
});

// 관리자 - 모든 라이선스 목록 조회
app.get('/api/admin/licenses', authenticateToken, requireAdmin, async (req, res) => {
  const { data: licenses, error } = await supabase
    .from('ai_licenses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: '라이선스 목록 조회 중 오류가 발생했습니다.' });
  res.json(licenses);
});

// 관리자 - 라이선스 추가
app.post('/api/admin/licenses', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description, total_licenses, max_loan_days } = req.body;

  if (!name || !description || !total_licenses || !max_loan_days) {
    return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
  }

  const licenseId = uuidv4();
  const { data: newLicense, error: insertError } = await supabase
    .from('ai_licenses')
    .insert([
      {
        id: licenseId,
        name,
        description,
        total_licenses,
        available_licenses: total_licenses,
        max_loan_days,
        created_at: new Date().toISOString()
      }
    ])
    .select()
    .single();

  if (insertError) {
    return res.status(500).json({ error: '라이선스 추가 중 오류가 발생했습니다.' });
  }

  res.status(201).json({
    message: '라이선스가 성공적으로 추가되었습니다.',
    license: newLicense
  });
});

// 관리자 - 라이선스 삭제
app.delete('/api/admin/licenses/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

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

  res.json({ message: '라이선스가 성공적으로 삭제되었습니다.' });
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

// 관리자 - 모든 대출 내역 조회
app.get('/api/admin/loans', authenticateToken, requireAdmin, async (req, res) => {
  const { data: loans, error } = await supabase
    .from('license_loans')
    .select(`
      ll.id,
      ll.loan_date,
      ll.return_date,
      ll.status,
      u.name as user_name,
      u.email as user_email,
      al.name as license_name,
      al.description as license_description
    `)
    .order('ll.loan_date', { ascending: false });

  if (error) return res.status(500).json({ error: '대출 내역 조회 중 오류가 발생했습니다.' });
  res.json(loans);
});

// 관리자 - 강제 반납 처리
app.post('/api/admin/loans/:loanId/force-return', authenticateToken, requireAdmin, async (req, res) => {
  const { loanId } = req.params;

  const { data: loan, error } = await supabase
    .from('license_loans')
    .select('*')
    .eq('id', loanId)
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

  // 라이센스 정보 가져오기
  const { data: licenseData, error: licenseQueryError } = await supabase
    .from('ai_licenses')
    .select('*')
    .eq('id', loan.license_id)
    .single();

  if (licenseError) {
    return res.status(500).json({ error: '라이센스 정보 조회 중 오류가 발생했습니다.' });
  }

  // 라이센스 정보 가져오기
  const { data: license, error: licenseError } = await supabase
    .from('ai_licenses')
    .select('*')
    .eq('id', loan.license_id)
    .single();

  if (licenseQueryError) {
    return res.status(500).json({ error: '라이센스 정보 조회 중 오류가 발생했습니다.' });
  }

  // 사용 가능한 라이선스 수 증가
  const { error: updateLicenseError } = await supabase
    .from('ai_licenses')
    .update({ available_licenses: licenseData.available_licenses + 1 })
    .eq('id', loan.license_id);

  if (updateLicenseError) {
    return res.status(500).json({ error: '라이선스 수량 증가 중 오류가 발생했습니다.' });
  }

  res.json({ message: '대출이 강제 반납 처리되었습니다.' });
});

// 관리자 - 대출 기록 삭제
app.delete('/api/admin/loans/:loanId', authenticateToken, requireAdmin, async (req, res) => {
  const { loanId } = req.params;

  const { error: deleteError } = await supabase
    .from('license_loans')
    .delete()
    .eq('id', loanId);

  if (deleteError) {
    return res.status(500).json({ error: '대출 기록 삭제 중 오류가 발생했습니다.' });
  }

  res.json({ message: '대출 기록이 삭제되었습니다.' });
});

// 라이선스 반납
app.post('/api/licenses/:loanId/return', authenticateToken, async (req, res) => {
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

  // 관리자 - 기관 목록
  app.get('/api/admin/organizations', authenticateToken, requireAdmin, async (req, res) => {
    const { data: organizations, error } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: '기관 목록 조회 중 오류가 발생했습니다.' });
    res.json(organizations);
  });

  // 관리자 - 기관 추가
  app.post('/api/admin/organizations', authenticateToken, requireAdmin, async (req, res) => {
    const { name, email_domain, auto_login_enabled = true } = req.body;
    if (!name || !email_domain) return res.status(400).json({ error: '기관명과 이메일 도메인을 입력해주세요.' });

    const orgId = uuidv4();
    const { data: newOrg, error: insertError } = await supabase
      .from('organizations')
      .insert([{ id: orgId, name, email_domain, auto_login_enabled, created_at: new Date().toISOString() }])
      .select()
      .single();

    if (insertError) return res.status(500).json({ error: '기관 추가 중 오류가 발생했습니다.' });
    res.status(201).json({ message: '기관이 성공적으로 추가되었습니다.', organization: newOrg });요.' });
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

  res.status(201).json({
    message: '기관이 성공적으로 등록되었습니다.',
    organization: newOrg
  });
});

// 관리자 - 기관 도메인 수정
app.put('/api/admin/organizations/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email_domain, auto_login_enabled } = req.body;

    console.log('기관 업데이트 요청:', { id, name, email_domain, auto_login_enabled });

    if (!name || !email_domain) {
      console.log('필수 필드 누락:', { name, email_domain });
      return res.status(400).json({ error: '기관명과 이메일 도메인을 입력해주세요.' });
    }

    // 다른 기관과 도메인 중복 확인
    const { data: existingOrg, error: checkError } = await supabase
      .from('organizations')
      .select('*')
      .eq('email_domain', email_domain)
      .neq('id', id)
      .limit(1);

    if (checkError) {
      console.error('도메인 중복 확인 오류:', checkError);
      return res.status(500).json({ error: '도메인 확인 중 오류가 발생했습니다.' });
    }

    if (existingOrg && existingOrg.length > 0) {
      console.log('도메인 중복:', email_domain);
      return res.status(400).json({ error: '이미 다른 기관에서 사용 중인 도메인입니다.' });
    }

    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update({
        name,
        email_domain,
        auto_login_enabled
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('기관 업데이트 오류:', updateError);
      return res.status(500).json({ error: '기관 수정 중 오류가 발생했습니다.' });
    }

    console.log('기관 업데이트 성공:', updatedOrg);
    res.json({
      message: '기관이 성공적으로 수정되었습니다.',
      organization: updatedOrg
    });
  } catch (error) {
    console.error('기관 업데이트 예외:', error);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

// 관리자 - 기관 도메인 삭제
app.delete('/api/admin/organizations/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  // 해당 기관의 사용자 수 확인
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('organization_id', id);

  if (userError) {
    return res.status(500).json({ error: '사용자 확인 중 오류가 발생했습니다.' });
  }

  if (users && users.length > 0) {
    return res.status(400).json({ 
      error: '해당 기관에 등록된 사용자가 있어 삭제할 수 없습니다. 먼저 사용자를 삭제해주세요.' 
    });
  }

  const { error: deleteError } = await supabase
    .from('organizations')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return res.status(500).json({ error: '기관 삭제 중 오류가 발생했습니다.' });
  }

  res.json({ message: '기관이 성공적으로 삭제되었습니다.' });
});

// 관리자 - 비밀번호 변경
app.post('/api/admin/change-password', authenticateToken, requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: '새 비밀번호는 최소 6자 이상이어야 합니다.' });
  }

  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const isMatch = currentPassword === adminPassword;
  
  if (!isMatch) {
    return res.status(400).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
  }

  // 환경 변수로 새 비밀번호 설정 (실제 운영에서는 더 안전한 방법 사용)
  process.env.ADMIN_PASSWORD = newPassword;

  res.json({ message: '관리자 비밀번호가 성공적으로 변경되었습니다.' });
});

// 기관 정보 조회
app.get('/api/organizations', async (req, res) => {
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('id, name, email_domain');

  if (error) return res.status(500).json({ error: '기관 목록 조회 중 오류가 발생했습니다.' });
  res.json(organizations);
});

// jbnu.ac.kr 도메인 자동 등록 함수
async function initializeJbnuDomain() {
  try {
    // jbnu.ac.kr 도메인이 이미 등록되어 있는지 확인
    const { data: existingOrg, error: checkError } = await supabase
      .from('organizations')
      .select('*')
      .eq('email_domain', 'jbnu.ac.kr')
      .limit(1);

    if (checkError) {
      console.error('기관 도메인 확인 중 오류:', checkError);
      return;
    }

    if (!existingOrg || existingOrg.length === 0) {
      // jbnu.ac.kr 도메인 등록
      const { data: newOrg, error: insertError } = await supabase
        .from('organizations')
        .insert([
          {
            id: uuidv4(),
            name: '전북대학교',
            email_domain: 'jbnu.ac.kr',
            auto_login_enabled: true,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (insertError) {
        console.error('jbnu.ac.kr 도메인 등록 중 오류:', insertError);
      } else {
        console.log('jbnu.ac.kr 도메인이 성공적으로 등록되었습니다.');
      }
    } else {
      console.log('jbnu.ac.kr 도메인이 이미 등록되어 있습니다.');
    }
  } catch (error) {
    console.error('도메인 초기화 중 오류:', error);
  }
}

// Supabase 연결 테스트 함수
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('organizations').select('count').limit(1);
    
    if (error) {
      console.error('Supabase 연결 테스트 실패:', error.message);
      return false;
    }
    
    console.log('Supabase 연결 테스트 성공');
    return true;
  } catch (error) {
    console.error('Supabase 연결 테스트 중 예외 발생:', error.message);
    return false;
  }
}

    // 기본 응답
    return res.status(404).json({ error: '엔드포인트를 찾을 수 없습니다.', url: req.url, method: req.method });

  } catch (error) {
    console.error('전체 API 오류:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};
});

// 관리자 - 모든 라이선스 목록 조회
app.get('/api/admin/licenses', authenticateToken, requireAdmin, async (req, res) => {
  const { data: licenses, error } = await supabase
    .from('ai_licenses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: '라이선스 목록 조회 중 오류가 발생했습니다.' });
  res.json(licenses);
});

// 관리자 - 라이선스 추가
app.post('/api/admin/licenses', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description, total_licenses, max_loan_days } = req.body;

  if (!name || !description || !total_licenses || !max_loan_days) {
    return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
  }

  const licenseId = uuidv4();
  const { data: newLicense, error: insertError } = await supabase
    .from('ai_licenses')
    .insert([
      {
        id: licenseId,
        name,
        description,
        total_licenses,
        available_licenses: total_licenses,
        max_loan_days,
        created_at: new Date().toISOString()
      }
    ])
    .select()
    .single();

  if (insertError) {
    return res.status(500).json({ error: '라이선스 추가 중 오류가 발생했습니다.' });
  }

  res.status(201).json({
    message: '라이선스가 성공적으로 추가되었습니다.',
    license: newLicense
  });
});

// 관리자 - 라이선스 삭제
app.delete('/api/admin/licenses/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

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

  res.json({ message: '라이선스가 성공적으로 삭제되었습니다.' });
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

// 관리자 - 모든 대출 내역 조회
app.get('/api/admin/loans', authenticateToken, requireAdmin, async (req, res) => {
  const { data: loans, error } = await supabase
    .from('license_loans')
    .select(`
      ll.id,
      ll.loan_date,
      ll.return_date,
      ll.status,
      u.name as user_name,
      u.email as user_email,
      al.name as license_name,
      al.description as license_description
    `)
    .order('ll.loan_date', { ascending: false });

  if (error) return res.status(500).json({ error: '대출 내역 조회 중 오류가 발생했습니다.' });
  res.json(loans);
});

// 관리자 - 강제 반납 처리
app.post('/api/admin/loans/:loanId/force-return', authenticateToken, requireAdmin, async (req, res) => {
  const { loanId } = req.params;

  const { data: loan, error } = await supabase
    .from('license_loans')
    .select('*')
    .eq('id', loanId)
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

  // 라이센스 정보 가져오기
  const { data: licenseData, error: licenseQueryError } = await supabase
    .from('ai_licenses')
    .select('*')
    .eq('id', loan.license_id)
    .single();

  if (licenseError) {
    return res.status(500).json({ error: '라이센스 정보 조회 중 오류가 발생했습니다.' });
  }

  // 라이센스 정보 가져오기
  const { data: license, error: licenseError } = await supabase
    .from('ai_licenses')
    .select('*')
    .eq('id', loan.license_id)
    .single();

  if (licenseQueryError) {
    return res.status(500).json({ error: '라이센스 정보 조회 중 오류가 발생했습니다.' });
  }

  // 사용 가능한 라이선스 수 증가
  const { error: updateLicenseError } = await supabase
    .from('ai_licenses')
    .update({ available_licenses: licenseData.available_licenses + 1 })
    .eq('id', loan.license_id);

  if (updateLicenseError) {
    return res.status(500).json({ error: '라이선스 수량 증가 중 오류가 발생했습니다.' });
  }

  res.json({ message: '대출이 강제 반납 처리되었습니다.' });
});

// 관리자 - 대출 기록 삭제
app.delete('/api/admin/loans/:loanId', authenticateToken, requireAdmin, async (req, res) => {
  const { loanId } = req.params;

  const { error: deleteError } = await supabase
    .from('license_loans')
    .delete()
    .eq('id', loanId);

  if (deleteError) {
    return res.status(500).json({ error: '대출 기록 삭제 중 오류가 발생했습니다.' });
  }

  res.json({ message: '대출 기록이 삭제되었습니다.' });
});

// 라이선스 반납
app.post('/api/licenses/:loanId/return', authenticateToken, async (req, res) => {
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

// 관리자 - 기관 도메인 목록 조회
app.get('/api/admin/organizations', authenticateToken, requireAdmin, async (req, res) => {
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: '기관 목록 조회 중 오류가 발생했습니다.' });
  res.json(organizations);
});

// 관리자 - 기관 도메인 추가
app.post('/api/admin/organizations', authenticateToken, requireAdmin, async (req, res) => {
  const { name, email_domain, auto_login_enabled = true } = req.body;

  if (!name || !email_domain) {
    return res.status(400).json({ error: '기관명과 이메일 도메인을 입력해주세