# GCET College Assistant 🎓

**Your intelligent college companion for timetables, exams, and study materials**

A modern, mobile-first chatbot interface designed specifically for GCET students. This application helps students access their class schedules, exam dates, and study materials through an intuitive chat interface with voice support.

---

## ✨ Features

### Core Functionality
- 💬 **Smart Chat Interface** - Natural conversation flow with typing indicators
- 📅 **Timetable Access** - View your daily class schedule with teacher and room details
- 📝 **Exam Schedule** - See upcoming exams with countdown timers
- 📚 **Study Materials** - Access and preview PDF notes and question papers
- 🎤 **Voice Input** - Hands-free operation using speech recognition
- 🌓 **Dark Mode** - Eye-friendly theme that switches automatically
- 📱 **Mobile-First Design** - Looks great on phones and tablets

### Smart Features
- **Profile Management** - Saves your branch, semester, and batch
- **Chat History** - Keeps track of all your conversations
- **Swipe Gestures** - Intuitive sheet controls for better UX
- **Offline Support** - Works with demo data even without internet
- **Session Persistence** - Remembers your settings across visits

---

## 📁 Project Structure

```
chatbot/
├── index.html      # Main chat interface
├── intro.html      # Welcome/landing page
├── style.css       # All styling and themes
├── script.js       # Application logic and interactions
└── README.md       # This file
```

### File Descriptions

**index.html** - The main chat application
- Phone-style container with header
- Scrollable chat area for messages
- Bottom sheet with quick action chips
- Profile setup modal
- PDF preview modal
- Chat history drawer

**intro.html** - Introduction and welcome page
- Hero card with app branding
- Feature showcase with icons
- Fixed "Enter Assistant" button
- Profile setup on first visit

**style.css** - Complete styling system
- Mobile-responsive layout (works on any screen size)
- Light and dark theme support
- Smooth animations and transitions
- Card-based component design
- Glassmorphism effects

**script.js** - Application brain
- Chat message handling
- API communication (with fallback to demo data)
- Voice recognition integration
- Theme switching logic
- Data persistence (localStorage)
- Gesture controls for bottom sheet

---

## 🚀 Getting Started

### Option 1: Direct File Access (Simplest)

1. **Open the intro page**
   ```
   Double-click `intro.html` in your file explorer
   ```

2. **Set up your profile**
   - A modal will appear after 4 seconds
   - Select your Branch, Semester, and Batch
   - Click "Save & Continue"

3. **Start chatting**
   - Click "Enter Assistant" button
   - Try the quick action chips: Timetable, Exams, Web Technology Notes
   - Or type your own questions

### Option 2: Local Web Server (Recommended for Development)

If you have Node.js installed:

```powershell
# Navigate to the chatbot folder
cd "C:\Program Files (x86)\sahilaw\chatbot"

# Start a simple web server
npx http-server -p 8080

# Open in browser
# http://localhost:8080/intro.html
```

---

## 💡 How It Works

### 1. **Initial Setup**
When you first open the app:
1. Theme is loaded from browser storage (defaults to light mode)
2. Profile data (branch/semester/batch) is checked
3. If no profile exists, setup modal appears
4. Previous chat history is restored (if any)

### 2. **Sending a Message**
When you send a message:
1. Message is added to chat history
2. App shows typing indicator
3. Tries to contact backend server at `http://localhost:4000/api`
4. If server is unavailable, uses built-in demo data
5. Response is formatted and displayed
6. Everything is saved to localStorage

### 3. **Data Storage**
The app uses browser localStorage to save:
- `gcet_theme` - Current theme (light/dark)
- `userContext` - Your profile (branch/semester/batch)
- `chatHistory` - All your chat messages

### 4. **Voice Input**
When you click the microphone button:
1. Browser asks for microphone permission (first time only)
2. Speech recognition starts listening
3. What you say is converted to text
4. Text appears in the input field
5. You can then send it or edit it first

---

## 🎯 Quick Demo Guide (For Presentations)

**5-Minute Demo Flow:**

1. **Open intro.html** (0:30)
   - Show the hero card and features list
   - Highlight "Your college companion" tagline
   - Click "Enter Assistant"

2. **Profile Setup** (0:30)
   - Modal appears automatically
   - Fill in: Branch = CSE, Semester = 3, Batch = 2025
   - Click "Save & Continue"

3. **Try Quick Actions** (2:00)
   - Click "📅 Timetable" chip → Shows class schedule by day
   - Click "📝 Exams" chip → Shows upcoming exams with countdown
   - Click "📚 Web Technology Notes" chip → Shows study materials list

4. **Voice Input Demo** (1:00)
   - Click microphone button
   - Say "Show my timetable"
   - Watch it fill the input and send

