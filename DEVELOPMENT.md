# MERN Gaming Chat Application — Software Development Document (SDD)

## 1. Project Overview
This project is a full-stack, real-time gaming communication and social matchmaking application built using the **MERN** stack (MongoDB, Express.js, React, Node.js) with **Socket.io** for real-time messaging, typing indicators, user presence tracking, and multiplayer party lobbies.

### Core Objectives:
- **Gamer Identity & Profiles:** Customizable gamer tags, platforms (PC, PlayStation, Xbox, Nintendo, Mobile), gaming ranks, regions, playstyles, and social links (Twitch, YouTube, Steam, Discord).
- **Real-Time Direct & Group Messaging:** Instant messaging powered by WebSockets, including image uploads via Cloudinary, emoji reactions, message replies, message edits, and soft deletions.
- **Social Graph & Friend Management:** Friend requests lifecycle (send, accept, decline, remove), friend lists, and privacy controls (DMs, visibility, invitations).
- **Party / LFG (Looking for Group) System:** Create and manage party lobbies with custom player limits, invite codes, role assignments (leader, co-leader, member), and dedicated party group chats.
- **Presence & Status:** Live online/offline tracking, active custom statuses, and live typing indicators.

---

## 2. System Architecture

```
+--------------------------------------------------------------+
|                     Client (React 19 + Vite)                |
|  - Tailwind CSS v4       - React Router v7   - React Hot Toast |
|  - AuthContext (State)   - ChatContext       - Socket.io Client|
+------------------------------+-------------------------------+
                               |
                   HTTP (REST) | WebSocket (Full-Duplex)
                               v
+--------------------------------------------------------------+
|                   Backend Server (Node + Express 5)          |
|  - JWT Authentication Middleware    - Multer / Cloudinary    |
|  - Socket.io Hub (Rooms & Maps)     - Nodemailer Service     |
+------------------------------+-------------------------------+
                               |
                               v
+--------------------------------------------------------------+
|                      MongoDB Database                         |
|  - Users Collection                 - Messages Collection    |
|  - FriendRequests Collection        - Parties Collection     |
+--------------------------------------------------------------+
```

---

## 3. Technology Stack & Dependencies

### Backend (`/server`)
- **Runtime & Framework:** Node.js (ES Modules), Express.js `v5.2.1`
- **Database & ODM:** MongoDB Atlas, Mongoose `v9.1.0`
- **Real-Time Communication:** Socket.io `v4.8.3`
- **Security & Authentication:** `jsonwebtoken` (JWT), `bcryptjs`
- **File & Media Storage:** `cloudinary` `v2.8.0`
- **Email Service:** `nodemailer` `v10.0.0`
- **Utilities & Development:** `dotenv`, `cors`, `nodemon`

### Frontend (`/client`)
- **Framework & Build Tool:** React `v19.1.1`, Vite `v7.1.0`
- **Styling:** Tailwind CSS `v4.1.11`
- **Routing:** React Router DOM `v7.8.0`
- **Networking & Real-Time:** `axios` `v1.13.3`, `socket.io-client` `v4.8.3`
- **Notifications:** `react-hot-toast` `v2.6.0`

---

## 4. Database Models & Schema Specifications (MongoDB Documents)

### 4.1. User Document (`server/models/User.js`)
Stores authentication credentials, gaming profile, privacy settings, and moderation data.

| Field | Type | Description |
| :--- | :--- | :--- |
| `email` | `String` (Required, Unique) | User's account email address. |
| `fullName` | `String` (Required) | User's real or display name. |
| `password` | `String` (Required) | Salted & hashed password (`bcryptjs`). |
| `profilePic` | `String` (Default: `""`) | Cloudinary image URL for user avatar. |
| `bio` | `String` (Default: `""`) | Short biography or profile text. |
| `isVerified` | `Boolean` (Default: `false`) | Email verification status. |
| `otp` / `otpExpires` | `String` / `Date` | 6-digit OTP code and expiry for verification. |
| `gamerTag` | `String` (Unique, Sparse) | Unique gaming handle (up to 30 chars). |
| `platforms` | `[String]` | Array: `"PC"`, `"PlayStation"`, `"Xbox"`, `"Nintendo"`, `"Mobile"`. |
| `primaryGame` | `String` | Primary game played. |
| `favoriteGames` | `[String]` | Array of up to 10 favorite titles. |
| `rank` | `Object` | `{ game: String, tier: String, division: String }`. |
| `region` | `String` | Server/player region: NA, EU, SEA, APAC, SA, ME, IN, OC, Global. |
| `timezone` | `String` | User timezone (e.g. `Asia/Kolkata`). |
| `playStyle` | `[String]` | Tags: Competitive, Casual, Co-op, Story, eSports, Speedrun. |
| `availability` | `Object` | Weekly availability schedule (e.g. `{ mon: "18:00-23:00" }`). |
| `languages` | `[String]` | Spoken languages for voice and chat. |
| `micEnabled` | `Boolean` | Indicates whether player uses voice chat. |
| `socialLinks` | `Object` | Links to Twitch, YouTube, Steam, and Discord. |
| `customStatus` | `Object` | `{ text: String, expiresAt: Date }`. |
| `friends` | `[ObjectId]` | References to accepted `User` documents. |
| `blockedUsers` | `[ObjectId]` | References to blocked `User` documents. |
| `privacySettings` | `Object` | Permissions for `dmFrom`, `friendsFrom`, `onlineVisible`. |
| `reputationScore` | `Number` (Default: 0) | Community karma/rating. |
| `isBanned` | `Boolean` (Default: `false`) | Account suspension flag. |
| `role` | `String` (Enum) | User access role: `"user"`, `"admin"`, `"moderator"`. |
| `endorsements` | `Object` | Honor counters: `{ friendly, shotCaller, greatComms, tiltProof }`. |
| `endorsedBy` | `[Object]` | Array of `{ userId, category, endorsedAt }` enforcing 12-hour endorsement cooldowns. |

*Indexes:* Compound index `{ primaryGame: 1, region: 1 }` for optimized player discovery and LFG matchmaking.

---

### 4.2. Message Document (`server/models/Message.js`)
Represents direct messages between two users or group messages within a party lobby.

| Field | Type | Description |
| :--- | :--- | :--- |
| `senderId` | `ObjectId` (Ref: `User`, Required) | User who authored the message. |
| `receiverId` | `ObjectId` (Ref: `User`) | Direct recipient (omitted in party chats). |
| `partyId` | `ObjectId` (Ref: `Party`) | Group party lobby reference (for party messages). |
| `text` | `String` | Message body content. |
| `image` | `String` | Media URL for uploaded attachments. |
| `gifUrl` | `String` | Curated reaction GIF URL. |
| `videoUrl` | `String` | Video clip URL attachment. |
| `messageType` | `String` (Enum) | `"text"`, `"image"`, `"gif"`, `"video"`, `"system"`. |
| `linkPreview` | `Object` | OpenGraph rich card: `{ url, title, description, image, siteName }`. |
| `seen` | `Boolean` (Default: `false`) | Read receipt indicator. |
| `reactions` | `[{ emoji: String, userId: ObjectId }]` | Array of emoji reactions with user attribution. |
| `replyTo` | `ObjectId` (Ref: `Message`) | Reference to parent message for message threading. |
| `isEdited` | `Boolean` (Default: `false`) | True if text was modified after sending. |
| `editedAt` | `Date` | Timestamp of latest edit. |
| `deletedAt` | `Date` | Soft-deletion timestamp (null if active). |

*Indexes:*
- `{ senderId: 1, receiverId: 1 }` (Speedy DM query retrieval).
- `{ partyId: 1, createdAt: 1 }` (Chronological party chat history).

---

### 4.3. FriendRequest Document (`server/models/FriendRequest.js`)
Tracks connection requests between two users.

| Field | Type | Description |
| :--- | :--- | :--- |
| `from` | `ObjectId` (Ref: `User`, Required) | Request initiator. |
| `to` | `ObjectId` (Ref: `User`, Required) | Target recipient. |
| `status` | `String` (Enum) | `"pending"`, `"accepted"`, or `"declined"`. |

*Indexes:* Unique compound index `{ from: 1, to: 1 }` prevents redundant requests.

---

### 4.4. Party Document (`server/models/Party.js`)
Lobby/Party management for team coordination and group chat.

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | `String` (Required, Max 40) | Name of the squad/party. |
| `game` | `String` | Game being queued or played. |
| `leaderId` | `ObjectId` (Ref: `User`, Required) | Party creator and administrative owner. |
| `members` | `[Object]` | Array of `{ userId, role: ("leader"|"co-leader"|"member"), joinedAt }`. |
| `maxPlayers` | `Number` (Default: 5, Range: 2-16) | Maximum slot capacity. |
| `inviteCode` | `String` (Unique) | Shareable code for joining private parties. |
| `isOpen` | `Boolean` (Default: `false`) | Publicly joinable without invite code. |
| `status` | `String` (Enum) | `"active"` or `"disbanded"`. |

*Indexes:* Compound index `{ "members.userId": 1, status: 1 }` to quickly identify a user's active parties.

---

### 4.5. LFGPost Document (`server/models/LFGPost.js`)
Looking For Group (LFG) squad postings and scheduled session matchmaking.

