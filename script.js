// ============================================================================
// GCET College Assistant - Main JavaScript
// ============================================================================
// This file handles all the chatbot interactions, UI updates, and data storage
// for the GCET College Assistant app.

// ----------------------------------------------------------------------------
// Configuration & Constants
// ----------------------------------------------------------------------------

// Backend API endpoint (update this when you deploy your backend server)
const API_BASE = 'http://localhost:4000/api';

// Key used to save/load theme preference from browser storage
const THEME_KEY = 'gcet_theme';

// SVG icons for light/dark mode toggle button
// We store these as strings so we can easily swap them when theme changes
const MODE_ICONS = {
  // Moon icon shows in light mode (click to switch to dark)
  light: `
    <svg class="mode-sketch mode-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M13.6 4.2a7.2 7.2 0 1 0 6.2 10.7 5.6 5.6 0 0 1-6.2-10.7z"></path>
      <path d="M9.2 4.8c.5 1.4 1.3 2 2.7 2.6"></path>
      <path d="M10.1 18.4c-.9.3-1.6.2-2.4-.2"></path>
    </svg>
  `,
  // Sun icon shows in dark mode (click to switch to light)
  dark: `
    <svg class="mode-sketch mode-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2"></circle>
      <path d="M12 3.3v2.3M12 18.4v2.3M4.8 4.8l1.7 1.7M17.5 17.5l1.7 1.7M3.3 12h2.3M18.4 12h2.3M4.8 19.2l1.7-1.7M17.5 6.5l1.7-1.7"></path>
    </svg>
  `
};

// ----------------------------------------------------------------------------
// Global State Variables
// ----------------------------------------------------------------------------
// These variables track the current state of the app

let userContext = {};         // Stores student info: branch, semester, batch
let chatHistory = [];         // Array of all chat messages (saved to localStorage)
let recognition = null;       // Web Speech API object for voice input
let isListening = false;      // True when microphone is actively listening
let voiceHideTimeout = null;  // Timer to auto-hide voice status popup
let typingNode = null;        // Reference to the "bot is typing..." animation element
let uploadedDoc = null;       // Currently uploaded PDF file (if any)
let isSheetCollapsed = false; // True when bottom sheet is minimized

// ----------------------------------------------------------------------------
// App Initialization
// ----------------------------------------------------------------------------
// This runs automatically when the page finishes loading

document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  // Step 1: Apply saved theme (light or dark mode)
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(savedTheme);
  
  // Step 2: Set up theme toggle button
  const modeToggle = document.getElementById('modeToggle');
  if (modeToggle) {
    modeToggle.addEventListener('click', toggleTheme);
  }
  
  // Step 3: Load user's profile (branch, semester, batch)
  const savedContext = localStorage.getItem('userContext');
  if (savedContext) {
    try {
      userContext = JSON.parse(savedContext);
    } catch (error) {
      userContext = {};
    }
  } else {
    // If no profile exists, show the setup modal
    openContextModal();
  }

  // Step 4: Restore previous chat messages from storage
  const savedHistory = localStorage.getItem('chatHistory');
  if (savedHistory) {
    try {
      chatHistory = JSON.parse(savedHistory) || [];
    } catch (error) {
      chatHistory = [];
    }
    renderChatHistory();
  }

  // Step 5: Show welcome message if this is first visit
  if (!chatHistory.length) {
    addBotMessage("Hi! I'm your GCET College Assistant. I can help with timetables, exam schedules, and study materials. What would you like to know?");
  }

  // Step 6: Initialize UI components
  updateDocStatus();           // Update PDF upload status text
  initSheetGestures();         // Enable swipe gestures on bottom sheet
  attachFocusAndClickToggles(); // Auto-expand sheet when user clicks input
}

// ----------------------------------------------------------------------------
// Chat History Management
// ----------------------------------------------------------------------------
// These functions handle displaying and saving chat messages

