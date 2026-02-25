/**
 * Smart Schedule Optimizer — Core Logic
 *
 * Data contract (from data.js):
 *   subject   : string   e.g. "LFT"
 *   type      : string   "lab" | "curs" | "proiect"
 *   day       : string   Romanian ("Luni" … "Vineri")
 *   start     : number   hour integer, e.g. 12
 *   end       : number   hour integer, e.g. 14
 *   room      : string
 *   weeks     : string   "all" | "s1-7" | "s8-14"
 *   frequency : string   "weekly" | "odd" | "even"
 *   group_id  : string
 */

// ─── Semester config ─────────────────────────────────────────────

const SEMESTER_START = new Date(2026, 1, 23); // Week 1 starts Mon 23 Feb 2026

export function getCurrentWeekInfo(today = new Date()) {
    const diffMs = today.getTime() - SEMESTER_START.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    let weekNum = Math.floor(diffDays / 7) + 1;
    if (weekNum < 1) weekNum = 1;
    if (weekNum > 14) weekNum = 14;
    return { weekNumber: weekNum, isOdd: weekNum % 2 === 1 };
}

/**
 * Return the week pair that `weekNum` belongs to.
 * Pairs: (1,2) (3,4) (5,6) (7,8) (9,10) (11,12) (13,14).
 * The first is always odd, the second always even.
 */
export function getWeekPair(weekNum) {
    const oddWeek = weekNum % 2 === 1 ? weekNum : weekNum - 1;
    const evenWeek = oddWeek + 1;
    return { oddWeek, evenWeek };
}

/** All 7 week-pair options for the selector. */
export const WEEK_PAIRS = Array.from({ length: 7 }, (_, i) => {
    const odd = i * 2 + 1;
    return { oddWeek: odd, evenWeek: odd + 1 };
});

// ─── Week range helpers ──────────────────────────────────────────

export function isClassActiveInWeek(weeksStr, currentWeek) {
    if (!weeksStr || weeksStr === 'all') return true;
    if (!currentWeek) return true;
    const str = weeksStr.toLowerCase().replace(/\s/g, '');
    if (str.includes('-')) {
        const parts = str.replace('s', '').split('-');
        if (parts.length === 2) return currentWeek >= parseInt(parts[0], 10) && currentWeek <= parseInt(parts[1], 10);
    }
    if (str.includes(',')) return str.split(',').map(p => parseInt(p.replace('s', ''), 10)).includes(currentWeek);
    if (str.startsWith('s')) return parseInt(str.replace('s', ''), 10) === currentWeek;
    return true;
}

/** Is a slot active in at least one of the two weeks of the pair? */
export function isClassActiveInPair(weeksStr, oddWeek, evenWeek) {
    return isClassActiveInWeek(weeksStr, oddWeek) || isClassActiveInWeek(weeksStr, evenWeek);
}

// ─── Time helpers ────────────────────────────────────────────────

export function toMinutes(t) {
    if (typeof t === 'number') return t * 60;
    if (!t.includes(':')) return parseInt(t, 10) * 60;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
}

/**
 * Frequency-aware overlap check.
 * Two slots with complementary frequencies (odd vs even) NEVER co-occur.
 */
function doSlotsOverlap(a, b) {
    if (a.day !== b.day) return false;
    if (Math.max(toMinutes(a.start), toMinutes(b.start))
        >= Math.min(toMinutes(a.end), toMinutes(b.end))) return false;
    const fa = a.frequency || 'weekly';
    const fb = b.frequency || 'weekly';
    if ((fa === 'odd' && fb === 'even') || (fa === 'even' && fb === 'odd')) return false;
    return true;
}

// ─── Grouping ────────────────────────────────────────────────────

export function groupDataBySubject(data) {
    const groups = {};
    data.forEach(item => {
        const key = `${item.subject} (${item.type})`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });
    return groups;
}