| Field | Type | Description |
| :--- | :--- | :--- |
| `creatorId` | `ObjectId` (Ref: `User`, Required) | Player who created the squad post. |
| `title` | `String` (Required, Max 100) | Headline/objective (e.g. "Diamond Ranked Push"). |
| `game` | `String` (Required) | Target game title. |
| `mode` | `String` (Enum) | `"Ranked"`, `"Casual"`, `"Competitive"`, `"Raid"`, `"Dungeon"`, `"Tournament"`, `"Custom"`, `"Co-op"`. |
| `spotsTotal` | `Number` (Default: 4, Range: 2-16) | Total squad capacity. |
| `spotsFilled` | `Number` (Default: 1) | Current count of joined players. |
| `joinedPlayers` | `[ObjectId]` (Ref: `User`) | Roster of confirmed players. |
| `rankRequirement`| `String` (Default: "Any Rank") | Competitive tier prerequisite. |
| `region` | `String` (Enum) | Server region: NA, EU, SEA, APAC, SA, ME, IN, OC, Global. |
| `micRequired` | `Boolean` (Default: `true`) | Voice communication requirement flag. |
| `languages` | `[String]` | Spoken language preferences. |
| `scheduledAt` | `Date` (Nullable) | Scheduled start time (`null` = Instant / Now). |
| `estimatedDuration`| `String` | Estimated gaming duration (e.g. "1-2 Hours"). |
| `note` | `String` (Max 300) | Custom notes, strategy, or champion/role requests. |
| `partyId` | `ObjectId` (Ref: `Party`) | Auto-provisioned/linked Party lobby for squad chat. |
| `status` | `String` (Enum) | `"open"`, `"full"`, `"closed"`, or `"expired"`. |
| `expiresAt` | `Date` (Required) | Auto-cleanup timestamp indexed for TTL eviction. |

*Indexes:*
- `{ game: 1, status: 1, region: 1 }` (Rapid multi-filter board discovery).
- `{ scheduledAt: 1, status: 1 }` (Chronological upcoming session calendar queries).
- `{ expiresAt: 1 }, { expireAfterSeconds: 0 }` (MongoDB TTL background automated expiration).

---

### 4.6. Notification Document (`server/models/Notification.js`)
In-app notification center feed with real-time WebSocket delivery and unread badge tracking.

| Field | Type | Description |
| :--- | :--- | :--- |
| `recipientId` | `ObjectId` (Ref: `User`, Required) | Target user receiving the alert. |
| `senderId` | `ObjectId` (Ref: `User`) | Initiator who triggered the event. |
| `type` | `String` (Enum) | `"lfg_join"`, `"lfg_leave"`, `"lfg_full"`, `"session_reminder"`, `"party_invite"`, `"friend_request"`, `"friend_accepted"`, `"endorsement"`, `"warning"`, `"system"`. |
| `title` | `String` (Required) | Short headline (e.g. "Player Joined Your Squad!"). |
| `message` | `String` (Required) | Detailed notification content. |
| `data` | `Object` | Contextual payload (e.g. `{ lfgId, partyId, matchId }`). |
| `isRead` | `Boolean` (Default: `false`) | Read status flag. |
| `readAt` | `Date` | Timestamp when user opened/acknowledged notification. |

*Indexes:* Compound index `{ recipientId: 1, isRead: 1, createdAt: -1 }` for high-throughput unread badge counts and chronological notification rendering.

---

### 4.7. Report Document (`server/models/Report.js`)
Player conduct violation reports, toxic behavior flagging, and administrative audit trails.

| Field | Type | Description |
| :--- | :--- | :--- |
| `reporterId` | `ObjectId` (Ref: `User`, Required) | Reporting player ID. |
| `reportedUserId` | `ObjectId` (Ref: `User`, Required) | Flagged player ID. |
| `targetType` | `String` (Enum) | `"user"`, `"message"`, `"party"`, `"lfg"`. |
| `targetId` | `ObjectId` (Nullable) | Target message or party ID. |
| `reason` | `String` (Enum) | `"toxic"`, `"cheating"`, `"harassment"`, `"spam"`, `"hate_speech"`, `"inappropriate_profile"`, `"other"`. |
| `detail` | `String` (Max 500) | Specific description or logs submitted by reporter. |
| `status` | `String` (Enum) | `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"`. |
| `actionTaken` | `String` (Enum) | `"none"`, `"warn"`, `"warned"`, `"muted"`, `"banned"`, `"dismissed"`. |
| `reviewedBy` | `ObjectId` (Ref: `User`) | Admin or moderator who resolved report. |
| `reviewedAt` | `Date` | Timestamp when report was resolved. |
| `adminNotes` | `String` | Internal audit reasoning. |

*Indexes:*
- `{ status: 1, createdAt: -1 }` (Rapid moderation queue discovery).
- `{ reportedUserId: 1 }` (Player conduct violation history).

---

## 5. API Route Specifications

### 5.1. Authentication & User Routes (`/api/auth`)
- `POST /api/auth/signup` — Registers new account, hashes password, generates initial token or OTP.
- `POST /api/auth/login` — Verifies credentials, returns JWT token and user profile.
- `POST /api/auth/verify-otp` — Verifies email via 6-digit OTP code.
- `GET /api/auth/check` — Validates existing session JWT and returns current authenticated user.
- `PUT /api/auth/update-profile` — Updates user bio, gamer identity, social links, ranks, or profile avatar.
- `GET /api/auth/users` — Fetches sidebar users/contacts and recent chat partners.
- `GET /api/auth/search` — Discover players by game, region, rank, and platform.
- `POST /api/auth/users/:userId/endorse` — Awards player honor endorsement (+10 Rep) with 12h cooldown.
- `GET /api/auth/users/:userId/reputation` — Fetches player honor tier, reputation score, and endorsement counts.
- `GET /api/auth/achievements/my` — Evaluates criteria and returns unlocked achievement badges.

### 5.2. Messaging Routes (`/api/messages`)
- `GET /api/messages/:id` — Retrieves DM history between logged-in user and target user (`:id`).
- `POST /api/messages/send/:id` — Sends DM (text, Cloudinary image, GIF URL, link preview) and emits Socket.io event.
- `POST /api/messages/react/:messageId` — Adds/removes an emoji reaction to a message.
- `PUT /api/messages/edit/:messageId` — Edits existing message content (sets `isEdited: true`).
- `DELETE /api/messages/:messageId` — Soft-deletes a message (marks `deletedAt`).
- `GET /api/messages/party/:partyId` — Retrieves historical messages for a party room.
- `POST /api/messages/party/:partyId` — Sends a message to a party room and broadcasts to the socket room.

### 5.3. Friend Request Routes (`/api/friends`)
- `POST /api/friends/request/:targetUserId` — Sends a friend request.
- `POST /api/friends/accept/:requestId` — Accepts pending friend request and mutualizes friends list.
- `POST /api/friends/decline/:requestId` — Declines pending request.
- `GET /api/friends/list` — Returns list of all confirmed friends with online status.
- `GET /api/friends/requests` — Returns incoming pending friend requests.
- `DELETE /api/friends/remove/:friendId` — Removes a user from friends list.
- `POST /api/friends/report/:targetUserId` — Legacy alias for reporting user conduct violations.

### 5.4. Party Lobby Routes (`/api/parties`)
- `POST /api/parties` — Creates a new party lobby and assigns creator as leader.
- `GET /api/parties/my` — Retrieves active party details for the current user.
- `GET /api/parties/:id` — Retrieves specific party details with populated roster.
- `POST /api/parties/join/:inviteCode` — Joins party via 8-char invite code.
- `DELETE /api/parties/:id/leave` — Leaves current party (promotes next member or disbands if empty).
- `DELETE /api/parties/:id/kick/:userId` — Leader-only endpoint to remove a party member.
- `DELETE /api/parties/:id` — Disbands party (leader only).
- `POST /api/parties/quick-match` — One-click matching into transient micro-lobbies.

### 5.5. LFG Board & Session Scheduling Routes (`/api/lfg`)
- `GET /api/lfg` — Queries active squad posts with parameter filters (`game`, `region`, `mode`, `rankRequirement`, `micRequired`, `isScheduled`, `search`).
- `POST /api/lfg` — Creates an LFG squad post, auto-provisions a linked Party lobby, calculates TTL `expiresAt`, and broadcasts `lfg_new_post`.
- `GET /api/lfg/sessions` — Retrieves upcoming scheduled gaming sessions for current user (Calendar View).
- `GET /api/lfg/:id` — Retrieves single LFG post by ID with populated squad roster and linked party.
- `POST /api/lfg/:id/join` — Joins squad, increments `spotsFilled`, auto-adds to linked Party roster, dispatches in-app `lfg_join` notification to creator, and broadcasts `lfg_post_update`.
- `POST /api/lfg/:id/leave` — Leaves squad, restores slot capacity, notifies creator via `lfg_leave`, and broadcasts `lfg_post_update`.
- `PUT /api/lfg/:id/close` — Closes/cancels LFG post (creator only).
- `POST /api/lfg/:id/remind` — Dispatches session reminder notifications (`session_reminder`) to all squad players.

### 5.6. In-App Notification Center Routes (`/api/notifications`)
- `GET /api/notifications` — Retrieves paginated notifications for current user with live unread counter (`unreadCount`).
- `PUT /api/notifications/:id/read` — Marks single notification as read, decrements unread count.
- `PUT /api/notifications/read-all` — Batch marks all user notifications as read.
- `DELETE /api/notifications/:id` — Deletes single notification.
- `DELETE /api/notifications/clear-all` — Clears all user notifications.

### 5.7. WebRTC Voice Channel Routes (`/api/parties/:id/voice`)
- `GET /api/parties/:id/voice` — Retrieves active real-time voice participants roster and headcount for a party lobby (`{ count, users: [...] }`).

### 5.8. Safety & Moderation Routes (`/api/moderation`)
- `POST /api/moderation/report` — Submits a user conduct violation report.
- `GET /api/moderation/reports` — Queries reports queue with status filters (pending, reviewed, resolved).
- `PUT /api/moderation/reports/:reportId/action` — Admin moderation action (`warn`, `mute`, `ban`, `dismiss`) updating report and player records.
- `GET /api/moderation/stats` — High-level safety metrics (pending reports, warnings, active bans, resolution rate).
- `POST /api/moderation/scan` — Text content profanity and slur scanner returning sanitized text and flag booleans.

### 5.9. Rich Media & Link Preview Routes (`/api/media`)
- `GET /api/media/gifs` — Curated gaming reactions GIF catalog search (`?q=`) and category filtering (`?category=`).
- `POST /api/media/preview` — Server-side OpenGraph scraper extracting meta title, description, image, and site name for URLs.

