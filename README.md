# 🏠 HomeRent Pro — Advanced Room Rental Platform

A premium, feature-rich room rental platform built with **Flask** backend and **vanilla HTML/CSS/JS** frontend. All data stored in JSON files — no database required!

## ✨ Features

### 🔐 Authentication
- User registration with **Owner** / **Tenant** roles
- Secure login with password hashing (Werkzeug)
- Session-based token authentication
- Profile management & password change

### 🏘️ Property Management
- Full CRUD for room listings
- Multi-step property listing form
- Image gallery support (multiple URLs)
- Amenities selection with checkboxes
- Furnishing type (Fully/Semi/Unfurnished)

### 🔍 Search & Discovery
- Location-based search
- Price range filtering
- BHK & furnishing filters
- Sort by: newest, price, rating, popularity
- Pagination support

### 📅 Booking System
- Tenants can send booking requests
- Owners can approve/reject bookings
- Booking status tracking (pending/approved/rejected/cancelled)
- Move-in date & duration selection

### ⭐ Reviews & Ratings
- Star rating system (1-5)
- Text reviews per property
- Average rating calculation
- Review display with user info

### ❤️ Favorites
- Save/unsave properties
- Favorites page with quick access
- Animated remove functionality

### 💬 Messaging
- In-app messaging between users
- Conversation list with unread counts
- Real-time style chat interface
- Message from property details page

### 📊 Owner Dashboard
- Stats cards (rooms, bookings, revenue, rating, views, reviews)
- Property management (view/delete)
- Booking request handling
- Quick add property access

### 🎨 Premium UI
- **Dark mode** by default with light mode toggle
- **Glassmorphism** cards and navigation
- **Inter** font (Google Fonts)
- **Font Awesome 6** icons
- Smooth micro-animations
- Skeleton loading states
- Toast notification system
- Fully responsive (mobile-first)

## 📁 Project Structure

```
HomeRentPro/
├── backend/
│   ├── app.py                  # Flask API server
│   ├── requirements.txt        # Python dependencies
│   └── data/                   # JSON data storage
│       ├── users.json
│       ├── rooms.json          # Pre-seeded with 6 listings
│       ├── bookings.json
│       ├── reviews.json
│       ├── messages.json
│       ├── favorites.json
│       └── contacts.json
├── frontend/
│   ├── index.html              # Home page
│   ├── login.html              # Login
│   ├── register.html           # Registration
│   ├── add-room.html           # Add property (multi-step)
│   ├── room-details.html       # Property details
│   ├── dashboard.html          # Owner dashboard
│   ├── bookings.html           # Bookings management
│   ├── favorites.html          # Saved properties
│   ├── messages.html           # In-app messaging
│   ├── profile.html            # User profile
│   ├── contact.html            # Contact page
│   ├── css/
│   │   └── style.css           # Premium design system
│   └── js/
│       ├── api.js              # API calls & utilities
│       ├── app.js              # Main app logic
│       ├── auth.js             # Auth handling
│       ├── add-room.js
│       ├── room-details.js
│       ├── dashboard.js
│       ├── bookings.js
│       ├── favorites.js
│       ├── messages.js
│       ├── profile.js
│       └── contact.js
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- **Python 3.7+** (check with `python --version` or `python3 --version`)
- **VS Code** (recommended editor)
- Any modern web browser (Chrome, Firefox, Edge)

---

### 📋 Running in VS Code — Step by Step

#### Step 1: Open the Project in VS Code

```bash
# Open terminal and navigate to the project
cd HomeRentPro
code .
```

Or open VS Code → **File → Open Folder** → select the `HomeRentPro` folder.

---

#### Step 2: Set Up Python Virtual Environment

Open a **new terminal** in VS Code (`Ctrl + ~` or **Terminal → New Terminal**):

```bash
# Navigate to the backend folder
cd backend

# Create virtual environment (only needed once)
python3 -m venv venv

# Activate virtual environment
# On Linux/macOS:
source venv/bin/activate

# On Windows (Command Prompt):
venv\Scripts\activate

# On Windows (PowerShell):
venv\Scripts\Activate.ps1
```

You should see `(venv)` at the start of your terminal prompt — this means it is activated.

---

#### Step 3: Install Python Dependencies

```bash
# Make sure you are inside the backend/ folder with venv activated
pip install -r requirements.txt
```

---

#### Step 4: Start the Backend Server

```bash
# Still inside backend/ folder with venv activated
python app.py
```

You should see:

```
🏠 HomeRent Pro API Server
========================================
Server running at: http://localhost:5000
========================================
```

> ⚠️ **Keep this terminal running!** The backend must stay active while using the app.

---

#### Step 5: Start the Frontend Server

Open a **second terminal** in VS Code (click the `+` icon in the terminal panel):

**Option A — Using Python HTTP server (simplest):**

```bash
cd frontend
python3 -m http.server 8080
```

Then open **http://localhost:8080** in your browser.

**Option B — Using VS Code Live Server extension (recommended):**

1. Install the **Live Server** extension from VS Code Extensions (`Ctrl+Shift+X`)
   - Search for "Live Server" by **Ritwick Dey** → click **Install**
2. Open `frontend/index.html` in VS Code
3. Right-click inside the file → **"Open with Live Server"**
4. Browser opens automatically (usually at `http://127.0.0.1:5500`)

