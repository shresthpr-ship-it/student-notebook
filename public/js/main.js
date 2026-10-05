document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const typeButtons = document.querySelectorAll('.btn-type-choice');
  const categoryInput = document.getElementById('selectedCategory');
  const titleInput = document.getElementById('taskTitle');
  const noteTextarea = document.getElementById('noteTextarea');
  const notebookPage = document.getElementById('activeNotebookPage');
  
  const fontSelect = document.getElementById('fontSelector');
  const paperSelect = document.getElementById('paperSelector');
  const inkSelect = document.getElementById('inkSelector');

  // Pre-configured templates
  const templates = {
    'TO DO LIST': {
      title: "Today's Study & Task Checklist",
      content: "[ ] Review Lecture 4 notes\n[ ] Solve practice problems 1 to 10\n[ ] Prepare questions for professor\n[ ] 30-minute reading session\n[ ] Organize study desk",
      font: 'font-handwriting',
      paper: 'paper-lined',
      ink: 'ink-blue'
    },
    'Class Notes': {
      title: "Class Notes - Subject: ",
      content: "📅 Date: " + new Date().toLocaleDateString() + "\n👨‍🏫 Professor:\n📖 Topic / Chapter:\n\n🔑 Key Concepts & Definitions:\n• \n• \n\n📝 Important Examples & Formulas:\n• \n\n💡 Summary / Takeaway:\n",
      font: 'font-clean',
      paper: 'paper-grid',
      ink: 'ink-black'
    },
    'Journal': {
      title: "Daily Reflection - " + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      content: "✨ Today's Highlights:\n- \n\n🎯 What I achieved today:\n- \n\n🌱 What I learned & challenges overcome:\n- \n\n🙏 Grateful for:\n- ",
      font: 'font-kalam',
      paper: 'paper-yellow',
      ink: 'ink-pencil'
    },
    'Assignment': {
      title: "Assignment Roadmap: ",
      content: "🎯 Course & Task:\n⏰ Final Due Date:\n\nMilestones Checklist:\n[ ] Research & outline draft\n[ ] Complete rough draft\n[ ] Review citations & rubric\n[ ] Proofread & final submission",
      font: 'font-typewriter',
      paper: 'paper-dots',
      ink: 'ink-purple'
    },
    'Quick Thought': {
      title: "Quick Idea - ",
      content: "💡 Flash Thought:\n\nRemember to: ",
      font: 'font-patrick',
      paper: 'paper-lined',
      ink: 'ink-red'
    }
  };

  // Handle "What do you want to write?" buttons
  typeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      typeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const selectedType = btn.getAttribute('data-type');
      if (categoryInput) categoryInput.value = selectedType;

      const template = templates[selectedType];
      if (template) {
        // Pre-fill if empty or ask to replace
        if (titleInput && (!titleInput.value.trim() || titleInput.dataset.autoFilled === "true")) {
          titleInput.value = template.title;
          titleInput.dataset.autoFilled = "true";
        }

        if (noteTextarea && (!noteTextarea.value.trim() || noteTextarea.dataset.autoFilled === "true")) {
          noteTextarea.value = template.content;
          noteTextarea.dataset.autoFilled = "true";
        }

        // Apply recommended styling preset
        if (fontSelect) {
          fontSelect.value = template.font;
          applyFont(template.font);
        }
        if (paperSelect) {
          paperSelect.value = template.paper;
          applyPaper(template.paper);
        }
        if (inkSelect) {
          inkSelect.value = template.ink;
          applyInk(template.ink);
        }
      }
    });
  });

  // Track if user typed custom content
  if (titleInput) {
    titleInput.addEventListener('input', () => {
      titleInput.dataset.autoFilled = "false";
    });
  }
  if (noteTextarea) {
    noteTextarea.addEventListener('input', () => {
      noteTextarea.dataset.autoFilled = "false";
    });
  }

  // Live Font Switching
  function applyFont(fontClass) {
    if (!noteTextarea) return;
    const fontClasses = ['font-handwriting', 'font-kalam', 'font-patrick', 'font-typewriter', 'font-clean'];
    fontClasses.forEach(c => {
      noteTextarea.classList.remove(c);
      if (titleInput) titleInput.classList.remove(c);
    });
    noteTextarea.classList.add(fontClass);
    if (titleInput) titleInput.classList.add(fontClass);
  }

  // Live Paper Switching
  function applyPaper(paperClass) {
    if (!notebookPage) return;
    const paperClasses = ['paper-lined', 'paper-grid', 'paper-dots', 'paper-yellow'];
    paperClasses.forEach(c => notebookPage.classList.remove(c));
    notebookPage.classList.add(paperClass);
  }

  // Live Ink Switching
  function applyInk(inkClass) {
    if (!noteTextarea) return;
    const inkClasses = ['ink-blue', 'ink-black', 'ink-red', 'ink-purple', 'ink-pencil'];
    inkClasses.forEach(c => {
      noteTextarea.classList.remove(c);
      if (titleInput) titleInput.classList.remove(c);
    });
    noteTextarea.classList.add(inkClass);
    if (titleInput) titleInput.classList.add(inkClass);
  }

  // Toolbar Event Listeners
  if (fontSelect) {
    fontSelect.addEventListener('change', (e) => applyFont(e.target.value));
  }
  if (paperSelect) {
    paperSelect.addEventListener('change', (e) => applyPaper(e.target.value));
  }
  if (inkSelect) {
    inkSelect.addEventListener('change', (e) => applyInk(e.target.value));
  }

  // Interactive to-do checkboxes in "Read More" detail view
  const detailChecklist = document.getElementById('interactiveDetailText');
  if (detailChecklist) {
    detailChecklist.addEventListener('click', (e) => {
      if (e.target && e.target.classList.contains('todo-checkbox')) {
        const isChecked = e.target.checked;
        const parentLine = e.target.closest('.todo-line');
        if (parentLine) {
          if (isChecked) {
            parentLine.style.textDecoration = 'line-through';
            parentLine.style.opacity = '0.6';
          } else {
            parentLine.style.textDecoration = 'none';
            parentLine.style.opacity = '1';
          }
        }
      }
    });
  }
});
