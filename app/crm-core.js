/* AJR CRM core — the ONE shared engine for all app pages.
 * Supabase client + auth guard + data layer + activity-log undo + AI interpret.
 * Loaded as an ES module; pages import { core } and call its adapters.
 * All writes log prev/next into `activity`, so every write is undoable. */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://cukjynfatkyiuzvstgcp.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1a2p5bmZhdGt5aXV6dnN0Z2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0Mzg3MjAsImV4cCI6MjA5OTAxNDcyMH0.l8-zXB6AgAKutZJTh30t6Tl2c3-f-H8kG6D9iF9eQtM';

export const supa = createClient(SUPABASE_URL, SUPABASE_ANON);

/* canonical vocab (was Apps Script Config.gs) */
export const STAGES = ['Engaged 1', 'Engaged 2', 'Engaged 3', 'Booked', 'No Close', 'Archive', 'No Reply', 'Closed'];
export const STATUSES = ['Follow up Sent', "Haven't read", 'End of convo', 'Mid convo',
  'Lifestyle sent', 'Left on read', 'Story reply', 'Call Pitched', 'Meme sent', 'LM Sent'];
export const TEMPS = ['Warm Lead', 'Cold Lead', 'Hot Lead'];

/* ---------- demo mode (self-contained; no backend, for design/preview) ----------
   Add ?demo=1 to any page. It sticks for the session (so cross-page links stay
   in demo) and every read/write runs against in-memory fake data. Nothing
   touches Supabase. Sign in with any email — use reinis@agencyjr.com to land on
   the closer, anything else for the setter. */
const DEMO = (() => {
  try {
    const on = new URLSearchParams(location.search).get('demo') === '1';
    if (on) sessionStorage.setItem('ajr_demo', '1');
    return on || sessionStorage.getItem('ajr_demo') === '1';
  } catch (e) { return false; }
})();
export const isDemo = DEMO;

