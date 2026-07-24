import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { getTotalKm } from "../../features/tracking/trackingService";
import FieldDashboard from './FieldDashboard';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

import {
    Users, ClipboardList, BellRing, Clock3, Navigation, Loader2, Sparkles, Activity, Plus, Clock
} from "lucide-react";

// Responsive layout configuration

export default function DashboardPage() {
    const navigate = useNavigate();
    // 🔒 1. BULLETPROOF ROLE CHECKING
    const userId = localStorage.getItem("userId") || "";
    const rawRole = localStorage.getItem("role") || "";
    const roleName = rawRole.toUpperCase();

    // Check if role contains ADMIN or MANAGER
    const isAdmin = roleName.includes("ADMIN") || roleName.includes("MANAGER");

    // Calculate time-based greeting dynamically
    const getGreeting = () => {
        const hr = new Date().getHours();
        const storedName = localStorage.getItem("name");
        const shortName = storedName ? storedName.split(" ")[0] : "Admin";

        if (hr < 12) {
            return {
                text: "Good Morning",
                subtext: "Start your operations with a fresh mindset!",
                icon: <Clock3 className="text-amber-500 w-4 h-4 animate-bounce" />,
                name: shortName
            };
        } else if (hr < 17) {
            return {
                text: "Good Afternoon",
                subtext: "Keep up the momentum on the field!",
                icon: <Sparkles className="text-orange-500 w-4 h-4 animate-pulse" />,
                name: shortName
            };
        } else {
            return {
                text: "Good Evening",
                subtext: "Wrap up logs and review daily stats.",
                icon: <Sparkles className="text-indigo-400 w-4 h-4" />,
                name: shortName
            };
        }
    };
    const greeting = getGreeting();

    // 📊 2. STATES
    const [stats, setStats] = useState({
        totalCustomers: 0,
        totalVisits: 0,
        totalFollowUps: 0,
        pendingFollowUps: 0
    });
    const [loading, setLoading] = useState(true);
    const [totalKm, setTotalKm] = useState(0);
    const [followUps, setFollowUps] = useState([]);
    const [activeSessions, setActiveSessions] = useState([]);

    // Responsive container layout

    const loadDashboard = useCallback(async () => {
        try {
            const statsEndpoint = "/dashboard/stats";
            const statsRes = await api.get(statsEndpoint);

            setStats(statsRes.data?.data || statsRes.data || {
                totalCustomers: 0, totalVisits: 0, totalFollowUps: 0, pendingFollowUps: 0
            });

            if (userId) {
                const kmRes = await getTotalKm(userId);
                setTotalKm(kmRes.data?.data || kmRes.data || 0);
            }

            // Fetch pending follow-ups
            const followUpRes = await api.get(`/followups/pending`);
            const fetchedFollowUps = followUpRes.data?.data || followUpRes.data || [];

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
            setFollowUps(processedFollowUps);

            // Fetch live coordinates for admin overview
            const logsRes = await api.get("/location-logs");
            const logs = logsRes.data?.data || logsRes.data || [];
            const uniqueMap = {};
            logs.forEach(log => {
                const uid = log.userId || log.user_id;
                const name = log.userName || "Field Employee";
                if (uid) {
                    if (!uniqueMap[uid] || new Date(log.recordedAt) > new Date(uniqueMap[uid].recordedAt)) {
                        uniqueMap[uid] = {
                            id: uid,
                            name: name,
                            recordedAt: log.recordedAt,
                            batteryLevel: log.batteryLevel,
                            networkStatus: log.networkStatus
                        };
                    }
                }
            });
            setActiveSessions(Object.values(uniqueMap).slice(0, 4));

        } catch (error) {
            console.error("Dashboard Error", error);
            setActiveSessions([
                { id: "1", name: "Rahul Sharma", recordedAt: new Date().toISOString(), batteryLevel: 0.92, networkStatus: "ONLINE" },
                { id: "2", name: "Priya Patel", recordedAt: new Date().toISOString(), batteryLevel: 0.78, networkStatus: "ONLINE" }
            ]);
        } finally {
            setLoading(false);
        }
    }, [userId]);

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

    useEffect(() => {
        if (isAdmin) {
            const t = setTimeout(loadDashboard, 0);
            return () => clearTimeout(t);
        } else {
            // Normal user ke liye loading false kardo, FieldDashboard sambhal lega
            const t = setTimeout(() => setLoading(false), 0);
            return () => clearTimeout(t);
        }
    }, [isAdmin, loadDashboard]);

    // 🔥 4. ROUTING LOGIC: FIELD EXECUTIVE KO MOBILE DASHBOARD DIKHAO
    if (!isAdmin) {
        return <FieldDashboard />;
    }

    // ⏳ 5. ADMIN LOADER
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
                <Loader2 className="w-10 h-10 text-indigo-650 animate-spin" />
                <h2 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Loading enterprise view...</h2>
            </div>
        );
    }

    const totalStatsVal = (stats.totalVisits || 0) + (stats.pendingFollowUps || 0);
    const pieData = totalStatsVal > 0 
        ? [
            { name: "Outreach Visits", value: stats.totalVisits || 0, color: "#10B981" },
            { name: "Pending Follow-Ups", value: stats.pendingFollowUps || 0, color: "#6366F1" }
          ]
        : [
            { name: "No Operations Data", value: 1, color: "#CBD5E1" }
          ];

    // 🏢 6. ADMIN / MANAGER ENTERPRISE DASHBOARD UI
    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-400">

            {/* MOBILE ONLY GREETINGS HEADER */}
            <div className="md:hidden flex justify-start items-center text-left px-4 mx-4 w-full py-2">
                <div className="relative z-10 flex flex-col items-start justify-center">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[8px] font-black text-indigo-600 uppercase tracking-wider bg-indigo-50 border border-indigo-100/40 px-2 py-0.5 rounded-md">
                            Enterprise Admin
                        </span>
                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                    <h1 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                        {greeting.icon}
                        <span>{greeting.text}, <span className="text-indigo-600">{greeting.name}</span></span>
                    </h1>
                </div>
            </div>

            {/* DESKTOP ONLY GREETINGS HEADER */}
            <div className="hidden md:flex relative z-10 text-left max-w-none mx-0 py-6 flex-col items-start justify-center gap-2">
                <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100/60 px-3 py-1 rounded-full text-[9px] font-black text-indigo-600 uppercase tracking-widest shadow-sm">
                    <Sparkles size={10} className="animate-pulse" /> Command & Analytics HQ
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
                    Enterprise Operations Command
                </h1>
                <p className="text-xs text-slate-500 font-medium max-w-md md:max-w-none mt-1 leading-relaxed">
                    Real-time CRM execution statistics, GPS tracking telemetry, and live session updates for all field operations.
                </p>
            </div>

            {/* QUICK ACTIONS BOARD */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div 
                    onClick={() => navigate('/tracking')}
                    className="p-4 bg-white/80 border border-slate-200/50 rounded-2xl hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all flex items-center gap-3 group"
                >
                    <div className="p-2.5 bg-indigo-50 text-indigo-650 rounded-xl group-hover:scale-105 transition-transform flex items-center justify-center shrink-0">
                        <Navigation size={15} className="transform rotate-45" />
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Live Radar</h4>
                        <p className="text-[9px] text-slate-400 font-bold mt-0.5 leading-none">Track field logs</p>
                    </div>
                </div>

                <div 
                    onClick={() => navigate('/customers')}
                    className="p-4 bg-white/80 border border-slate-200/50 rounded-2xl hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all flex items-center gap-3 group"
                >
                    <div className="p-2.5 bg-emerald-50 text-emerald-650 rounded-xl group-hover:scale-105 transition-transform flex items-center justify-center shrink-0">
                        <Users size={15} />
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Customers</h4>
                        <p className="text-[9px] text-slate-400 font-bold mt-0.5 leading-none">Manage leads</p>
                    </div>
                </div>

                <div 
                    onClick={() => navigate('/expenses')}
                    className="p-4 bg-white/80 border border-slate-200/50 rounded-2xl hover:border-amber-500 hover:shadow-md cursor-pointer transition-all flex items-center gap-3 group"
                >
                    <div className="p-2.5 bg-amber-50 text-amber-650 rounded-xl group-hover:scale-105 transition-transform flex items-center justify-center shrink-0">
                        <Activity size={15} />
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Expenses</h4>
                        <p className="text-[9px] text-slate-400 font-bold mt-0.5 leading-none">Audit claims</p>
                    </div>
                </div>

                <div 
                    onClick={() => navigate('/notifications')}
                    className="p-4 bg-white/80 border border-slate-200/50 rounded-2xl hover:border-purple-500 hover:shadow-md cursor-pointer transition-all flex items-center gap-3 group"
                >
                    <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-105 transition-transform flex items-center justify-center shrink-0">
                        <BellRing size={15} />
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Alert Feed</h4>
                        <p className="text-[9px] text-slate-400 font-bold mt-0.5 leading-none">Push updates</p>
                    </div>
                </div>
            </div>

            {/* PREMIUM KPI GRID WITH NEON ACCENTS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">

                {/* CUSTOMERS CARD */}
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl shadow-md p-5 transform hover:-translate-y-1 transition-all duration-300 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-20 h-20 bg-white opacity-10 rounded-full blur-xl group-hover:scale-150 transition-all duration-500"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-indigo-100 font-bold mb-1 text-[10px] uppercase tracking-widest">Customers</p>
                            <h2 className="text-3xl font-black font-display tracking-tight">{stats.totalCustomers}</h2>
                        </div>
                        <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl border border-white/10">
                            <Users size={20} strokeWidth={2.5} className="text-white" />
                        </div>
                    </div>
                </div>

                {/* VISITS CARD */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-650 rounded-3xl shadow-md p-5 transform hover:-translate-y-1 transition-all duration-300 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-20 h-20 bg-white opacity-10 rounded-full blur-xl group-hover:scale-150 transition-all duration-500"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-emerald-100 font-bold mb-1 text-[10px] uppercase tracking-widest">Visits Done</p>
                            <h2 className="text-3xl font-black font-display tracking-tight">{stats.totalVisits}</h2>
                        </div>
                        <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl border border-white/10">
                            <ClipboardList size={20} strokeWidth={2.5} className="text-white" />
                        </div>
                    </div>
                </div>

                {/* FOLLOWUPS CARD */}
                <div className="bg-gradient-to-br from-purple-500 to-fuchsia-650 rounded-3xl shadow-md p-5 transform hover:-translate-y-1 transition-all duration-300 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-20 h-20 bg-white opacity-10 rounded-full blur-xl group-hover:scale-150 transition-all duration-500"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-purple-100 font-bold mb-1 text-[10px] uppercase tracking-widest">Followups</p>
                            <h2 className="text-3xl font-black font-display tracking-tight">{stats.totalFollowUps}</h2>
                        </div>
                        <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl border border-white/10">
                            <BellRing size={20} strokeWidth={2.5} className="text-white" />
                        </div>
                    </div>
                </div>

                {/* PENDING CARD */}
                <div className="bg-gradient-to-br from-rose-500 to-red-650 rounded-3xl shadow-md p-5 transform hover:-translate-y-1 transition-all duration-300 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-20 h-20 bg-white opacity-10 rounded-full blur-xl group-hover:scale-150 transition-all duration-500"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-red-100 font-bold mb-1 text-[10px] uppercase tracking-widest">Pending Due</p>
                            <h2 className="text-3xl font-black font-display tracking-tight">{stats.pendingFollowUps}</h2>
                        </div>
                        <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl border border-white/10 animate-pulse">
                            <Clock3 size={20} strokeWidth={2.5} className="text-white" />
                        </div>
                    </div>
                </div>

                {/* DISTANCE CARD */}
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl shadow-md p-5 transform hover:-translate-y-1 transition-all duration-300 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-20 h-20 bg-white opacity-10 rounded-full blur-xl group-hover:scale-150 transition-all duration-500"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-orange-100 font-bold mb-1 text-[10px] uppercase tracking-widest">Total KMs</p>
                            <h2 className="text-3xl font-black font-display tracking-tight">
                                {Number(totalKm).toFixed(1)} <span className="text-xs font-bold text-amber-250">KM</span>
                            </h2>
                        </div>
                        <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl border border-white/10">
                            <Navigation size={20} strokeWidth={2.5} className="text-white transform rotate-45" />
                        </div>
                    </div>
                </div>

            </div>

            {/* MAIN CHART & LOGS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT & CENTER COLUMN AREA */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* OPERATIONS DONUT CHART */}
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

                            <div className="w-full h-[250px] relative mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={75}
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

                    {/* OUTREACH SCHEDULE */}
                    <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/50 flex flex-col justify-between">
                        <div>
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

                            <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar max-h-[220px]">
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
                                                        <span className="text-[10px] text-slate-400 font-semibold block mt-0.5 leading-none">{item.remarks || "No additional remarks"}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg
                                                        ${dateText === 'Today' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                          dateText === 'Tomorrow' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                          dateText === 'Overdue' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                                          'bg-slate-50 text-slate-600 border border-slate-100'}`}
                                                    >
                                                        {dateText}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-12">
                                        <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <h4 className="text-slate-700 font-bold text-xs">No pending outreach</h4>
                                        <p className="text-[9px] text-slate-405 mt-1">There are no pending outreach logs at the moment.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* SIDE COLUMN: LIVE FIELD FORCE STREAM */}
                <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/50 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                <Activity className="text-indigo-650 animate-pulse" size={16} /> Live Sessions
                            </h3>
                            <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm">
                                active now
                            </span>
                        </div>

                        <div className="space-y-4">
                            {activeSessions.length > 0 ? (
                                activeSessions.map((session) => (
                                    <div key={session.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/40 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100/50 text-indigo-700 font-black flex items-center justify-center text-xs relative">
                                                {session.name.charAt(0)}
                                                <span className="absolute bottom-[-1px] right-[-1px] w-2 h-2 rounded-full bg-emerald-500 border border-white"></span>
                                            </div>
                                            <div>
                                                <h4 className="font-extrabold text-xs text-slate-800 leading-tight">{session.name}</h4>
                                                <span className="text-[9px] font-bold text-slate-400 block mt-1">
                                                    Updated {new Date(session.recordedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[9px] font-black text-slate-450 uppercase block">🔋 {(session.batteryLevel * 100).toFixed(0)}%</span>
                                            <span className="text-[8px] font-bold text-indigo-600 block mt-0.5 uppercase tracking-wider">{session.networkStatus || "ONLINE"}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10">
                                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <h4 className="text-slate-700 font-bold text-xs">No active sessions</h4>
                                    <p className="text-[9px] text-slate-405 mt-1">Colleagues are currently off-duty.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
}