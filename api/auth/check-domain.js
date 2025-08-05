const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

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
    console.log('도메인 체크 API 호출됨');
    
    // Supabase 연결
    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dbzpvobjblvlxyxhbshl.supabase.co';
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRienB2b2JqYmx2bHh5eGhic2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODg4OTcsImV4cCI6MjA2OTM2NDg5N30.JvUUUeVv3tCP1wtYmTVYShsPxJ4AdQ0fedX6nAWz1VE';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
          { 
            id: user.id, 
            email: user.email, 
            organization_id: user.organization_id, 
            role: 'user', 
            isFirstLogin: user.is_first_login === 1 
          },
          process.env.JWT_SECRET || 'your-secret-key-change-in-production',
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
        return res.json({ 
          organization_id: orgs[0].id,
          organization_name: orgs[0].name,
          autoLogin: false,
          message: '최초 로그인을 진행해주세요.'
        });
      }
    } else {
      return res.status(401).json({ 
        autoLogin: false, 
        message: '일반 로그인을 진행해주세요.' 
      });
    }
  } catch (error) {
    console.error('도메인 체크 오류:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};