const _clone = (x) => JSON.parse(JSON.stringify(x));
function _ago(n) { const d = new Date(); d.setDate(d.getDate() - n); return isoToDmyLocal(d); }
function isoToDmyLocal(d) {
  const p = new Intl.DateTimeFormat('en-GB').formatToParts(d);
  const g = (t) => p.find((x) => x.type === t).value;
  return `${g('day')}/${g('month')}/${g('year')}`;
}
const _demo = {
  leads: [
    { id: 1, h: 'jung.labs', url: 'https://instagram.com/jung.labs', level: 'Engaged 3', status: 'Follow up Sent', temp: 'Hot Lead', qual: 'Qualified 3', notes: 'potential referral for his students', lastContact: _ago(20), dateAdded: _ago(90), email: 'jung@labs.io', phone: '', linkedin: '', pains: 'no time to run ads' },
    { id: 2, h: 'charlay', url: 'https://instagram.com/charlay', level: 'Engaged 3', status: 'Follow up Sent', temp: 'Hot Lead', qual: 'Qualified 3', notes: 'audit accepted, need to book meeting', lastContact: _ago(63) },
    { id: 3, h: 'akram_meza', url: 'https://instagram.com/akram_meza', level: 'Engaged 3', status: 'Follow up Sent', temp: 'Hot Lead', qual: 'Qualified 1', notes: 'showed interest from story', lastContact: _ago(63) },
    { id: 4, h: 'oscarwxng', url: 'https://instagram.com/oscarwxng', level: 'Engaged 2', status: 'Story reply', temp: 'Warm Lead', qual: 'Qualified 2', notes: '', lastContact: _ago(4) },
    { id: 5, h: 'kayla.growth', url: 'https://instagram.com/kayla.growth', level: 'Engaged 2', status: 'Meme sent', temp: 'Warm Lead', qual: '', notes: '', lastContact: _ago(6) },
    { id: 6, h: 'sofia_scales', url: 'https://instagram.com/sofia_scales', level: 'Engaged 1', status: "Haven't read", temp: 'Warm Lead', qual: '', notes: '', lastContact: _ago(10) },
    { id: 7, h: 'nina.creates', url: 'https://instagram.com/nina.creates', level: 'Engaged 1', status: 'Lifestyle sent', temp: 'Warm Lead', qual: '', notes: '', lastContact: _ago(8) },
    { id: 8, h: 'mariusvmil', url: 'https://instagram.com/mariusvmil', level: 'Engaged 1', status: 'Left on read', temp: 'Cold Lead', qual: '', notes: '', lastContact: _ago(120) },
    { id: 9, h: 'therealashwinn', url: 'https://instagram.com/therealashwinn', level: 'Engaged 1', status: 'End of convo', temp: 'Cold Lead', qual: '', notes: '', lastContact: _ago(140) },
    { id: 10, h: 'thedtcguy', url: 'https://instagram.com/thedtcguy', level: 'No Reply', status: 'Follow up Sent', temp: 'Cold Lead', qual: '', notes: '', lastContact: _ago(43) },
    { id: 11, h: 'ecom.aiden', url: 'https://instagram.com/ecom.aiden', level: 'Engaged 3', status: 'Mid convo', temp: 'Hot Lead', qual: 'Qualified 2', notes: 'wants pricing', lastContact: _ago(2) },
    { id: 12, h: 'bram.vandijk', url: 'https://instagram.com/bram.vandijk', level: 'Archive', status: 'Left on read', temp: 'Cold Lead', qual: 'Unqualified', notes: '', lastContact: _ago(90) },
    { id: 13, h: 'lena.builds', url: 'https://instagram.com/lena.builds', level: 'Booked', status: 'Call Pitched', temp: 'Hot Lead', qual: 'Qualified 3', notes: 'call booked friday', lastContact: _ago(1) },
    { id: 14, h: 'devon.scales', url: 'https://instagram.com/devon.scales', level: 'No Close', status: 'Call done', temp: 'Warm Lead', qual: 'Qualified 2', notes: '[no close 20/05] — price too high', lastContact: _ago(40) },
    { id: 15, h: 'priya.dtc', url: 'https://instagram.com/priya.dtc', level: 'No Close', status: 'Call done', temp: 'Warm Lead', qual: 'Qualified 1', notes: '[no close 05/07] — bad timing, revisit Q4', lastContact: _ago(4) }
  ],
  deals: [
    { row: 101, id: 101, leadId: null, name: 'Oscar Wong', link: 'https://instagram.com/oscarwxng', status: 'Discovery Call', meeting: _ago(0), followup: '', qual: 'Qualified 2', cash: '', notes: 'supplement brand ~40k/mo', hasFF: true, fireflies_link: 'https://app.fireflies.ai/view/demo' },
    { row: 102, id: 102, leadId: null, name: 'Awais', link: 'https://instagram.com/awais.designs', status: 'Closing call', meeting: _ago(0), followup: '', qual: '', cash: '', notes: '', hasFF: false, fireflies_link: '' },
    { row: 103, id: 103, leadId: null, name: 'Lena Ruiz', link: 'https://instagram.com/lena.builds', status: 'Followup', meeting: '', followup: _ago(6), qual: 'Qualified 3', cash: '', notes: 'sent proposal', hasFF: false, fireflies_link: '' },
    { row: 104, id: 104, leadId: null, name: 'Marcus Media', link: 'https://instagram.com/marcus_media', status: 'Closed', meeting: _ago(20), followup: '', qual: 'Qualified 3', cash: 4000, notes: 'paid in full', hasFF: true, fireflies_link: 'https://app.fireflies.ai/view/demo2' },
    { row: 105, id: 105, leadId: null, name: 'Viktor A.', link: 'https://instagram.com/viktorandersson1u', status: 'Discovery Call', meeting: _ago(-2), followup: '', qual: '', cash: '', notes: 'need to book', hasFF: false, fireflies_link: '' },
    { row: 106, id: 106, leadId: null, name: 'Greg Leet', link: 'https://instagram.com/gregleet', status: 'No Close', meeting: _ago(30), followup: '', qual: 'Qualified 1', cash: '', notes: 'went cold', hasFF: false, fireflies_link: '' }
  ]
};
function _demoUndoToken(coll, key, id, prev) { return { _demo: true, coll, key, id, prev }; }
function _demoApplyUndo(u) {
  const rec = _demo[u.coll].find((r) => r[u.key] === u.id);
  if (rec) Object.keys(u.prev).forEach((k) => { rec[k] = u.prev[k]; });
}
function _demoInterpret(text, mode) {
  const t = (text || '').toLowerCase();
  const intent = { route: 'unknown', handle: '', stage: '', status: '', temp: '', target: '',
    deal_status: '', meeting: '', followup: '', cash: '', notes: '', confidence: 'high' };
  const name = (t.match(/\b(oscar\w*|awais|lena\w*|marcus|viktor\w*|greg\w*|marco|kayla\w*|nina\w*|sofia\w*|akram\w*|jung\w*|charlay|aiden)\b/) || [])[0] || '';
  const money = t.match(/(\d+(?:\.\d+)?)\s*(k|grand|thousand)/);
  const cash = money ? String(Math.round(parseFloat(money[1]) * 1000)) : (t.match(/\$?\s*(\d{3,6})/) && /paid|collect|clos|for/.test(t) ? t.match(/\$?\s*(\d{3,6})/)[1] : '');
  const fu = (t.match(/follow.?up (?:call )?((?:next |on )?\w+day|tomorrow|in \w+ (?:days?|weeks?))/) || [])[1];
  const notes = (t.match(/(?:wants?|needs?|note[sd]?:?)\s+(.+)$/) || [])[1];
  if (mode === 'closer' || /clos|paid|no.?show|discovery|call/.test(t)) {
    intent.route = 'closer'; intent.target = name;
    intent.deal_status = /no.?show|no.?close|didn.?t clos/.test(t) ? 'No Close' : /clos/.test(t) ? 'Closed' : /discovery/.test(t) ? 'Discovery Call' : /follow.?up/.test(t) ? 'Followup' : '';
    intent.cash = cash; if (fu) intent.followup = fu.replace(/^on /, ''); if (notes) intent.notes = notes.replace(/[.,]+$/, '');
  } else {
    intent.route = 'setter'; intent.handle = name;
    intent.stage = /engaged? (?:one|1)/.test(t) ? 'Engaged 1' : /engaged? (?:two|2)/.test(t) ? 'Engaged 2' : /engaged? (?:three|3)/.test(t) ? 'Engaged 3' : /book/.test(t) ? 'Booked' : /archiv/.test(t) ? 'Archive' : '';
    intent.status = /story repl/.test(t) ? 'Story reply' : /follow.?up/.test(t) ? 'Follow up Sent' : /left on read/.test(t) ? 'Left on read' : '';
    intent.temp = /hot/.test(t) ? 'Hot Lead' : /warm/.test(t) ? 'Warm Lead' : /cold/.test(t) ? 'Cold Lead' : '';
    if (notes) intent.notes = notes.replace(/[.,]+$/, '');
    if (!intent.handle) intent.route = 'unknown';
  }
  return { ok: true, intent, model: 'demo' };
}

/* ---------- auth ---------- */

// Gate a page: returns the session, or bounces to the login page.
export async function requireAuth() {
  if (DEMO) return { user: { email: 'demo@ajr.crm' } };
  const { data: { session } } = await supa.auth.getSession();
  if (!session) {
    const back = location.pathname.split('/').pop() + location.search;
    location.replace('index.html?to=' + encodeURIComponent(back));
    return null;
  }
  return session;
}

export async function signIn(email, password) {
  if (DEMO) return { user: { email: email || 'demo@ajr.crm' } };
  const { data, error } = await supa.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.session;
}

export async function signOut() {
  if (DEMO) { location.replace('index.html'); return; }
  await supa.auth.signOut();
  location.replace('index.html');
}

export async function userEmail() {
  if (DEMO) return 'demo@ajr.crm';
  const { data: { session } } = await supa.auth.getSession();
  return session?.user?.email || '';
}

/* ---------- date helpers (UI shows dd/MM/yyyy; DB stores ISO) ---------- */

export function isoToDmy(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}
export function dmyToIso(dmy) {
  if (!dmy) return null;
  const m = String(dmy).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}
export function todayDmy() {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Riga' }).formatToParts(new Date());
  const g = (t) => p.find((x) => x.type === t).value;
  return `${g('day')}/${g('month')}/${g('year')}`;
}

/* ---------- data: reads (shapes match what the panels already expect) ---------- */

