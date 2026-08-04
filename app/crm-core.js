/* AJR CRM core — the ONE shared engine for all app pages.
 * Supabase client + auth guard + data layer + activity-log undo + AI interpret.
 * Loaded as an ES module; pages import { core } and call its adapters.
 * All writes log prev/next into `activity`, so every write is undoable. */

// Bundled locally (tools/bundle-supabase.md). The esm.sh version arrived as a
// 16-request waterfall, three levels deep, that re-resolved every 10 minutes —
// the single biggest fixed cost on every page load.
import { createClient } from './supabase-js.mjs?v=1';

const SUPABASE_URL = 'https://cukjynfatkyiuzvstgcp.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1a2p5bmZhdGt5aXV6dnN0Z2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0Mzg3MjAsImV4cCI6MjA5OTAxNDcyMH0.l8-zXB6AgAKutZJTh30t6Tl2c3-f-H8kG6D9iF9eQtM';

export const supa = createClient(SUPABASE_URL, SUPABASE_ANON);

/* canonical vocab (was Apps Script Config.gs) */
export const STAGES = ['Engaged 1', 'Engaged 2', 'Engaged 3', 'Booked', 'No Close', 'Archive', 'No Reply', 'Closed', 'Following'];
/* The following-list bucket was called 'Outreach' until 2026-07-22. Reads
   accept both so a cached page and a migrated database can never disagree;
   writes only ever produce 'Following'. */
export const POOL = 'Following';
export const POOL_VALUES = ['Following', 'Outreach'];
export const isPool = (lvl) => lvl === 'Following' || lvl === 'Outreach';
export const STATUSES = ['Follow up Sent', "Haven't read", 'End of convo', 'Mid convo',
  'Lifestyle sent', 'Left on read', 'Story reply', 'Call Pitched', 'Meme sent', 'LM Sent'];

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
  briefing: {
    date: 'Monday, August 3, 2026', iso: new Date().toISOString().slice(0, 10),
    updated_at: 'demo-briefing',
    counts: '6 items · 4 sources', keydev_url: '#',
    groups: [
      { tag: 'Meta & paid social', items: [
        { t: 'Location fees are live and invoice-only', d: '2–5% on spend delivered to UK/FR/IT/ES/AT/TR — never shows in Ads Manager', src: 'GoodMorning', url: '' },
        { t: 'Metrics overhaul breaks your history', d: 'reach and video views replaced by Media Views, which counts repeats', src: 'GoodMorning', url: '' },
        { t: 'AI creative gets auto-labelled', d: 'ads made or edited with AI are flagged whether you opt in or not', src: 'Social Media Today', url: '' },
      ] },
      { tag: 'Marketplaces', items: [
        { t: 'Amazon caps titles at 75 characters', d: 'overflow moves to a new Item Highlights field', src: 'Stack Influence', url: '' },
        { t: 'Walmart cut referral fees in 14 categories', d: 'deepest in apparel, electronics and home', src: 'Stack Influence', url: '' },
      ] },
      { tag: 'Playbook — Nik Sharma', items: [
        { t: 'Test buying routes, not landing pages', d: 'one brand shipped 20–30 pages in 6 months and the PDP still won', src: 'Aug 2 issue', url: '' },
      ] },
    ],
  },
  leads: [
    { id: 1, h: 'jung.labs', url: 'https://instagram.com/jung.labs', level: 'Engaged 3', status: 'Follow up Sent', qual: 'Qualified 3', notes: 'potential referral for his students', lastContact: _ago(20), dateAdded: _ago(90), followed: _ago(950), email: 'jung@labs.io', phone: '', linkedin: '', pains: 'no time to run ads' },
    { id: 2, h: 'charlay', url: 'https://instagram.com/charlay', level: 'Engaged 3', status: 'Follow up Sent', qual: 'Qualified 3', notes: 'audit accepted, need to book meeting', lastContact: _ago(63), followed: _ago(1400), lp: true, lpQuality: 'good', lpUsed: true },
    { id: 3, h: 'akram_meza', url: 'https://instagram.com/akram_meza', level: 'Engaged 3', status: 'Follow up Sent', qual: 'Qualified 1', notes: 'showed interest from story', lastContact: _ago(63) },
    { id: 4, h: 'oscarwxng', url: 'https://instagram.com/oscarwxng', level: 'Engaged 2', status: 'Story reply', qual: 'Qualified 2', notes: '', lastContact: _ago(4), followed: _ago(200) },
    { id: 5, h: 'kayla.growth', url: 'https://instagram.com/kayla.growth', level: 'Engaged 2', status: 'Meme sent', qual: '', notes: '', lastContact: _ago(6) },
    { id: 6, h: 'sofia_scales', url: 'https://instagram.com/sofia_scales', level: 'Engaged 1', status: "Haven't read", qual: '', notes: '', lastContact: _ago(10) },
    { id: 7, h: 'nina.creates', url: 'https://instagram.com/nina.creates', level: 'Engaged 1', status: 'Lifestyle sent', qual: '', notes: '', lastContact: _ago(8) },
    { id: 8, h: 'mariusvmil', url: 'https://instagram.com/mariusvmil', level: 'Engaged 1', status: 'Left on read', qual: '', notes: '', lastContact: _ago(120) },
    { id: 9, h: 'therealashwinn', url: 'https://instagram.com/therealashwinn', level: 'Engaged 1', status: 'End of convo', qual: '', notes: '', lastContact: _ago(140) },
    { id: 10, h: 'thedtcguy', url: 'https://instagram.com/thedtcguy', level: 'No Reply', status: 'Follow up Sent', qual: '', notes: '', lastContact: _ago(43), followed: _ago(3000) },
    { id: 11, h: 'ecom.aiden', url: 'https://instagram.com/ecom.aiden', level: 'Engaged 3', status: 'Mid convo', qual: 'Qualified 2', notes: 'wants pricing', lastContact: _ago(2) },
    { id: 12, h: 'growthwithdan', url: 'https://instagram.com/growthwithdan', level: 'Archive', status: 'Left on read', qual: 'Unqualified', notes: '[no contact] not a lead', lastContact: _ago(90), followed: _ago(1800) },
    { id: 13, h: 'lena.builds', url: 'https://instagram.com/lena.builds', level: 'Booked', status: 'Call Pitched', qual: 'Qualified 3', notes: 'call booked friday', lastContact: _ago(1) },
    // booked but never handed over — the case the closing page now catches
    { id: 25, h: 'giojaunin', url: 'https://instagram.com/giojaunin', level: 'Booked', status: 'Call Pitched', qual: 'Qualified 2', notes: 'booked on a call, deal row never created', lastContact: _ago(3) },
    { id: 14, h: 'devon.scales', url: 'https://instagram.com/devon.scales', level: 'No Close', status: 'Call done', qual: 'Qualified 2', notes: '[no close 20/05] — price too high', lastContact: _ago(40) },
    { id: 15, h: 'priya.dtc', url: 'https://instagram.com/priya.dtc', level: 'No Close', status: 'Call done', qual: 'Qualified 1', notes: '[no close 05/07] — bad timing, revisit Q4', lastContact: _ago(4) },
    // outreach pool: imported from the IG following export, not yet leads.
    // lastContact '' = not messaged yet; stamped = already sent.
    { id: 16, h: 'brandonleeco', url: 'https://instagram.com/brandonleeco', level: 'Following', status: '', qual: '', notes: '', lastContact: '', dateAdded: _ago(1), followed: _ago(400) },
    { id: 17, h: 'thesupplyhouse', url: 'https://instagram.com/thesupplyhouse', level: 'Following', status: '', qual: '', notes: '', lastContact: '', dateAdded: _ago(1), followed: _ago(15) },
    { id: 18, h: 'nordic.wear', url: 'https://instagram.com/nordic.wear', level: 'Following', status: '', qual: '', notes: '', lastContact: '', dateAdded: _ago(1), followed: _ago(1200) },
    { id: 19, h: 'jaycollective', url: 'https://instagram.com/jaycollective', level: 'Following', status: '', qual: '', notes: '', lastContact: '', dateAdded: _ago(1), followed: _ago(90) },
    { id: 20, h: 'mirafitwear', url: 'https://instagram.com/mirafitwear', level: 'Following', status: '', qual: '', notes: '', lastContact: '', dateAdded: _ago(1), followed: _ago(2600) },
    { id: 21, h: 'oatly.fanpage', url: 'https://instagram.com/oatly.fanpage', level: 'Following', status: 'Follow up Sent', qual: '', notes: '', lastContact: _ago(0), dateAdded: _ago(1), followed: _ago(730) },
    { id: 22, h: 'kettlebrandco', url: 'https://instagram.com/kettlebrandco', level: 'Following', status: 'Follow up Sent', qual: '', notes: '', lastContact: _ago(0), dateAdded: _ago(1), followed: _ago(45) },
    { id: 23, h: 'glowskin.co', url: 'https://instagram.com/glowskin.co', level: 'Engaged 1', status: '', qual: '', notes: 'skincare brand, 20k, runs own ads', lastContact: '', dateAdded: _ago(0), prospected: new Date().toISOString() },
    { id: 24, h: 'peakform.fit', url: 'https://instagram.com/peakform.fit', level: 'Engaged 1', status: '', qual: '', notes: 'fitness apparel, big reels', lastContact: '', dateAdded: _ago(1), prospected: new Date(Date.now() - 86400000).toISOString() }
  ],
  deals: [
    { row: 101, id: 101, leadId: null, name: 'Oscar Wong', link: 'https://instagram.com/oscarwxng', status: 'Discovery Call', meeting: _ago(0), followup: '', qual: 'Qualified 2', cash: '', notes: 'supplement brand ~40k/mo', hasFF: true, fireflies_link: 'https://app.fireflies.ai/view/demo' },
    { row: 102, id: 102, leadId: null, name: 'Awais', link: 'https://instagram.com/awais.designs', status: 'Closing call', meeting: _ago(0), followup: '', qual: '', cash: '', notes: '', hasFF: false, fireflies_link: '' },
    { row: 103, id: 103, leadId: null, name: 'Lena Ruiz', link: 'https://instagram.com/lena.builds', status: 'Followup', meeting: '', followup: _ago(6), qual: 'Qualified 3', cash: '', notes: 'sent proposal', hasFF: false, fireflies_link: '' },
    { row: 104, id: 104, leadId: null, name: 'Marcus Media', link: 'https://instagram.com/marcus_media', status: 'Closed', meeting: _ago(20), followup: '', qual: 'Qualified 3', cash: 4000, notes: 'paid in full', hasFF: true, fireflies_link: 'https://app.fireflies.ai/view/demo2' },
    { row: 105, id: 105, leadId: null, name: 'Viktor A.', link: 'https://instagram.com/viktorandersson1u', status: 'Discovery Call', meeting: _ago(-2), followup: '', qual: '', cash: '', notes: 'need to book', hasFF: false, fireflies_link: '' },
    { row: 106, id: 106, leadId: null, name: 'Greg Leet', link: 'https://instagram.com/gregleet', status: 'No Close', meeting: _ago(30), followup: '', qual: 'Qualified 1', cash: '', notes: 'went cold', hasFF: false, fireflies_link: '' }
  ],
  calendly: [
    { id: 'demo-booking-1', name: 'Sam Carter', email: 'sam@carterbrand.com', phone: '+371 26443210',
      start_iso: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(), time: '14:30', status: 'active', dealId: null }
  ]
};
function _demoUndoToken(coll, key, id, prev) { return { _demo: true, coll, key, id, prev }; }
function _demoApplyUndo(u) {
  const rec = _demo[u.coll].find((r) => r[u.key] === u.id);
  if (rec) Object.keys(u.prev).forEach((k) => { rec[k] = u.prev[k]; });
}
function _demoInterpret(text, mode) {
  const t = (text || '').toLowerCase();
  const intent = { route: 'unknown', handle: '', stage: '', status: '', target: '',
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

/** Read a whole table without a sequential page walk: page 0 carries the total
 *  count, so every remaining page can be fetched at the same time. */
async function pagedSelect(table, cols, order = 'id') {
  const first = await supa.from(table).select(cols, { count: 'exact' }).order(order).range(0, 999);
  if (first.error) throw new Error(first.error.message);
  const total = first.count || first.data.length;
  if (total <= 1000) return first.data;
  const jobs = [];
  for (let off = 1000; off < total; off += 1000) {
    jobs.push(supa.from(table).select(cols).order(order).range(off, off + 999));
  }
  const rest = await Promise.all(jobs);
  for (const r of rest) {
    if (r.error) throw new Error(r.error.message);
    first.data.push(...r.data);
  }
  return first.data;
}

/* The whole book is ~400KB of JSON and three pages fetch it on every
   navigation — by far the biggest repeat cost in real use. Cache it for a
   minute in sessionStorage; every write path drops the cache, so the only
   staleness window is another person's edit, and 60s of that is fine for a
   2-person team. */
const BOOK_KEY = 'ajr_book_v1';
const BOOK_TTL = 60000;
const _ttlGet = (k) => {
  try {
    const c = JSON.parse(sessionStorage.getItem(k) || 'null');
    if (c && Date.now() - c.t < BOOK_TTL) return c.v;
  } catch (e) { /* miss */ }
  return null;
};
const _ttlSet = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify({ t: Date.now(), v })); } catch (e) { /* quota */ } };
function dropBookCache() {
  try { ['ajr_book_v1', 'ajr_stale_v1', 'ajr_deals_v1'].forEach((k) => sessionStorage.removeItem(k)); } catch (e) { /* private mode */ }
}

export async function loadLeads() {
  if (DEMO) return _demo.leads.map(_clone);
  const hit = _ttlGet(BOOK_KEY);
  if (hit) return hit;
  const out = await pagedSelect('leads',
    'id,handle,ig_url,level,last_status,qualification,notes,last_contact,date_added,followed_at,followed_ts,ig_status,ig_last_post,ig_name,outreach_hidden,prospected_at,pain_points,email,phone,linkedin,lp,lp_quality,lp_used,story_seen_at');
  const mapped = out.map((l) => ({
    id: l.id, h: l.handle, url: l.ig_url || '',
    level: l.level || '', status: l.last_status || '',
    qual: l.qualification || '', notes: l.notes || '',
    lastContact: isoToDmy(l.last_contact), dateAdded: isoToDmy(l.date_added),
    followed: isoToDmy(l.followed_at),
    followedTs: l.followed_ts || '', // exact instant — Instagram orders within a day too
    igStatus: l.ig_status || '', igLastPost: isoToDmy(l.ig_last_post), igName: l.ig_name || '',
    hidden: !!l.outreach_hidden,
    prospected: l.prospected_at || '',
    pains: l.pain_points || '', email: l.email || '', phone: l.phone || '', linkedin: l.linkedin || '',
    lp: !!l.lp, lpQuality: l.lp_quality || '', lpUsed: !!l.lp_used,
    storySeenAt: l.story_seen_at || '',
  }));
  _ttlSet(BOOK_KEY, mapped);
  return mapped;
}

/** The daily DTC industry briefing, published into settings.daily_briefing by
 *  the external briefing automation. Null when it has never been published. */
export async function loadBriefing() {
  if (DEMO) return _clone(_demo.briefing);
  const { data, error } = await supa.from('settings')
    .select('value,updated_at').eq('key', 'daily_briefing').maybeSingle();
  if (error) throw error;
  if (!data || !data.value) return null;
  const b = JSON.parse(data.value);
  b.updated_at = data.updated_at;
  return b;
}

export async function loadDeals() {
  if (DEMO) return _demo.deals.map(_clone);
  const hit = _ttlGet('ajr_deals_v1');
  if (hit) return hit;
  const { data, error } = await supa.from('deals')
    .select('id,lead_id,name,ig_link,status,meeting,meeting_time,followup,qualification,cash,notes,fireflies_link,no_close_reason,phone,email,service_type')
    .order('id');
  if (error) throw new Error(error.message);
  const mapped = data.map((d) => ({
    row: d.id, id: d.id, leadId: d.lead_id,
    name: d.name || '', link: d.ig_link || '', status: d.status || '',
    meeting: isoToDmy(d.meeting), meetingTime: d.meeting_time || '', followup: isoToDmy(d.followup),
    qual: d.qualification || '', cash: d.cash == null ? '' : d.cash,
    notes: d.notes || '', hasFF: !!d.fireflies_link, fireflies_link: d.fireflies_link || '',
    noCloseReason: d.no_close_reason || '',
    phone: d.phone || '', email: d.email || '', service: d.service_type || '',
    callType: d.call_type || '',
  }));
  _ttlSet('ajr_deals_v1', mapped);
  return mapped;
}

// Everything the panels need on boot, in one call pattern.
export async function bootstrap() {
  const [leads, deals] = await Promise.all([loadLeads(), loadDeals()]);
  return { leads, deals, serverDate: todayDmy() };
}

/* ---------- data: writes (each returns an undo token) ---------- */

const LEAD_FIELDS = { stage: 'level', status: 'last_status', note: 'notes' };

async function logActivity(table, rowId, action, prev, next, atIso) {
  dropBookCache(); // any write may have touched a lead — never serve it stale
  const email = await userEmail();
  const row = { actor: email, table_name: table, row_id: rowId, action, prev, next };
  if (atIso) row.created_at = atIso; // backdated work belongs to its own day
  const { data, error } = await supa.from('activity')
    .insert(row).select('id').single();
  if (error) throw new Error(error.message);
  return data.id;
}

/** Update (or create) a lead. args: {handle, stage?, status?, note?}
 *  Mirrors the old setterUpdate contract: stamps last_contact=today, appends
 *  the note, requires a stage to create a new lead. */