function renderChatHistory() {
  // Display all saved messages in the chat area
  const chatArea = document.getElementById('chatArea');
  if (!chatArea) return;
  
  // Clear existing messages
  chatArea.innerHTML = '';
  
  // Add each message to the chat
  chatHistory.forEach(msg => {
    const wrapper = document.createElement('div');
    wrapper.className = `message ${msg.role}`; // 'user' or 'bot'
    
    const text = msg.content || msg.text;
    
    if (msg.isHtml) {
      // For structured responses (timetables, PDFs, etc.)
      wrapper.innerHTML = text;
    } else {
      // For simple text messages
      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      bubble.textContent = text;
      wrapper.appendChild(bubble);
    }
    
    chatArea.appendChild(wrapper);
  });
  
  scrollToBottom();
}

function saveChatHistory() {
  // Save all messages to browser storage so they persist across page reloads
  localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

function addUserMessage(text) {
  // Add a new user message to the chat
  chatHistory.push({ 
    role: 'user', 
    content: text, 
    timestamp: new Date().toISOString() 
  });
  saveChatHistory();
  renderChatHistory();
}

function addBotMessage(text, isHtml = false) {
  // Add a new bot response to the chat
  // isHtml = true for timetables, PDFs, etc.
  chatHistory.push({ 
    role: 'bot', 
    content: text, 
    isHtml, 
    timestamp: new Date().toISOString() 
  });
  saveChatHistory();
  renderChatHistory();
}

// ----------------------------------------------------------------------------
// Message Sending & Input Handling
// ----------------------------------------------------------------------------

function handleKeyPress(event) {
  // Send message when user presses Enter key
  if (event.key === 'Enter') {
    event.preventDefault();
    sendMessage();
  }
}

function sendQuickMessage(text) {
  // When user clicks a quick action chip, fill input and send
  const input = document.getElementById('messageInput');
  if (!input) return;
  input.value = text;
  sendMessage();
}

function showTypingIndicator() {
  // Show animated "..." while bot is thinking
  hideTypingIndicator(); // Remove old indicator if any
  
  const chatArea = document.getElementById('chatArea');
  if (!chatArea) return;
  
  typingNode = document.createElement('div');
  typingNode.className = 'message bot';
  typingNode.id = 'typingIndicator';
  typingNode.innerHTML = '<div class="message-bubble"><div class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div></div>';
  
  chatArea.appendChild(typingNode);
  scrollToBottom();
}

function hideTypingIndicator() {
  // Remove the typing animation
  if (typingNode) {
    typingNode.remove();
    typingNode = null;
  }
}

async function sendMessage() {
  // Main function to send user's message and get bot response
  
  const input = document.getElementById('messageInput');
  if (!input) return;
  
  const text = input.value.trim();
  if (!text) return; // Don't send empty messages
  
  // Add user's message to chat
  addUserMessage(text);
  input.value = ''; // Clear input field
  showTypingIndicator();
  
  try {
    // Try to send message to backend server
    const res = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: text, 
        context: userContext // Include student's branch/semester/batch
      })
    });
    
    if (!res.ok) throw new Error('Server error');
    
    const payload = await res.json();
    hideTypingIndicator();
    
    if (payload.ok) {
      handleStructuredResponse(payload);
    } else {
      addBotMessage(payload.message || 'I ran into a snag. Want to try again?');
    }
    
  } catch (error) {
    // If backend is not available, use mock data
    hideTypingIndicator();
    handleOfflineResponse(text);
  }
}

// ----------------------------------------------------------------------------
// Response Handlers
// ----------------------------------------------------------------------------

function handleStructuredResponse(payload) {
  // Process different types of responses from backend
  switch (payload.type) {
    case 'timetable':
      return displayTimetable(payload.data);
    case 'exam':
      return displayExams(payload.data);
    case 'pdfs':
      return displayPDFs(payload.data || []);
    default:
      return addBotMessage(payload.message || 'How else can I assist you?');
  }
}

function handleOfflineResponse(text) {
  // When backend is not available, show mock/demo data
  // This lets users try the app even without a server
  
  if (/timetable/i.test(text)) {
    displayTimetable(mockTimetable());
    return;
  }
  
  if (/exam/i.test(text)) {
    displayExams(mockExams());
    return;
  }
  
  if (/(pdf|material|question|note)/i.test(text)) {
    displayPDFs(mockPDFs());
    return;
  }
  
  addBotMessage(mockFallback(text));
}

