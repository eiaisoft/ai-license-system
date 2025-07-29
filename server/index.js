const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'your-secret-key';

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json());

// 데이터베이스 초기화
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('데이터베이스 연결 오류:', err);
  } else {
    console.log('SQLite 데이터베이스에 연결되었습니다.');
    initializeDatabase();
  }
});

// 데이터베이스 테이블 생성
function initializeDatabase() {
  // 기관 테이블
  db.run(`CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, function(err) {
    if (err) {
      console.error('기관 테이블 생성 오류:', err);
      return;
    }
    
      // 사용자 테이블
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    organization_id TEXT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    is_first_login INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
  )`, function(err) {
      if (err) {
        console.error('사용자 테이블 생성 오류:', err);
        return;
      }
      
      // AI 라이선스 테이블
      db.run(`CREATE TABLE IF NOT EXISTS ai_licenses (
        id TEXT PRIMARY KEY,
        organization_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        total_licenses INTEGER DEFAULT 0,
        available_licenses INTEGER DEFAULT 0,
        max_loan_days INTEGER DEFAULT 30,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations (id)
      )`, function(err) {
        if (err) {
          console.error('라이선스 테이블 생성 오류:', err);
          return;
        }
        
        // 라이선스 대출 테이블
        db.run(`CREATE TABLE IF NOT EXISTS license_loans (
          id TEXT PRIMARY KEY,
          license_id TEXT,
          user_id TEXT,
          loan_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          return_date DATETIME,
          status TEXT DEFAULT 'active',
          FOREIGN KEY (license_id) REFERENCES ai_licenses (id),
          FOREIGN KEY (user_id) REFERENCES users (id)
        )`, function(err) {
          if (err) {
            console.error('대출 테이블 생성 오류:', err);
            return;
          }
          
          console.log('데이터베이스 테이블이 성공적으로 생성되었습니다.');
          // 샘플 데이터 삽입
          insertSampleData();
        });
      });
    });
  });
}