export async function setterUpdate(args) {
  const handle = String(args.handle || '').trim().toLowerCase();
  if (!handle) throw new Error('bad handle');
  if (DEMO) {
    const hit = _demo.leads.find((l) => l.h === handle);
    if (hit) {
      const prev = { level: hit.level, last_status: hit.status, notes: hit.notes, last_contact: dmyToIso(hit.lastContact) };
      if (args.stage) hit.level = args.stage;
      if (args.status) hit.status = args.status;
      if (args.note) hit.notes = hit.notes ? hit.notes + '\n' + args.note : args.note;
      if (args.qual) hit.qual = args.qual;
      if (args.pains && !hit.pains) hit.pains = args.pains;
      hit.lastContact = todayDmy();
      let deal = null;
      if (args.stage === 'Booked') deal = await ensureDealForLead(hit, { meeting: args.meeting, time: args.meetingTime });
      return { ok: true, mode: 'updated', row: hit.id, handle, prev, deal, undo: _demoUndoToken('leads', 'id', hit.id, { level: prev.level, status: prev.last_status, notes: prev.notes, lastContact: isoToDmy(prev.last_contact) }) };
    }
    if (!args.stage) throw new Error('stage required to create');
    const nl = { id: Date.now(), h: handle, url: 'https://instagram.com/' + handle, level: args.stage, status: args.status || '', qual: '', notes: args.note || '', lastContact: todayDmy() };
    _demo.leads.push(nl);
    return { ok: true, mode: 'created', row: nl.id, handle };
  }
  const { data: hit, error: qErr } = await supa.from('leads')
    .select('*').eq('handle', handle).maybeSingle();
  if (qErr) throw new Error(qErr.message);

  const todayIso = dmyToIso(todayDmy());
  if (hit) {
    const prev = { level: hit.level, last_status: hit.last_status,
      notes: hit.notes, last_contact: hit.last_contact };
    const patch = { last_contact: todayIso };
    if (args.stage) patch.level = args.stage;
    if (args.status) patch.last_status = args.status;
    if (args.note) patch.notes = hit.notes ? hit.notes + '\n' + args.note : args.note;
    // scanner extras — a blank from the AI never wipes what a human wrote
    if (args.qual) { prev.qualification = hit.qualification; patch.qualification = args.qual; }
    if (args.pains && !hit.pain_points) { prev.pain_points = hit.pain_points; patch.pain_points = args.pains; }
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
    level: args.stage, last_status: args.status || null,
    notes: args.note || null, last_contact: todayIso, date_added: todayIso,
    qualification: args.qual || null, pain_points: args.pains || null,
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
  // Calendly-first order: if the setter already booked the slot in Calendly,
  // there'll be exactly one fresh unattached booking — attach it now so the
  // deal (and the ping below) carry the confirmed slot + contact info.
  // Any ambiguity is left for the closing page's one-click strip.
  let cal = null;
  if (!mIso) {
    try { cal = await attachLooseBooking(created.id, row, lead.id); } catch (e) { /* never block the booking */ }
  }
  // one place for the booked ping, so it fires from every path that books a
  // lead (log tool, All-leads drawer, palette) — re-marking Booked won't
  // re-ping, since we only get here when a new deal is actually created.
  // Backfilling an old booking skips it: Reinis doesn't need "new call!" for
  // something booked weeks ago.
  if (when.silent) return { created: true, row: created.id };
  try {
    const { data: L } = await supa.from('leads')
      .select('handle,ig_url,qualification,phone,email,pain_points,last_status,notes')
      .eq('id', lead.id).maybeSingle();
    await bookedAlert({
      name: '@' + ((L && L.handle) || h),
      qual: (L && L.qualification) || lead.qualification || '',
      phone: (cal && cal.phone) || (L && L.phone) || '',
      email: (cal && cal.email) || (L && L.email) || '',
      pains: (L && L.pain_points) || '',
      status: (L && L.last_status) || '',
      notes: (L && L.notes) || '',
      link: (L && L.ig_url) || row.ig_link || '',
      meeting: (cal && cal.meeting) || (mIso ? isoToDmy(mIso) : ''),
      meetingTime: (cal && cal.time) || mTime,
    });
  } catch (e) { /* never block the booking */ }
  return { created: true, row: created.id };
}

/* ---------- Booked leads that never reached the closer ----------
   Every path that books a lead creates its deal best-effort: the call is
   wrapped in try/catch so a failure can't block the write that already
   succeeded. The cost is a lead that says Booked with no deal behind it —
   plus anything booked before this automation existed, which can never
   self-heal (setLead only creates on the level CHANGE to Booked).
   The closing page checks for them on every load. */
// A deal belongs to a lead whether or not it carries lead_id: rows imported
// from the old sheet were never linked, so fall back to name / ig-link handle.
function _dealMatches(d, l) {
  const h = String(l.h || l.handle || '').toLowerCase();
  if (d.leadId != null && d.leadId === l.id) return true;
  if (!h) return false;
  return String(d.name || '').toLowerCase().replace(/^@/, '') === h ||
    String(d.link || d.ig_link || '').toLowerCase().includes('/' + h);
}

/** The deal (from the loaded deals list) belonging to this lead, or null. */
export function dealForLead(deals, lead) {
  return (deals || []).find((d) => _dealMatches(d, lead)) || null;
}

/** Every recorded call for a deal, newest first — the Fireflies call log. */
export async function dealCalls(dealId) {
  if (DEMO) {
    if (dealId !== 101) return [];
    return [
      { id: 'demo-ff-2', title: 'Oscar <> Reinis — closing call', url: 'https://app.fireflies.ai/view/demo2', at: new Date(Date.now() - 2 * 864e5).toISOString() },
      { id: 'demo-ff-1', title: 'Oscar Wong discovery call', url: 'https://app.fireflies.ai/view/demo', at: new Date(Date.now() - 9 * 864e5).toISOString() },
    ];
  }
  const { data, error } = await supa.from('pending_calls')
    .select('id,title,url,call_at').eq('deal_id', dealId)
    .not('url', 'is', null).order('call_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((c) => ({ id: c.id, title: c.title || 'Call', url: c.url, at: c.call_at }));
}

export async function bookedWithoutDeal() {
  const hasDeal = (deals, l) => deals.some((d) => _dealMatches(d, l));
  if (DEMO) {
    return _demo.leads.filter((l) => (l.level === 'Booked' || l.level === 'Closed') && !hasDeal(_demo.deals, l))
      .map((l) => ({ id: l.id, h: l.h, url: l.url || '', qual: l.qual || '', notes: l.notes || '',
        lastContact: l.lastContact || '', level: l.level }));
  }
  // Closed leads belong here too: a lead marked Closed with no deal behind it
  // is a sale the closing CRM never recorded
  const { data: booked, error } = await supa.from('leads')
    .select('id,handle,ig_url,qualification,notes,email,phone,last_contact,level')
    .in('level', ['Booked', 'Closed']);
  if (error) throw new Error(error.message);
  if (!booked || !booked.length) return [];
  // ANY deal counts, including Closed / No Close — those are history, not a
  // lead to hand over a second time
  const { data: deals } = await supa.from('deals').select('lead_id,name,ig_link');
  const all = (deals || []).map((d) => ({ leadId: d.lead_id, name: d.name, link: d.ig_link }));
  return booked
    .filter((l) => !hasDeal(all, { id: l.id, h: l.handle }))
    .map((l) => ({
      id: l.id, h: l.handle, url: l.ig_url || '', qual: l.qualification || '',
      notes: l.notes || '', email: l.email || '', phone: l.phone || '',
      lastContact: isoToDmy(l.last_contact), level: l.level || 'Booked',
    }));
}

/** A deal from nothing — inbound leads go straight to the closer without ever
 *  entering the setter's book. lead_id stays null; the name/link matchers
 *  (dealForLead, bookedWithoutDeal) treat that as first-class. */
export async function createDeal(f = {}) {
  const rawName = String(f.name || '').trim();
  if (!rawName) throw new Error('name required');
  // "@handle" (or a bare handle-looking name) also gives us the IG link
  const asHandle = /^@?[a-z0-9._]{2,30}$/i.test(rawName) && !/\s/.test(rawName)
    ? rawName.toLowerCase().replace(/^@/, '') : '';
  const name = asHandle ? '@' + asHandle : rawName;
  if (DEMO) {
    const id = Date.now();
    _demo.deals.push({ row: id, id, leadId: null, name,
      link: asHandle ? 'https://instagram.com/' + asHandle : (f.ig_link || ''),
      status: f.status || 'Discovery Call', meeting: f.meeting || '', meetingTime: f.time || '',
      followup: '', qual: f.qual || '', cash: '', notes: f.notes || '', hasFF: false, fireflies_link: '' });
    return { ok: true, row: id, name };
  }
  const row = {
    lead_id: null, name,
    ig_link: asHandle ? 'https://www.instagram.com/' + asHandle + '/' : (f.ig_link || null),
    status: f.status || 'Discovery Call',
    meeting: f.meeting ? (dmyToIso(f.meeting) || f.meeting) : null,
    meeting_time: f.time || null, qualification: f.qual || null,
    notes: f.notes || null, email: f.email || null, phone: f.phone || null,
  };
  const { data: created, error } = await supa.from('deals').insert(row).select('id').single();
  if (error) throw new Error(error.message);
  await logActivity('deals', created.id, 'create', null, { ...row, source: 'inbound' });
  return { ok: true, row: created.id, name };
}

/** Hand one of them to the closer. Silent: no "new booking" ping for history. */
export async function createMissingDeal(lead) {
  const res = await ensureDealForLead(
    { id: lead.id, h: lead.h, handle: lead.h, ig_url: lead.url, url: lead.url,
      qualification: lead.qual, notes: lead.notes, email: lead.email, phone: lead.phone },
    { silent: true });
  dropBookCache();
  return res;
}

/** If exactly ONE unattached active Calendly booking exists from the last 2h,
 *  attach it to this just-created deal: slot onto the deal, email/phone onto
 *  deal + lead (blanks only). Ambiguity → do nothing (strip handles it). */
async function attachLooseBooking(dealId, dealRow, leadId) {
  const freshIso = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
  const { data: loose } = await supa.from('calendly_bookings')
    .select('id,name,email,phone,start_iso')
    .is('deal_id', null).eq('status', 'active').gte('created_at', freshIso);
  if (!loose || loose.length !== 1) return null;
  const b = loose[0];
  const d = new Date(b.start_iso);
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Riga' }).format(d); // yyyy-mm-dd
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Riga', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  const patch = { meeting: date, meeting_time: time };
  if (!dealRow.phone && b.phone) patch.phone = b.phone;
  if (!dealRow.email && b.email) patch.email = b.email;
  const { error } = await supa.from('deals').update(patch).eq('id', dealId);
  if (error) throw new Error(error.message);
  await logActivity('deals', dealId, 'update', { meeting: null, meeting_time: null }, patch);
  await supa.from('calendly_bookings').update({ deal_id: dealId }).eq('id', b.id);
  if (leadId && (b.email || b.phone)) {
    const { data: l } = await supa.from('leads').select('email,phone').eq('id', leadId).maybeSingle();
    if (l) {
      const lp = {}, lprev = {};
      if (!l.email && b.email) { lprev.email = l.email; lp.email = b.email; }
      if (!l.phone && b.phone) { lprev.phone = l.phone; lp.phone = b.phone; }
      if (Object.keys(lp).length) {
        await supa.from('leads').update(lp).eq('id', leadId);
        await logActivity('leads', leadId, 'update', lprev, lp);
      }
    }
  }
  return { meeting: isoToDmy(date), time, phone: b.phone || '', email: b.email || '' };
}

/** Unattached active Calendly bookings (for the closing page's link strip). */
export async function looseBookings() {
  if (DEMO) return _demo.calendly.filter((b) => !b.dealId && b.status === 'active' && !b.ignored).map(_clone);
  // only bookings whose call hasn't happened yet — a stale unlinked past call
  // is noise, not something to action
  const notPastIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data, error } = await supa.from('calendly_bookings')
    .select('id,name,email,phone,start_iso')
    .is('deal_id', null).is('ignored_at', null).eq('status', 'active').gte('start_iso', notPastIso)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

/** Not a lead, never will be — friends, family, brands you actually follow.
 *  Marked, not deleted, on purpose: the import guard skips handles that exist
 *  as leads, so a deleted friend would come straight back on the next
 *  following re-import. Archive keeps them out of the pool, the worklist and
 *  the funnel forever. Snapshot-based undo restores them exactly. */
/** '✕ not a lead'. If the lead was marked sent TODAY it was almost certainly
 *  a mis-click on the way here, so the stamp is retracted too — and a
 *  compensating batch row keeps today's follow-up count honest instead of
 *  leaving a DM that never happened on the scoreboard. */
export async function noContact(ids) {
  const list = Array.isArray(ids) ? ids : [ids];
  if (!list.length) return { ok: true, marked: 0 };
  if (DEMO) {
    const removed = [], set = new Set(list);
    let archived = 0;
    // a pure follow (or a same-day mis-mark) is DELETED; a lead with real
    // older history is archived instead — deleting worked history is destructive
    _demo.leads = _demo.leads.filter((l) => {
      if (!set.has(l.id)) return true;
      const older = l.lastContact && l.lastContact !== todayDmy();
      if (older) { l.level = 'Archive'; l.hidden = true; archived++; return true; }
      removed.push({ ...l });
      return false;
    });
    return { ok: true, deleted: removed.length, archived, retracted: 0,
      undo: { _demoDeleted: removed } };
  }
  // capture whole rows so a delete is reversible within the session
  const { data: before, error: qErr } = await supa.from('leads').select('*').in('id', list);
  if (qErr) throw new Error(qErr.message);
  const todayIso = dmyToIso(todayDmy());
  const del = [], arch = [];
  let retracted = 0;
  for (const b of before || []) {
    // never messaged, or marked sent TODAY (a mis-click on a friend) -> delete;
    // real older history -> archive, because deleting it destroys the record
    const sameDay = b.last_contact === todayIso;
    if (!b.last_contact || sameDay) { if (sameDay) retracted++; del.push(b); }
    else arch.push(b);
  }
  if (del.length) {
    const { error } = await supa.from('leads').delete().in('id', del.map((b) => b.id));
    if (error) throw new Error(error.message);
  }
  for (const b of arch) {
    const { error } = await supa.from('leads').update({ level: 'Archive', outreach_hidden: true,
      notes: (b.notes ? b.notes + '\n' : '') + '[no contact] not a lead' }).eq('id', b.id);
    if (error) throw new Error(error.message);
  }
  await logActivity('leads', list[0], 'no-contact', null,
    { deleted: del.length, archived: arch.length });
  if (retracted) {
    // credit the count back to the bucket it was actually counted into — a
    // fixed 'followup' here would move a cold batch's retraction to the wrong
    // side of the day's split
    let kind = 'followup';
    try {
      const today = todayDmy();
      const hit = (await recentBatches(2)).find((x) => x.dmy === today);
      if (hit) kind = hit.kind;
    } catch (e) { /* the walk-back matters more than picking the right bucket */ }
    await logActivity('leads', list[0], 'update', { retracted_batch: retracted },
      { batch: -retracted, batch_kind: kind });
  }
  dropBookCache();
  return { ok: true, deleted: del.length, archived: arch.length, retracted,
    undo: { deletedRows: del,
      archivedPrev: arch.map((b) => ({ id: b.id, level: b.level, notes: b.notes, outreach_hidden: b.outreach_hidden })) } };
}
/** Permanently delete leads — the restart button. Snapshot first: the undo
 *  re-inserts exactly what was removed (ids stripped, they're GENERATED). */
export async function purgeLeads(ids) {
  if (!ids || !ids.length) return { ok: true, purged: 0 };
  if (DEMO) {
    const del = _demo.leads.filter((l) => ids.includes(l.id));
    _demo.leads = _demo.leads.filter((l) => !ids.includes(l.id));
    return { ok: true, purged: del.length, undo: { _demoRows: del } };
  }
  const rows = [];
  for (let i = 0; i < ids.length; i += 500) {
    const { data } = await supa.from('leads').select('*').in('id', ids.slice(i, i + 500));
    rows.push(...(data || []));
  }
  for (let i = 0; i < ids.length; i += 500) {
    const { error } = await supa.from('leads').delete().in('id', ids.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }
  await logActivity('leads', ids[0], 'purge', null,
    { purged: rows.length, handles: rows.slice(0, 50).map((r) => r.handle) });
  dropBookCache();
  return { ok: true, purged: rows.length, undo: { deletedRows: rows } };
}
export async function undoPurge(undo) {
  dropBookCache();
  if (!undo) return { ok: true };
  if (undo._demoRows) { _demo.leads.push(...undo._demoRows); return { ok: true }; }
  const rows = (undo.deletedRows || []).map(({ id, ...rest }) => rest);
  if (!rows.length) return { ok: true };
  const { error } = await supa.from('leads').insert(rows);
  if (error) throw new Error(error.message);
  return { ok: true, restored: rows.length };
}

export async function undoNoContact(undo) {
  if (undo && undo._demoDeleted) {
    _demo.leads.push(...undo._demoDeleted.map((r) => ({ ...r })));
    return { ok: true, restored: undo._demoDeleted.length };
  }
  const del = (undo && undo.deletedRows) || [];
  if (del.length) {
    // re-insert the rows; id is GENERATED ALWAYS so it must be dropped (a fresh
    // one is assigned — safe, these were uncontacted follows with no deal link)
    const rows = del.map(({ id, ...rest }) => rest);
    const { error } = await supa.from('leads').insert(rows);
    if (error) throw new Error(error.message);
  }
  const arch = (undo && undo.archivedPrev) || [];
  for (const p of arch) {
    await supa.from('leads').update({ level: p.level, notes: p.notes,
      outreach_hidden: !!p.outreach_hidden }).eq('id', p.id);
  }
  dropBookCache();
  return { ok: true, restored: del.length + arch.length };
}

/** Dismiss an unlinked booking that isn't a sales call (personal meeting,
 *  other-agency call on the same Calendly). Stamped, not deleted — the row
 *  and its Q&A survive, it just leaves the strip. Undoable. */
export async function ignoreBooking(bookingId) {
  if (DEMO) {
    const b = _demo.calendly.find((x) => x.id === bookingId);
    if (!b) throw new Error('booking not found');
    b.ignored = true;
    return { ok: true, name: b.name || b.email || 'Booking', undo: { _demoIgnore: bookingId } };
  }
  const { error } = await supa.from('calendly_bookings')
    .update({ ignored_at: new Date().toISOString() }).eq('id', bookingId);
  if (error) throw new Error(error.message);
  return { ok: true, undo: { ignoreBookingId: bookingId } };
}
export async function unignoreBooking(undo) {
  if (undo && undo._demoIgnore) {
    const b = _demo.calendly.find((x) => x.id === undo._demoIgnore);
    if (b) b.ignored = false;
    return { ok: true };
  }
  const id = undo && undo.ignoreBookingId;
  if (!id) return { ok: true };
  const { error } = await supa.from('calendly_bookings').update({ ignored_at: null }).eq('id', id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Manually link a booking to a deal (the strip's one-click attach). */
export async function linkBooking(bookingId, dealRow) {
  if (DEMO) {
    const b = _demo.calendly.find((x) => x.id === bookingId);
    const d = _demo.deals.find((x) => x.row === dealRow);
    if (!b || !d) throw new Error('not found');
    const prev = { meeting: d.meeting, meetingTime: d.meetingTime, phone: d.phone, email: d.email };
    d.meeting = isoToDmyLocal(new Date(b.start_iso));
    d.meetingTime = b.time || '15:00';
    if (!d.phone && b.phone) d.phone = b.phone;
    if (!d.email && b.email) d.email = b.email;
    b.dealId = d.row;
    return { ok: true, name: d.name || d.link, meeting: d.meeting, time: d.meetingTime,
      phone: d.phone || '', email: d.email || '', undo: _demoUndoToken('deals', 'row', d.row, prev) };
  }
  const { data: b, error: bErr } = await supa.from('calendly_bookings').select('*').eq('id', bookingId).maybeSingle();
  if (bErr || !b) throw new Error((bErr && bErr.message) || 'booking not found');
  const { data: d, error: dErr } = await supa.from('deals').select('*').eq('id', dealRow).maybeSingle();
  if (dErr || !d) throw new Error((dErr && dErr.message) || 'deal not found');
  const dt = new Date(b.start_iso);
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Riga' }).format(dt);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Riga', hour: '2-digit', minute: '2-digit', hour12: false }).format(dt);
  const prev = { meeting: d.meeting, meeting_time: d.meeting_time };
  const patch = { meeting: date, meeting_time: time };
  if (!d.phone && b.phone) { prev.phone = d.phone; patch.phone = b.phone; }
  if (!d.email && b.email) { prev.email = d.email; patch.email = b.email; }
  // the booking form doubles as a qualification questionnaire — carry it onto the deal
  const digest = (Array.isArray(b.qa) ? b.qa : [])
    .map((it) => ({ q: String((it && it.question) || '').trim(), a: String((it && it.answer) || '').replace(/\s+/g, ' ').trim() }))
    .filter((x) => x.q && x.a && x.a !== '-' && !/phone/i.test(x.q) && !/^\+?[\d\s().-]{7,20}$/.test(x.a))
    .map((x) => x.q.replace(/\?+$/, '') + ': ' + x.a.slice(0, 100))
    .join(' · ').slice(0, 600);
  if (digest && !String(d.notes || '').includes('[calendly]')) {
    prev.notes = d.notes;
    patch.notes = (d.notes ? d.notes + '\n' : '') + '[calendly] ' + digest;
  }
  const { error } = await supa.from('deals').update(patch).eq('id', d.id);
  if (error) throw new Error(error.message);
  const actId = await logActivity('deals', d.id, 'update', prev, patch);
  await supa.from('calendly_bookings').update({ deal_id: d.id }).eq('id', b.id);
  if (d.lead_id && (b.email || b.phone)) {
    try {
      const { data: l } = await supa.from('leads').select('email,phone').eq('id', d.lead_id).maybeSingle();
      if (l) {
        const lp = {}, lprev = {};
        if (!l.email && b.email) { lprev.email = l.email; lp.email = b.email; }
        if (!l.phone && b.phone) { lprev.phone = l.phone; lp.phone = b.phone; }
        if (Object.keys(lp).length) {
          await supa.from('leads').update(lp).eq('id', d.lead_id);
          await logActivity('leads', d.lead_id, 'update', lprev, lp);
        }
      }
    } catch (e) { /* enrich is best-effort */ }
  }
  return { ok: true, name: d.name || d.ig_link, meeting: isoToDmy(date), time,
    phone: patch.phone || d.phone || '', email: patch.email || d.email || '',
    undo: { table: 'deals', rowId: d.id, prev, actId }, bookingId: b.id };
}

/* ---------- outreach pool (mass IG follow-up) ----------
   The whole IG following list lives here as leads staged 'Following': a bucket
   kept out of the worklist and the main lead list. last_contact null = not
   messaged yet. Replying promotes them with no special UI — the setter just
   logs them normally and setterUpdate moves them up the ladder. */

const HANDLE_RE = /^[a-z0-9._]{1,30}$/;
function normHandle(s) {
  let h = String(s || '').trim().toLowerCase();
  h = h.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '');
  h = h.replace(/^_u\//, ''); // app deep-link form: instagram.com/_u/<handle>
  h = h.split(/[/?#]/)[0].trim();
  return HANDLE_RE.test(h) ? h : '';
}

/** Pull handles out of an Instagram "Download your information" export.
 *  Meta has changed this shape before, so don't bind to one path: prefer
 *  string_list_data entries found anywhere in the tree, and fall back to any
 *  instagram.com URL / bare handle string. Accepts an object or raw JSON text. */
/** Handles WITH the date each was followed, when the export carries it
 *  (2026-era exports do: a unix timestamp beside each entry). parseFollowing
 *  stays the handle-only view so existing callers are untouched. */
export function parseFollowingEntries(input) {
  let data = input;
  if (typeof input === 'string') { try { data = JSON.parse(input); } catch (e) { return parseFollowing(input).map((h) => ({ h, followed: '' })); } }
  const out = new Map();
  const add = (v, ts) => {
    const h = normHandle(v);
    if (!h || out.has(h)) return;
    const d = Number(ts) > 0 ? new Date(Number(ts) * 1000).toISOString() : '';
    out.set(h, { h, followed: d });
  };
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (Array.isArray(node.string_list_data)) {
      const ts = (node.string_list_data[0] || {}).timestamp;
      if (node.title) add(node.title, ts);
      for (const e of node.string_list_data) add((e && (e.value || e.href)) || '', e && e.timestamp);
    }
    Object.keys(node).forEach((k) => walk(node[k]));
  };
  walk(data);
  if (!out.size) return parseFollowing(input).map((h) => ({ h, followed: '' }));
  return [...out.values()];
}

export function parseFollowing(input) {
  let data = input;
  const out = [];
  const push = (v) => { const h = normHandle(v); if (h) out.push(h); };
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input);
    } catch (e) {
      // Not JSON — treat it as CSV/TSV/one-per-line text. Reading every cell
      // would import the header row and the follower-count column as leads, so
      // pick the single column that looks most like handles and read only that.
      const rows = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
        .map((l) => l.split(/[,;\t|]/).map((c) => c.trim().replace(/^"|"$/g, '')));
      if (!rows.length) return [];
      const width = Math.max(...rows.map((r) => r.length));
      let best = -1, bestScore = 0;
      for (let c = 0; c < width; c++) {
        let score = 0;
        for (const r of rows) {
          const cell = r[c];
          if (!cell || /^\d+$/.test(cell)) continue;      // follower counts aren't handles
          if (/instagram\.com\//i.test(cell)) score += 2; // a profile URL is the strongest signal
          else if (normHandle(cell)) score += 1;
        }
        if (score > bestScore) { bestScore = score; best = c; }
      }
      if (best < 0) return [];
      rows.forEach((r, i) => {
        const cell = r[best];
        if (!cell || /^\d+$/.test(cell)) return;
        // a one-word header ('username') is handle-shaped; multi-word ones fail on their own
        if (i === 0 && /^(user ?name|handle|profile|account|ig|instagram|link|url|name|following)$/i.test(cell)) return;
        push(cell);
      });
      return Array.from(new Set(out));
    }
  }
  const walkPreferred = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walkPreferred); return; }
    if (Array.isArray(node.string_list_data)) {
      // newer exports carry the handle in `title` and only a timestamped href
      // in string_list_data; older ones carry it as `value`
      if (node.title) push(node.title);
      for (const e of node.string_list_data) push((e && (e.value || e.href)) || '');
    }
    Object.keys(node).forEach((k) => walkPreferred(node[k]));
  };
  walkPreferred(data);
  if (!out.length) { // fallback: any handle-ish string anywhere
    const walkAny = (node) => {
      if (typeof node === 'string') { push(node); return; }
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(walkAny); return; }
      Object.keys(node).forEach((k) => walkAny(node[k]));
    };
    walkAny(data);
  }
  return Array.from(new Set(out));
}

