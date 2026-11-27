const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const libOrder = [
  'lib/time.js',
  'lib/text.js',
  'lib/platforms.js',
  'lib/drive.js',
  'lib/calendar.js',
  'lib/sheet.js',
  'lib/draft.js',
  'lib/email.js',
  'lib/approval.js',
];
const LIB = libOrder.map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
const COLUMNS = [
  'post_id', 'source', 'scheduled_at', 'platform', 'topic', 'drive_file_id', 'drive_file_name', 'drive_folder_name', 'drive_url', 'source_link', 'source_locked',
  'raw_caption', 'niche', 'cta_link', 'language', 'brand_voice', 'status', 'approval_token',
  'prepared_caption', 'prepared_hashtags', 'prepared_title', 'trend_notes', 'full_post_preview',
  'media_public_url', 'media_urls', 'media_kind', 'posted_url', 'error', 'warnings', 'updated_at',
  'ig_user_id', 'facebook_page_id', 'linkedin_author_urn', 'tiktok_privacy_level',
  'publish_mode', 'can_publish', 'meta_graph_version', 'notify_email',
];

function entry(name) {
  return fs.readFileSync(path.join(__dirname, 'entries', name), 'utf8');
}

function asEach(source) {
  return 'const __result = await (async function () {\n' + source + '\n})();\n'
    + 'if (Array.isArray(__result)) return __result[0];\nreturn __result;\n';
}

function workflowBuilder() {
  const nodes = [];
  const connections = {};
  function add(name, type, typeVersion, position, parameters, extra) {
    nodes.push(Object.assign({
      id: crypto.randomUUID(),
      name,
      type,
      typeVersion,
      position,
      parameters,
    }, extra || {}));
  }
  function link(from, to, fromIndex, toIndex) {
    if (!connections[from]) connections[from] = { main: [] };
    const output = fromIndex || 0;
    while (connections[from].main.length <= output) connections[from].main.push([]);
    connections[from].main[output].push({ node: to, type: 'main', index: toIndex || 0 });
  }
  function cred(type, name, id) {
    return { [type]: { id, name } };
  }
  function code(name, position, file, each, withLib) {
    const source = (withLib ? LIB + '\n' : '') + entry(file);
    add(name, 'n8n-nodes-base.code', 2, position, {
      mode: each ? 'runOnceForEachItem' : 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: each ? asEach(source) : source,
    });
  }
  function sheets(name, position, operation, documentExpression) {
    const parameters = {
      operation,
      documentId: { __rl: true, mode: 'id', value: documentExpression },
      sheetName: { __rl: true, mode: 'name', value: 'Calendar' },
      options: {},
    };
    const extra = {
      credentials: cred('googleSheetsOAuth2Api', 'Google Sheets account', 'sheets-cred'),
    };
    if (operation === 'read') extra.alwaysOutputData = true;
    if (operation === 'appendOrUpdate') {
      const value = {};
      COLUMNS.forEach((column) => {
        value[column] = '={{ $json.' + column + ' }}';
      });
      parameters.columns = {
        mappingMode: 'defineBelow',
        value,
        matchingColumns: ['post_id'],
        schema: COLUMNS.map((column) => ({
          id: column,
          displayName: column,
          required: false,
          defaultMatch: column === 'post_id',
          display: true,
          type: 'string',
          canBeUsedToMatch: true,
        })),
      };
    }
    add(name, 'n8n-nodes-base.googleSheets', 4.5, position, parameters, extra);
  }
  function ifEquals(name, position, left, right) {
    add(name, 'n8n-nodes-base.if', 2.2, position, {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{
          id: name,
          leftValue: left,
          rightValue: right,
          operator: { type: 'string', operation: 'equals' },
        }],
        combinator: 'and',
      },
      options: {},
    });
  }
  function ifNotEmpty(name, position, left) {
    add(name, 'n8n-nodes-base.if', 2.2, position, {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{
          id: name,
          leftValue: left,
          rightValue: '',
          operator: { type: 'string', operation: 'notEmpty', singleValue: true },
        }],
        combinator: 'and',
      },
      options: {},
    });
  }
  function switchOn(name, position, expression, values) {
    add(name, 'n8n-nodes-base.switch', 3.2, position, {
      rules: {
        values: values.map((value) => ({
          conditions: {
            options: { caseSensitive: false, leftValue: '', typeValidation: 'loose', version: 2 },
            conditions: [{
              id: value,
              leftValue: expression,
              rightValue: value,
              operator: { type: 'string', operation: 'equals' },
            }],
            combinator: 'and',
          },
          renameOutput: true,
          outputKey: value,
        })),
      },
      options: { fallbackOutput: 'extra' },
    });
  }
  function http(name, position, parameters, credential) {
    add(name, 'n8n-nodes-base.httpRequest', 4.2, position, parameters, Object.assign({
      onError: 'continueRegularOutput',
    }, credential ? { credentials: credential } : {}));
  }
  function gmail(name, position) {
    add(name, 'n8n-nodes-base.gmail', 2.1, position, {
      sendTo: '={{ $json.notify_email || $json.notifyEmail }}',
      subject: '={{ $json.emailSubject }}',
      emailType: 'html',
      message: '={{ $json.emailHtml }}',
      options: { appendAttribution: false },
    }, {
      onError: 'continueRegularOutput',
      credentials: cred('gmailOAuth2', 'Gmail account', 'gmail-cred'),
    });
  }
  function respond(name, position) {
    add(name, 'n8n-nodes-base.respondToWebhook', 1.1, position, {
      respondWith: 'text',
      responseBody: '={{ $json.pageHtml }}',
      options: {
        responseHeaders: {
          entries: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }],
        },
      },
    });
  }
  function sticky(name, position, content, width) {
    add(name, 'n8n-nodes-base.stickyNote', 1, position, {
      content,
      height: 220,
      width: width || 420,
      color: 4,
    });
  }
  return { nodes, connections, add, link, cred, code, sheets, ifEquals, ifNotEmpty, switchOn, http, gmail, respond, sticky };
}

