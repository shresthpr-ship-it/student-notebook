const fs = require('fs');
const path = require('path');
const { sendConsistencyCertificate } = require('./mailer');

const dataDir = path.join(__dirname, 'data');
const usersFilePath = path.join(dataDir, 'users.json');
const tasksDir = path.join(__dirname, 'tasks');

// Ensure directories exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(tasksDir)) {
  fs.mkdirSync(tasksDir, { recursive: true });
}

// Ensure users.json exists
if (!fs.existsSync(usersFilePath)) {
  fs.writeFileSync(usersFilePath, JSON.stringify({}, null, 2), 'utf-8');
}

/**
 * Get all users from users.json using fs.readFile
 */
function getUsers() {
  try {
    const raw = fs.readFileSync(usersFilePath, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch (err) {
    console.error('Error reading users.json:', err);
    return {};
  }
}

/**
 * Save users to users.json using fs.writeFile
 */
function saveUsers(users) {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing users.json:', err);
    return false;
  }
}

/**
 * Sanitize filename to prevent invalid characters and directory traversal
 */
function sanitizeFilename(name) {
  return path.basename(name).replace(/[/\\?%*:|"<>]/g, '-').trim();
}

/**
 * Format a task file content with frontmatter metadata
 */
function formatTaskContent(metadata, body) {
  const metaLines = [
    '---',
    `category: ${metadata.category || 'TO DO LIST'}`,
    `font: ${metadata.font || 'handwriting'}`,
    `paper: ${metadata.paper || 'lined'}`,
    `ink: ${metadata.ink || 'blue'}`,
    `author: ${metadata.author || 'Student'}`,
    `created_at: ${metadata.createdAt || new Date().toISOString()}`,
    '---',
    '',
    body.trim()
  ];
  return metaLines.join('\n');
}

/**
 * Parse a task file's frontmatter and body
 */
function parseTaskContent(rawContent) {
  if (!rawContent) {
    return {
      metadata: {
        category: 'TO DO LIST',
        font: 'handwriting',
        paper: 'lined',
        ink: 'blue',
        author: 'Student',
        createdAt: new Date().toISOString()
      },
      body: ''
    };
  }

  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = rawContent.match(frontmatterRegex);

  if (!match) {
    return {
      metadata: {
        category: 'TO DO LIST',
        font: 'handwriting',
        paper: 'lined',
        ink: 'blue',
        author: 'Student',
        createdAt: new Date().toISOString()
      },
      body: rawContent
    };
  }

  const metaBlock = match[1];
  const body = match[2];
  const metadata = {
    category: 'TO DO LIST',
    font: 'handwriting',
    paper: 'lined',
    ink: 'blue',
    author: 'Student',
    createdAt: new Date().toISOString()
  };

  metaBlock.split(/\r?\n/).forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > -1) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      if (key === 'created_at') metadata.createdAt = value;
      else if (key) metadata[key] = value;
    }
  });

  return { metadata, body };
}

/**
 * Record a streak activity for a student (To-Do / Notes)
 */
function recordStudentActivity(username, isTodoList = false) {
  const users = getUsers();
  const user = users[username];
  if (!user) return null;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  user.history = user.history || [];
  user.todoCount = user.todoCount || 0;
  user.notesCount = user.notesCount || 0;

  if (isTodoList) {
    user.todoCount += 1;
  } else {
    user.notesCount += 1;
  }

  if (!user.history.includes(today)) {
    user.history.push(today);

    if (user.lastActiveDate === yesterday) {
      user.currentStreak = (user.currentStreak || 0) + 1;
    } else if (user.lastActiveDate === today) {
      // Already counted today
    } else {
      user.currentStreak = 1;
    }

    user.lastActiveDate = today;
    user.longestStreak = Math.max(user.longestStreak || 0, user.currentStreak);
  }

  user.badges = user.badges || [];
  if (user.currentStreak >= 1 && !user.badges.includes('first_step')) {
    user.badges.push('first_step');
  }
  if (user.currentStreak >= 3 && !user.badges.includes('three_day_streak')) {
    user.badges.push('three_day_streak');
  }
  if (user.currentStreak >= 7 && !user.badges.includes('week_warrior')) {
    user.badges.push('week_warrior');
  }
  if (user.todoCount >= 5 && !user.badges.includes('planner_pro')) {
    user.badges.push('planner_pro');
  }

  users[username] = user;
  saveUsers(users);
  return user;
}