/** Import a following export into the outreach pool. Handles that are already
 *  leads at ANY stage are skipped outright — never demote or duplicate someone
 *  who's already a live conversation. Returns ids so the import is undoable. */
export async function importFollowing(input) {
  const entries = parseFollowingEntries(input);
  const followedBy = new Map(entries.map((e) => [e.h, e.followed]));
  const handles = entries.map((e) => e.h);
  if (!handles.length) return { total: 0, added: 0, skippedExisting: 0, ids: [] };
  if (DEMO) {
    const have = new Set(_demo.leads.map((l) => l.h));
    const fresh = handles.filter((h) => !have.has(h));
    const ids = [];
    fresh.forEach((h) => {
      const id = Date.now() + Math.floor(Math.random() * 1e6);
      _demo.leads.push({ id, h, url: 'https://instagram.com/' + h, level: POOL,
        status: '', qual: '', notes: '', lastContact: '', dateAdded: todayDmy(),
        followed: isoToDmy(followedBy.get(h) || '') });
      ids.push(id);
    });
    return { total: handles.length, added: fresh.length, skippedExisting: handles.length - fresh.length, ids };
  }
  const have = new Set();
  for (let off = 0; ; off += 1000) {
    const { data, error } = await supa.from('leads').select('handle').range(off, off + 999);
    if (error) throw new Error(error.message);
    data.forEach((r) => have.add(String(r.handle || '').toLowerCase()));
    if (data.length < 1000) break;
  }
  const fresh = handles.filter((h) => !have.has(h));
  const todayIso = dmyToIso(todayDmy());
  const ids = [];
  for (let i = 0; i < fresh.length; i += 500) {
    const chunk = fresh.slice(i, i + 500).map((h) => ({
      handle: h, ig_url: 'https://www.instagram.com/' + h + '/',
      level: POOL, last_contact: null, date_added: todayIso,
      followed_at: (followedBy.get(h) || '').slice(0, 10) || null,
      followed_ts: followedBy.get(h) || null,
    }));
    const { data, error } = await supa.from('leads').insert(chunk).select('id');
    if (error) throw new Error(error.message);
    data.forEach((r) => ids.push(r.id));
  }
  // one summary activity row — per-row logging would flood the audit table
  if (ids.length) {
    await logActivity('leads', ids[0], 'import', null,
      { imported: ids.length, skipped: handles.length - fresh.length, source: 'ig-following' });
  }
  return { total: handles.length, added: fresh.length, skippedExisting: handles.length - fresh.length, ids };
}

/** Undo an import: delete the rows it created — but ONLY those still untouched
 *  (level Following, never messaged). A pool entry that replied and got promoted
 *  is a real lead now; undoing the import must not take it down. */
export async function undoImport(ids) {
  dropBookCache();
  if (!ids || !ids.length) return { ok: true, deleted: 0, kept: 0 };
  if (DEMO) {
    const s = new Set(ids);
    const before = _demo.leads.length;
    _demo.leads = _demo.leads.filter((l) => !(s.has(l.id) && isPool(l.level) && !l.lastContact));
    const deleted = before - _demo.leads.length;
    return { ok: true, deleted, kept: ids.length - deleted };
  }
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const { data, error } = await supa.from('leads').delete()
      .in('id', chunk).in('level', POOL_VALUES).is('last_contact', null).select('id');
    if (error) throw new Error(error.message);
    deleted += (data || []).length;
  }
  return { ok: true, deleted, kept: ids.length - deleted };
}

/** The un-messaged part of the pool, oldest-added first. */
export async function outreachPool(opts = {}) {
  const limit = opts.limit || 500;
  if (DEMO) {
    return _demo.leads.filter((l) => isPool(l.level) && !l.lastContact)
      .slice(0, limit).map(_clone);
  }
  const { data, error } = await supa.from('leads')
    .select('id,handle,ig_url,date_added')
    .in('level', POOL_VALUES).is('last_contact', null)
    .order('date_added', { ascending: true }).limit(limit);
  if (error) throw new Error(error.message);
  return data.map((l) => ({ id: l.id, h: l.handle, url: l.ig_url || '', dateAdded: isoToDmy(l.date_added) }));
}

/** Mark a batch as messaged today. One bulk write (a 100-lead batch shouldn't be
 *  100 round trips) and one summary activity row. Deliberately does NOT touch
 *  `level`, so this can never disturb a lead's real stage. */
/** Leads due another touch: worked before, gone quiet past the worklist's own
 *  overdue window, still live. Oldest first — the ones rotting longest go out
 *  in tonight's batch. Booked leads are excluded; they're the closer's now. */
export async function staleBatch(opts = {}) {
  const limit = opts.limit || 500;
  const rules = await worklistRules();
  const cutoff = new Date(Date.now() - rules.overdueDays * 86400000).toISOString().slice(0, 10);
  if (DEMO) {
    return _demo.leads
      .filter((l) => ['Archive', 'Closed', 'Booked'].indexOf(l.level) < 0 && !isPool(l.level))
      .filter((l) => !l.lastContact || dmyToIso(l.lastContact) < cutoff)
      .sort((a, b) => String(dmyToIso(a.lastContact) || '').localeCompare(String(dmyToIso(b.lastContact) || '')))
      .slice(0, limit)
      .map((l) => ({ id: l.id, h: l.h, url: l.url || '', last: l.lastContact || '', level: l.level || '' }));
  }
  const hit = _ttlGet('ajr_stale_v1');
  if (hit) return hit;
  const { data, error } = await supa.from('leads')
    .select('id,handle,ig_url,last_contact,level')
    .not('level', 'in', '("Archive","Closed","Outreach","Following","Booked")')
    .or(`last_contact.is.null,last_contact.lt.${cutoff}`)
    .order('last_contact', { ascending: true, nullsFirst: true }).limit(limit);
  if (error) throw new Error(error.message);
  const mapped = data.map((l) => ({ id: l.id, h: l.handle, url: l.ig_url || '',
    last: l.last_contact ? isoToDmy(l.last_contact) : '', level: l.level || '' }));
  _ttlSet('ajr_stale_v1', mapped);
  return mapped;
}

/** Stamp a batch of leads as messaged today.
 *  `kind` decides which number it feeds on the dashboard — 'cold' for a first
 *  ever DM, 'followup' for re-touching someone who went quiet. It rides along
 *  in the activity row so the split is retrievable later, not just today.
 *  Previous values are captured per lead so undo can put them back: these are
 *  real leads with real history, and blanking last_contact would destroy it. */
/** `when` (dd/MM/yyyy) backdates a batch: last_contact gets that date AND the
 *  activity row is stamped midday on it, so the dashboard and the Slack report
 *  credit the day the DMs actually went out, not the day they were logged. */