function configAssignments(fields) {
  return {
    mode: 'manual',
    duplicateItem: false,
    includeOtherFields: false,
    assignments: {
      assignments: fields.map((field, index) => ({
        id: 'field-' + index,
        name: field[0],
        value: field[1],
        type: field[2] || 'string',
      })),
    },
    options: {},
  };
}

function buildPrepare() {
  const flow = workflowBuilder();
  const { add, link, cred, code, sheets, ifEquals, ifNotEmpty, switchOn, http, gmail, sticky } = flow;
  const sheetExpr = "={{ $('Config').first().json.spreadsheetId }}";
  sticky('Read me', [-40, -220], '## Prepare\nRoz 5:00pm email, 7:00pm post.\nEk din ki Instagram aur Facebook post.\nCalendar ki caption aur hashtags waise hi jaati hain.\nMail ka link post nahi karta.');
  add('Manual Trigger', 'n8n-nodes-base.manualTrigger', 1, [0, 80], {});
  add('5pm and 7pm', 'n8n-nodes-base.scheduleTrigger', 1.2, [0, 280], {
    rule: {
      interval: [
        { field: 'days', daysInterval: 1, triggerAtHour: 17, triggerAtMinute: 0 },
        { field: 'days', daysInterval: 1, triggerAtHour: 19, triggerAtMinute: 0 },
      ],
    },
  });
  add('Config', 'n8n-nodes-base.set', 3.4, [280, 180], configAssignments([
    ['notifyEmail', 'digiternative@gmail.com'],
    ['spreadsheetId', 'YOUR_SPREADSHEET_ID'],
    ['calendarId', 'primary'],
    ['driveFolderId', '1HC8Brz4g4Zy64TRDWbmo3T2A4ke6Yp4G'],
    ['webhookBaseUrl', 'http://localhost:5678'],
    ['openaiModel', 'gpt-4o-mini'],
    ['timezone', 'Asia/Karachi'],
    ['lookaheadHours', 3, 'number'],
    ['graceHours', 6, 'number'],
    ['folderCheckHour', 17, 'number'],
    ['brandName', 'Digiternative'],
    ['niche', 'marketing and automation for business owners'],
    ['language', 'English'],
    ['brandVoice', 'sharp, practical, no hard sell'],
    ['igUserId', ''],
    ['facebookPageId', ''],
    ['linkedinAuthorUrn', ''],
    ['tiktokPrivacyLevel', 'SELF_ONLY'],
    ['publishMode', 'at_scheduled_time'],
    ['metaGraphVersion', 'v21.0'],
  ]));
  add('Read Calendar', 'n8n-nodes-base.googleCalendar', 1.3, [560, 40], {
    operation: 'getAll',
    calendar: { __rl: true, mode: 'id', value: '={{ $json.calendarId || "primary" }}' },
    returnAll: false,
    limit: 50,
    options: {
      timeMin: '={{ $now.minus({ hours: 12 }).toISO() }}',
      timeMax: '={{ $now.plus({ hours: $json.lookaheadHours || 2 }).toISO() }}',
      singleEvents: true,
    },
  }, {
    alwaysOutputData: true,
    onError: 'continueRegularOutput',
    credentials: cred('googleCalendarOAuth2Api', 'Google Calendar account', 'calendar-cred'),
  });
  sheets('Read Sheet', [560, 320], 'read', '={{ $json.spreadsheetId }}');
  code('Pack Calendar', [820, 40], 'pack-events.js', false);
  code('Pack Sheet', [820, 320], 'pack-rows.js', false);
  add('Merge Sources', 'n8n-nodes-base.merge', 3.1, [1080, 180], {
    mode: 'combine',
    combineBy: 'combineByPosition',
    options: {},
  });
  code('Build Sheet Upserts', [1320, 180], 'build-upserts.js', false, true);
  ifEquals('Need Upsert?', [1560, 180], '={{ $json._noUpsert }}', 'true');
  sheets('Save Upserts', [1800, 40], 'appendOrUpdate', sheetExpr);
  code('After Upsert', [2040, 180], 'after-upsert.js', false);
  sheets('Read Sheet Again', [2280, 180], 'read', sheetExpr);
  code('Pack Sheet Again', [2520, 180], 'pack-rows.js', false);
  code('Select Work', [2760, 180], 'select-work.js', false, true);
  switchOn('Route Work', [3000, 180], '={{ $json._action }}', ['prepare', 'publish', 'skip']);
  add('Loop Over Items', 'n8n-nodes-base.splitInBatches', 3, [3280, 40], { batchSize: 1, options: {} });
  add('Loop Scheduled Posts', 'n8n-nodes-base.splitInBatches', 3, [3280, 320], { batchSize: 1, options: {} });
  code('Mark Preparing', [3520, 40], 'mark-preparing.js', true);
  sheets('Save Preparing', [3760, 40], 'appendOrUpdate', sheetExpr);
  code('Restore Preparing', [3980, 40], 'restore-preparing.js', true);
  code('Mark Name Lookup', [4100, 40], 'mark-name-lookup.js', true);
  switchOn('Lookup Drive Name?', [4220, 40], '={{ $json._lookup }}', ['file', 'folder']);
  http('List Folder For Post', [4440, -120], {
    method: 'GET',
    url: 'https://www.googleapis.com/drive/v3/files',
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'googleDriveOAuth2Api',
    sendQuery: true,
    queryParameters: {
      parameters: [
        { name: 'q', value: "={{ \"'\" + $('Config').first().json.driveFolderId + \"' in parents and trashed = false\" }}" },
        { name: 'fields', value: 'files(id,name,mimeType,webViewLink)' },
        { name: 'pageSize', value: '100' },
        { name: 'supportsAllDrives', value: 'true' },
        { name: 'includeItemsFromAllDrives', value: 'true' },
      ],
    },
    options: {},
  }, cred('googleDriveOAuth2Api', 'Google Drive account', 'drive-cred'));
  code('Match Drive File', [4660, -120], 'match-drive-file.js', true, false);
  http('List Posts For Carousel', [4440, 200], {
    method: 'GET',
    url: 'https://www.googleapis.com/drive/v3/files',
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'googleDriveOAuth2Api',
    sendQuery: true,
    queryParameters: {
      parameters: [
        { name: 'q', value: "={{ \"'\" + $('Config').first().json.driveFolderId + \"' in parents and trashed = false\" }}" },
        { name: 'fields', value: 'files(id,name,mimeType,webViewLink)' },
        { name: 'pageSize', value: '100' },
        { name: 'supportsAllDrives', value: 'true' },
        { name: 'includeItemsFromAllDrives', value: 'true' },
      ],
    },
    options: {},
  }, cred('googleDriveOAuth2Api', 'Google Drive account', 'drive-cred'));
  code('Find Carousel Folder', [4660, 200], 'find-carousel-folder.js', true, false);
  ifNotEmpty('Carousel Folder Found?', [4880, 200], '={{ $json.drive_folder_id }}');
  http('List Carousel A', [5100, 200], {
    method: 'GET',
    url: 'https://www.googleapis.com/drive/v3/files',
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'googleDriveOAuth2Api',
    sendQuery: true,
    queryParameters: {
      parameters: [
        { name: 'q', value: "={{ \"'\" + $json.drive_folder_id + \"' in parents and trashed = false\" }}" },
        { name: 'fields', value: 'files(id,name,mimeType,webViewLink)' },
        { name: 'pageSize', value: '100' },
        { name: 'supportsAllDrives', value: 'true' },
        { name: 'includeItemsFromAllDrives', value: 'true' },
      ],
    },
    options: {},
  }, cred('googleDriveOAuth2Api', 'Google Drive account', 'drive-cred'));
  code('Pick Carousel A', [5320, 200], 'pick-carousel-level.js', true, false);
  ifEquals('Slides Ready A?', [5540, 200], '={{ $json._slidesReady }}', 'yes');
  ifNotEmpty('Deeper Carousel A?', [5540, 360], '={{ $json.drive_folder_id }}');
  http('List Carousel B', [5760, 360], {
    method: 'GET',
    url: 'https://www.googleapis.com/drive/v3/files',
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'googleDriveOAuth2Api',
    sendQuery: true,
    queryParameters: {
      parameters: [
        { name: 'q', value: "={{ \"'\" + $json.drive_folder_id + \"' in parents and trashed = false\" }}" },
        { name: 'fields', value: 'files(id,name,mimeType,webViewLink)' },
        { name: 'pageSize', value: '100' },
        { name: 'supportsAllDrives', value: 'true' },
        { name: 'includeItemsFromAllDrives', value: 'true' },
      ],
    },
    options: {},
  }, cred('googleDriveOAuth2Api', 'Google Drive account', 'drive-cred'));
  code('Pick Carousel B', [5980, 360], 'pick-carousel-level.js', true, false);
  ifEquals('Slides Ready B?', [6200, 360], '={{ $json._slidesReady }}', 'yes');
  ifNotEmpty('Deeper Carousel B?', [6200, 520], '={{ $json.drive_folder_id }}');
  http('List Carousel C', [6420, 520], {
    method: 'GET',
    url: 'https://www.googleapis.com/drive/v3/files',
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'googleDriveOAuth2Api',
    sendQuery: true,
    queryParameters: {
      parameters: [
        { name: 'q', value: "={{ \"'\" + $json.drive_folder_id + \"' in parents and trashed = false\" }}" },
        { name: 'fields', value: 'files(id,name,mimeType,webViewLink)' },
        { name: 'pageSize', value: '100' },
        { name: 'supportsAllDrives', value: 'true' },
        { name: 'includeItemsFromAllDrives', value: 'true' },
      ],
    },
    options: {},
  }, cred('googleDriveOAuth2Api', 'Google Drive account', 'drive-cred'));
  code('Pick Carousel C', [6640, 520], 'pick-carousel-level.js', true, false);
  code('Attach Carousel', [6860, 320], 'attach-carousel.js', true, true);
  ifNotEmpty('Has Drive File?', [4880, 40], '={{ $json.drive_file_id }}');
  http('Get Drive File', [4240, -80], {
    method: 'GET',
    url: "={{ 'https://www.googleapis.com/drive/v3/files/' + $json.drive_file_id }}",
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'googleDriveOAuth2Api',
    sendQuery: true,
    queryParameters: {
      parameters: [
        { name: 'fields', value: 'id,name,mimeType,webViewLink' },
        { name: 'supportsAllDrives', value: 'true' },
      ],
    },
    options: {},
  }, cred('googleDriveOAuth2Api', 'Google Drive account', 'drive-cred'));
  code('Normalize Media', [4480, 40], 'normalize-media.js', true, true);
  ifEquals('Is Google Doc?', [4720, 40], '={{ $json.source_kind }}', 'document');
  http('Export Doc Text', [4960, -80], {
    method: 'GET',
    url: "={{ 'https://www.googleapis.com/drive/v3/files/' + $json.drive_file_id + '/export' }}",
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'googleDriveOAuth2Api',
    sendQuery: true,
    queryParameters: { parameters: [{ name: 'mimeType', value: 'text/plain' }] },
    options: { response: { response: { responseFormat: 'text', outputPropertyName: 'data' } } },
  }, cred('googleDriveOAuth2Api', 'Google Drive account', 'drive-cred'));
  code('Attach Doc Text', [5200, -80], 'attach-doc-text.js', true, true);
  code('Compose AI Request', [5440, 40], 'compose-ai.js', true, true);
  http('OpenAI', [5680, 40], {
    method: 'POST',
    url: 'https://api.openai.com/v1/chat/completions',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendBody: true,
    contentType: 'json',
    specifyBody: 'json',
    jsonBody: '={{ JSON.stringify($json.openaiBody) }}',
    options: { timeout: 60000 },
  }, cred('httpHeaderAuth', 'OpenAI', 'openai-cred'));
  code('Build Approval Email', [5920, 40], 'build-email.js', true, true);
  sheets('Save Pending Approval', [6160, 40], 'appendOrUpdate', sheetExpr);
  gmail('Send Approval Email', [6400, 40]);
  code('Email Status', [6640, 40], 'email-status.js', true, true);
  code('Attach Spreadsheet Id', [3520, 320], 'attach-sheet-id.js', true);
  add('Publish At Scheduled Time', 'n8n-nodes-base.executeWorkflow', 1.2, [3760, 320], {
    source: 'database',
    workflowId: { __rl: true, mode: 'id', value: '' },
    options: {},
  });
  code('Drive Folder Check', [3280, 560], 'folder-gate.js', false, true);
  ifEquals('Run Folder Check?', [3520, 560], '={{ $json._skipFolder }}', 'true');
  http('List Drive Folder', [3760, 680], {
    method: 'GET',
    url: 'https://www.googleapis.com/drive/v3/files',
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'googleDriveOAuth2Api',
    sendQuery: true,
    queryParameters: {
      parameters: [
        { name: 'q', value: "={{ \"'\" + $json.driveFolderId + \"' in parents and trashed = false\" }}" },
        { name: 'fields', value: 'files(id,name,mimeType,webViewLink)' },
        { name: 'pageSize', value: '100' },
        { name: 'supportsAllDrives', value: 'true' },
        { name: 'includeItemsFromAllDrives', value: 'true' },
      ],
    },
    options: {},
  }, cred('googleDriveOAuth2Api', 'Google Drive account', 'drive-cred'));
  code('Build Folder Digest', [4000, 680], 'folder-digest.js', false, true);
  ifEquals('Has Untracked Files?', [4240, 680], '={{ $json._skipFolder }}', 'true');
  gmail('Send Folder Digest', [4480, 800]);

  link('Manual Trigger', 'Config');
  link('5pm and 7pm', 'Config');
  link('Config', 'Read Calendar');
  link('Config', 'Read Sheet');
  link('Read Calendar', 'Pack Calendar');
  link('Read Sheet', 'Pack Sheet');
  link('Pack Calendar', 'Merge Sources', 0, 0);
  link('Pack Sheet', 'Merge Sources', 0, 1);
  link('Merge Sources', 'Build Sheet Upserts');
  link('Build Sheet Upserts', 'Need Upsert?');
  link('Need Upsert?', 'After Upsert', 0);
  link('Need Upsert?', 'Save Upserts', 1);
  link('Save Upserts', 'After Upsert');
  link('After Upsert', 'Read Sheet Again');
  link('Read Sheet Again', 'Pack Sheet Again');
  link('Pack Sheet Again', 'Select Work');
  link('Select Work', 'Route Work');
  link('Route Work', 'Loop Over Items', 0);
  link('Route Work', 'Loop Scheduled Posts', 1);
  link('Route Work', 'Drive Folder Check', 2);
  link('Route Work', 'Drive Folder Check', 3);
  link('Loop Over Items', 'Drive Folder Check', 0);
  link('Loop Over Items', 'Mark Preparing', 1);
  link('Mark Preparing', 'Save Preparing');
  link('Save Preparing', 'Restore Preparing');
  link('Restore Preparing', 'Mark Name Lookup');
  link('Mark Name Lookup', 'Lookup Drive Name?');
  link('Lookup Drive Name?', 'List Folder For Post', 0);
  link('Lookup Drive Name?', 'List Posts For Carousel', 1);
  link('Lookup Drive Name?', 'Has Drive File?', 2);
  link('List Folder For Post', 'Match Drive File');
  link('Match Drive File', 'Has Drive File?');
  link('List Posts For Carousel', 'Find Carousel Folder');
  link('Find Carousel Folder', 'Carousel Folder Found?');
  link('Carousel Folder Found?', 'List Carousel A', 0);
  link('Carousel Folder Found?', 'Attach Carousel', 1);
  link('List Carousel A', 'Pick Carousel A');
  link('Pick Carousel A', 'Slides Ready A?');
  link('Slides Ready A?', 'Attach Carousel', 0);
  link('Slides Ready A?', 'Deeper Carousel A?', 1);
  link('Deeper Carousel A?', 'List Carousel B', 0);
  link('Deeper Carousel A?', 'Attach Carousel', 1);
  link('List Carousel B', 'Pick Carousel B');
  link('Pick Carousel B', 'Slides Ready B?');
  link('Slides Ready B?', 'Attach Carousel', 0);
  link('Slides Ready B?', 'Deeper Carousel B?', 1);
  link('Deeper Carousel B?', 'List Carousel C', 0);
  link('Deeper Carousel B?', 'Attach Carousel', 1);
  link('List Carousel C', 'Pick Carousel C');
  link('Pick Carousel C', 'Attach Carousel');
  link('Attach Carousel', 'Normalize Media');
  link('Has Drive File?', 'Get Drive File', 0);
  link('Has Drive File?', 'Normalize Media', 1);
  link('Get Drive File', 'Normalize Media');
  link('Normalize Media', 'Is Google Doc?');
  link('Is Google Doc?', 'Export Doc Text', 0);
  link('Is Google Doc?', 'Compose AI Request', 1);
  link('Export Doc Text', 'Attach Doc Text');
  link('Attach Doc Text', 'Compose AI Request');
  ifEquals('Use Calendar Copy?', [5560, 40], '={{ $json.source_locked }}', 'yes');
  link('Compose AI Request', 'Use Calendar Copy?');
  link('Use Calendar Copy?', 'Build Approval Email', 0);
  link('Use Calendar Copy?', 'OpenAI', 1);
  link('OpenAI', 'Build Approval Email');
  link('Build Approval Email', 'Send Approval Email');
  link('Send Approval Email', 'Email Status');
  link('Email Status', 'Save Pending Approval');
  link('Save Pending Approval', 'Loop Over Items');
  link('Loop Scheduled Posts', 'Drive Folder Check', 0);
  link('Loop Scheduled Posts', 'Attach Spreadsheet Id', 1);
  link('Attach Spreadsheet Id', 'Publish At Scheduled Time');
  link('Publish At Scheduled Time', 'Loop Scheduled Posts');
  link('Drive Folder Check', 'Run Folder Check?');
  link('Run Folder Check?', 'List Drive Folder', 1);
  link('List Drive Folder', 'Build Folder Digest');
  link('Build Folder Digest', 'Has Untracked Files?');
  link('Has Untracked Files?', 'Send Folder Digest', 1);
  return finish(flow, '01 Prepare posts and ask approval');
}