// 샘플 데이터 삽입
function insertSampleData() {
  // 샘플 기관
  const orgId = uuidv4();
  db.run(`INSERT OR IGNORE INTO organizations (id, name, email) VALUES (?, ?, ?)`, 
    [orgId, '테스트 기관', 'test@organization.com']);

  // 샘플 사용자
  const userId = uuidv4();
  const hashedPassword = bcrypt.hashSync('password123', 10);
  db.run(`INSERT OR IGNORE INTO users (id, organization_id, name, email, password, role) VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, orgId, '테스트 사용자', 'user@test.com', hashedPassword, 'user']);

  // 샘플 AI 라이선스
  const licenseId = uuidv4();
  db.run(`INSERT OR IGNORE INTO ai_licenses (id, organization_id, name, description, total_licenses, available_licenses, max_loan_days) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [licenseId, orgId, 'ChatGPT Pro', 'OpenAI ChatGPT Pro 라이선스', 10, 8, 30]);

  const licenseId2 = uuidv4();
  db.run(`INSERT OR IGNORE INTO ai_licenses (id, organization_id, name, description, total_licenses, available_licenses, max_loan_days) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [licenseId2, orgId, 'Claude Pro', 'Anthropic Claude Pro 라이선스', 5, 3, 14]);
}

// JWT 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '액세스 토큰이 필요합니다.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
    }
    req.user = user;
    next();
  });
};

// 인증 라우트
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        organization_id: user.organization_id, 
        role: user.role,
        isFirstLogin: user.is_first_login === 1
      },
      JWT_SECRET,
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
});

// 기관 메일 기반 사용자 생성 (최초 로그인 시)
app.post('/api/auth/first-login', (req, res) => {
  const { email, organization_id, name } = req.body;

  if (!email || !organization_id || !name) {
    return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
  }

  // 기관 메일 도메인 확인
  db.get('SELECT * FROM organizations WHERE id = ?', [organization_id], (err, org) => {
    if (err || !org) {
      return res.status(400).json({ error: '유효하지 않은 기관입니다.' });
    }

    // 이메일이 이미 존재하는지 확인
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, existingUser) => {
      if (err) {
        return res.status(500).json({ error: '사용자 확인 중 오류가 발생했습니다.' });
      }

      if (existingUser) {
        return res.status(400).json({ error: '이미 등록된 이메일입니다.' });
      }

      // 임시 비밀번호 생성 (이메일 도메인 기반)
      const emailDomain = email.split('@')[1];
      const tempPassword = emailDomain.replace(/[^a-zA-Z0-9]/g, '') + '123';
      const hashedPassword = bcrypt.hashSync(tempPassword, 10);
      const userId = uuidv4();

      db.run('INSERT INTO users (id, organization_id, name, email, password, is_first_login) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, organization_id, name, email, hashedPassword, 1],
        function(err) {
          if (err) {
            return res.status(500).json({ error: '사용자 생성 중 오류가 발생했습니다.' });
          }

          const token = jwt.sign(
            { id: userId, email, organization_id, role: 'user', isFirstLogin: true },
            JWT_SECRET,
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
        }
      );
    });
  });
});

// 비밀번호 변경 (최초 로그인 후)
app.post('/api/auth/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { id } = req.user;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: '새 비밀번호는 최소 6자 이상이어야 합니다.' });
  }

  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(400).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
    }

    const hashedNewPassword = bcrypt.hashSync(newPassword, 10);

    db.run('UPDATE users SET password = ?, is_first_login = 0 WHERE id = ?',
      [hashedNewPassword, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: '비밀번호 변경 중 오류가 발생했습니다.' });
        }

        res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
      }
    );
  });
});

// 기관별 사용 가능한 라이선스 목록 조회
app.get('/api/licenses', authenticateToken, (req, res) => {
  const { organization_id } = req.user;

  db.all(`
    SELECT 
      al.id,
      al.name,
      al.description,
      al.total_licenses,
      al.available_licenses,
      al.max_loan_days,
      al.created_at
    FROM ai_licenses al
    WHERE al.organization_id = ?
    ORDER BY al.name
  `, [organization_id], (err, licenses) => {
    if (err) {
      return res.status(500).json({ error: '라이선스 목록 조회 중 오류가 발생했습니다.' });
    }
    res.json(licenses);
  });
});

// 라이선스 대출 신청
app.post('/api/licenses/:licenseId/loan', authenticateToken, (req, res) => {
  const { licenseId } = req.params;
  const { userId } = req.user;

  // 라이선스 사용 가능 여부 확인
  db.get('SELECT * FROM ai_licenses WHERE id = ? AND available_licenses > 0', [licenseId], (err, license) => {
    if (err) {
      return res.status(500).json({ error: '라이선스 확인 중 오류가 발생했습니다.' });
    }

    if (!license) {
      return res.status(400).json({ error: '사용 가능한 라이선스가 없습니다.' });
    }

    // 이미 대출 중인지 확인
    db.get('SELECT * FROM license_loans WHERE license_id = ? AND user_id = ? AND status = "active"', 
      [licenseId, userId], (err, existingLoan) => {
      if (err) {
        return res.status(500).json({ error: '대출 상태 확인 중 오류가 발생했습니다.' });
      }

      if (existingLoan) {
        return res.status(400).json({ error: '이미 대출 중인 라이선스입니다.' });
      }

      // 대출 처리
      const loanId = uuidv4();
      const returnDate = new Date();
      returnDate.setDate(returnDate.getDate() + license.max_loan_days);

      db.run('INSERT INTO license_loans (id, license_id, user_id, return_date) VALUES (?, ?, ?, ?)',
        [loanId, licenseId, userId, returnDate.toISOString()], function(err) {
        if (err) {
          return res.status(500).json({ error: '대출 처리 중 오류가 발생했습니다.' });
        }

        // 사용 가능한 라이선스 수 감소
        db.run('UPDATE ai_licenses SET available_licenses = available_licenses - 1 WHERE id = ?', [licenseId]);

        res.status(201).json({
          message: '라이선스 대출이 완료되었습니다.',
          loan: {
            id: loanId,
            license_id: licenseId,
            return_date: returnDate.toISOString()
          }
        });
      });
    });
  });
});

// 사용자의 대출 내역 조회
app.get('/api/loans', authenticateToken, (req, res) => {
  const { userId } = req.user;

  db.all(`
    SELECT 
      ll.id,
      ll.loan_date,
      ll.return_date,
      ll.status,
      al.name as license_name,
      al.description as license_description
    FROM license_loans ll
    JOIN ai_licenses al ON ll.license_id = al.id
    WHERE ll.user_id = ?
    ORDER BY ll.loan_date DESC
  `, [userId], (err, loans) => {
    if (err) {
      return res.status(500).json({ error: '대출 내역 조회 중 오류가 발생했습니다.' });
    }
    res.json(loans);
  });
});

// 라이선스 반납
app.post('/api/loans/:loanId/return', authenticateToken, (req, res) => {
  const { loanId } = req.params;
  const { userId } = req.user;

  db.get('SELECT * FROM license_loans WHERE id = ? AND user_id = ? AND status = "active"', 
    [loanId, userId], (err, loan) => {
    if (err) {
      return res.status(500).json({ error: '대출 정보 확인 중 오류가 발생했습니다.' });
    }

    if (!loan) {
      return res.status(404).json({ error: '대출 정보를 찾을 수 없습니다.' });
    }

    // 대출 상태를 반납으로 변경
    db.run('UPDATE license_loans SET status = "returned" WHERE id = ?', [loanId], function(err) {
      if (err) {
        return res.status(500).json({ error: '반납 처리 중 오류가 발생했습니다.' });
      }

      // 사용 가능한 라이선스 수 증가
      db.run('UPDATE ai_licenses SET available_licenses = available_licenses + 1 WHERE id = ?', [loan.license_id]);

      res.json({ message: '라이선스가 성공적으로 반납되었습니다.' });
    });
  });
});

// 기관 정보 조회
app.get('/api/organizations', (req, res) => {
  db.all('SELECT id, name, email FROM organizations ORDER BY name', (err, organizations) => {
    if (err) {
      return res.status(500).json({ error: '기관 목록 조회 중 오류가 발생했습니다.' });
    }
    res.json(organizations);
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 