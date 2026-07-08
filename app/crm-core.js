/* AJR CRM core — the ONE shared engine for all app pages.
 * Supabase client + auth guard + data layer + activity-log undo + AI interpret.
 * Loaded as an ES module; pages import { core } and call its adapters.
 * All writes log prev/next into `activity`, so every write is undoable. */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://cukjynfatkyiuzvstgcp.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1a2p5bmZhdGt5aXV6dnN0Z2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0Mzg3MjAsImV4cCI6MjA5OTAxNDcyMH0.l8-zXB6AgAKutZJTh30t6Tl2c3-f-H8kG6D9iF9eQtM';

export const supa = createClient(SUPABASE_URL, SUPABASE_ANON);

/* canonical vocab (was Apps Script Config.gs) */
export const STAGES = ['Engaged 1', 'Engaged 2', 'Engaged 3', 'Booked', 'Archive', 'No Reply', 'Closed'];
export const STATUSES = ['Follow up Sent', "Haven't read", 'End of convo', 'Mid convo',
  'Lifestyle sent', 'Left on read', 'Story reply', 'Call Pitched', 'Meme sent', 'LM Sent'];
export const TEMPS = ['Warm Lead', 'Cold Lead', 'Hot Lead'];

/* ---------- auth ---------- */

// Gate a page: returns the session, or bounces to the login page.
export async function requireAuth() {
  const { data: { session } } = await supa.auth.getSession();
  if (!session) {
    const back = location.pathname.split('/').pop() + location.search;
    location.replace('index.html?to=' + encodeURIComponent(back));
    return null;
  }
  return session;
}

export async function signIn(email, password) {
  const { data, error } = await supa.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.session;
}

export async function signOut() {
  await supa.auth.signOut();
  location.replace('index.html');
}

export async function userEmail() {
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
  const out = [];
  for (let off = 0; ; off += 1000) {
    const { data, error } = await supa.from('leads')
      .select('id,handle,ig_url,level,last_status,temp,qualification,notes,last_contact')
      .order('id').range(off, off + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out.map((l) => ({
    id: l.id, h: l.handle, url: l.ig_url || '',
    level: l.level || '', status: l.last_status || '', temp: l.temp || '',
    qual: l.qualification || '', notes: l.notes || '',
    lastContact: isoToDmy(l.last_contact),
  }));
}

export async function loadDeals() {
  const { data, error } = await supa.from('deals')
    .select('id,lead_id,name,ig_link,status,meeting,followup,qualification,cash,notes,fireflies_link')
    .order('id');
  if (error) throw new Error(error.message);
  return data.map((d) => ({
    row: d.id, id: d.id, leadId: d.lead_id,
    name: d.name || '', link: d.ig_link || '', status: d.status || '',
    meeting: isoToDmy(d.meeting), followup: isoToDmy(d.followup),
    qual: d.qualification || '', cash: d.cash == null ? '' : d.cash,
    notes: d.notes || '', hasFF: !!d.fireflies_link, fireflies_link: d.fireflies_link || '',
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
    return { ok: true, mode: 'updated', row: hit.id, handle, prev,
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
  return { ok: true, mode: 'created', row: created.id, handle };
}

/** Update a deal. args: {row(id), fields:{status,meeting,followup,cash,notes}, cashConfirmed}
 *  Mirrors closerUpdate: cash requires explicit confirmation; notes append
 *  (draft notes get replaced); dates arrive dd/MM/yyyy. */
export async function closerUpdate(args) {
  const f = args.fields || {};
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
  if (f.notes) {
    patch.notes = (!d.notes || d.notes.indexOf('[draft]') === 0)
      ? f.notes : d.notes + '\n' + f.notes;
  }
  const { error } = await supa.from('deals').update(patch).eq('id', d.id);
  if (error) throw new Error(error.message);
  const actId = await logActivity('deals', d.id, 'update', prev, patch);
  // a logged call consumes its pending entry
  await supa.from('pending_calls').update({ consumed: true }).eq('deal_id', d.id);
  return { ok: true, row: d.id, name: d.name || d.ig_link, applied: f, prev,
    undo: { table: 'deals', rowId: d.id, prev, actId } };
}

/** Direct-set a deal's fields (CRM editor path — replaces, doesn't append).
 *  fields: { status?, meeting?(iso|null), followup?(iso|null), cash?(number|null), notes?, qualification? }
 *  Only the keys present are written. Cash change requires opts.cashConfirmed. */
export async function setDeal(id, fields, opts = {}) {
  const { data: d, error: qErr } = await supa.from('deals').select('*').eq('id', id).maybeSingle();
  if (qErr) throw new Error(qErr.message);
  if (!d) throw new Error('deal not found');
  const patch = {};
  ['status', 'notes', 'qualification', 'meeting', 'followup'].forEach((k) => {
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
  return { ok: true, row: id, name: d.name || d.ig_link, prev, undo: { table: 'deals', rowId: id, prev, actId } };
}

/** Undo a write: restore prev values (activity row keeps the audit trail). */
export async function undoWrite(undo) {
  const { error } = await supa.from(undo.table).update(undo.prev).eq('id', undo.rowId);
  if (error) throw new Error(error.message);
  await logActivity(undo.table, undo.rowId, 'restore', null, undo.prev);
  return { ok: true };
}

/* ---------- pending calls + AI ---------- */

export async function pendingCalls() {
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data, error } = await supa.from('pending_calls')
    .select('id,deal_id,name,created_at')
    .eq('consumed', false).gte('created_at', dayAgo);
  if (error) throw new Error(error.message);
  return (data || []).map((c) => ({ id: c.id, row: c.deal_id, name: c.name }));
}

export async function markPendingConsumed(id) {
  await supa.from('pending_calls').update({ consumed: true }).eq('id', id);
}

export async function interpret(text, mode, deal) {
  const { data, error } = await supa.functions.invoke('interpret',
    { body: { text, mode, deal } });
  if (error) throw new Error(error.message || 'AI unreachable');
  if (!data || !data.ok) throw new Error((data && data.error) || 'AI error');
  return data;
}

export async function bookedAlert(name, qual, link) {
  try { await supa.functions.invoke('alerts', { body: { type: 'booked', name, qual, link } }); }
  catch (e) { /* fire-and-forget */ }
}