export async function loadLeads() {
  if (DEMO) return _demo.leads.map(_clone);
  const out = [];
  for (let off = 0; ; off += 1000) {
    const { data, error } = await supa.from('leads')
      .select('id,handle,ig_url,level,last_status,temp,qualification,notes,last_contact,date_added,pain_points,email,phone,linkedin')
      .order('id').range(off, off + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out.map((l) => ({
    id: l.id, h: l.handle, url: l.ig_url || '',
    level: l.level || '', status: l.last_status || '', temp: l.temp || '',
    qual: l.qualification || '', notes: l.notes || '',
    lastContact: isoToDmy(l.last_contact), dateAdded: isoToDmy(l.date_added),
    pains: l.pain_points || '', email: l.email || '', phone: l.phone || '', linkedin: l.linkedin || '',
  }));
}

export async function loadDeals() {
  if (DEMO) return _demo.deals.map(_clone);
  const { data, error } = await supa.from('deals')
    .select('id,lead_id,name,ig_link,status,meeting,meeting_time,followup,qualification,cash,notes,fireflies_link,no_close_reason,phone,email,service_type')
    .order('id');
  if (error) throw new Error(error.message);
  return data.map((d) => ({
    row: d.id, id: d.id, leadId: d.lead_id,
    name: d.name || '', link: d.ig_link || '', status: d.status || '',
    meeting: isoToDmy(d.meeting), meetingTime: d.meeting_time || '', followup: isoToDmy(d.followup),
    qual: d.qualification || '', cash: d.cash == null ? '' : d.cash,
    notes: d.notes || '', hasFF: !!d.fireflies_link, fireflies_link: d.fireflies_link || '',
    noCloseReason: d.no_close_reason || '',
    phone: d.phone || '', email: d.email || '', service: d.service_type || '',
  }));
}

// Everything the panels need on boot, in one call pattern.
export async function bootstrap() {
  const [leads, deals] = await Promise.all([loadLeads(), loadDeals()]);
  return { leads, deals, serverDate: todayDmy() };
}

/* ---------- data: writes (each returns an undo token) ---------- */

const LEAD_FIELDS = { stage: 'level', status: 'last_status', temp: 'temp', note: 'notes' };

async function logActivity(table, rowId, action, prev, next) {
  const email = await userEmail();
  const { data, error } = await supa.from('activity')
    .insert({ actor: email, table_name: table, row_id: rowId, action, prev, next })
    .select('id').single();
  if (error) throw new Error(error.message);
  return data.id;
}

/** Update (or create) a lead. args: {handle, stage?, status?, temp?, note?}
 *  Mirrors the old setterUpdate contract: stamps last_contact=today, appends
 *  the note, requires a stage to create a new lead. */
export async function setterUpdate(args) {
  const handle = String(args.handle || '').trim().toLowerCase();
  if (!handle) throw new Error('bad handle');
  if (DEMO) {
    const hit = _demo.leads.find((l) => l.h === handle);
    if (hit) {
      const prev = { level: hit.level, last_status: hit.status, temp: hit.temp, notes: hit.notes, last_contact: dmyToIso(hit.lastContact) };
      if (args.stage) hit.level = args.stage;
      if (args.status) hit.status = args.status;
      if (args.temp) hit.temp = args.temp;
      if (args.note) hit.notes = hit.notes ? hit.notes + '\n' + args.note : args.note;
      hit.lastContact = todayDmy();
      let deal = null;
      if (args.stage === 'Booked') deal = await ensureDealForLead(hit, { meeting: args.meeting, time: args.meetingTime });
      return { ok: true, mode: 'updated', row: hit.id, handle, prev, deal, undo: _demoUndoToken('leads', 'id', hit.id, { level: prev.level, status: prev.last_status, temp: prev.temp, notes: prev.notes, lastContact: isoToDmy(prev.last_contact) }) };
    }
    if (!args.stage) throw new Error('stage required to create');
    const nl = { id: Date.now(), h: handle, url: 'https://instagram.com/' + handle, level: args.stage, status: args.status || '', temp: args.temp || 'Warm Lead', qual: '', notes: args.note || '', lastContact: todayDmy() };
    _demo.leads.push(nl);
    return { ok: true, mode: 'created', row: nl.id, handle };
  }
  const { data: hit, error: qErr } = await supa.from('leads')
    .select('*').eq('handle', handle).maybeSingle();
  if (qErr) throw new Error(qErr.message);

  const todayIso = dmyToIso(todayDmy());
  if (hit) {
    const prev = { level: hit.level, last_status: hit.last_status, temp: hit.temp,
      notes: hit.notes, last_contact: hit.last_contact };
    const patch = { last_contact: todayIso };
    if (args.stage) patch.level = args.stage;
    if (args.status) patch.last_status = args.status;
    if (args.temp) patch.temp = args.temp;
    if (args.note) patch.notes = hit.notes ? hit.notes + '\n' + args.note : args.note;
    const { error } = await supa.from('leads').update(patch).eq('id', hit.id);
    if (error) throw new Error(error.message);
    const actId = await logActivity('leads', hit.id, 'update', prev, patch);
    let deal = null;
    if (args.stage === 'Booked') {
      try { deal = await ensureDealForLead(hit, { meeting: args.meeting, time: args.meetingTime }); } catch (e) { /* surfaced via missing deal, not a blocked write */ }
    }
    return { ok: true, mode: 'updated', row: hit.id, handle, prev, deal,
      undo: { table: 'leads', rowId: hit.id, prev, actId } };
  }

  if (!args.stage) throw new Error('stage required to create');
  const rowNew = {
    handle, ig_url: 'https://www.instagram.com/' + handle + '/',
    level: args.stage, last_status: args.status || null, temp: args.temp || 'Warm Lead',
    notes: args.note || null, last_contact: todayIso, date_added: todayIso,
  };
  const { data: created, error: cErr } = await supa.from('leads')
    .insert(rowNew).select('id').single();
  if (cErr) throw new Error(cErr.message);
  await logActivity('leads', created.id, 'create', null, rowNew);
  let deal = null;
  if (args.stage === 'Booked') {
    try { deal = await ensureDealForLead({ id: created.id, h: handle, ig_url: rowNew.ig_url, qualification: null, notes: rowNew.notes }, { meeting: args.meeting, time: args.meetingTime }); } catch (e) { /* non-blocking */ }
  }
  return { ok: true, mode: 'created', row: created.id, handle, deal };
}

/** Update a deal. args: {row(id), fields:{status,meeting,followup,cash,notes}, cashConfirmed}
 *  Mirrors closerUpdate: cash requires explicit confirmation; notes append
 *  (draft notes get replaced); dates arrive dd/MM/yyyy. */
export async function closerUpdate(args) {
  const f = args.fields || {};
  if (DEMO) {
    if (f.cash != null && f.cash !== '' && args.cashConfirmed !== true) throw new Error('cash requires confirmation');
    const d = _demo.deals.find((x) => x.row === args.row);
    if (!d) throw new Error('deal not found');
    const prev = { status: d.status, meeting: d.meeting, followup: d.followup, cash: d.cash, notes: d.notes };
    const oldStatus = d.status;
    if (f.status) d.status = f.status;
    if (f.meeting) d.meeting = f.meeting;
    if (f.followup) d.followup = f.followup;
    if (f.cash != null && f.cash !== '') d.cash = Number(f.cash);
    if (f.no_close_reason != null) d.noCloseReason = f.no_close_reason || '';
    if (f.notes) d.notes = (!d.notes || String(d.notes).indexOf('[draft]') === 0) ? f.notes : d.notes + '\n' + f.notes;
    if (f.status) { try { await syncLeadFromDeal(d, f.status, oldStatus, f.no_close_reason || d.noCloseReason); } catch (e) { /* non-blocking */ } }
    return { ok: true, row: d.row, name: d.name || d.link, applied: f, prev, undo: _demoUndoToken('deals', 'row', d.row, prev) };
  }
  if (f.cash != null && f.cash !== '' && args.cashConfirmed !== true) {
    throw new Error('cash requires confirmation');
  }
  const { data: d, error: qErr } = await supa.from('deals')
    .select('*').eq('id', args.row).maybeSingle();
  if (qErr) throw new Error(qErr.message);
  if (!d) throw new Error('deal not found');

  const prev = { status: d.status, meeting: d.meeting, followup: d.followup,
    cash: d.cash, notes: d.notes };
  const patch = {};
  if (f.status) patch.status = f.status;
  if (f.meeting) patch.meeting = dmyToIso(f.meeting);
  if (f.followup) patch.followup = dmyToIso(f.followup);
  if (f.cash != null && f.cash !== '') patch.cash = Number(f.cash);
  if (f.no_close_reason != null) patch.no_close_reason = f.no_close_reason || null;
  if (f.notes) {
    patch.notes = (!d.notes || d.notes.indexOf('[draft]') === 0)
      ? f.notes : d.notes + '\n' + f.notes;
  }
  const { error } = await supa.from('deals').update(patch).eq('id', d.id);
  if (error) throw new Error(error.message);
  const actId = await logActivity('deals', d.id, 'update', prev, patch);
  // closer outcome flows back to the setter's lead (best-effort)
  if (patch.status) {
    try { await syncLeadFromDeal(d, patch.status, d.status, f.no_close_reason || d.no_close_reason); }
    catch (e) { /* never block the deal write */ }
  }
  // a logged call consumes its pending entry
  await supa.from('pending_calls').update({ consumed: true }).eq('deal_id', d.id);
  return { ok: true, row: d.id, name: d.name || d.ig_link, applied: f, prev,
    undo: { table: 'deals', rowId: d.id, prev, actId } };
}

/** Closer outcome flows back to the setter's lead. Deal → Closed marks the lead
 *  Closed; deal → No Close keeps it in the book (stage 'No Close') and records
 *  the reason on the lead note. Stamps last_contact = today so the setter's
 *  worklist can auto-resurface a No-Close lead once it has cooled (see
 *  NOCLOSE_RESURFACE_DAYS in worklist). Best-effort: a failure here never blocks
 *  the deal write. Only fires on the transition INTO Closed/No Close. */
async function syncLeadFromDeal(deal, newStatus, oldStatus, reason) {
  const leadId = deal.lead_id || deal.leadId;
  if (!leadId) return null;
  if (newStatus !== 'Closed' && newStatus !== 'No Close') return null;
  if (newStatus === oldStatus) return null;
  const dm = todayDmy().slice(0, 5); // dd/MM
  // No Close keeps the lead in the CRM (still followed up later), just re-stages it
  const level = newStatus === 'Closed' ? 'Closed' : 'No Close';
  const r = String(reason || '').trim();
  const line = newStatus === 'Closed'
    ? `[closed ${dm}] deal won`
    : `[no close ${dm}]${r ? ' — ' + r : ''}`;
  if (DEMO) {
    const l = _demo.leads.find((x) => x.id === leadId);
    if (!l) return null;
    l.level = level;
    l.notes = l.notes ? l.notes + '\n' + line : line;
    l.lastContact = todayDmy();
    return { row: leadId, level };
  }
  const todayIso = dmyToIso(todayDmy());
  const { data: l } = await supa.from('leads').select('level,notes,last_contact').eq('id', leadId).maybeSingle();
  if (!l) return null;
  const prev = { level: l.level, notes: l.notes, last_contact: l.last_contact };
  const next = { level, notes: l.notes ? l.notes + '\n' + line : line, last_contact: todayIso };
  const { error } = await supa.from('leads').update(next).eq('id', leadId);
  if (error) throw new Error(error.message);
  await logActivity('leads', leadId, 'update', prev, next);
  return { row: leadId, level };
}

/** When a lead is Booked, the closer gets a deal — automatically.
 *  Skips if an open deal already exists for this lead/handle.
 *  when: { meeting: 'dd/MM/yyyy'|'yyyy-MM-dd', time: 'HH:MM' } — the call slot
 *  the setter booked, carried onto the deal and into the Slack ping. */
export async function ensureDealForLead(lead, when = {}) {
  const h = lead.h || lead.handle || '';
  const mIso = when.meeting ? (dmyToIso(when.meeting) || when.meeting) : '';
  const mTime = String(when.time || '').trim();
  if (DEMO) {
    const open = _demo.deals.find((d) => (d.link || '').toLowerCase().includes(h) && d.status !== 'Closed' && d.status !== 'No Close');
    if (open) return { created: false, row: open.row };
    const nd = { row: Date.now(), id: Date.now(), leadId: lead.id, name: '@' + h,
      link: lead.url || 'https://instagram.com/' + h, status: 'Discovery Call',
      meeting: mIso ? isoToDmy(mIso) : '', meetingTime: mTime,
      followup: '', qual: lead.qual || '', cash: '', notes: lead.notes || '', hasFF: false, fireflies_link: '' };
    _demo.deals.push(nd);
    return { created: true, row: nd.row };
  }
  const { data: existing } = await supa.from('deals')
    .select('id,status').eq('lead_id', lead.id)
    .not('status', 'in', '("Closed","No Close")').limit(1);
  if (existing && existing.length) return { created: false, row: existing[0].id };
  const row = {
    lead_id: lead.id, name: '@' + h,
    ig_link: lead.ig_url || lead.url || 'https://www.instagram.com/' + h + '/',
    status: 'Discovery Call', qualification: lead.qualification || null,
    notes: lead.notes || null, email: lead.email || null, phone: lead.phone || null,
    meeting: mIso || null, meeting_time: mTime || null,
  };
  const { data: created, error } = await supa.from('deals').insert(row).select('id').single();
  if (error) throw new Error(error.message);
  await logActivity('deals', created.id, 'create', null, row);
  // one place for the booked ping, so it fires from every path that books a
  // lead (log tool, All-leads drawer, palette) — re-marking Booked won't
  // re-ping, since we only get here when a new deal is actually created.
  try {
    const { data: L } = await supa.from('leads')
      .select('handle,ig_url,qualification,temp,phone,email,pain_points,last_status,notes')
      .eq('id', lead.id).maybeSingle();
    await bookedAlert({
      name: '@' + ((L && L.handle) || h),
      qual: (L && L.qualification) || lead.qualification || '',
      temp: (L && L.temp) || '',
      phone: (L && L.phone) || '',
      email: (L && L.email) || '',
      pains: (L && L.pain_points) || '',
      status: (L && L.last_status) || '',
      notes: (L && L.notes) || '',
      link: (L && L.ig_url) || row.ig_link || '',
      meeting: mIso ? isoToDmy(mIso) : '',
      meetingTime: mTime,
    });
  } catch (e) { /* never block the booking */ }
  return { created: true, row: created.id };
}

/** Direct-set a lead's fields (leads-browser editor). Only present keys write. */
export async function setLead(id, fields) {
  const MAP = { level: 'level', status: 'last_status', temp: 'temp', qual: 'qualification',
    notes: 'notes', pains: 'pain_points', email: 'email', phone: 'phone', linkedin: 'linkedin' };
  if (DEMO) {
    const l = _demo.leads.find((x) => x.id === id);
    if (!l) throw new Error('lead not found');
    const prev = {};
    Object.keys(fields).forEach((k) => { if (k in MAP || k === 'lastContact') { prev[k] = l[k]; l[k] = fields[k] || ''; } });
    return { ok: true, row: id, handle: l.h, prev, undo: _demoUndoToken('leads', 'id', id, prev) };
  }
  const { data: l, error: qErr } = await supa.from('leads').select('*').eq('id', id).maybeSingle();
  if (qErr) throw new Error(qErr.message);
  if (!l) throw new Error('lead not found');
  const patch = {}, prev = {};
  Object.keys(MAP).forEach((k) => {
    if (k in fields) { patch[MAP[k]] = fields[k] === '' ? null : fields[k]; prev[MAP[k]] = l[MAP[k]]; }
  });
  if (!Object.keys(patch).length) return { ok: true, row: id, noop: true };
  const { error } = await supa.from('leads').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
  const actId = await logActivity('leads', id, 'update', prev, patch);
  let deal = null;
  if (patch.level === 'Booked' && l.level !== 'Booked') {
    try { deal = await ensureDealForLead({ ...l, handle: l.handle, h: l.handle }); } catch (e) { /* non-blocking */ }
  }
  return { ok: true, row: id, handle: l.handle, prev, deal, undo: { table: 'leads', rowId: id, prev, actId } };
}

/** Recent history for one record, newest first. */
export async function loadActivity(table, rowId, limit = 10) {
  if (DEMO) return [
    { actor: 'demo@ajr.crm', action: 'update', next: { last_status: 'Follow up Sent' }, created_at: new Date(Date.now() - 3600e3).toISOString() },
    { actor: 'ai:fireflies', action: 'update', next: { status: 'Followup', notes: '[call] wants pricing' }, created_at: new Date(Date.now() - 26 * 3600e3).toISOString() },
  ];
  const { data, error } = await supa.from('activity')
    .select('actor,action,prev,next,created_at')
    .eq('table_name', table).eq('row_id', rowId)
    .order('id', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

/** Direct-set a deal's fields (CRM editor path — replaces, doesn't append).
 *  fields: { status?, meeting?(iso|null), followup?(iso|null), cash?(number|null), notes?, qualification? }
 *  Only the keys present are written. Cash change requires opts.cashConfirmed. */
export async function setDeal(id, fields, opts = {}) {
  if (DEMO) {
    const d = _demo.deals.find((x) => x.row === id);
    if (!d) throw new Error('deal not found');
    const prev = {};
    const oldStatus = d.status;
    if ('cash' in fields) {
      const nc = (fields.cash === '' || fields.cash == null) ? '' : Number(fields.cash);
      if (nc !== '' && nc !== (d.cash === '' || d.cash == null ? '' : Number(d.cash)) && opts.cashConfirmed !== true) throw new Error('cash requires confirmation');
      prev.cash = d.cash; d.cash = nc;
    }
    const DMAP = { qualification: 'qual', service_type: 'service' };
    ['status', 'notes', 'qualification', 'phone', 'email', 'service_type'].forEach((k) => { const kk = DMAP[k] || k; if (k in fields) { prev[kk] = d[kk]; d[kk] = fields[k] || ''; } });
    if ('no_close_reason' in fields) { prev.noCloseReason = d.noCloseReason; d.noCloseReason = fields.no_close_reason || ''; }
    ['meeting', 'followup'].forEach((k) => { if (k in fields) { prev[k] = d[k]; d[k] = fields[k] ? isoToDmy(fields[k]) : ''; } });
    if ('status' in fields) { try { await syncLeadFromDeal(d, fields.status || '', oldStatus, fields.no_close_reason || d.noCloseReason); } catch (e) { /* non-blocking */ } }
    return { ok: true, row: id, name: d.name || d.link, prev, undo: _demoUndoToken('deals', 'row', id, prev) };
  }
  const { data: d, error: qErr } = await supa.from('deals').select('*').eq('id', id).maybeSingle();
  if (qErr) throw new Error(qErr.message);
  if (!d) throw new Error('deal not found');
  const patch = {};
  ['status', 'notes', 'qualification', 'meeting', 'meeting_time', 'followup', 'no_close_reason',
    'phone', 'email', 'service_type'].forEach((k) => {
    if (k in fields) patch[k] = fields[k] === '' ? null : fields[k];
  });
  if ('cash' in fields) {
    const newCash = (fields.cash === '' || fields.cash == null) ? null : Number(fields.cash);
    if (newCash != null && newCash !== (d.cash == null ? null : Number(d.cash)) && opts.cashConfirmed !== true) {
      throw new Error('cash requires confirmation');
    }
    patch.cash = newCash;
  }
  if (!Object.keys(patch).length) return { ok: true, row: id, noop: true };
  const prev = {};
  Object.keys(patch).forEach((k) => { prev[k] = d[k]; });
  const { error } = await supa.from('deals').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
  const actId = await logActivity('deals', id, 'update', prev, patch);
  // closer outcome flows back to the setter's lead (best-effort)
  if (patch.status) {
    try { await syncLeadFromDeal(d, patch.status, d.status, patch.no_close_reason || d.no_close_reason); }
    catch (e) { /* never block the deal write */ }
  }
  return { ok: true, row: id, name: d.name || d.ig_link, prev, undo: { table: 'deals', rowId: id, prev, actId } };
}

/** Undo a write: restore prev values (activity row keeps the audit trail). */
export async function undoWrite(undo) {
  if (DEMO || (undo && undo._demo)) { _demoApplyUndo(undo); return { ok: true }; }
  const { error } = await supa.from(undo.table).update(undo.prev).eq('id', undo.rowId);
  if (error) throw new Error(error.message);
  await logActivity(undo.table, undo.rowId, 'restore', null, undo.prev);
  return { ok: true };
}

/* ---------- pending calls + AI ---------- */

export async function pendingCalls() {
  if (DEMO) return [];
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data, error } = await supa.from('pending_calls')
    .select('id,deal_id,name,created_at')
    .eq('consumed', false).gte('created_at', dayAgo);
  if (error) throw new Error(error.message);
  return (data || []).map((c) => ({ id: c.id, row: c.deal_id, name: c.name }));
}

export async function markPendingConsumed(id) {
  if (DEMO) return;
  await supa.from('pending_calls').update({ consumed: true }).eq('id', id);
}

export async function interpret(text, mode, deal) {
  if (DEMO) { await new Promise((r) => setTimeout(r, 350)); return _demoInterpret(text, mode); }
  const { data, error } = await supa.functions.invoke('interpret',
    { body: { text, mode, deal } });
  if (error) throw new Error(error.message || 'AI unreachable');
  if (!data || !data.ok) throw new Error((data && data.error) || 'AI error');
  return data;
}

export async function visionScan(imageB64, mediaType) {
  if (DEMO) {
    await new Promise((r) => setTimeout(r, 700));
    return { ok: true, leads: [
      { handle: 'growthwithdan', name: 'Dan', stage: 'Engaged 3', status: 'Call Pitched', temp: 'Hot Lead', notes: 'runs a supplement brand ~40k/mo, asked about the audit', confidence: 'high' },
      { handle: 'sara.ecom', name: 'Sara', stage: 'Engaged 2', status: 'Left on read', temp: 'Warm Lead', notes: 'talked about her email flows, sent audit offer', confidence: 'medium' },
    ] };
  }
  const { data, error } = await supa.functions.invoke('vision', { body: { image: imageB64, media_type: mediaType } });
  if (error) throw new Error(error.message || 'Vision unreachable');
  if (!data || !data.ok) throw new Error((data && data.error) || 'Vision error');
  return data;
}

/** Record what the AI suggested vs what the human saved — the raw material
 *  for tuning the prompts to the team's real judgment. Fire-and-forget. */
export async function logAiFeedback(source, context, suggested, final) {
  if (DEMO) return;
  try {
    const email = await userEmail();
    await supa.from('ai_feedback').insert({ source, context: String(context || ''), suggested, final, actor: email });
  } catch (e) { /* never block the user on telemetry */ }
}

/** Ping the team channel that a lead just booked. Takes a payload object so the
 *  message can carry everything the closer needs to prep (qualification, temp,
 *  phone/email, pain points, last DM status, notes, link). Fire-and-forget. */
export async function bookedAlert(payload) {
  if (DEMO) return;
  try { await supa.functions.invoke('alerts', { body: { type: 'booked', ...payload } }); }
  catch (e) { /* fire-and-forget */ }
}


/* ---------- ⌘K command palette ----------
   Pages call installPalette({ nav, leads?, deals?, onLead?, onDeal? }) after
   boot. Cmd/Ctrl+K opens it; type to search leads/deals or jump between pages;
   a sentence (with spaces) offers "Log it" -> log-lead with the text prefilled. */
export function installPalette(opts = {}) {
  if (document.getElementById('ck-pal')) return;
  const nav = opts.nav || [
    { label: 'Worklist', href: 'worklist.html' },
    { label: 'All leads', href: 'leads.html' },
    { label: 'Log a lead', href: 'log-lead.html' },
    { label: 'Closing', href: 'deals.html' },
    { label: 'Settings', href: 'settings.html' },
  ];
  const el = document.createElement('div');
  el.id = 'ck-pal';
  el.innerHTML = `
    <style>
      #ck-pal{position:fixed;inset:0;z-index:100;display:none;align-items:flex-start;justify-content:center;background:rgba(0,0,0,.55);padding-top:14vh}
      #ck-pal.on{display:flex}
      #ck-box{width:min(560px,calc(100vw - 40px));background:#141416;border:1px solid #26262c;border-radius:14px;box-shadow:0 24px 60px -18px rgba(0,0,0,.8);overflow:hidden}
      #ck-in{width:100%;min-height:52px;padding:0 16px;background:transparent;border:none;color:#e9e9ec;font:500 15px 'Geist',system-ui,sans-serif;outline:none;box-sizing:border-box;border-bottom:1px solid #1e1e23}
      #ck-in::placeholder{color:#55555e}
      #ck-list{list-style:none;margin:0;padding:6px;max-height:44vh;overflow-y:auto}
      #ck-list li{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:9px;cursor:pointer;color:#e9e9ec;font:400 14px 'Geist',system-ui,sans-serif}
      #ck-list li.sel{background:#1c1c22}
      #ck-list .k{color:#6e6e78;font-size:11.5px;margin-left:auto;font-family:'Geist Mono',monospace}
      #ck-list .t{color:#6e6e78;font-size:12px}
    </style>
    <div id="ck-box"><input id="ck-in" placeholder="Search leads, deals, pages… or type what happened" autocomplete="off" spellcheck="false"><ul id="ck-list"></ul></div>`;
  document.body.appendChild(el);
  const input = el.querySelector('#ck-in'), list = el.querySelector('#ck-list');
  let items = [], sel = 0;
  const escH = (x) => String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function open() { el.classList.add('on'); input.value = ''; build(''); setTimeout(() => input.focus(), 30); }
  function close() { el.classList.remove('on'); }
  function build(q) {
    const ql = q.toLowerCase().trim();
    items = [];
    if (ql && ql.indexOf(' ') !== -1) {
      items.push({ label: 'Log it: “' + q.trim() + '”', tag: 'AI', run: () => { location.href = 'log-lead.html?say=' + encodeURIComponent(q.trim()); } });
    }
    const leads = (opts.leads ? opts.leads() : []) || [];
    leads.filter((l) => ql && l.h.toLowerCase().includes(ql.replace('@', ''))).slice(0, 6).forEach((l) => {
      items.push({ label: '@' + l.h, tag: l.level || 'lead', run: () => { if (opts.onLead) { opts.onLead(l); close(); } else location.href = 'leads.html?lead=' + encodeURIComponent(l.h); } });
    });
    const deals = (opts.deals ? opts.deals() : []) || [];
    deals.filter((d) => ql && String(d.name || d.link).toLowerCase().includes(ql)).slice(0, 5).forEach((d) => {
      items.push({ label: d.name || d.link, tag: d.status || 'deal', run: () => { if (opts.onDeal) { opts.onDeal(d); close(); } else location.href = 'deals.html?deal=' + d.row; } });
    });
    nav.filter((n) => !ql || n.label.toLowerCase().includes(ql)).forEach((n) => {
      items.push({ label: n.label, tag: 'page', run: () => { location.href = n.href; } });
    });
    sel = 0;
    list.innerHTML = items.map((it, i) =>
      `<li class="${i === sel ? 'sel' : ''}" data-i="${i}">${escH(it.label)}<span class="t">${escH(it.tag)}</span>${i === sel ? '<span class="k">↵</span>' : ''}</li>`).join('') ||
      '<li style="color:#55555e;cursor:default">Nothing matches.</li>';
    Array.prototype.forEach.call(list.querySelectorAll('li[data-i]'), (li) => {
      li.onclick = () => items[+li.getAttribute('data-i')].run();
    });
  }
  input.addEventListener('input', () => build(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, items.length - 1); build2(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); build2(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[sel]) items[sel].run(); }
    function build2() {
      Array.prototype.forEach.call(list.children, (li, i) => {
        li.classList.toggle('sel', i === sel);
        const k = li.querySelector('.k'); if (k) k.remove();
        if (i === sel && li.hasAttribute('data-i')) li.insertAdjacentHTML('beforeend', '<span class="k">↵</span>');
      });
      const s2 = list.querySelector('.sel'); if (s2) s2.scrollIntoView({ block: 'nearest' });
    }
  });
  el.addEventListener('mousedown', (e) => { if (e.target === el) close(); });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); el.classList.contains('on') ? close() : open(); }
  });
}

