const API_BASE = 'http://localhost:5000/api';

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

async function runPhase6Tests() {
  console.log('=====================================================');
  console.log('🛡️ RUNNING PHASE 6 TEST SUITE: POLISH, SAFETY & MEDIA');
  console.log('=====================================================\n');

  let results = [];
  let user1Token = null;
  let user1Data = null;
  let user2Token = null;
  let user2Data = null;
  let testReportId = null;

  function report(id, name, success, details = '') {
    results.push({ id, name, success, details });
    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} | [${id}] ${name}`);
    if (details) console.log(`       ↳ ${details}`);
  }

  // 1. Health Status
  try {
    const res = await request(`${API_BASE}/status`);
    report('TC-P6-01', 'Server Health Check', res.data === 'Server is live', `Response: "${res.data}"`);
  } catch (err) {
    report('TC-P6-01', 'Server Health Check', false, err.message);
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
    report('TC-P6-02', 'Host Authentication (User 1)', !!user1Token, `User 1: ${user1Data?.gamerTag || user1Data?.fullName} (${user1Data?._id})`);
  } catch (err) {
    report('TC-P6-02', 'Host Authentication (User 1)', false, err.message);
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
    report('TC-P6-03', 'Teammate Authentication (User 2)', !!user2Token, `User 2: ${user2Data?.gamerTag || user2Data?.fullName} (${user2Data?._id})`);
  } catch (err) {
    report('TC-P6-03', 'Teammate Authentication (User 2)', false, err.message);
  }

  // 4. Curated Gaming GIF Search
  try {
    const res = await request(`${API_BASE}/media/gifs?q=clutch`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const gifs = res.data?.gifs || [];
    report('TC-P6-04', 'Curated Gaming GIF Search', res.data?.success && gifs.length > 0, `Query: "clutch", Found: ${gifs.length} GIFs, First Title: "${gifs[0]?.title}"`);
  } catch (err) {
    report('TC-P6-04', 'Curated Gaming GIF Search', false, err.message);
  }

  // 5. GIF Category Filtering
  try {
    const res = await request(`${API_BASE}/media/gifs?category=victory`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const gifs = res.data?.gifs || [];
    report('TC-P6-05', 'GIF Category Filtering', res.data?.success && gifs.length > 0, `Category: "victory", Found: ${gifs.length} GIFs`);
  } catch (err) {
    report('TC-P6-05', 'GIF Category Filtering', false, err.message);
  }

  // 6. OpenGraph Link Preview Scraper
  try {
    const res = await request(`${API_BASE}/media/preview`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: JSON.stringify({ url: 'https://github.com' }),
    });
    const preview = res.data?.preview;
    report('TC-P6-06', 'OpenGraph Link Preview Scraper', res.data?.success && !!preview?.title, `Site: ${preview?.siteName || 'Web'}, Title: "${preview?.title?.slice(0, 40)}"`);
  } catch (err) {
    report('TC-P6-06', 'OpenGraph Link Preview Scraper', false, err.message);
  }

  // 7. Competitive Games Directory Listing
  try {
    const res = await request(`${API_BASE}/games/directory`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const games = res.data?.games || [];
    report('TC-P6-07', 'Competitive Games Directory Listing', res.data?.success && games.length >= 10, `Loaded ${games.length} competitive titles across ${res.data?.genres?.length || 0} genres`);
  } catch (err) {
    report('TC-P6-07', 'Competitive Games Directory Listing', false, err.message);
  }

  // 8. Game Details Query
  try {
    const res = await request(`${API_BASE}/games/valorant`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const game = res.data?.game;
    report('TC-P6-08', 'Game Details & Ranks Specification', res.data?.success && game?.name === 'Valorant', `Game: ${game?.name}, Publisher: ${game?.publisher}, Top Rank: ${game?.ranks?.[game?.ranks?.length - 1]}`);
  } catch (err) {
    report('TC-P6-08', 'Game Details & Ranks Specification', false, err.message);
  }

  // 9. Auto-Moderation Profanity Filter Check
  try {
    const res = await request(`${API_BASE}/moderation/scan`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: JSON.stringify({ text: 'Good game buddy, but kys right now!' }),
    });
    report('TC-P6-09', 'Auto-Moderation Profanity Filter', res.data?.success && res.data?.isClean === false && res.data?.cleanedText?.includes('****'), `Detected toxic phrase, Sanitized: "${res.data?.cleanedText}"`);
  } catch (err) {
    report('TC-P6-09', 'Auto-Moderation Profanity Filter', false, err.message);
  }

  // 10. User Conduct Report Submission
  try {
    const res = await request(`${API_BASE}/moderation/report`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: JSON.stringify({
        reportedUserId: user2Data._id,
        targetType: 'user',
        reason: 'toxic',
        detail: 'Rage quit during overtime round 24',
      }),
    });
    const reportDoc = res.data?.report;
    testReportId = reportDoc?._id;
    report('TC-P6-10', 'User Conduct Report Submission', res.data?.success && !!testReportId, `Report ID: ${testReportId}, Target: ${reportDoc?.reportedUserId?.gamerTag}, Reason: ${reportDoc?.reason}`);
  } catch (err) {
    report('TC-P6-10', 'User Conduct Report Submission', false, err.message);
  }

  // 11. Moderation Queue Discovery
  try {
    const res = await request(`${API_BASE}/moderation/reports?status=pending`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    report('TC-P6-11', 'Moderation Queue Discovery', res.data?.success && Array.isArray(res.data?.reports), `Pending reports in queue: ${res.data?.total || res.data?.reports?.length || 0}`);
  } catch (err) {
    report('TC-P6-11', 'Moderation Queue Discovery', false, err.message);
  }

  // 12. Admin Moderation Action (Warning Issuance)
  try {
    const res = await request(`${API_BASE}/moderation/reports/${testReportId}/action`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: JSON.stringify({ action: 'warn', adminNotes: 'First unsportsmanlike conduct strike' }),
    });
    report('TC-P6-12', 'Admin Moderation Action (Warning)', res.data?.success && res.data?.report?.status === 'resolved', `Action: ${res.data?.report?.actionTaken}, Target warnings: ${res.data?.userStatus?.warnings}`);
  } catch (err) {
    report('TC-P6-12', 'Admin Moderation Action (Warning)', false, err.message);
  }

  // 13. Player Honor Endorsement (+10 Rep)
  try {
    const res = await request(`${API_BASE}/auth/users/${user2Data._id}/endorse`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: JSON.stringify({ category: 'greatComms' }),
    });
    // Can succeed or hit cooldown if already endorsed
    const ok = res.data?.success || res.data?.message?.includes('already endorsed');
    report('TC-P6-13', 'Player Honor Endorsement (+10 Rep)', ok, res.data?.message || `Category: greatComms, New Rep: ${res.data?.reputationScore}`);
  } catch (err) {
    report('TC-P6-13', 'Player Honor Endorsement (+10 Rep)', false, err.message);
  }

  // 14. Player Reputation & Honor Badges Query
  try {
    const res = await request(`${API_BASE}/auth/users/${user2Data._id}/reputation`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const rep = res.data?.reputation;
    report('TC-P6-14', 'Player Reputation & Honor Badges', res.data?.success && typeof rep?.reputationScore === 'number', `Player: ${rep?.gamerTag}, Tier: ${rep?.honorTier}, Rep: ${rep?.reputationScore} pts, Endorsements: Friendly=${rep?.endorsements?.friendly}, Comms=${rep?.endorsements?.greatComms}`);
  } catch (err) {
    report('TC-P6-14', 'Player Reputation & Honor Badges', false, err.message);
  }

  // 15. User Achievements Evaluation
  try {
    const res = await request(`${API_BASE}/auth/achievements/my`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    report('TC-P6-15', 'User Achievements Evaluation & Unlocks', res.data?.success && Array.isArray(res.data?.achievements), `Unlocked Badges: [${(res.data?.achievements || []).join(', ')}]`);
  } catch (err) {
    report('TC-P6-15', 'User Achievements Evaluation & Unlocks', false, err.message);
  }

  console.log('\n=====================================================');
  const passCount = results.filter((r) => r.success).length;
  console.log(`🏁 TEST EXECUTION COMPLETE: ${passCount}/${results.length} PASSING (${Math.round((passCount / results.length) * 100)}%)`);
  console.log('=====================================================\n');
}

runPhase6Tests().catch(console.error);