### 5.10. Competitive Game Directory Routes (`/api/games`)
- `GET /api/games/directory` — List top 10 competitive esports titles with platforms, ranks, genres, and cover assets.
- `GET /api/games/:gameId` — Detailed specifications and ranked tier hierarchies for a specific game title.

---

## 6. Real-Time WebSockets Architecture (Socket.io)

### Connection Lifecycle:
- Client connects with `?userId=<mongoId>`.
- Server records socket mapping in `userSocketMap[userId] = Set<socketId>` (multi-tab/device safe).
- Server broadcasts updated online users: `io.emit("getOnlineUsers", [...])`.
- On connection, server queries active parties for user and automatically joins rooms: `party_<partyId>`.

### Socket Events:
| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `getOnlineUsers` | Server -> Clients | `[userId]` | Broadcasts all active online user IDs. |
| `typing_start` | Client -> Server | `{ toUserId }` | Emitted when user starts typing in DM. |
| `typing_stop` | Client -> Server | `{ toUserId }` | Emitted when user stops typing in DM. |
| `typing_indicator` | Server -> Client | `{ fromUserId, isTyping }` | Relayed only to the DM recipient's sockets. |
| `join_party` | Client -> Server | `{ partyId }` | Joins Socket.io room `party_<partyId>`. |
| `leave_party` | Client -> Server | `{ partyId }` | Leaves Socket.io room `party_<partyId>`. |
| `party_typing` | Client -> Server | `{ partyId }` | User typing inside party chat. |
| `party_typing_indicator` | Server -> Room | `{ fromUserId, partyId, isTyping }`| Broadcast to room excluding the sender. |
| `newMessage` | Server -> Client | `Message` object | Real-time push of newly delivered DM. |
| `newPartyMessage` | Server -> Room | `Message` object | Real-time push of newly delivered party message. |
| `lfg_new_post` | Server -> Clients | `LFGPost` object | Broadcast when a new squad post is published. |
| `lfg_post_update` | Server -> Clients | `LFGPost` object | Broadcast when squad slots change, fill, or close. |
| `notification` | Server -> Client | `Notification` object | Real-time delivery to recipient socket with in-app toast & desktop push trigger. |
| `voice_join` | Client -> Server | `{ partyId, gamerTag, profilePic }` | Enters party voice channel room `voice_<partyId>`. |
| `voice_room_users`| Server -> Client | `{ partyId, users }` | Emitted to newly joined peer with existing voice participant list. |
| `voice_user_joined`| Server -> Room | `VoiceUser` object | Broadcast to existing voice room members announcing new peer. |
| `voice_signal` | Bi-directional | `{ toSocketId, fromSocketId, signal }`| Relays WebRTC signaling data (`offer`, `answer`, `ice_candidate`). |
| `voice_state` | Client -> Server | `{ partyId, isMuted, isDeafened }` | Updates local microphone mute or incoming audio deafen state. |
| `voice_user_state` | Server -> Room | `{ userId, socketId, isMuted, isDeafened }`| Broadcasts peer mute/deafen status changes across voice room. |
| `voice_speaking` | Client -> Server | `{ partyId, isSpeaking }` | Dispatched from Web Audio API RMS volume analysis loop. |
| `voice_speaking_change` | Server -> Room | `{ userId, socketId, isSpeaking }` | Broadcasts speaking state triggering glowing neon green avatar pulse rings. |
| `voice_leave` | Client -> Server | `{ partyId }` | Disconnects peer from voice room, tears down peer connections. |
| `voice_user_left` | Server -> Room | `{ userId, socketId }` | Broadcast to peers to dispose of corresponding audio element. |
| `voice_roster_update` | Server -> Party | `{ partyId, count, users }` | Broadcasts live voice occupant count to entire party chat room. |

---

## 7. Directory Structure

```
chat-app/
├── DEVELOPMENT.md                # System Architecture & Development Document
├── test_suite.mjs                # Comprehensive integration test runner (40/40 passing)
├── test_phase4.mjs               # Phase 4 LFG, Sessions & Notifications test runner (15/15 passing)
├── test_phase5.mjs               # Phase 5 WebRTC Voice Chat test runner (15/15 passing)
├── test_phase6.mjs               # Phase 6 Polish, Safety & Media test runner (15/15 passing)
├── inspect_layout.mjs            # Puppeteer layout validation script
├── server/
│   ├── .env                      # Secrets & Database URI
│   ├── package.json              # Server dependencies & scripts
│   ├── server.js                 # Server entry point, Socket.io hub, WebRTC signaling & rooms
│   ├── controllers/
│   │   ├── friendController.js   # Friend requests & social graph logic
│   │   ├── gameController.js     # Competitive esports game directory & rank specs logic
│   │   ├── lfgController.js      # LFG squad posts, scheduling & reminders logic
│   │   ├── matchController.js    # Esports scrims orchestration & match reporting
│   │   ├── mediaController.js    # Curated GIF search & OpenGraph link preview logic
│   │   ├── messageController.js  # Messaging, reactions, profanity scanning & media logic
│   │   ├── moderationController.js # Conduct reporting, admin audit queue & text scanning logic
│   │   ├── notificationController.js # In-app notification center CRUD logic
│   │   ├── partyController.js    # Party management, transient lobbies & voice roster logic
│   │   └── userController.js     # Auth, profile, endorsements, badges & synergy matchmaking logic
│   ├── lib/
│   │   ├── cloudinary.js         # Cloudinary configuration
│   │   ├── db.js                 # MongoDB connection handler
│   │   └── utils.js              # JWT generator & token helpers
│   ├── middelware/
│   │   └── auth.js               # JWT verification & route protection
│   ├── models/
│   │   ├── FriendRequest.js      # FriendRequest Schema
│   │   ├── LFGPost.js            # LFG squad post & session scheduling Schema
│   │   ├── Match.js              # Amateur scrims & competitive match Schema
│   │   ├── Message.js            # Message Schema (DMs, Party chats, GIFs, Link Previews)
│   │   ├── Notification.js       # In-app notification center Schema
│   │   ├── Party.js              # Party / LFG Schema
│   │   ├── Report.js             # Player conduct violation report & audit Schema
│   │   └── User.js               # Gamer Profile, Honor Endorsements & Role Schema
│   └── routes/
│       ├── friendRoutes.js       # Friend API endpoints
│       ├── gameRoutes.js         # Competitive games directory endpoints
│       ├── lfgRoutes.js          # LFG squad & scheduling endpoints
│       ├── matchRoutes.js        # Scrim challenge & match endpoints
│       ├── mediaRoutes.js        # Curated GIFs & link preview endpoints
│       ├── messageRoutes.js      # Messaging API endpoints
│       ├── moderationRoutes.js   # Moderation queue & conduct reporting endpoints
│       ├── notificationRoutes.js # In-app notification center endpoints
│       ├── partyRoutes.js        # Party lobby & voice channel endpoints
│       └── userRoutes.js         # User auth, profile, endorsements & achievements endpoints
│
└── client/
    ├── .env                      # Client backend URL configuration
    ├── index.html                # Single-page HTML container with PWA meta & theme links
    ├── package.json              # Client dependencies & Vite scripts
    ├── vite.config.js            # Vite + React + Tailwind v4 config
    ├── public/
    │   ├── manifest.json         # PWA Web App Manifest (standalone, theme colors, icons)
    │   └── sw.js                 # Service Worker (offline shell caching & push notification click handling)
    ├── context/
    │   ├── AuthContext.jsx       # Authentication state, login/logout, user profile
    │   ├── ChatContext.jsx       # Active chat, messages, LFG, notifications, socket listeners
    │   └── VoiceContext.jsx      # WebRTC signaling, Web Audio API analysis, mic/deafen/PTT state
    └── src/
        ├── App.jsx               # App routing & toast provider
        ├── main.jsx              # React DOM mounting, PWA SW registration & saved theme loader
        ├── index.css             # Tailwind v4 directives, Sky / Neon / Abyss CSS design tokens
        ├── components/
        │   ├── ChatContainer.jsx # Message feed, party voice CTA, GIF preview, OpenGraph card, reactions
        │   ├── EndorsePlayerModal.jsx # Player honor award modal (+10 Rep, 4 categories)
        │   ├── GifPickerModal.jsx# Curated gaming reaction GIF picker & category search
        │   ├── LFGBoard.jsx      # LFG squad board, filters, create modal, calendar view
        │   ├── ModerationModal.jsx # Admin moderation console, safety metrics, reports queue & actions
        │   ├── NotificationCenter.jsx # Bell trigger, unread badge, popover dropdown
        │   ├── ReportModal.jsx   # Conduct violation report submission modal
        │   ├── RightSidebar.jsx  # Active chat user details, reputation score, honor badges, party roster
        │   ├── Sidebar.jsx       # Navigation tabs, theme switcher (Sky/Neon/Abyss), moderation console trigger
        │   └── VoiceControlsBar.jsx # Floating voice dock (ping, meter, mute, deafen, PTT, volume sliders)
        └── pages/
            ├── HomePage.jsx      # Main layout (Sidebar + ChatContainer + RightSidebar)
            ├── LoginPage.jsx     # Login, Signup, OTP verification forms
            └── ProfilePage.jsx   # Gaming identity editor, social links, preferences
```

---

## 8. Environment Setup & Execution Guide

### Prerequisites
- Node.js (v18.x or v20.x+)
- MongoDB Atlas cluster or local MongoDB instance
- Cloudinary account for avatar and chat image uploads

### Server Setup
1. Navigate to `server/`:
   ```bash
   cd server
   npm install
   ```