export async function markBatchSent(ids, opts = {}) {
  const status = opts.status || 'Follow up Sent';
  const kind = opts.kind === 'followup' ? 'followup' : 'cold';
  const whenDmy = opts.when && /^\d{2}\/\d{2}\/\d{4}$/.test(opts.when) ? opts.when : todayDmy();
  if (!ids || !ids.length) return { ok: true, marked: 0 };
  if (DEMO) {
    const s = new Set(ids);
    const prev = [];
    _demo.leads.forEach((l) => {
      if (s.has(l.id)) {
        prev.push({ id: l.id, lastContact: l.lastContact, status: l.status, level: l.level });
        l.lastContact = whenDmy; l.status = status;
        if (isPool(l.level)) l.level = 'Engaged 1'; // a messaged follow is a lead now
      }
    });
    // demo parity: the batch has to be re-classifiable afterwards like a real
    // one, so it joins the list the Dashboard card reads
    await recentBatches(30); // seeds _demo.batches on first call
    const actId = 9100 + _demo.batches.length;
    _demo.batches.unshift({ id: actId, at: new Date(dmyToIso(whenDmy) + 'T12:00:00Z').toISOString(),
      count: prev.length, kind, origKind: kind, promoted: 0 });
    return { ok: true, marked: prev.length, kind, when: whenDmy, actId,
      undo: { _demo: true, outreach: prev } };
  }
  // snapshot first — the update is destructive and undo has to be exact
  const before = [];
  for (let i = 0; i < ids.length; i += 500) {
    const { data } = await supa.from('leads').select('id,last_contact,last_status,level')
      .in('id', ids.slice(i, i + 500));
    before.push(...(data || []));
  }
  const whenIso = dmyToIso(whenDmy);
  for (let i = 0; i < ids.length; i += 500) {
    const { error } = await supa.from('leads')
      .update({ last_contact: whenIso, last_status: status })
      .in('id', ids.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }
  // a DM'd follow enters the book as Engaged 1; anyone already tracked keeps
  // their stage. Done as its own targeted update so only pool rows move.
  const poolIds = before.filter((b) => isPool(b.level)).map((b) => b.id);
  for (let i = 0; i < poolIds.length; i += 500) {
    const { error } = await supa.from('leads')
      .update({ level: 'Engaged 1' })
      .in('id', poolIds.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }
  // midday avoids any timezone slipping the row into a neighbouring Riga day
  const atIso = whenDmy === todayDmy() ? null : whenIso + 'T12:00:00Z';
  // promoted is a COUNT, deliberately not level fields — a level-change shape
  // here would trip the funnel's replies metric on every batch
  const actId = await logActivity('leads', ids[0], 'update', { outreach_batch: ids.length },
    { last_contact: whenIso, last_status: status, batch: ids.length, batch_kind: kind,
      promoted: poolIds.length }, atIso);
  return { ok: true, marked: ids.length, kind, when: whenDmy, actId,
    undo: { outreachIds: ids, before } };
}
/** Back-compat wrapper: the outreach pool is always a first touch. */
export async function markOutreachSent(ids, opts = {}) {
  return markBatchSent(ids, { ...opts, kind: opts.kind || 'cold' });
}

/* ---------- re-classifying a batch: Cold DM <-> Follow-up ----------
   The kind is metrics-only — the lead rows are identical either way — so a
   wrong toggle is a reporting error, not data loss. It's fixed by APPENDING a
   correction rather than rewriting the audit row: `activity` is append-only,
   and the same walk-back shape is already used by noContact below. */

const _batchKind = (x) => (x === 'followup' ? 'followup' : 'cold');

/** Batches sent in the last `days`, newest first, with their effective kind. */
export async function recentBatches(days = 30) {
  if (DEMO) {
    _demo.batches = _demo.batches || [
      { id: 9001, at: new Date(Date.now() - 2 * 36e5).toISOString(), count: 34, kind: 'cold', origKind: 'cold', promoted: 12 },
      { id: 9002, at: new Date(Date.now() - 5 * 36e5).toISOString(), count: 12, kind: 'cold', origKind: 'cold', promoted: 0 },
      { id: 9003, at: new Date(Date.now() - 28 * 36e5).toISOString(), count: 28, kind: 'followup', origKind: 'followup', promoted: 3 },
      { id: 9004, at: new Date(Date.now() - 74 * 36e5).toISOString(), count: 41, kind: 'followup', origKind: 'cold', promoted: 0 },
    ];
    return _demo.batches.map((b) => ({ ...b, dmy: isoToDmy(b.at), corrected: b.kind !== b.origKind }));
  }
  const start = new Date(); start.setDate(start.getDate() - Math.max(1, days)); start.setHours(0, 0, 0, 0);
  const { data, error } = await supa.from('activity')
    .select('id,actor,row_id,prev,next,created_at')
    .eq('table_name', 'leads').eq('action', 'update')
    .not('next->>batch', 'is', null)
    .gte('created_at', start.toISOString())
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const rows = data || [];
  // the positive half of each correction pair carries the kind it moved TO;
  // rows are newest-first, so the FIRST one seen per batch is the current kind
  const fixed = new Map();
  for (const r of rows) {
    const nx = r.next || {};
    if (!nx.corrects || (Number(nx.batch) || 0) <= 0) continue;
    if (!fixed.has(nx.corrects)) fixed.set(nx.corrects, _batchKind(nx.batch_kind));
  }
  return rows.filter((r) => {
    const nx = r.next || {}, pv = r.prev || {};
    // corrections and ✕ walk-backs are adjustments, not batches anyone sent
    return !nx.corrects && !pv.retracted_batch && (Number(nx.batch) || 0) > 0;
  }).map((r) => {
    const nx = r.next || {};
    const origKind = _batchKind(nx.batch_kind);
    const kind = fixed.has(r.id) ? fixed.get(r.id) : origKind;
    return { id: r.id, at: r.created_at, dmy: isoToDmy(r.created_at), rowId: r.row_id,
      count: Number(nx.batch) || 0, kind, origKind, corrected: kind !== origKind,
      promoted: Number(nx.promoted) || 0, actor: r.actor || '' };
  });
}

/** Move a sent batch between the two buckets. */
export async function setBatchKind(activityId, kind) {
  const to = _batchKind(kind);
  const list = await recentBatches(90);
  const b = list.find((x) => String(x.id) === String(activityId));
  if (!b) throw new Error('batch not found — it may be older than 90 days');
  if (b.kind === to) return { ok: true, noop: true, count: b.count, from: b.kind, to };
  if (DEMO) {
    const d = (_demo.batches || []).find((x) => String(x.id) === String(activityId));
    if (d) d.kind = to;
    return { ok: true, count: b.count, from: b.kind, to, undo: { id: b.id, kind: b.kind } };
  }
  // both halves are stamped at the original batch's instant so the move lands
  // on the day it was actually sent, not today
  await logActivity('leads', b.rowId, 'update', { kind_fix: b.id },
    { batch: -b.count, batch_kind: b.kind, corrects: b.id }, b.at);
  await logActivity('leads', b.rowId, 'update', { kind_fix: b.id },
    { batch: b.count, batch_kind: to, corrects: b.id }, b.at);
  return { ok: true, count: b.count, from: b.kind, to, undo: { id: b.id, kind: b.kind } };
}

export async function undoBatchKind(undo) {
  if (!undo) return { ok: true };
  return setBatchKind(undo.id, undo.kind);
}

export async function undoOutreachSent(undo) {
  dropBookCache();
  if (!undo) return { ok: true };
  if (undo._demo) {
    undo.outreach.forEach((p) => {
      const l = _demo.leads.find((x) => x.id === p.id);
      if (l) { l.lastContact = p.lastContact; l.status = p.status; if (p.level !== undefined) l.level = p.level; }
    });
    return { ok: true };
  }
  const ids = undo.outreachIds || [];
  const before = undo.before || [];
  if (before.length) {
    // put each lead back exactly as it was — a shared blanket update would wipe
    // the contact history of anyone who had been worked before this batch
    for (const b of before) {
      const patch = { last_contact: b.last_contact, last_status: b.last_status };
      if (b.level !== undefined) patch.level = b.level; // un-promote if the mark promoted
      await supa.from('leads').update(patch).eq('id', b.id);
    }
    return { ok: true, restored: before.length };
  }
  for (let i = 0; i < ids.length; i += 500) { // pool entries: nothing to restore to
    const { error } = await supa.from('leads')
      .update({ last_contact: null, last_status: null }).in('id', ids.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }
  return { ok: true };
}

/** Direct-set a lead's fields (leads-browser editor). Only present keys write. */
export async function setLead(id, fields) {
  const MAP = { level: 'level', status: 'last_status', qual: 'qualification',
    notes: 'notes', pains: 'pain_points', email: 'email', phone: 'phone', linkedin: 'linkedin',
    lp: 'lp', lpQuality: 'lp_quality', lpUsed: 'lp_used' };
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
  // a lead jumped straight to Closed (closed on the first call) needs its deal
  // too — silent, since "new booking" would be the wrong ping for a done sale
  if (patch.level === 'Closed' && l.level !== 'Closed') {
    try {
      const { data: has } = await supa.from('deals').select('id')
        .or('lead_id.eq.' + l.id + ',name.eq.' + JSON.stringify('@' + l.handle)).limit(1);
      if (!has || !has.length) deal = await ensureDealForLead({ ...l, handle: l.handle, h: l.handle }, { silent: true });
    } catch (e) { /* non-blocking */ }
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
    const DMAP = { qualification: 'qual', service_type: 'service', call_type: 'callType' };
    ['status', 'notes', 'qualification', 'phone', 'email', 'service_type', 'call_type'].forEach((k) => { const kk = DMAP[k] || k; if (k in fields) { prev[kk] = d[kk]; d[kk] = fields[k] || ''; } });
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
    'phone', 'email', 'service_type', 'call_type'].forEach((k) => {
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
  dropBookCache();
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

/* ---------- sales assistant ---------- */

const DEMO_KNOWLEDGE = [
  { id: 1, title: 'DM Playbook — Ch2: Target audience', enabled: true, size: 4200, updated_at: new Date().toISOString() },
  { id: 2, title: 'DM Playbook — Ch5: First message framework', enabled: true, size: 6100, updated_at: new Date().toISOString() },
  { id: 3, title: 'DM Playbook — Ch8: Objection handling', enabled: true, size: 5300, updated_at: new Date().toISOString() },
];

/** Training docs the assistant runs on. List is metadata-only (content can be big). */
export async function knowledgeList() {
  if (DEMO) return DEMO_KNOWLEDGE.map((k) => ({ ...k }));
  const { data, error } = await supa.from('knowledge')
    .select('id,title,enabled,updated_at,content').order('id');
  if (error) throw new Error(error.message);
  return (data || []).map((k) => ({ id: k.id, title: k.title, enabled: k.enabled,
    size: (k.content || '').length, updated_at: k.updated_at }));
}
export async function knowledgeGet(id) {
  if (DEMO) return { id, title: 'Demo doc', content: 'Demo content — writes go nowhere.', enabled: true };
  const { data, error } = await supa.from('knowledge').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}
export async function knowledgeSave(row) {
  if (DEMO) return { ok: true };
  const patch = { title: row.title, content: row.content, enabled: row.enabled !== false,
    updated_at: new Date().toISOString() };
  const q = row.id
    ? supa.from('knowledge').update(patch).eq('id', row.id)
    : supa.from('knowledge').insert(patch);
  const { error } = await q;
  if (error) throw new Error(error.message);
  return { ok: true };
}
export async function knowledgeToggle(id, enabled) {
  if (DEMO) { const k = DEMO_KNOWLEDGE.find((x) => x.id === id); if (k) k.enabled = enabled; return { ok: true }; }
  const { error } = await supa.from('knowledge').update({ enabled, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
export async function knowledgeDelete(id) {
  if (DEMO) return { ok: true };
  const { error } = await supa.from('knowledge').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** What the CRM knows about one lead, as a text block for the assistant. */
export async function leadContextBlock(lead, deals) {
  const bits = [
    'Handle: @' + lead.h,
    lead.level ? 'Stage: ' + lead.level : '',
    lead.status ? 'Last status: ' + lead.status : '',
    lead.qual ? 'Qualification: ' + lead.qual : '',
    lead.lastContact ? 'Last contact: ' + lead.lastContact : '',
    lead.pains ? 'Pain points: ' + lead.pains : '',
    lead.notes ? 'Notes:\n' + lead.notes : '',
  ].filter(Boolean);
  const deal = dealForLead(deals || [], lead);
  if (deal) {
    bits.push('Deal: ' + (deal.name || '@' + lead.h) + ' — ' + (deal.status || 'open') +
      (deal.meeting ? ', meeting ' + deal.meeting : '') + (deal.cash ? ', cash ' + deal.cash : ''));
    try {
      const calls = await dealCalls(deal.row);
      if (calls.length) bits.push('Calls: ' + calls.map((c) => (c.at || '').slice(0, 10) + ' ' + c.title).join('; '));
    } catch (e) { /* context, not critical */ }
  }
  try {
    const acts = await loadActivity('leads', lead.id, 20);
    if (acts.length) {
      bits.push('Recent history:\n' + acts.map((a) => {
        const day = String(a.created_at || '').slice(0, 10);
        const what = a.action === 'create' ? 'created'
          : Object.entries(a.next || {}).map(([k, v]) => k + '→' + String(v).slice(0, 60)).join(', ');
        return day + ' [' + (a.actor || '?') + '] ' + (what || a.action);
      }).join('\n'));
    }
  } catch (e) { /* same */ }
  return bits.join('\n');
}

/** One assistant turn. messages: Anthropic-shaped [{role, content:[...]}]. */
export async function assistChat(messages, leadContext) {
  if (DEMO) {
    await new Promise((r) => setTimeout(r, 900));
    return { ok: true,
      reply: "He's price-anchoring before you've seen any value. Don't defend the price in DMs, pull it to a call. Reply something like: \"honestly depends on the store, that's why we do a free audit first. worst case you get a teardown of your flows. got 15 min this week?\" His note from April says he was launching a second store. Ask how that launch went before pitching, it reopens the convo warm.",
      lead_handle: 'ecom.aiden',
      updates: { qual: 'Qualified 2', level: 'Engaged 3', status: 'Mid convo',
        pains: 'Email barely converts, under 10% of revenue. No time to manage flows himself.',
        note: 'launching second store (mentioned April)', angle: 'weak flows, ~10%/mo from email' } };
  }
  const { data, error } = await supa.functions.invoke('assist',
    { body: { messages, leadContext: leadContext || '' } });
  if (error) throw new Error(error.message || 'Assistant unreachable');
  if (!data || !data.ok) throw new Error((data && data.error) || 'Assistant error');
  return data;
}

/* ---------- assistant chat history: one thread per lead, in the DB ----------
   The CRM stays the long-term memory; these rows are the conversation itself,
   so a thread survives sessions and follows the account across devices. */

function _demoChats() {
  if (!_demo.chats) {
    _demo.chats = [
      { id: 1, lead_handle: 'ecom.aiden', role: 'user', content: 'he asked if we do one-off audits or only retainers, what do i say', meta: null, created_at: new Date(Date.now() - 26 * 36e5).toISOString() },
      { id: 3, lead_handle: '', role: 'user', content: 'whats a good opener for q4 season', meta: null, created_at: new Date(Date.now() - 50 * 36e5).toISOString() },
      { id: 2, lead_handle: 'ecom.aiden', role: 'assistant', content: 'Neither answer wins in a DM. Pull it up a level: "we start everyone with the audit anyway, so lets do that and you decide what it becomes after". Keeps the retainer conversation for the call.', meta: { updates: { status: 'Mid convo' }, handle: 'ecom.aiden', fb: 'applied' }, created_at: new Date(Date.now() - 26 * 36e5 + 60e3).toISOString() },
    ];
    _demo.chatSeq = 10;
  }
  return _demo.chats;
}

/** Threads overview: one row per chat, newest activity first. */
export async function chatList() {
  const rows = DEMO ? _demoChats().slice() : (await (async () => {
    const { data, error } = await supa.from('assist_chats')
      .select('id,lead_handle,role,content,created_at')
      .order('id', { ascending: false }).limit(300);
    if (error) throw new Error(error.message);
    return data || [];
  })());
  const seen = new Map();
  for (const r of rows.sort((a, b) => b.id - a.id)) {
    const k = r.lead_handle || '';
    if (!seen.has(k)) seen.set(k, { handle: k, last: r.created_at, preview: r.content.slice(0, 80), count: 0 });
    seen.get(k).count++;
  }
  return [...seen.values()];
}

export async function chatLoad(handle, limit = 80) {
  if (DEMO) return _demoChats().filter((r) => (r.lead_handle || '') === (handle || '')).slice(-limit);
  const { data, error } = await supa.from('assist_chats').select('*')
    .eq('lead_handle', handle || '').order('id', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data || []).reverse();
}

export async function chatSave(handle, role, content, meta) {
  if (DEMO) {
    const row = { id: ++_demo.chatSeq, lead_handle: handle || '', role, content,
      meta: meta || null, created_at: new Date().toISOString() };
    _demoChats().push(row);
    return { id: row.id };
  }
  const { data, error } = await supa.from('assist_chats')
    .insert({ lead_handle: handle || '', role, content, meta: meta || null })
    .select('id').single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

/** Merge a patch into one message's meta — how a proposal records its fate. */
export async function chatSetMeta(id, patch) {
  if (DEMO) {
    const r = _demoChats().find((x) => x.id === id);
    if (r) r.meta = { ...(r.meta || {}), ...patch };
    return { ok: true };
  }
  const { data } = await supa.from('assist_chats').select('meta').eq('id', id).single();
  const { error } = await supa.from('assist_chats')
    .update({ meta: { ...((data && data.meta) || {}), ...patch } }).eq('id', id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function chatClear(handle) {
  if (DEMO) { _demo.chats = _demoChats().filter((r) => (r.lead_handle || '') !== (handle || '')); return { ok: true }; }
  const { error } = await supa.from('assist_chats').delete().eq('lead_handle', handle || '');
  if (error) throw new Error(error.message);
  return { ok: true };
}

/* ---------- walk-away screenshot uploads ----------
   The in-page scanner dies with the tab; these survive it. Screenshots are
   compressed, pushed to the 'shots' bucket, queued as scan_jobs, and the
   scanworker function drains the queue server-side — the phone can leave the
   moment the upload bar finishes. Results wait on New leads for review. */

function _demoJobs() { if (!_demo.scanJobs) { _demo.scanJobs = []; _demo.jobSeq = 0; } return _demo.scanJobs; }

/** Upload a batch. onStep(done, total) fires per finished upload. */
export async function uploadShots(files, onStep) {
  const list = [].slice.call(files || []).filter((f) => f && (f.type || '').indexOf('image/') === 0);
  if (!list.length) return { queued: 0 };
  if (DEMO) {
    for (let i = 0; i < list.length; i++) {
      const job = { id: ++_demo.jobSeq, status: 'pending', leads: null };
      _demoJobs().push(job);
      // demo "worker": resolves shortly after, even if the page is closed the
      // demo resets anyway — this exists to exercise the exact same UI path
      setTimeout(async () => {
        const out = await visionScan('demo', 'image/png');
        job.status = 'done'; job.leads = out.leads || [];
      }, 900 + i * 500);
      if (onStep) onStep(i + 1, list.length);
    }
    return { queued: list.length };
  }
  let done = 0;
  const stamp = Date.now();
  // three uploads in flight, same as the scanner's read pool
  const queue = list.slice();
  const one = async (f, idx) => {
    const img = await prepImage(f);
    const bytes = Uint8Array.from(atob(img.data), (c) => c.charCodeAt(0));
    const path = stamp + '-' + idx + (img.type === 'image/png' ? '.png' : '.jpg');
    const { error: upErr } = await supa.storage.from('shots')
      .upload(path, bytes.buffer, { contentType: img.type });
    if (upErr) throw new Error(upErr.message);
    const { error: jobErr } = await supa.from('scan_jobs').insert({ path });
    if (jobErr) throw new Error(jobErr.message);
    done++; if (onStep) onStep(done, list.length);
  };
  let idx = 0;
  const worker = async () => { while (queue.length) { const f = queue.shift(); await one(f, idx++); } };
  await Promise.all([worker(), worker(), worker()]);
  // fire-and-forget kick; the function answers instantly and keeps draining
  try { supa.functions.invoke('scanworker', { body: {} }); } catch (e) { /* next visit kicks it */ }
  return { queued: list.length };
}

/** Queue state + everything processed and waiting for review. */
export async function scanJobs() {
  if (DEMO) {
    const jobs = _demoJobs();
    return {
      pending: jobs.filter((j) => j.status === 'pending' || j.status === 'working').length,
      errors: jobs.filter((j) => j.status === 'error').length,
      done: jobs.filter((j) => j.status === 'done').map((j) => ({ id: j.id, leads: j.leads || [] })),
    };
  }
  const { data, error } = await supa.from('scan_jobs').select('id,status,leads').order('id');
  if (error) throw new Error(error.message);
  const rows = data || [];
  return {
    pending: rows.filter((r) => r.status === 'pending' || r.status === 'working').length,
    errors: rows.filter((r) => r.status === 'error').length,
    done: rows.filter((r) => r.status === 'done').map((r) => ({ id: r.id, leads: r.leads || [] })),
  };
}

/** Kick the background worker — also called on page load as the safety net. */
export async function kickScanWorker() {
  if (DEMO) return { ok: true };
  try { await supa.functions.invoke('scanworker', { body: {} }); } catch (e) { /* harmless */ }
  return { ok: true };
}

/** Jobs are consumed once their leads were added (or dismissed). */
export async function clearScanJobs(ids) {
  if (!ids || !ids.length) return { ok: true };
  if (DEMO) { _demo.scanJobs = _demoJobs().filter((j) => ids.indexOf(j.id) < 0); return { ok: true }; }
  const { error } = await supa.from('scan_jobs').delete().in('id', ids);
  if (error) throw new Error(error.message);
  return { ok: true };
}

let _demoVisionCall = 0;
export async function visionScan(imageB64, mediaType) {
  if (DEMO) {
    await new Promise((r) => setTimeout(r, 600));
    // rotate through a few results so a multi-screenshot batch shows leads
    // accumulating, a duplicate being skipped, and a name-only inbox card
    const sets = [
      [{ handle: 'growthwithdan', name: 'Dan', stage: 'Engaged 3', status: 'Call Pitched', notes: 'supplement brand ~40k/mo, asked about the audit', confidence: 'high', story: 'yes' }],
      [{ handle: 'sara.ecom', name: 'Sara', stage: 'Engaged 2', status: 'Left on read', notes: 'email flows, sent audit offer', confidence: 'medium', priv: 'yes' },
       { handle: 'growthwithdan', name: 'Dan', stage: 'Engaged 3', status: 'Mid convo', notes: 'same lead again — should be skipped', confidence: 'high' }],
      [{ handle: '', name: 'Luka Vukoslavovic', stage: 'Engaged 1', status: 'Story reply', notes: 'inbox screenshot — name only, no handle', confidence: 'low' }],
    ];
    return { ok: true, leads: sets[_demoVisionCall++ % sets.length] };
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
 *  message can carry everything the closer needs to prep (qualification,
 *  phone/email, pain points, last DM status, notes, link). Fire-and-forget. */
export async function bookedAlert(payload) {
  if (DEMO) return;
  try { await supa.functions.invoke('alerts', { body: { type: 'booked', ...payload } }); }
  catch (e) { /* fire-and-forget */ }
}


/* ---------- app settings (team roles + worklist rules) ----------
   Small JSON blobs in the `settings` table so roles and thresholds are data,
   not constants — adding a teammate or changing the overdue window is a
   Settings edit, not a deploy. Cached per page load. */

const DEFAULT_RULES = { overdueDays: 14, autoArchiveDays: 60, snoozeDays: 7, noCloseResurfaceDays: 30 };
// 0 means "track it, but don't hold me to a number" — the metric still shows a
// count, it just gets no progress bar and no say in the day's hit/miss.
const DEFAULT_TARGETS = { outreach: 20, followups: 100, newLeads: 20, booked: 0, closed: 0 };
/* newLeads is '20 a day OR 100 a week' — a 5-workday framing, so windowed
   views pace it at 100/7 per day instead of multiplying the daily by 7. */
const WEEKLY_OVERRIDES = { newLeads: 100 };
export function targetFor(k, targets, days = 1) {
  const daily = Number(targets[k] || 0);
  if (days <= 1 || !daily) return daily;
  return k in WEEKLY_OVERRIDES ? Math.round(WEEKLY_OVERRIDES[k] * days / 7) : daily * days;
}
export const TARGET_KEYS = ['outreach', 'followups', 'newLeads', 'booked', 'closed'];

/** Did a period meet its targets? `days` scales a daily target to the window
 *  (a 7-day view wants 7× the daily number). Metrics with target 0 sit it out;
 *  if every target is 0 there's nothing to hit, so it returns null. */
export function targetsHit(stat, targets, days = 1) {
  const live = TARGET_KEYS.filter((k) => Number(targets[k]) > 0);
  if (!live.length) return null;
  return live.every((k) => (stat[k] || 0) >= targetFor(k, targets, days));
}
// the day report now lands the NEXT morning, like the call sheet
const DEFAULT_TIMES = { morning: '08:00', report: '08:00' };
// deals.cash is a bare number; the symbol is the team's to choose
const DEFAULT_CURRENCY = '\u20ac';
const DEMO_ROLES = { 'reinis@agencyjr.com': 'closer' };
let _settingsCache = null;

export async function loadSettings(force) {
  if (_settingsCache && !force) return _settingsCache;
  if (!force && !DEMO) {
    const hit = _ttlGet('ajr_settings_v1');
    if (hit) { _settingsCache = hit; return hit; }
  }
  if (DEMO) {
    _settingsCache = { team_roles: DEMO_ROLES, worklist_rules: DEFAULT_RULES, setter_targets: DEFAULT_TARGETS, alert_times: DEFAULT_TIMES, currency: DEFAULT_CURRENCY };
    return _settingsCache;
  }
  const out = { team_roles: {}, worklist_rules: { ...DEFAULT_RULES }, setter_targets: { ...DEFAULT_TARGETS }, alert_times: { ...DEFAULT_TIMES }, currency: DEFAULT_CURRENCY };
  try {
    const { data } = await supa.from('settings').select('key,value').in('key', ['team_roles', 'worklist_rules', 'setter_targets', 'alert_times', 'currency']);
    for (const r of data || []) {
      let v = r.value;
      if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } }
      if (!v) continue;
      if (r.key === 'team_roles') out.team_roles = v;
      if (r.key === 'worklist_rules') out.worklist_rules = { ...DEFAULT_RULES, ...v };
      if (r.key === 'setter_targets') out.setter_targets = { ...DEFAULT_TARGETS, ...v };
      if (r.key === 'alert_times') {
        out.alert_times = { ...DEFAULT_TIMES, ...v };
        if (!v.report && v.evening) out.alert_times.report = v.evening; // legacy key
      }
      if (r.key === 'currency' && typeof v === 'string' && v.trim()) out.currency = v.trim().slice(0, 4);
    }
  } catch (e) { /* defaults are fine */ }
  _settingsCache = out;
  if (!DEMO) _ttlSet('ajr_settings_v1', out);
  return out;
}
export async function saveSetting(key, value) {
  try { sessionStorage.removeItem('ajr_settings_v1'); } catch (e) { /* fine */ }
  if (DEMO) { _settingsCache = null; return { ok: true }; }
  const { error } = await supa.from('settings')
    .upsert({ key, value: JSON.stringify(value), updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  _settingsCache = null;
  return { ok: true };
}
/** 'closer' | 'setter' for an email — data-driven, falls back to setter. */
export async function roleFor(email) {
  const s = await loadSettings();
  const key = String(email || '').toLowerCase();
  return (s.team_roles && s.team_roles[key]) === 'closer' ? 'closer' : 'setter';
}
export async function worklistRules() { return (await loadSettings()).worklist_rules; }
export async function setterTargets() { return (await loadSettings()).setter_targets; }
export async function currency() { return (await loadSettings()).currency; }
/** Money for humans: 5500 -> "€5,500". Rounded — nobody reads cents on a KPI. */
export function money(n, sym) {
  const v = Math.round(Number(n) || 0);
  return (sym || DEFAULT_CURRENCY) + v.toLocaleString('en-US');
}

/** Send the setter day report to Slack now, for TODAY, instead of waiting for
 *  tomorrow morning's scheduled run. The function dedupes on the day being
 *  described, so this cancels tomorrow's send rather than duplicating it. */
export async function sendDayReport() {
  if (DEMO) return { ok: true, demo: true, day: todayDmy() };
  const { data, error } = await supa.functions.invoke('alerts', { body: { type: 'report', mode: 'now' } });
  if (error) throw new Error(error.message);
  if (data && data.ok === false) throw new Error(data.error || 'send failed');
  return data || {};
}

/* ---------- setter daily stats (dashboard + daily report) ----------
   Everything the setter does already lands in `activity` with prev/next and a
   timestamp, so the tracker is pure aggregation — no new logging anywhere.
   Buckets are Europe/Riga calendar days. */

function rigaDay(ts) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Riga' }).format(new Date(ts));
}

/** Per-day setter numbers for the last `days` days (today included, oldest first).
 *  followups: human writes that stamped last_contact (batch marks excluded)
 *  outreach:  handles marked sent via the pool's batch action
 *  newLeads:  leads created by hand or via the screenshot scanner (imports excluded)
 *  booked:    leads moved to Booked (meetings handed to the closer)
 *  closed:    deals the closer marked Closed — counted on the deal, not the lead,
 *             so the mirrored lead update can't double-count it */
/* One batch-shaped activity row into a day's bucket. Three shapes land here
   and they all reduce to "add this signed count to this bucket":
     a sent batch      { batch: 34, batch_kind: 'cold' }
     a retraction      { batch: -2, batch_kind: 'followup' }
     a kind correction { batch: -34, batch_kind: 'cold', corrects: <id> }
                       { batch:  34, batch_kind: 'followup', corrects: <id> }
   Rows written before the toggle existed carry no kind; those were all first
   touches, so an absent kind means cold. Exported for the unit test. */
export function tallyBatch(bucket, next) {
  const n = Number(next.batch) || 0;
  if (next.batch_kind === 'followup') bucket.followups += n; else bucket.outreach += n;
  return bucket;
}

export async function setterStats(days = 14) {
  const n = Math.max(1, Math.min(days, 60));
  const dayKeys = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dayKeys.push(rigaDay(d));
  }
  const empty = () => ({ followups: 0, outreach: 0, newLeads: 0, booked: 0, closed: 0, cash: 0, replies: 0 });
  const byDay = new Map(dayKeys.map((k) => [k, empty()]));

  if (DEMO) {
    const seed = [ [22,95,6,1,0],[31,110,9,2,1],[18,0,3,0,0],[27,100,11,1,1],[35,120,8,3,0],[24,80,5,1,1],[12,0,2,0,0],
                   [29,105,10,2,1],[33,115,7,1,0],[21,90,6,2,1],[26,100,9,1,0],[30,110,12,2,2],[17,60,4,0,0],[19,74,6,1,1],
                   [28,100,8,2,1],[23,85,5,1,0],[34,118,10,2,1],[16,0,3,0,0],[25,95,7,1,1],[32,112,9,3,1],[20,70,4,0,0],
                   [27,102,8,1,1],[30,108,11,2,0],[18,55,3,0,1],[29,99,9,2,1],[36,125,12,3,2],[15,0,2,0,0],[24,88,6,1,0],
                   [31,106,10,2,1],[22,80,5,1,1] ];
    dayKeys.forEach((k, i) => {
      const [f, o, nl, b, c] = seed[i % seed.length];
      // derived so the demo funnel and revenue stay internally consistent
      byDay.set(k, { followups: f, outreach: o, newLeads: nl, booked: b, closed: c,
        cash: c * (1500 + ((i * 370) % 1900)), replies: Math.round(o * 0.05) + (o ? 1 : 0) });
    });
    return dayKeys.map((k) => ({ day: k, ...byDay.get(k) }));
  }

  const start = new Date(); start.setDate(start.getDate() - (n - 1)); start.setHours(0, 0, 0, 0);
  // one page is plenty at this team's volume; page anyway to be safe
  const rows = [];
  for (let off = 0; ; off += 1000) {
    const { data, error } = await supa.from('activity')
      .select('actor,action,prev,next,created_at,table_name')
      .in('table_name', ['leads', 'deals'])
      .gte('created_at', start.toISOString())
      .order('created_at').range(off, off + 999);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < 1000) break;
  }

  for (const r of rows) {
    const day = rigaDay(r.created_at);
    const b = byDay.get(day);
    if (!b) continue;
    const next = r.next || {}, prev = r.prev || {};
    const human = !String(r.actor || '').startsWith('ai:');
    if (r.table_name === 'deals') {
      // a close counts however it was recorded — voice log, drawer, or Fireflies
      if (next.status === 'Closed' && prev.status !== 'Closed') b.closed++;
      // the delta, not the value: correcting 3000 -> 3500 later adds 500, not 3500
      if (next.cash != null) b.cash += (Number(next.cash) || 0) - (Number(prev.cash) || 0);
      continue;
    }
    if (r.action === 'create' && human) {
      b.newLeads++;
      if (next.level === 'Booked') b.booked++;
      continue;
    }
    if (r.action !== 'update') continue; // import/restore don't count
    if (next.batch) { tallyBatch(b, next); continue; }
    if (human && next.last_contact) b.followups++;
    if (next.level && next.level !== prev.level) {
      if (next.level === 'Booked') b.booked++;
      // the only reply signal the system records: someone from the cold-DM pool
      // answered, so the setter logged them as a real lead
      if (isPool(prev.level)) b.replies++;
    }
  }
  return dayKeys.map((k) => ({ day: k, ...byDay.get(k) }));
}

/* ---------- prospecting: profile screenshot -> uncontacted lead ----------
   Distinct from logging a conversation: the setter FOUND this person and has
   not messaged them yet, so the lead enters the book as Engaged 1 with NO
   last_contact and a prospected_at stamp. The Uncontacted tab lists exactly
   these; marking them sent stamps last_contact and they leave the queue. */
/* Filler the scanner sometimes produces despite the prompt. A note has to be
   quotable in a DM; anything that is inference, hedging, meta-commentary, or
   a restatement of "they sell things online" is worse than an empty field. */
const NOTE_JUNK = [
  /\bbased on (the )?(post|profile|bio|content|image|screenshot)/i,
  /\b(appears|seems|likely|possibly|probably) to be\b/i,
  /\b(appears|seems|likely|possibly|probably)\b/i,
  /interested in (ecommerce|e-commerce|online business|marketing)/i,
  /\b(runs|has|sells) (an )?(online (store|business)|products?|ecommerce)\b/i,
  /\b(dropshipping|lifestyle)\s*\/\s*(dropshipping|lifestyle|brand)/i,
  /^\s*(ecommerce|e-commerce|ecom) (brand|store|business)\.?\s*$/i,
];
export function cleanNote(v) {
  const parts = String(v || '').split(/(?<=[.!?])\s+|\s*·\s*|\s*;\s*/)
    .map((x) => x.trim()).filter(Boolean)
    .filter((x) => !NOTE_JUNK.some((re) => re.test(x)));
  const out = parts.join('. ').replace(/\.\.+/g, '.').trim();
  // a note with no digit, no capitalised name and under ~4 words is filler
  if (out && out.length < 22 && !/\d/.test(out) && !/[A-Z][a-z]{2,}/.test(out)) return '';
  return out.replace(/\s*\.\s*$/, '');
}

export async function addProspects(cards) {
  const list = (cards || []).map((c) => ({
    h: String(c.handle || '').trim().toLowerCase().replace(/^@/, ''),
    stage: String(c.stage || '').trim(),   // empty = no stage until they reply
    notes: cleanNote(c.notes),
    qual: String(c.qual || '').trim(), pains: String(c.pains || '').trim(),
    story: c.story === 'yes', priv: c.priv === 'yes',
  })).filter((c) => c.h);
  if (!list.length) return { added: 0, skipped: 0, ids: [] };
  if (DEMO) {
    const ids = [], revived = [];
    let skipped = 0;
    for (const c of list) {
      const hit = _demo.leads.find((l) => l.h === c.h);
      if (hit && hit.level === 'Archive') {
        revived.push({ id: hit.id, prev: { level: hit.level, lastContact: hit.lastContact } });
        hit.level = ''; hit.lastContact = ''; hit.prospected = new Date().toISOString();
        if (c.story) hit.storySeenAt = new Date().toISOString();
        if (c.priv) hit.igStatus = 'private';
        continue;
      }
      if (hit) { skipped++; continue; }
      const id = Date.now() + Math.floor(Math.random() * 1e6);
      _demo.leads.push({ id, h: c.h, url: 'https://instagram.com/' + c.h, level: c.stage || '',
        status: '', qual: '', notes: c.notes, lastContact: '', dateAdded: todayDmy(),
        prospected: new Date().toISOString(),
        storySeenAt: c.story ? new Date().toISOString() : '', igStatus: c.priv ? 'private' : '' });
      ids.push(id);
    }
    return { added: ids.length, skipped, revived: revived.length, ids,
      undo: { _demoProspects: ids, _demoRevived: revived } };
  }
  // one existence check over the whole batch, not one query per card
  const { data: have } = await supa.from('leads')
    .select('id,handle,level,last_contact,outreach_hidden')
    .in('handle', list.map((c) => c.h));
  const byHandle = new Map((have || []).map((r) => [String(r.handle).toLowerCase(), r]));
  // An archived handle screenshotted back into the prospect queue is an
  // explicit "this IS a lead after all" — revive the existing row instead of
  // skipping it, so its history survives and no duplicate is created.
  const revived = [];
  for (const c of list) {
    const hit = byHandle.get(c.h);
    if (!hit || hit.level !== 'Archive') continue;
    const prev = { level: hit.level, last_contact: hit.last_contact, outreach_hidden: hit.outreach_hidden };
    const patch = { level: null, last_contact: null, outreach_hidden: false,
      prospected_at: new Date().toISOString() };
    if (c.story) patch.story_seen_at = new Date().toISOString();
    if (c.priv) patch.ig_status = 'private';
    const { error } = await supa.from('leads').update(patch).eq('id', hit.id);
    if (error) throw new Error(error.message);
    // a revive is a new lead for the KPI — it re-enters the queue as one
    await logActivity('leads', hit.id, 'create', prev,
      { handle: c.h, source: 'prospect-scan', revived: true });
    revived.push({ id: hit.id, prev });
  }
  const fresh = list.filter((c) => !byHandle.has(c.h));
  const ids = [];
  for (const c of fresh) {
    const { data, error } = await supa.from('leads').insert({
      handle: c.h, ig_url: 'https://www.instagram.com/' + c.h + '/',
      level: c.stage || null, last_contact: null, prospected_at: new Date().toISOString(),
      date_added: dmyToIso(todayDmy()), notes: c.notes || null,
      qualification: c.qual || null, pain_points: c.pains || null,
      story_seen_at: c.story ? new Date().toISOString() : null,
      ig_status: c.priv ? 'private' : null,
    }).select('id').single();
    if (error) throw new Error(error.message);
    ids.push(data.id);
    // one create row per lead — this IS the newLeads KPI counter
    await logActivity('leads', data.id, 'create', null,
      { handle: c.h, level: c.stage, source: 'prospect-scan' });
  }
  return { added: ids.length, skipped: list.length - fresh.length - revived.length,
    revived: revived.length, ids, undo: { prospectIds: ids, revived } };
}
export async function undoProspects(undo) {
  if (undo && (undo._demoProspects || undo._demoRevived)) {
    _demo.leads = _demo.leads.filter((l) => (undo._demoProspects || []).indexOf(l.id) < 0);
    (undo._demoRevived || []).forEach((r) => {
      const l = _demo.leads.find((x) => x.id === r.id);
      if (l) { l.level = r.prev.level; l.lastContact = r.prev.lastContact; l.prospected = ''; }
    });
    return { ok: true };
  }
  // a revived lead goes back to the archive it came out of
  for (const r of (undo && undo.revived) || []) {
    await supa.from('leads').update({ level: r.prev.level, last_contact: r.prev.last_contact,
      outreach_hidden: r.prev.outreach_hidden, prospected_at: null }).eq('id', r.id);
  }
  const ids = (undo && undo.prospectIds) || [];
  if (!ids.length) return { ok: true, deleted: 0 };
  // only rows still uncontacted — a prospect already messaged is real history
  const { data, error } = await supa.from('leads').delete()
    .in('id', ids).is('last_contact', null).select('id');
  if (error) throw new Error(error.message);
  dropBookCache();
  return { ok: true, deleted: (data || []).length, kept: ids.length - (data || []).length };
}

/* ---------- state-derived numbers (stock, not flow) ----------
   setterStats reads the activity log, which only knows what has happened since
   the app went live. These read the tables themselves, so they describe the
   whole book — 1,000+ leads imported before any of it was logged included. */

const DEAD_LEVELS = ['Archive', 'Closed', 'Outreach', 'Following'];

/** What's sitting in the pipeline right now, and what's rotting in it.
 *  `stale` uses the worklist's own overdue window so the two screens can never
 *  disagree about what "overdue" means. */
export async function pipelineHealth() {
  const rules = await worklistRules();
  const cutoffMs = Date.now() - rules.overdueDays * 86400000;
  if (DEMO) {
    return { total: 1160, byLevel: { 'Engaged 1': 185, 'Engaged 2': 67, 'Engaged 3': 27,
      'Booked': 19, 'No Reply': 95, 'No Close': 6, 'Closed': 8, 'Archive': 629 },
      stale: 356, never: 167, noLevel: 130, overdueDays: rules.overdueDays };
  }
  const rows = await pagedSelect('leads', 'level,last_contact');
  const byLevel = {};
  let stale = 0, never = 0, noLevel = 0;
  for (const r of rows) {
    const lv = r.level || null;
    if (!lv) noLevel++; else byLevel[lv] = (byLevel[lv] || 0) + 1;
    if (DEAD_LEVELS.indexOf(lv) >= 0) continue;
    // kept apart: "went quiet" and "never worked at all" are different problems
    if (!r.last_contact) never++;
    else if (Date.parse(r.last_contact + 'T12:00:00') < cutoffMs) stale++;
  }
  return { total: rows.length, byLevel, stale, never, noLevel, overdueDays: rules.overdueDays };
}

/** The funnel as it stands over the whole book, not just the logged window.
 *  `booked` counts leads that ever reached a call (they carry a deal), so a
 *  lead now marked Closed still counts as booked on the way through. */
export async function funnelAllTime() {
  if (DEMO) return { leads: 1160, booked: 33, closed: 8, cash: 24500, pool: 812 };
  const count = async (q) => { const { count: c } = await q; return c || 0; };
  const [leads, pool, deals, closed] = await Promise.all([
    count(supa.from('leads').select('id', { count: 'exact', head: true }).not('level', 'in', '("Outreach","Following")')),
    count(supa.from('leads').select('id', { count: 'exact', head: true }).in('level', POOL_VALUES)),
    count(supa.from('deals').select('id', { count: 'exact', head: true })),
    count(supa.from('deals').select('id', { count: 'exact', head: true }).eq('status', 'Closed')),
  ]);
  const { data: cashRows } = await supa.from('deals').select('cash').eq('status', 'Closed');
  const cash = (cashRows || []).reduce((a, d) => a + (Number(d.cash) || 0), 0);
  return { leads, booked: deals, closed, cash, pool };
}

/** Why deals died, verbatim. Identical text is grouped and counted; nothing is
 *  bucketed into invented categories — the wording is the finding. */
export async function noCloseReasons(limit = 20) {
  if (DEMO) {
    return [{ reason: 'price — wants to start at half the retainer', n: 3, last: '18/07' },
            { reason: 'timing, revisiting after their Q3 launch', n: 2, last: '15/07' },
            { reason: 'went with an in-house hire instead', n: 1, last: '11/07' }];
  }
  const { data, error } = await supa.from('deals')
    .select('no_close_reason,updated_at').eq('status', 'No Close')
    .not('no_close_reason', 'is', null).order('updated_at', { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  const seen = new Map();
  for (const d of data || []) {
    const key = String(d.no_close_reason || '').trim();
    if (!key) continue;
    const dt = new Date(d.updated_at);
    const last = String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0');
    if (seen.has(key)) seen.get(key).n++;
    else seen.set(key, { reason: key, n: 1, last });
  }
  return [...seen.values()].sort((a, b) => b.n - a.n).slice(0, limit);
}

/** Backlog history. Current state can't be rewound, so the evening job writes a
 *  row a day; before those accumulate there is simply nothing to draw. */
export async function snapshotTrend(days = 30) {
  if (DEMO) {
    return Array.from({ length: 14 }, (_, i) => ({
      day: rigaDay(new Date(Date.now() - (13 - i) * 86400000)),
      stale: 402 - i * 4 + (i % 3) * 6, noLevel: 130 }));
  }
  const from = rigaDay(new Date(Date.now() - days * 86400000));
  const { data, error } = await supa.from('daily_snapshot')
    .select('day,data').gte('day', from).order('day');
  if (error) return []; // table may not exist yet on an older deploy
  return (data || []).map((r) => {
    const v = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
    return { day: r.day, stale: Number(v.stale) || 0, noLevel: Number(v.noLevel) || 0 };
  });
}

/* ---------- single-page shell ----------
   Sidebar clicks swap the page in place: fetch the target html, cross-fade
   the content, re-run its script — the document, sidebar, module graph and
   caches all survive. Any error falls back to a normal navigation, so the
   worst case is exactly the old behavior.

   Page scripts register document/window listeners and timers through
   pageListen/pageInterval so a swap can unhook them; element-scoped
   listeners die with their nodes and need nothing. */

let _pageCleanups = [];
export function pageListen(target, type, fn, opts) {
  target.addEventListener(type, fn, opts);
  _pageCleanups.push(() => target.removeEventListener(type, fn, opts));
}
export function pageInterval(fn, ms) {
  const id = setInterval(fn, ms);
  _pageCleanups.push(() => clearInterval(id));
  return id;
}
function runPageCleanups() {
  _pageCleanups.splice(0).forEach((f) => { try { f(); } catch (e) { /* leaving anyway */ } });
  // the palette closes over per-page data (leads list, jump actions) — drop it
  // so the next page installs a fresh one
  const pal = document.getElementById('ck-pal'); if (pal) pal.remove();
  const sc = document.getElementById('sc2-modal'); if (sc) sc.remove();
}

const SPA_PAGES = ['worklist.html', 'log-lead.html', 'leads.html', 'report.html',
  'deals.html', 'settings.html'];

export function initRouter() {
  if (window.__ajrRouter) return;
  window.__ajrRouter = true;
  // tag this document's own page styles so a swap can replace them
  document.querySelectorAll('head style:not(#v2-theme)').forEach((st) => st.setAttribute('data-page-style', ''));
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.getAttribute('href'), location.href);
    if (url.origin !== location.origin) return;
    if (!SPA_PAGES.includes(url.pathname.split('/').pop())) return;
    e.preventDefault();
    navigate(url.href);
  });
  window.addEventListener('popstate', () => {
    swapTo(location.href).catch(() => location.reload());
  });
}

export async function navigate(href) {
  const u = new URL(href, location.href);
  try {
    history.pushState({}, '', u.pathname + u.search);
    await swapTo(u.href);
  } catch (err) {
    location.href = u.href; // never strand the user in a broken shell
  }
}

async function swapTo(href) {
  const t0 = performance.now();
  const res = await fetch(href, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('fetch ' + res.status);
  const doc = new DOMParser().parseFromString(await res.text(), 'text/html');

  // a page that needs parser.js, entered from one that didn't load it
  if (!window.CRMParse && doc.querySelector('script[src*="parser.js"]')) {
    await new Promise((ok, no) => {
      const sc = document.createElement('script');
      sc.src = new URL('./parser.js', location.href).href;
      sc.onload = ok; sc.onerror = no;
      document.head.append(sc);
    });
  }

  const apply = () => {
    runPageCleanups();
    document.title = doc.title;
    document.querySelectorAll('head style[data-page-style]').forEach((el) => el.remove());
    doc.querySelectorAll('head style:not(#v2-theme)').forEach((st) => {
      const el = document.createElement('style');
      el.textContent = st.textContent;
      el.setAttribute('data-page-style', '');
      document.head.append(el);
    });
    // #v2-menu is a singleton guarded by id — removing it here would let the
    // next page's installChrome() stack a second set of document listeners
    document.dispatchEvent(new Event('v2-menu-close'));
    const keep = new Set([document.querySelector('.v2-side'), document.querySelector('.v2-toasts'),
      document.getElementById('v2-menu')]);
    Array.from(document.body.children).forEach((el) => { if (!keep.has(el)) el.remove(); });
    Array.from(doc.body.children)
      .filter((el) => !el.classList.contains('v2-side') && el.tagName !== 'SCRIPT')
      .forEach((el) => document.body.appendChild(document.importNode(el, true)));
    window.scrollTo(0, 0);
  };
  // same-document view transition: this is the cross-fade Safari DOES support
  if (document.startViewTransition) {
    await document.startViewTransition(apply).updateCallbackDone;
  } else {
    apply();
  }

  // run the page's inline module. Its './' imports resolve against a blob URL,
  // so rebase them onto this directory first — same-URL imports (crm-core)
  // return the already-loaded singleton, which is the whole point.
  const mod = doc.querySelector('body script[type="module"]');
  if (mod) {
    const base = new URL('./', location.href).href;
    const code = mod.textContent.split("'./").join("'" + base);
    const burl = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    try { await import(burl); } finally { URL.revokeObjectURL(burl); }
  }
  try { // one row per swap so the field data shows what SPA navs actually cost
    if (!DEMO) _spaLog({ page: href.split('/').pop().split('?')[0], ts: new Date().toISOString().slice(0, 19),
      spa: true, ms: Math.round(performance.now() - t0) });
  } catch (e) { /* diagnostics */ }
}
async function _spaLog(entry) {
  const { data } = await supa.from('settings').select('value').eq('key', 'perf_log').maybeSingle();
  let log = []; try { log = JSON.parse((data && data.value) || '[]'); } catch (e) { /* reset */ }
  log.push(entry);
  await supa.from('settings').upsert({ key: 'perf_log', value: JSON.stringify(log.slice(-30)), updated_at: new Date().toISOString() });
}

/* ---------- shared chrome (v2 "paper" design) ----------
   One sidebar + one set of tokens for every page, so the app can't drift
   screen to screen. Pages call installChrome({active}) and render into
   <main class="v2-main">. */

const V2_CSS = `
@view-transition{navigation:auto}
:root{
  --bg:#f9f8f5; --side:#f4f2ed; --card:#fff; --rowsel:#fdfcf9;
  --line:#e6e2da; --line-2:#ddd8cd; --divider:#f0ede6;
  --ink:#211f1b; --ink-2:#4d4a42; --ink-3:#6d675b; --muted:#8a8375; --muted-2:#98917f; --off:#ccc5b6;
  --go:#2a6a4d; --go-hi:#1d4d37; --go-tint:#eef5f0; --go-line:#c9dfd2; --done:#f7faf7;
  --red:#b4543e; --amber:#a8762a; --amber-tint:#faf3e6;
  --ai:#7c56c9; --ai-line:#e2d9f4; --ai-tint:#f6f2fb;
  --font:'Instrument Sans',system-ui,sans-serif; --mono:'IBM Plex Mono',ui-monospace,monospace;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
[hidden]{display:none!important}
body{background:var(--bg);color:var(--ink);font-family:var(--font);font-size:13px;line-height:1.5;-webkit-font-smoothing:antialiased}
button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer;border:none;background:none}
a{color:var(--go);text-decoration:none}
a:hover{color:var(--go-hi)}
:focus{outline:none}
:focus-visible{outline:2px solid var(--ink);outline-offset:2px;border-radius:6px}
.mono{font-family:var(--mono);font-variant-numeric:tabular-nums}
input::placeholder,textarea::placeholder{color:var(--off)}

/* layout */
.v2-shell{display:flex;min-height:100vh}
.v2-side{width:206px;flex:none;border-right:1px solid var(--line);background:var(--side);padding:20px 14px;
  display:flex;flex-direction:column;gap:3px;position:sticky;top:0;height:100vh;
  align-self:flex-start} /* flex would stretch it and break position:sticky */
.v2-side .wm{font-weight:700;font-size:14px;letter-spacing:.02em;padding:2px 10px 16px}
.v2-side .grp{font:600 10.5px var(--font);letter-spacing:.1em;color:var(--muted-2);padding:4px 10px}
.v2-side .grp.gap{padding-top:14px}
.v2-side a.nav{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:8px;color:var(--ink-2);font-size:13.5px}
.v2-side a.nav:hover{background:rgba(33,31,27,.05);color:var(--ink)}
.v2-side a.nav.on{background:var(--ink);color:var(--bg);font-weight:600}
.v2-side a.nav.on:hover{background:var(--ink);color:var(--bg)}
.v2-side .badge-n{margin-left:auto;font:600 11px var(--mono);background:rgba(255,255,255,.18);border-radius:99px;padding:1px 7px}
.v2-side a.nav:not(.on) .badge-n{background:transparent;color:var(--muted);padding:0}
.v2-side .badge-red{margin-left:auto;font-size:11px;color:var(--red);font-weight:600}
.v2-side .badge-dot{margin-left:auto;width:7px;height:7px;border-radius:50%;background:var(--go);flex:none}
.v2-side a.nav.on .badge-dot{background:var(--bg)}
.v2-side .sp{flex:1}
.v2-side .krow{display:flex;align-items:center;gap:8px;padding:8px 10px;color:var(--muted-2);font-size:12px;cursor:pointer}
.v2-side .krow kbd{margin-left:auto;font:600 11px var(--mono);border:1px solid var(--line-2);border-radius:5px;padding:1px 6px;background:#fff;color:var(--ink-3)}
.v2-side .me{display:flex;align-items:center;gap:9px;padding:10px 10px 2px;border-top:1px solid var(--line);margin-top:6px}
.v2-side .me .av{width:26px;height:26px;border-radius:50%;background:var(--ink);color:var(--bg);display:inline-flex;
  align-items:center;justify-content:center;font:600 11px var(--mono);flex:none}
.v2-side .me .nm{display:block;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.v2-side .me .rl{display:block;font-size:11px;color:var(--muted-2)}
.v2-side .me .out{margin-left:auto;color:var(--muted-2);font-size:11px}
.v2-main{flex:1;min-width:0;padding:26px 30px 60px}
@media(max-width:900px) and (min-width:761px){.v2-side{width:64px;padding:16px 8px}.v2-side .wm,.v2-side .grp,.v2-side .krow,.v2-side .me .nm,.v2-side .me .rl{display:none}}
/* phone: the sidebar becomes a scrolling top strip. As a 64px rail it ate a
   third of the screen and wrapped every label onto three lines. */
@media(max-width:760px){
  .v2-shell{display:block}
  .v2-side{flex-direction:row;width:auto;height:auto;align-items:center;gap:6px;padding:8px 10px;
    border-right:none;border-bottom:1px solid var(--line);overflow-x:auto;-webkit-overflow-scrolling:touch;
    position:sticky;top:0;z-index:20}
  .v2-side::-webkit-scrollbar{display:none}
  .v2-side .wm,.v2-side .grp,.v2-side .krow,.v2-side .sp,.v2-side .me .nm,.v2-side .me .rl{display:none}
  .v2-side a.nav{white-space:nowrap;padding:9px 13px;min-height:40px;font-size:13px}
  .v2-side .badge-n,.v2-side .badge-red{margin-left:6px}
  .v2-side .me{border-top:none;margin:0 0 0 auto;padding:0 0 0 6px}
  .v2-main{padding:16px 14px 60px}
  .v2-h{flex-wrap:wrap;gap:8px}
  .v2-h h1{font-size:20px}
}

/* headers */
.v2-h{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:16px}
.v2-h h1{font-size:21px;font-weight:700;letter-spacing:-.01em}
.v2-h .sub{color:var(--muted);font-size:13px}
.v2-h .sp{flex:1}
.v2-lab{font:600 10px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted-2)}

/* chips */
.v2-chips{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px}
.v2-chip{min-height:32px;padding:0 14px;border-radius:99px;border:1px solid var(--line-2);background:#fff;
  color:var(--ink-2);font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px}
.v2-chip:hover{border-color:var(--muted-2)}
.v2-chip.on{background:var(--ink);color:var(--bg);border-color:var(--ink);font-weight:600}
.v2-chip .n{font-family:var(--mono);font-size:11.5px;opacity:.75}
.v2-chip.green{background:var(--go-tint);border-color:var(--go-line);color:var(--go)}
.v2-chip.red{background:#fbf0ed;border-color:#e8cec6;color:var(--red)}

/* buttons */
.v2-btn{min-height:34px;padding:0 14px;border-radius:8px;border:1px solid var(--line-2);background:#fff;
  color:var(--ink-2);font-size:12.5px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:7px}
.v2-btn:hover:not(:disabled){border-color:var(--muted-2);color:var(--ink)}
.v2-btn:disabled{opacity:.45;cursor:not-allowed}
.v2-btn.go{background:var(--go);border-color:var(--go);color:#fff}
.v2-btn.go:hover:not(:disabled){background:var(--go-hi);border-color:var(--go-hi);color:#fff}
.v2-btn.goline{background:#fff;border-color:var(--go-line);color:var(--go)}
.v2-btn.goline:hover:not(:disabled){background:var(--go-tint);color:var(--go)}
.v2-btn.dark{background:var(--ink);border-color:var(--ink);color:var(--bg)}
.v2-btn.dark:hover:not(:disabled){filter:brightness(1.35)}
.v2-btn.dash{border-style:dashed;color:var(--muted);font-weight:500;background:transparent}
.v2-btn.dash:hover{color:var(--ink-2)}
.v2-btn.sm{min-height:28px;padding:0 10px;font-size:11.5px}

/* inputs */
.v2-in{min-height:34px;padding:7px 12px;background:#fff;border:1px solid var(--line-2);border-radius:8px;
  color:var(--ink);font-size:13px;width:100%;
  transition:border-color .16s ease, box-shadow .16s ease, background-color .16s ease}
.v2-in:hover{border-color:var(--muted-2)}
.v2-in:focus{border-color:var(--ink-3);box-shadow:0 0 0 3px rgba(33,31,27,.07)}
/* native selects render differently on every OS — draw our own chevron so the
   closed state matches the rest of the paper UI */
select.v2-in{cursor:pointer;appearance:none;-webkit-appearance:none;padding-right:30px;
  background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238a8375' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 9px center;background-size:14px}
select.v2-in:hover{background-color:var(--rowsel)}
/* the OPEN list of a native select is drawn by the OS (dark grey on macOS) and
   cannot be styled — so on pointer devices we draw our own and keep the real
   <select> underneath for state, change events and keyboard control */
#v2-menu{position:fixed;z-index:200;background:var(--card);border:1px solid var(--line);border-radius:11px;
  box-shadow:0 14px 38px -10px rgba(33,31,27,.32), 0 2px 6px rgba(33,31,27,.06);
  padding:5px;max-height:min(58vh,340px);overflow-y:auto;min-width:150px;
  animation:v2menu .13s ease-out}
@keyframes v2menu{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
#v2-menu button{display:flex;align-items:center;gap:8px;width:100%;text-align:left;
  padding:8px 10px 8px 8px;border-radius:8px;font:500 13px var(--font);color:var(--ink-2);
  white-space:nowrap;cursor:pointer;transition:background-color .12s ease,color .12s ease}
#v2-menu button:hover,#v2-menu button.cur{background:var(--divider);color:var(--ink)}
#v2-menu button.on{color:var(--go-hi);font-weight:600}
#v2-menu button.on:hover{background:var(--go-tint)}
#v2-menu .tick{width:14px;height:14px;flex:none;opacity:0}
#v2-menu button.on .tick{opacity:1}
select.v2-in:disabled{opacity:.55;cursor:not-allowed}
input[type=date].v2-in{cursor:pointer}
textarea.v2-in{min-height:76px;resize:vertical;line-height:1.55}

/* cards + tables */
.v2-card{background:var(--card);border:1px solid var(--line);border-radius:12px}
.v2-thead{display:grid;gap:10px;padding:9px 18px;font:600 10px var(--mono);letter-spacing:.1em;
  text-transform:uppercase;color:var(--muted-2);border-bottom:1px solid var(--divider)}
.v2-row{display:grid;gap:10px;padding:13px 18px;align-items:center;border-top:1px solid var(--divider)}
.v2-row:first-of-type{border-top:none}
.v2-row:hover{background:var(--rowsel)}
.v2-scroll{overflow-x:auto}
.v2-empty{padding:30px 18px;text-align:center;color:var(--muted)}

/* semantic bits */
.v2-age{font-family:var(--mono);font-size:12.5px;color:var(--ink-3)}
.v2-age.warn{color:var(--amber);font-weight:600}
.v2-age.late{color:var(--red);font-weight:600}
.v2-ai{display:inline-flex;align-items:center;gap:4px;font:600 10.5px var(--mono);color:var(--ai);
  border:1px solid var(--ai-line);border-radius:99px;padding:1px 7px;white-space:nowrap}
.v2-money{font-family:var(--mono);font-weight:600;color:var(--go)}

/* toasts */
.v2-toasts{position:fixed;z-index:80;bottom:20px;left:50%;transform:translateX(-50%);display:flex;
  flex-direction:column;gap:9px;width:min(460px,calc(100vw - 32px))}
.v2-toast{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--line);
  border-radius:10px;padding:12px 15px;font-size:13px;box-shadow:0 8px 24px -12px rgba(33,31,27,.25)}
.v2-toast.err{border-color:#e8cec6;background:#fbf0ed;color:var(--red)}
.v2-toast .sp{flex:1}
.v2-toast button{color:var(--go);font-weight:600;font-size:12.5px}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;

const V2_FONTS = 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap';

const NAV_ITEMS = [
  { grp: 'SETTER' },
  { id: 'worklist', label: 'Worklist', href: 'worklist.html' },
  { id: 'log-lead', label: 'Log a lead', href: 'log-lead.html' },
  { id: 'newleads', label: 'New leads', href: 'newleads.html' },
  { id: 'leads', label: 'All leads', href: 'leads.html' },
  { id: 'leadpools', label: 'Leadpools', href: 'leadpools.html' },
  { id: 'assistant', label: 'Assistant', href: 'assistant.html' },
  { id: 'report', label: 'Dashboard', href: 'report.html' },
  { id: 'briefing', label: 'Briefing', href: 'briefing.html' },
  { grp: 'CLOSER', gap: true },
  { id: 'deals', label: 'Deals', href: 'deals.html' },
];

/** Inject the v2 stylesheet + fonts once. Safe to call from any page. */
export function installTheme() {
  try {
    if (!document.querySelector('script[type="speculationrules"]')
        && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {
      const sr = document.createElement('script');
      sr.type = 'speculationrules';
      const others = ['worklist', 'log-lead', 'leads', 'deals', 'report', 'settings']
        .map((p) => p + '.html')
        .filter((p) => !location.pathname.endsWith('/' + p));
      sr.textContent = JSON.stringify({
        // Chrome only honors TWO immediate prerenders — spend them on the
        // likeliest next pages, prefetch the rest, hover-prerender everything.
        prerender: [
          { urls: others.slice(0, 2), eagerness: 'immediate' },
          { where: { href_matches: '/*\\.html*' }, eagerness: 'moderate' },
        ],
        prefetch: [{ urls: others.slice(2), eagerness: 'immediate' }],
      });
      document.head.append(sr);
    }
  } catch (e) { /* an optimization, never a requirement */ }
  if (document.getElementById('v2-theme')) { // baked into the HTML at build time
    document.documentElement.classList.remove('v2-boot');
    return;
  }
  const pre1 = document.createElement('link'); pre1.rel = 'preconnect'; pre1.href = 'https://fonts.googleapis.com';
  const pre2 = document.createElement('link'); pre2.rel = 'preconnect'; pre2.href = 'https://fonts.gstatic.com'; pre2.crossOrigin = '';
  const f = document.createElement('link'); f.rel = 'stylesheet'; f.href = V2_FONTS;
  const s = document.createElement('style'); s.id = 'v2-theme'; s.textContent = V2_CSS;
  document.head.append(pre1, pre2, f, s);
  document.documentElement.classList.remove('v2-boot'); // theme is in — reveal
}

/** Render the shared sidebar and wrap the page's <main>. Badges fill in async. */
/* TEMPORARY diagnostic: record where each real page load spent its time, so
   slowness can be diagnosed from actual field numbers instead of guesses.
   Kept to the last 30 views in settings.perf_log; remove once solved. */
function perfBeacon() {
  if (DEMO) return;
  if (window.__beaconed) return; // SPA swaps re-run installChrome in the same document
  window.__beaconed = true;
  if (document.prerendering) { // log it when (if) the user actually arrives
    document.addEventListener('prerenderingchange', () => perfBeacon(), { once: true });
    return;
  }
  setTimeout(async () => {
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      const rs = performance.getEntriesByType('resource');
      const pick = (m) => rs.filter((r) => r.name.includes(m));
      const span = (list) => list.length
        ? Math.round(Math.max(...list.map((r) => r.startTime + r.duration)) - Math.min(...list.map((r) => r.startTime)))
        : 0;
      const entry = {
        page: location.pathname.split('/').pop(),
        ts: new Date().toISOString().slice(0, 19),
        navMs: Math.round(nav ? nav.duration : 0),
        prerendered: !!(nav && nav.activationStart > 0), // click landed on an already-built page
        htmlMs: Math.round(nav ? nav.responseEnd : 0),
        coreFetchMs: Math.round((pick('crm-core.js')[0] || {}).duration || 0),
        sbFetchMs: Math.round((pick('supabase-js.mjs')[0] || {}).duration || 0),
        cached: ((pick('supabase-js.mjs')[0] || {}).transferSize === 0),
        authMs: span(pick('/auth/v1/')),
        restCount: pick('/rest/v1/').length,
        restSpanMs: span(pick('/rest/v1/')),
        restStartMs: Math.round(Math.min(...pick('/rest/v1/').map((r) => r.startTime), 99999)),
      };
      const { data } = await supa.from('settings').select('value').eq('key', 'perf_log').maybeSingle();
      let log = []; try { log = JSON.parse((data && data.value) || '[]'); } catch (e) { /* reset */ }
      log.push(entry);
      await supa.from('settings').upsert({ key: 'perf_log', value: JSON.stringify(log.slice(-30)), updated_at: new Date().toISOString() });
    } catch (e) { /* diagnostics must never hurt the page */ }
  }, 3000);
}

/** Replace the OS-drawn select popup with one that matches the app.
 *  The native <select> stays in the DOM and keeps its value, so every existing
 *  change handler works untouched; we only intercept the pointer that would
 *  open the OS list. Touch devices keep their native picker — the iOS wheel is
 *  better than anything we'd draw. */
export function installSelectMenu() {
  if (document.getElementById('v2-menu')) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const esc = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TICK = '<svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>';
  const menu = document.createElement('div');
  menu.id = 'v2-menu'; menu.hidden = true; menu.setAttribute('role', 'listbox');
  document.body.appendChild(menu);
  let cur = null;

  const close = () => { menu.hidden = true; cur = null; };
  function open(sel) {
    cur = sel;
    menu.innerHTML = [...sel.options].map((o, i) =>
      `<button type="button" role="option" data-i="${i}" class="${o.value === sel.value ? 'on' : ''}">` +
      TICK + esc(o.textContent) + '</button>').join('');
    menu.style.top = '-9999px'; menu.hidden = false;      // measure before placing
    const r = sel.getBoundingClientRect();
    menu.style.minWidth = Math.max(r.width, 150) + 'px';
    const mh = menu.offsetHeight, mw = menu.offsetWidth;
    // some embedded/preview contexts report innerHeight 0 — fall back rather
    // than clamp the menu to the top-left corner
    const vh = window.innerHeight || document.documentElement.clientHeight || 800;
    const vw = window.innerWidth || document.documentElement.clientWidth || 1200;
    // below unless it would run off the bottom and there's more room above
    const below = vh - r.bottom;
    const top = (below >= mh + 8 || r.top < mh + 8) ? r.bottom + 4 : r.top - mh - 4;
    menu.style.top = Math.max(8, Math.min(top, Math.max(8, vh - mh - 8))) + 'px';
    menu.style.left = Math.max(8, Math.min(r.left, Math.max(8, vw - mw - 8))) + 'px';
    const on = menu.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });
    try { sel.focus({ preventScroll: true }); } catch (e) { sel.focus(); } // keep arrow keys working
  }
  function pick(i) {
    if (!cur) return;
    if (cur.selectedIndex !== i) {
      cur.selectedIndex = i;
      cur.dispatchEvent(new Event('change', { bubbles: true }));
    }
    close();
  }

  document.addEventListener('mousedown', (e) => {
    const sel = e.target.closest('select');
    if (sel && !sel.disabled && !sel.multiple) {
      e.preventDefault();               // stops the OS popup
      if (cur === sel) close(); else open(sel);
      return;
    }
    if (!e.target.closest('#v2-menu')) close();
  }, true);
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]');
    if (b) pick(+b.getAttribute('data-i'));
  });
  // scrolling or resizing would leave the menu stranded next to nothing
  window.addEventListener('scroll', () => { if (cur) close(); }, true);
  window.addEventListener('resize', () => { if (cur) close(); });
  document.addEventListener('v2-menu-close', close);   // SPA navigation
  document.addEventListener('keydown', (e) => {
    if (!cur) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    const btns = [...menu.querySelectorAll('button[data-i]')];
    let i = btns.findIndex((b) => b.classList.contains('cur'));
    if (i < 0) i = btns.findIndex((b) => b.classList.contains('on'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      i = Math.max(0, Math.min(btns.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
      btns.forEach((b) => b.classList.remove('cur'));
      btns[i].classList.add('cur'); btns[i].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && i >= 0) { e.preventDefault(); pick(i); }
  });
}

export async function installChrome(opts = {}) {
  installTheme();
  installSelectMenu();
  perfBeacon();
  initRouter();
  try { navigator.serviceWorker && navigator.serviceWorker.register('./sw.js'); } catch (e) { /* optional */ }
  const active = opts.active || '';
  let side = document.querySelector('.v2-side');
  if (side) {
    // baked at build time — just make sure the highlighted item is this page
    side.querySelectorAll('a.nav').forEach((a) => {
      const id = a.getAttribute('data-nav');
      a.classList.toggle('on', id ? id === active : active === 'settings');
    });
  } else {
  side = document.createElement('nav');
  side.className = 'v2-side';
  side.innerHTML =
    '<div class="wm">AJR&nbsp;CRM</div>' +
    NAV_ITEMS.map((it) => it.grp
      ? '<div class="grp' + (it.gap ? ' gap' : '') + '">' + it.grp + '</div>'
      : '<a class="nav' + (it.id === active ? ' on' : '') + '" href="' + it.href + '" data-nav="' + it.id + '">' +
        it.label + '<span class="slot" data-slot="' + it.id + '"></span></a>').join('') +
    '<div class="sp"></div>' +
    '<a class="nav' + (active === 'settings' ? ' on' : '') + '" href="settings.html">Settings</a>' +
    '<div class="krow" id="v2-k">Search / say it<kbd>⌘K</kbd></div>' +
    '<div class="me"><span class="av" id="v2-av">·</span>' +
      '<span style="min-width:0"><span class="nm" id="v2-nm">…</span><span class="rl" id="v2-rl"></span></span>' +
      '<button class="out" id="v2-out" title="Sign out">↩</button></div>';
  document.body.prepend(side);
  document.body.classList.add('v2-shell');
  }
  side.querySelector('#v2-k').onclick = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
  };
  side.querySelector('#v2-out').onclick = () => signOut();

  // Identity and badges are decoration — they fill in whenever their queries
  // land. Awaiting them here held EVERY page's data fetch hostage to two
  // sidebar round trips, which is why the whole app felt slow.
  (async () => {
    try {
      const email = await userEmail();
      const role = await roleFor(email);
      const name = String(email || '').split('@')[0];
      side.querySelector('#v2-av').textContent = (name[0] || '·').toUpperCase();
      side.querySelector('#v2-nm').textContent = name;
      side.querySelector('#v2-rl').textContent = role;
    } catch (e) { /* chrome still renders */ }
  })();
  // let the render-blocking gate go: two frames from now the theme, sidebar
  // and (with warm caches) the page's first data render are all painted
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (window.__reveal) window.__reveal();
  }));
  (async () => {
    try {
      const b = await chromeCounts();
      const w = side.querySelector('[data-slot="worklist"]');
      if (w && b.waiting) w.outerHTML = '<span class="badge-n">' + b.waiting + '</span>';
      const d = side.querySelector('[data-slot="deals"]');
      if (d && b.today) d.outerHTML = '<span class="badge-red">' + b.today + ' today</span>';
      const brNav = side.querySelector('a[data-nav="briefing"]');
      if (b.briefingAt && b.briefingAt !== briefingSeen() && brNav && !brNav.classList.contains('on')) {
        const br = side.querySelector('[data-slot="briefing"]');
        if (br) br.outerHTML = '<span class="badge-dot" title="New briefing"></span>';
      }
    } catch (e) { /* badges are decorative */ }
  })();
  return side;
}

/* The Briefing tab carries an unread dot until the page is opened. "Unread"
   is just "the published timestamp differs from the one last seen here". */
const BRIEF_SEEN = 'ajr_briefing_seen';
export function briefingSeen() {
  try { return localStorage.getItem(BRIEF_SEEN) || ''; } catch (e) { return ''; }
}
export function markBriefingSeen(stamp) {
  try { localStorage.setItem(BRIEF_SEEN, String(stamp || '')); } catch (e) {}
  const br = document.querySelector('.v2-side a[data-nav="briefing"] .badge-dot');
  if (br) br.outerHTML = '<span class="slot" data-slot="briefing"></span>';
}

/** Let a page correct its own sidebar badge once it knows the real number
 *  (the worklist excludes snoozed/sweepable leads, which chrome can't see). */
export function setChromeBadge(id, value) {
  const a = document.querySelector('.v2-side a[data-nav="' + id + '"]');
  if (!a) return;
  const old = a.querySelector('.badge-n, .badge-red, .slot');
  const cls = id === 'deals' ? 'badge-red' : 'badge-n';
  const html = value ? '<span class="' + cls + '">' + value + '</span>' : '<span class="slot"></span>';
  if (old) old.outerHTML = html; else a.insertAdjacentHTML('beforeend', html);
}

async function chromeCounts() {
  if (DEMO) return { waiting: 9, today: 2, briefingAt: 'demo-briefing' };
  const today = dmyToIso(todayDmy());
  const [w, t, b] = await Promise.all([
    supa.from('leads').select('id', { count: 'exact', head: true }).in('level', ['Engaged 1', 'Engaged 2', 'Engaged 3']),
    supa.from('deals').select('id', { count: 'exact', head: true }).eq('meeting', today),
    // timestamp only — the briefing payload itself is never pulled for a dot
    supa.from('settings').select('updated_at').eq('key', 'daily_briefing').maybeSingle(),
  ]);
  return { waiting: w.count || 0, today: t.count || 0,
    briefingAt: (b && b.data && b.data.updated_at) || '' };
}

/** Shared toast (v2). o: {type:'ok'|'err', html, ttl, sticky, action:{label,fn}} */
export function toast(o) {
  let host = document.querySelector('.v2-toasts');
  if (!host) { host = document.createElement('div'); host.className = 'v2-toasts'; document.body.appendChild(host); }
  const el = document.createElement('div');
  el.className = 'v2-toast' + (o.type === 'err' ? ' err' : '');
  el.innerHTML = '<span>' + (o.html || '') + '</span><span class="sp"></span>';
  if (o.action) {
    const b = document.createElement('button');
    b.textContent = o.action.label;
    b.onclick = () => { el.remove(); o.action.fn(); };
    el.appendChild(b);
  }
  const x = document.createElement('button');
  x.textContent = '×'; x.style.color = 'var(--muted)';
  x.onclick = () => el.remove();
  el.appendChild(x);
  host.appendChild(el);
  if (!o.sticky) setTimeout(() => el.remove(), o.ttl || 6000);
  return el;
}

/** Accumulated notes in one line: original context + newest stamped update. */
export function notesOneLine(notes) {
  const lines = String(notes || '').split('\n').map((x) => x.trim()).filter(Boolean);
  if (!lines.length) return '';
  if (lines.length === 1) return lines[0];
  return lines[0] + ' · ' + lines[lines.length - 1];
}

/** Aging class per the design rule (thresholds come from worklist rules). */
export function ageClass(days, rules) {
  const r = rules || DEFAULT_RULES;
  if (days == null) return '';
  if (days >= r.overdueDays) return 'late';
  if (days >= 3) return 'warn';
  return '';
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
      #ck-pal{position:fixed;inset:0;z-index:100;display:none;align-items:flex-start;justify-content:center;background:rgba(33,31,27,.45);padding-top:13vh}
      #ck-pal.on{display:flex}
      #ck-box{width:min(560px,calc(100vw - 40px));background:#f9f8f5;border:1px solid #e6e2da;border-radius:14px;box-shadow:0 24px 60px -18px rgba(33,31,27,.35);overflow:hidden}
      #ck-in{width:100%;min-height:50px;padding:0 16px;background:#fff;border:none;color:#211f1b;font:500 14.5px 'Instrument Sans',system-ui,sans-serif;outline:none;box-sizing:border-box;border-bottom:1px solid #e6e2da}
      #ck-in::placeholder{color:#ccc5b6}
      #ck-list{list-style:none;margin:0;padding:6px;max-height:44vh;overflow-y:auto}
      #ck-list li{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;cursor:pointer;color:#211f1b;font:400 13.5px 'Instrument Sans',system-ui,sans-serif}
      #ck-list li.sel{background:#fff;box-shadow:inset 0 0 0 1px #e6e2da}
      #ck-list .k{color:#8a8375;font-size:11px;margin-left:auto;font-family:'IBM Plex Mono',monospace;border:1px solid #ddd8cd;border-radius:5px;padding:1px 6px;background:#fff}
      #ck-list .t{color:#8a8375;font-size:12px}
      #ck-foot{display:flex;gap:14px;padding:9px 14px;border-top:1px solid #e6e2da;color:#98917f;font:400 11px 'IBM Plex Mono',monospace}
    </style>
    <div id="ck-box"><input id="ck-in" placeholder="Search leads, deals, pages… or type what happened" autocomplete="off" spellcheck="false"><ul id="ck-list"></ul>
      <div id="ck-foot"><span>↑↓ move</span><span>↵ select</span><span>type a sentence to log it</span><span style="margin-left:auto">esc</span></div></div>`;
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
      '<li style="color:#8a8375;cursor:default">Nothing matches.</li>';
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
  pageListen(document, 'keydown', (e) => {
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
/** Instagram's DM inbox shows DISPLAY NAMES, not handles. Profiles carry a
 *  full name, so a name seen in a screenshot can be mapped back to its handle.
 *  Comparison strips emoji, punctuation and case; an ambiguous name (two leads
 *  sharing it) resolves to nothing rather than guessing wrong. */
export function normName(x) {
  return String(x || '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim().toLowerCase();
}
export function makeNameResolver(leads) {
  const byName = new Map();
  for (const l of leads || []) {
    const k = normName(l.igName);
    if (!k) continue;
    if (byName.has(k)) byName.set(k, null); // ambiguous — never auto-pick
    else byName.set(k, l.h);
  }
  return (name) => byName.get(normName(name)) || '';
}

const fileB64 = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => { const v = String(r.result); res(v.slice(v.indexOf(',') + 1)); };
  r.onerror = rej; r.readAsDataURL(file);
});
/** Phone screenshots are 4-8MB PNGs; base64 inflates that past the vision
 *  function's payload cap and the image silently fails. Anything big gets
 *  downscaled to 1600px long-edge JPEG (~300KB) — profile text stays crisp
 *  and no screenshot is ever too large. Shared by the in-page scanner and
 *  the background uploader. */
export async function prepImage(file) {
  if (file.size < 900_000) return { data: await fileB64(file), type: file.type || 'image/jpeg' };
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
    const dataUrl = c.toDataURL('image/jpeg', 0.82);
    return { data: dataUrl.slice(dataUrl.indexOf(',') + 1), type: 'image/jpeg' };
  } catch (e) {
    return { data: await fileB64(file), type: file.type || 'image/jpeg' };
  }
}

export function installScanner(opts = {}) {
  if (document.getElementById('sc2-modal')) return;
  const statuses = opts.statuses || STATUSES;
  const el = document.createElement('div');
  el.innerHTML = `
    <style>
      #sc2-drop{position:fixed;inset:0;z-index:90;background:rgba(33,31,27,.55);display:none;align-items:center;justify-content:center}
      #sc2-drop.on{display:flex}
      #sc2-drop .b{border:2px dashed #f9f8f5;border-radius:16px;padding:36px 52px;color:#f9f8f5;font:600 15px 'Instrument Sans',system-ui,sans-serif}
      #sc2-modal{position:fixed;inset:0;z-index:95;background:rgba(33,31,27,.45);display:none;align-items:flex-start;justify-content:center;padding:7vh 16px;overflow-y:auto}
      #sc2-modal.on{display:flex}
      #sc2-modal .c{width:min(680px,100%);background:#f9f8f5;border:1px solid #e6e2da;border-radius:14px;overflow:hidden;font-family:'Instrument Sans',system-ui,sans-serif}
      #sc2-modal .h{display:flex;align-items:flex-start;gap:10px;padding:17px 20px;border-bottom:1px solid #e6e2da;color:#211f1b}
      #sc2-modal .h b{font-size:16px;font-weight:700;flex:1}
      #sc2-modal .bd{padding:12px 16px;max-height:56vh;overflow-y:auto}
      #sc2-modal .think{padding:34px;text-align:center;color:#8a8375;font-size:13px}
      .sc2-card{border:1px solid #e6e2da;border-radius:12px;padding:13px 15px;margin:9px 4px;background:#fff}
      .sc2-card.low{border-color:#e0cba0}
      .sc2-card.dupe{opacity:.6}
      .sc2-card .t{display:flex;align-items:center;gap:8px;margin-bottom:9px}
      .sc2-card .hh{flex:1;min-height:34px;padding:0 11px;background:#fff;border:1px solid #ddd8cd;border-radius:8px;color:#211f1b;font-weight:600;font-size:13.5px}
      .sc2-card .x{width:30px;height:30px;border-radius:8px;color:#8a8375;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;background:none;border:none}
      .sc2-card .x:hover{color:#b4543e}
      .sc2-card .g{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
      .sc2-card select,.sc2-card .nn{width:100%;min-height:32px;padding:5px 10px;background:#fff;border:1px solid #ddd8cd;border-radius:8px;color:#211f1b;font-size:12.5px}
      .sc2-card select{cursor:pointer;appearance:none;-webkit-appearance:none;padding-right:28px;transition:border-color .16s ease, box-shadow .16s ease;background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%238a8375%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;background-size:13px}
      .sc2-card select:hover{border-color:#8a8375}
      .sc2-card select:focus{border-color:#211f1b;outline:none;box-shadow:0 0 0 3px rgba(33,31,27,.07)}
      .sc2-card .low{font-size:11px;color:#a8762a;margin-top:6px}
      .sc2-card .ex{font-size:11px;color:#2a6a4d;margin-top:6px}
      #sc2-modal .f{padding:14px 20px;border-top:1px solid #e6e2da;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      @media (max-width:760px){
        #sc2-modal{padding:0;align-items:stretch}
        #sc2-modal .c{width:100%;min-height:100dvh;border-radius:0;border:none;display:flex;flex-direction:column}
        #sc2-modal .bd{max-height:none;flex:1;-webkit-overflow-scrolling:touch}
        #sc2-modal .f{padding:12px 14px calc(12px + env(safe-area-inset-bottom))}
        #sc2-modal .f button{min-height:44px}
        #sc2-modal .f .add{flex:1}
        .sc2-card .hh,.sc2-card select,.sc2-card .nn{min-height:40px}
      }
      #sc2-modal .f button{min-height:36px;padding:0 16px;border-radius:8px;font-weight:600;font-size:12.5px;border:1px solid #ddd8cd;background:#fff;color:#4d4a42;cursor:pointer}
      #sc2-modal .add{background:#2a6a4d;border-color:#2a6a4d;color:#fff;margin-left:auto}
      #sc2-modal .add:disabled{opacity:.45}
    </style>
    <div id="sc2-drop"><div class="b">Drop the screenshot to read it</div></div>
    <div id="sc2-modal"><div class="c">
      <div class="h"><b id="sc2-title">Leads from screenshot</b>
        <button class="x" id="sc2-close" aria-label="Close" style="color:#55555e;background:none;border:none;cursor:pointer">✕</button></div>
      <div class="bd" id="sc2-body"></div>
      <div class="f">
        <div class="tf" id="sc2-mode" role="group" aria-label="What these screenshots are" style="display:inline-flex;background:#f0ede6;border:1px solid #e6e2da;border-radius:9px;padding:2px;gap:2px">
          <button type="button" data-m="prospect" style="border-radius:7px;padding:5px 12px;border:none;background:none;cursor:pointer;font:600 11.5px 'Instrument Sans',system-ui,sans-serif;color:#6d675b">Uncontacted</button>
          <button type="button" data-m="log" style="border-radius:7px;padding:5px 12px;border:none;background:none;cursor:pointer;font:600 11.5px 'Instrument Sans',system-ui,sans-serif;color:#6d675b">Log convo</button>
        </div>
        <button id="sc2-more" style="min-height:36px;padding:0 14px;border-radius:8px;border:1px dashed #ddd8cd;background:#fff;color:#6d675b;font-weight:600;font-size:12.5px;cursor:pointer">+ More screenshots</button>
        <button class="cancel" id="sc2-cancel">Cancel</button>
        <button class="add" id="sc2-go" hidden>Analyze</button>
        <button class="add" id="sc2-add">Add leads</button>
      </div>
    </div></div>`;
  document.body.appendChild(el);
  const $i = (id) => document.getElementById(id);
  const escH = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let items = [];        // the accumulated review list — the source of truth
  let scanning = 0;      // >0 while an image in the current batch is being read
  let scanTotal = 0, scanDone = 0; // for the "Reading 2 of 5…" progress line
  let msg = '';          // muted line under the header: dupes / unreadable images
  // Uncontacted is the default everywhere — adding prospects is the common
  // case, and a wrong 'log' would stamp contact dates on people never DM'd.
  // The footer toggle switches the whole batch to conversation-logging.
  const defaultMode = opts.pasteMode === 'log' ? 'log' : 'prospect';
  let mode = defaultMode;
  let batchId = 0;   // bumped on close/new batch; a stale loop sees the change and stops
  const g2 = (card, f) => { const x = card.querySelector('[data-f="' + f + '"]'); return x ? x.value.trim() : ''; };
  // closing has to abandon a batch still being read — the loop is async and
  // would otherwise finish into a closed modal and pop it back open
  const close = () => {
    batchId++;
    fileQueue.forEach((q) => { try { URL.revokeObjectURL(q.url); } catch (e) {} });
    fileQueue.length = 0; draining = false; gathered = true;
    $i('sc2-modal').classList.remove('on'); items = []; scanning = 0; scanTotal = 0; scanDone = 0; msg = '';
  };
  $i('sc2-close').onclick = close; $i('sc2-cancel').onclick = close;
  $i('sc2-go').onclick = () => { if (fileQueue.length) drain(); };
  $i('sc2-mode').addEventListener('click', (e) => {
    const b2 = e.target.closest('button[data-m]'); if (!b2) return;
    mode = b2.getAttribute('data-m') === 'log' ? 'log' : 'prospect';
    render();
  });
  // pasting a profile link into a handle box converts it on the spot
  $i('sc2-body').addEventListener('input', (e) => {
    const hh = e.target.closest('input.hh');
    if (!hh || !/instagram\.com/i.test(hh.value)) return;
    const h = handleFromAny(hh.value);
    if (h) hh.value = h;
  });
  $i('sc2-more').onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
    inp.onchange = () => { if (inp.files && inp.files.length) scanFiles(inp.files); };
    inp.click();
  };
  $i('sc2-modal').addEventListener('mousedown', (e) => { if (e.target === $i('sc2-modal')) close(); });

  function optHtml(list, sel, blank) {
    return (blank ? '<option value="">' + blank + '</option>' : '') +
      list.map((o) => '<option' + (o === sel ? ' selected' : '') + '>' + escH(o) + '</option>').join('');
  }
  // Anything typed or pasted into a handle field resolves to a clean handle:
  // a bare handle, an @handle, or a full profile link — including the phone's
  // /_u/ form and ?igsh junk. Post/reel/story-id links resolve to nothing
  // rather than minting a junk handle.
  const handleFromAny = (v) => {
    v = String(v || '').trim();
    if (!v) return '';
    if (/instagram\.com/i.test(v)) {
      v = v.replace(/instagram\.com\/_u\//i, 'instagram.com/');
      try {
        const CP = typeof window !== 'undefined' ? window.CRMParse : null;
        if (CP && CP.normalizeHandle) return CP.normalizeHandle(v) || '';
      } catch (e) { /* fall through to the regex */ }
      const m = v.match(/instagram\.com\/(?:stories\/)?([a-z0-9._]{2,30})/i);
      return m && !/^(p|reel|reels|tv|explore|direct|accounts|stories)$/i.test(m[1])
        ? m[1].toLowerCase() : '';
    }
    return v.toLowerCase().replace(/^@+/, '');
  };
  // the handle a card resolves to: a real @handle wins; failing that, an inbox
  // display name mapped back through the names we hold. Blank if neither — we
  // never invent a handle from a name we can't match.
  function itemHandle(it) {
    const raw = handleFromAny(it.handle);
    if (raw) return raw;
    const nm = (it.name || '').trim();
    return nm && opts.resolveName ? (opts.resolveName(nm) || '') : '';
  }
  // pull the user's in-progress edits back into items before any re-render, so
  // a screenshot finishing in the background can't wipe what they just typed
  function syncFromDom() {
    Array.prototype.forEach.call($i('sc2-body').querySelectorAll('.sc2-card'), (card) => {
      const it = items[+card.getAttribute('data-i')];
      if (!it) return;
      it.handle = g2(card, 'handle'); it.stage = g2(card, 'stage');
      it.status = g2(card, 'status'); it.notes = g2(card, 'notes');
      it.qual = g2(card, 'qual'); it.pains = g2(card, 'pains');
    });
  }
  function scanLabel() {
    if (scanning <= 0) return '';
    return scanTotal > 1
      ? 'Reading ' + Math.min(scanDone + scanning, scanTotal) + ' of ' + scanTotal + '…'
      : 'Reading screenshot…';
  }
  // one screenshot's leads onto the pile, skipping anyone already queued.
  // Dedup keys on BOTH the handle and the normalized display name: the same
  // person often reads as a handle-card in one screenshot and a name-only
  // card in the next, and a handle-only key lets that pair through.
  const keysOf = (l) => {
    const ks = [];
    const h = itemHandle(l);
    if (h) ks.push('h:' + h);
    const nm = normName(l.name || '');
    if (nm) ks.push('n:' + nm);
    return ks;
  };
  function addLeads(leads) {
    syncFromDom();
    const have = new Set();
    items.forEach((it) => keysOf(it).forEach((k) => have.add(k)));
    let dupes = 0;
    for (const l of leads) {
      const ks = keysOf(l);
      if (ks.length && ks.some((k) => have.has(k))) { dupes++; continue; }
      ks.forEach((k) => have.add(k));
      // remembered at intake for the ai_feedback comparison later — collapsed
      // rows never render a card, so this can't be set at render time
      l._suggested = { handle: itemHandle(l), stage: l.stage || '', status: l.status || '',
        notes: l.notes || '', qual: l.qual || '', pains: l.pains || '' };
      items.push(l);
    }
    return dupes;
  }
  // spinner only before the first card exists; once cards are up, an incoming
  // scan updates the header but leaves the reviewed cards on screen
  function refresh() {
    if (gathered && !draining) { renderGather(); return; }
    if (scanning > 0 && !items.length) {
      $i('sc2-title').textContent = scanLabel();
      $i('sc2-add').disabled = true;
      $i('sc2-body').innerHTML = '<div class="think">Claude is reading the image…</div>';
      return;
    }
    render();
  }
  function render() {
    syncFromDom();
    const busy = scanning > 0;
    $i('sc2-add').textContent = mode === 'prospect' ? 'Add to uncontacted' : 'Log conversations';
    $i('sc2-add').disabled = busy || items.length === 0;
    Array.prototype.forEach.call($i('sc2-mode').querySelectorAll('button[data-m]'), (b2) => {
      const on = b2.getAttribute('data-m') === mode;
      b2.style.background = on ? '#fff' : 'none';
      b2.style.color = on ? '#211f1b' : '#6d675b';
      b2.style.boxShadow = on ? '0 1px 2px rgba(33,31,27,.07)' : 'none';
    });
    const note = msg ? '<div style="margin:6px 4px 2px;font-size:11.5px;color:#8a8375">' + escH(msg) + '</div>' : '';
    // a card demands attention only when something is actually missing —
    // no readable handle, or the AI flagged its own read as shaky
    const needsInfo = (l) => !itemHandle(l) || l.confidence === 'low';
    const withIdx = items.map((l, i) => ({ l, i }));
    const needy = withIdx.filter((x) => needsInfo(x.l) || x.l._open);
    const ready = withIdx.filter((x) => !needsInfo(x.l) && !x.l._open);
    $i('sc2-title').textContent = (busy ? scanLabel() + ' · ' : '') + items.length +
      ' lead' + (items.length === 1 ? '' : 's') +
      (needy.length ? ' — ' + needy.length + ' need' + (needy.length === 1 ? 's' : '') + ' your input' : ' — all ready');
    const readyRow = (l, i) => {
      const h = itemHandle(l);
      const ex = opts.exists ? opts.exists(h) : null;
      const exArchived = !!(ex && typeof ex === 'object' && ex.level === 'Archive');
      const badge = (l.story === 'yes' ? '<span style="color:#c13584;font-size:11px;font-weight:700">◉ story</span>' : '') +
        (l.priv === 'yes' ? '<span style="color:#8a8375;font-size:11px;font-weight:600">🔒 private</span>' : '') +
        (mode === 'prospect'
        ? (exArchived ? '<span style="color:#2a6a4d;font-size:11px;font-weight:600">revives</span>'
          : ex ? '<span style="color:#98917f;font-size:11px">in book — skipped</span>' : '')
        : (ex ? '<span style="color:#98917f;font-size:11px">updates</span>' : '<span style="color:#2a6a4d;font-size:11px">new</span>'));
      return '<div class="sc2-ready" data-i="' + i + '" style="display:flex;align-items:center;gap:9px;padding:7px 12px;border:1px solid #e6e2da;border-radius:10px;margin:5px 4px;background:#fff;font-size:12.5px">' +
        '<b style="font-size:13px;color:#211f1b;flex:none">@' + escH(h) + '</b>' + badge +
        (l.qual ? '<span style="font:600 10.5px \'IBM Plex Mono\',monospace;color:#8a8375">' + escH(l.qual.replace('Qualified ', 'Q')) + '</span>' : '') +
        '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#8a8375">' + escH(l.notes || l.pains || '') + '</span>' +
        '<button type="button" data-edit style="border:none;background:none;color:#6d675b;font-size:11.5px;font-weight:600;cursor:pointer;padding:2px 6px">edit</button>' +
        '<button class="x" data-rm2 style="width:24px;height:24px">✕</button></div>';
    };
    const secTtl = (t2) => '<div style="font:600 10px \'IBM Plex Mono\',monospace;letter-spacing:.1em;text-transform:uppercase;color:#98917f;padding:8px 6px 3px">' + t2 + '</div>';
    $i('sc2-body').innerHTML = note +
      (needy.length ? (ready.length ? secTtl('Needs your input') : '') + needy.map((x) => cardHtml(x.l, x.i)).join('') : '') +
      (ready.length ? secTtl('Ready — nothing needed (' + ready.length + ')') + ready.map((x) => readyRow(x.l, x.i)).join('') : '');
    Array.prototype.forEach.call($i('sc2-body').querySelectorAll('[data-edit]'), (b2) => {
      b2.onclick = () => { syncFromDom(); items[+b2.closest('.sc2-ready').getAttribute('data-i')]._open = true; render(); };
    });
    Array.prototype.forEach.call($i('sc2-body').querySelectorAll('[data-rm2]'), (b2) => {
      b2.onclick = () => {
        syncFromDom();
        items.splice(+b2.closest('.sc2-ready').getAttribute('data-i'), 1);
        if (!items.length && scanning <= 0) close(); else render();
      };
    });
    function cardHtml(l, i) {
      // NEVER fall back to the display name: an inbox screenshot shows names
      // ('Luka Vukoslavovic'), and turning one into a handle invents a lead
      // that matches nobody. Leave it blank so the card asks for the real one.
      let handle = (l.handle || '').trim().toLowerCase().replace(/^@/, '');
      const shownName = (l.name || '').trim();
      // no handle on screen (an inbox list) — try the display name against the
      // full names we hold for these accounts
      const matched = !handle && shownName && opts.resolveName ? opts.resolveName(shownName) : '';
      if (matched) handle = matched;
      l._suggested = { handle, stage: l.stage || 'Engaged 1', status: l.status || '', notes: l.notes || '', qual: l.qual || '', pains: l.pains || '' };
      const ex = opts.exists ? opts.exists(handle) : null;
      const exHandle = ex && typeof ex === 'object' ? ex.h : ex;
      const exArchived = !!(ex && typeof ex === 'object' && ex.level === 'Archive');
      return '<div class="sc2-card" data-i="' + i + '">' +
        '<div class="t"><input class="hh" data-f="handle" value="' + escH(handle) + '" placeholder="' + (shownName ? escH(shownName) + ' — @handle or IG link' : '@handle or IG link') + '">' +
          '<button class="x" data-rm>✕</button></div>' +
        '<div class="g">' +
          '<select data-f="stage">' + optHtml(['Engaged 1','Engaged 2','Engaged 3','Booked','No Reply'], mode === 'prospect' ? '' : (l.stage || 'Engaged 1'), mode === 'prospect' ? 'Stage —' : '') + '</select>' +
          '<select data-f="status">' + optHtml(statuses, mode === 'prospect' ? '' : l.status, 'Status —') + '</select>' +
        '</div>' +
        '<div class="g">' +
          '<select data-f="qual">' + optHtml(['Qualified 1','Qualified 2','Qualified 3','Unqualified'], l.qual || '', 'Qual —') + '</select>' +
          '<input class="nn" data-f="pains" value="' + escH(l.pains || '') + '" placeholder="pain points" style="margin:0">' +
        '</div>' +
        '<input class="nn" data-f="notes" value="' + escH(l.notes || '') + '" placeholder="note / sellable angle">' +
        (l.story === 'yes' ? '<div style="color:#c13584;font-size:11px;font-weight:700;margin-top:5px">◉ story live — reply to it first</div>' : '') +
        (l.priv === 'yes' ? '<div style="color:#8a8375;font-size:11px;font-weight:600;margin-top:5px">🔒 private account — DM lands in requests</div>' : '') +
        (matched ? '<div class="ex">matched “' + escH(shownName) + '” to @' + escH(matched) + '</div>' : '') +
        (!handle ? '<div class="low">couldn’t read the full handle — type it or paste their profile link, or this one is skipped</div>' : '') +
        (l.confidence && l.confidence !== 'high' ? '<div class="low">low confidence — double-check this one</div>' : '') +
        (exHandle ? '<div class="ex">' + (mode !== 'prospect'
          ? 'already a lead — this updates @' + escH(exHandle)
          : exArchived
            ? 'archived — this brings @' + escH(exHandle) + ' back as uncontacted'
            : 'already in the book — this one is skipped') + '</div>' : '') +
      '</div>';
    }
    Array.prototype.forEach.call($i('sc2-body').querySelectorAll('[data-rm]'), (b) => {
      b.onclick = () => {
        syncFromDom();
        items.splice(+b.closest('.sc2-card').getAttribute('data-i'), 1);
        if (!items.length && scanning <= 0) close(); else render();
      };
    });
    $i('sc2-modal').classList.add('on');
  }
  // Two-phase flow: screenshots GATHER first — thumbnails pile up, nothing
  // scans, more can keep coming — and the AI only runs when Analyze is
  // pressed. After that, late additions join the running scan directly.
  // Only Cancel/close abandons the batch.
  const fileQueue = [];   // [{ f: File, url: objectURL }]
  let draining = false;
  let gathered = true;    // true until Analyze — files wait as thumbnails
  function renderGather() {
    $i('sc2-title').textContent = fileQueue.length + ' screenshot' + (fileQueue.length === 1 ? '' : 's') + ' ready';
    $i('sc2-add').hidden = true;
    $i('sc2-go').hidden = false;
    $i('sc2-go').textContent = 'Analyze ' + fileQueue.length + ' screenshot' + (fileQueue.length === 1 ? '' : 's');
    $i('sc2-body').innerHTML =
      '<div style="display:flex;flex-wrap:wrap;gap:8px;padding:6px 4px">' +
      fileQueue.map((q, i) =>
        '<span style="position:relative"><img src="' + q.url + '" alt="" style="width:74px;height:74px;object-fit:cover;border-radius:9px;border:1px solid #e6e2da">' +
        '<button type="button" data-gx="' + i + '" style="position:absolute;top:-6px;right:-6px;width:19px;height:19px;border-radius:50%;background:#211f1b;color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;border:none;padding:0">×</button></span>').join('') +
      '</div>' +
      '<div style="padding:4px 8px;color:#8a8375;font-size:12px">Keep adding — nothing is analyzed until you say so.</div>';
    Array.prototype.forEach.call($i('sc2-body').querySelectorAll('[data-gx]'), (b) => {
      b.onclick = () => {
        const q = fileQueue.splice(+b.getAttribute('data-gx'), 1)[0];
        if (q) try { URL.revokeObjectURL(q.url); } catch (e) {}
        if (!fileQueue.length && !items.length) close(); else renderGather();
      };
    });
  }
  async function scanFiles(fileList) {
    const imgs = [].slice.call(fileList || []).filter((f) => f && (f.type || '').indexOf('image/') === 0);
    if (!imgs.length) return;
    imgs.forEach((f) => fileQueue.push({ f, url: URL.createObjectURL(f) }));
    $i('sc2-modal').classList.add('on');
    if (gathered && !draining) { renderGather(); return; }  // waiting on Analyze
    scanTotal += imgs.length;
    if (draining) { refresh(); return; }   // the running worker picks them up
    drain();
  }
  async function drain() {
    draining = true; gathered = false;
    $i('sc2-go').hidden = true; $i('sc2-add').hidden = false;
    scanTotal = scanDone + fileQueue.length;   // everything queued right now
    const mine = ++batchId;
    let dupes = 0, errs = 0, ran = 0;
    // three screenshots in flight at once — the batch has no size limit, and
    // sequential reads make a big camera-roll dump take minutes
    const worker = async () => {
      while (fileQueue.length) {
        if (mine !== batchId) return;
        const q = fileQueue.shift();
        scanning++; refresh();
        try {
          const img = await prepImage(q.f);
          const out = await visionScan(img.data, img.type);
          if (mine !== batchId) return;
          const leads = (out.leads || []).filter((l) => (l.handle || l.name || '').trim());
          if (leads.length) dupes += addLeads(leads);
        } catch (e) { if (mine !== batchId) return; errs++; }
        try { URL.revokeObjectURL(q.url); } catch (e) { /* thumbnail is gone anyway */ }
        scanDone++; scanning--; ran++; refresh();
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    if (mine !== batchId) { draining = false; return; }   // cancelled mid-run
    scanning = 0;
    draining = false;
    scanTotal = 0; scanDone = 0;
    const bits = [];
    if (dupes) bits.push(dupes + ' duplicate' + (dupes === 1 ? '' : 's') + ' skipped');
    if (errs) bits.push(errs + ' image' + (errs === 1 ? '' : 's') + ' couldn’t be read');
    msg = bits.join(' · ');
    if (!items.length) {
      $i('sc2-title').textContent = 'Screenshot';
      $i('sc2-body').innerHTML = '<div class="think">No leads found' +
        (errs ? ' — ' + errs + ' image' + (errs === 1 ? '' : 's') + ' couldn’t be read' :
          ' in ' + (ran === 1 ? 'that image' : 'those images')) + '.</div>';
      return;
    }
    render();
  }
  $i('sc2-add').onclick = async () => {
    // Add reads from ITEMS, not the DOM: ready rows render without a card,
    // and reading only cards would silently drop every collapsed lead.
    // syncFromDom has already pulled any open-card edits back into items.
    syncFromDom();
    $i('sc2-add').disabled = true; $i('sc2-add').textContent = 'Adding…';
    // one batch can hold the same handle twice (the same lead across two
    // screenshots the user edited to match) — first one wins, rest skipped
    const seen = new Set();
    if (mode === 'prospect') {
      // found, not messaged: create as uncontacted, never stamp a contact date
      const batch = [];
      items.forEach((it) => {
        const handle = itemHandle(it);
        if (!handle || seen.has(handle)) return;
        seen.add(handle);
        // stage stays empty unless the setter opened the card and set one —
        // a collapsed item still carries the AI's guess, which prospects drop
        batch.push({ handle, stage: it._open ? (it.stage || '') : '',
          notes: (it.notes || '').trim(), qual: (it.qual || '').trim(), pains: (it.pains || '').trim(),
          story: it.story || '', priv: it.priv || '' });
      });
      let res = { added: 0, skipped: 0 };
      try { res = await addProspects(batch); } catch (e) { /* surfaced via onDone(0) */ }
      $i('sc2-add').disabled = false; $i('sc2-add').textContent = 'Add to uncontacted';
      close();
      if (opts.onDone) opts.onDone(res.added, { mode: 'prospect', res });
      return;
    }
    let n = 0;
    for (const it of items) {
      const handle = itemHandle(it);
      if (!handle || seen.has(handle)) continue;
      seen.add(handle);
      const fields = { handle, stage: it.stage || 'Engaged 1', status: it.status || '',
        note: (it.notes || '').trim(), qual: (it.qual || '').trim(), pains: (it.pains || '').trim() };
      try {
        await setterUpdate(fields);
        if (it._suggested) logAiFeedback('vision', handle, it._suggested,
          { handle, stage: fields.stage, status: fields.status, notes: fields.note,
            qual: fields.qual, pains: fields.pains });
        n++;
      } catch (e) { /* count only successes */ }
    }
    $i('sc2-add').disabled = false; $i('sc2-add').textContent = 'Add leads';
    close();
    if (opts.onDone) opts.onDone(n);
  };
  // paste + drop — both take everything at once, not just the first image
  pageListen(window, 'paste', (e) => {
    const its = (e.clipboardData && e.clipboardData.items) || [];
    const files = [];
    for (const it of its) if (it.type && it.type.indexOf('image/') === 0) { const f = it.getAsFile(); if (f) files.push(f); }
    if (files.length) { e.preventDefault(); if (!items.length && !draining) mode = defaultMode; scanFiles(files); }
  });
  let depth = 0;
  pageListen(window, 'dragenter', (e) => { if (e.dataTransfer && [].indexOf.call(e.dataTransfer.types, 'Files') !== -1) { depth++; $i('sc2-drop').classList.add('on'); } });
  pageListen(window, 'dragover', (e) => { if ($i('sc2-drop').classList.contains('on')) e.preventDefault(); });
  pageListen(window, 'dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) $i('sc2-drop').classList.remove('on'); });
  pageListen(window, 'drop', (e) => {
    if (!$i('sc2-drop').classList.contains('on')) return;
    e.preventDefault(); depth = 0; $i('sc2-drop').classList.remove('on');
    const fs = e.dataTransfer && e.dataTransfer.files;
    if (fs && fs.length) { if (!items.length && !draining) mode = defaultMode; scanFiles(fs); }
  });
  return { openFile: (m) => {
    if (!items.length && !draining) mode = m === 'prospect' ? 'prospect' : m === 'log' ? 'log' : defaultMode;
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
    inp.onchange = () => { if (inp.files && inp.files.length) scanFiles(inp.files); };
    inp.click();
  } };
}
