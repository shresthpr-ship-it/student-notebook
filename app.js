const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const {
  tasksDir,
  getUsers,
  saveUsers,
  sanitizeFilename,
  formatTaskContent,
  parseTaskContent,
  recordStudentActivity,
  recordPomodoroSession,
  issueWeeklyCertificate
} = require('./storage');

const app = express();
const PORT = process.env.PORT || 3000;

// Body & Cookie Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('student-notebook-secret-cookie-salt'));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(
  session({
    secret: 'notebook-task-manager-secret-token',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
  })
);

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Context & Cookie Check Middleware
app.use((req, res, next) => {
  // If no session but persistent login cookie exists, auto-login
  if (!req.session.user && req.cookies.remembered_student) {
    const users = getUsers();
    const rememberedUser = users[req.cookies.remembered_student];
    if (rememberedUser) {
      req.session.user = rememberedUser;
    }
  }

  res.locals.user = req.session.user || null;
  res.locals.hasCookieConsent = req.cookies.cookie_consent === 'accepted';
  next();
});

// Authentication Guard
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }
  next();
}

/**
 * GET /login - Student Login & Notebook Cover Page
 */
app.get('/login', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/');
  }
  res.render('login', { error: null });
});

/**
 * POST /login - Handle Student Sign In, Email saving, and Cookie Options
 */
app.post('/login', (req, res) => {
  const { username, email, studentName, grade, rememberMe, cookieConsent } = req.body;

  if (!username || !username.trim()) {
    return res.render('login', { error: 'Please enter your Student ID / Username.' });
  }

  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const cleanEmail = email ? email.trim().toLowerCase() : `${cleanUsername}@studentnotebook.local`;
  const users = getUsers();

  if (!users[cleanUsername]) {
    // Register new student account
    users[cleanUsername] = {
      username: cleanUsername,
      email: cleanEmail,
      displayName: studentName ? studentName.trim() : username.trim(),
      grade: grade ? grade.trim() : 'General',
      cookieConsent: cookieConsent === 'on' || cookieConsent === 'true',
      rememberMe: rememberMe === 'on' || rememberMe === 'true',
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      todoCount: 0,
      notesCount: 0,
      history: [],
      badges: [],
      pomodoro: {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        totalSessions: 0,
        totalMinutes: 0,
        history: []
      },
      certificates: [],
      createdAt: new Date().toISOString()
    };
  } else {
    // Update existing user with updated email or details
    if (cleanEmail && cleanEmail !== `${cleanUsername}@studentnotebook.local`) {
      users[cleanUsername].email = cleanEmail;
    }
    if (studentName && studentName.trim()) {
      users[cleanUsername].displayName = studentName.trim();
    }
    if (grade && grade.trim()) {
      users[cleanUsername].grade = grade.trim();
    }
    if (!users[cleanUsername].pomodoro) {
      users[cleanUsername].pomodoro = {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        totalSessions: 0,
        totalMinutes: 0,
        history: []
      };
    }
  }

  saveUsers(users);

  // Set Remember Me cookie (30 days)
  if (rememberMe === 'on' || rememberMe === 'true') {
    res.cookie('remembered_student', cleanUsername, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true
    });
  }

  // Set Cookie Consent if granted
  if (cookieConsent === 'on' || cookieConsent === 'true') {
    res.cookie('cookie_consent', 'accepted', {
      maxAge: 365 * 24 * 60 * 60 * 1000
    });
  }

  req.session.user = users[cleanUsername];
  res.redirect('/');
});

/**
 * POST /api/cookie-consent - Record cookie acceptance from popup banner
 */
app.post('/api/cookie-consent', (req, res) => {
  res.cookie('cookie_consent', 'accepted', {
    maxAge: 365 * 24 * 60 * 60 * 1000
  });

  if (req.session && req.session.user) {
    const users = getUsers();
    if (users[req.session.user.username]) {
      users[req.session.user.username].cookieConsent = true;
      saveUsers(users);
    }
  }

  res.json({ success: true, message: 'Cookies accepted' });
});

