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

async function runPhase4Tests() {
  console.log('=====================================================');
  console.log('🚀 RUNNING PHASE 4 TEST SUITE: LFG, SESSIONS & NOTIFICATIONS');
  console.log('=====================================================\n');

  let results = [];
  let token1 = null;
  let user1 = null;
  let token2 = null;
  let user2 = null;
  let lfgPostInstant = null;
  let lfgPostScheduled = null;
  let notificationId = null;

  function report(id, name, success, details = '') {
    results.push({ id, name, success, details });
    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} | [${id}] ${name}`);
    if (details) console.log(`       ↳ ${details}`);
  }

  // 1. Health Status
  try {
    const res = await request(`${API_BASE}/status`);
    report('TC-P4-01', 'Server Health Check', res.data === 'Server is live', `Response: "${res.data}"`);
  } catch (err) {
    report('TC-P4-01', 'Server Health Check', false, err.message);
  }

  // 2. Auth User 1
  try {
    let res = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'amarnath1438686@gmail.com', password: 'Password@123' }),
    });
    if (res.data?.success && res.data?.token) {
      token1 = res.data.token;
      user1 = res.data.userData;
      report('TC-P4-02', 'Organizer Authentication (User 1)', true, `GamerTag: ${user1.gamerTag || user1.fullName}`);
    } else {
      report('TC-P4-02', 'Organizer Authentication (User 1)', false, res.data?.message);
    }
  } catch (err) {
    report('TC-P4-02', 'Organizer Authentication (User 1)', false, err.message);
  }

  // 3. Auth User 2 (Squad Member)
  try {
    let res = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'gamertester1@test.com', password: 'Password@123' }),
    });
    if (res.data?.success && res.data?.token) {
      token2 = res.data.token;
      user2 = res.data.userData;
      report('TC-P4-03', 'Teammate Authentication (User 2)', true, `GamerTag: ${user2.gamerTag || user2.fullName}`);
    } else {
      report('TC-P4-03', 'Teammate Authentication (User 2)', false, res.data?.message);
    }
  } catch (err) {
    report('TC-P4-03', 'Teammate Authentication (User 2)', false, err.message);
  }

  if (!token1 || !token2) {
    console.error('Cannot proceed without both test accounts authenticated.');
    return;
  }

  const authHeader1 = { Authorization: `Bearer ${token1}` };
  const authHeader2 = { Authorization: `Bearer ${token2}` };

  // 4. Create Instant LFG Post (Auto Party Provision)
  try {
    const res = await request(`${API_BASE}/lfg`, {
      method: 'POST',
      headers: authHeader1,
      body: JSON.stringify({
        title: 'Ranked Diamond Push - Need Smokes & Duelist',
        game: 'Valorant',
        mode: 'Ranked',
        spotsTotal: 4,
        rankRequirement: 'Diamond+',
        region: 'NA',
        micRequired: true,
        estimatedDuration: '2 Hours',
        note: 'Chill comms only. Ready to queue immediately.',
      }),
    });

    lfgPostInstant = res.data?.post;
    const hasParty = lfgPostInstant && lfgPostInstant.partyId;
    report(
      'TC-P4-04',
      'Create Instant LFG Post with Linked Party',
      res.data?.success && !!hasParty,
      `Post ID: ${lfgPostInstant?._id}, Linked Party: ${lfgPostInstant?.partyId?.name || lfgPostInstant?.partyId}`
    );
  } catch (err) {
    report('TC-P4-04', 'Create Instant LFG Post with Linked Party', false, err.message);
  }

  // 5. Query LFG Board with Filtering
  try {
    const res = await request(`${API_BASE}/lfg?game=Valorant&region=NA&micRequired=true`, {
      headers: authHeader2,
    });
    const posts = res.data?.posts || [];
    const found = posts.some((p) => p._id === lfgPostInstant?._id);
    report(
      'TC-P4-05',
      'LFG Board Discovery & Parameter Filtering',
      res.data?.success && found,
      `Found ${posts.length} matching squad posts (including newly created post)`
    );
  } catch (err) {
    report('TC-P4-05', 'LFG Board Discovery & Parameter Filtering', false, err.message);
  }

  // 6. Join LFG Post (Squad Up) & Trigger In-App Notification
  try {
    const res = await request(`${API_BASE}/lfg/${lfgPostInstant._id}/join`, {
      method: 'POST',
      headers: authHeader2,
    });

    const updated = res.data?.post;
    const isPlayerInSquad = updated?.joinedPlayers?.some((p) => (p._id || p) === user2._id);
    report(
      'TC-P4-06',
      'Squad Up (Join LFG Post & Auto-Roster)',
      res.data?.success && isPlayerInSquad && updated.spotsFilled === 2,
      `Spots Filled: ${updated?.spotsFilled}/${updated?.spotsTotal}, Status: ${updated?.status}`
    );
  } catch (err) {
    report('TC-P4-06', 'Squad Up (Join LFG Post & Auto-Roster)', false, err.message);
  }

  // 7. Verify Organizer Received Notification for Join
  try {
    const res = await request(`${API_BASE}/notifications`, {
      headers: authHeader1,
    });

    const notifs = res.data?.notifications || [];
    const joinNotif = notifs.find((n) => n.type === 'lfg_join');
    if (joinNotif) {
      notificationId = joinNotif._id;
    }

    report(
      'TC-P4-07',
      'Notification Dispatch & In-App Center Delivery',
      res.data?.success && !!joinNotif,
      `Received: "${joinNotif?.title}" - ${joinNotif?.message} (Unread: ${res.data?.unreadCount})`
    );
  } catch (err) {
    report('TC-P4-07', 'Notification Dispatch & In-App Center Delivery', false, err.message);
  }

  // 8. Mark Notification Read
  try {
    if (notificationId) {
      const res = await request(`${API_BASE}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: authHeader1,
      });

      report(
        'TC-P4-08',
        'Mark Notification as Read',
        res.data?.success && res.data?.notification?.isRead === true,
        `New Unread Count: ${res.data?.unreadCount}`
      );
    } else {
      report('TC-P4-08', 'Mark Notification as Read', false, 'No notification ID');
    }
  } catch (err) {
    report('TC-P4-08', 'Mark Notification as Read', false, err.message);
  }

  // 9. Create Scheduled Gaming Session (Calendar View)
  try {
    const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now
    const res = await request(`${API_BASE}/lfg`, {
      method: 'POST',
      headers: authHeader1,
      body: JSON.stringify({
        title: 'Weekly Apex Legends Trios Championship Practice',
        game: 'Apex Legends',
        mode: 'Tournament',
        spotsTotal: 3,
        rankRequirement: 'Platinum+',
        region: 'Global',
        micRequired: true,
        scheduledAt: futureDate,
        estimatedDuration: '3 Hours',
        note: 'Drop practice and rotations for weekend cup.',
      }),
    });

    lfgPostScheduled = res.data?.post;
    report(
      'TC-P4-09',
      'Session Scheduling for Future Gaming Match',
      res.data?.success && !!lfgPostScheduled?.scheduledAt,
      `Scheduled: ${lfgPostScheduled?.scheduledAt}, TTL Expiry: ${lfgPostScheduled?.expiresAt}`
    );
  } catch (err) {
    report('TC-P4-09', 'Session Scheduling for Future Gaming Match', false, err.message);
  }

  // 10. User 2 joins scheduled session
  try {
    const res = await request(`${API_BASE}/lfg/${lfgPostScheduled._id}/join`, {
      method: 'POST',
      headers: authHeader2,
    });
    report(
      'TC-P4-10',
      'Teammate RSVP / Join Scheduled Session',
      res.data?.success && res.data.post?.spotsFilled === 2,
      `Session squad capacity: ${res.data?.post?.spotsFilled}/${res.data?.post?.spotsTotal}`
    );
  } catch (err) {
    report('TC-P4-10', 'Teammate RSVP / Join Scheduled Session', false, err.message);
  }

  // 11. Retrieve Upcoming Sessions Calendar View
  try {
    const res = await request(`${API_BASE}/lfg/sessions`, {
      headers: authHeader2,
    });
    const sessions = res.data?.sessions || [];
    const hasScheduled = sessions.some((s) => s._id === lfgPostScheduled?._id);
    report(
      'TC-P4-11',
      'Calendar / Upcoming Scheduled Sessions View',
      res.data?.success && hasScheduled,
      `Found ${sessions.length} upcoming scheduled gaming sessions for user`
    );
  } catch (err) {
    report('TC-P4-11', 'Calendar / Upcoming Scheduled Sessions View', false, err.message);
  }

  // 12. Send Session Reminder Notification to Squad
  try {
    const res = await request(`${API_BASE}/lfg/${lfgPostScheduled._id}/remind`, {
      method: 'POST',
      headers: authHeader1,
    });
    report(
      'TC-P4-12',
      'Dispatch Squad Session Reminders',
      res.data?.success,
      res.data?.message || 'Reminder sent'
    );
  } catch (err) {
    report('TC-P4-12', 'Dispatch Squad Session Reminders', false, err.message);
  }

  // 13. Teammate verifies session reminder notification
  try {
    const res = await request(`${API_BASE}/notifications`, {
      headers: authHeader2,
    });
    const notifs = res.data?.notifications || [];
    const reminder = notifs.find((n) => n.type === 'session_reminder');
    report(
      'TC-P4-13',
      'Teammate Receives Scheduled Session Reminder',
      res.data?.success && !!reminder,
      `Reminder: "${reminder?.title}" - ${reminder?.message}`
    );
  } catch (err) {
    report('TC-P4-13', 'Teammate Receives Scheduled Session Reminder', false, err.message);
  }

  // 14. Leave LFG Post (Slot Restoration)
  try {
    const res = await request(`${API_BASE}/lfg/${lfgPostInstant._id}/leave`, {
      method: 'POST',
      headers: authHeader2,
    });
    const post = res.data?.post;
    report(
      'TC-P4-14',
      'Leave Squad & Auto-Restore Open Capacity',
      res.data?.success && post?.spotsFilled === 1,
      `Spots restored to: ${post?.spotsFilled}/${post?.spotsTotal}`
    );
  } catch (err) {
    report('TC-P4-14', 'Leave Squad & Auto-Restore Open Capacity', false, err.message);
  }

  // 15. Close LFG Post
  try {
    const res = await request(`${API_BASE}/lfg/${lfgPostInstant._id}/close`, {
      method: 'PUT',
      headers: authHeader1,
    });
    report(
      'TC-P4-15',
      'Close / Terminate LFG Post',
      res.data?.success && res.data?.post?.status === 'closed',
      `Final status: ${res.data?.post?.status}`
    );
  } catch (err) {
    report('TC-P4-15', 'Close / Terminate LFG Post', false, err.message);
  }

  // Summary
  console.log('\n=====================================================');
  const passed = results.filter((r) => r.success).length;
  const total = results.length;
  console.log(`🏁 TEST EXECUTION COMPLETE: ${passed}/${total} PASSING`);
  console.log('=====================================================');
}

runPhase4Tests();
