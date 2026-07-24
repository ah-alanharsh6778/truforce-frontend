import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAllSummaries, createSummary } from "../../features/summary/summaryService";
import {
    Search,
    CalendarCheck,
    MapPin,
    Clock,
    Briefcase,
    Plus,
    X,
    User,
    ArrowRight,
    Loader2,
    TrendingUp,
    Zap,
    Target,
    Award,
    BarChart3,
    CheckCircle2,
    ChevronLeft
} from "lucide-react";

const getLocalDateStr = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatSmartDate = (dateString) => {
    if (!dateString) return "-";
    const safeDateStr = dateString.split('T')[0];
    const todayStr = getLocalDateStr();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);

    if (safeDateStr === todayStr) return "Today";
    if (safeDateStr === yesterdayStr) return "Yesterday";

    const [year, month, day] = safeDateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function DailySummaryPage() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [search, setSearch] = useState("");
    const [dateFilter, setDateFilter] = useState("ALL");
    const [summaries, setSummaries] = useState([]);
    const [open, setOpen] = useState(false);

    const userId = localStorage.getItem("userId") || "";
    const userRole = (localStorage.getItem("role") || "").toUpperCase();
    const isAdmin = userRole.includes("ADMIN") || userRole.includes("MANAGER");

    const [form, setForm] = useState({
        date: getLocalDateStr(),
        totalVisits: "",
        totalKm: "",
        startTime: "",
        endTime: ""
    });

    const loadSummaries = useCallback(async () => {
        try {
            const res = await getAllSummaries();
            console.log("📊 DailySummaryPage - Raw API Response:", res);
            
            const fetchedData = res.data?.data || res.data || [];
            console.log("📊 DailySummaryPage - Fetched Data:", fetchedData);
            console.log("📊 DailySummaryPage - User ID:", userId);
            console.log("📊 DailySummaryPage - Is Admin:", isAdmin);
            console.log("📊 DailySummaryPage - Data is Array:", Array.isArray(fetchedData));
            
            setSummaries(Array.isArray(fetchedData) ? fetchedData : []);
        } catch (error) {
            console.error("Error loading summaries:", error);
            setSummaries([]);
        } finally {
            setIsLoading(false);
        }
    }, [userId, isAdmin]);

    useEffect(() => {
        const t = setTimeout(loadSummaries, 0);
        return () => clearTimeout(t);
    }, [loadSummaries]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);

            const payload = {
                user_id: userId,
                date: form.date,
                total_visits: Number(form.totalVisits),
                total_km: Number(form.totalKm),
                start_time: `${form.date}T${form.startTime}:00`,
                end_time: `${form.date}T${form.endTime}:00`,
            };

            await createSummary(payload);
            setOpen(false);
            setForm({
                date: getLocalDateStr(),
                totalVisits: "",
                totalKm: "",
                startTime: "",
                endTime: ""
            });
            setIsLoading(true);
            await loadSummaries();
        } catch (error) {
            console.error("Error saving summary:", error);
            alert(error.response?.data?.message || "Failed to save daily summary.");
        } finally {
            setIsSubmitting(false);
        }
    };


    const displayedSummaries = useMemo(() => {
        let filtered = summaries;
        
        console.log("🔍 Filtering - Initial summaries count:", filtered.length);

        if (!isAdmin) {
            filtered = filtered.filter(s => {
                const backendUserId = String(s.user_id || s.userId || "").toLowerCase().trim();
                const localUserId = String(userId || "").toLowerCase().trim();
                console.log(`🔍 Filtering - Comparing: backend="${backendUserId}" vs local="${localUserId}"`);
                return backendUserId === localUserId;
            });
            console.log("🔍 Filtering - After user filter:", filtered.length);
        }

        const todayStr = getLocalDateStr();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateStr(yesterday);

        if (dateFilter === "TODAY") {
            filtered = filtered.filter(s => s.date && s.date.split('T')[0] === todayStr);
            console.log("🔍 Filtering - After TODAY filter:", filtered.length);
        } else if (dateFilter === "YESTERDAY") {
            filtered = filtered.filter(s => s.date && s.date.split('T')[0] === yesterdayStr);
            console.log("🔍 Filtering - After YESTERDAY filter:", filtered.length);
        }

        if (search) {
            const lowerSearch = search.toLowerCase();
            filtered = filtered.filter((s) => {
                const matchesDate = s.date && String(s.date).includes(search);
                const userIdVal = s.user_id || s.userId;
                const matchesUser = isAdmin && userIdVal && String(userIdVal).toLowerCase().includes(lowerSearch);
                return matchesDate || matchesUser;
            });
            console.log("🔍 Filtering - After search filter:", filtered.length);
        }

        const sorted = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        console.log("🔍 Filtering - Final displayed summaries:", sorted.length);
        return sorted;
    }, [summaries, search, dateFilter, isAdmin, userId]);

    const stats = useMemo(() => {
        let todayV = 0, yesterdayV = 0, totalKm = 0;

        const baseSummaries = isAdmin ? summaries : summaries.filter(s => {
            const backendUserId = String(s.user_id || s.userId || "").toLowerCase().trim();
            const localUserId = String(userId || "").toLowerCase().trim();
            return backendUserId === localUserId;
        });

        baseSummaries.forEach(s => {
            const dayType = formatSmartDate(s.date);
            if (dayType === "Today") {
                todayV += Number(s.total_visits || 0);
                totalKm += Number(s.total_km || 0);
            } else if (dayType === "Yesterday") {
                yesterdayV += Number(s.total_visits || 0);
            }
        });

        return { todayV, yesterdayV, totalKm };
    }, [summaries, isAdmin, userId]);

    return (
        <div className="max-w-7xl mx-auto py-4 px-2 sm:px-6 space-y-6 pb-24 md:pb-12 animate-in fade-in duration-500">

            {/* HEADER SECTION */}
            <div className="bg-white rounded-3xl border border-slate-200/60 p-6 md:p-8 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl shrink-0">
                            <CalendarCheck size={26} />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
                                {isAdmin ? "Team Performance Registry" : "Daily Duty Summary"}
                            </h1>
                            <p className="text-slate-405 text-xs mt-2.5 font-medium">
                                {isAdmin ? "Monitor team metrics and workspace logs" : "Log and view your daily work summary logs"}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer hover:bg-slate-100"
                        >
                            <option value="ALL">All Time</option>
                            <option value="TODAY">Today</option>
                            <option value="YESTERDAY">Yesterday</option>
                        </select>

                        {!isAdmin && (
                            <button
                                onClick={() => setOpen(true)}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-all active:scale-95 shadow-blue-500/20 cursor-pointer"
                            >
                                <Plus size={18} />
                                Log Day
                            </button>
                        )}
                    </div>
                </div>

                {/* SEARCH BAR */}
                <div className="mt-6 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder={isAdmin ? "Search user ID or date..." : "Search by date..."}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                </div>
            </div>

                {/* STATS CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Today's Visits */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Today's Visits</p>
                                <h3 className="text-3xl font-bold text-slate-900">{stats.todayV}</h3>
                                <p className="text-slate-500 text-xs font-medium mt-2 flex items-center gap-1.5">
                                    <TrendingUp size={14} className="text-emerald-500" /> Performance metric
                                </p>
                            </div>
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <Target size={24} />
                            </div>
                        </div>
                    </div>

                    {/* Yesterday's Visits */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Yesterday's Visits</p>
                                <h3 className="text-3xl font-bold text-slate-900">{stats.yesterdayV}</h3>
                                <p className="text-slate-500 text-xs font-medium mt-2 flex items-center gap-1.5">
                                    <CheckCircle2 size={14} className="text-slate-400" /> Previous day
                                </p>
                            </div>
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                                <Award size={24} />
                            </div>
                        </div>
                    </div>

                    {/* Today's Distance */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Today's Distance</p>
                                <h3 className="text-3xl font-bold text-slate-900">
                                    {stats.totalKm} <span className="text-base font-medium text-slate-500">km</span>
                                </h3>
                                <p className="text-slate-500 text-xs font-medium mt-2 flex items-center gap-1.5">
                                    <Zap size={14} className="text-amber-500" /> Active coverage
                                </p>
                            </div>
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                                <BarChart3 size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* CONTENT LIST */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 space-y-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <span className="text-slate-500 font-medium">Fetching records...</span>
                    </div>
                ) : displayedSummaries.length === 0 ? (
                    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-16 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-slate-100">
                            <CalendarCheck className="w-8 h-8 text-slate-400" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">No Records Found</h2>
                        <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">
                            {isAdmin ? "No employee has submitted their daily summary yet." : "Start logging your daily work to see records here."}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {displayedSummaries.map((s) => {
                            const dateBadgeText = formatSmartDate(s.date);
                            const isToday = dateBadgeText === "Today";

                            return (
                                <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">

                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold tracking-wide ${
                                            isToday
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'bg-slate-100 text-slate-700'
                                        }`}>
                                            <CalendarCheck className="w-3.5 h-3.5" />
                                            {dateBadgeText}
                                        </div>
                                        {isAdmin && (
                                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                                <User className="w-3 h-3" />
                                                ID: {String(s.user_id || s.userId).substring(0, 8)}...
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <Briefcase className="w-4 h-4 text-slate-400" />
                                                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Visits</p>
                                            </div>
                                            <p className="text-2xl font-bold text-slate-900">{s.total_visits || 0}</p>
                                        </div>

                                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <MapPin className="w-4 h-4 text-slate-400" />
                                                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Distance</p>
                                            </div>
                                            <p className="text-2xl font-bold text-slate-900">{s.total_km || "0"}<span className="text-xs font-medium text-slate-500 ml-1">km</span></p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-4 rounded-xl">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Start</span>
                                            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                {s.start_time ? new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                                            </span>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-300" />
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">End</span>
                                            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                {s.end_time ? new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* MODAL */}
                {open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

                            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Log Daily Work</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Submit your final daily stats</p>
                                </div>
                                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                <form id="summaryForm" onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reporting Date</label>
                                        <input type="date" name="date" value={form.date} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" required />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Total Visits</label>
                                            <input type="number" name="totalVisits" value={form.totalVisits} onChange={handleChange} placeholder="e.g. 5" min="0" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Distance (KM)</label>
                                            <input type="number" step="0.1" name="totalKm" value={form.totalKm} onChange={handleChange} placeholder="e.g. 45.5" min="0" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" required />
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                                            <p className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-slate-400" /> Duty Timings
                                            </p>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Start Time</label>
                                                    <input type="time" name="startTime" value={form.startTime} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" required />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-medium text-slate-500 mb-1.5">End Time</label>
                                                    <input type="time" name="endTime" value={form.endTime} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" required />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end rounded-b-2xl">
                                <button type="button" onClick={() => setOpen(false)} disabled={isSubmitting} className="px-5 py-2.5 font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-sm transition-colors active:scale-95">
                                    Cancel
                                </button>
                                <button form="summaryForm" type="submit" disabled={isSubmitting} className="px-5 py-2.5 font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl text-sm flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-blue-500/20 cursor-pointer">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Summary"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
    );
}