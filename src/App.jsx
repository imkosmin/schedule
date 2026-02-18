import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { universitySchedule } from './data';
import {
    groupDataBySubject,
    generateSchedules,
    getAvailableSlots,
    getVisibleSlots,
    getUniqueGroups,
    getWeekPair,
    WEEK_PAIRS,
    computeOverlapLayout,
    findHardConflicts,
    getCurrentWeekInfo,
} from './SchedulerLogic';
import { ChevronLeft, ChevronRight, CalendarDays, AlertTriangle, Users, Clock, X, Download, Upload } from 'lucide-react';

/* ── Constants ─────────────────────────────────────────────────── */

const DAYS = ['Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri'];
const SHORT_DAYS = { Luni: 'Mon', Marti: 'Tue', Miercuri: 'Wed', Joi: 'Thu', Vineri: 'Fri' };
const FULL_DAYS = { Luni: 'Monday', Marti: 'Tuesday', Miercuri: 'Wednesday', Joi: 'Thursday', Vineri: 'Friday' };
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);
const HOUR_OPTIONS = Array.from({ length: 14 }, (_, i) => i + 8);
const PX_PER_HOUR = 40; // smaller blocks for dual view

/* ── Colour palette ──────────────────────────────────────────── */

const PALETTE = [
    { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    { bg: '#f3e8ff', text: '#6b21a8', border: '#c084fc' },
    { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
    { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    { bg: '#ffe4e6', text: '#9f1239', border: '#fda4af' },
    { bg: '#cffafe', text: '#155e75', border: '#67e8f9' },
    { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
    { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' },
];
function colourFor(subject) {
    let h = 0;
    for (let i = 0; i < subject.length; i++) h = (h * 31 + subject.charCodeAt(i)) | 0;
    return PALETTE[Math.abs(h) % PALETTE.length];
}

/* ── Helpers ──────────────────────────────────────────────────── */

function fmtTime(t) {
    if (typeof t === 'number') return `${String(t).padStart(2, '0')}:00`;
    return t;
}
function typeFromKey(key) {
    const m = key.match(/\(([^)]+)\)$/);
    return m ? m[1] : '';
}

/* ── Reusable calendar grid ───────────────────────────────────── */

function CalendarGrid({ events, overlapLayout, freeIntervals, weekLabel, weekType,
    preferredGroup, accentColor }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header bar */}
            <div className={`px-4 py-2 text-sm font-bold border-b ${accentColor}`}>
                {weekLabel}
            </div>
            {/* Day headers */}
            <div className="grid grid-cols-[50px_repeat(5,1fr)] bg-gray-50 border-b border-gray-200">
                <div className="p-1.5 text-[10px] font-semibold text-gray-400 text-center border-r border-gray-100">TIME</div>
                {DAYS.map(d => (
                    <div key={d} className="p-1.5 text-xs font-bold text-gray-700 text-center border-r border-gray-100 last:border-r-0">
                        {FULL_DAYS[d]}
                    </div>
                ))}
            </div>
            {/* Grid body */}
            <div className="relative" style={{ height: `${HOURS.length * PX_PER_HOUR}px` }}>
                {/* Hour lines */}
                {HOURS.map((h, i) => (
                    <div key={h} className="absolute w-full grid grid-cols-[50px_repeat(5,1fr)]"
                        style={{ top: `${i * PX_PER_HOUR}px`, height: `${PX_PER_HOUR}px` }}>
                        <div className="text-[10px] text-gray-400 text-right pr-1.5 pt-0.5 border-r border-gray-100">{h}:00</div>
                        {DAYS.map(d => (
                            <div key={d} className="border-b border-gray-100 border-r last:border-r-0" />
                        ))}
                    </div>
                ))}

                {/* Free time overlays */}
                {DAYS.map((day, dayIdx) => {
                    const interval = (freeIntervals || {})[day];
                    if (!interval) return null;
                    const top = (interval.from - 8) * PX_PER_HOUR;
                    const height = (interval.to - interval.from) * PX_PER_HOUR;
                    const dayColWidth = `(100% - 50px) / 5`;
                    return (
                        <div key={`free-${day}`} className="absolute pointer-events-none"
                            style={{
                                top: `${top}px`, height: `${height}px`,
                                left: `calc(50px + (${dayColWidth}) * ${dayIdx})`,
                                width: `calc(${dayColWidth})`,
                                background: 'repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(245,158,11,0.08) 4px, rgba(245,158,11,0.08) 8px)',
                                borderLeft: '2px solid rgba(245,158,11,0.25)',
                                borderRight: '2px solid rgba(245,158,11,0.25)',
                                zIndex: 5,
                            }} />
                    );
                })}

                {/* Event blocks */}
                {events.map((item, idx) => {
                    const dayIdx = DAYS.indexOf(item.day);
                    if (dayIdx === -1) return null;
                    const startH = typeof item.start === 'number' ? item.start : parseInt(item.start);
                    const endH = typeof item.end === 'number' ? item.end : parseInt(item.end);
                    const top = (startH - 8) * PX_PER_HOUR;
                    const height = (endH - startH) * PX_PER_HOUR;

                    const { col, totalCols } = overlapLayout[idx] || { col: 0, totalCols: 1 };
                    const dayColWidth = `(100% - 50px) / 5`;
                    const slotWidth = `(${dayColWidth}) / ${totalCols}`;
                    const leftCalc = `calc(50px + (${dayColWidth}) * ${dayIdx} + (${slotWidth}) * ${col})`;
                    const widthCalc = `calc(${slotWidth})`;

                    const c = colourFor(item.subject);
                    const isPref = preferredGroup !== 'Any' && item.group_id &&
                        item.group_id.toLowerCase() === preferredGroup.toLowerCase();
                    const freq = item.frequency || 'weekly';
                    const isBiWeekly = freq === 'odd' || freq === 'even';
                    const typeIcon = item.type === 'lab' ? '★' : item.type === 'proiect' ? '♦' : '';

                    return (
                        <div key={idx}
                            className="absolute rounded-md shadow-sm flex flex-col justify-center overflow-hidden
                                        hover:shadow-md hover:brightness-95 transition cursor-default"
                            style={{
                                top: `${top + 1}px`, height: `${height - 2}px`,
                                left: leftCalc, width: widthCalc, zIndex: 10,
                                padding: '2px 4px',
                                backgroundColor: isBiWeekly ? 'rgba(255,255,255,0.85)' : c.bg,
                                color: c.text,
                                border: `2px ${isBiWeekly ? 'dashed' : 'solid'} ${isPref ? '#4f46e5' : c.border}`,
                                boxShadow: isPref ? '0 0 0 1px #4f46e5' : undefined,
                            }}>
                            <div className="font-bold text-sm truncate leading-tight">
                                {typeIcon && <span className="mr-0.5">{typeIcon}</span>}
                                {item.subject}
                            </div>
                            <div className="flex items-center gap-1 text-xs opacity-90 leading-tight">
                                <span className="uppercase font-bold tracking-wide">{item.type}</span>
                                <span>•</span>
                                <span className="truncate">{item.room}</span>
                            </div>
                            <div className="text-xs opacity-75 leading-tight">
                                {fmtTime(item.start)}–{fmtTime(item.end)} | Gr: {item.group_id}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ── Free-time panel for one week ─────────────────────────────── */

function FreeTimePanel({ label, color, intervals, setIntervals }) {
    const activeCount = Object.keys(intervals).length;

    const toggleDay = (day) => {
        const next = { ...intervals };
        if (next[day]) { delete next[day]; } else { next[day] = { from: 8, to: 20 }; }
        setIntervals(next);
    };
    const setField = (day, field, value) => {
        const cur = intervals[day] || { from: 8, to: 20 };
        const updated = { ...cur, [field]: parseInt(value, 10) };
        if (field === 'from' && updated.from >= updated.to) updated.to = Math.min(updated.from + 1, 21);
        if (field === 'to' && updated.to <= updated.from) updated.from = Math.max(updated.to - 1, 8);
        setIntervals({ ...intervals, [day]: updated });
    };

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold ${color}`}>
                    {label}
                    {activeCount > 0 && (
                        <span className="ml-1 text-[9px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded-full">{activeCount}</span>
                    )}
                </span>
                {activeCount > 0 && (
                    <button onClick={() => setIntervals({})} className="text-[9px] text-gray-400 hover:text-red-500">Clear</button>
                )}
            </div>
            <div className="border rounded-lg overflow-hidden bg-gray-50">
                {DAYS.map(day => {
                    const interval = intervals[day];
                    const isActive = !!interval;
                    return (
                        <div key={day} className={`flex items-center gap-1.5 px-2 py-1.5 border-b last:border-b-0 transition
                            ${isActive ? 'bg-amber-50' : ''}`}>
                            <button onClick={() => toggleDay(day)}
                                className={`w-[36px] text-[10px] font-bold rounded py-0.5 transition text-center flex-shrink-0
                                        ${isActive ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>
                                {SHORT_DAYS[day]}
                            </button>
                            {isActive ? (
                                <div className="flex items-center gap-1 flex-1 min-w-0">
                                    <select value={interval.from} onChange={e => setField(day, 'from', e.target.value)}
                                        className="w-14 text-[10px] p-0.5 border border-gray-300 rounded bg-white">
                                        {HOUR_OPTIONS.filter(h => h < (interval.to || 21)).map(h => (
                                            <option key={h} value={h}>{h}:00</option>
                                        ))}
                                    </select>
                                    <span className="text-[9px] text-gray-400">→</span>
                                    <select value={interval.to} onChange={e => setField(day, 'to', e.target.value)}
                                        className="w-14 text-[10px] p-0.5 border border-gray-300 rounded bg-white">
                                        {HOUR_OPTIONS.filter(h => h > (interval.from || 8)).map(h => (
                                            <option key={h} value={h}>{h}:00</option>
                                        ))}
                                    </select>
                                    <button onClick={() => toggleDay(day)}
                                        className="ml-auto text-gray-300 hover:text-red-400 transition flex-shrink-0">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <span className="text-[9px] text-gray-400 italic">Click to set</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   ██  Main App
   ══════════════════════════════════════════════════════════════════ */

function App() {
    const autoWeek = useMemo(() => getCurrentWeekInfo(), []);
    const autoPair = useMemo(() => getWeekPair(autoWeek.weekNumber), [autoWeek]);

    const [selectedSubjects, setSelectedSubjects] = useState(new Set());
    const [preferredGroup, setPreferredGroup] = useState('33a');
    const [selectedPairIdx, setSelectedPairIdx] = useState(
        WEEK_PAIRS.findIndex(p => p.oddWeek === autoPair.oddWeek)
    );
    const [oddFreeIntervals, setOddFreeIntervals] = useState({});
    const [evenFreeIntervals, setEvenFreeIntervals] = useState({});
    const [mirrorFreeTime, setMirrorFreeTime] = useState(true);
    const [schedules, setSchedules] = useState([]);
    const [skippedKeys, setSkippedKeys] = useState([]);
    const [conflictPairs, setConflictPairs] = useState([]);
    const [conflictKeys, setConflictKeys] = useState(new Set());
    const [schedIdx, setSchedIdx] = useState(0);
    const [totalFound, setTotalFound] = useState(0);
    const [busy, setBusy] = useState(false);
    const [hasGenerated, setHasGenerated] = useState(false);

    const pair = WEEK_PAIRS[selectedPairIdx] || WEEK_PAIRS[0];
    const { oddWeek, evenWeek } = pair;

    const grouped = useMemo(() => groupDataBySubject(universitySchedule), []);
    const subjectKeys = useMemo(() => Object.keys(grouped).sort(), [grouped]);
    const uniqueGroups = useMemo(() => getUniqueGroups(universitySchedule), []);

    // Use oddWeek for availability badge (both weeks of pair are checked in generation)
    const availability = useMemo(() => {
        const m = {};
        subjectKeys.forEach(k => {
            const oddSlots = getAvailableSlots(k, grouped, oddWeek).length;
            const evenSlots = getAvailableSlots(k, grouped, evenWeek).length;
            m[k] = oddSlots + evenSlots;
        });
        return m;
    }, [grouped, subjectKeys, oddWeek, evenWeek]);

    const allTypes = useMemo(() => {
        const s = new Set();
        subjectKeys.forEach(k => s.add(typeFromKey(k)));
        return [...s].sort();
    }, [subjectKeys]);

    useEffect(() => {
        const init = new Set();
        subjectKeys.forEach(k => {
            const t = typeFromKey(k);
            if (t === 'lab' || t === 'proiect' || t === 'sem') init.add(k);
        });
        setSelectedSubjects(init);
    }, [subjectKeys]);

    // Sync even intervals from odd when mirrored
    useEffect(() => {
        if (mirrorFreeTime) setEvenFreeIntervals({ ...oddFreeIntervals });
    }, [mirrorFreeTime, oddFreeIntervals]);

    useEffect(() => {
        setHasGenerated(false);
        setConflictPairs([]);
        setConflictKeys(new Set());
        setSchedules([]);
        setSkippedKeys([]);
    }, [selectedSubjects, selectedPairIdx, oddFreeIntervals, evenFreeIntervals, preferredGroup]);

    const toggle = (key) => {
        setSelectedSubjects(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };
    const toggleType = (type) => {
        const keysOfType = subjectKeys.filter(k => typeFromKey(k) === type);
        const allSelected = keysOfType.every(k => selectedSubjects.has(k));
        setSelectedSubjects(prev => {
            const next = new Set(prev);
            keysOfType.forEach(k => allSelected ? next.delete(k) : next.add(k));
            return next;
        });
    };

    // ── Settings export / import ──
    const exportSettings = useCallback(() => {
        const data = {
            selectedSubjects: [...selectedSubjects],
            preferredGroup,
            selectedPairIdx,
            oddFreeIntervals,
            evenFreeIntervals,
            mirrorFreeTime,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'scheduler-settings.json'; a.click();
        URL.revokeObjectURL(url);
    }, [selectedSubjects, preferredGroup, selectedPairIdx, oddFreeIntervals, evenFreeIntervals]);

    const importSettings = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (data.selectedSubjects) setSelectedSubjects(new Set(data.selectedSubjects));
                    if (data.preferredGroup) setPreferredGroup(data.preferredGroup);
                    if (data.selectedPairIdx != null) setSelectedPairIdx(data.selectedPairIdx);
                    if (data.oddFreeIntervals) setOddFreeIntervals(data.oddFreeIntervals);
                    if (data.evenFreeIntervals) setEvenFreeIntervals(data.evenFreeIntervals);
                    if (data.mirrorFreeTime != null) setMirrorFreeTime(data.mirrorFreeTime);
                    // Legacy: migrate old single freeIntervals
                    if (data.freeIntervals && !data.oddFreeIntervals) {
                        setOddFreeIntervals(data.freeIntervals);
                        setEvenFreeIntervals(data.freeIntervals);
                    }
                } catch { /* ignore bad files */ }
            };
            reader.readAsText(file);
        };
        input.click();
    }, []);

    const handleGenerate = () => {
        setBusy(true);
        setHasGenerated(true);
        setTimeout(() => {
            const sel = Array.from(selectedSubjects);
            const constraints = { oddFreeIntervals, evenFreeIntervals };

            const { pairs, involved } = findHardConflicts(sel, grouped, oddWeek, evenWeek);
            setConflictPairs(pairs);
            setConflictKeys(involved);

            const { schedules: res, skipped, totalFound: tf } =
                generateSchedules(sel, grouped, constraints, oddWeek, evenWeek, preferredGroup);
            setSchedules(res);
            setSkippedKeys(skipped);
            setTotalFound(tf || res.length);
            setSchedIdx(0);
            setBusy(false);
        }, 50);
    };

    // Full semester schedule for the selected option
    const fullSchedule = schedules[schedIdx] || [];
    // Filtered per-week views
    const oddEvents = useMemo(() => getVisibleSlots(fullSchedule, oddWeek), [fullSchedule, oddWeek]);
    const evenEvents = useMemo(() => getVisibleSlots(fullSchedule, evenWeek), [fullSchedule, evenWeek]);
    const oddLayout = useMemo(() => computeOverlapLayout(oddEvents), [oddEvents]);
    const evenLayout = useMemo(() => computeOverlapLayout(evenEvents), [evenEvents]);

    const prefMatchCount = useMemo(() => {
        if (!preferredGroup || preferredGroup === 'Any') return null;
        const pg = preferredGroup.toLowerCase();
        const pgBase = pg.replace(/[a-z]$/, '');
        let exact = 0, partial = 0, total = 0;
        for (const s of fullSchedule) {
            if (!s.group_id) continue;
            total++;
            const gid = s.group_id.toLowerCase();
            if (gid === pg) exact++;
            else if (gid.startsWith(pgBase) || pgBase.startsWith(gid)) partial++;
        }
        return { exact, partial, total };
    }, [fullSchedule, preferredGroup]);

    const isTypeFullySelected = (type) => {
        const k = subjectKeys.filter(k => typeFromKey(k) === type);
        return k.length > 0 && k.every(k => selectedSubjects.has(k));
    };
    const isTypePartiallySelected = (type) => {
        const k = subjectKeys.filter(k => typeFromKey(k) === type);
        return k.some(k => selectedSubjects.has(k)) && !k.every(k => selectedSubjects.has(k));
    };

    /* ─────────────────────────────── JSX ─────────────────────────── */

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans text-gray-800">
            {/* ───── Sidebar ───── */}
            <aside className="w-80 min-w-[300px] bg-white border-r border-gray-200 flex flex-col shadow-lg z-10">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
                        <CalendarDays className="w-5 h-5" /> Scheduler
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">Two-week paired view</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Week Pair Selector */}
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-700">Week Pair</label>
                        <select value={selectedPairIdx} onChange={e => setSelectedPairIdx(+e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm">
                            {WEEK_PAIRS.map((p, i) => (
                                <option key={i} value={i}>
                                    Weeks {p.oddWeek}–{p.evenWeek} (Odd/Even)
                                    {p.oddWeek === autoPair.oddWeek ? ' ← current' : ''}
                                </option>
                            ))}
                        </select>
                        <div className="flex items-center gap-2 text-[10px] mt-0.5">
                            <span className="px-2 py-0.5 rounded-full font-bold bg-violet-100 text-violet-700">
                                W{oddWeek} Odd
                            </span>
                            <span className="text-gray-300">+</span>
                            <span className="px-2 py-0.5 rounded-full font-bold bg-teal-100 text-teal-700">
                                W{evenWeek} Even
                            </span>
                            <span className="text-gray-400 ml-auto">
                                {oddWeek <= 7 ? 'First half' : 'Second half'}
                            </span>
                        </div>
                    </div>

                    {/* Preferred Group */}
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Users className="w-4 h-4" /> Preferred Group
                        </label>
                        <select value={preferredGroup} onChange={e => setPreferredGroup(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm">
                            <option value="Any">Any (no preference)</option>
                            {uniqueGroups.map(g => (<option key={g} value={g}>Group {g}</option>))}
                        </select>
                    </div>

                    {/* Quick Select */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Quick Select</label>
                        <div className="flex flex-wrap gap-1.5">
                            <button onClick={() => setSelectedSubjects(new Set(subjectKeys))}
                                className="px-3 py-1 text-xs font-semibold rounded-full border border-gray-300 bg-gray-100 hover:bg-gray-200 transition">All</button>
                            <button onClick={() => setSelectedSubjects(new Set())}
                                className="px-3 py-1 text-xs font-semibold rounded-full border border-gray-300 bg-gray-100 hover:bg-gray-200 transition">None</button>
                            {allTypes.map(type => {
                                const full = isTypeFullySelected(type);
                                const partial = isTypePartiallySelected(type);
                                return (
                                    <button key={type} onClick={() => toggleType(type)}
                                        className={`px-3 py-1 text-xs font-semibold rounded-full border transition capitalize
                                                ${full ? 'bg-indigo-600 text-white border-indigo-600'
                                                : partial ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                                        {type}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Subjects */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Subjects</label>
                        <div className="space-y-0.5 border rounded-lg p-2 max-h-36 overflow-y-auto bg-gray-50">
                            {subjectKeys.map(k => {
                                const unavailable = availability[k] === 0;
                                const isConflict = conflictKeys.has(k);
                                return (
                                    <label key={k}
                                        className={`flex items-center gap-2 cursor-pointer p-1 rounded text-sm
                                               ${unavailable ? 'opacity-60' : 'hover:bg-gray-100'}
                                               ${isConflict && !unavailable ? 'bg-red-50' : ''}`}>
                                        <input type="checkbox" checked={selectedSubjects.has(k)} onChange={() => toggle(k)}
                                            className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 flex-shrink-0" />
                                        <span className={`truncate flex-1 text-[13px]
                                            ${unavailable ? 'line-through text-red-400' : isConflict ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                                            {k}
                                        </span>
                                        {unavailable && <span className="text-[9px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded flex-shrink-0">N/A</span>}
                                        {isConflict && !unavailable && <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded flex-shrink-0">CONFLICT</span>}
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* ──── Dual Free Time ──── */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Free Time
                        </label>
                        <FreeTimePanel
                            label={`Week ${oddWeek} (Odd)`}
                            color="text-violet-700"
                            intervals={oddFreeIntervals}
                            setIntervals={setOddFreeIntervals}
                        />
                        <label className="flex items-center gap-2 cursor-pointer py-1">
                            <input type="checkbox" checked={mirrorFreeTime}
                                onChange={e => setMirrorFreeTime(e.target.checked)}
                                className="w-3.5 h-3.5 text-teal-600 rounded border-gray-300 focus:ring-teal-500" />
                            <span className="text-[11px] text-gray-600">Mirror odd week settings</span>
                        </label>
                        <div className={mirrorFreeTime ? 'opacity-40 pointer-events-none' : ''}>
                            <FreeTimePanel
                                label={`Week ${evenWeek} (Even)`}
                                color="text-teal-700"
                                intervals={evenFreeIntervals}
                                setIntervals={setEvenFreeIntervals}
                            />
                        </div>
                    </div>
                </div>

                {/* Generate + feedback + export/import */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-2">
                    <button onClick={handleGenerate} disabled={busy}
                        className={`w-full py-2.5 px-4 rounded-xl text-white font-semibold shadow-md transition-all text-sm
                                ${busy ? 'bg-indigo-400 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg active:scale-95'}`}>
                        {busy ? 'Optimizing…' : 'Generate Schedules'}
                    </button>

                    {hasGenerated && !busy && schedules.length > 0 && (
                        <div className="text-center space-y-0.5">
                            <p className="text-xs text-green-600 font-medium">
                                ✓ Top {schedules.length} of {totalFound} distinct
                            </p>
                            {prefMatchCount && prefMatchCount.total > 0 && (
                                <p className="text-[10px] text-indigo-500">
                                    Group: {prefMatchCount.exact}/{prefMatchCount.total} exact
                                </p>
                            )}
                        </div>
                    )}

                    {hasGenerated && !busy && schedules.length === 0 && (
                        <div className="text-xs text-red-600 bg-red-50 rounded-lg p-3 space-y-1">
                            <div className="flex items-center gap-1 font-semibold">
                                <AlertTriangle className="w-3.5 h-3.5" /> No valid schedules
                            </div>
                            {conflictPairs.length > 0 ? (
                                <div className="text-[11px] space-y-0.5">
                                    {conflictPairs.map((p, i) => (
                                        <p key={i} className="pl-2">⚡ <b>{p.a}</b> ↔ <b>{p.b}</b></p>
                                    ))}
                                    <p className="text-red-500">Deselect one from each pair.</p>
                                </div>
                            ) : (
                                <p className="text-[11px]">Adjust free time or deselect subjects.</p>
                            )}
                        </div>
                    )}

                    {skippedKeys.length > 0 && !busy && (
                        <p className="text-center text-[10px] text-amber-600">
                            ⚠ Skipped {skippedKeys.length} (no slots this pair)
                        </p>
                    )}

                    {!hasGenerated && !busy && (
                        <p className="text-center text-xs text-gray-400">Ready to generate</p>
                    )}

                    <div className="flex gap-2 pt-1">
                        <button onClick={exportSettings}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-100 transition">
                            <Download className="w-3.5 h-3.5" /> Export
                        </button>
                        <button onClick={importSettings}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-100 transition">
                            <Upload className="w-3.5 h-3.5" /> Import
                        </button>
                    </div>
                </div>
            </aside>

            {/* ───── Main area — dual calendar ───── */}
            <main className="flex-1 flex flex-col h-full bg-gray-50/50">
                {/* Top bar */}
                <div className="h-12 bg-white border-b border-gray-200 flex justify-between items-center px-6 shadow-sm flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                            {schedules.length > 0
                                ? `Option ${schedIdx + 1} / ${schedules.length}`
                                : 'Schedule Visualizer'}
                        </span>
                        {schedules.length > 0 && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${schedIdx < 10
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-500'
                                }`}>
                                {schedIdx < 10 ? '⭐ Top 10' : 'Other'}
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setSchedIdx(i => Math.max(0, i - 1))}
                            disabled={!schedules.length || schedIdx === 0}
                            className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => setSchedIdx(i => Math.min(schedules.length - 1, i + 1))}
                            disabled={!schedules.length || schedIdx === schedules.length - 1}
                            className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Dual grids */}
                <div className="flex-1 overflow-auto p-4 space-y-4">
                    <CalendarGrid
                        events={oddEvents}
                        overlapLayout={oddLayout}
                        freeIntervals={oddFreeIntervals}
                        weekLabel={`Week ${oddWeek} — Odd`}
                        weekType="odd"
                        preferredGroup={preferredGroup}
                        accentColor="bg-violet-50 text-violet-700 border-violet-200"
                    />
                    <CalendarGrid
                        events={evenEvents}
                        overlapLayout={evenLayout}
                        freeIntervals={evenFreeIntervals}
                        weekLabel={`Week ${evenWeek} — Even`}
                        weekType="even"
                        preferredGroup={preferredGroup}
                        accentColor="bg-teal-50 text-teal-700 border-teal-200"
                    />
                </div>
            </main>
        </div>
    );
}

export default App;
