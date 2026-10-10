# 🎮 GameConnect — Find Your Squad. Dominate Together.

A high-performance, full-stack **MERN** gaming social network and squad coordination platform designed for competitive and casual gamers. GameConnect bridges the gap between looking for group (LFG) and in-game communication with real-time party lobbies, WebRTC voice channels, coach bookings, scrim matchmaking, and synergy scoring.

---

## 🌟 Key Features

### 1. 💬 Real-Time Direct & Party Chat
* **Socket.io Real-Time Messaging**: Low-latency communication for 1-on-1 direct messages and multiplayer party lobbies.
* **Rich Media & GIFs**: Native file/image upload via Cloudinary, built-in GIF search and picker, and emoji reactions.
* **Party Lobby Icebreakers**: Context-aware squad icebreaker chips to quickly initiate voice comms and role checks.

### 2. 🎯 Looking For Group (LFG) System
* **Dynamic LFG Board**: Search and filter squad posts by game (Valorant, Apex Legends, CS2, League of Legends, etc.), activity type (Casual, Ranked Push, Tournaments), and skill requirements.
* **One-Click Auto-Join**: Instantly jump into open party slots with real-time roster counter updates.

### 3. 🎙️ WebRTC Voice HUD & Audio Channels
* **Peer-to-Peer Voice Chat**: Integrated WebRTC voice comms directly within your browser.
* **Active Speaker Indicators**: Real-time voice activity detection (VAD), volume meters, mute/deafen controls, and party member audio rosters.

### 4. 🧠 Gamer Synergy Engine & Matchmaking
* **Algorithmic Compatibility**: Calculates synergy scores between players based on preferred games, playstyles, active gaming schedules, and reputation.
* **Quick Match (Micro-Lobby)**: Algorithmic quick-pairing to assemble squads in seconds.

### 5. 🏆 Scrims & Coach Booking
* **Team Scrim Finder**: Challenge rival squads to formatted practice matches (5v5 Best of 3, scrim credentials, room lobby exchange).
* **Coach Marketplace**: Browse verified gaming coaches, check hourly rates, read reviews, and schedule 1-on-1 coaching sessions.

### 6. 🛡️ Safety, Moderation & Endorsements
* **Player Reputation**: Commend teammates with peer endorsements (*Team Player*, *Shot Caller*, *Positive Attitude*).
* **Automated Moderation**: Profanity and toxic behavior filtering, report logging, and moderation tooling.

### 7. 🔔 In-App Notification Center & Theming
* **Real-Time Notification Popover**: Receive desktop & in-app alerts for squad joins, party invites, friend requests, and scrim challenges.
* **Multiple Visual Themes**: Easily toggle between **Sky Frost** (Default), **Neon Cyberpunk**, and **Darker Abyss** palettes.

---

## 🛠️ Tech Stack

### Frontend
* **React 18** with modern functional hooks and context providers (`AuthContext`, `ChatContext`, `VoiceContext`).
* **Vite** for lightning-fast HMR and optimized production bundles.
* **Tailwind CSS** with glassmorphism aesthetics, gradient overlays, and responsive animations.
* **Socket.io-client** & **WebRTC** for real-time signaling and data streams.

### Backend
* **Node.js** & **Express.js** REST API with JWT authentication.
* **MongoDB Atlas** & **Mongoose** for data persistence (Users, Parties, Messages, LFG, Sessions, Scrims).
* **Socket.io** server with room namespaces, presence tracking, and WebRTC signal relay.
* **Cloudinary** for scalable image and media storage.
* **Nodemailer** with Gmail SMTP for secure 6-digit OTP email verification.

---

## 🚀 Quick Start Guide

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* [MongoDB](https://www.mongodb.com/) (Local or Atlas URI)
* [Git](https://git-scm.com/)

---

### 1. Clone the Repository
```bash
git clone https://github.com/Amarnathpalanivel/GameConnect.git
cd GameConnect
```

---

### 2. Backend Setup
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` configuration:
   ```bash
   cp .env.example .env
   ```
4. Fill in your environment variables in `server/.env`:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_16_char_google_app_password
   ```
5. Start the backend server:
   ```bash
   npm run dev
   # or: node server.js
   ```

---

### 3. Frontend Setup
1. In a new terminal, navigate to the client directory:
   ```bash
   cd client
   ```
2. Install client dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing & Verification

GameConnect includes comprehensive automated verification suites covering all integration points:

```bash
# 1. Master End-to-End Suite (Validates 40 core integration points)
node test_suite.mjs

# 2. Phase 4 Suite: LFG, Session Scheduling, Notifications
node test_phase4.mjs

# 3. Phase 5 Suite: WebRTC Signaling, Voice HUD, Rooms
node test_phase5.mjs

# 4. Phase 6 Suite: Moderation, Endorsements, GIFs, PWA endpoints
node test_phase6.mjs
```

---

## 📁 Project Architecture

```
chat-app/
├── client/                     # Vite + React Frontend
│   ├── public/                 # Static assets & PWA manifest
│   ├── src/
│   │   ├── components/         # ChatContainer, Sidebar, RightSidebar, VoiceHUD, etc.
│   │   ├── context/            # AuthContext, ChatContext, VoiceContext
│   │   ├── pages/              # LoginPage, SignupPage, ProfilePage, FriendsPage
│   │   ├── App.jsx             # Main router & layout shell
│   │   └── main.jsx            # Application entrypoint
│   └── package.json
│
├── server/                     # Express.js + Socket.io Backend
│   ├── controllers/            # auth, message, party, lfg, scrim, voice controllers
│   ├── models/                 # Mongoose schemas (User, Message, Party, Post, etc.)
│   ├── routes/                 # Express API routes
│   ├── lib/                    # db connection, socket handlers, cloudinary, mailer
│   ├── server.js               # Entry server & Socket.io initialization
│   └── package.json
│
├── test_suite.mjs              # Master E2E testing script
├── test_phase4.mjs             # Phase 4 verification
├── test_phase5.mjs             # Phase 5 verification
├── test_phase6.mjs             # Phase 6 verification
└── README.md
```

---

## 📜 License

This project is licensed under the MIT License. Built with ❤️ for the gaming community by [Amarnath Palanivel](https://github.com/Amarnathpalanivel).