// ----------------------------------------------------------------------------
// Display Functions - Format and show different types of data
// ----------------------------------------------------------------------------

function displayTimetable(data) {
  // Show class schedule in a nice formatted card
  
  if (!data) {
    addBotMessage('No timetable found for your context.');
    return;
  }
  
  // Start building HTML for the timetable card
  let html = '<div class="message-bubble">';
  html += `<div class="timetable-card"><h3>📅 Timetable - ${data.branch} Sem ${data.semester} • Batch ${data.batch}</h3>`;
  
  // Add each day's schedule
  (data.schedule || []).forEach((day, index) => {
    const sectionId = `day-${Date.now()}-${index}`; // Unique ID for toggling
    
    html += `<div class="day-section">`;
    html += `<div class="day-header" onclick="toggleDay('${sectionId}')">${day.day}<span class="chevron">▾</span></div>`;
    html += `<div id="${sectionId}" class="day-body">`;
    
    // Add each class period for this day
    (day.periods || []).forEach(period => {
      html += `<div class="period">`;
      html += `<div class="period-time">${period.time}</div>`;
      html += `<div><strong>${period.subject}</strong></div>`;
      html += `<div style="font-size:12px;color:#666;">${period.teacher || ''}${period.room ? ` • ${period.room}` : ''}</div>`;
      html += `</div>`;
    });
    
    html += `</div></div>`;
  });
  
  html += `</div></div>`;
  addBotMessage(html, true); // true = this is HTML content
}

function displayExams(data) {
  // Show upcoming exam schedule with countdown
  
  if (!data) {
    addBotMessage('No exam schedule found for your context.');
    return;
  }
  
  // Sort exams by date (earliest first)
  const exams = (data.exams || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  
  let html = '<div class="message-bubble">';
  html += `<div class="exam-card"><h3>📝 Exams - ${data.branch} Sem ${data.semester} • Batch ${data.batch}</h3>`;
  
  exams.forEach(exam => {
    const when = formatExamCountdown(exam.date); // e.g., "in 5 days"
    html += `<div class="exam-item">`;
    html += `<div class="exam-date">${when}</div>`;
    html += `<div><strong>${exam.subject}</strong>${exam.venue ? ` • ${exam.venue}` : ''}</div>`;
    html += `</div>`;
  });
  
  html += `</div></div>`;
  addBotMessage(html, true);
}

function displayPDFs(items) {
  // Show list of study materials / PDFs with view and download buttons
  
  let html = '<div class="message-bubble">';
  
  if (!items || !items.length) {
    html += 'No study materials found for your query.';
  } else {
    items.forEach(pdf => {
      html += `<div class="pdf-item">`;
      html += `<div class="pdf-info">`;
      html += `<div class="pdf-title">${pdf.title || pdf.filename}</div>`;
      html += `<div class="pdf-meta">${pdf.subject || ''} • Sem ${pdf.semester || ''} ${pdf.uploaded_at ? `• ${new Date(pdf.uploaded_at).toLocaleDateString()}` : ''}</div>`;
      html += `</div>`;
      html += `<div class="pdf-actions">`;
      
      if (pdf.file_url) {
        // Show view and download buttons if we have a URL
        html += `<button class="btn-small" onclick="openPreview('${pdf.file_url}')">View</button>`;
        html += `<a class="btn-small" href="${pdf.file_url}" download>Download</a>`;
      } else {
        html += `<button class="btn-small" onclick="alert('Connect the backend to enable downloads.')">Download</button>`;
      }
      
      html += `</div></div>`;
    });
  }
  
  html += `</div>`;
  addBotMessage(html, true);
}

function formatExamCountdown(dateString) {
  const examDate = new Date(dateString);
  const now = new Date();
  const diff = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
  const dateLabel = examDate.toDateString();
  if (diff > 0) return `${dateLabel} • in ${diff} day${diff === 1 ? '' : 's'}`;
  if (diff === 0) return `${dateLabel} • Today`;
  return `${dateLabel} • Completed`;
}

function toggleDay(id) {
  const body = document.getElementById(id);
  if (!body) return;
  body.classList.toggle('hidden');
}

function openPreview(url) {
  const frame = document.getElementById('previewFrame');
  const modal = document.getElementById('previewModal');
  if (frame) frame.src = url;
  if (modal) modal.classList.remove('hidden');
}

function closePreview() {
  const frame = document.getElementById('previewFrame');
  const modal = document.getElementById('previewModal');
  if (frame) frame.src = 'about:blank';
  if (modal) modal.classList.add('hidden');
}

// ----------------------------------------------------------------------------
// Voice Input (Speech Recognition)
// ----------------------------------------------------------------------------

function toggleVoice() {
  // Start or stop voice recording
  
  // Check if browser supports speech recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Voice input is not supported on this browser.');
    return;
  }
  
  // Initialize speech recognition on first use
  if (!recognition) {
    recognition = new SpeechRecognition();
    recognition.interimResults = false; // Only give final results
    recognition.lang = 'en-IN'; // Indian English
    
    // Set up event handlers
    recognition.onstart = () => updateVoiceUI(true);
    recognition.onend = () => updateVoiceUI(false);
    recognition.onerror = () => updateVoiceUI(false);
    
    recognition.onresult = (event) => {
      // When speech is recognized, put it in the input field
      const transcript = event.results[0][0].transcript;
      document.getElementById('messageInput').value = transcript.trim();
    };
  }
  
  // Toggle microphone on/off
  if (isListening) {
    recognition.stop();
  } else {
    recognition.start();
  }
}

