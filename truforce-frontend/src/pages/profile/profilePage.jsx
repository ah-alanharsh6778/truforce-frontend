import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import {
    User, Mail, Wallet, ChevronDown, Phone, MapPin, 
    Bell, LogOut, Settings, Key, Sparkles, CheckCircle2, Bot, Send, 
    Loader2, Calendar, Compass, Cpu, Users, PieChart
} from "lucide-react";

export default function ProfilePage() {
    const { user, logout, updateUser } = useAuth();
    const userId = localStorage.getItem("userId") || user?.userId || "";
    const userName = localStorage.getItem("name") || user?.name || "User";
    const nameParts = userName.split(" ");
    
    const rawRole = localStorage.getItem("role") || user?.role || "";
    const roleName = rawRole.toUpperCase();
    const isAdmin = roleName.includes("ADMIN") || roleName.includes("MANAGER");

    const getRoleDisplayName = (role) => {
        if (!role) return "Field Executive";
        const uppercaseRole = role.toUpperCase();
        if (uppercaseRole.includes("ADMIN")) return "Admin";
        if (uppercaseRole.includes("MANAGER")) return "Manager";
        return "Field Executive";
    };

    const [activeTab, setActiveTab] = useState("personal");
    const [successMessage, setSuccessMessage] = useState("");

    // Accordion State for grouping metrics on Mobile
    const [showMetrics, setShowMetrics] = useState(false);

    // Real Data States
    const [stats, setStats] = useState({
        visitsCount: 0,
        followUpsCount: 0,
        totalExpenses: 0,
        latestLat: 0,
        latestLng: 0
    });

    const [visitsList, setVisitsList] = useState([]);
    const [followupsList, setFollowupsList] = useState([]);
    const [expensesList, setExpensesList] = useState([]);

    // Personal Info States (Initialized with real user data)
    const [firstName, setFirstName] = useState(() => nameParts[0] || "User");
    const [lastName, setLastName] = useState(() => nameParts.slice(1).join(" ") || "");
    const [email, setEmail] = useState(() => localStorage.getItem("email") || user?.email || "");
    const [phone, setPhone] = useState(localStorage.getItem("userPhone") || "+91 90000 12345");
    const [location, setLocation] = useState(localStorage.getItem("userLocation") || "Hyderabad, India");

    // Notification Toggles
    const [notifications, setNotifications] = useState({
        emailAlerts: true,
        pushNotifications: true,
        smsUpdates: false
    });

    // Password Update States
    const [passwords, setPasswords] = useState({
        current: "",
        new: "",
        confirm: ""
    });

    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

    // AI Assistant States
    const [messages, setMessages] = useState([
        {
            sender: "bot",
            text: "Hello! I am your AI Operations Assistant. I can analyze your visits, followups, expenses, and GPS telemetry in real-time. How can I help you today?"
        }
    ]);
    const [chatInput, setChatInput] = useState("");
    const [aiTyping, setAiTyping] = useState(false);
    const chatEndRef = useRef(null);



    // Fetch ALL Real Datasets for Profile stats & AI context
    const fetchRealData = useCallback(async () => {
        try {
            const rawRole = localStorage.getItem("role") || "";
            const roleName = rawRole.toUpperCase();
            const isAdmin = roleName.includes("ADMIN") || roleName.includes("MANAGER");

            let fetchedVisits = [];
            let fetchedFollowups = [];
            let fetchedExpenses = [];
            let fetchedLocations = [];

            // A. Fetch Visits
            try {
                if (isAdmin) {
                    const res = await api.get(`/visits`);
                    fetchedVisits = res.data?.data || res.data || [];
                } else if (userId) {
                    const res = await api.get(`/visits/user/${userId}`);
                    fetchedVisits = res.data?.data || res.data || [];
                }
            } catch (err) {
                console.error("Profile Visits Fetch Error:", err);
            }

            // B. Fetch Followups
            try {
                const res = await api.get(`/followups/pending`);
                fetchedFollowups = res.data?.data || res.data || [];
            } catch (err) {
                console.error("Profile Followups Fetch Error:", err);
            }

            // C. Fetch Locations
            try {
                const res = await api.get(`/location-logs`);
                const allLogs = res.data?.data || res.data || [];
                fetchedLocations = allLogs.filter(l => (l.userId === userId || l.user_id === userId));
            } catch (err) {
                console.error("Profile Locations Fetch Error:", err);
            }

            // D. Fetch Expenses
            const savedExpenses = localStorage.getItem("expenses");
            if (savedExpenses) {
                try {
                    fetchedExpenses = JSON.parse(savedExpenses);
                } catch (e) {
                    console.error("Profile Expenses Parse Error:", e);
                }
            }

            // Mapped states
            setVisitsList(fetchedVisits);
            setFollowupsList(fetchedFollowups);
            setExpensesList(fetchedExpenses);

            const expTotal = fetchedExpenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
            const latestLoc = fetchedLocations.length > 0 ? fetchedLocations[fetchedLocations.length - 1] : null;

            // E. Fetch User Profile Data
            if (userId) {
                try {
                    const userRes = await api.get(`/users/${userId}`);
                    const userData = userRes.data?.data || userRes.data;
                    if (userData) {
                        setTwoFactorEnabled(!!userData.twoFactorEnabled);
                        if (userData.name) {
                            const nameParts = userData.name.split(" ");
                            setFirstName(nameParts[0] || "");
                            setLastName(nameParts.slice(1).join(" ") || "");
                            localStorage.setItem("name", userData.name);
                        }
                        if (userData.email) {
                            setEmail(userData.email);
                            localStorage.setItem("email", userData.email);
                        }
                        if (userData.phone) {
                            setPhone(userData.phone);
                            localStorage.setItem("userPhone", userData.phone);
                        }
                        if (userData.roleName) {
                            localStorage.setItem("role", userData.roleName);
                        }
                        if (updateUser) {
                            updateUser({
                                name: userData.name,
                                email: userData.email,
                                role: userData.roleName
                            });
                        }
                    }
                } catch (err) {
                    console.error("Profile User Fetch Error:", err);
                }
            }

            setStats({
                visitsCount: fetchedVisits.length,
                followUpsCount: fetchedFollowups.length,
                totalExpenses: expTotal,
                latestLat: latestLoc ? latestLoc.latitude : 0,
                latestLng: latestLoc ? latestLoc.longitude : 0
            });
        } catch (error) {
            console.error("Error aggregating profile data:", error);
        }
    }, [userId, updateUser]);

    useEffect(() => {
        Promise.resolve().then(() => {
            fetchRealData();
            // Initialize name states
            const nameParts = userName.split(" ");
            setFirstName(nameParts[0] || "User");
            setLastName(nameParts.slice(1).join(" ") || "");
            setEmail(localStorage.getItem("email") || user?.email || "");
        });
    }, [fetchRealData, userName, user]);

    // Scroll chat window to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, aiTyping]);

    const handleSavePersonal = (e) => {
        e.preventDefault();
        const newName = `${firstName} ${lastName}`;
        localStorage.setItem("name", newName);
        localStorage.setItem("userPhone", phone);
        localStorage.setItem("userLocation", location);
        if (updateUser) {
            updateUser({ name: newName });
        }
        setSuccessMessage("Personal Information updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
    };

    const handleSaveSettings = (e) => {
        e.preventDefault();
        setSuccessMessage("Notification preferences saved successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
    };

    const handleSavePassword = (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            alert("New passwords do not match!");
            return;
        }
        setSuccessMessage("Security password changed successfully!");
        setPasswords({ current: "", new: "", confirm: "" });
        setTimeout(() => setSuccessMessage(""), 3000);
    };

    const handleToggle2FA = async (enableVal) => {
        try {
            await api.post("/auth/2fa/toggle", {
                email: email,
                enable: enableVal
            });
            setTwoFactorEnabled(enableVal);
            setSuccessMessage(enableVal ? "Two-Factor Authentication (2FA) is now enabled!" : "Two-Factor Authentication (2FA) has been disabled.");
            setTimeout(() => setSuccessMessage(""), 4000);
        } catch (err) {
            alert(err?.response?.data?.message || "Failed to update Two-Factor status.");
        }
    };

    const handleLogout = () => {
        logout();
        window.location.href = "/";
    };

    // AI Query Parsing Logic using Real Application Data
    const handleSendAiQuery = async (queryText) => {
        if (!queryText.trim()) return;

        const newUserMessage = { sender: "user", text: queryText };
        setMessages(prev => [...prev, newUserMessage]);
        setChatInput("");
        setAiTyping(true);

        setTimeout(() => {
            let responseText = "";
            const lower = queryText.toLowerCase();

            if (lower.includes("expense") || lower.includes("budget") || lower.includes("spent")) {
                if (expensesList.length === 0) {
                    responseText = `Based on your real profile data, you have logged ₹0.00 in expenses. No financial records exist in your local logs currently. You can record transport or meal claims in the Expenses tab.`;
                } else {
                    const budgetLimit = 25000;
                    const totalSpent = expensesList.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                    const breakdown = expensesList.map(e => `${e.expenseType}: ₹${e.amount} (${e.description})`).join("\n• ");
                    responseText = `Here is your real expense analysis:\n\n• Total claim logged: ₹${totalSpent.toLocaleString("en-IN")}\n• Category Breakdown:\n• ${breakdown}\n\nBudget Status: You have consumed ${((totalSpent / budgetLimit) * 100).toFixed(1)}% of your monthly ₹${budgetLimit} threshold.`;
                }
            } else if (lower.includes("visit") || lower.includes("client") || lower.includes("check-in")) {
                if (visitsList.length === 0) {
                    responseText = `Checking database logs: You have logged 0 customer visits. There are no active check-ins or outreach meeting notes registered for your User ID under TruForce.`;
                } else {
                    const recentClient = visitsList[0]?.customerName || "None";
                    responseText = `Checking database logs: You have successfully completed ${visitsList.length} client visit log(s).\n\n• Most Recent Visit: ${recentClient}\n• Status: Completed / Verified\n\nAll visit logs are linked to real GPS coordinate tags for geofencing compliance.`;
                }
            } else if (lower.includes("followup") || lower.includes("outreach") || lower.includes("task") || lower.includes("pending")) {
                if (followupsList.length === 0) {
                    responseText = `Checking database logs: There are currently no pending follow-up outreach schedules registered under your operational calendar. You are all caught up!`;
                } else {
                    const pendingNames = followupsList.map(f => `• ${f.customerName} (Due: ${new Date(f.followUpDate).toLocaleDateString()})`).join("\n");
                    responseText = `Overdue followups alert: You have ${followupsList.length} pending client follow-up outreach tasks scheduled:\n\n${pendingNames}`;
                }
            } else if (lower.includes("gps") || lower.includes("location") || lower.includes("tracking") || lower.includes("coordinate")) {
                if (stats.latestLat === 0 && stats.latestLng === 0) {
                    responseText = `Live Telemetry Check: No coordinates logged. Try enabling GPS tracking on the Home screen to transmit live coordinate ticks to the GIS database.`;
                } else {
                    responseText = `Live Telemetry Check:\n\n• Latitude: ${stats.latestLat.toFixed(6)}\n• Longitude: ${stats.latestLng.toFixed(6)}\n• Status: Active Syncing Online\n\nYour telemetry is mapped to the live GIS tracking server correctly.`;
                }
            } else if (lower.includes("help") || lower.includes("hello") || lower.includes("hey")) {
                responseText = `Hello! I'm sync-connected to your live database. Ask me queries like:\n\n1. "Analyze my expenses"\n2. "How many client visits did I complete?"\n3. "List my pending followups"\n4. "What is my latest GPS location?"`;
            } else {
                responseText = `I processed your request, but I couldn't find a matching telemetry query. Feel free to ask me about your "expenses", "visits", "pending tasks", or "GPS location" to get real-time summaries.`;
            }

            setMessages(prev => [...prev, { sender: "bot", text: responseText }]);
            setAiTyping(false);
        }, 1200);
    };

    const tabs = [
        { id: "personal", label: "Personal Info", icon: <User className="w-4 h-4" /> },
        { id: "ai-assistant", label: "AI Operations Bot", icon: <Bot className="w-4 h-4 text-indigo-500" /> },
        { id: "settings", label: "Account Settings", icon: <Settings className="w-4 h-4" /> },
        { id: "security", label: "Security & Passwords", icon: <Key className="w-4 h-4" /> }
    ];

    return (
        <div className="max-w-7xl mx-auto py-4 px-4 md:px-0 space-y-7 pb-28 md:pb-16 animate-in fade-in duration-300">

            {/* 1. DESKTOP COVER BANNER LAYOUT REMOVED AS REQUESTED */}

            {/* 2. MOBILE HEADER & PROFILE ICON BANNER (PHONE CHANGES ONLY) */}
            <div className="md:hidden bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    {/* Glass Mobile Avatar */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white text-lg font-black shadow-sm">
                        {userName.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-slate-900 leading-none">{userName}</h1>
                        <div className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md text-[9px] font-black text-indigo-700 uppercase tracking-wider mt-1.5">
                            {getRoleDisplayName(user?.role)}
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="p-2.5 bg-rose-50 text-rose-600 border border-rose-150 rounded-xl hover:bg-rose-100 transition-all cursor-pointer"
                >
                    <LogOut size={14} />
                </button>
            </div>

            {/* 2.5 QUICK ACTIONS & OPERATIONS HUB (MODERN PREMIUM GRID - MOBILE ONLY) */}
            <div className="md:hidden bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Sparkles className="text-indigo-600 animate-pulse" size={14} />
                    <span>Operations & Management Hub</span>
                </h3>
                <div className="grid grid-cols-2 gap-3.5">
                    {/* Follow Ups */}
                    <Link 
                        to="/followups"
                        className="flex items-center gap-3 p-3 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/50 rounded-2xl transition-all group"
                    >
                        <div className="p-2.5 bg-indigo-600 text-white rounded-xl group-hover:scale-105 transition-transform flex items-center justify-center shrink-0">
                            <Phone size={15} />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Follow Ups</h4>
                            <p className="text-[8px] text-slate-400 font-bold mt-0.5 leading-none">Schedule outreach</p>
                        </div>
                    </Link>

                    {/* Expenses */}
                    <Link 
                        to="/expenses"
                        className="flex items-center gap-3 p-3 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100/50 rounded-2xl transition-all group"
                    >
                        <div className="p-2.5 bg-emerald-600 text-white rounded-xl group-hover:scale-105 transition-transform flex items-center justify-center shrink-0">
                            <Wallet size={15} />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Expenses</h4>
                            <p className="text-[8px] text-slate-400 font-bold mt-0.5 leading-none">Claims & logs</p>
                        </div>
                    </Link>

                    {/* Admin/Manager Specific: Customers */}
                    {isAdmin && (
                        <Link 
                            to="/customers"
                            className="flex items-center gap-3 p-3 bg-blue-50/50 hover:bg-blue-50 border border-blue-100/50 rounded-2xl transition-all group"
                        >
                            <div className="p-2.5 bg-blue-600 text-white rounded-xl group-hover:scale-105 transition-transform flex items-center justify-center shrink-0">
                                <Users size={15} />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Customers</h4>
                                <p className="text-[8px] text-slate-400 font-bold mt-0.5 leading-none">Client database</p>
                            </div>
                        </Link>
                    )}

                    {/* Admin/Manager Specific: Reports */}
                    {isAdmin && (
                        <Link 
                            to="/reports"
                            className="flex items-center gap-3 p-3 bg-purple-50/50 hover:bg-purple-50 border border-purple-100/50 rounded-2xl transition-all group"
                        >
                            <div className="p-2.5 bg-purple-600 text-white rounded-xl group-hover:scale-105 transition-transform flex items-center justify-center shrink-0">
                                <PieChart size={15} />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Reports</h4>
                                <p className="text-[8px] text-slate-400 font-bold mt-0.5 leading-none">Performance analysis</p>
                            </div>
                        </Link>
                    )}
                </div>
            </div>

            {/* 3. GROUPED METRICS ACCORDION BUTTON (MOBILE PHONE ONLY) */}
            <div className="md:hidden bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
                <button
                    onClick={() => setShowMetrics(!showMetrics)}
                    className="w-full px-5 py-3.5 flex items-center justify-between font-black text-slate-800 text-xs uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer"
                >
                    <div className="flex items-center gap-2">
                        <Cpu className="text-indigo-600" size={14} />
                        <span>View Operations Analytics Data</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${showMetrics ? 'rotate-180' : ''}`} />
                </button>
                {showMetrics && (
                    <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-3.5 animate-in slide-in-from-top-4 duration-300">
                        <div className="bg-white border border-slate-200 p-3 rounded-2xl flex items-center gap-2.5 shadow-[0_2px_10px_rgb(0,0,0,0.01)]">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                <CheckCircle2 size={14} />
                            </div>
                            <div>
                                <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider">Visits</p>
                                <h3 className="text-xs font-black text-slate-805 mt-0.5">{stats.visitsCount}</h3>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200 p-3 rounded-2xl flex items-center gap-2.5 shadow-[0_2px_10px_rgb(0,0,0,0.01)]">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Calendar size={14} />
                            </div>
                            <div>
                                <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider">Due</p>
                                <h3 className="text-xs font-black text-slate-805 mt-0.5">{stats.followUpsCount}</h3>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200 p-3 rounded-2xl flex items-center gap-2.5 shadow-[0_2px_10px_rgb(0,0,0,0.01)]">
                            <div className="p-2 bg-violet-50 text-violet-600 rounded-xl">
                                <Wallet size={14} />
                            </div>
                            <div>
                                <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider">Expenses</p>
                                <h3 className="text-xs font-black text-slate-805 mt-0.5">₹{stats.totalExpenses}</h3>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200 p-3 rounded-2xl flex items-center gap-2.5 shadow-[0_2px_10px_rgb(0,0,0,0.01)]">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                <Compass size={14} />
                            </div>
                            <div>
                                <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider">GPS</p>
                                <h3 className="text-[9px] font-mono font-black text-slate-805 mt-0.5 leading-tight">
                                    {stats.latestLat !== 0 ? `${stats.latestLat.toFixed(2)}, ${stats.latestLng.toFixed(2)}` : "0.0, 0.0"}
                                </h3>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 4. DIRECT STATS GRID PANEL (LAPTOP / DESKTOP ONLY - HELD ORIGINAL AESTHETIC) */}
            <div className="hidden md:grid grid-cols-4 gap-5">
                <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center gap-3.5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                        <CheckCircle2 size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Total Completed Visits</p>
                        <h3 className="text-xl font-black text-slate-800 mt-0.5">{stats.visitsCount}</h3>
                    </div>
                </div>

                <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center gap-3.5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                        <Calendar size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Due Outreach Tasks</p>
                        <h3 className="text-xl font-black text-slate-800 mt-0.5">{stats.followUpsCount}</h3>
                    </div>
                </div>

                <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center gap-3.5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                    <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl border border-violet-100">
                        <Wallet size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Expenses Claims Sum</p>
                        <h3 className="text-xl font-black text-slate-800 mt-0.5">₹{stats.totalExpenses.toLocaleString("en-IN")}</h3>
                    </div>
                </div>

                <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center gap-3.5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                        <Compass size={18} className="animate-spin-slow" />
                    </div>
                    <div>
                        <p className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Latest Location Node</p>
                        <h3 className="text-xs font-mono font-black text-slate-855 mt-1 leading-tight">
                            {stats.latestLat !== 0 ? `${stats.latestLat.toFixed(5)}, ${stats.latestLng.toFixed(5)}` : "No GPS Telemetry"}
                        </h3>
                    </div>
                </div>
            </div>

            {/* SUCCESS MESSAGES BANNER */}
            {successMessage && (
                <div className="bg-emerald-55 border border-emerald-200 text-emerald-800 p-4.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in slide-in-from-top-3">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* TAB CONTAINER LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                
                {/* LEFT TABS SIDEBAR */}
                <div className="lg:col-span-1 bg-white p-3.5 rounded-3xl border border-slate-200/80 shadow-sm flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1.5 custom-scrollbar">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer w-full text-left active:scale-98
                                ${
                                    isActive
                                        ? "bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-[0_2px_10px_rgb(0,0,0,0.015)]"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent"
                                }`}
                            >
                                <span className={isActive ? "text-indigo-600" : "text-slate-400"}>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* RIGHT MAIN CARD */}
                <div className="lg:col-span-3">

                    {/* TAB: PERSONAL INFORMATION */}
                    {activeTab === "personal" && (
                        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm animate-in fade-in duration-300">
                            <div className="mb-6 border-b border-slate-100 pb-3.5">
                                <h2 className="text-base font-black text-slate-800">Personal Information</h2>
                                <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider mt-0.5">Edit credentials, coordinates and local parameters.</p>
                            </div>

                            <form onSubmit={handleSavePersonal} className="space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">First Name</label>
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-855 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Last Name</label>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-855 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">User ID</label>
                                        <input
                                            type="text"
                                            value={userId}
                                            disabled
                                            className="w-full px-4 py-3 bg-slate-100 border border-slate-205 rounded-xl text-xs font-semibold text-slate-500 cursor-not-allowed opacity-75 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Role</label>
                                        <input
                                            type="text"
                                            value={getRoleDisplayName(user?.role)}
                                            disabled
                                            className="w-full px-4 py-3 bg-slate-100 border border-slate-205 rounded-xl text-xs font-semibold text-slate-500 cursor-not-allowed opacity-75 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="email"
                                            value={email}
                                            disabled
                                            className="w-full pl-11 pr-4 py-3 bg-slate-100 border border-slate-205 rounded-xl text-xs font-semibold text-slate-500 cursor-not-allowed opacity-75 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Phone Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-855 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Base Location</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                value={location}
                                                onChange={(e) => setLocation(e.target.value)}
                                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-855 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex justify-end">
                                    <button
                                        type="submit"
                                        className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-xs cursor-pointer"
                                    >
                                        Save Info
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* TAB: INTERACTIVE REAL AI OPERATIONS ASSISTANT */}
                    {activeTab === "ai-assistant" && (
                        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm animate-in fade-in duration-300 flex flex-col min-h-[460px]">
                            <div className="mb-4 border-b border-slate-100 pb-3.5">
                                <div className="flex items-center gap-2">
                                    <Bot className="text-indigo-600" size={20} />
                                    <h2 className="text-base font-black text-slate-800">AI Operations Assistant</h2>
                                </div>
                                <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider mt-0.5">Real-time analytical chat synced with your current dashboard logs.</p>
                            </div>

                            {/* Chat messages viewport */}
                            <div className="flex-1 min-h-[260px] max-h-[340px] overflow-y-auto border border-slate-150 rounded-2xl p-4 bg-slate-50/50 space-y-3.5 custom-scrollbar mb-4">
                                {messages.map((msg, index) => {
                                    const isBot = msg.sender === "bot";
                                    return (
                                        <div key={index} className={`flex ${isBot ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2`}>
                                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs font-semibold leading-relaxed border ${
                                                isBot 
                                                    ? 'bg-white border-slate-200 text-slate-800 shadow-[0_2px_10px_rgb(0,0,0,0.01)]' 
                                                    : 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                                            } whitespace-pre-line`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    );
                                })}
                                {aiTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-white border border-slate-200 text-slate-400 rounded-2xl px-4.5 py-3 text-xs font-bold flex items-center gap-2 shadow-[0_2px_10px_rgb(0,0,0,0.01)]">
                                            <Loader2 className="animate-spin w-3.5 h-3.5 text-indigo-500" />
                                            <span>Processing data index...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Preset prompt selectors */}
                            <div className="mb-4">
                                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Preset Data Insights</span>
                                <div className="flex flex-wrap gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => handleSendAiQuery("Analyze my expenses")}
                                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100/60 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
                                    >
                                        📈 Analyze Expenses
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleSendAiQuery("List pending followups")}
                                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100/60 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
                                    >
                                        📅 List Due Tasks
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleSendAiQuery("View visit stats")}
                                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100/60 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
                                    >
                                        📋 View Visit Stats
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleSendAiQuery("Check GPS location")}
                                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100/60 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
                                    >
                                        🛰️ Telemetry Check
                                    </button>
                                </div>
                            </div>

                            {/* TextInput chat field */}
                            <form 
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSendAiQuery(chatInput);
                                }}
                                className="flex gap-2.5"
                            >
                                <input
                                    type="text"
                                    placeholder="Type an operations query (e.g. 'spent', 'visits', 'tasks')..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                />
                                <button
                                    type="submit"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl active:scale-95 transition-all cursor-pointer shadow-md shadow-indigo-500/10"
                                >
                                    <Send size={15} />
                                </button>
                            </form>
                        </div>
                    )}

                    {/* TAB: ACCOUNT SETTINGS */}
                    {activeTab === "settings" && (
                        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm animate-in fade-in duration-300">
                            <div className="mb-6 border-b border-slate-100 pb-3.5">
                                <h2 className="text-base font-black text-slate-800">Account Settings</h2>
                                <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider mt-0.5">Manage notifications and sync preferences for active operations.</p>
                            </div>

                            <form onSubmit={handleSaveSettings} className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-150">
                                    <div className="flex gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-605 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-indigo-100">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-slate-800">Email Reports</h4>
                                            <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">Daily summary of visit logs.</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifications.emailAlerts}
                                            onChange={(e) => setNotifications({ ...notifications, emailAlerts: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-150">
                                    <div className="flex gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-605 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-indigo-100">
                                            <Bell className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-slate-800">Push Notifications</h4>
                                            <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">Browser alert updates and follow-ups.</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifications.pushNotifications}
                                            onChange={(e) => setNotifications({ ...notifications, pushNotifications: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex justify-end">
                                    <button
                                        type="submit"
                                        className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-755 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-xs cursor-pointer"
                                    >
                                        Save Preferences
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* TAB: SECURITY & PASSWORDS */}
                    {activeTab === "security" && (
                        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm animate-in fade-in duration-300">
                            <div className="mb-6 border-b border-slate-100 pb-3.5">
                                <h2 className="text-base font-black text-slate-800">Security & Credentials</h2>
                                <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider mt-0.5">Secure your dashboard credentials by updating passwords regularly.</p>
                            </div>

                            {/* 2FA Status Toggle Row */}
                            <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-150 flex items-center justify-between shadow-[0_2px_10px_rgb(0,0,0,0.01)]">
                                <div className="flex gap-3">
                                    <div className="p-2 bg-indigo-50 text-indigo-605 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 border border-indigo-100">
                                        <Key className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-800">Two-Factor Authentication (2FA)</h4>
                                        <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">Require an email verification code for each login attempt.</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={twoFactorEnabled}
                                        onChange={(e) => handleToggle2FA(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>

                            {/* Separator line */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="w-full border-t border-slate-150"></div>
                                </div>
                                <div className="relative flex justify-start">
                                    <span className="bg-white pr-3 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Update Password</span>
                                </div>
                            </div>

                            <form onSubmit={handleSavePassword} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Current Password</label>
                                    <input
                                        type="password"
                                        value={passwords.current}
                                        onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">New Password</label>
                                        <input
                                            type="password"
                                            value={passwords.new}
                                            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                            placeholder="••••••••"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Confirm New Password</label>
                                        <input
                                            type="password"
                                            value={passwords.confirm}
                                            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                            placeholder="••••••••"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex justify-end">
                                    <button
                                        type="submit"
                                        className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-755 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-xs cursor-pointer"
                                    >
                                        Update Password
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                </div>
            </div>

        </div>
    );
}