export function getUniqueGroups(data) {
    const s = new Set();
    data.forEach(item => { if (item.group_id) s.add(item.group_id); });
    return [...s].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

// ─── Availability (pair-aware) ───────────────────────────────────

/** Get slots active in the given week pair. */
export function getAvailableSlotsForPair(key, groupedData, oddWeek, evenWeek) {
    return (groupedData[key] || []).filter(s => isClassActiveInPair(s.weeks, oddWeek, evenWeek));
}

/** Legacy single-week availability (used for N/A badges). */
export function getAvailableSlots(key, groupedData, currentWeek) {
    return (groupedData[key] || []).filter(s => isClassActiveInWeek(s.weeks, currentWeek));
}

/** Filter a schedule to only events visible in a specific week (week range + frequency). */
export function getVisibleSlots(schedule, week) {
    const isOdd = week % 2 === 1;
    return schedule.filter(s => {
        if (!isClassActiveInWeek(s.weeks, week)) return false;
        const f = s.frequency || 'weekly';
        if (f === 'odd') return isOdd;
        if (f === 'even') return !isOdd;
        return true;
    });
}

// ─── Conflict detection ──────────────────────────────────────────

export function findHardConflicts(selectedKeys, groupedData, oddWeek, evenWeek) {
    const pairs = [];
    const involved = new Set();
    for (let i = 0; i < selectedKeys.length; i++) {
        const slotsA = getAvailableSlotsForPair(selectedKeys[i], groupedData, oddWeek, evenWeek);
        if (slotsA.length === 0) continue;
        for (let j = i + 1; j < selectedKeys.length; j++) {
            const slotsB = getAvailableSlotsForPair(selectedKeys[j], groupedData, oddWeek, evenWeek);
            if (slotsB.length === 0) continue;
            let canCoexist = false;
            for (const a of slotsA) {
                for (const b of slotsB) {
                    if (!doSlotsOverlap(a, b)) { canCoexist = true; break; }
                }
                if (canCoexist) break;
            }
            if (!canCoexist) {
                pairs.push({ a: selectedKeys[i], b: selectedKeys[j] });
                involved.add(selectedKeys[i]);
                involved.add(selectedKeys[j]);
            }
        }
    }
    return { pairs, involved };
}

// ─── Schedule generation (pair-aware) ────────────────────────────

const MAX_DISTINCT = 10;

function scheduleFingerprint(schedule) {
    return schedule
        .map(s => `${s.subject}|${s.type}|${s.day}|${s.start}|${s.end}|${s.frequency || 'weekly'}|${s.group_id || ''}`)
        .sort()
        .join(';;');
}

/**
 * constraints shape:
 *   {
 *     oddFreeIntervals:  { Luni: {from:8,to:10}, ... },  // free time in the odd week
 *     evenFreeIntervals: { Marti: {from:16,to:20}, ... }, // free time in the even week
 *   }
 *
 * A slot violates a constraint if it overlaps with a free interval for the
 * week type it appears in.  "weekly" slots must satisfy BOTH weeks' constraints.
 */
export function generateSchedules(selectedKeys, groupedData, constraints, oddWeek, evenWeek, preferredGroup) {
    const skipped = [];
    const activeKeys = [];

    selectedKeys.forEach(key => {
        const slots = getAvailableSlotsForPair(key, groupedData, oddWeek, evenWeek);
        if (slots.length === 0) { skipped.push(key); } else { activeKeys.push(key); }
    });

    if (activeKeys.length === 0) return { schedules: [], skipped, totalFound: 0 };

    const buckets = activeKeys.map(key => getAvailableSlotsForPair(key, groupedData, oddWeek, evenWeek));
    const allResults = [];
    const seenFingerprints = new Set();

    function backtrack(idx, current) {
        if (idx === buckets.length) {
            const pass = checkUserConstraints(current, constraints);
            if (!pass) return;
            const fp = scheduleFingerprint(current);
            if (seenFingerprints.has(fp)) return;
            seenFingerprints.add(fp);
            allResults.push([...current]);
            return;
        }
        for (const slot of buckets[idx]) {
            let ok = true;
            for (const existing of current) {
                if (doSlotsOverlap(slot, existing)) { ok = false; break; }
            }
            if (!ok) continue;
            current.push(slot);
            backtrack(idx + 1, current);
            current.pop();
        }
    }

    /** Check if a slot overlaps any interval in the given day's array. */
    function overlapsAnyInterval(slotStart, slotEnd, dayIntervals) {
        if (!dayIntervals) return false;
        // Support both legacy single-object and new array format
        const arr = Array.isArray(dayIntervals) ? dayIntervals : [dayIntervals];
        for (const fi of arr) {
            if (Math.max(slotStart, fi.from) < Math.min(slotEnd, fi.to)) return true;
        }
        return false;
    }

    function checkUserConstraints(schedule, c) {
        const oddIntervals = c.oddFreeIntervals || {};
        const evenIntervals = c.evenFreeIntervals || {};

        for (const s of schedule) {
            const freq = s.frequency || 'weekly';
            const slotStart = s.start;  // hour integer, e.g. 8
            const slotEnd = s.end;    // hour integer, e.g. 14

            if (freq === 'odd' || freq === 'weekly') {
                if (overlapsAnyInterval(slotStart, slotEnd, oddIntervals[s.day])) return false;
            }
            if (freq === 'even' || freq === 'weekly') {
                if (overlapsAnyInterval(slotStart, slotEnd, evenIntervals[s.day])) return false;
            }
        }
        return true;
    }

    backtrack(0, []);

    if (preferredGroup && preferredGroup !== 'Any') {
        const pg = preferredGroup.toLowerCase();
        const pgBase = pg.replace(/[a-z]$/, '');
        allResults.sort((a, b) => scorePreference(b, pg, pgBase) - scorePreference(a, pg, pgBase));
    }

    const totalFound = allResults.length;
    return { schedules: allResults, skipped, totalFound };
}

function scorePreference(schedule, pg, pgBase) {
    let score = 0;
    for (const slot of schedule) {
        if (!slot.group_id) continue;
        const gid = slot.group_id.toLowerCase();
        if (gid === pg) score += 2;
        else if (gid.startsWith(pgBase) || pgBase.startsWith(gid)) score += 1;
    }
    return score;
}

// ─── Overlap layout ──────────────────────────────────────────────

export function computeOverlapLayout(events) {
    const result = new Array(events.length);
    const byDay = {};
    events.forEach((evt, idx) => {
        if (!byDay[evt.day]) byDay[evt.day] = [];
        byDay[evt.day].push(idx);
    });

    Object.values(byDay).forEach(indices => {
        indices.sort((a, b) => {
            const sa = toMinutes(events[a].start), sb = toMinutes(events[b].start);
            return sa !== sb ? sa - sb : toMinutes(events[a].end) - toMinutes(events[b].end);
        });
        const columns = [], colAssign = {};
        indices.forEach(idx => {
            const s = toMinutes(events[idx].start);
            let placed = false;
            for (let c = 0; c < columns.length; c++) {
                if (columns[c] <= s) { columns[c] = toMinutes(events[idx].end); colAssign[idx] = c; placed = true; break; }
            }
            if (!placed) { colAssign[idx] = columns.length; columns.push(toMinutes(events[idx].end)); }
        });
        const groups = [], visited = new Set();
        for (let i = 0; i < indices.length; i++) {
            const ii = indices[i];
            if (visited.has(ii)) continue;
            const grp = [ii]; visited.add(ii);
            let maxEnd = toMinutes(events[ii].end);
            for (let j = i + 1; j < indices.length; j++) {
                const jj = indices[j];
                if (visited.has(jj)) continue;
                if (toMinutes(events[jj].start) < maxEnd) { grp.push(jj); visited.add(jj); maxEnd = Math.max(maxEnd, toMinutes(events[jj].end)); }
            }
            groups.push(grp);
        }
        groups.forEach(grp => {
            const totalCols = Math.max(...grp.map(idx => colAssign[idx])) + 1;
            grp.forEach(idx => { result[idx] = { col: colAssign[idx], totalCols }; });
        });
    });
    for (let i = 0; i < events.length; i++) {
        if (!result[i]) result[i] = { col: 0, totalCols: 1 };
    }
    return result;
}
