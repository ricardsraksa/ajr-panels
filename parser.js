/* CRMParse — shared deterministic parsing brain for the AJR CRM panels.
   Plain script: attaches to globalThis; CommonJS export guard at the bottom.
   All date logic takes an injected `now` — nothing here reads the clock except
   documented default parameter values. */
(function (global) {
  'use strict';

  /* ---------------- handles ---------------- */

  function normalizeHandle(input) {
    if (input == null) return null;
    var s = String(input).trim();
    if (!s) return null;
    if (/instagram\.com/i.test(s)) {
      var m = s.match(/instagram\.com\/([^/?#]+)(?:\/([^/?#]+))?/i);
      if (m) {
        var seg = m[1], seg2 = m[2] || '';
        // story/post/reel links are not profile links — never mint @stories/@p/@reel
        if (/^stories$/i.test(seg)) { if (!seg2) return null; s = seg2; }
        else if (/^(p|reel|reels|tv|explore|direct|accounts)$/i.test(seg)) return null;
        else s = seg;
        try { s = decodeURIComponent(s); } catch (e) { /* keep raw */ }
      } else {
        s = s.replace(/^.*instagram\.com\/?/i, '').replace(/[?#].*$/, '');
      }
    }
    s = s.replace(/^@+/, '').toLowerCase().trim();
    return s || null;
  }

  // squash: comparison form for spoken handles — "oscar wxng" ~ "oscar.wxng_"
  function squash(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[.\s_@\-]/g, '');
  }

  /* ---------------- dates ---------------- */

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function formatDate(d) {
    return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  function makeValidDate(y, mo1, day) { // mo1 is 1-based; null if the calendar rejects it
    var d = new Date(y, mo1 - 1, day);
    if (d.getFullYear() !== y || d.getMonth() !== mo1 - 1 || d.getDate() !== day) return null;
    return d;
  }

  function parseDMY(s) {
    if (s == null) return null;
    var m = String(s).trim().match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/);
    if (!m) return null;
    var y = +m[3];
    if (y < 100) y += 2000;
    return makeValidDate(y, +m[2], +m[1]);
  }

  function dateOnly(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  function addDays(d, n) {
    var x = dateOnly(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  var WEEKDAYS = {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tue: 2, tues: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4, thur: 4, thurs: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6
  };

  var MONTHS = {
    january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
    may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
    september: 9, sep: 9, sept: 9, october: 10, oct: 10,
    november: 11, nov: 11, december: 12, dec: 12
  };

  var SMALL_COUNTS = {
    a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12
  };

  // >60 days in the past (relative to now) => assume the caller means next year.
  // Math.round absorbs the ±1h DST drift of local-date subtraction.
  function rollIfStale(d, now) {
    var diffDays = Math.round((dateOnly(now) - dateOnly(d)) / 864e5);
    if (diffDays > 60) {
      var rolled = makeValidDate(d.getFullYear() + 1, d.getMonth() + 1, d.getDate());
      return rolled || d;
    }
    return d;
  }

  // dictation artifacts: trailing punctuation, leading 'on'/'for'
  function cleanSpoken_(s) {
    return String(s).toLowerCase().trim().replace(/\s+/g, ' ')
      .replace(/^(?:on|for)\s+/, '').replace(/[.,;:!?]+$/, '').trim();
  }

  function parseDateExpr(text, now) {
    if (now === undefined) now = new Date();
    if (text == null) return null;
    var s = cleanSpoken_(text);
    if (!s) return null;
    var m, d;

    if (s === 'today') return formatDate(dateOnly(now));
    if (s === 'tomorrow') return formatDate(addDays(now, 1));
    if (s === 'next week') return formatDate(addDays(now, 7));

    m = s.match(/^next (\w+)$/);
    if (m && WEEKDAYS.hasOwnProperty(m[1])) {
      // "next <weekday>" = that weekday in the next Monday-based week
      var mbNow = (now.getDay() + 6) % 7;           // Mon=0 .. Sun=6
      var nextMonday = addDays(now, 7 - mbNow);
      var mbTarget = (WEEKDAYS[m[1]] + 6) % 7;
      return formatDate(addDays(nextMonday, mbTarget));
    }

    if (WEEKDAYS.hasOwnProperty(s)) {
      // bare weekday = next occurrence strictly after today
      var delta = ((WEEKDAYS[s] - now.getDay()) + 7) % 7 || 7;
      return formatDate(addDays(now, delta));
    }

    m = s.match(/^in (\d+|\w+) (day|days|week|weeks)$/);
    if (m) {
      var n = /^\d+$/.test(m[1]) ? +m[1] : SMALL_COUNTS[m[1]];
      if (!n) return null;
      return formatDate(addDays(now, /week/.test(m[2]) ? n * 7 : n));
    }

    m = s.match(/^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?$/);
    if (m) {
      if (m[3] !== undefined) {
        d = parseDMY(s);
        return d ? formatDate(d) : null;     // explicit year: verbatim, never rolled
      }
      d = makeValidDate(now.getFullYear(), +m[2], +m[1]);
      return d ? formatDate(rollIfStale(d, now)) : null;
    }

    m = s.match(/^(\d{1,2})(?:st|nd|rd|th)? (?:of )?([a-z]+)$/); // "12 may", "12th of may"
    if (m && MONTHS.hasOwnProperty(m[2])) {
      d = makeValidDate(now.getFullYear(), MONTHS[m[2]], +m[1]);
      return d ? formatDate(rollIfStale(d, now)) : null;
    }

    m = s.match(/^([a-z]+) (\d{1,2})(?:st|nd|rd|th)?$/); // "may 12"
    if (m && MONTHS.hasOwnProperty(m[1])) {
      d = makeValidDate(now.getFullYear(), MONTHS[m[1]], +m[2]);
      return d ? formatDate(rollIfStale(d, now)) : null;
    }

    m = s.match(/^(?:the )?(\d{1,2})(?:st|nd|rd|th)$/); // "the 12th" = this month, next if passed
    if (m) {
      var day = +m[1];
      var y = now.getFullYear(), mo = now.getMonth() + 1;
      if (day < now.getDate()) { mo += 1; if (mo > 12) { mo = 1; y += 1; } }
      d = makeValidDate(y, mo, day);
      if (!d) { mo += 1; if (mo > 12) { mo = 1; y += 1; } d = makeValidDate(y, mo, day); }
      return d ? formatDate(d) : null;
    }

    return null;
  }

  /* ---------------- money ---------------- */

  var ONES = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19
  };
  var TENS = {
    twenty: 20, thirty: 30, forty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90
  };

  function wordAmount(s) { // strict: every token must be understood, else null
    var tokens = s.replace(/-/g, ' ').split(/\s+/).filter(Boolean);
    if (!tokens.length) return null;
    var total = 0, cur = 0, sawAny = false;
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (t === 'and') continue;
      if (ONES.hasOwnProperty(t)) { cur += ONES[t]; sawAny = true; continue; }
      if (TENS.hasOwnProperty(t)) { cur += TENS[t]; sawAny = true; continue; }
      if (/^\d+$/.test(t)) { cur += +t; sawAny = true; continue; }
      if (t === 'hundred') { cur = (cur || 1) * 100; sawAny = true; continue; }
      if (t === 'thousand' || t === 'k' || t === 'grand') {
        total += (cur || 1) * 1000; cur = 0; sawAny = true; continue;
      }
      return null;
    }
    if (!sawAny) return null;
    return total + cur;
  }

  function guardAmount(n) {
    return (typeof n === 'number' && isFinite(n) && n > 0 && n < 1000000) ? n : null;
  }

  function parseMoney(text) {
    if (text == null) return null;
    var s = cleanSpoken_(text).replace(/\s*(?:dollars?|usd|bucks?|euros?|eur)$/, '');
    if (!s) return null;
    var m;

    m = s.match(/^[$€£]?\s*(\d+(?:[.,]\d+)?)\s*k$/); // 3k / 2.5k / 3 k
    if (m) return guardAmount(Math.round(parseFloat(m[1].replace(',', '.')) * 1000));

    m = s.match(/^[$€£]?\s*(\d{1,3}(?:[.,]\d{3})+)$/); // $3,000 / 1.500 (EU) — separators
    if (m) return guardAmount(Math.round(parseFloat(m[1].replace(/[.,]/g, ''))));

    m = s.match(/^[$€£]?\s*(\d+)(?:\.\d+)?$/); // plain 1500
    if (m) return guardAmount(Math.round(parseFloat(m[1])));

    m = s.match(/^(.+?)\s+and\s+a\s+half\s+(?:k|thousand|grand)$/); // three and a half k
    if (m) {
      var base = /^\d+$/.test(m[1]) ? +m[1] : wordAmount(m[1]);
      return base == null ? null : guardAmount(base * 1000 + 500);
    }

    m = s.match(/^(.+?)\s+point\s+(\w+)\s+(?:k|thousand|grand)$/); // one point five k
    if (m) {
      var whole = /^\d+$/.test(m[1]) ? +m[1] : wordAmount(m[1]);
      var frac = /^\d$/.test(m[2]) ? +m[2] : ONES[m[2]];
      if (whole == null || frac == null || frac > 9) return null;
      return guardAmount(Math.round((whole + frac / 10) * 1000));
    }

    return guardAmount(wordAmount(s));
  }

  function threeDigitWords(n) {
    var parts = [];
    var h = Math.floor(n / 100), r = n % 100;
    if (h) parts.push(threeDigitWords(h) + ' hundred');
    if (r >= 20) {
      var tensWord = Object.keys(TENS).filter(function (w) { return TENS[w] === Math.floor(r / 10) * 10; })[0];
      parts.push(tensWord);
      if (r % 10) parts.push(onesWord(r % 10));
    } else if (r) {
      parts.push(onesWord(r));
    }
    return parts.join(' ');
  }

  function onesWord(n) {
    return Object.keys(ONES).filter(function (w) { return ONES[w] === n; })[0];
  }

  function moneyToWords(n) {
    n = Math.round(n);
    if (!(n > 0 && n < 1000000)) return String(n);
    var th = Math.floor(n / 1000), rest = n % 1000;
    var parts = [];
    if (th) parts.push(threeDigitWords(th) + ' thousand');
    if (rest) parts.push(threeDigitWords(rest));
    return parts.join(' ');
  }

  /* ---------------- closer utterance ---------------- */

  var STATUS_VALUE_RE = /^\s*(no close|no show|didn'?t close|closing call|discovery(?: call)?|follow[\s\-]?up|closed)\b/i;

  function normStatus(raw) {
    var s = raw.toLowerCase();
    if (/no close|no.show|didn'?t close/.test(s)) return 'No Close';
    if (/closing call/.test(s)) return 'Closing call';
    if (/discovery/.test(s)) return 'Discovery Call';
    if (/follow/.test(s)) return 'Followup';
    if (/closed/.test(s)) return 'Closed';
    return null;
  }

  var CLOSER_KW_RE = /\b(cash collected|closed for|follow[\s\-]?up|collected|status|meeting|cash|paid|closed)\b/gi;

  function moneyLikeToken(t) {
    return parseMoney(t) != null;
  }

  function matchClosing(targetText, closing) {
    var tokens = String(targetText || '').toLowerCase().replace(/[@,]/g, ' ').split(/\s+/)
      .filter(function (t) { return t.length >= 2 && !moneyLikeToken(t); });
    if (!tokens.length) return [];
    return (closing || []).filter(function (entry) {
      var hay = ((entry.name || '') + ' ' + (normalizeHandle(entry.link) || '')).toLowerCase();
      var squashedHay = squash(hay);
      return tokens.every(function (t) {
        return hay.indexOf(t) !== -1 || squashedHay.indexOf(squash(t)) !== -1;
      });
    });
  }

  function parseCloserUtterance(text, opts) {
    opts = opts || {};
    var now = opts.now === undefined ? new Date() : opts.now;
    var closing = opts.closing || [];
    var fields = {};
    var warnings = [];
    var original = String(text || '').trim();

    // Notes win everything after them (verbatim, original casing) — split first.
    var pre = original;
    var noteM = /\b(notes?)\b/i.exec(original);
    if (noteM) {
      var notesText = original.slice(noteM.index + noteM[1].length).trim();
      if (notesText) fields.notes = notesText;
      pre = original.slice(0, noteM.index);
    }

    // Collect keyword hits over the pre-notes portion.
    var hits = [];
    var m;
    CLOSER_KW_RE.lastIndex = 0;
    while ((m = CLOSER_KW_RE.exec(pre))) {
      hits.push({ kw: m[1].toLowerCase().replace(/[\s\-]+/g, ' ').replace(/^followup$/, 'follow up'), start: m.index, end: CLOSER_KW_RE.lastIndex });
    }

    var targetText = (hits.length ? pre.slice(0, hits[0].start) : pre).trim().replace(/[,;.]+$/, '').trim();
    var tail = targetText.match(/[\s,]+(no close|no.show|didn'?t close)$/i);
    if (tail) {
      fields.status = 'No Close';
      targetText = targetText.slice(0, tail.index).trim().replace(/[,;.]+$/, '').trim();
    }

    for (var i = 0; i < hits.length; i++) {
      var hit = hits[i];
      var valEnd = i + 1 < hits.length ? hits[i + 1].start : pre.length;
      var value = pre.slice(hit.end, valEnd).trim().replace(/^[,:;]+|[,;.!?]+$/g, '').trim();

      if (hit.kw === 'status') {
        var restFromValue = pre.slice(hit.end);
        var known = STATUS_VALUE_RE.exec(restFromValue);
        if (known) {
          fields.status = normStatus(known[1]);
          // swallow keyword hits that sit inside the consumed status value
          var consumedEnd = hit.end + known.index + known[0].length;
          while (i + 1 < hits.length && hits[i + 1].start < consumedEnd) i++;
        } else if (value) {
          var norm = normStatus(value);
          if (norm) {
            fields.status = norm;
          } else {
            fields.status = value;
            warnings.push('Unrecognized status "' + value + '" — will be written as spoken.');
          }
        } else {
          warnings.push('Heard "status" but no value after it.');
        }
      } else if (hit.kw === 'meeting' || hit.kw === 'follow up') {
        var fieldName = hit.kw === 'meeting' ? 'meeting' : 'followup';
        var parsed = parseDateExpr(value, now);
        if (parsed) fields[fieldName] = parsed;
        else warnings.push('Could not understand ' + fieldName + ' date "' + value + '" — field skipped.');
      } else if (hit.kw === 'collected' || hit.kw === 'cash' || hit.kw === 'cash collected' || hit.kw === 'paid' || hit.kw === 'closed for' || hit.kw === 'closed') {
        if (hit.kw === 'closed for' || hit.kw === 'closed') {
          if (!fields.status) fields.status = 'Closed';
        }
        if (value) {
          var amount = parseMoney(value);
          if (amount != null) fields.cash = amount;
          else if (hit.kw !== 'closed') warnings.push('Could not understand amount "' + value + '" — cash skipped.');
        } else if (hit.kw !== 'closed') {
          warnings.push('Heard "' + hit.kw + '" but no amount after it.');
        }
      }
    }

    // Money mentioned in the target without a cash keyword — refuse to guess.
    var strayMoney = String(targetText).split(/\s+/).some(moneyLikeToken);
    if (strayMoney) {
      warnings.push('Money mentioned without a cash keyword (say "collected 3k") — amount NOT written.');
    }

    return {
      targetText: targetText,
      matches: matchClosing(targetText, closing),
      fields: fields,
      warnings: warnings
    };
  }

  /* ---------------- setter utterance ---------------- */

  var STAGE_RE = /\b(engaged\s+(?:one|two|three|1|2|3)|booked|archived?|no\s+reply|closed)\s*[.!]?\s*$/i;

  function canonicalStage(raw) {
    var s = raw.toLowerCase().replace(/\s+/g, ' ').trim();
    if (/^engaged/.test(s)) {
      var num = s.split(' ')[1];
      var map = { one: '1', two: '2', three: '3' };
      return 'Engaged ' + (map[num] || num);
    }
    if (s === 'booked') return 'Booked';
    if (s === 'archive' || s === 'archived') return 'Archive';
    if (s === 'no reply') return 'No Reply';
    if (s === 'closed') return 'Closed';
    return null;
  }

  function parseSetterUtterance(text, opts) {
    opts = opts || {};
    var leads = opts.leads || [];
    var s = String(text || '').trim();
    var stage = null;
    var handleText = s;

    var m = STAGE_RE.exec(s);
    if (m) {
      stage = canonicalStage(m[1]);
      handleText = s.slice(0, m.index).trim();
    }

    var handle = normalizeHandle(handleText);
    var sq = squash(handle || '');
    var matches = sq
      ? leads.filter(function (l) { return squash(l.h) === sq; })
      : [];

    return { handle: handle, stage: stage, matches: matches };
  }

  /* ---------------- export ---------------- */

  /* ---------------- unified command router ---------------- */

  var DEFAULT_STATUSES = ['Follow up Sent', "Haven't read", 'End of convo', 'Mid convo',
    'Lifestyle sent', 'Left on read', 'Story reply', 'Call Pitched', 'Meme sent', 'LM Sent'];

  // Match a spoken/typed Last Status against the vocabulary. Exact squashed
  // match wins; otherwise a unique prefix match (either direction).
  function matchStatus_(text, statuses) {
    var sq = String(text == null ? '' : text).toLowerCase().replace(/[^a-z]/g, '');
    if (!sq) return null;
    var list = (statuses && statuses.length) ? statuses : DEFAULT_STATUSES;
    var prefix = [];
    for (var i = 0; i < list.length; i++) {
      var ssq = list[i].toLowerCase().replace(/[^a-z]/g, '');
      if (ssq === sq) return list[i];
      if (ssq.indexOf(sq) === 0 || sq.indexOf(ssq) === 0) prefix.push(list[i]);
    }
    return prefix.length === 1 ? prefix[0] : null;
  }

  // One entry point for the quick bar. Decides whether the text is a Closing
  // deal update (has a deal field), an Instagram stage move, an Instagram
  // status-only log, or nothing actionable yet. Optional "ig:"/"deal:" prefix
  // forces a lane for the rare ambiguous case ("oscar closed").
  function parseCommand(text, opts) {
    opts = opts || {};
    var now = opts.now === undefined ? new Date() : opts.now;
    var leads = opts.leads || [];
    var closing = opts.closing || [];
    var statuses = opts.statuses || DEFAULT_STATUSES;
    var s = String(text == null ? '' : text).trim();
    if (!s) return { route: 'empty' };

    var force = null;
    var pm = s.match(/^(ig|insta|instagram|setter|deal|closer|close)\s*:\s*([\s\S]*)$/i);
    if (pm) {
      force = /^(ig|insta|instagram|setter)$/i.test(pm[1]) ? 'setter' : 'closer';
      s = pm[2].trim();
      if (!s) return { route: 'empty' };
    }

    if (force !== 'setter') {
      var closer = parseCloserUtterance(s, { now: now, closing: closing });
      if (force === 'closer' || Object.keys(closer.fields).length > 0) {
        return { route: 'closer', closer: closer };
      }
    }

    if (force !== 'closer') {
      var setter = parseSetterUtterance(s, { leads: leads });
      if (setter.stage) {
        return { route: 'setter', setter: {
          handle: setter.matches.length ? setter.matches[0].h : setter.handle,
          stage: setter.stage, status: '', matches: setter.matches,
          mode: setter.matches.length ? 'update' : 'create'
        } };
      }
      var parts = s.split(/\s+/);
      if (parts.length >= 2) {
        var h = normalizeHandle(parts[0]);
        var st = matchStatus_(parts.slice(1).join(' '), statuses);
        if (h && st) {
          var hm = leads.filter(function (l) { return squash(l.h) === squash(h); });
          if (hm.length) {
            return { route: 'setter', setter: {
              handle: hm[0].h, stage: '', status: st, matches: hm, mode: 'statusOnly'
            } };
          }
          return { route: 'ambiguous',
            hint: '@' + h + ' isn\u2019t a lead yet \u2014 add a stage (e.g. \u201cengaged 1\u201d) to create it.' };
        }
      }
      if (force === 'setter') {
        return { route: 'ambiguous',
          hint: 'Type a handle then a stage (\u201chandle engaged 2\u201d) or a status (\u201chandle follow up sent\u201d).' };
      }
    }

    return { route: 'ambiguous',
      hint: 'Add a stage (engaged 2, booked, archive) or a deal field (status, collected, followup, meeting, notes).' };
  }

  /* ---------------- AI intent mapping ----------------
     The backend's Claude call returns a loose "intent" (route + spoken values);
     this maps it into the SAME shape parseCommand produces, so the panel reuses
     one preview/confirm/write/undo path. Dates and money are resolved by the
     tested deterministic parsers here — the model only extracts, it never does
     weekday math or decides what writes. */

  var STAGE_SET = ['Engaged 1', 'Engaged 2', 'Engaged 3', 'Booked', 'Archive', 'No Reply', 'Closed'];
  var DEAL_STATUS_SET = ['Followup', 'Closing call', 'Discovery Call', 'Closed', 'No Close'];

  function intentToCommand(intent, opts) {
    opts = opts || {};
    var now = opts.now === undefined ? new Date() : opts.now;
    var leads = opts.leads || [];
    var closing = opts.closing || [];
    var statuses = opts.statuses || DEFAULT_STATUSES;
    intent = intent || {};

    if (intent.route === 'closer') {
      var target = String(intent.target || '').trim();
      var fields = {};
      var warnings = [];
      var ds = String(intent.deal_status || '').trim();
      if (ds && DEAL_STATUS_SET.indexOf(ds) !== -1) fields.status = ds;
      ['meeting', 'followup'].forEach(function (k) {
        var v = String(intent[k] || '').trim();
        if (!v) return;
        var d = /^\d{1,2}[\/.]\d{1,2}[\/.]\d{4}$/.test(v) ? v : parseDateExpr(v, now);
        if (d) fields[k] = d;
        else warnings.push('Couldn\u2019t resolve the ' + k + ' date \u201c' + v + '\u201d \u2014 field skipped.');
      });
      var cashRaw = String(intent.cash == null ? '' : intent.cash).trim();
      if (cashRaw) {
        var amt = parseMoney(cashRaw);
        if (amt != null) fields.cash = amt;
        else warnings.push('Couldn\u2019t read the cash amount \u201c' + cashRaw + '\u201d \u2014 not written.');
      }
      var notes = String(intent.notes || '').trim();
      if (notes) fields.notes = notes;
      return { route: 'closer', ai: true,
        closer: { targetText: target, matches: matchClosing(target, closing), fields: fields, warnings: warnings } };
    }

    if (intent.route === 'setter') {
      var handle = normalizeHandle(intent.handle);
      var stage = '';
      var st = String(intent.stage || '').trim();
      if (st && STAGE_SET.indexOf(st) !== -1) stage = st;
      var status = matchStatus_(intent.status, statuses) || '';
      var temp = '';
      var tp = String(intent.temp || '').trim();
      if (/^(Warm|Cold|Hot) Lead$/.test(tp)) temp = tp;
      var sq = squash(handle || '');
      var matches = sq ? leads.filter(function (l) { return squash(l.h) === sq; }) : [];
      if (!matches.length && sq) matches = leads.filter(function (l) { return squash(l.h).indexOf(sq) === 0; });
      var mode = matches.length ? (stage ? 'update' : 'statusOnly') : 'create';
      return { route: 'setter', ai: true,
        setter: { handle: matches.length ? matches[0].h : handle, stage: stage, status: status, temp: temp, matches: matches, mode: mode } };
    }

    return { route: 'ambiguous', ai: true,
      hint: String(intent.hint || '').trim() || 'Couldn\u2019t tell what to update \u2014 name the person and what changed.' };
  }

  var CRMParse = {
    normalizeHandle: normalizeHandle,
    squash: squash,
    formatDate: formatDate,
    parseDMY: parseDMY,
    parseDateExpr: parseDateExpr,
    parseMoney: parseMoney,
    moneyToWords: moneyToWords,
    parseCloserUtterance: parseCloserUtterance,
    parseSetterUtterance: parseSetterUtterance,
    matchStatus: matchStatus_,
    parseCommand: parseCommand,
    intentToCommand: intentToCommand
  };

  global.CRMParse = CRMParse;
  if (typeof module !== 'undefined' && module.exports) module.exports = CRMParse;
})(typeof globalThis !== 'undefined' ? globalThis : this);