/**
 * GET /logout - Sign Out and clear cookies
 */
app.get('/logout', (req, res) => {
  res.clearCookie('remembered_student');
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

/**
 * GET / - Main Notebook Dashboard
 */
app.get('/', requireAuth, (req, res) => {
  const currentUsername = req.session.user.username;
  const users = getUsers();
  const student = users[currentUsername] || req.session.user;
  req.session.user = student;

  fs.readdir(tasksDir, (err, files) => {
    if (err) {
      console.error('Error reading tasks folder:', err);
      return res.status(500).send('Unable to read tasks directory');
    }

    const txtFiles = files.filter(f => f.endsWith('.txt'));

    const taskPromises = txtFiles.map(file => {
      return new Promise((resolve) => {
        const filePath = path.join(tasksDir, file);
        fs.readFile(filePath, 'utf-8', (readErr, rawContent) => {
          if (readErr) {
            resolve({
              filename: file,
              title: path.parse(file).name,
              preview: 'Could not load preview...',
              metadata: { category: 'TO DO LIST', font: 'handwriting', paper: 'lined', ink: 'blue' },
              raw: ''
            });
          } else {
            const { metadata, body } = parseTaskContent(rawContent);
            const preview = body.length > 140 ? body.substring(0, 140) + '...' : body;
            resolve({
              filename: file,
              title: path.parse(file).name,
              preview: preview || '(Empty note)',
              metadata,
              body
            });
          }
        });
      });
    });

    Promise.all(taskPromises)
      .then(tasks => {
        const filter = req.query.category || 'ALL';
        const filteredTasks = filter === 'ALL' 
          ? tasks 
          : tasks.filter(t => t.metadata.category === filter);

        res.render('index', {
          student,
          tasks: filteredTasks,
          activeFilter: filter,
          totalCount: tasks.length
        });
      })
      .catch(err => {
        console.error('Error compiling tasks:', err);
        res.render('index', { student, tasks: [], activeFilter: 'ALL', totalCount: 0 });
      });
  });
});

/**
 * POST /create - Create note/to-do and save as .txt file via req.body and fs.writeFile
 */
app.post('/create', requireAuth, (req, res) => {
  const { title, category, description, font, paper, ink } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).send('Task / Note title is required');
  }

  const safeTitle = sanitizeFilename(title);
  const filename = `${safeTitle}.txt`;
  const filePath = path.join(tasksDir, filename);

  const metadata = {
    category: category || 'TO DO LIST',
    font: font || 'handwriting',
    paper: paper || 'lined',
    ink: ink || 'blue',
    author: req.session.user.displayName || req.session.user.username,
    createdAt: new Date().toISOString()
  };

  const formattedFileContent = formatTaskContent(metadata, description || '');

  fs.writeFile(filePath, formattedFileContent, 'utf-8', (err) => {
    if (err) {
      console.error('Error writing task file:', err);
      return res.status(500).send('Error saving task');
    }

    const isTodoList = (category === 'TO DO LIST');
    const updatedUser = recordStudentActivity(req.session.user.username, isTodoList);
    if (updatedUser) {
      req.session.user = updatedUser;
    }

    res.redirect('/');
  });
});

/**
 * GET /task/:filename - View complete task in notebook style via req.params and fs.readFile
 */
app.get('/task/:filename', requireAuth, (req, res) => {
  const safeFilename = sanitizeFilename(req.params.filename);
  const filePath = path.join(tasksDir, safeFilename);

  fs.readFile(filePath, 'utf-8', (err, rawData) => {
    if (err) {
      console.error('Error reading task file:', err);
      return res.status(404).render('404', { message: 'Task file not found' });
    }

    const { metadata, body } = parseTaskContent(rawData);
    const title = path.parse(safeFilename).name;

    res.render('task', {
      title,
      filename: safeFilename,
      metadata,
      body,
      student: req.session.user
    });
  });
});

/**
 * POST /delete/:filename - Delete task file using fs.unlink
 */