function graph(versionExpr, pathExpr) {
  return "={{ 'https://graph.facebook.com/' + (" + versionExpr + " || 'v21.0') + '/' + " + pathExpr + " }}";
}

function buildPublish() {
  const flow = workflowBuilder();
  const { add, link, cred, code, sheets, ifEquals, switchOn, http, gmail, respond, sticky } = flow;
  const sheetExpr = "={{ $json.spreadsheetId || $('Config').first().json.spreadsheetId }}";
  const meta = cred('httpQueryAuth', 'Meta Graph', 'meta-cred');
  sticky('Read me', [-40, -240], '## Approve ya decline\nEmail ka link yahan review page kholta hai.\nApprove ya Decline ka button POST karta hai.\nEmail scanner link khol kar post publish nahi kar sakta.\n\nConfig mein sirf wahi spreadsheet id rakhein jo workflow 01 mein hai.');
  add('Review Webhook', 'n8n-nodes-base.webhook', 2, [0, 80], {
    httpMethod: 'GET',
    path: 'post-review',
    responseMode: 'responseNode',
    options: {},
  }, { webhookId: 'post-review' });
  add('Decision Webhook', 'n8n-nodes-base.webhook', 2, [0, 280], {
    httpMethod: 'POST',
    path: 'post-decision',
    responseMode: 'responseNode',
    options: {},
  }, { webhookId: 'post-decision' });
  add('When Called For Scheduled Publish', 'n8n-nodes-base.executeWorkflowTrigger', 1.1, [0, 480], {});
  add('Config', 'n8n-nodes-base.set', 3.4, [280, 180], configAssignments([
    ['spreadsheetId', 'YOUR_SPREADSHEET_ID'],
  ]));
  code('Branch', [520, 180], 'branch-entry.js', false);
  ifEquals('Is Review?', [760, 180], '={{ $json._entry }}', 'review');
  sheets('Read Sheet For Review', [1000, 40], 'read', sheetExpr);
  code('Render Review Page', [1240, 40], 'render-review.js', false, true);
  respond('Respond Review', [1480, 40]);
  sheets('Read Sheet For Decision', [1000, 280], 'read', sheetExpr);
  code('Decide Action', [1240, 280], 'decide-action.js', false, true);
  switchOn('Route Decision', [1480, 280], '={{ $json.route }}', ['invalid', 'already', 'decline', 'hold', 'blocked', 'approve']);
  respond('Respond Page', [3600, 80]);
  sheets('Save Decision', [1760, 360], 'appendOrUpdate', sheetExpr);
  code('Restore Decision', [2000, 360], 'restore-decision.js', true);
  gmail('Send Result Email', [3200, 360]);
  ifEquals('Skip Browser Response?', [3400, 360], '={{ $json._fromSchedule }}', 'true');
  code('Prepare Scheduled', [280, 480], 'prepare-scheduled.js', true);
  ifEquals('Scheduled Can Publish?', [520, 480], '={{ $json.route }}', 'approve');
  code('Publish Row', [1760, 560], 'publish-row.js', true);
  sheets('Mark Publishing', [2000, 560], 'appendOrUpdate', sheetExpr);
  code('Restore Publish Row', [2240, 560], 'restore-publish-row.js', true);
  switchOn('Platform', [2480, 560], '={{ $json.platform }}', ['instagram', 'facebook', 'linkedin', 'x', 'youtube', 'tiktok']);

  code('IG Prepare', [2720, 200], 'ig-prepare.js', true);
  ifEquals('IG Ready?', [2960, 200], '={{ $json.ready }}', 'no');
  ifEquals('IG Carousel?', [3200, 80], '={{ $json.media_kind }}', 'carousel');
  code('IG Expand Slides', [3440, -80], 'expand-slides.js', false, false);
  http('IG Create Slide', [3680, -80], {
    method: 'POST',
    url: graph('$json.meta_graph_version', '$json.ig_user_id + "/media"'),
    authentication: 'genericCredentialType',
    genericAuthType: 'httpQueryAuth',
    sendBody: true,
    contentType: 'form-urlencoded',
    bodyParameters: { parameters: [
      { name: 'image_url', value: '={{ $json.slide_url }}' },
      { name: 'is_carousel_item', value: 'true' },
    ] },
    options: {},
  }, meta);
  add('Wait For IG Slides', 'n8n-nodes-base.wait', 1.1, [3920, -80], { resume: 'timeInterval', amount: 10, unit: 'seconds' });
  code('IG Collect Slides', [4160, -80], 'ig-collect-slides.js', false, false);
  ifEquals('IG Slides Ready?', [4400, -80], '={{ $json.ready }}', 'yes');
  http('IG Create Carousel', [4640, -160], {
    method: 'POST',
    url: graph('$json.meta_graph_version', '$json.ig_user_id + "/media"'),
    authentication: 'genericCredentialType',
    genericAuthType: 'httpQueryAuth',
    sendBody: true,
    contentType: 'form-urlencoded',
    bodyParameters: { parameters: [
      { name: 'media_type', value: 'CAROUSEL' },
      { name: 'children', value: '={{ $json.creationChildren }}' },
      { name: 'caption', value: '={{ $json.full_post_preview }}' },
    ] },
    options: {},
  }, meta);
  ifEquals('IG Video?', [3200, 80], '={{ $json.media_kind }}', 'video');
  http('IG Create Image', [3440, 0], {
    method: 'POST',
    url: graph('$json.meta_graph_version', '$json.ig_user_id + "/media"'),
    authentication: 'genericCredentialType',
    genericAuthType: 'httpQueryAuth',
    sendBody: true,
    contentType: 'form-urlencoded',
    bodyParameters: { parameters: [
      { name: 'caption', value: '={{ $json.full_post_preview }}' },
      { name: 'image_url', value: '={{ $json.media_public_url }}' },
    ] },
    options: {},
  }, meta);
  http('IG Create Video', [3440, 160], {
    method: 'POST',
    url: graph('$json.meta_graph_version', '$json.ig_user_id + "/media"'),
    authentication: 'genericCredentialType',
    genericAuthType: 'httpQueryAuth',
    sendBody: true,
    contentType: 'form-urlencoded',
    bodyParameters: { parameters: [
      { name: 'caption', value: '={{ $json.full_post_preview }}' },
      { name: 'media_type', value: 'REELS' },
      { name: 'video_url', value: '={{ $json.media_public_url }}' },
    ] },
    options: {},
  }, meta);
  code('IG After Create', [3680, 80], 'ig-after-create.js', true, true);
  ifEquals('IG Container Ready?', [3920, 80], '={{ $json.ready }}', 'yes');
  http('IG Publish', [4160, 0], {
    method: 'POST',
    url: graph("$('IG Prepare').item.json.meta_graph_version", "$('IG Prepare').item.json.ig_user_id + '/media_publish'"),
    authentication: 'genericCredentialType',
    genericAuthType: 'httpQueryAuth',
    sendBody: true,
    contentType: 'form-urlencoded',
    bodyParameters: { parameters: [{ name: 'creation_id', value: '={{ $json.creationId }}' }] },
    options: {},
  }, meta);
  http('IG Permalink', [4400, 0], {
    method: 'GET',
    url: graph("$('IG Prepare').item.json.meta_graph_version", '$json.id'),
    authentication: 'genericCredentialType',
    genericAuthType: 'httpQueryAuth',
    sendQuery: true,
    queryParameters: { parameters: [{ name: 'fields', value: 'permalink' }] },
    options: {},
  }, meta);
  code('IG Result', [4640, 0], 'ig-result.js', true);

  code('FB Prepare', [2720, 400], 'fb-prepare.js', true);
  ifEquals('FB Ready?', [2960, 400], '={{ $json.ready }}', 'no');
  switchOn('FB Kind', [3200, 320], '={{ $json.media_kind }}', ['image', 'video', 'carousel']);
  code('FB Expand Slides', [3440, 520], 'expand-slides.js', false, false);
  http('FB Upload Slide', [3680, 520], {
    method: 'POST',
    url: graph('$json.meta_graph_version', '$json.facebook_page_id + "/photos"'),
    authentication: 'genericCredentialType',
    genericAuthType: 'httpQueryAuth',
    sendBody: true,
    contentType: 'form-urlencoded',
    bodyParameters: { parameters: [
      { name: 'url', value: '={{ $json.slide_url }}' },
      { name: 'published', value: 'false' },
    ] },
    options: {},
  }, meta);
  code('FB Collect Photos', [3920, 520], 'fb-collect-photos.js', false, false);
  ifEquals('FB Photos Ready?', [4160, 520], '={{ $json.ready }}', 'yes');
  http('FB Post Carousel', [4400, 440], {
    method: 'POST',
    url: graph('$json.meta_graph_version', '$json.facebook_page_id + "/feed"'),
    authentication: 'genericCredentialType',
    genericAuthType: 'httpQueryAuth',
    sendBody: true,
    contentType: 'json',
    specifyBody: 'json',
    jsonBody: '={{ JSON.stringify({ message: $json.full_post_preview, attached_media: ($json.facebookPhotoIds || []).map((id) => ({ media_fbid: id })) }) }}',
    options: {},
  }, meta);
  http('FB Photo', [3440, 240], {
    method: 'POST',
    url: graph('$json.meta_graph_version', '$json.facebook_page_id + "/photos"'),
    authentication: 'genericCredentialType',
    genericAuthType: 'httpQueryAuth',
    sendBody: true,
    contentType: 'form-urlencoded',
    bodyParameters: { parameters: [
      { name: 'caption', value: '={{ $json.full_post_preview }}' },
      { name: 'url', value: '={{ $json.media_public_url }}' },
    ] },
    options: {},
  }, meta);
  http('FB Video', [3440, 360], {
    method: 'POST',
    url: graph('$json.meta_graph_version', '$json.facebook_page_id + "/videos"'),
    authentication: 'genericCredentialType',
    genericAuthType: 'httpQueryAuth',
    sendBody: true,
    contentType: 'form-urlencoded',
    bodyParameters: { parameters: [
      { name: 'description', value: '={{ $json.full_post_preview }}' },
      { name: 'file_url', value: '={{ $json.media_public_url }}' },
    ] },
    options: {},
  }, meta);
  http('FB Text', [3440, 480], {
    method: 'POST',
    url: graph('$json.meta_graph_version', '$json.facebook_page_id + "/feed"'),
    authentication: 'genericCredentialType',
    genericAuthType: 'httpQueryAuth',
    sendBody: true,
    contentType: 'form-urlencoded',
    bodyParameters: { parameters: [{ name: 'message', value: '={{ $json.full_post_preview }}' }] },
    options: {},
  }, meta);
  code('FB Result', [3680, 360], 'fb-result.js', true);

  code('LinkedIn Prepare', [2720, 640], 'linkedin-prepare.js', true);
  ifEquals('LinkedIn Ready?', [2960, 640], '={{ $json.ready }}', 'no');
  http('LinkedIn Post', [3200, 560], {
    method: 'POST',
    url: 'https://api.linkedin.com/rest/posts',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendHeaders: true,
    headerParameters: { parameters: [
      { name: 'LinkedIn-Version', value: '202502' },
      { name: 'X-Restli-Protocol-Version', value: '2.0.0' },
    ] },
    sendBody: true,
    contentType: 'json',
    specifyBody: 'json',
    jsonBody: '={{ JSON.stringify($json.linkedinBody) }}',
    options: { response: { response: { fullResponse: true, responseFormat: 'json' } } },
  }, cred('httpHeaderAuth', 'LinkedIn', 'linkedin-cred'));
  code('LinkedIn Result', [3440, 560], 'linkedin-result.js', true);

  code('X Prepare', [2720, 840], 'x-prepare.js', true);
  ifEquals('X Ready?', [2960, 840], '={{ $json.ready }}', 'no');
  http('X Post', [3200, 760], {
    method: 'POST',
    url: 'https://api.twitter.com/2/tweets',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendBody: true,
    contentType: 'json',
    specifyBody: 'json',
    jsonBody: '={{ JSON.stringify({ text: $json.full_post_preview }) }}',
    options: {},
  }, cred('httpHeaderAuth', 'X', 'x-cred'));
  code('X Result', [3440, 760], 'x-result.js', true);

  code('YouTube Prepare', [2720, 1040], 'youtube-prepare.js', true);
  ifEquals('YouTube Ready?', [2960, 1040], '={{ $json.ready }}', 'no');
  add('Download YouTube File', 'n8n-nodes-base.googleDrive', 3, [3200, 960], {
    operation: 'download',
    fileId: { __rl: true, mode: 'id', value: '={{ $json.drive_file_id }}' },
    options: {},
  }, {
    onError: 'continueRegularOutput',
    credentials: cred('googleDriveOAuth2Api', 'Google Drive account', 'drive-cred'),
  });
  add('Upload YouTube', 'n8n-nodes-base.youTube', 1, [3440, 960], {
    resource: 'video',
    operation: 'upload',
    title: "={{ $('YouTube Prepare').item.json.prepared_title || $('YouTube Prepare').item.json.topic }}",
    categoryId: '22',
    options: {
      description: "={{ $('YouTube Prepare').item.json.prepared_caption }}",
      privacyStatus: 'public',
      tags: "={{ $('YouTube Prepare').item.json.prepared_hashtags }}",
    },
  }, {
    onError: 'continueRegularOutput',
    credentials: cred('youTubeOAuth2Api', 'YouTube account', 'youtube-cred'),
  });
  code('YouTube Result', [3680, 960], 'youtube-result.js', true);

  code('TikTok Prepare', [2720, 1240], 'tiktok-prepare.js', true, true);
  ifEquals('TikTok Ready?', [2960, 1240], '={{ $json.ready }}', 'no');
  http('TikTok Post', [3200, 1160], {
    method: 'POST',
    url: 'https://open.tiktokapis.com/v2/post/publish/video/init/',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendBody: true,
    contentType: 'json',
    specifyBody: 'json',
    jsonBody: '={{ JSON.stringify($json.tiktokBody) }}',
    options: {},
  }, cred('httpHeaderAuth', 'TikTok', 'tiktok-cred'));
  code('TikTok Result', [3440, 1160], 'tiktok-result.js', true);
  code('Unsupported Result', [2720, 1440], 'unsupported-result.js', true);
  code('Collect Result', [4880, 560], 'collect-result.js', true, true);
  sheets('Save Publish Result', [5120, 560], 'appendOrUpdate', sheetExpr);
  code('Restore Publish Email', [5360, 560], 'restore-publish-email.js', true);

  link('Review Webhook', 'Config');
  link('Decision Webhook', 'Config');
  link('Config', 'Branch');
  link('Branch', 'Is Review?');
  link('Is Review?', 'Read Sheet For Review', 0);
  link('Is Review?', 'Read Sheet For Decision', 1);
  link('Read Sheet For Review', 'Render Review Page');
  link('Render Review Page', 'Respond Review');
  link('Read Sheet For Decision', 'Decide Action');
  link('Decide Action', 'Route Decision');
  link('Route Decision', 'Respond Page', 0);
  link('Route Decision', 'Respond Page', 1);
  link('Route Decision', 'Save Decision', 2);
  link('Route Decision', 'Save Decision', 3);
  link('Route Decision', 'Send Result Email', 4);
  link('Route Decision', 'Publish Row', 5);
  link('Route Decision', 'Respond Page', 6);
  link('Save Decision', 'Restore Decision');
  link('Restore Decision', 'Send Result Email');
  link('Send Result Email', 'Skip Browser Response?');
  link('Skip Browser Response?', 'Respond Page', 1);
  link('When Called For Scheduled Publish', 'Prepare Scheduled');
  link('Prepare Scheduled', 'Scheduled Can Publish?');
  link('Scheduled Can Publish?', 'Publish Row', 0);
  link('Scheduled Can Publish?', 'Collect Result', 1);
  link('Publish Row', 'Mark Publishing');
  link('Mark Publishing', 'Restore Publish Row');
  link('Restore Publish Row', 'Platform');
  link('Platform', 'IG Prepare', 0);
  link('Platform', 'FB Prepare', 1);
  link('Platform', 'LinkedIn Prepare', 2);
  link('Platform', 'X Prepare', 3);
  link('Platform', 'YouTube Prepare', 4);
  link('Platform', 'TikTok Prepare', 5);
  link('Platform', 'Unsupported Result', 6);
  link('IG Prepare', 'IG Ready?');
  link('IG Ready?', 'Collect Result', 0);
  link('IG Ready?', 'IG Carousel?', 1);
  link('IG Carousel?', 'IG Expand Slides', 0);
  link('IG Carousel?', 'IG Video?', 1);
  link('IG Expand Slides', 'IG Create Slide');
  link('IG Create Slide', 'Wait For IG Slides');
  link('Wait For IG Slides', 'IG Collect Slides');
  link('IG Collect Slides', 'IG Slides Ready?');
  link('IG Slides Ready?', 'IG Create Carousel', 0);
  link('IG Slides Ready?', 'Collect Result', 1);
  link('IG Create Carousel', 'IG After Create');
  link('IG Video?', 'IG Create Video', 0);
  link('IG Video?', 'IG Create Image', 1);
  link('IG Create Image', 'IG After Create');
  link('IG Create Video', 'IG After Create');
  link('IG After Create', 'IG Container Ready?');
  link('IG Container Ready?', 'IG Publish', 0);
  link('IG Container Ready?', 'Collect Result', 1);
  link('IG Publish', 'IG Permalink');
  link('IG Permalink', 'IG Result');
  link('IG Result', 'Collect Result');
  link('FB Prepare', 'FB Ready?');
  link('FB Ready?', 'Collect Result', 0);
  link('FB Ready?', 'FB Kind', 1);
  link('FB Kind', 'FB Photo', 0);
  link('FB Kind', 'FB Video', 1);
  link('FB Kind', 'FB Expand Slides', 2);
  link('FB Kind', 'FB Text', 3);
  link('FB Expand Slides', 'FB Upload Slide');
  link('FB Upload Slide', 'FB Collect Photos');
  link('FB Collect Photos', 'FB Photos Ready?');
  link('FB Photos Ready?', 'FB Post Carousel', 0);
  link('FB Photos Ready?', 'Collect Result', 1);
  link('FB Post Carousel', 'FB Result');
  link('FB Photo', 'FB Result');
  link('FB Video', 'FB Result');
  link('FB Text', 'FB Result');
  link('FB Result', 'Collect Result');
  link('LinkedIn Prepare', 'LinkedIn Ready?');
  link('LinkedIn Ready?', 'Collect Result', 0);
  link('LinkedIn Ready?', 'LinkedIn Post', 1);
  link('LinkedIn Post', 'LinkedIn Result');
  link('LinkedIn Result', 'Collect Result');
  link('X Prepare', 'X Ready?');
  link('X Ready?', 'Collect Result', 0);
  link('X Ready?', 'X Post', 1);
  link('X Post', 'X Result');
  link('X Result', 'Collect Result');
  link('YouTube Prepare', 'YouTube Ready?');
  link('YouTube Ready?', 'Collect Result', 0);
  link('YouTube Ready?', 'Download YouTube File', 1);
  link('Download YouTube File', 'Upload YouTube');
  link('Upload YouTube', 'YouTube Result');
  link('YouTube Result', 'Collect Result');
  link('TikTok Prepare', 'TikTok Ready?');
  link('TikTok Ready?', 'Collect Result', 0);
  link('TikTok Ready?', 'TikTok Post', 1);
  link('TikTok Post', 'TikTok Result');
  link('TikTok Result', 'Collect Result');
  link('Unsupported Result', 'Collect Result');
  link('Collect Result', 'Save Publish Result');
  link('Save Publish Result', 'Restore Publish Email');
  link('Restore Publish Email', 'Send Result Email');
  return finish(flow, '02 Review and publish');
}

