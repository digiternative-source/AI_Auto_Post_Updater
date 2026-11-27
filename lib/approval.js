function findRow(rows, postId, token) {
  const found = (rows || []).find((row) => String(row.post_id) === String(postId));
  if (!found) return { row: null, reason: 'missing' };
  if (!tokensMatch(found.approval_token, token)) return { row: found, reason: 'token' };
  return { row: found, reason: 'ok' };
}

function decide(rows, input, now) {
  const action = String(input.action || '').trim().toLowerCase();
  const found = findRow(rows, input.post_id, input.token);
  if (found.reason !== 'ok') {
    return {
      route: 'invalid',
      message: 'Yeh link valid nahi. Nayi approval email ka button use karein.',
      row: null,
    };
  }
  const row = found.row;
  const status = statusKey(row);
  if (status === 'posted') {
    return { route: 'already', message: 'Yeh post pehle hi lag chuki hai. ' + (row.posted_url || ''), row };
  }
  if (status === 'declined') {
    return { route: 'already', message: 'Yeh post pehle decline ho chuki hai. Dobara nahi lagegi.', row };
  }
  if (status === 'publishing') {
    return { route: 'already', message: 'Yeh post abhi lag rahi hai. Dobara button na dabayein.', row };
  }
  if (action === 'decline' && (status === 'pending approval' || status === 'approved')) {
    return {
      route: 'decline',
      message: 'Decline ho gaya. Post nahi lagegi.',
      row,
      sheet: sheetPatch(row, { status: 'Declined', approval_token: '', error: '', updated_at: now.toISOString() }),
    };
  }
  if (action !== 'approve' || (status !== 'pending approval' && status !== 'approved')) {
    return { route: 'invalid', message: 'Is post pe ab approve nahi ho sakta. Status: ' + (row.status || 'khali'), row };
  }
  if (String(row.can_publish) !== 'yes') {
    return {
      route: 'blocked',
      message: row.warnings || row.error || 'Yeh post abhi publish nahi ho sakti.',
      row,
    };
  }
  const when = parseScheduledAt(row.scheduled_at, row.timezone);
  if (row.publish_mode === 'at_scheduled_time' && when && when.getTime() > now.getTime() && status === 'pending approval') {
    return {
      route: 'hold',
      message: 'Approve ho gaya. Post ' + (row.scheduled_at || '') + ' pe lagegi.',
      row,
      sheet: sheetPatch(row, { status: 'Approved', error: '', updated_at: now.toISOString() }),
    };
  }
  return {
    route: 'approve',
    message: '',
    row,
    sheet: sheetPatch(row, { status: 'Publishing', error: '', updated_at: now.toISOString() }),
  };
}

function sheetPatch(row, changes) {
  return Object.assign({
    post_id: row.post_id,
    approval_token: row.approval_token || '',
    posted_url: row.posted_url || '',
    error: row.error || '',
    status: row.status || '',
  }, changes);
}

function publishSuccess(row, postedUrl, now) {
  return sheetPatch(row, {
    status: 'Posted',
    posted_url: postedUrl || '',
    approval_token: '',
    error: '',
    updated_at: now.toISOString(),
  });
}

function publishFailure(row, error, now) {
  return sheetPatch(row, {
    status: 'Pending Approval',
    error: clip(error, 500),
    updated_at: now.toISOString(),
  });
}