2. Configure `.env` in `server/.env`:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/chat-app?retryWrites=true&w=majority
   JWT_SECRET=your_jwt_secret_key_here
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_email_app_password
   ```
3. Run backend server:
   ```bash
   npm run server
   ```

### Client Setup
1. Navigate to `client/`:
   ```bash
   cd client
   npm install
   ```
2. Configure `.env` in `client/.env`:
   ```env
   VITE_BACKEND_URL=http://localhost:5000
   ```
3. Run development client:
   ```bash
   npm run dev
   ```

---

## 9. Development Change Log & Evolution History

This section tracks all architectural milestones, feature additions, schema upgrades, and bug fixes implemented throughout the development lifecycle:

### Phase 1: Foundation & Core Authentication
- **Initial Setup:** Configured Node.js ES Modules environment with Express 5, Mongoose 9 ODM, and Vite + React 19 frontend.
- **Security & Identity:**
  - Implemented bcrypt-based password hashing (10 salt rounds).
  - Configured JWT creation and cookie/header bearer authentication middleware (`authMiddleware.js`).
  - Added OTP (One-Time Password) generation and expiration logic for email verification via Nodemailer.
- **Media Handling:** Integrated Cloudinary SDK for secure, cloud-hosted user avatar uploads.

### Phase 2: Gamer Identity, Profiles & Matchmaking
- **Model Expansion (`User.js`):**
  - Added gaming taxonomy: `gamerTag`, `platforms` (PC, PlayStation, Xbox, Nintendo, Mobile), `primaryGame`, `favoriteGames`.
  - Added competitive tier metadata: `rank` (`game`, `tier`, `division`).
  - Added regional metadata: `region`, `timezone`, `playStyle`, `languages`, `availability`, and `micEnabled`.
  - Added streaming & social integrations: `isStreamer`, `socialLinks` (Twitch, YouTube, Steam, Discord).
- **Custom Presence:** Built temporary status message system with automatic expiration timestamps (`customStatus`).
- **Discovery Optimization:** Added compound MongoDB index on `{ primaryGame: 1, region: 1 }` to enable sub-millisecond player matchmaking queries.
- **Social Graph (`FriendRequest.js`):**
  - Created friend request lifecycle model (`pending`, `accepted`, `declined`).
  - Implemented compound unique index on `{ from: 1, to: 1 }` to reject duplicate pending requests at database level.
  - Added mutual friend list syncing and deletion cascading.

### Phase 3: Enhanced Real-Time Messaging & Media
- **Rich Message Schema Upgrade (`Message.js`):**
  - Enhanced beyond simple text to support Cloudinary image uploads (`image`).
  - Added emoji reactions array (`reactions: [{ emoji, userId }]`) with real-time toggle logic (add/remove).
  - Added message thread replies (`replyTo: ObjectId`).
  - Implemented in-place editing tracking (`isEdited: Boolean`, `editedAt: Date`).
  - Added soft-deletion support (`deletedAt: Date`) preserving conversation hierarchy while clearing displayed content.
- **Real-Time WebSockets Overhaul (`server.js`):**
  - Migrated `userSocketMap` from single socket ID string to `Set<string>` to support concurrent multi-tab and multi-device sessions for each user.
  - Added debounced DM typing indicators (`typing_start`, `typing_stop` -> `typing_indicator`).
  - Implemented read receipt broadcast events (`seen`).

### Phase 4: Party Lobby & Multiplayer Group Chat System
- **Lobby Architecture (`Party.js`):**
  - Designed Party model supporting 2–16 players with leader/co-leader/member roles.
  - Implemented unique invite code generation for private parties alongside public party lobbies.
  - Added compound index `{ "members.userId": 1, status: 1 }` for rapid active party lookups.
- **Socket.io Room Integration:**
  - Configured socket room partitioning: `party_<partyId>`.
  - Implemented auto-join on client connect for all active user parties.
  - Added party typing indicators (`party_typing` -> `party_typing_indicator`) broadcasted exclusively to room members.
  - Connected `Message` schema to parties via `partyId` field for persistent party chat history.

### Phase 5: Modern UI/UX Overhaul & Tailwind CSS v4 Migration
- **Aesthetic Refactor:**
  - Modernized with a dark gaming glassmorphism design system (`.glass-card`, neon cyan/violet accents, glowing online status pings).
  - Migrated to Tailwind CSS v4 using `@tailwindcss/vite`.
- **Layout Architecture:**
  - Built 3-pane responsive layout: [Sidebar.jsx](file:///c:/Users/DELL/Desktop/MERN%20PROJECTS/chat-app/client/src/components/Sidebar.jsx), [ChatContainer.jsx](file:///c:/Users/DELL/Desktop/MERN%20PROJECTS/chat-app/client/src/components/ChatContainer.jsx), and [RightSidebar.jsx](file:///c:/Users/DELL/Desktop/MERN%20PROJECTS/chat-app/client/src/components/RightSidebar.jsx).
  - Resolved flexbox scroll chaining and viewport overflow bugs in `ChatContainer` and `RightSidebar`.
- **Automated Validation:** Developed `inspect_layout.mjs` using Puppeteer for automated layout and bounding-box inspection.

### Phase 6: Strategic Expansion Implementations (LFG Micro-Lobbies, Synergy, Coaching & Scrims)
- **Hyper-Transient PVE & Co-Op Micro-Lobbies (`Party.js`, `partyController.js`):**
  - Added `isTransient`, `expiresAt`, and `activityType` to `Party.js` with MongoDB TTL indexing (`{ expiresAt: 1 }, { expireAfterSeconds: 0 }`).
  - Implemented `quickMatch` queue algorithm auto-joining matching active lobbies or instantiating an ephemeral squad.
  - Added One-Click "⚡ Quick Match (LFG Micro-Lobby)" button and TTL toggle in [Sidebar.jsx](file:///c:/Users/DELL/Desktop/MERN%20PROJECTS/chat-app/client/src/components/Sidebar.jsx).
- **Algorithmic Behavioral Matchmaking (`User.js`, `userController.js`):**
  - Engineered weighted Synergy Scoring matching: Playstyle overlap (35%), Mic affinity (20%), Rank tier proximity (20%), Region match (15%), and Reputation score (10%).
  - Created `/api/auth/matchmaking/synergy` endpoint and "🎯 Synergy" sidebar tab displaying compatibility percentage breakdown and instant squad up actions.
- **Paid Coaching & Mentorship Marketplace (`User.js`, `userController.js`):**
  - Added `isCoach` and `coachProfile` (title, hourlyRate, coachingBio, gamesCoached, reviews, and average rating).
  - Implemented coach browsing `/api/auth/coach/list`, session booking, and student reviews.
  - Integrated "🎓 Coaches" tab with hourly rates and booking modals.
- **Amateur Esports & Scrim Orchestration (`Match.js`, `matchController.js`, `matchRoutes.js`, `server.js`):**
  - Implemented `Match.js` schema tracking Team A vs Team B, scheduled match time, scores, server credentials, and dispute notes.
  - Added dedicated Scrim WebSocket rooms (`scrim_<matchId>`) with `join_scrim`, `leave_scrim`, and `scrim_chat`.
  - Added "⚔️ Scrims" tab in the frontend allowing party leaders to challenge opposing squads and share server IPs/passwords securely.

### Phase 7: Phase 4 Execution — LFG Board, Session Scheduling & In-App Notification Center
- **LFG Board & Squad Matchmaking (`LFGPost.js`, `lfgController.js`, `lfgRoutes.js`):**
  - Engineered `LFGPost.js` schema with target game, mode, slot counts (`spotsTotal`, `spotsFilled`), rank prerequisite, region, mic requirements, scheduled time (`scheduledAt`), duration, and strategy notes.
  - Automated squad party provisioning in `createLFGPost` linking each LFG post directly to an active `Party` entity so joining players immediately enter a live party chat room.
  - Built background TTL expiration via MongoDB compound index `{ expiresAt: 1 }, { expireAfterSeconds: 0 }`.
  - Implemented one-click squad up (`joinLFGPost`) updating slot counts, auto-roistering players into the linked party, dispatching live in-app notifications to the squad creator, and broadcasting `lfg_post_update` live to all connected clients.
  - Handled squad departure (`leaveLFGPost`) with slot restoration and post closing (`closeLFGPost`).
- **Session Scheduling & Upcoming Calendar View (`lfgController.js`, `LFGBoard.jsx`):**
  - Built upcoming sessions query endpoint (`/api/lfg/sessions`) retrieving future scheduled gaming matches where user is creator or participant.
  - Added squad reminder dispatch (`sendSessionReminder`) sending automated `session_reminder` notifications to all squad players.
  - Integrated dual-mode sub-view in `LFGBoard.jsx`: "📢 Active Squads" and "📅 Scheduled Sessions" with live countdown clocks and instant lobby access.
- **In-App Notification Center (`Notification.js`, `notificationController.js`, `notificationRoutes.js`, `NotificationCenter.jsx`):**
  - Created `Notification.js` schema supporting `lfg_join`, `lfg_leave`, `lfg_full`, `session_reminder`, `party_invite`, `friend_request`, and `system` alert types.
  - Optimized with compound index `{ recipientId: 1, isRead: 1, createdAt: -1 }` for high-throughput unread badge counting.
  - Built glassmorphism popover dropdown in `NotificationCenter.jsx` with category icon badges, relative timestamps, single & bulk read markers, and clear actions.
  - Implemented real-time socket emission (`io.to(recipientSocket).emit("notification", notif)`) triggering in-app toasts and browser desktop Web Notifications (when user is tabbed out).

### Phase 8: Phase 5 Execution — Real-Time WebRTC Voice Chat & Party Audio
- **WebRTC Signaling & Room Infrastructure (`server.js`, `partyController.js`, `partyRoutes.js`):**
  - Built low-latency socket room signaling engine (`voice_join`, `voice_leave`, `voice_signal`, `voice_state`, `voice_speaking`).
  - Added dedicated party voice room cache (`partyVoiceRooms`) maintaining participant sockets, user identities, mute/deafen statuses, and speaking states.
  - Implemented REST endpoint `GET /api/parties/:id/voice` returning live voice occupancy and participant metadata for discovery before joining.
  - Ensured synchronous Socket.io connection listener registration preventing race conditions during rapid peer connects.
- **Client WebRTC & Web Audio Analysis Engine (`VoiceContext.jsx`):**
  - Integrated `RTCPeerConnection` with public STUN servers for peer-to-peer audio streams.
  - Implemented Web Audio API (`AudioContext`, `AnalyserNode`) real-time RMS volume analysis loop for autonomous speaking activity detection and visual mic level meter.
  - Handled Push-To-Talk (PTT) mode with configurable keybinds alongside Voice Activity Detection (VAD).
  - Provided per-user audio volume normalization (0% - 200%) stored in localStorage.
- **Modern Voice UI Components (`VoiceControlsBar.jsx`, `ChatContainer.jsx`, `RightSidebar.jsx`, `Sidebar.jsx`):**
  - Built Discord-style floating glassmorphism dock (`VoiceControlsBar.jsx`) with live RTC ping display, volume meter, mute/deafen toggles, and participant drawer.
  - Added "🎙️ Join Voice Channel" CTA in Party chat header with live occupant count badge.
  - Enhanced Party Roster in `RightSidebar.jsx` with real-time neon green pulsing avatar rings when speaking (`ring-2 ring-emerald-400 animate-pulse`), mute/deafen icons, and individual volume sliders.
  - Added mini voice indicators (`🔊 X in voice`) to parties in `Sidebar.jsx`.

### Phase 9: Phase 6 Execution — Polish, Safety, Moderation, Media & PWA Integration
- **Safety, Conduct Reporting & Auto-Mod (`Report.js`, `moderationController.js`, `moderationRoutes.js`, `ModerationModal.jsx`):**
  - Engineered `Report.js` schema tracking `reporterId`, `reportedUserId`, `targetType` (`user`, `message`, `party`, `lfg`), violation categories (`toxic`, `cheating`, `harassment`, `hate_speech`, etc.), and administrative resolution status.
  - Implemented high-throughput moderation queue endpoints (`GET /api/moderation/reports`, `GET /api/moderation/stats`, `PUT /api/moderation/reports/:reportId/action`) supporting warning strikes, temporary mutes, account bans, and dismissals.
  - Added automated regex profanity and toxicity scanner (`POST /api/moderation/scan`) integrated directly into message and party chat submission pipelines with automatic slur masking (`****`).
  - Built an administrative safety console modal (`ModerationModal.jsx`) in the frontend with safety overview stats cards, live reports queue, and one-click moderation action triggers.
  - Added player conduct reporting modal (`ReportModal.jsx`) accessible directly from user profile cards in `RightSidebar.jsx`.
- **Player Honor, Reputation & Endorsement Engine (`User.js`, `userController.js`, `EndorsePlayerModal.jsx`):**
  - Expanded `User.js` with honor counters: `friendly`, `shotCaller`, `greatComms`, and `tiltProof`.
  - Implemented endorsement action (`POST /api/auth/users/:userId/endorse`) awarding +10 Reputation points, dispatching live in-app notifications, and enforcing a 12-hour per-player cooldown protection via `endorsedBy`.
  - Built reputation breakdown endpoint (`GET /api/auth/users/:userId/reputation`) returning honor tier badges (Novice, Respected, Honorable, Paragon), karma points, and honor distribution.
  - Added dynamic achievements engine (`GET /api/auth/achievements/my`) evaluating profile criteria to unlock achievements (`First Blood`, `Squad Leader`, `High Honor`, `Certified Coach`, `Legendary Gamer`, etc.).
  - Added interactive Award Honor modal (`EndorsePlayerModal.jsx`) and Player Reputation Card in `RightSidebar.jsx`.
- **Rich Media, Curated Gaming GIFs & OpenGraph Link Previews (`mediaController.js`, `mediaRoutes.js`, `GifPickerModal.jsx`):**
  - Built curated gaming reaction GIF catalog and search engine (`GET /api/media/gifs`) categorized into Victory, Fail, Clutch, Tilt, GG, Hype, Dance, and Facepalm reactions.
  - Developed server-side OpenGraph scraper (`POST /api/media/preview`) parsing external web links to extract title, description, thumbnail image, and site origin for rich in-chat link previews.
  - Extended `Message.js` schema with `gifUrl`, `videoUrl`, `linkPreview`, and `messageType`.
  - Built modern gaming GIF picker modal (`GifPickerModal.jsx`) integrated with chat input toolbar, along with rich card rendering in `ChatContainer.jsx`.
- **Competitive Esports Games Directory (`gameController.js`, `gameRoutes.js`):**
  - Created esports game catalog service (`GET /api/games/directory` and `/api/games/:gameId`) covering 10 major competitive titles (Valorant, CS2, League of Legends, Apex Legends, Overwatch 2, Dota 2, Rainbow Six Siege, Rocket League, Fortnite, Call of Duty: Warzone).
  - Populated complete ranked tier hierarchies (e.g. Iron to Radiant, Bronze to Predator, Herald to Immortal) and competitive game mode specs.
- **Dynamic Theming System (CSS Design Tokens & Theme Switcher):**
  - Implemented CSS design tokens for 3 tailored gaming themes in `index.css`:
    1. **Sky Frost Glass (Default):** Cyan/Sky accents, crystalline glassmorphism.
    2. **Neon Cyberpunk (`data-theme="cyberpunk"`):** High-contrast dark, neon magenta and yellow accents, synthwave glass.
    3. **Darker Abyss (`data-theme="abyss"`):** Deep pitch-black, obsidian surfaces, crimson and violet accents.
  - Added interactive Theme Switcher button and cycle dropdown in `Sidebar.jsx`, persisting preference in `localStorage` and applying to `<html data-theme="...">`.
- **Progressive Web App (PWA) & Offline Shell Readiness:**
  - Configured Web App Manifest (`client/public/manifest.json`) with standalone display mode, theme colors, and icons.
  - Built Service Worker (`client/public/sw.js`) implementing cache-first offline shell asset management and push notification click focus handling.
  - Linked PWA manifest and mobile meta tags in `index.html` and registered service worker in `client/src/main.jsx`.

---

## 10. Comprehensive Testing Documentation & QA Guide

### 10.1. Testing Strategy Overview
The application testing strategy encompasses:
1. **Manual Acceptance Testing:** Validating functional flows across authentication, messaging, friends, and parties.
2. **API Integration Testing:** Verifying REST endpoints via cURL or Postman with status code and payload assertions.
3. **Real-Time WebSocket Testing:** Multi-client validation of presence, typing events, and message synchronization.
4. **Automated Layout & UI Testing:** Puppeteer headless browser viewport and bounding-box assertions.

---

### 10.2. Manual Test Cases & Acceptance Matrix

| Test ID | Module | Test Scenario | Steps to Execute | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-01** | Auth | User Registration & OTP | 1. Navigate to `/login`<br>2. Fill name, email, password<br>3. Submit signup | Account created, OTP generated/sent, redirected to verify OTP | Passed |
| **TC-AUTH-02** | Auth | Login & Token Storage | 1. Enter valid credentials<br>2. Submit form | JWT returned, user profile loaded in `AuthContext`, redirected to `/` | Passed |
| **TC-AUTH-03** | Auth | Invalid Credentials | 1. Enter wrong password<br>2. Submit form | HTTP 400 returned, toast displays error message, form remains | Passed |
| **TC-PROF-01** | Profile | Gamer Identity Update | 1. Go to `/profile`<br>2. Change gamerTag, platform, rank<br>3. Save | Profile updated in DB, reflected instantly across UI and right sidebar | Passed |
| **TC-PROF-02** | Profile | Avatar Upload | 1. Upload JPEG/PNG image<br>2. Submit | Uploaded to Cloudinary, URL stored in `profilePic`, avatar refreshed | Passed |
| **TC-CHAT-01** | Messaging | 1-on-1 Real-Time DM | 1. Open User A & User B in separate browsers<br>2. User A sends text message | Message appears in User B's chat in real-time via Socket.io without refresh | Passed |
| **TC-CHAT-02** | Messaging | Image Attachment | 1. Select image in chat input<br>2. Send message | Image uploads to Cloudinary, renders with preview in message feed | Passed |
| **TC-CHAT-03** | Messaging | Emoji Reactions | 1. Hover message -> click emoji reaction | Reaction badge increments in real-time for both sender & receiver | Passed |
| **TC-CHAT-04** | Messaging | Message Edit & Delete | 1. Click edit -> change text<br>2. Click delete | Edited message shows `(edited)` tag; soft-deleted message displays placeholder | Passed |
| **TC-CHAT-05** | Messaging | Typing Indicator | 1. Start typing in User A's input | "User is typing..." displays below User B's header; disappears on blur | Passed |
| **TC-FRND-01** | Friends | Send & Accept Request | 1. User A sends friend request to User B<br>2. User B clicks Accept | Request status changes to `accepted`; both users added to mutual friend lists | Passed |
| **TC-FRND-02** | Friends | Duplicate Request Rejection | 1. User A attempts to re-send request to User B | HTTP 400 returned due to compound unique index; duplicate blocked | Passed |
| **TC-PARTY-01** | Party | Party Creation & Auto-Join | 1. Click Create Party -> enter name, game, max size<br>2. Submit | Party created, user joined to socket room `party_<id>`, lobby appears in sidebar | Passed |
| **TC-PARTY-02** | Party | Join via Invite Code | 1. User B enters party invite code<br>2. Submit | User B added to party members; broadcast sent to existing party members | Passed |
| **TC-PARTY-03** | Party | Party Group Chat | 1. Send message within party lobby | All members in `party_<id>` room receive message instantly | Passed |
| **TC-TRAN-01** | Micro-Lobby | Quick Match (Transient Lobby) | `POST /api/parties/quick-match` with 45m duration | Micro-lobby generated with `isTransient: true`, calculated TTL `expiresAt` | Passed |
| **TC-TRAN-02** | Micro-Lobby | List Ephemeral Lobbies | `GET /api/parties/transient?game=Valorant` | Returns active non-expired transient lobbies | Passed |
| **TC-SYNERGY-01** | Matchmaking | Algorithmic Synergy Matching | `GET /api/auth/matchmaking/synergy` | Candidates returned scored 0-100% with playstyle, mic, rank, region breakdown | Passed |
| **TC-COACH-01** | Coaching | Coach Activation & Pricing | `PUT /api/auth/coach/profile` | `isCoach: true` activated with verified games, hourly rate, and coaching bio | Passed |
| **TC-COACH-02** | Coaching | Directory Search | `GET /api/auth/coach/list` | Returns active coaches filtered by game and star rating | Passed |
| **TC-COACH-03** | Coaching | Book 1-on-1 Session | `POST /api/auth/coach/:coachId/book` | Session booked with date/time, notes, rate, status `confirmed` | Passed |
| **TC-COACH-04** | Coaching | Post Student Review | `POST /api/auth/coach/:coachId/review` | Student rating recorded, coach average rating dynamically updated | Passed |
| **TC-SCRIM-01** | Scrims | Opponent Party Setup | `POST /api/parties` (create opponent squad) | Opponent squad registered and ready for challenge | Passed |
| **TC-SCRIM-02** | Scrims | Issue Scrim Challenge | `POST /api/matches/propose` | Match document created with status `pending`, socket notifications sent | Passed |
| **TC-SCRIM-03** | Scrims | Accept Scrim Challenge | `POST /api/matches/:id/respond` (`accepted`) | Match status updated to `accepted` for both squads | Passed |
| **TC-SCRIM-04** | Scrims | Share Server Credentials | `PUT /api/matches/:id/credentials` | Server IP, password, and map updated and broadcasted to both squads | Passed |
| **TC-SCRIM-05** | Scrims | Final Score Reporting | `POST /api/matches/:id/report` | Scores submitted (13-11), winner recorded, status `completed` | Passed |
| **TC-SCRIM-06** | Scrims | Scrims Match History | `GET /api/matches/my` | Retrieves all active and completed scrim matches for squad members | Passed |
| **TC-LFG-01** | LFG | Create LFG Post & Auto Party | `POST /api/lfg` with game, mode, slots | Creates squad post, links auto-created Party lobby, broadcasts `lfg_new_post` | Passed |
| **TC-LFG-02** | LFG | LFG Board Filter Queries | `GET /api/lfg?game=Valorant&micRequired=true` | Returns open/active squads matching criteria | Passed |
| **TC-LFG-03** | LFG | Squad Up & Notification | `POST /api/lfg/:id/join` | Increments slots, adds player to linked Party, alerts creator with `lfg_join` | Passed |
| **TC-LFG-04** | LFG | Leave Squad & Slot Restoration | `POST /api/lfg/:id/leave` | Restores available slot count, removes from Party, notifies creator | Passed |
| **TC-LFG-05** | LFG | Terminate / Close LFG Post | `PUT /api/lfg/:id/close` | Marks post status as `closed`, broadcasts `lfg_post_update` | Passed |
| **TC-SCHED-01**| Scheduling | Schedule Future Session | `POST /api/lfg` with `scheduledAt` | Sets future timestamp, computes 4h post-match TTL eviction | Passed |
| **TC-SCHED-02**| Scheduling | Calendar View Retrieval | `GET /api/lfg/sessions` | Returns upcoming scheduled sessions with countdowns | Passed |
| **TC-SCHED-03**| Scheduling | Squad Session Reminders | `POST /api/lfg/:id/remind` | Dispatches `session_reminder` notifications to all joined squad players | Passed |
| **TC-NOTIF-01**| Notifications| Notification Feed & Unread | `GET /api/notifications` | Returns user notifications with unread counter | Passed |
| **TC-NOTIF-02**| Notifications| Mark Single Notification Read | `PUT /api/notifications/:id/read` | Sets `isRead: true`, decrements unread counter | Passed |
| **TC-NOTIF-03**| Notifications| Batch Mark All Read | `PUT /api/notifications/read-all` | Marks all unread alerts read, resets unread counter to 0 | Passed |
| **TC-VOICE-01**| Voice | Query Voice Channel Active Roster | `GET /api/parties/:id/voice` | Returns active voice count and participant roster | Passed |
| **TC-VOICE-02**| Voice | Real-Time Voice Join & Handshake | `voice_join` event via Socket.io | Client joins room, receives existing peers list (`voice_room_users`) | Passed |
| **TC-VOICE-03**| Voice | REST Roster Synchronized with Live Sockets | `GET /api/parties/:id/voice` | Confirms count matches live socket connections | Passed |
| **TC-VOICE-04**| Voice | WebRTC Signaling Relay | `voice_signal` (SDP Offer / Answer) | Direct relay of peer SDP packets and ICE candidates | Passed |
| **TC-VOICE-05**| Voice | Mute & Deafen State Broadcasting | `voice_state` event | Peer states broadcasted via `voice_user_state` across voice channel | Passed |
| **TC-VOICE-06**| Voice | Channel Exit & Automatic Room Cleanup | `voice_leave` & socket disconnect | Cleans up peer connection, decrements room occupancy, evicts on disconnect | Passed |
| **TC-P6-01** | Media | Curated Gaming GIF Search | `GET /api/media/gifs?q=clutch` | Returns curated gaming GIFs matching search query | Passed |
| **TC-P6-02** | Media | GIF Category Filtering | `GET /api/media/gifs?category=victory` | Returns GIFs categorized under specific gaming emotion | Passed |
| **TC-P6-03** | Media | OpenGraph Link Preview Scraper | `POST /api/media/preview` with URL | Extracts OpenGraph title, description, image, and domain | Passed |
| **TC-P6-04** | Games | Competitive Games Directory | `GET /api/games/directory` | Returns catalog of 10 esports games with platforms and modes | Passed |
| **TC-P6-05** | Games | Game Details & Ranks Spec | `GET /api/games/valorant` | Returns ranked ladder tiers (Iron to Radiant) and publisher specs | Passed |
| **TC-P6-06** | Moderation | Auto-Moderation Profanity Filter | `POST /api/moderation/scan` | Detects toxic phrases and returns sanitized masked text | Passed |
| **TC-P6-07** | Moderation | User Conduct Report Submission | `POST /api/moderation/report` | Creates report document with status `pending` in queue | Passed |
| **TC-P6-08** | Moderation | Moderation Queue Discovery | `GET /api/moderation/reports?status=pending` | Retrieves active queue of pending conduct reports | Passed |
| **TC-P6-09** | Moderation | Admin Moderation Action (Warning) | `PUT /api/moderation/reports/:id/action` (`warn`) | Applies warning strike to player and resolves report | Passed |
| **TC-P6-10** | Honor | Player Honor Endorsement (+10 Rep) | `POST /api/auth/users/:id/endorse` | Awards +10 Rep, updates category count, enforces 12h cooldown | Passed |
| **TC-P6-11** | Honor | Reputation & Honor Breakdown | `GET /api/auth/users/:id/reputation` | Returns calculated honor tier, total score, and category counters | Passed |
| **TC-P6-12** | Honor | User Achievements Evaluation | `GET /api/auth/achievements/my` | Evaluates requirements and returns unlocked badge identifiers | Passed |
| **TC-P6-13** | Theming | Dynamic Theme Switching | Click theme switch in Sidebar (Sky -> Neon -> Abyss) | Updates `data-theme` on document root and persists in `localStorage` | Passed |
| **TC-P6-14** | PWA | Web App Manifest & Installability | Inspect `/manifest.json` in DevTools | Manifest valid with standalone display, colors, and app icons | Passed |
| **TC-P6-15** | PWA | Service Worker Shell Caching | Inspect `/sw.js` in Application tab | Service worker registered and active; caches app shell assets | Passed |

---

### 10.3. Automated Layout & Viewport Testing (Puppeteer)

The project includes an automated UI layout inspection script: **[inspect_layout.mjs](file:///c:/Users/DELL/Desktop/MERN%20PROJECTS/chat-app/inspect_layout.mjs)**.

#### Purpose:
- Validates the desktop viewport dimensions (1350x693).
- Simulates automated login and contact selection.
- Inspects bounding rectangle heights, scroll heights, and client heights for the 3-column glass layout:
  - Main glass container (`.glass-card`)
  - Left contact sidebar
  - Center chat container
  - Right player profile panel
- Ensures no unexpected vertical page overflow (`documentHeight === innerHeight`).

#### How to Run:
1. Ensure both backend and frontend servers are running:
   ```bash
   # Terminal 1:
   cd server && npm run server
   # Terminal 2:
   cd client && npm run dev
   ```
2. Execute the layout test script:
   ```bash
   node inspect_layout.mjs
   ```
3. Expected Output:
   ```json
   LAYOUT_DATA: {
     "window": {
       "innerWidth": 1350,
       "innerHeight": 693,
       "scrollY": 0,
       "documentHeight": 693
     },
     "cardRect": {
       "top": 16,
       "bottom": 677,
       "height": 661
     }
   }
   ```

---

### 10.4. API Testing Guide (cURL Scripts)

#### 1. Authentication Check
```bash
curl -X GET http://localhost:5000/api/status
# Expected response: "Server is live"
```

#### 2. User Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"valkyrie@gameconnect.gg\",\"password\":\"Password123!\"}"
```