function updateVoiceUI(active) {
  // Update UI to show voice recording status
  
  isListening = active;
  const voiceBox = document.getElementById('voiceStatusBox');
  const statusLabel = document.getElementById('voiceStatus');
  const micBtn = document.getElementById('micBtn');
  
  // Highlight microphone button when listening
  if (micBtn) {
    micBtn.classList.toggle('listening', active);
  }
  
  // Update status text
  if (statusLabel) {
    statusLabel.textContent = active ? 'Listening…' : 'Inactive';
  }
  
  if (!voiceBox) return;
  
  // Show voice status popup
  voiceBox.classList.remove('hidden');
  
  // Auto-hide popup after recording stops
  if (voiceHideTimeout) clearTimeout(voiceHideTimeout);
  if (!active) {
    voiceHideTimeout = setTimeout(() => {
      voiceBox.classList.add('hidden');
    }, 1200);
  }
}

function handleDocUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  uploadedDoc = file;
  expandSheetTools();
  updateDocStatus();
  const safeName = escapeHtml(file.name);
  addBotMessage(`Document <strong>${safeName}</strong> uploaded. Tap summarise for a quick overview.`, true);
  event.target.value = '';
}

function updateDocStatus() {
  const status = document.getElementById('docStatus');
  if (!status) return;
  if (!uploadedDoc) {
    status.textContent = 'No document uploaded yet.';
    status.classList.remove('active');
    return;
  }
  const sizeKb = Math.max(1, Math.round(uploadedDoc.size / 1024));
  status.textContent = `${uploadedDoc.name} • ${sizeKb} KB ready to summarise.`;
  status.classList.add('active');
}

// ----------------------------------------------------------------------------
// Bottom Sheet Gestures (Swipe to expand/collapse)
// ----------------------------------------------------------------------------