app.post('/delete/:filename', requireAuth, (req, res) => {
  const safeFilename = sanitizeFilename(req.params.filename);
  const filePath = path.join(tasksDir, safeFilename);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Error deleting task file:', err);
      return res.status(500).send('Error deleting task file');
    }
    res.redirect('/');
  });
});

/**
 * GET /pomodoro - Pomodoro Timer with Focusing Background Music & Streaks
 */
app.get('/pomodoro', requireAuth, (req, res) => {
  const users = getUsers();
  const student = users[req.session.user.username] || req.session.user;
  req.session.user = student;

  res.render('pomodoro', {
    student
  });
});

/**
 * POST /api/pomodoro/complete - Log completed Pomodoro session and update pomodoro streak
 */
app.post('/api/pomodoro/complete', requireAuth, (req, res) => {
  const duration = parseInt(req.body.duration, 10) || 25;
  const updatedUser = recordPomodoroSession(req.session.user.username, duration);

  if (updatedUser) {
    req.session.user = updatedUser;
    return res.json({
      success: true,
      pomodoro: updatedUser.pomodoro,
      badges: updatedUser.badges
    });
  }

  res.status(500).json({ success: false, error: 'Could not record session' });
});

/**
 * GET /streak - Dedicated Student Daily Streak & Habit Hub
 */
app.get('/streak', requireAuth, (req, res) => {
  const users = getUsers();
  const student = users[req.session.user.username] || req.session.user;
  req.session.user = student;

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const last7Days = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = daysOfWeek[d.getDay()];
    const isCompleted = (student.history || []).includes(dateStr);
    const isToday = (i === 0);

    last7Days.push({
      dateStr,
      dayName,
      dayNumber: d.getDate(),
      isCompleted,
      isToday
    });
  }

  const quotes = [
    "“Small daily improvements over time lead to stunning results.” — Robin Sharma",
    "“The secret of getting ahead is getting started.” — Mark Twain",
    "“Success is the sum of small efforts, repeated day in and day out.” — Robert Collier",
    "“Discipline is choosing between what you want now and what you want most.” — Abraham Lincoln",
    "“You don't have to be extreme, just consistent.”"
  ];
  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  res.render('streak', {
    student,
    last7Days,
    quote
  });
});

/**
 * GET /certificate - Printable & Frameable Certificate of Consistency View
 */
app.get('/certificate', requireAuth, (req, res) => {
  const users = getUsers();
  const student = users[req.session.user.username] || req.session.user;
  const certId = req.query.id || (student.certificates && student.certificates.length > 0 ? student.certificates[0].id : null);

  let cert = null;
  if (certId && student.certificates) {
    cert = student.certificates.find(c => c.id === certId);
  }

  if (!cert) {
    // Generate default current milestone cert
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil((((now - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);
    cert = {
      id: `CERT-${now.getFullYear()}-WK${weekNumber}-${student.username.toUpperCase()}`,
      weekNumber,
      weekTitle: `Week ${weekNumber}, ${now.getFullYear()}`,
      issuedAt: now.toISOString(),
      recipientName: student.displayName,
      recipientEmail: student.email,
      grade: student.grade || 'Scholar',
      todoStreak: student.currentStreak || 1,
      pomodoroStreak: student.pomodoro?.currentStreak || 0,
      totalFocusMinutes: student.pomodoro?.totalMinutes || 0,
      totalSessions: student.pomodoro?.totalSessions || 0
    };
  }

  res.render('certificate', {
    student,
    cert
  });
});

/**
 * POST /api/send-certificate - Send Consistency Certificate to Student Email via Nodemailer
 */
app.post('/api/send-certificate', requireAuth, async (req, res) => {
  try {
    const result = await issueWeeklyCertificate(req.session.user.username);
    if (result.success) {
      const users = getUsers();
      req.session.user = users[req.session.user.username];
      return res.json({
        success: true,
        certificate: result.certificate,
        emailResult: result.emailResult
      });
    }
    res.status(500).json({ success: false, error: result.error });
  } catch (err) {
    console.error('Error generating certificate:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Notebook Task Manager running at http://localhost:${PORT}`);
});