#### 3. Send Message
```bash
curl -X POST http://localhost:5000/api/messages/send/<RECEIVER_USER_ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d "{\"text\":\"Ready for competitive match?\"}"
```

#### 4. Fetch Friend Requests
```bash
curl -X GET http://localhost:5000/api/friends/requests \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

#### 5. Create Party Lobby
```bash
curl -X POST http://localhost:5000/api/parties/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d "{\"name\":\"Night Squad\",\"game\":\"Valorant\",\"maxPlayers\":5,\"isOpen\":true}"
```

#### 6. Create LFG Squad Post (Auto-Linked Party)
```bash
curl -X POST http://localhost:5000/api/lfg \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d "{\"title\":\"Diamond Rank Push Squad\",\"game\":\"Valorant\",\"mode\":\"Competitive\",\"spotsTotal\":4,\"rankRequirement\":\"Diamond+\",\"region\":\"Global\",\"micRequired\":true}"
```

#### 7. Query LFG Board
```bash
curl -X GET "http://localhost:5000/api/lfg?game=Valorant&micRequired=true" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

#### 8. Join LFG Squad ("Squad Up")
```bash
curl -X POST http://localhost:5000/api/lfg/<LFG_POST_ID>/join \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

#### 9. Schedule Future Session (Calendar Entry)
```bash
curl -X POST http://localhost:5000/api/lfg \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d "{\"title\":\"Weekly Raid Night\",\"game\":\"Destiny 2\",\"mode\":\"Raid\",\"spotsTotal\":6,\"rankRequirement\":\"1820+ Light\",\"region\":\"Global\",\"micRequired\":true,\"scheduledAt\":\"2026-10-02T18:00:00.000Z\",\"estimatedDuration\":\"3 Hours\"}"
```

#### 10. Fetch In-App Notification Center Feed
```bash
curl -X GET http://localhost:5000/api/notifications \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