function finish(flow, name) {
  const names = new Set(flow.nodes.map((node) => node.name));
  Object.entries(flow.connections).forEach(([from, value]) => {
    if (!names.has(from)) throw new Error('Missing source ' + from);
    value.main.forEach((outputs) => {
      (outputs || []).forEach((linkTo) => {
        if (!names.has(linkTo.node)) throw new Error(from + ' points at missing ' + linkTo.node);
      });
    });
  });
  return {
    name,
    nodes: flow.nodes,
    connections: flow.connections,
    pinData: {},
    settings: { executionOrder: 'v1', timezone: 'Asia/Karachi' },
  };
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

function scheduledAt(index) {
  const date = new Date(Date.UTC(2026, 9, 9) + index * 86400000);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return date.getUTCFullYear() + '-' + month + '-' + day + ' 19:00';
}

function writeCsv() {
  const posts = require('./calendar-posts');
  const rows = [COLUMNS];
  posts.forEach((post, index) => {
    ['instagram', 'facebook'].forEach((platform) => {
      const tags = post.tags.join(' ');
      const body = post.caption.trim() + '\n\n' + post.cta.trim();
      const slideUrls = (post.slides || []).map((id) => 'https://drive.google.com/uc?export=download&id=' + id);
      const data = {
        post_id: 'dt-' + String(post.day).padStart(2, '0') + '-' + platform,
        source: 'sheet',
        scheduled_at: scheduledAt(index),
        platform,
        topic: post.topic,
        drive_file_name: post.carousel ? '' : post.file,
        drive_folder_name: post.folder || '',
        source_locked: 'yes',
        raw_caption: post.caption.trim(),
        niche: 'marketing and automation for business owners',
        language: 'English',
        brand_voice: 'sharp, practical, no hard sell',
        status: 'Scheduled',
        prepared_caption: body,
        prepared_hashtags: tags,
        full_post_preview: body + '\n\n' + tags,
        media_public_url: slideUrls[0] || '',
        media_urls: slideUrls.join('\n'),
        media_kind: post.carousel ? 'carousel' : 'image',
        publish_mode: 'at_scheduled_time',
        can_publish: 'yes',
      };
      rows.push(COLUMNS.map((column) => data[column] || ''));
    });
  });
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
  fs.writeFileSync(path.join(root, 'templates', 'posting-calendar.csv'), csv);
}

const outDir = path.join(root, 'workflows');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.join(root, 'templates'), { recursive: true });
const prepare = buildPrepare();
const publish = buildPublish();
fs.writeFileSync(path.join(outDir, '01-prepare-and-ask-approval.json'), JSON.stringify(prepare, null, 2));
fs.writeFileSync(path.join(outDir, '02-review-and-publish.json'), JSON.stringify(publish, null, 2));
writeCsv();
console.log('prepare nodes', prepare.nodes.length);
console.log('publish nodes', publish.nodes.length);