/**
 * Record completed Pomodoro focus session and update pomodoro streak
 */
function recordPomodoroSession(username, durationMinutes = 25) {
  const users = getUsers();
  const user = users[username];
  if (!user) return null;

  user.pomodoro = user.pomodoro || {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    totalSessions: 0,
    totalMinutes: 0,
    history: []
  };

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  user.pomodoro.totalSessions += 1;
  user.pomodoro.totalMinutes += parseInt(durationMinutes, 10) || 25;
  user.pomodoro.history = user.pomodoro.history || [];

  if (!user.pomodoro.history.includes(today)) {
    user.pomodoro.history.push(today);

    if (user.pomodoro.lastActiveDate === yesterday) {
      user.pomodoro.currentStreak = (user.pomodoro.currentStreak || 0) + 1;
    } else if (user.pomodoro.lastActiveDate === today) {
      // already counted today
    } else {
      user.pomodoro.currentStreak = 1;
    }

    user.pomodoro.lastActiveDate = today;
    user.pomodoro.longestStreak = Math.max(
      user.pomodoro.longestStreak || 0,
      user.pomodoro.currentStreak
    );
  }

  // Pomodoro Badges
  user.badges = user.badges || [];
  if (user.pomodoro.totalSessions >= 1 && !user.badges.includes('focus_initiate')) {
    user.badges.push('focus_initiate');
  }
  if (user.pomodoro.currentStreak >= 3 && !user.badges.includes('deep_worker')) {
    user.badges.push('deep_worker');
  }
  if (user.pomodoro.currentStreak >= 7 && !user.badges.includes('zen_master')) {
    user.badges.push('zen_master');
  }

  users[username] = user;
  saveUsers(users);
  return user;
}

/**
 * Issue and email a weekly Certificate of Consistency to the student's email ID
 */
async function issueWeeklyCertificate(username) {
  const users = getUsers();
  const user = users[username];
  if (!user) return { success: false, error: 'User not found' };

  // Calculate calendar week number
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((((now - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);

  const certId = `CERT-${now.getFullYear()}-WK${weekNumber}-${user.username.toUpperCase()}`;

  const certData = {
    id: certId,
    weekNumber,
    weekTitle: `Week ${weekNumber}, ${now.getFullYear()}`,
    issuedAt: now.toISOString(),
    recipientName: user.displayName || user.username,
    recipientEmail: user.email,
    grade: user.grade || 'Scholar',
    todoStreak: user.currentStreak || 1,
    pomodoroStreak: user.pomodoro?.currentStreak || 0,
    totalFocusMinutes: user.pomodoro?.totalMinutes || 0,
    totalSessions: user.pomodoro?.totalSessions || 0
  };

  // Send the email via nodemailer
  const emailResult = await sendConsistencyCertificate(user, certData);

  certData.emailSent = emailResult.success;
  certData.emailPreviewUrl = emailResult.previewUrl || null;
  certData.messageId = emailResult.messageId || null;

  user.certificates = user.certificates || [];
  // Avoid duplicate for same certId or push new
  const existingIdx = user.certificates.findIndex(c => c.id === certId);
  if (existingIdx > -1) {
    user.certificates[existingIdx] = certData;
  } else {
    user.certificates.unshift(certData);
  }

  users[username] = user;
  saveUsers(users);

  return {
    success: true,
    certificate: certData,
    emailResult
  };
}

module.exports = {
  tasksDir,
  dataDir,
  usersFilePath,
  getUsers,
  saveUsers,
  sanitizeFilename,
  formatTaskContent,
  parseTaskContent,
  recordStudentActivity,
  recordPomodoroSession,
  issueWeeklyCertificate
};