> 💡 **Live Server** auto-refreshes when you edit files — great for development!

---

#### Step 6: Open in Browser

| Method | URL |
|--------|-----|
| Python HTTP server | **http://localhost:8080** |
| Live Server | **http://127.0.0.1:5500** (auto-opens) |

> 🎉 You should now see the HomeRent Pro homepage with room listings!

---

### ⚡ Quick Start (Copy-Paste)

If you want to start everything in one go, run these commands in **two separate terminals**:

**Terminal 1 — Backend:**
```bash
cd HomeRentPro/backend
source venv/bin/activate    # Linux/Mac
python app.py
```

**Terminal 2 — Frontend:**
```bash
cd HomeRentPro/frontend
python3 -m http.server 8080
```

Then open **http://localhost:8080** in your browser.

---

### 🛑 How to Stop the Servers

- Press `Ctrl + C` in each terminal to stop the server
- To deactivate the virtual environment: type `deactivate`

---

### ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| `python` command not found | Try `python3` instead |
| Port 5000 already in use | Run `lsof -i :5000` to find the process, then `kill <PID>` |
| Port 8080 already in use | Use a different port: `python3 -m http.server 9090` |
| Rooms not loading on frontend | Make sure the backend is running on port 5000 first |
| CORS error in browser console | Don't open HTML files directly (`file://`), always use a server |
| `pip install` fails | Make sure virtual environment is activated (`source venv/bin/activate`) |
| Page looks old after changes | Hard refresh: `Ctrl + Shift + R` in the browser |

## 🧪 Quick Test Guide

1. **Browse** the home page — 6 pre-loaded properties visible
2. **Register** as an **Owner** — create account
3. **Add a Room** — use the multi-step form
4. **Register** another account as **Tenant** (use incognito)
5. **View Details** — check property page, image gallery, amenities
6. **Book a Room** — send booking request as tenant
7. **Dashboard** — login as owner to see stats & approve bookings
8. **Review** — add star rating & review as tenant
9. **Favorites** — save rooms to favorites
10. **Messages** — send message to owner from property page
11. **Dark/Light Mode** — toggle with the sun/moon button

## 🔌 API Endpoints

| Method | Endpoint                      | Description            | Auth |
|--------|-------------------------------|------------------------|------|
| POST   | `/api/auth/register`          | Register new user      | ❌    |
| POST   | `/api/auth/login`             | Login                  | ❌    |
| POST   | `/api/auth/logout`            | Logout                 | ✅    |
| GET    | `/api/auth/me`                | Get current user       | ✅    |
| PUT    | `/api/auth/update`            | Update profile         | ✅    |
| GET    | `/api/rooms`                  | Get all rooms          | ❌    |
| GET    | `/api/rooms/featured`         | Get featured rooms     | ❌    |
| GET    | `/api/rooms/<id>`             | Get room by ID         | ❌    |
| POST   | `/api/rooms`                  | Add room               | ✅ 🏠 |
| PUT    | `/api/rooms/<id>`             | Update room            | ✅ 🏠 |
| DELETE | `/api/rooms/<id>`             | Delete room            | ✅ 🏠 |
| GET    | `/api/search?...`             | Search rooms           | ❌    |
| POST   | `/api/bookings`               | Create booking         | ✅    |
| GET    | `/api/bookings/tenant`        | Tenant's bookings      | ✅    |
| GET    | `/api/bookings/owner`         | Owner's bookings       | ✅    |
| PUT    | `/api/bookings/<id>/status`   | Update booking status  | ✅    |
| GET    | `/api/reviews/<roomId>`       | Get room reviews       | ❌    |
| POST   | `/api/reviews`                | Add review             | ✅    |
| GET    | `/api/favorites`              | Get user favorites     | ✅    |
| POST   | `/api/favorites/toggle`       | Toggle favorite        | ✅    |
| POST   | `/api/messages`               | Send message           | ✅    |
| GET    | `/api/messages/conversations` | Get conversations      | ✅    |
| GET    | `/api/messages/thread/<id>`   | Get message thread     | ✅    |
| GET    | `/api/dashboard/stats`        | Owner stats            | ✅    |
| POST   | `/api/contact`                | Submit contact form    | ❌    |

✅ = Auth required | 🏠 = Owner only

## 🛠️ Tech Stack

- **Backend**: Python Flask, Flask-CORS, Werkzeug
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Storage**: JSON files (no database)
- **Icons**: Font Awesome 6
- **Typography**: Inter (Google Fonts)
- **Design**: Glassmorphism, Dark/Light mode, CSS Custom Properties

## 📄 License

Open source — free for personal and commercial use.

---

**Made with ❤️ by HomeRent Pro Team**