function initSheetGestures() {
  // Enable touch/mouse gestures to collapse and expand the bottom sheet
  
  const sheet = document.getElementById('bottomSheet');
  if (!sheet) return;
  
  const tools = document.getElementById('sheetTools');
  
  // Check if sheet starts collapsed
  isSheetCollapsed = !!((sheet && sheet.classList.contains('collapsed')) || 
                        (tools && tools.classList.contains('collapsed')));
  
  // Track touch/pointer movement
  const pointerState = { 
    id: null,       // Which pointer (finger/mouse) we're tracking
    startY: 0,      // Where the drag started
    handled: false  // Whether we've already triggered an action
  };

  const beginPointerTracking = (event) => {
    // Start tracking when user touches/clicks on the sheet
    
    // Ignore if not the primary pointer or not left mouse button
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    
    // Don't handle gestures on the input field
    if (event.target.closest('.input-row')) return;
    
    // Only handle gestures on specific areas
    if (!event.target.closest('.drag-handle, .sheet-tools, .sheet-header')) return;
    
    pointerState.id = event.pointerId;
    pointerState.startY = event.clientY;
    pointerState.handled = false;
  };

  const maybeHandleSwipe = (event) => {
    // Check if user has swiped up or down enough to trigger action
    
    if (pointerState.id === null || event.pointerId !== pointerState.id) return;
    
    const delta = event.clientY - pointerState.startY; // How far user moved
    const threshold = 24; // Minimum movement to trigger action

    if (!pointerState.handled && Math.abs(delta) > threshold) {
      pointerState.handled = true;
      try { sheet.setPointerCapture(event.pointerId); } catch (_) {}
      
      if (delta > 0) {
        // Swiped down = collapse
        collapseSheetTools();
      } else {
        // Swiped up = expand
        expandSheetTools();
      }
    }

    if (pointerState.handled) {
      event.preventDefault(); // Don't scroll the page
    }
  };

  const endPointerTracking = (event) => {
    // Clean up when user stops touching/clicking
    
    if (pointerState.id === null || event.pointerId !== pointerState.id) return;
    try { sheet.releasePointerCapture(event.pointerId); } catch (_) {}
    
    pointerState.id = null;
    pointerState.startY = 0;
    pointerState.handled = false;
  };

  // Set up event listeners for pointer events
  sheet.addEventListener('pointerdown', beginPointerTracking);
  sheet.addEventListener('pointermove', maybeHandleSwipe);
  sheet.addEventListener('pointerup', endPointerTracking);
  sheet.addEventListener('pointercancel', endPointerTracking);
  sheet.addEventListener('lostpointercapture', endPointerTracking);

  // Also handle mouse wheel scrolling
  sheet.addEventListener('wheel', (event) => {
    if (event.deltaY > 10) {
      collapseSheetTools(); // Scroll down = collapse
    } else if (event.deltaY < -10) {
      expandSheetTools(); // Scroll up = expand
    }
  }, { passive: true });

  // Click on drag handle to toggle
  const handle = sheet.querySelector('.drag-handle');
  if (handle) {
    handle.addEventListener('click', () => {
      if (isSheetCollapsed) {
        expandSheetTools();
      } else {
        collapseSheetTools();
      }
    });
  }
}

function attachFocusAndClickToggles() {
  // Auto-expand or collapse bottom sheet based on where user clicks
  
  const chatArea = document.getElementById('chatArea');
  const messageInput = document.getElementById('messageInput');
  const inputWrapper = document.querySelector('.input-wrapper');

  // Clicking on chat area collapses the sheet (to see more messages)
  if (chatArea) {
    chatArea.addEventListener('click', () => {
      collapseSheetTools();
    });
  }

  const expandOnEvent = () => { 
    expandSheetTools(); 
  };

  // Focusing or clicking input expands the sheet (to show options)
  if (messageInput) {
    messageInput.addEventListener('focus', expandOnEvent);
    messageInput.addEventListener('click', expandOnEvent);
  }

  if (inputWrapper) {
    inputWrapper.addEventListener('click', expandOnEvent);
  }
}

function collapseSheetTools() {
  // Minimize the bottom sheet to show only input field
  
  const tools = document.getElementById('sheetTools');
  const sheet = document.getElementById('bottomSheet');
  
  if (tools) {
    tools.classList.add('collapsed');
  }
  if (sheet) {
    sheet.classList.add('collapsed');
  }
  
  isSheetCollapsed = true;
  closeHistoryDrawer(); // Also close history if open
}

function expandSheetTools() {
  // Expand the bottom sheet to show all options
  
  const tools = document.getElementById('sheetTools');
  const sheet = document.getElementById('bottomSheet');
  
  if (tools) {
    tools.classList.remove('collapsed');
  }
  if (sheet) {
    sheet.classList.remove('collapsed');
  }
  
  isSheetCollapsed = false;
}