#### 11. Mark All Notifications as Read (Batch Action)
```bash
curl -X PUT http://localhost:5000/api/notifications/read-all \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

#### 12. Query Real-Time Party Voice Channel Active Roster
```bash
curl -X GET http://localhost:5000/api/parties/<PARTY_ID>/voice \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
# Expected response: { "success": true, "partyId": "...", "count": 2, "users": [ { "userId": "...", "gamerTag": "Amar1234#5321", "muted": false, "deafened": false, ... } ] }
```

---

### 10.5. WebSocket / Real-Time Event Testing Checklist

To verify real-time event integrity across clients:
1. **Multi-Tab Presence Test:**
   - Open two browser tabs logged in as the same user.
   - Close one tab; ensure user is **still marked as online** in other users' sidebars (verifies `Set<socketId>` multi-connection pooling).
   - Close all tabs; verify user disconnects and `getOnlineUsers` updates globally.
2. **Typing Relay Latency:**
   - Ensure `typing_indicator` events debounce after 1500ms of inactivity.
   - Confirm typing indicators only emit to the targeted `toUserId` and do not leak to other users.
3. **Party Room Isolation:**
   - Send a message in Party A.
   - Verify that members of Party B do not receive the `partyMessage` event.
4. **LFG Live Broadcast Verification:**
   - Create an LFG post on Client 1; verify `lfg_new_post` event instantly renders new squad card on Client 2 without page reload.
   - Join on Client 2; verify `lfg_post_update` immediately refreshes slot badge (e.g. `2/4`) on all active viewports.
5. **Real-Time Notification Delivery:**
   - When Client 2 joins Client 1's squad, verify Client 1 receives instant `notification` socket event, triggering sound chime, toast alert, and unread counter increment (`0` -> `1`).

---

### 10.6. Automated Integration Test Suite (`test_suite.mjs`)

An automated integration testing runner is provided at [test_suite.mjs](file:///c:/Users/DELL/Desktop/MERN%20PROJECTS/chat-app/test_suite.mjs).

#### How to Run:
```bash
node test_suite.mjs
```

#### Coverage (40/40 Tests Passing — 100%):
1. **[TC-SRV-01] Server Health Check:** Verifies Express server availability (`/api/status`).
2. **[TC-AUTH-01] User Login & JWT Generation:** Validates JWT login token issuance and profile retrieval (`/api/auth/login`).
3. **[TC-TRAN-01] Hyper-Transient Micro-Lobby:** Verifies quick-match lobby creation with automatic TTL expiration (`/api/parties/quick-match`).
4. **[TC-TRAN-02] List Transient Micro-Lobbies:** Verifies querying open ephemeral lobbies (`/api/parties/transient`).
5. **[TC-SYNERGY-01] Algorithmic Behavioral Matchmaking:** Validates mathematical Synergy Score (0-100%) and multi-attribute breakdown (`/api/auth/matchmaking/synergy`).
6. **[TC-COACH-01] Coach Profile Activation & Pricing:** Validates coach onboarding, verified games, and hourly rates (`/api/auth/coach/profile`).
7. **[TC-COACH-02] Browse Verified Coaches Directory:** Validates active coach filtering by game and rating (`/api/auth/coach/list`).
8. **[TC-COACH-03] Book Coaching Session:** Validates 1-on-1 coaching session reservation (`/api/auth/coach/:coachId/book`).
9. **[TC-COACH-04] Post Coach Review & Recalculate Rating:** Validates student rating submission and dynamic average rating recalculation (`/api/auth/coach/:coachId/review`).
10. **[TC-SCRIM-01] Opponent Party Setup for Scrim:** Registers opponent team party for competitive challenge.
11. **[TC-SCRIM-02] Propose Scrim Match Challenge:** Issues official scrim challenge proposal (`/api/matches/propose`).
12. **[TC-SCRIM-03] Accept Scrim Challenge:** Opposing leader accepts challenge, locking match status (`/api/matches/:id/respond`).
13. **[TC-SCRIM-04] Share Scrim Server Credentials:** Synchronizes dedicated server IP, password, and map rules (`/api/matches/:id/credentials`).
14. **[TC-SCRIM-05] Report Final Scrim Score:** Submits verified match scores (13-11), flags winner, marks status `completed` (`/api/matches/:id/report`).
15. **[TC-SCRIM-06] Fetch Scrims History:** Retrieves squad match records and competitive statistics (`/api/matches/my`).
16. **[TC-LFG-01] Create LFG Post with Linked Party Lobby:** Validates squad creation, slot constraints, and auto-provisioning of linked party lobby (`/api/lfg`).
17. **[TC-LFG-02] Query LFG Board with Parameters:** Validates game, region, rank, and mic requirement filters (`/api/lfg`).
18. **[TC-SCHED-01] Schedule Future Gaming Session:** Validates scheduled matches with `scheduledAt` and 4-hour post-match TTL eviction (`/api/lfg`).
19. **[TC-SCHED-02] Calendar / Upcoming Scheduled Sessions:** Validates retrieval of chronological future session matches (`/api/lfg/sessions`).
20. **[TC-NOTIF-01] Fetch In-App Notification Center Feed:** Validates notification retrieval with total and unread counters (`/api/notifications`).
21. **[TC-NOTIF-02] Mark Notification Read & Update Unread Count:** Validates single-notification read acknowledgment (`/api/notifications/:id/read`).
22. **[TC-NOTIF-03] Mark All Notifications Read (Batch Action):** Validates batch read acknowledgment resetting unread counter to 0 (`/api/notifications/read-all`).
23. **[TC-VOICE-01] Query Voice Channel Active Roster:** Validates REST endpoint for active voice participants (`/api/parties/:id/voice`).
24. **[TC-VOICE-02] Real-Time Voice Join & Room Handshake:** Validates socket room entrance and reception of existing peer list (`voice_join`, `voice_room_users`).
25. **[TC-VOICE-03] REST Roster Synchronized with Live Sockets:** Validates synchronization between live socket connections and REST roster count.
26. **[TC-VOICE-04] WebRTC Signaling Relay (SDP Offer/Answer):** Validates real-time relay of WebRTC SDP offers/answers and ICE candidates (`voice_signal`).
27. **[TC-VOICE-05] Audio Controls: Mute & Deafen Dispatch:** Validates broadcast of participant mute/deafen audio states (`voice_state`, `voice_user_state`).
28. **[TC-VOICE-06] Voice Channel Exit & Automatic Room Cleanup:** Validates graceful departure and room occupancy decrements (`voice_leave`).
29. **[TC-P6-01] Curated Gaming GIF Search:** Validates gaming GIF query search (`/api/media/gifs?q=clutch`).
30. **[TC-P6-02] GIF Category Filtering:** Validates categorical emotion GIF filtering (`/api/media/gifs?category=victory`).
31. **[TC-P6-03] OpenGraph Link Preview Scraper:** Validates web metadata extraction (`/api/media/preview`).
32. **[TC-P6-04] Competitive Games Directory Listing:** Validates loading top 10 competitive titles (`/api/games/directory`).
33. **[TC-P6-05] Game Details & Ranks Specification:** Validates rank ladders and publisher specs (`/api/games/valorant`).
34. **[TC-P6-06] Auto-Moderation Profanity Filter:** Validates automated toxicity masking (`/api/moderation/scan`).
35. **[TC-P6-07] User Conduct Report Submission:** Validates creating player reports (`/api/moderation/report`).
36. **[TC-P6-08] Moderation Queue Discovery:** Validates querying pending reports queue (`/api/moderation/reports`).
37. **[TC-P6-09] Admin Moderation Action (Warning):** Validates resolving reports with warnings (`/api/moderation/reports/:id/action`).
38. **[TC-P6-10] Player Honor Endorsement (+10 Rep):** Validates awarding endorsements and cooldown protection (`/api/auth/users/:id/endorse`).
39. **[TC-P6-11] Player Reputation & Honor Badges:** Validates honor tier and endorsement breakdown (`/api/auth/users/:id/reputation`).
40. **[TC-P6-12] User Achievements Evaluation & Unlocks:** Validates badge calculations (`/api/auth/achievements/my`).

---

### 10.7. Dedicated Phase 4 Multi-User Integration Suite (`test_phase4.mjs`)

A dedicated multi-client integration test script is provided at [test_phase4.mjs](file:///c:/Users/DELL/Desktop/MERN%20PROJECTS/chat-app/test_phase4.mjs) validating full cross-user interactions between an Organizer (`Amar1234#5321`) and a Teammate (`NightWolf#2222`).