5. **Show Features** (1:00)
   - Toggle dark mode (moon/sun icon in header)
   - Open chat history (clock icon in bottom sheet)
   - Swipe down on bottom sheet to minimize

---

## 🔧 Configuration

### Changing the Backend URL

Edit `script.js`, line 7:
```javascript
const API_BASE = 'http://localhost:4000/api';
```

Change this to your backend server URL when deploying.

### Customizing Mock Data

The app has built-in demo data in `script.js`:
- `mockTimetable()` - Sample class schedule
- `mockExams()` - Sample exam dates
- `mockPDFs()` - Sample study materials

You can edit these functions to show your own demo data.

### Adjusting Profile Options

Edit the dropdowns in `index.html` and `intro.html`:
```html
<select id="branchSelect">
  <option value="CSE">Computer Science (CSE)</option>
  <!-- Add more branches here -->
</select>
```

---

## 🐛 Troubleshooting

### Voice Input Not Working
**Problem:** Microphone button doesn't respond
**Solutions:**
- Use Chrome or Microsoft Edge (best support)
- Check browser microphone permissions
- HTTPS is required for mic access (except on localhost)
- Try clicking the mic icon twice

### Dark Mode Not Persisting
**Problem:** Theme resets on page reload
**Solutions:**
- Check if localStorage is enabled in browser
- Don't use private/incognito mode
- Clear browser cache and try again

### Chat History Disappeared
**Problem:** Old messages are gone
**Solutions:**
- Check if localStorage was cleared
- Don't clear browser data for this site
- Messages are saved per browser (won't sync across devices)

### PDF Preview Not Opening
**Problem:** "View" button doesn't work
**Solutions:**
- Some browsers block PDF previews
- Try downloading the PDF instead
- Use Chrome or Edge for best results
- Check if popup blocker is interfering

### Backend Connection Failing
**Problem:** "Connect the backend" messages appear
**Solutions:**
- This is normal! App works fine with demo data
- To connect backend: ensure it's running on `http://localhost:4000`
- Check CORS settings on your backend
- Check browser console (F12) for error details

---

## 🎨 Customization Guide

### Changing Colors

All colors are defined in `style.css`. Main color variables:

```css
/* Primary Purple */
#7b3ff2, #a259e6

/* Dark Mode Background */
#1c1f35, #1a1e33

/* Text Colors */
Light mode: #2f1a59, #4b3c73
Dark mode: #f0ecff, #e5e1ff
```

### Modifying Layout

The app uses a phone-container approach:
```css
.phone-container {
  max-width: 400px;    /* Phone width */
  height: min(92vh, 760px);  /* Phone height */
}
```

Adjust these values to change the app dimensions.

### Adding New Quick Action Chips

In `index.html`, find the `.chip-row` section:
```html
<button type="button" class="chip" onclick="sendQuickMessage('Your query here')">
  🆕 New Action
</button>
```

---

## 🔐 Security Notes

- User data is stored locally (never sent to external servers)
- No passwords or sensitive information is collected
- Voice recordings are processed by browser (not saved)
- All HTML is escaped to prevent XSS attacks
- Profile data can be cleared anytime via browser settings

---

## 🚀 Future Enhancements

Potential features for future versions:

- **Backend Integration** - Connect to real database
- **Admin Panel** - Upload and manage materials
- **Notifications** - Exam reminders and announcements
- **Calendar Export** - Download timetable as .ics file
- **Multi-language** - Support for regional languages
- **AI Chatbot** - Natural language processing with OpenAI
- **File Upload** - Students can share notes
- **Discussion Forum** - Subject-wise threads
- **Assignment Tracker** - Deadline management

---

## 📝 Development Notes

### Code Style
- Comprehensive comments explain what each function does
- Functions are grouped by category with headers
- Variable names are descriptive (no cryptic abbreviations)
- Consistent indentation (2 spaces)

### Browser Compatibility
- **Best Experience:** Chrome 90+, Edge 90+
- **Good Experience:** Firefox 88+, Safari 14+
- **Limited:** Older browsers (no voice input)

### Performance
- Chat history limited by browser storage (~5-10MB)
- Images are SVG (very lightweight)
- CSS animations use GPU acceleration
- Lazy loading for chat messages (renders on demand)

---

## 📄 License

This project is created for educational purposes for GCET students.

---

## 👥 Support

For questions or issues:
1. Check the Troubleshooting section above
2. Look at browser console (F12) for error messages
3. Verify all files are in the same folder
4. Try clearing browser cache and reloading

---

## 🎓 About GCET

**Goa College of Engineering and Technology**

This assistant is designed to make student life easier by providing quick access to:
- Class schedules personalized to your branch and semester
- Exam dates with helpful countdowns
- Study materials organized by subject
- Voice-enabled access for hands-free use

---

**Built with ❤️ for GCET Students**

*Last Updated: October 2025*
