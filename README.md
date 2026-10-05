# Student Notebook & Task Manager Web Application

An aesthetic **Notebook-styled** full-stack task management and note-taking web application built with **Node.js**, **Express.js**, and the **File System (`fs`)** module.

---

## 🌟 Key Features

1. **Student Login Screen**:
   - Notebook hardcover login interface with sticker label.
   - Student session management with personalized profiles (`displayName`, `grade`, streaks).
   - Pre-configured demo profiles (e.g., Alex Rivera - CS, Maya Lin - Pre-Med, Jordan Smith - Grade 10) for instant 1-click testing.

2. **Authentic Notebook UI**:
   - Realistic spiral binding rings with metallic gradients and shadows.
   - Ruled paper with red vertical left margin and horizontal guidelines.
   - Support for multiple authentic paper styles:
     - 📄 **Ruled / Lined Paper** (with red margin)
     - 📐 **Math / Graph Grid Paper**
     - 🎯 **Dotted Bullet Journal Paper**
     - 📝 **Yellow Legal Notepad**

3. **"What Do We Want To Write?" Type Selector**:
   - 📝 **TO DO LIST**: Formats interactive checklist items (`[ ] Task`).
   - 🎓 **Class Notes**: Pre-populates Subject, Topic, Key Concepts, and Summary.
   - 📖 **Daily Journal**: Pre-fills highlights, learnings, and reflections.
   - 🎯 **Assignment Plan**: Milestone breakdowns and deadline tracking.
   - 💡 **Quick Thought**: Ideas, reminders, and flash notes.

4. **Writing & Styling Options**:
   - **Handwriting & Fonts**:
     - *Handwriting (Caveat)*
     - *Casual Pen (Kalam)*
     - *Marker (Patrick Hand)*
     - *Typewriter (Space Mono)*
     - *Clean Sans (Inter)*
   - **Pen Inks**:
     - 🔵 Royal Blue Pen
     - ⚫ Gel Black Ink
     - 🔴 Correction Red Ink
     - 🟣 Violet Ink
     - ✏️ Graphite Pencil
   - Frontmatter metadata is saved directly inside `.txt` files so formatting persists seamlessly.

5. **Students Streak & Habits Hub (`/streak`)**:
   - 🔥 **Daily Streak Counter**: Maintains active daily habit streaks when students create to-do lists.
   - 📅 **7-Day Activity Tracker**: Visual day bubbles showing active and pending days.
   - 💡 **Motivational Quotes**: Rotating quotes on discipline and study consistency.
   - 🎖️ **Student Habit Badges**:
     - *First Step* (Created 1st note)
     - *3-Day Momentum* (3-day active streak)
     - *Study Champion* (7-day streak)
     - *Master Planner* (5+ to-do lists created)

6. **Card Dashboard & "Read More" Detail Page**:
   - Cards look like mini notebook pages with spiral rings, selected fonts, and ink colors.
   - "Read More" displays an open double-page notebook with interactive to-do checkboxes that strike-through when clicked!
   - 🖨️ One-click Print / Save to PDF support.

---

## 🛠️ Technology Stack & Core Concepts

- **Backend**: Node.js & Express.js
- **Templating**: EJS (Embedded JavaScript)
- **State & Sessions**: `express-session`
- **File System (`fs`) Operations**:
  - `fs.readdir`: Scans `tasks/` directory to render all notebook cards.
  - `fs.readFile`: Reads full `.txt` files and parses frontmatter metadata.
  - `fs.writeFile`: Persists individual `.txt` files and updates student streaks in `users.json`.
  - `fs.unlink`: Deletes notes cleanly upon removal.

---

## 📁 Directory Structure

```text
task-manager/
├── app.js               # Main Express application & routes
├── storage.js           # File system helpers (frontmatter, streak math, JSON storage)
├── package.json         # Dependencies
├── data/
│   └── users.json       # Student profiles, streaks, and achievements (managed with fs)
├── tasks/               # Stores each task/note as a .txt file
│   ├── Plan Sprint Goals.txt
│   ├── Design System Architecture.txt
│   └── Daily Reflection.txt
├── views/
│   ├── login.ejs        # Hardcover notebook login view
│   ├── index.ejs        # Main notebook desk with creation form & cards
│   ├── task.ejs         # Open notebook "Read More" page with interactive checkboxes
│   ├── streak.ejs       # Student Daily Streak & Habit Hub
│   └── 404.ejs          # Notebook themed 404 page
└── public/
    ├── css/
    │   └── style.css    # Full notebook paper styles, lines, margins, and animations
    └── js/
        └── main.js      # Live template switcher, font/paper previewer
```

---

## 🚀 How to Run

1. Navigate to the project directory:
   ```bash
   cd C:\Users\Asus\.gemini\antigravity\scratch\task-manager
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open your browser:
   Visit [http://localhost:3000](http://localhost:3000)