/** "2h ago"-style relative time for history rows. */
export function relTime(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return 'just now';
  if (s < 3600) return Math.round(s / 60) + 'm ago';
  if (s < 86400) return Math.round(s / 3600) + 'h ago';
  return Math.round(s / 86400) + 'd ago';
}


/* ---------- shared screenshot scanner (paste / drop / button) ----------
   Pages call installScanner({ statuses, exists(handle), onDone() }). Renders
   its own modal; writes via setterUpdate; logs ai_feedback per added lead. */
export function installScanner(opts = {}) {
  if (document.getElementById('sc2-modal')) return;
  const statuses = opts.statuses || STATUSES;
  const el = document.createElement('div');
  el.innerHTML = `
    <style>
      #sc2-drop{position:fixed;inset:0;z-index:90;background:rgba(14,14,16,.86);display:none;align-items:center;justify-content:center}
      #sc2-drop.on{display:flex}
      #sc2-drop .b{border:2px dashed #8ee59a;border-radius:18px;padding:40px 56px;color:#e9e9ec;font:600 15px 'Geist',system-ui,sans-serif}
      #sc2-modal{position:fixed;inset:0;z-index:95;background:rgba(0,0,0,.6);display:none;align-items:flex-start;justify-content:center;padding:8vh 16px;overflow-y:auto}
      #sc2-modal.on{display:flex}
      #sc2-modal .c{width:min(560px,100%);background:#141416;border:1px solid #26262c;border-radius:16px;overflow:hidden;font-family:'Geist',system-ui,sans-serif}
      #sc2-modal .h{display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid #1e1e23;color:#e9e9ec}
      #sc2-modal .h b{font-size:15px;font-weight:600;flex:1}
      #sc2-modal .bd{padding:10px 14px;max-height:52vh;overflow-y:auto}
      #sc2-modal .think{padding:34px;text-align:center;color:#a9a9b1;font-size:14px}
      .sc2-card{border:1px solid #202024;border-radius:12px;padding:12px;margin:8px 4px;background:#17171b}
      .sc2-card .t{display:flex;align-items:center;gap:8px;margin-bottom:8px}
      .sc2-card .hh{flex:1;min-height:36px;padding:0 11px;background:#0e0e10;border:1px solid #202024;border-radius:9px;color:#e9e9ec;font-weight:600;font-size:14px}
      .sc2-card .x{width:32px;height:32px;border-radius:8px;color:#55555e;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;background:none;border:none}
      .sc2-card .x:hover{color:#f4a3a3}
      .sc2-card .g{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
      .sc2-card select,.sc2-card .nn{width:100%;min-height:34px;padding:5px 10px;background:#0e0e10;border:1px solid #202024;border-radius:9px;color:#e9e9ec;font-size:13px}
      .sc2-card .low{font-size:11px;color:#d9b96a;margin-top:6px}
      .sc2-card .ex{font-size:11px;color:#d9b96a;margin-top:6px}
      #sc2-modal .f{padding:12px 18px;border-top:1px solid #1e1e23;display:flex;gap:10px}
      #sc2-modal .f button{flex:1;min-height:44px;border-radius:11px;font-weight:600;font-size:14px;border:none;cursor:pointer}
      #sc2-modal .add{background:#8ee59a;color:#0b1f10}
      #sc2-modal .add:disabled{opacity:.5}
      #sc2-modal .cancel{background:none;border:1px solid #26262c;color:#a9a9b1}
    </style>
    <div id="sc2-drop"><div class="b">Drop the screenshot to read it</div></div>
    <div id="sc2-modal"><div class="c">
      <div class="h"><b id="sc2-title">Leads from screenshot</b>
        <button class="x" id="sc2-close" aria-label="Close" style="color:#55555e;background:none;border:none;cursor:pointer">✕</button></div>
      <div class="bd" id="sc2-body"></div>
      <div class="f"><button class="cancel" id="sc2-cancel">Cancel</button><button class="add" id="sc2-add">Add leads</button></div>
    </div></div>`;
  document.body.appendChild(el);
  const $i = (id) => document.getElementById(id);
  const escH = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let items = [];
  const close = () => { $i('sc2-modal').classList.remove('on'); items = []; };
  $i('sc2-close').onclick = close; $i('sc2-cancel').onclick = close;
  $i('sc2-modal').addEventListener('mousedown', (e) => { if (e.target === $i('sc2-modal')) close(); });

  function optHtml(list, sel, blank) {
    return (blank ? '<option value="">' + blank + '</option>' : '') +
      list.map((o) => '<option' + (o === sel ? ' selected' : '') + '>' + escH(o) + '</option>').join('');
  }
  function render(leads) {
    items = leads;
    $i('sc2-title').textContent = leads.length + ' lead' + (leads.length === 1 ? '' : 's') + ' found';
    $i('sc2-add').disabled = false;
    $i('sc2-body').innerHTML = leads.map((l, i) => {
      const handle = (l.handle || l.name || '').trim().toLowerCase().replace(/^@/, '');
      l._suggested = { handle, stage: l.stage || 'Engaged 1', status: l.status || '', temp: l.temp || '', notes: l.notes || '' };
      const exists = opts.exists ? opts.exists(handle) : null;
      return '<div class="sc2-card" data-i="' + i + '">' +
        '<div class="t"><input class="hh" data-f="handle" value="' + escH(handle) + '" placeholder="handle">' +
          '<button class="x" data-rm>✕</button></div>' +
        '<div class="g">' +
          '<select data-f="stage">' + optHtml(['Engaged 1','Engaged 2','Engaged 3','Booked','No Reply'], l.stage || 'Engaged 1') + '</select>' +
          '<select data-f="temp">' + optHtml(['Hot Lead','Warm Lead','Cold Lead'], l.temp, 'Temp —') + '</select>' +
          '<select data-f="status">' + optHtml(statuses, l.status, 'Status —') + '</select>' +
        '</div>' +
        '<input class="nn" data-f="notes" value="' + escH(l.notes || '') + '" placeholder="note">' +
        (l.confidence && l.confidence !== 'high' ? '<div class="low">low confidence — double-check this one</div>' : '') +
        (exists ? '<div class="ex">already a lead — this updates @' + escH(exists) + '</div>' : '') +
      '</div>';
    }).join('');
    Array.prototype.forEach.call($i('sc2-body').querySelectorAll('[data-rm]'), (b) => {
      b.onclick = () => { b.closest('.sc2-card').remove(); if (!$i('sc2-body').querySelector('.sc2-card')) close(); };
    });
    $i('sc2-modal').classList.add('on');
  }
  async function handleImage(file) {
    if (!file || (file.type || '').indexOf('image/') !== 0) return;
    $i('sc2-modal').classList.add('on');
    $i('sc2-title').textContent = 'Reading screenshot…';
    $i('sc2-add').disabled = true;
    $i('sc2-body').innerHTML = '<div class="think">Claude is reading the image…</div>';
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => { const v = String(r.result); res(v.slice(v.indexOf(',') + 1)); };
        r.onerror = rej; r.readAsDataURL(file);
      });
      const out = await visionScan(b64, file.type || 'image/jpeg');
      const leads = (out.leads || []).filter((l) => (l.handle || l.name || '').trim());
      if (!leads.length) { $i('sc2-body').innerHTML = '<div class="think">No leads found in that image.</div>'; return; }
      render(leads);
    } catch (e) {
      $i('sc2-body').innerHTML = '<div class="think">Couldn’t read that: ' + escH(e.message) + '</div>';
    }
  }
  $i('sc2-add').onclick = async () => {
    const cards = [].slice.call($i('sc2-body').querySelectorAll('.sc2-card'));
    $i('sc2-add').disabled = true; $i('sc2-add').textContent = 'Adding…';
    let n = 0;
    for (const card of cards) {
      const g = (f) => { const x = card.querySelector('[data-f="' + f + '"]'); return x ? x.value.trim() : ''; };
      const handle = g('handle').toLowerCase().replace(/^@/, '');
      if (!handle) continue;
      try {
        await setterUpdate({ handle, stage: g('stage'), status: g('status'), temp: g('temp'), note: g('notes') });
        const orig = items[+card.getAttribute('data-i')];
        if (orig && orig._suggested) logAiFeedback('vision', handle, orig._suggested,
          { handle, stage: g('stage'), status: g('status'), temp: g('temp'), notes: g('notes') });
        n++;
      } catch (e) { /* count only successes */ }
    }
    $i('sc2-add').disabled = false; $i('sc2-add').textContent = 'Add leads';
    close();
    if (opts.onDone) opts.onDone(n);
  };
  // paste + drop
  window.addEventListener('paste', (e) => {
    const its = (e.clipboardData && e.clipboardData.items) || [];
    for (const it of its) if (it.type && it.type.indexOf('image/') === 0) { e.preventDefault(); handleImage(it.getAsFile()); return; }
  });
  let depth = 0;
  window.addEventListener('dragenter', (e) => { if (e.dataTransfer && [].indexOf.call(e.dataTransfer.types, 'Files') !== -1) { depth++; $i('sc2-drop').classList.add('on'); } });
  window.addEventListener('dragover', (e) => { if ($i('sc2-drop').classList.contains('on')) e.preventDefault(); });
  window.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) $i('sc2-drop').classList.remove('on'); });
  window.addEventListener('drop', (e) => {
    if (!$i('sc2-drop').classList.contains('on')) return;
    e.preventDefault(); depth = 0; $i('sc2-drop').classList.remove('on');
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleImage(f);
  });
  return { openFile: () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = () => { if (inp.files[0]) handleImage(inp.files[0]); };
    inp.click();
  } };
}