#### How to Run:
```bash
node test_phase4.mjs
```

#### Coverage (15/15 Tests Passing — 100%):
1. **[TC-P4-01] Server Health Check:** Verifies `/api/status` endpoint.
2. **[TC-P4-02] Organizer Authentication:** Logs in User 1 (`amarnath1438686@gmail.com`).
3. **[TC-P4-03] Teammate Authentication:** Logs in User 2 (`gamertester1@test.com`).
4. **[TC-P4-04] Create Instant LFG Post:** Creates squad with auto-linked party lobby and TTL expiry.
5. **[TC-P4-05] LFG Board Discovery:** Queries LFG board with multi-attribute filtering.
6. **[TC-P4-06] Squad Up:** Teammate joins squad; slots increment (1/4 -> 2/4) and teammate auto-enters linked party.
7. **[TC-P4-07] Notification Dispatch:** Verifies Organizer receives live in-app `lfg_join` notification.
8. **[TC-P4-08] Mark Notification Read:** Organizer marks alert read; unread badge counter decrements.
9. **[TC-P4-09] Session Scheduling:** Organizer schedules future match with computed post-session TTL.
10. **[TC-P4-10] Teammate RSVP:** Teammate joins scheduled session; squad capacity updates.
11. **[TC-P4-11] Calendar View Retrieval:** Retrieves future sessions with countdowns.
12. **[TC-P4-12] Dispatch Session Reminders:** Organizer triggers squad reminder dispatch (`/api/lfg/:id/remind`).
13. **[TC-P4-13] Reminder Notification Delivery:** Verifies Teammate receives in-app `session_reminder` alert.
14. **[TC-P4-14] Leave Squad & Restore Capacity:** Teammate leaves squad; spots available restored (2/4 -> 1/4).
15. **[TC-P4-15] Terminate / Close LFG Post:** Organizer closes post; status transitions to `closed`.

