import { io } from './client/node_modules/socket.io-client/build/esm/index.js';

const API_BASE = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function withTimeout(promise, ms = 4000, name = 'event') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout waiting for ${name}`)), ms)),
  ]);
}

async function runPhase5Tests() {
  console.log('=====================================================');
  console.log('🎙️ RUNNING PHASE 5 TEST SUITE: WEBRTC VOICE CHAT');
  console.log('=====================================================\n');

  let results = [];
  let user1Token = null;
  let user1Data = null;
  let user2Token = null;
  let user2Data = null;
  let partyId = null;
  let socket1 = null;
  let socket2 = null;

  function report(id, name, success, details = '') {
    results.push({ id, name, success, details });
    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} | [${id}] ${name}`);
    if (details) console.log(`       ↳ ${details}`);
  }

  // 1. Health Status
  try {
    const res = await request(`${API_BASE}/status`);
    report('TC-P5-01', 'Server Health Check', res.data === 'Server is live', `Response: "${res.data}"`);
  } catch (err) {
    report('TC-P5-01', 'Server Health Check', false, err.message);
  }

  // 2. Authenticate User 1
  try {
    let res = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'amarnath1438686@gmail.com', password: 'Password@123' }),
    });
    if (!res.data?.success) {
      res = await request(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: 'valkyrie@gameconnect.gg', password: 'Password123!' }),
      });
    }
    user1Token = res.data?.token;
    user1Data = res.data?.userData;
    report('TC-P5-02', 'Host Authentication (User 1)', !!user1Token, `User 1: ${user1Data?.gamerTag || user1Data?.fullName} (${user1Data?._id})`);
  } catch (err) {
    report('TC-P5-02', 'Host Authentication (User 1)', false, err.message);
  }

  // 3. Authenticate User 2
  try {
    let res = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'gamertester1@test.com', password: 'Password@123' }),
    });
    if (!res.data?.success) {
      res = await request(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: 'shadow@gameconnect.gg', password: 'Password123!' }),
      });
    }
    user2Token = res.data?.token;
    user2Data = res.data?.userData;
    report('TC-P5-03', 'Teammate Authentication (User 2)', !!user2Token, `User 2: ${user2Data?.gamerTag || user2Data?.fullName} (${user2Data?._id})`);
  } catch (err) {
    report('TC-P5-03', 'Teammate Authentication (User 2)', false, err.message);
  }

  // 4. Create Voice Party Lobby
  try {
    const res = await request(`${API_BASE}/parties`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: JSON.stringify({
        name: 'Apex Legends Voice Comm Squad',
        game: 'Apex Legends',
        maxPlayers: 3,
        isOpen: true,
      }),
    });
    const party = res.data?.party;
    partyId = party?._id?.toString() || party?._id;
    report('TC-P5-04', 'Create Party Lobby for Voice', res.data?.success && !!partyId, `Party ID: ${partyId}, Name: "${party?.name}"`);
  } catch (err) {
    report('TC-P5-04', 'Create Party Lobby for Voice', false, err.message);
  }

  // 5. Query Initial Empty Voice Channel Roster
  try {
    const res = await request(`${API_BASE}/parties/${partyId}/voice`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    report('TC-P5-05', 'Query Initial Empty Voice Roster', res.data?.success && res.data?.count === 0, `Active voice count: ${res.data?.count}`);
  } catch (err) {
    report('TC-P5-05', 'Query Initial Empty Voice Roster', false, err.message);
  }

  // 6. Connect Real-time Socket for User 1 & User 2
  try {
    socket1 = io(SOCKET_URL, {
      query: { userId: user1Data._id.toString() },
      transports: ['websocket'],
    });
    socket2 = io(SOCKET_URL, {
      query: { userId: user2Data._id.toString() },
      transports: ['websocket'],
    });

    await withTimeout(
      new Promise((res) => (socket1.connected ? res() : socket1.once('connect', res))),
      4000,
      'socket1 connect'
    );
    await withTimeout(
      new Promise((res) => (socket2.connected ? res() : socket2.once('connect', res))),
      4000,
      'socket2 connect'
    );

    report('TC-P5-06', 'Establish Real-Time Sockets', socket1.connected && socket2.connected, `Socket 1: ${socket1.id}, Socket 2: ${socket2.id}`);
  } catch (err) {
    report('TC-P5-06', 'Establish Real-Time Sockets', false, err.message);
  }

  // 7. User 1 Joins Voice Room
  try {
    const u1JoinedPromise = new Promise((resolve) => {
      socket1.once('voice_room_users', (data) => resolve(data));
    });

    socket1.emit('voice_join', {
      partyId,
      gamerTag: user1Data.gamerTag,
      profilePic: user1Data.profilePic,
    });

    const data = await withTimeout(u1JoinedPromise, 4000, 'voice_room_users');
    report('TC-P5-07', 'Host Joins Voice Channel', !!data && Array.isArray(data.users), `Existing peers in room: ${data?.users?.length || 0}`);
  } catch (err) {
    report('TC-P5-07', 'Host Joins Voice Channel', false, err.message);
  }

  // 8. Verify REST endpoint reports 1 active participant
  try {
    await delay(300);
    const res = await request(`${API_BASE}/parties/${partyId}/voice`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    report('TC-P5-08', 'REST Endpoint Reflects Host in Voice', res.data?.success && res.data?.count === 1, `Count: ${res.data?.count}, User: ${res.data?.users[0]?.gamerTag}`);
  } catch (err) {
    report('TC-P5-08', 'REST Endpoint Reflects Host in Voice', false, err.message);
  }

  // 9. User 2 Joins Voice Room (User 1 receives voice_user_joined, User 2 receives voice_room_users)
  try {
    const u1PeerJoined = new Promise((resolve) => {
      socket1.once('voice_user_joined', (user) => resolve(user));
    });
    const u2RoomUsers = new Promise((resolve) => {
      socket2.once('voice_room_users', (data) => resolve(data));
    });

    socket2.emit('voice_join', {
      partyId,
      gamerTag: user2Data.gamerTag,
      profilePic: user2Data.profilePic,
    });

    const [joinedPeer, u2List] = await withTimeout(Promise.all([u1PeerJoined, u2RoomUsers]), 4000, 'teammate join handshake');
    const success = joinedPeer.userId.toString() === user2Data._id.toString() && u2List.users.some(u => u.userId.toString() === user1Data._id.toString());
    report('TC-P5-09', 'Teammate Joins Voice & Dispatches Peer Handshake', success, `Host notified of peer: ${joinedPeer.gamerTag}, Teammate received existing peer: ${u2List.users[0]?.gamerTag}`);
  } catch (err) {
    report('TC-P5-09', 'Teammate Joins Voice & Dispatches Peer Handshake', false, err.message);
  }

  // 10. WebRTC Signaling Relay (SDP Offer & Answer Relay)
  try {
    const u1SignalPromise = new Promise((resolve) => {
      socket1.once('voice_signal', (payload) => resolve(payload));
    });
    const u2SignalPromise = new Promise((resolve) => {
      socket2.once('voice_signal', (payload) => resolve(payload));
    });

    // Teammate sends simulated SDP Offer to Host
    socket2.emit('voice_signal', {
      toSocketId: socket1.id,
      signal: { type: 'offer', sdp: 'v=0\r\no=mock_user2 1234 1234 IN IP4 127.0.0.1\r\ns=GameConnect Voice\r\nm=audio 5004 RTP/SAVPF 111' },
    });
    const offerPayload = await withTimeout(u1SignalPromise, 4000, 'offer signal relay');

    // Host sends simulated SDP Answer back to Teammate
    socket1.emit('voice_signal', {
      toSocketId: socket2.id,
      signal: { type: 'answer', sdp: 'v=0\r\no=mock_user1 5678 5678 IN IP4 127.0.0.1\r\ns=GameConnect Voice\r\nm=audio 5004 RTP/SAVPF 111' },
    });
    const answerPayload = await withTimeout(u2SignalPromise, 4000, 'answer signal relay');

    const signalingSuccess = offerPayload.signal.type === 'offer' && answerPayload.signal.type === 'answer';
    report('TC-P5-10', 'WebRTC Signaling Relay (Offer & Answer)', signalingSuccess, `Offer relayed from ${offerPayload.fromSocketId}, Answer relayed from ${answerPayload.fromSocketId}`);
  } catch (err) {
    report('TC-P5-10', 'WebRTC Signaling Relay (Offer & Answer)', false, err.message);
  }

  // 11. Real-time Speaking Activity Detection Relay
  try {
    const speakingStartPromise = new Promise((resolve) => {
      socket2.once('voice_speaking_change', (payload) => resolve(payload));
    });

    // Host starts speaking
    socket1.emit('voice_speaking', { partyId, isSpeaking: true });
    const speakStart = await withTimeout(speakingStartPromise, 4000, 'speaking start change');

    const speakingStopPromise = new Promise((resolve) => {
      socket2.once('voice_speaking_change', (payload) => resolve(payload));
    });
    // Host stops speaking
    socket1.emit('voice_speaking', { partyId, isSpeaking: false });
    const speakStop = await withTimeout(speakingStopPromise, 4000, 'speaking stop change');

    const speakingSuccess = speakStart.isSpeaking === true && speakStop.isSpeaking === false;
    report('TC-P5-11', 'Real-Time Speaking Indicator Relay', speakingSuccess, `Teammate received speaking start: ${speakStart.isSpeaking}, stop: ${speakStop.isSpeaking}`);
  } catch (err) {
    report('TC-P5-11', 'Real-Time Speaking Indicator Relay', false, err.message);
  }

  // 12. Audio State: Mute & Deafen Relay
  try {
    const mutePromise = new Promise((resolve) => {
      socket2.once('voice_user_state', (payload) => resolve(payload));
    });

    // Host mutes microphone
    socket1.emit('voice_state', { partyId, isMuted: true, isDeafened: false });
    const muteState = await withTimeout(mutePromise, 4000, 'mute state change');

    const deafenPromise = new Promise((resolve) => {
      socket2.once('voice_user_state', (payload) => resolve(payload));
    });
    // Host deafens
    socket1.emit('voice_state', { partyId, isMuted: true, isDeafened: true });
    const deafenState = await withTimeout(deafenPromise, 4000, 'deafen state change');

    const audioStateSuccess = muteState.isMuted === true && deafenState.isDeafened === true;
    report('TC-P5-12', 'Mute & Deafen State Broadcasting', audioStateSuccess, `Muted: ${muteState.isMuted}, Deafened: ${deafenState.isDeafened}`);
  } catch (err) {
    report('TC-P5-12', 'Mute & Deafen State Broadcasting', false, err.message);
  }

  // 13. Teammate Leaves Voice Channel
  try {
    const u1LeavePromise = new Promise((resolve) => {
      socket1.once('voice_user_left', (payload) => resolve(payload));
    });

    socket2.emit('voice_leave', { partyId });
    const leavePayload = await withTimeout(u1LeavePromise, 4000, 'teammate leave');
    const leaveSuccess = leavePayload.userId.toString() === user2Data._id.toString();
    report('TC-P5-13', 'Teammate Leaves Voice & Triggers Cleanup', leaveSuccess, `Host notified teammate departed: User ID ${leavePayload.userId}`);
  } catch (err) {
    report('TC-P5-13', 'Teammate Leaves Voice & Triggers Cleanup', false, err.message);
  }

  // 14. Verify Voice Roster Count After Departure
  try {
    await delay(300);
    const res = await request(`${API_BASE}/parties/${partyId}/voice`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    report('TC-P5-14', 'Roster Count Decrements on User Exit', res.data?.success && res.data?.count === 1, `Remaining voice count: ${res.data?.count}`);
  } catch (err) {
    report('TC-P5-14', 'Roster Count Decrements on User Exit', false, err.message);
  }

  // 15. Socket Disconnect Auto-Cleans Voice Room
  try {
    socket1.disconnect();
    socket2.disconnect();
    await delay(600);

    const res = await request(`${API_BASE}/parties/${partyId}/voice`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    report('TC-P5-15', 'Socket Disconnect Auto-Eviction & Room Cleanup', res.data?.success && res.data?.count === 0, `Final voice room count after disconnect: ${res.data?.count}`);
  } catch (err) {
    report('TC-P5-15', 'Socket Disconnect Auto-Eviction & Room Cleanup', false, err.message);
  }

  console.log('\n=====================================================');
  const passCount = results.filter((r) => r.success).length;
  console.log(`🏁 TEST EXECUTION COMPLETE: ${passCount}/${results.length} PASSING (${Math.round((passCount / results.length) * 100)}%)`);
  console.log('=====================================================\n');
}

runPhase5Tests().catch(console.error);
