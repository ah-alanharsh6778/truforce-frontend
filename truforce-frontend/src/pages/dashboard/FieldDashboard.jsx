import { useState, useEffect, useCallback } from 'react';
import { 
    MapPin, ChevronRight, Loader2, Plus, Navigation, Calendar, 
    AlertCircle, CheckCircle2, Users, ArrowUpRight, Clock, ClipboardList,
    Sun, Coffee, Moon, Phone, Wallet, Play, Square, Signal, Battery, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from "../../api/axios";
import useLocationTracker from '../../hooks/useLocationTracker';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function FieldDashboard() {
    const navigate = useNavigate();
    const [isTracking, setIsTracking] = useState(false);
    const [loading, setLoading] = useState(true);

    const [userName] = useState(() => {
        const storedName = localStorage.getItem("name");
        return storedName ? storedName.split(" ")[0] : "User";
    });
    const [stats, setStats] = useState({ visits: 0, distance: 0 });
    const [followUps, setFollowUps] = useState([]);
    const [activeColleagues, setActiveColleagues] = useState([]);
    const [attendance, setAttendance] = useState(null);
    const [attendanceLoading, setAttendanceLoading] = useState(false);

    const userId = localStorage.getItem("userId");

    const loadAttendanceStatus = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await api.get(`/attendance/status/${userId}`);
            if (res.data?.success) {
                setAttendance(res.data.data);
                // Sync live journey tracker state with attendance status
                if (res.data.data?.status === "PUNCHED_IN") {
                    setIsTracking(true);
                }
            }
        } catch (error) {
            console.error("Failed to load attendance status:", error);
        }
    }, [userId]);

    const handlePunchIn = async () => {
        if (!userId) return;
        setAttendanceLoading(true);
        try {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const payload = {
                        userId,
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    };
                    const res = await api.post("/attendance/punch-in", payload);
                    if (res.data?.success) {
                        setAttendance(res.data.data);
                        setIsTracking(true);
                        alert("Shift started! Journey tracking is now active.");
                    } else {
                        alert(res.data?.message || "Punch-in failed");
                    }
                    setAttendanceLoading(false);
                },
                (err) => {
                    console.error("Location error:", err);
                    alert("Location access is required to check in!");
                    setAttendanceLoading(false);
                }
            );
        } catch (error) {
            console.error("Punch-in error:", error);
            setAttendanceLoading(false);
        }
    };

    const handlePunchOut = async () => {
        if (!userId) return;
        if (!window.confirm("Are you sure you want to check out and end your shift?")) return;
        setAttendanceLoading(true);
        try {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const payload = {
                        userId,
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    };
                    const res = await api.post("/attendance/punch-out", payload);
                    if (res.data?.success) {
                        setAttendance(res.data.data);
                        setIsTracking(false);
                        alert("Shift ended! Journey tracking has been deactivated.");
                    } else {
                        alert(res.data?.message || "Punch-out failed");
                    }
                    setAttendanceLoading(false);
                },
                (err) => {
                    console.error("Location error:", err);
                    alert("Location access is required to check out!");
                    setAttendanceLoading(false);
                }
            );
        } catch (error) {
            console.error("Punch-out error:", error);
            setAttendanceLoading(false);
        }
    };

    // Integrate live tracking hook
    const { 
        currentLoc, 
        error: gpsError,
        liveDistance,
        liveSpeed,
        battery,
        networkStatus
    } = useLocationTracker(userId, isTracking);

    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        console.log("👉 Fetching Field Dashboard Data...");

        let fetchedDistance = 0;
        let fetchedVisits = 0;
        let fetchedFollowUps = [];
        let fetchedColleagues = [];

        // 1. Fetch KM
        try {
            const kmRes = await api.get(`/location-logs/total-km/${userId}`);
            fetchedDistance = kmRes.data?.data || kmRes.data || 0;
        } catch (error) {
            console.error("❌ KM Fetch Error:", error.response?.data || error.message);
        }

        // 2. Fetch TODAY'S VISITS
        try {
            const visitRes = await api.get(`/visits`);
            const allVisits = visitRes.data?.data || visitRes.data || [];

            const todayString = new Date().toLocaleDateString('en-CA');
            const todaysVisitsList = allVisits.filter(v => {
                if(!v.visitTime) return false;
                return new Date(v.visitTime).toLocaleDateString('en-CA') === todayString;
            });

            fetchedVisits = todaysVisitsList.length;
        } catch (error) {
            console.error("❌ Visits Fetch Error:", error.response?.data || error.message);
        }

        // 3. Fetch PENDING FOLLOW-UPS
        try {
            const followUpRes = await api.get(`/followups/pending`);
            fetchedFollowUps = followUpRes.data?.data || followUpRes.data || [];
        } catch (error) {
            console.error("❌ Followups Fetch Error:", error.response?.data || error.message);
        }

        // 4. Fetch ACTIVE TEAM MEMBERS (Feature: "Who Use")
        try {
            const logsRes = await api.get("/location-logs");
            const logs = logsRes.data?.data || logsRes.data || [];
            
            const uniqueMap = {};
            logs.forEach(log => {
                const uid = log.userId || log.user_id;
                const name = log.userName || "Unknown Employee";
                if (uid && uid !== userId) {
                    if (!uniqueMap[uid] || new Date(log.recordedAt) > new Date(uniqueMap[uid].recordedAt)) {
                        uniqueMap[uid] = {
                            id: uid,
                            name: name,
                            latitude: log.latitude,
                            longitude: log.longitude,
                            batteryLevel: log.batteryLevel,
                            batteryCharging: log.batteryCharging,
                            networkStatus: log.networkStatus,
                            recordedAt: log.recordedAt
                        };
                    }
                }
            });
            fetchedColleagues = Object.values(uniqueMap);
        } catch (error) {
            console.error("❌ Colleagues Fetch Error:", error.message);
        }

        const todayStr = new Date().toDateString();
        const tomorrowStr = new Date(Date.now() + 86400000).toDateString();
        const processedFollowUps = fetchedFollowUps.map(item => {
            const itemDate = new Date(item.followUpDate).toDateString();
            let dateText = new Date(item.followUpDate).toLocaleDateString();

            if (todayStr === itemDate) dateText = "Today";
            else if (tomorrowStr === itemDate) dateText = "Tomorrow";
            else if (new Date(item.followUpDate) < new Date()) dateText = "Overdue";

            return { ...item, dateText };
        });

        setStats({ visits: fetchedVisits, distance: fetchedDistance });
        setFollowUps(processedFollowUps);
        setActiveColleagues(fetchedColleagues);
        setLoading(false);
    }, [userId]);

    useEffect(() => {
        Promise.resolve().then(() => {
            loadDashboardData();
            loadAttendanceStatus();
        });
    }, [loadDashboardData, loadAttendanceStatus]);

    const handleFollowUpClick = (followUp) => {
        navigate('/add-visit', {
            state: {
                editData: {
                    customerId: followUp.customerId,
                    purpose: "General Meeting",
                    notes: `Follow-up interaction for ${followUp.customerName}`
                }
            }
        });
    };

    // Calculate time-based greeting dynamically
    const getGreeting = () => {
        const hr = new Date().getHours();
        if (hr < 12) {
            return {
                text: "Good Morning",
                subtext: "Start your operations with a fresh mindset!",
                icon: <Coffee className="text-amber-500 w-5 h-5 animate-bounce" />
            };
        } else if (hr < 17) {
            return {
                text: "Good Afternoon",
                subtext: "Keep up the momentum on the field!",
                icon: <Sun className="text-orange-500 w-5 h-5 animate-pulse" />
            };
        } else {
            return {
                text: "Good Evening",
                subtext: "Wrap up logs and review daily stats.",
                icon: <Moon className="text-indigo-400 w-5 h-5" />
            };
        }
    };

    const greeting = getGreeting();

    if (loading) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center space-y-4 animate-in fade-in">
                <Loader2 className="animate-spin text-indigo-650 w-10 h-10" />
                <p className="text-slate-400 font-bold text-xs tracking-wider uppercase">Syncing Field Data...</p>
            </div>
        );
    }

    const totalStatsVal = (stats.visits || 0) + (followUps.length || 0);
    const pieData = totalStatsVal > 0 
        ? [
            { name: "Visits Today", value: stats.visits || 0, color: "#10B981" },
            { name: "Pending Follow-Ups", value: followUps.length || 0, color: "#6366F1" }
          ]
        : [
            { name: "No Operations Data", value: 1, color: "#CBD5E1" }
          ];

    return (
        <div className="w-full max-w-7xl mx-auto pb-28 md:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
            {/* DYNAMIC HEADER - PREMIUM USER GREETINGS */}
            <div className="flex justify-start items-center text-left px-4 md:px-0 mx-4 md:mx-0 w-full py-2">
                <div className="relative z-10 flex flex-col items-start justify-center">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[8px] font-black text-indigo-600 uppercase tracking-wider bg-indigo-50 border border-indigo-100/40 px-2 py-0.5 rounded-md">
                            Field Executive
                        </span>
                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                    <h1 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                        {greeting.icon}
                        <span>{greeting.text}, <span className="text-indigo-600">{userName}</span></span>
                    </h1>
                </div>
            </div>

            {/* ATTENDANCE DECK */}
            <div className="bg-white border border-slate-200/60 p-5 rounded-3xl shadow-sm mx-4 md:mx-0 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${
                        attendance?.status === "PUNCHED_IN" 
                            ? "bg-emerald-50 text-emerald-650 border border-emerald-100" 
                            : "bg-slate-50 text-slate-455 border border-slate-100"
                    }`}>
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                                attendance?.status === "PUNCHED_IN" 
                                    ? "bg-emerald-500 animate-pulse" 
                                    : "bg-slate-400"
                            }`} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                Attendance Status
                            </span>
                        </div>
                        <h2 className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">
                            {attendance?.status === "PUNCHED_IN" 
                                ? `ON DUTY (Checked in at ${new Date(attendance.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` 
                                : attendance?.status === "PUNCHED_OUT"
                                    ? `OFF DUTY (Shift ended, worked ${attendance.workDuration || 0}m)`
                                    : "OFF DUTY (Not Checked In)"
                            }
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {attendanceLoading ? (
                        <button disabled className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-100 text-slate-400 px-5 py-2.5 rounded-full font-bold text-xs">
                            <Loader2 className="animate-spin w-4 h-4" /> Processing...
                        </button>
                    ) : attendance?.status === "PUNCHED_IN" ? (
                        <button
                            onClick={handlePunchOut}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-full font-bold text-xs transition-all shadow-md shadow-rose-500/10 active:scale-95 cursor-pointer"
                        >
                            <Square size={13} fill="currentColor" /> Check Out (End Duty)
                        </button>
                    ) : (
                        <button
                            onClick={handlePunchIn}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-full font-bold text-xs transition-all shadow-md shadow-emerald-500/10 active:scale-95 cursor-pointer"
                        >
                            <Play size={13} fill="currentColor" /> Check In (Start Duty)
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 md:px-0">

                {/* LEFT COLUMN: TRACKING & TELEMETRY */}
                <div className="lg:col-span-7 space-y-6">

                    {/* METRICS ROW */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-3xl p-5 border border-slate-200/50 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-blue-50/55 rounded-full blur-xl group-hover:scale-150 transition-all duration-300"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Visits Today</span>
                            <div className="flex items-baseline gap-1 mt-3">
                                <span className="text-4xl font-black text-slate-800 tracking-tight">{stats.visits}</span>
                                <span className="text-xs font-bold text-slate-400 uppercase">meetings</span>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-5 border border-slate-200/50 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-emerald-55/55 rounded-full blur-xl group-hover:scale-150 transition-all duration-300"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">KM Logged</span>
                            <div className="flex items-baseline gap-1 mt-3">
                                <span className="text-4xl font-black text-slate-800 tracking-tight">
                                    {(Number(stats.distance) + liveDistance).toFixed(1)}
                                </span>
                                <span className="text-xs font-bold text-slate-400">KM</span>
                            </div>
                        </div>
                    </div>

                    {/* OPERATIONS ACTIVITY SPLIT CHART */}
                    <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/50 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                    <Activity className="text-indigo-650" size={16} /> Operations Activity Split
                                </h3>
                                <span className="bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl text-slate-500 text-[9px] font-black uppercase tracking-widest shadow-inner">
                                    Donut Chart
                                </span>
                            </div>

                            <div className="w-full h-[220px] relative mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 8px 25px rgba(0,0,0,0.04)', fontWeight: 'bold', fontFamily: 'Plus Jakarta Sans', fontSize: '11px' }}
                                        />
                                        <Legend 
                                            verticalAlign="bottom" 
                                            align="center"
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute top-[42%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                    <span className="text-xl font-black text-slate-800">{totalStatsVal}</span>
                                    <span className="text-[8px] font-bold text-slate-450 block uppercase tracking-wider">Actions</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* GPS TELEMETRY & CONTROLS */}
                    <div className="bg-[#0f172a] text-white rounded-3xl p-6 border border-slate-800/80 shadow-md relative overflow-hidden">
                        <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none" />

                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">GPS Operations Deck</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Real-time coordinates synchronization</p>
                            </div>
                            {isTracking && (
                                <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-xl text-[10px] font-black text-emerald-400 uppercase tracking-wider animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Live Tracking
                                </div>
                            )}
                        </div>

                        {gpsError && (
                            <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-350 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
                                <AlertCircle size={15} />
                                <span>{gpsError}</span>
                            </div>
                        )}

                        {!isTracking ? (
                            <div className="text-center py-6 space-y-5">
                                <div className="w-16 h-16 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto shadow-inner">
                                    <Navigation size={26} className="text-indigo-405 transform rotate-45 animate-pulse" />
                                </div>
                                <div className="max-w-md mx-auto">
                                    <h4 className="text-sm font-bold text-white">Tracking Inactive</h4>
                                    <p className="text-xs text-slate-450 mt-1 leading-relaxed">
                                        Enable GPS synchronization to compute travels, trace live mapping routes, and view online colleagues.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsTracking(true)}
                                    className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-black text-xs uppercase tracking-wider py-4 px-8 rounded-xl transition-all duration-200 active:scale-[0.98] flex justify-center items-center gap-2.5 mx-auto cursor-pointer shadow-lg shadow-indigo-600/15"
                                >
                                    <Play size={13} fill="currentColor" /> Start Duty Tracking
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                {/* Current Location Info */}
                                <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                                        <MapPin size={18} className="text-indigo-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Coordinate</span>
                                        <p className="text-xs font-mono font-bold text-slate-200 truncate mt-0.5">{currentLoc || "Acquiring satellites..."}</p>
                                    </div>
                                </div>

                                {/* Live Metrics Dial & Progress Blocks */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Live Speed</span>
                                        <div className="flex items-baseline gap-1 mt-2.5">
                                            <span className="text-2xl font-black text-indigo-400">{liveSpeed.toFixed(1)}</span>
                                            <span className="text-[10px] font-bold text-slate-500">KM/H</span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Session Travel</span>
                                        <div className="flex items-baseline gap-1 mt-2.5">
                                            <span className="text-2xl font-black text-indigo-400">{liveDistance.toFixed(2)}</span>
                                            <span className="text-[10px] font-bold text-slate-500">KM</span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Battery Level</span>
                                        <div className="flex items-center justify-between mt-3">
                                            <span className="text-sm font-black text-slate-200">
                                                {battery?.level ? `${(battery.level * 100).toFixed(0)}%` : "100%"}
                                            </span>
                                            <Battery size={16} className={battery?.charging ? "text-emerald-405" : "text-slate-400"} />
                                        </div>
                                        {/* Simple Battery Gauge */}
                                        <div className="w-full bg-slate-850 h-1.5 rounded-full mt-2 overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-300 ${battery?.level < 0.2 ? 'bg-red-500' : 'bg-indigo-500'}`}
                                                style={{ width: `${(battery?.level || 1) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Signal Connection</span>
                                        <div className="flex items-center justify-between mt-3">
                                            <span className="text-xs font-black text-slate-200 truncate pr-2">{networkStatus}</span>
                                            <Signal size={16} className="text-indigo-405 shrink-0" />
                                        </div>
                                    </div>
                                </div>

                                {/* Controls Button Panel */}
                                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={() => setIsTracking(false)}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all duration-150 flex justify-center items-center gap-2 cursor-pointer border border-red-500/20 active:scale-95 shadow-md shadow-red-500/5"
                                    >
                                        <Square size={12} fill="currentColor" /> Stop Tracking
                                    </button>
                                    <button
                                        onClick={() => navigate('/add-visit')}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all duration-150 flex justify-center items-center gap-2 cursor-pointer active:scale-95 shadow-md shadow-indigo-500/10"
                                    >
                                        <Plus size={14} strokeWidth={2.5} /> Log Visit Outreach
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: PENDING OUTREACH TASKS */}
                <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm flex flex-col hover:shadow-md transition-all duration-200">
                    <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                            <Clock className="text-indigo-650" size={16} /> Outreach Schedule
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate('/followups', { state: { openAddModal: true } })}
                                className="inline-flex items-center justify-center gap-1 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-all shadow-sm cursor-pointer active:scale-95"
                                title="Schedule Outreach Follow-Up"
                            >
                                <Plus size={10} strokeWidth={3} /> Add
                            </button>
                            <span className="bg-slate-50 border border-slate-200/60 text-slate-650 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-inner">
                                {followUps.length} Pending
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3 flex-grow overflow-y-auto pr-1 custom-scrollbar max-h-[300px]">
                        {followUps.length > 0 ? (
                            followUps.map((item, index) => {
                                const dateText = item.dateText || new Date(item.followUpDate).toLocaleDateString();

                                return (
                                    <div
                                        key={item.id || index}
                                        onClick={() => handleFollowUpClick(item)}
                                        className="group flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/40 rounded-xl transition-all duration-150 cursor-pointer active:scale-[0.98]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100/50 text-indigo-700 flex items-center justify-center font-black text-xs shadow-sm">
                                                {item.customerName?.charAt(0) || "C"}
                                            </div>
                                            <div>
                                                <span className="font-extrabold text-xs text-slate-800 block leading-tight">{item.customerName}</span>
                                                <span className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 mt-1 ${dateText === 'Overdue' ? 'text-rose-650' : 'text-slate-400'}`}>
                                                    <Calendar size={10} /> {dateText}
                                                </span>
                                            </div>
                                        </div>
                                        <button className="text-slate-405 group-hover:text-indigo-650 transition-colors p-1.5 bg-white rounded-lg border border-slate-200 cursor-pointer">
                                            <ChevronRight size={12} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50 border border-slate-200/40 rounded-2xl border-dashed h-full">
                                <div className="w-12 h-12 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-sm mb-3">
                                    <CheckCircle2 size={20} className="text-slate-400" />
                                </div>
                                <h4 className="text-slate-800 font-extrabold text-xs">All Caught Up!</h4>
                                <p className="text-slate-450 text-[10px] mt-1 max-w-[160px] mx-auto">No pending follow-ups scheduled for you today.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* QUICK ACTIONS HUB */}
            <div className="px-4 md:px-0">
                <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-4">Quick Command Hub</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div 
                            onClick={() => navigate('/add-visit')}
                            className="bg-gradient-to-br from-blue-50 to-indigo-50/40 hover:from-blue-100/60 hover:to-indigo-100/40 border border-indigo-100/40 p-4.5 rounded-2xl cursor-pointer transition-all duration-200 shadow-sm active:scale-95 group"
                        >
                            <div className="w-9 h-9 rounded-xl bg-white border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm mb-3 group-hover:scale-105 transition-transform">
                                <ClipboardList size={16} />
                            </div>
                            <h4 className="text-xs font-black text-slate-800 leading-tight">Add Visit</h4>
                            <p className="text-[10px] text-slate-450 mt-1 leading-snug">Log customer meeting</p>
                        </div>

                        <div 
                            onClick={() => navigate('/expenses')}
                            className="bg-gradient-to-br from-emerald-50 to-teal-50/40 hover:from-emerald-100/60 hover:to-teal-100/40 border border-emerald-100/40 p-4.5 rounded-2xl cursor-pointer transition-all duration-200 shadow-sm active:scale-95 group"
                        >
                            <div className="w-9 h-9 rounded-xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm mb-3 group-hover:scale-105 transition-transform">
                                <Wallet size={16} />
                            </div>
                            <h4 className="text-xs font-black text-slate-800 leading-tight">Log Expense</h4>
                            <p className="text-[10px] text-slate-450 mt-1 leading-snug">Add fuel, toll, foods</p>
                        </div>

                        <div 
                            onClick={() => navigate('/profile')}
                            className="bg-gradient-to-br from-purple-50 to-fuchsia-50/40 hover:from-purple-100/60 hover:to-fuchsia-100/40 border border-purple-100/40 p-4.5 rounded-2xl cursor-pointer transition-all duration-200 shadow-sm active:scale-95 group"
                        >
                            <div className="w-9 h-9 rounded-xl bg-white border border-purple-100 flex items-center justify-center text-purple-600 shadow-sm mb-3 group-hover:scale-105 transition-transform">
                                <Users size={16} />
                            </div>
                            <h4 className="text-xs font-black text-slate-800 leading-tight">My Profile</h4>
                            <p className="text-[10px] text-slate-450 mt-1 leading-snug">Edit user profile</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* TEAM WIDGET - HORIZONTALonline field force colleagues */}
            <div className="px-4 md:px-0">
                <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                            <Users className="text-indigo-650" size={16} /> Active Field Colleagues
                        </h3>
                        <span className="bg-indigo-50 border border-indigo-100/60 text-indigo-700 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm">
                            {activeColleagues.length} Online
                        </span>
                    </div>

                    {activeColleagues.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                            {activeColleagues.map((colleague) => (
                                <div 
                                    key={colleague.id}
                                    className="bg-slate-50 border border-slate-200/40 rounded-2xl p-4 flex flex-col gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.01)] hover:border-slate-355 transition-all duration-150"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-black flex items-center justify-center text-sm shadow-sm relative">
                                                {colleague.name.charAt(0)}
                                                <span className="absolute bottom-[-2px] right-[-2px] flex h-2.5 w-2.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="font-extrabold text-xs text-slate-800">{colleague.name}</h4>
                                                <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5 mt-0.5">
                                                    <Clock size={10} />
                                                    Active at {new Date(colleague.recordedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => navigate('/tracking')}
                                            className="p-1.5 bg-white border border-slate-200 text-indigo-650 hover:bg-indigo-50 rounded-lg active:scale-95 transition-all cursor-pointer shadow-inner"
                                            title="View Live Route"
                                        >
                                            <ArrowUpRight size={12} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-wider pt-2 border-t border-slate-100/60 mt-2">
                                        <span>🔋 {colleague.batteryLevel ? `${(colleague.batteryLevel * 100).toFixed(0)}%` : "100%"} {colleague.batteryCharging ? "⚡" : ""}</span>
                                        <span className="truncate max-w-[100px]">📶 {colleague.networkStatus || "ONLINE"}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center bg-slate-50 border border-slate-200/40 rounded-2xl border-dashed">
                            <Users size={28} className="text-slate-355 mx-auto mb-2" />
                            <h4 className="text-slate-800 font-extrabold text-xs">Solo Executive</h4>
                            <p className="text-slate-455 text-[10px] mt-1 max-w-[260px] mx-auto">No other colleagues are actively tracking on the field right now.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* EMERGENCY CONTACT / MANAGER CALL */}
            <div className="px-4 md:px-0 mt-6">
                <div 
                    onClick={() => window.open("tel:+919876543210")}
                    className="bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white p-5 rounded-3xl cursor-pointer transition-all duration-200 shadow-md shadow-red-500/10 active:scale-[0.98] flex items-center justify-between group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                            <Phone size={20} className="animate-pulse" />
                        </div>
                        <div className="text-left">
                            <h4 className="text-sm font-black uppercase tracking-wider">Emergency Manager Hotline</h4>
                            <p className="text-xs text-rose-100 font-medium mt-0.5">Need immediate assistance? Click to call Manish Kumar directly.</p>
                        </div>
                    </div>
                    <ArrowUpRight size={20} className="opacity-80 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </div>
            </div>

        </div>
    );
}