---

### 10.8. Dedicated Phase 5 WebRTC Voice Signaling & Peer Integration Suite (`test_phase5.mjs`)

A dedicated multi-client WebRTC integration test script is provided at [test_phase5.mjs](file:///c:/Users/DELL/Desktop/MERN%20PROJECTS/chat-app/test_phase5.mjs) validating full cross-peer signaling between a Party Host (`Amar1234#5321`) and a Teammate (`NightWolf#2222`).

#### How to Run:
```bash
node test_phase5.mjs
```

#### Coverage (15/15 Tests Passing — 100%):
1. **[TC-P5-01] Server Health Check:** Verifies `/api/status` endpoint availability.
2. **[TC-P5-02] Host Authentication (User 1):** Logs in User 1 (`amarnath1438686@gmail.com`).
3. **[TC-P5-03] Teammate Authentication (User 2):** Logs in User 2 (`gamertester1@test.com`).
4. **[TC-P5-04] Create Party Lobby for Voice:** Provisions a dedicated party lobby (`Apex Legends Voice Comm Squad`).
5. **[TC-P5-05] Query Initial Empty Voice Roster:** Validates `/api/parties/:id/voice` initializes with 0 active voice callers.
6. **[TC-P5-06] Establish Real-Time Sockets:** Establishes isolated WebSocket connections for both Host and Teammate.
7. **[TC-P5-07] Host Joins Voice Channel:** Host emits `voice_join` and receives `voice_room_users` handshake.
8. **[TC-P5-08] REST Endpoint Reflects Host in Voice:** Validates REST roster count reflects 1 active participant with user metadata.
9. **[TC-P5-09] Teammate Joins Voice & Dispatches Peer Handshake:** Teammate joins; Host receives `voice_user_joined` and Teammate receives Host in peer list.
10. **[TC-P5-10] WebRTC Signaling Relay (Offer & Answer):** Verifies bidirectional relay of simulated WebRTC SDP offers and answers via `voice_signal`.
11. **[TC-P5-11] Real-Time Speaking Indicator Relay:** Verifies `voice_speaking` emits and `voice_speaking_change` updates for HUD voice activity indicators.
12. **[TC-P5-12] Mute & Deafen State Broadcasting:** Verifies `voice_state` relay propagates mute and deafen status across the voice room.
13. **[TC-P5-13] Teammate Leaves Voice & Triggers Cleanup:** Teammate emits `voice_leave`; Host receives `voice_user_left` eviction event.
14. **[TC-P5-14] Roster Count Decrements on User Exit:** Validates REST endpoint decrements active count (2 -> 1).
15. **[TC-P5-15] Socket Disconnect Auto-Eviction & Room Cleanup:** Closes socket connections; validates room automatically unloads and count resets to 0.

---

### 10.9. Dedicated Phase 6 Polish, Safety & Media Integration Suite (`test_phase6.mjs`)

A dedicated multi-client integration test script is provided at [test_phase6.mjs](file:///c:/Users/DELL/Desktop/MERN%20PROJECTS/chat-app/test_phase6.mjs) validating Phase 6 safety, moderation, gaming media, endorsements, and achievements.

#### How to Run:
```bash
node test_phase6.mjs
```

#### Coverage (15/15 Tests Passing — 100%):
1. **[TC-P6-01] Server Health Check:** Verifies `/api/status` endpoint availability.
2. **[TC-P6-02] Host Authentication (User 1):** Authenticates User 1 (`amarnath1438686@gmail.com`).
3. **[TC-P6-03] Teammate Authentication (User 2):** Authenticates User 2 (`gamertester1@test.com`).
4. **[TC-P6-04] Curated Gaming GIF Search:** Searches gaming GIF catalog with keyword `clutch`.
5. **[TC-P6-05] GIF Category Filtering:** Filters gaming reactions under category `victory`.
6. **[TC-P6-06] OpenGraph Link Preview Scraper:** Scrapes web URLs returning OpenGraph title, description, and thumbnail.
7. **[TC-P6-07] Competitive Games Directory Listing:** Loads 10 competitive esports titles with platforms and modes.
8. **[TC-P6-08] Game Details & Ranks Specification:** Fetches competitive ranks (Iron to Radiant) for Valorant.
9. **[TC-P6-09] Auto-Moderation Profanity Filter:** Scans and masks profanity and harmful toxicity (`****`).
10. **[TC-P6-10] User Conduct Report Submission:** Submits player conduct report targeting unsportsmanlike behavior.
11. **[TC-P6-11] Moderation Queue Discovery:** Queries administrative review queue for pending reports.
12. **[TC-P6-12] Admin Moderation Action (Warning):** Admin issues warning strike and marks report `resolved`.
13. **[TC-P6-13] Player Honor Endorsement (+10 Rep):** Endorses teammate for Great Comms with 12h cooldown protection.
14. **[TC-P6-14] Player Reputation & Honor Badges:** Queries target player honor tier, karma score, and badges.
15. **[TC-P6-15] User Achievements Evaluation & Unlocks:** Evaluates user profile attributes and unlocks earned badges.

---

## 11. Strategic Business Expansions & Architectural Roadmap

To transition this MERN + Socket.io gaming platform from a real-time communication stack into a scalable, high-growth gaming network, the following strategic expansion initiatives and technical architecture additions have been formulated:

### 11.1. Hyper-Transient PVE & Co-Op Matchmaking
- **Problem Statement:** Players in action RPGs, MMORPGs, and grind-heavy co-op titles struggle to find immediate, temporary groups for short-window events (boss encounters, domain farming, dungeons). Massive Discord servers introduce high social friction, clutter, and latency.
- **Implementation Strategy:**
  - Shift `Party.js` to support **"Micro-Lobbies"** with automated ephemeral lifecycles.
  - Implement MongoDB **TTL (Time-To-Live) indexes** on transient party documents (e.g. auto-expire after 30–60 minutes).
  - Power rapid, one-click matchmaking queues using the existing `Socket.io` auto-join room infrastructure.
- **Key Value Proposition:** Instant entry into cooperative matches with zero long-term social commitment.

### 11.2. Algorithmic Behavioral Matchmaking
- **Problem Statement:** Random queueing in competitive multiplayer leads to toxic team dynamics, conflicting playstyles, and high user churn.
- **Implementation Strategy:**
  - Leverage `User.js` metadata (`playStyle`, `reputationScore`, `micEnabled`, `rank`, `region`).
  - Develop a weighted **"Synergy Score"** matching algorithm:
    $$\text{Synergy} = w_1 \cdot \text{Reputation} + w_2 \cdot \text{PlayStyleMatch} + w_3 \cdot \text{MicAffinity} + w_4 \cdot \text{RankDelta}$$
  - Expose this matching engine via a secure B2B API gateway layer for indie/mid-tier game developers.

### 11.3. Paid Coaching & Mentorship Marketplace
- **Problem Statement:** Competitive players seeking tier progression rely on unvetted forums, subreddits, and fragmented freelance platforms.
- **Implementation Strategy:**
  - Introduce a verified **"Coach"** role validated by competitive `rank`, `tier`, and `division` history.
  - Monetize player `availability` calendars for booking structured coaching slots.
  - Conduct interactive coaching sessions directly in [ChatContainer.jsx](file:///c:/Users/DELL/Desktop/MERN%20PROJECTS/chat-app/client/src/components/ChatContainer.jsx) with real-time text, voice/video hooks, and Cloudinary-backed VOD review.
  - Integrate payment processing (Stripe / Razorpay) with automated platform commission split.

### 11.4. Amateur Esports & Scrim Orchestration
- **Problem Statement:** Amateur esports squads and tournament organizers currently coordinate practice matches (scrims) via scattered spreadsheets, tweets, and ad-hoc chat channels.
- **Implementation Strategy:**
  - Evolve `Party.js` into a team hierarchy (`Team.js` + `Match.js`).
  - Allow two Party Leaders to establish a verified **"Scrim Match"** entity.
  - Provision automated, synchronized dual-team WebSocket rooms (`scrim_<matchId>`) for sharing lobby passwords, rules, and server credentials securely.
  - Provide an in-chat screenshot and score reporting interface with dispute moderation.

---

### 11.5. Architecture Readiness & Requirements Matrix

| Business Initiative | Existing Schema & Stack Foundation | New Infrastructure & Engineering Required |
| :--- | :--- | :--- |
| **Transient Matchmaking** | `Party.js` lobbies, Socket.io auto-join, room broadcast. | MongoDB TTL expiration index, instant queue engine. |
| **Behavioral Matchmaking** | `User.js` (`playStyle`, `reputationScore`, `rank`, `region`). | Weighted synergy scoring algorithm, API gateway tier. |
| **Coaching Marketplace** | `Message.js` rich media/Cloudinary, User `availability`. | Stripe payment gateway, calendar booking scheduler. |
| **Scrim Orchestration** | Party leader roles, multi-tenant Socket.io rooms. | `Team.js` & `Match.js` schemas, bracket & score verification. |