function summariseDocument() {
  if (!uploadedDoc) {
    addBotMessage('Please upload a document first.');
    return;
  }
  expandSheetTools();
  const btn = document.getElementById('summariseBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Summarising…';
  }
  const safeName = escapeHtml(uploadedDoc.name);
  addBotMessage(`Summarising <strong>${safeName}</strong>…`, true);
  setTimeout(() => {
    addBotMessage(`<strong>Summary preview:</strong><br/>This is a placeholder summary for <em>${safeName}</em>. Connect the backend to generate real insights.`, true);
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Summarise';
    }
  }, 1200);
}

function saveContext() {
  userContext = {
    branch: document.getElementById('branchSelect').value,
    semester: parseInt(document.getElementById('semesterSelect').value, 10) || 1,
    batch: document.getElementById('batchSelect').value
  };
  localStorage.setItem('userContext', JSON.stringify(userContext));
  const modal = document.getElementById('contextModal');
  if (modal) modal.classList.add('hidden');
  addBotMessage(`Great! I'll remember you're in ${userContext.branch} Semester ${userContext.semester}, Batch ${userContext.batch}.`);
}

function openContextModal() {
  const modal = document.getElementById('contextModal');
  if (modal) modal.classList.remove('hidden');
}

function showTyping() { showTypingIndicator(); }
function hideTyping() { hideTypingIndicator(); }

function scrollToBottom() {
  const chatArea = document.getElementById('chatArea');
  if (!chatArea) return;
  requestAnimationFrame(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });
}

// ----------------------------------------------------------------------------
// Theme Management (Light / Dark Mode)
// ----------------------------------------------------------------------------

function toggleTheme() {
  // Switch between light and dark mode
  const isDark = document.body.classList.contains('dark-mode');
  const next = isDark ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next); // Remember user's choice
}

function applyTheme(theme) {
  // Apply light or dark theme to the page
  const body = document.body;
  const toggle = document.getElementById('modeToggle');
  
  // Add or remove dark-mode class
  if (theme === 'dark') {
    body.classList.add('dark-mode');
  } else {
    body.classList.remove('dark-mode');
  }
  
  if (!toggle) return;
  
  // Update toggle button appearance
  toggle.classList.toggle('active', theme === 'dark');
  
  // Swap icon (moon for light mode, sun for dark mode)
  const icon = toggle.querySelector('.mode-icon');
  if (icon) {
    icon.innerHTML = MODE_ICONS[theme] || '';
  }
  
  // Update accessibility labels
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  toggle.setAttribute('aria-label', label);
  toggle.setAttribute('title', label);
}

function escapeHtml(value = '') {
  // Prevent XSS attacks by converting special characters to HTML entities
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char] || char));
}

// ----------------------------------------------------------------------------
// Mock Data Functions (Demo data when backend is not available)
// ----------------------------------------------------------------------------
// These functions generate fake data so you can test the app without a server

function mockTimetable() {
  // Generate sample timetable data
  return {
    branch: userContext.branch || 'CSE',
    semester: userContext.semester || 3,
    batch: userContext.batch || '2025',
    schedule: [
      { 
        day: 'Monday', 
        periods: [
          { time: '09:00 - 10:00', subject: 'Web Technology', room: 'B201', teacher: 'Prof. Gupta' },
          { time: '10:00 - 11:00', subject: 'DSA', room: 'B202', teacher: 'Prof. Rao' }
        ]
      },
      { 
        day: 'Tuesday', 
        periods: [
          { time: '09:00 - 10:00', subject: 'Operating Systems', room: 'C101', teacher: 'Prof. Jain' }
        ]
      }
    ]
  };
}

function mockExams() {
  // Generate sample exam schedule
  return {
    branch: userContext.branch || 'CSE',
    semester: userContext.semester || 3,
    batch: userContext.batch || '2025',
    exams: [
      { 
        subject: 'Web Technology', 
        date: new Date(Date.now() + 7 * 86400000).toISOString(), // 7 days from now
        venue: 'Main Hall' 
      },
      { 
        subject: 'DSA', 
        date: new Date(Date.now() + 10 * 86400000).toISOString(), // 10 days from now
        venue: 'Seminar Room' 
      }
    ]
  };
}

function mockPDFs() {
  // Generate sample study materials
  return [
    { 
      title: 'Web Technology Notes - Unit 1', 
      subject: 'Web Technology', 
      semester: userContext.semester || 3, 
      file_url: 'https://arxiv.org/pdf/1706.03762.pdf', 
      uploaded_at: new Date().toISOString() 
    },
    { 
      title: 'DSA Question Paper 2024', 
      subject: 'DSA', 
      semester: userContext.semester || 3, 
      file_url: 'https://arxiv.org/pdf/1807.01697.pdf', 
      uploaded_at: new Date().toISOString() 
    }
  ];
}

function mockFallback(text) {
  // Generic response when we can't match user's query
  return `Got it! I noted "${text}". Once the backend is connected I'll fetch the exact answer.`;
}

// ----------------------------------------------------------------------------
// Chat History Drawer (Side panel showing past conversations)
// ----------------------------------------------------------------------------

function toggleHistoryDrawer() {
  // Open or close the history side panel
  
  const drawer = document.getElementById('historyDrawer');
  if (drawer.classList.contains('hidden')) {
    expandSheetTools();
    loadHistoryDrawer();
    drawer.classList.remove('hidden');
  } else {
    drawer.classList.add('hidden');
  }
}

function closeHistoryDrawer() {
  // Close the history drawer
  
  const drawer = document.getElementById('historyDrawer');
  if (drawer && !drawer.classList.contains('hidden')) {
    drawer.classList.add('hidden');
  }
}

function closeHistoryOnBackdrop(event) {
  // Close drawer when user clicks outside of it
  
  if (event.target === event.currentTarget) {
    closeHistoryDrawer();
  }
}

function loadHistoryDrawer() {
  // Load and display chat history grouped by conversation sessions
  
  const historyContent = document.getElementById('historyContent');
  
  if (!chatHistory || chatHistory.length === 0) {
    historyContent.innerHTML = '<p class="history-empty">No chat history yet</p>';
    return;
  }
  
  // Group messages into sessions (separated by 30-minute gaps)
  const sessions = [];
  let currentSession = [];
  
  chatHistory.forEach((msg, index) => {
    currentSession.push(msg);
    
    // Start new session if:
    // 1. This is the last message, OR
    // 2. Next message is more than 30 minutes later
    const isLastMessage = index === chatHistory.length - 1;
    const nextMsg = chatHistory[index + 1];
    const bigGap = nextMsg && 
                   (new Date(nextMsg.timestamp) - new Date(msg.timestamp)) > 30 * 60 * 1000;
    
    if (isLastMessage || bigGap) {
      sessions.push([...currentSession]);
      currentSession = [];
    }
  });
  
  // Build HTML for each session
  historyContent.innerHTML = sessions.map((session, sessionIndex) => {
    const firstUserMsg = session.find(msg => msg.role === 'user');
    const preview = firstUserMsg ? firstUserMsg.content : 'Chat session';
    const timestamp = new Date(session[0].timestamp).toLocaleString();
    
    return `
      <div class="history-item" onclick="loadHistorySession(${sessionIndex})">
        <div class="history-item-title">Session ${sessions.length - sessionIndex}</div>
        <div class="history-item-preview">${preview.substring(0, 60)}${preview.length > 60 ? '...' : ''}</div>
        <div class="history-item-time">${timestamp}</div>
      </div>
    `;
  }).join('');
}

function loadHistorySession(sessionIndex) {
  // Future feature: Load a specific session back into the chat
  // For now, just closes the drawer
  
  toggleHistoryDrawer();
}

function clearChatHistory() {
  // Delete all chat history (with confirmation)
  
  if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
    chatHistory = [];
    localStorage.removeItem('chatHistory');
    loadHistoryDrawer();
    
    // Reset chat area to show only welcome message
    const chatArea = document.getElementById('chatArea');
    chatArea.innerHTML = `
      <div class="message bot">
        <div class="message-bubble">
          Hi! I'm your GCET College Assistant. I can help with timetables, exam schedules, and study materials. What would you like to know?
        </div>
      </div>
    `;

    closeHistoryDrawer();
  }
}
