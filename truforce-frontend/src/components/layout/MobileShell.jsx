import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import useLocationTracker from "../../hooks/useLocationTracker";
import { 
    getAllVisits, createVisit 
} from "../../features/visit/visitService";
import { getAllCustomers, createCustomer } from "../../features/customer/customerService";
import { getPendingFollowUps, createFollowUp } from "../../features/followup/followupService";

// Recharts for the Analytics Graph
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";

import {
    LayoutDashboard, ClipboardList, Users, MoreHorizontal,
    Play, Square, Compass, Navigation, Wallet, PhoneCall,
    Plus, X, MapPin, Loader2, Phone, Map, ChevronRight, LogOut, Camera,
    FileText, Award, CheckCircle, Info, AlertCircle, Activity, Star, RefreshCw, Clock
} from "lucide-react";

export default function MobileShell() {
    const { user, logout } = useAuth();
    const mobileChartRef = useRef(null);
    const [mobileChartWidth, setMobileChartWidth] = useState(0);

    useEffect(() => {
        if (!mobileChartRef.current) return;
        const observer = new ResizeObserver((entries) => {
            if (!entries || entries.length === 0) return;
            setMobileChartWidth(entries[0].contentRect.width);
        });
        observer.observe(mobileChartRef.current);
        return () => observer.disconnect();
    }, [activeTab]);

    const userId = localStorage.getItem("userId") || user?.userId || "";
    const rawRole = localStorage.getItem("role") || "";
    const roleName = rawRole.toUpperCase();
    const isManager = roleName.includes("ADMIN") || roleName.includes("MANAGER");
    const userName = localStorage.getItem("name") || user?.name || "User";

    // Core Mobile Shell States
    const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard" | "activity" | "team" | "more"
    const [isDayStarted, setIsDayStarted] = useState(() => localStorage.getItem("isDayStarted") === "true");
    const [dayStartTime, setDayStartTime] = useState(() => localStorage.getItem("dayStartTime") || "");
    const [isTracking, setIsTracking] = useState(false);
    
    // Telemetry and Tracking Data from Hook
    const { 
        currentLoc, 
        error: gpsError,
        liveDistance,
        liveSpeed,
        battery,
        networkStatus
    } = useLocationTracker(userId, isTracking);

    // Business Data States
    const [visits, setVisits] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [followups, setFollowups] = useState([]);
    const [expenses, setExpenses] = useState(() => {
        const saved = localStorage.getItem("expenses");
        return saved ? JSON.parse(saved) : [];
    });
    
    // UI Loading and Interaction States
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fabOpen, setFabOpen] = useState(false);
    const [activeModal, setActiveModal] = useState(null); // null | "visit_details" | "add_visit" | "add_customer" | "add_expense" | "create_followup" | "checkout_flow"
    
    // Selected / Active Visit Details
    const [selectedVisit, setSelectedVisit] = useState(null);
    const [activeVisit, setActiveVisit] = useState(() => {
        const saved = localStorage.getItem("activeVisit");
        return saved ? JSON.parse(saved) : null;
    });
    const [activeVisitDuration, setActiveVisitDuration] = useState(0);
    const visitTimerRef = useRef(null);

    // Form inputs states
    const [newCustForm, setNewCustForm] = useState({ name: "", phone: "", email: "", city: "", address: "", contactPerson: "", state: "Telangana" });
    const [newVisitForm, setNewVisitForm] = useState({ customerId: "", notes: "" });
    const [newExpenseForm, setNewExpenseForm] = useState({ amount: "", expenseType: "Fuel", description: "", receiptName: "" });
    const [newFollowupForm, setNewFollowupForm] = useState({ customerId: "", customerName: "", date: "", time: "", remarks: "" });
    
    // Checkout specific variables
    const [checkoutForm, setCheckoutForm] = useState({ outcome: "Completed", notes: "" });
    const [checkoutKmGenerated, setCheckoutKmGenerated] = useState(0);

    // Manager dashboard states
    const [teamMembers] = useState([
        { id: "1", name: "Rahul Sharma", role: "Sales Executive", active: true, battery: 92, speed: 22, km: 8.2, status: "Checked-in at Client A" },
        { id: "2", name: "Priya Patel", role: "Sales Executive", active: true, battery: 78, speed: 0, km: 6.5, status: "Completed 3 Visits" },
        { id: "3", name: "Aarav Mehta", role: "Sales Executive", active: false, battery: 45, speed: 0, km: 4.1, status: "Offline" },
        { id: "4", name: "Neha Sen", role: "Sales Executive", active: true, battery: 85, speed: 15, km: 5.8, status: "Moving on Route" }
    ]);
    const [approvalRequests, setApprovalRequests] = useState([
        { id: "e1", type: "expense", title: "Rahul Sharma - Fuel Claim", subtitle: "₹1,250 for Hyderabad-Secunderabad travel", date: "Today" },
        { id: "v1", type: "visit", title: "Priya Patel - Client Meeting Approval", subtitle: "Checked in 250m out of geofence range", date: "Today" }
    ]);

    // Graph Data
    const chartData = [
        { name: "Mon", Visits: 3, Expenses: 450 },
        { name: "Tue", Visits: 5, Expenses: 1200 },
        { name: "Wed", Visits: 4, Expenses: 800 },
        { name: "Thu", Visits: 6, Expenses: 1500 },
        { name: "Fri", Visits: 5, Expenses: 950 },
        { name: "Sat", Visits: 2, Expenses: 300 }
    ];

    // Load Core Data from Services
    const loadMobileData = useCallback(async () => {
        setRefreshing(true);
        try {
            const rawRole = localStorage.getItem("role") || "";
            const isMan = rawRole.toUpperCase().includes("ADMIN") || rawRole.toUpperCase().includes("MANAGER");
            
            // Visits
            const visitData = await getAllVisits();
            const rawVisits = visitData?.data || visitData || [];
            
            // Filter today's visits if not manager
            if (isMan) {
                setVisits(rawVisits);
            } else {
                const todayStr = new Date().toDateString();
                const filtered = rawVisits.filter(v => {
                    if (v.userId !== userId) return false;
                    return new Date(v.visitTime).toDateString() === todayStr;
                });
                setVisits(filtered);
            }

            // Customers
            const customerData = await getAllCustomers();
            setCustomers(customerData || []);

            // Follow-ups
            const followupsData = await getPendingFollowUps();
            setFollowups(followupsData || []);
        } catch (err) {
            console.error("Failed to load mobile dashboard data:", err);
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        Promise.resolve().then(() => {
            loadMobileData();
        });
    }, [loadMobileData]);

    // Sync active visit timer duration
    useEffect(() => {
        if (activeVisit) {
            const checkinTime = new Date(activeVisit.checkinTime);
            visitTimerRef.current = setInterval(() => {
                const elapsedSeconds = Math.floor((new Date() - checkinTime) / 1000);
                setActiveVisitDuration(elapsedSeconds);
            }, 1000);
        } else {
            if (visitTimerRef.current) {
                clearInterval(visitTimerRef.current);
            }
            Promise.resolve().then(() => {
                setActiveVisitDuration(0);
            });
        }

        return () => {
            if (visitTimerRef.current) {
                clearInterval(visitTimerRef.current);
            }
        };
    }, [activeVisit]);

    // Format Duration Helper
    const formatDuration = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + "h " : ""}${m}m ${s}s`;
    };

    // Attendance Start/End Day
    const handleStartDay = () => {
        const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        localStorage.setItem("isDayStarted", "true");
        localStorage.setItem("dayStartTime", now);
        setIsDayStarted(true);
        setDayStartTime(now);
    };

    const handleEndDay = () => {
        if (activeVisit) {
            alert("⚠️ Cannot end day while a client visit is currently active! Please check out of your visit first.");
            return;
        }
        localStorage.removeItem("isDayStarted");
        localStorage.removeItem("dayStartTime");
        setIsDayStarted(false);
        setDayStartTime("");
        setIsTracking(false);
    };

    // Quick Geofenced Check-in
    const handleCheckIn = async (customerId, notes = "") => {
        if (!isDayStarted) {
            alert("⚠️ Please tap 'Start Day' to check in for attendance before starting client visits!");
            return;
        }

        try {
            const customer = customers.find(c => c.id === customerId);
            if (!customer) {
                alert("Customer not found.");
                return;
            }

            // Geofence coordinate range checking: Mock check-in coordinate (matches client with slight offset)
            const checkinLat = customer.latitude || 17.3850;
            const checkinLng = customer.longitude || 78.4867;

            // Trigger api check-in
            const res = await createVisit({
                userId,
                customerId,
                checkinLat,
                checkinLng,
                notes
            });

            const visitId = res?.data?.id || res?.id || `visit-${Date.now()}`;

            const checkinRecord = {
                visitId,
                customerId,
                customerName: customer.name,
                checkinTime: new Date().toISOString(),
                checkinLat,
                checkinLng
            };

            // Save checked-in status in state and localStorage
            localStorage.setItem("activeVisit", JSON.stringify(checkinRecord));
            setActiveVisit(checkinRecord);
            setIsTracking(true); // Automatically starts GPS tracking!
            setActiveModal(null);
            
            // Reload logs
            loadMobileData();
        } catch (err) {
            console.error("Check-in Failed:", err);
            const errCode = err?.response?.data?.message || err?.message || "";
            if (errCode.toLowerCase().includes("geofence")) {
                alert("🚨 Geofence Alert: You must be within 200m range of the client's office coordinate to check in!");
            } else {
                alert(`Check-in failed: ${errCode}`);
            }
        }
    };

    // Checkout Flow Step 1: Initiating Checkout
    const startCheckout = () => {
        if (!activeVisit) return;
        // Generate mock travel KM based on live coordinates tracker or mock a session average (e.g. 1.2 to 3.8 KM)
        const mockKm = Number((Math.random() * 2.5 + 1.2).toFixed(2));
        setCheckoutKmGenerated(mockKm);
        setCheckoutForm({ outcome: "Completed", notes: "" });
        setActiveModal("checkout_flow");
    };

    // Checkout Flow Step 2: Finalizing Checkout, Outcome, Expense and Followup Triggers
    const completeCheckout = async () => {
        try {
            // Send update visit checkout put request to backend
            const customer = customers.find(c => c.id === activeVisit.customerId);
            const checkoutLat = customer?.latitude || 17.3850;
            const checkoutLng = customer?.longitude || 78.4867;
            
            await api.put(`/visits/${activeVisit.visitId}`, {
                userId,
                customerId: activeVisit.customerId,
                checkinLat: activeVisit.checkinLat,
                checkinLng: activeVisit.checkinLng,
                checkoutLat,
                checkoutLng,
                outcome: checkoutForm.outcome,
                notes: checkoutForm.notes,
                visitDuration: Math.floor(activeVisitDuration / 60) || 1
            });

            // If an expense is logged in checkout flow, submit it
            if (newExpenseForm.amount && !isNaN(newExpenseForm.amount) && parseFloat(newExpenseForm.amount) > 0) {
                const updatedExpenses = [
                    {
                        id: Date.now(),
                        amount: parseFloat(newExpenseForm.amount),
                        expenseType: newExpenseForm.expenseType,
                        description: newExpenseForm.description || `${newExpenseForm.expenseType} Claim (Visit Related)`,
                        date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
                        createdAt: new Date().toISOString()
                    },
                    ...expenses
                ];
                setExpenses(updatedExpenses);
                localStorage.setItem("expenses", JSON.stringify(updatedExpenses));
                setNewExpenseForm({ amount: "", expenseType: "Fuel", description: "", receiptName: "" });
            }

            // If followup is scheduled in checkout flow, create it
            if (newFollowupForm.date) {
                await createFollowUp({
                    userId,
                    customerId: activeVisit.customerId,
                    followUpDate: `${newFollowupForm.date}T${newFollowupForm.time || "10:00"}:00`,
                    status: "PENDING",
                    remarks: newFollowupForm.remarks || "Scheduled during checkout."
                });
                setNewFollowupForm({ customerId: "", customerName: "", date: "", time: "", remarks: "" });
            }

            // Automatically Stop tracking
            setIsTracking(false);
            
            // Clean localStorage checked-in state
            localStorage.removeItem("activeVisit");
            setActiveVisit(null);
            setActiveModal(null);
            
            alert("✅ Visit Completed and Telemetry Logged Successfully!");
            loadMobileData();
        } catch (err) {
            console.error("Checkout failed:", err);
            alert("Failed to checkout. Please check connection.");
        }
    };

    // Submitting a new Customer
    const handleAddCustomer = async (e) => {
        e.preventDefault();
        try {
            await createCustomer({
                name: newCustForm.name,
                phone: newCustForm.phone,
                email: newCustForm.email,
                city: newCustForm.city,
                address: newCustForm.address,
                contactPerson: newCustForm.contactPerson,
                state: newCustForm.state,
                createdBy: userId
            });
            alert("Client Added Successfully!");
            setNewCustForm({ name: "", phone: "", email: "", city: "", address: "", contactPerson: "", state: "Telangana" });
            setActiveModal(null);
            loadMobileData();
        } catch (err) {
            console.error("Failed to add customer:", err);
            alert("Error adding customer. Check details.");
        }
    };

    // Submitting Quick Expense
    const handleQuickExpenseSubmit = (e) => {
        e.preventDefault();
        const amt = parseFloat(newExpenseForm.amount);
        if (isNaN(amt) || amt <= 0) {
            alert("Enter valid amount!");
            return;
        }

        const newExpense = {
            id: Date.now(),
            amount: amt,
            expenseType: newExpenseForm.expenseType,
            description: newExpenseForm.description || `${newExpenseForm.expenseType} Expense`,
            date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
            createdAt: new Date().toISOString()
        };

        const updated = [newExpense, ...expenses];
        setExpenses(updated);
        localStorage.setItem("expenses", JSON.stringify(updated));
        
        setNewExpenseForm({ amount: "", expenseType: "Fuel", description: "", receiptName: "" });
        setActiveModal(null);
        alert("Expense Logged successfully!");
    };

    // Quick Follow-up Creation
    const handleQuickFollowupSubmit = async (e) => {
        e.preventDefault();
        if (!newFollowupForm.customerId || !newFollowupForm.date) {
            alert("Please pick a customer and followup date.");
            return;
        }

        try {
            await createFollowUp({
                userId,
                customerId: newFollowupForm.customerId,
                followUpDate: `${newFollowupForm.date}T${newFollowupForm.time || "10:00"}:00`,
                status: "PENDING",
                remarks: newFollowupForm.remarks
            });
            alert("Followup Scheduled Successfully!");
            setNewFollowupForm({ customerId: "", customerName: "", date: "", time: "", remarks: "" });
            setActiveModal(null);
            loadMobileData();
        } catch (err) {
            console.error("Failed to create followup:", err);
            alert("Error scheduling followup.");
        }
    };

    // Managers Actions
    const handleApprove = (id, type) => {
        setApprovalRequests(prev => prev.filter(r => r.id !== id));
        alert(`Approved ${type} request!`);
    };

    const handleReject = (id, type) => {
        setApprovalRequests(prev => prev.filter(r => r.id !== id));
        alert(`Rejected ${type} request.`);
    };

    // Sub-renders
    const renderActiveVisitBar = () => {
        if (!activeVisit) return null;
        return (
            <div className="bg-indigo-650 text-white px-4 py-3 rounded-2xl flex items-center justify-between shadow-[0_8px_20px_rgba(79,70,229,0.25)] border border-indigo-500/30 animate-pulse">
                <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <div>
                        <h4 className="text-xs font-black tracking-wide leading-none">{activeVisit.customerName}</h4>
                        <span className="text-[10px] font-medium opacity-80 mt-1 block">Active Check-in • {formatDuration(activeVisitDuration)}</span>
                    </div>
                </div>
                <button 
                    onClick={startCheckout} 
                    className="bg-white text-indigo-700 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                    Checkout
                </button>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans relative pb-24 text-slate-800">
            {/* Top Premium Sticky Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-black flex items-center justify-center text-sm shadow-md shadow-indigo-600/10">
                        {userName?.charAt(0) || "U"}
                    </div>
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 leading-tight">TruForce</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">{roleName} Portal</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Network & Battery Status indicator */}
                    <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 border border-slate-200/40 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide text-slate-500">
                        <span>{networkStatus}</span>
                        {battery && <span>• 🔋 {(battery.level * 100).toFixed(0)}%</span>}
                    </div>

                    <button 
                        onClick={loadMobileData} 
                        className={`p-2 text-slate-400 hover:text-slate-600 bg-slate-100 border border-slate-200/20 rounded-lg active:scale-95 transition-all cursor-pointer ${refreshing ? "animate-spin" : ""}`}
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </header>

            {/* Main Tab Views Wrapper */}
            <main className="flex-1 p-4 space-y-4 overflow-y-auto">
                
                {/* Global loading screen */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] space-y-3">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aggregating Cloud CRM...</span>
                    </div>
                ) : (
                    <>
                        {renderActiveVisitBar()}

                        {/* TAB 1: DASHBOARD */}
                        {activeTab === "dashboard" && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                
                                {/* Day Attendance Card */}
                                <div className="bg-white rounded-3xl border border-slate-200/40 p-4.5 shadow-[0_8px_30px_rgb(0,0,0,0.012)] flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-405">Field Duty Switch</h4>
                                        <p className="text-[11px] font-bold text-slate-450 mt-1">
                                            {isDayStarted 
                                                ? `Attendance Logged • In at ${dayStartTime}`
                                                : "Tap to record check-in attendance"
                                            }
                                        </p>
                                    </div>
                                    
                                    {!isDayStarted ? (
                                        <button 
                                            onClick={handleStartDay}
                                            className="bg-emerald-500 text-white px-4 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-500/10 active:scale-95 transition-all cursor-pointer"
                                        >
                                            <Play size={13} fill="white" /> Start Day
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={handleEndDay}
                                            className="bg-rose-500 text-white px-4 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-wider shadow-md shadow-rose-500/10 active:scale-95 transition-all cursor-pointer"
                                        >
                                            <Square size={13} fill="white" /> End Day
                                        </button>
                                    )}
                                </div>

                                {/* ROLE BASED DASHBOARD LAYOUT */}
                                {isManager ? (
                                    /* ==================== MANAGER DASHBOARD ==================== */
                                    <div className="space-y-4">
                                        {/* Managers Stats Grid */}
                                        <div className="grid grid-cols-2 gap-3.5">
                                            <div className="bg-gradient-to-br from-indigo-500 to-indigo-650 rounded-3xl p-4 shadow-sm text-white">
                                                <h5 className="text-[9px] font-black uppercase tracking-wider text-indigo-150">Active Field Force</h5>
                                                <h3 className="text-2xl font-black mt-1 leading-none">
                                                    {teamMembers.filter(t => t.active).length} / {teamMembers.length}
                                                </h3>
                                                <span className="text-[9px] font-bold text-indigo-100 block mt-2">Executives online now</span>
                                            </div>
                                            <div className="bg-gradient-to-br from-emerald-500 to-emerald-650 rounded-3xl p-4 shadow-sm text-white">
                                                <h5 className="text-[9px] font-black uppercase tracking-wider text-emerald-150">KM Sync Coverage</h5>
                                                <h3 className="text-2xl font-black mt-1 leading-none">
                                                    {teamMembers.reduce((sum, item) => sum + item.km, 0).toFixed(1)} KM
                                                </h3>
                                                <span className="text-[9px] font-bold text-emerald-100 block mt-2">Combined travels logged</span>
                                            </div>
                                        </div>

                                        {/* Live Field force Tracker Mini Map */}
                                        <div className="bg-white rounded-3xl border border-slate-200/40 p-4 shadow-sm">
                                            <div className="flex justify-between items-center mb-3">
                                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                                    <Compass size={14} className="text-indigo-600 animate-spin" /> Live Field Map
                                                </h3>
                                                <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide">
                                                    Interactive Stream
                                                </span>
                                            </div>
                                            {/* Vector SVG Mock Map of Hyderabad locations */}
                                            <div className="h-44 bg-indigo-50/50 border border-slate-100 rounded-2xl relative overflow-hidden flex items-center justify-center">
                                                <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M 0,20 Q 50,80 150,30 T 300,100" fill="none" stroke="#4f46e5" strokeWidth="4" />
                                                    <path d="M 50,150 Q 200,90 280,180" fill="none" stroke="#10b981" strokeWidth="2" />
                                                    <circle cx="120" cy="40" r="3" fill="#4f46e5" />
                                                    <circle cx="200" cy="110" r="3" fill="#10b981" />
                                                </svg>
                                                {/* Mini Avatars representing live coordinates */}
                                                <div className="absolute top-8 left-1/4 animate-bounce" style={{ animationDuration: "2.5s" }}>
                                                    <div className="flex flex-col items-center">
                                                        <span className="px-1.5 py-0.5 bg-indigo-650 text-white text-[7px] font-black rounded-md shadow-md uppercase">Rahul</span>
                                                        <div className="w-5 h-5 rounded-full border-2 border-white bg-indigo-500 text-white font-extrabold flex items-center justify-center text-[8px] shadow-lg">R</div>
                                                    </div>
                                                </div>
                                                <div className="absolute bottom-10 right-1/3 animate-bounce" style={{ animationDuration: "3.5s" }}>
                                                    <div className="flex flex-col items-center">
                                                        <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-[7px] font-black rounded-md shadow-md uppercase">Priya</span>
                                                        <div className="w-5 h-5 rounded-full border-2 border-white bg-emerald-500 text-white font-extrabold flex items-center justify-center text-[8px] shadow-lg">P</div>
                                                    </div>
                                                </div>
                                                <div className="absolute top-1/2 right-12 animate-bounce" style={{ animationDuration: "3s" }}>
                                                    <div className="flex flex-col items-center">
                                                        <span className="px-1.5 py-0.5 bg-slate-700 text-white text-[7px] font-black rounded-md shadow-md uppercase">Neha</span>
                                                        <div className="w-5 h-5 rounded-full border-2 border-white bg-slate-650 text-white font-extrabold flex items-center justify-center text-[8px] shadow-lg">N</div>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 z-10 flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm"><MapPin size={12} className="text-indigo-600" /> Tracking 3 executives in real-time</span>
                                            </div>
                                        </div>

                                        {/* Managers Approvals Panel */}
                                        <div className="bg-white rounded-3xl border border-slate-200/40 p-4 shadow-sm space-y-3">
                                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Pending Approvals</h3>
                                            
                                            {approvalRequests.length > 0 ? (
                                                <div className="space-y-3">
                                                    {approvalRequests.map(r => (
                                                        <div key={r.id} className="border border-slate-100 rounded-2xl p-3 bg-slate-50/50 flex flex-col gap-2.5">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mb-1 ${r.type === 'expense' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-rose-50 text-rose-600 border border-rose-250'}`}>{r.type}</span>
                                                                    <h4 className="text-xs font-black text-slate-800 leading-snug">{r.title}</h4>
                                                                    <p className="text-[10px] font-medium text-slate-450 mt-0.5">{r.subtitle}</p>
                                                                </div>
                                                                <span className="text-[8px] font-black text-slate-400 uppercase">{r.date}</span>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => handleApprove(r.id, r.type)} className="flex-1 bg-indigo-600 text-white py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm cursor-pointer hover:bg-indigo-700 transition-all">Approve</button>
                                                                <button onClick={() => handleReject(r.id, r.type)} className="flex-1 border border-slate-200 text-slate-500 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-all">Reject</button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-6 text-slate-400 flex flex-col items-center justify-center">
                                                    <CheckCircle size={22} className="text-emerald-500 mb-1.5" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">All caught up!</span>
                                                </div>
                                            )}
                                            {/* Performance Stream (Leaderboards Summary) */}
                                            <div className="bg-white rounded-3xl border border-slate-200/40 p-4 shadow-sm">
                                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-3.5">Top Performers Leaderboard</h3>
                                                <div className="space-y-3">
                                                    {teamMembers.slice(0, 3).map((m, index) => (
                                                        <div key={m.id} className="flex items-center justify-between border-b border-slate-50 pb-2">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs font-black text-slate-400 w-4">#{index + 1}</span>
                                                                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-extrabold flex items-center justify-center text-xs">{m.name.charAt(0)}</div>
                                                                <div>
                                                                    <h4 className="text-xs font-extrabold text-slate-850 leading-tight">{m.name}</h4>
                                                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">{m.status}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-xs font-black text-indigo-605">{m.km.toFixed(1)} KM</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Team Weekly Visits Chart */}
                                            <div className="bg-white rounded-3xl border border-slate-200/40 p-4 shadow-sm">
                                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2">Team Weekly Visits</h3>
                                                <div ref={mobileChartRef} className="h-36 w-full relative min-w-0">
                                                    {mobileChartWidth > 0 && (
                                                        <BarChart width={mobileChartWidth} height={144} data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 9, fontWeight: 700 }} />
                                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 9, fontWeight: 700 }} />
                                                            <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }} />
                                                            <Bar dataKey="Visits" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={16} />
                                                        </BarChart>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* ==================== SALES EXECUTIVE DASHBOARD ==================== */
                                    <div className="space-y-4">
                                        
                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 gap-3.5">
                                            <div className="bg-gradient-to-br from-indigo-500 to-indigo-650 rounded-3xl p-4 shadow-sm text-white relative overflow-hidden">
                                                <h5 className="text-[9px] font-black uppercase tracking-wider text-indigo-150">Today's Travels</h5>
                                                <h3 className="text-2xl font-black mt-1 leading-none">
                                                    {(liveDistance).toFixed(2)} <span className="text-[10px] font-black text-indigo-200">KM</span>
                                                </h3>
                                                {isTracking ? (
                                                    <span className="text-[8px] font-black text-emerald-300 block mt-2 uppercase tracking-widest animate-pulse">Sync Active</span>
                                                ) : (
                                                    <span className="text-[8px] font-black text-indigo-200 block mt-2 uppercase tracking-widest">Tracking Off</span>
                                                )}
                                            </div>

                                            <div className="bg-gradient-to-br from-emerald-500 to-emerald-650 rounded-3xl p-4 shadow-sm text-white relative overflow-hidden">
                                                <h5 className="text-[9px] font-black uppercase tracking-wider text-emerald-150">Visits Completed</h5>
                                                <h3 className="text-2xl font-black mt-1 leading-none">
                                                    {visits.filter(v => v.checkoutLat != null).length} <span className="text-[10px] font-black text-emerald-200">Visits</span>
                                                </h3>
                                                <span className="text-[8px] font-bold text-emerald-105 block mt-2 uppercase tracking-wider">Out of {visits.length} scheduled</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3.5">
                                            <div className="bg-white rounded-3xl border border-slate-200/40 p-4 shadow-sm">
                                                <h5 className="text-[9px] font-black uppercase tracking-wider text-slate-405">Pending Followups</h5>
                                                <h3 className="text-xl font-black mt-1 leading-none text-slate-805">{followups.length}</h3>
                                                <span className="text-[8px] font-bold text-slate-400 block mt-2 uppercase tracking-wider">Requires scheduling</span>
                                            </div>

                                            <div className="bg-white rounded-3xl border border-slate-200/40 p-4 shadow-sm">
                                                <h5 className="text-[9px] font-black uppercase tracking-wider text-slate-405">Today's Claims</h5>
                                                <h3 className="text-xl font-black mt-1 leading-none text-slate-805">
                                                    ₹{expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)}
                                                </h3>
                                                <span className="text-[8px] font-bold text-slate-400 block mt-2 uppercase tracking-wider">From {expenses.length} claims</span>
                                            </div>
                                        </div>

                                        {/* Next Customer / Check-in deck */}
                                        <div className="bg-white rounded-3xl border border-slate-200/40 p-4.5 shadow-sm space-y-3.5">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5"><MapPin size={13} className="text-indigo-600" /> Next Client Route</h3>
                                                <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide">Route map</span>
                                            </div>

                                            {customers.length > 0 ? (
                                                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                    <div>
                                                        <h4 className="text-xs font-black text-slate-800 leading-snug">{customers[0].name}</h4>
                                                        <p className="text-[10px] font-bold text-slate-405 mt-1">{customers[0].address}</p>
                                                        <p className="text-[9px] font-extrabold text-indigo-600 mt-2 uppercase tracking-wide flex items-center gap-1"><Compass size={11} /> 120m away • Within range</p>
                                                    </div>

                                                    <button 
                                                        onClick={() => handleCheckIn(customers[0].id)}
                                                        className="bg-indigo-600 text-white py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm shadow-indigo-650/10 hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer whitespace-nowrap self-start sm:self-center"
                                                    >
                                                        Quick Check-in
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-center py-6 text-slate-400">
                                                    <Info size={18} className="mx-auto mb-1 text-slate-300" />
                                                    <p className="text-[10px] font-bold text-slate-405">No customers saved inside crm database.</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Recent Visits Grid */}
                                        <div className="bg-white rounded-3xl border border-slate-200/40 p-4 shadow-sm space-y-3">
                                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Today's Visits Agenda</h3>
                                            
                                            {visits.length > 0 ? (
                                                <div className="space-y-2.5">
                                                    {visits.map(v => (
                                                        <div 
                                                            key={v.id} 
                                                            onClick={() => { setSelectedVisit(v); setActiveModal("visit_details"); }}
                                                            className="flex items-center justify-between p-3 border border-slate-100 rounded-2xl bg-slate-50/55 cursor-pointer active:bg-slate-100/50 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-extrabold ${v.checkoutLat ? "bg-emerald-50 text-emerald-600 border border-emerald-150" : "bg-indigo-50 text-indigo-650 border border-indigo-150"}`}>
                                                                    {v.checkoutLat ? <CheckCircle size={14} /> : <Clock size={14} />}
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-xs font-extrabold text-slate-800 leading-snug">{v.customerName || "Customer Name"}</h4>
                                                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">{new Date(v.visitTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${v.checkoutLat ? "bg-emerald-50 text-emerald-605" : "bg-indigo-50 text-indigo-605"}`}>
                                                                    {v.checkoutLat ? "Checked-out" : "Checked-in"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl text-slate-400">
                                                    <ClipboardList size={22} className="mx-auto mb-1.5 text-slate-350" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">No visits logged today.</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 2: ACTIVITY */}
                        {activeTab === "activity" && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                
                                {/* Timeline mini map layout */}
                                <div className="bg-white rounded-3xl border border-slate-200/40 p-4 shadow-sm">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-1.5"><Map size={14} className="text-indigo-600" /> Route & Telemetry logs</h3>
                                    
                                    <div className="h-40 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center relative overflow-hidden">
                                        <svg className="absolute inset-0 w-full h-full stroke-slate-200 fill-none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M 10,80 L 120,40 L 220,130 L 320,60" stroke="#4f46e5" strokeWidth="4" strokeLinecap="round" />
                                            <circle cx="10" cy="80" r="5" fill="#4f46e5" />
                                            <circle cx="120" cy="40" r="5" fill="#4f46e5" />
                                            <circle cx="220" cy="130" r="5" fill="#10b981" />
                                            <circle cx="320" cy="60" r="5" fill="#e11d48" />
                                        </svg>
                                        <div className="absolute top-4 left-4 bg-white/90 border border-slate-200 p-2 rounded-xl text-[9px] font-bold text-slate-500 shadow-sm space-y-0.5">
                                            <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span> Start Day Point</div>
                                            <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Visit 1 Pin</div>
                                            <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Current Location</div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 absolute bottom-3 right-3 bg-white px-2.5 py-1 border border-slate-100 rounded-lg shadow-sm">Updated just now</span>
                                    </div>
                                </div>

                                {/* Visits timeline feed */}
                                <div className="bg-white rounded-3xl border border-slate-200/40 p-4.5 shadow-sm space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Timeline stream</h3>
                                    
                                    {visits.length > 0 || isDayStarted ? (
                                        <div className="relative border-l border-slate-200 pl-4.5 ml-2.5 space-y-6 py-2.5">
                                            
                                            {/* Currently active check-in visit (if any) */}
                                            {activeVisit && (
                                                <div className="relative">
                                                    <span className="absolute left-[-24px] top-1.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100 animate-ping"></span>
                                                    <span className="absolute left-[-24px] top-1.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span>
                                                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3.5">
                                                        <h4 className="text-xs font-black text-emerald-800">{activeVisit.customerName}</h4>
                                                        <p className="text-[10px] font-medium text-emerald-700 mt-1">Checked in at {new Date(activeVisit.checkinTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded-lg font-black uppercase">Active {formatDuration(activeVisitDuration)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* List of completed visits */}
                                            {visits.map(v => (
                                                <div key={v.id} className="relative">
                                                    <span className={`absolute left-[-23px] top-1.5 w-2 h-2 rounded-full ${v.checkoutLat ? "bg-slate-400" : "bg-indigo-500 ring-4 ring-indigo-50"}`}></span>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between items-start">
                                                            <h4 className="text-xs font-black text-slate-800 leading-snug">{v.customerName}</h4>
                                                            <span className="text-[8px] font-extrabold text-slate-400 uppercase">{new Date(v.visitTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                                                        </div>
                                                        <p className="text-[10px] font-bold text-slate-455">{v.notes || "No notes logged."}</p>
                                                        {v.checkoutLat && (
                                                            <div className="flex gap-2 mt-1">
                                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-slate-200">Outcome: {v.outcome || "Completed"}</span>
                                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-slate-200">Duration: {v.visitDuration || 0} mins</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Start day log */}
                                            {isDayStarted && (
                                                <div className="relative">
                                                    <span className="absolute left-[-23px] top-1.5 w-2 h-2 rounded-full bg-slate-400"></span>
                                                    <div>
                                                        <h4 className="text-xs font-extrabold text-slate-500 leading-snug uppercase tracking-wider">Attendance Logged</h4>
                                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">Started day at {dayStartTime}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 text-slate-400">
                                            <Activity size={22} className="mx-auto mb-2 text-slate-300" />
                                            <p className="text-[10px] font-bold text-slate-405">No events logged in timeline stream.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 3: TEAM */}
                        {activeTab === "team" && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                
                                {isManager ? (
                                    /* ==================== MANAGER TEAM VIEW ==================== */
                                    <div className="space-y-4">
                                        <div className="bg-white rounded-3xl border border-slate-200/40 p-4 shadow-sm space-y-3">
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Team Directory ({teamMembers.length})</h3>
                                                <span className="text-[9px] font-black text-indigo-650 uppercase tracking-widest">Active Stream</span>
                                            </div>

                                            <div className="space-y-3">
                                                {teamMembers.map(t => (
                                                    <div key={t.id} className="border border-slate-100 rounded-2xl p-3 bg-slate-50/50 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-150 text-indigo-700 font-black flex items-center justify-center text-xs relative">
                                                                {t.name.charAt(0)}
                                                                {t.active && <span className="absolute bottom-[-1px] right-[-1px] w-2 h-2 rounded-full bg-emerald-500 border border-white"></span>}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-black text-slate-800 leading-tight">{t.name}</h4>
                                                                <p className="text-[9px] font-extrabold text-slate-400 mt-0.5">{t.role} • 🔋 {t.battery}%</p>
                                                                <p className="text-[9px] font-bold text-indigo-600 mt-1 flex items-center gap-0.5"><Star size={9} fill="currentColor" /> {t.status}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-xs font-black text-slate-800 block">{t.km.toFixed(1)} KM</span>
                                                            <span className="text-[8px] font-black text-slate-400 uppercase block mt-0.5">{t.active ? `${t.speed} KM/H` : "OFFLINE"}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Download Team Reports Excel Sheets */}
                                        <div className="bg-white rounded-3xl border border-slate-200/40 p-4 shadow-sm space-y-3">
                                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Excel telemetry exports</h3>
                                            <div className="grid grid-cols-2 gap-2.5">
                                                <button 
                                                    onClick={() => alert("Downloading Visits report...")}
                                                    className="border border-indigo-100 bg-indigo-50/50 text-indigo-700 p-3 rounded-2xl text-[10px] font-black uppercase tracking-wider flex flex-col items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                                                >
                                                    <FileText size={18} /> Download Visits
                                                </button>
                                                <button 
                                                    onClick={() => alert("Downloading KM Tracking report...")}
                                                    className="border border-indigo-100 bg-indigo-50/50 text-indigo-700 p-3 rounded-2xl text-[10px] font-black uppercase tracking-wider flex flex-col items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                                                >
                                                    <Navigation size={18} className="transform rotate-45" /> Download KMs
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* ==================== SALES EXECUTIVE TEAM VIEW ==================== */
                                    <div className="space-y-4">
                                        
                                        {/* Reporting Manager details card */}
                                        <div className="bg-white rounded-3xl border border-slate-200/40 p-4.5 shadow-sm space-y-3">
                                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Reporting Manager</h3>
                                            
                                            <div className="border border-slate-100 rounded-2xl p-3.5 bg-slate-50/50 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-indigo-650 text-white font-black flex items-center justify-center text-sm shadow-md">
                                                        M
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-black text-slate-800 leading-snug">Manish Kumar</h4>
                                                        <p className="text-[10px] font-extrabold text-slate-400 mt-0.5">Regional Head (Telangana)</p>
                                                    </div>
                                                </div>
                                                <a 
                                                    href="tel:+919876543210" 
                                                    className="bg-indigo-600 text-white p-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all cursor-pointer"
                                                >
                                                    <Phone size={13} fill="white" />
                                                </a>
                                            </div>
                                        </div>

                                        {/* Executive's targets checklist */}
                                        <div className="bg-white rounded-3xl border border-slate-200/40 p-4 shadow-sm space-y-3">
                                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Today's Targets</h3>
                                            
                                            <div className="space-y-3.5 pt-1.5">
                                                <div>
                                                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-405 mb-1.5">
                                                        <span>Outreach Distance</span>
                                                        <span>{(liveDistance).toFixed(1)} / 10.0 KM</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${Math.min((liveDistance / 10.0) * 100, 100)}%` }}></div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-405 mb-1.5">
                                                        <span>Scheduled Visits</span>
                                                        <span>{visits.filter(v => v.checkoutLat != null).length} / 5 completed</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${Math.min((visits.filter(v => v.checkoutLat != null).length / 5) * 100, 100)}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 4: MORE */}
                        {activeTab === "more" && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                
                                {/* Personal Profile Card */}
                                <div className="bg-gradient-to-br from-indigo-500 to-indigo-650 rounded-3xl p-5 shadow-sm text-white relative overflow-hidden flex items-center justify-between">
                                    <div className="absolute top-0 right-0 -mt-3 -mr-3 w-16 h-16 bg-white opacity-10 rounded-full blur-xl"></div>
                                    
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-11 h-11 rounded-2xl bg-white text-indigo-700 font-black flex items-center justify-center text-lg shadow-lg shadow-indigo-700/10">
                                            {userName?.charAt(0) || "U"}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black leading-tight tracking-tight">{userName}</h3>
                                            <p className="text-[10px] font-extrabold text-indigo-150 block mt-1">{localStorage.getItem("email") || user?.email}</p>
                                        </div>
                                    </div>

                                    <div className="bg-white/15 backdrop-blur-sm border border-white/10 p-2.5 rounded-2xl flex flex-col items-center">
                                        <Award size={18} className="text-amber-250 animate-bounce" />
                                        <span className="text-[8px] font-black uppercase tracking-wider text-amber-250 mt-1">Champion</span>
                                    </div>
                                </div>

                                {/* Monthly Summaries */}
                                <div className="bg-white rounded-3xl border border-slate-200/40 p-4 shadow-sm space-y-3">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Monthly claims summary</h3>
                                    
                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <div className="border border-slate-100 rounded-2xl p-3 bg-slate-50/50">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Logged claims</span>
                                            <span className="text-base font-black text-slate-850 block mt-1">₹{expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)}</span>
                                        </div>
                                        <div className="border border-slate-100 rounded-2xl p-3 bg-slate-50/50">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">KM travel logs</span>
                                            <span className="text-base font-black text-slate-850 block mt-1">{(liveDistance).toFixed(1)} KM</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Telemetry Diagnostics Card */}
                                <div className="bg-white rounded-3xl border border-slate-200/40 p-4 shadow-sm space-y-3">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">GPS Telemetry diagnostics</h3>
                                    <div className="border border-slate-100 rounded-2xl p-3 bg-slate-50/50 space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Coordinates</span>
                                        </div>
                                        <p className="text-[11px] font-extrabold text-slate-800 bg-slate-100/50 px-2.5 py-1.5 rounded-lg border border-slate-200/20 font-mono select-all">
                                            {currentLoc || "Awaiting GPS Fix..."}
                                        </p>
                                        <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-700 mt-2">
                                            <span>Speed Telemetry</span>
                                            <span className="text-indigo-650">{(liveSpeed || 0).toFixed(1)} KM/H</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Expense History List */}
                                <div className="bg-white rounded-3xl border border-slate-200/40 p-4 shadow-sm space-y-3.5">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Expenses history</h3>
                                        <span className="bg-slate-50 border border-slate-150 text-slate-500 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide">Claims list</span>
                                    </div>

                                    {expenses.length > 0 ? (
                                        <div className="space-y-2.5 max-h-[160px] overflow-y-auto">
                                            {expenses.map(e => (
                                                <div key={e.id} className="flex justify-between items-center border-b border-slate-50 pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center text-xs font-black">₹</div>
                                                        <div>
                                                            <h4 className="text-[11px] font-extrabold text-slate-800 leading-tight">{e.description}</h4>
                                                            <span className="text-[9px] font-extrabold text-slate-400 uppercase block mt-0.5">{e.expenseType} • {e.date}</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-black text-slate-800">₹{e.amount}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-5 text-slate-400">
                                            <Info size={16} className="mx-auto mb-1 text-slate-300" />
                                            <p className="text-[10px] font-bold text-slate-405">No expenses logged yet.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Secondary Action Settings List */}
                                <div className="bg-white rounded-3xl border border-slate-200/40 p-4 shadow-sm divide-y divide-slate-100">
                                    <button 
                                        onClick={logout}
                                        className="w-full py-3 flex items-center justify-between text-rose-600 font-extrabold text-xs uppercase tracking-wider active:bg-slate-50 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <LogOut size={15} />
                                            <span>Secure Logout</span>
                                        </div>
                                        <ChevronRight size={14} className="text-rose-400" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Bottom Actions Floating Action Button */}
            {isDayStarted && activeTab !== "more" && (
                <div className="fixed bottom-20 right-4 z-50">
                    <button 
                        onClick={() => setFabOpen(prev => !prev)}
                        className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/35 active:scale-90 transition-all cursor-pointer"
                    >
                        {fabOpen ? <X size={20} /> : <Plus size={20} />}
                    </button>
                    
                    {/* Animated FAB Expanded Overlay Backdrop */}
                    {fabOpen && (
                        <>
                            <div onClick={() => setFabOpen(false)} className="fixed inset-0 bg-slate-900/10 backdrop-blur-xs z-40"></div>
                            
                            <div className="absolute bottom-16 right-0 bg-white border border-slate-200/40 p-3 rounded-2xl shadow-xl space-y-2 z-50 w-44 animate-in slide-in-from-bottom-5 duration-200">
                                <button 
                                    onClick={() => { setFabOpen(false); setActiveModal("add_visit"); }}
                                    className="w-full px-3 py-2 text-left hover:bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-2 rounded-xl cursor-pointer"
                                >
                                    <ClipboardList size={13} className="text-indigo-650" /> New Visit checkin
                                </button>
                                <button 
                                    onClick={() => { setFabOpen(false); setActiveModal("add_customer"); }}
                                    className="w-full px-3 py-2 text-left hover:bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-2 rounded-xl cursor-pointer"
                                >
                                    <Users size={13} className="text-indigo-650" /> Add Customer
                                </button>
                                <button 
                                    onClick={() => { setFabOpen(false); setActiveModal("add_expense"); }}
                                    className="w-full px-3 py-2 text-left hover:bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-2 rounded-xl cursor-pointer"
                                >
                                    <Wallet size={13} className="text-indigo-650" /> Record Expense
                                </button>
                                <button 
                                    onClick={() => { setFabOpen(false); setActiveModal("create_followup"); }}
                                    className="w-full px-3 py-2 text-left hover:bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-2 rounded-xl cursor-pointer"
                                >
                                    <PhoneCall size={13} className="text-indigo-650" /> Create Followup
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Bottom Premium Tab Navigation Bar (ONLY 4 ITEMS) */}
            <nav className="fixed bottom-4 left-4 right-4 bg-white/85 backdrop-blur-md border border-slate-200/40 flex justify-around px-2 py-2.5 shadow-[0_12px_32px_rgba(15,23,42,0.12)] rounded-2xl z-40 animate-in slide-in-from-bottom-5 duration-350">
                <button 
                    onClick={() => setActiveTab("dashboard")}
                    className={`flex flex-col items-center w-full transition-all duration-200 cursor-pointer ${activeTab === "dashboard" ? "text-indigo-600" : "text-slate-400"}`}
                >
                    <div className={`p-2 rounded-xl transition-all duration-300 ${activeTab === "dashboard" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-105" : "hover:bg-slate-100 text-slate-400"}`}>
                        <LayoutDashboard size={18} />
                    </div>
                    <span className="text-[8px] mt-1 font-black uppercase tracking-wider">Dashboard</span>
                </button>

                <button 
                    onClick={() => setActiveTab("activity")}
                    className={`flex flex-col items-center w-full transition-all duration-200 cursor-pointer ${activeTab === "activity" ? "text-indigo-600" : "text-slate-400"}`}
                >
                    <div className={`p-2 rounded-xl transition-all duration-300 ${activeTab === "activity" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-105" : "hover:bg-slate-100 text-slate-400"}`}>
                        <ClipboardList size={18} />
                    </div>
                    <span className="text-[8px] mt-1 font-black uppercase tracking-wider">Activity</span>
                </button>

                <button 
                    onClick={() => setActiveTab("team")}
                    className={`flex flex-col items-center w-full transition-all duration-200 cursor-pointer ${activeTab === "team" ? "text-indigo-600" : "text-slate-400"}`}
                >
                    <div className={`p-2 rounded-xl transition-all duration-300 ${activeTab === "team" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-105" : "hover:bg-slate-100 text-slate-400"}`}>
                        <Users size={18} />
                    </div>
                    <span className="text-[8px] mt-1 font-black uppercase tracking-wider">Team</span>
                </button>

                <button 
                    onClick={() => setActiveTab("more")}
                    className={`flex flex-col items-center w-full transition-all duration-200 cursor-pointer ${activeTab === "more" ? "text-indigo-600" : "text-slate-400"}`}
                >
                    <div className={`p-2 rounded-xl transition-all duration-300 ${activeTab === "more" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-105" : "hover:bg-slate-100 text-slate-400"}`}>
                        <MoreHorizontal size={18} />
                    </div>
                    <span className="text-[8px] mt-1 font-black uppercase tracking-wider">More</span>
                </button>
            </nav>

            {/* ==================== OVERLAYS & MODALS BACKDROP ==================== */}
            {activeModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
                    
                    {/* Add Customer Modal */}
                    {activeModal === "add_customer" && (
                        <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-150 p-6 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-bottom-10 max-h-[85vh] overflow-y-auto">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Add New CRM Customer</h3>
                                <button onClick={() => setActiveModal(null)} className="text-slate-400 p-1 bg-slate-50 border border-slate-200/40 rounded-lg"><X size={15} /></button>
                            </div>
                            <form onSubmit={handleAddCustomer} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Customer Name</label>
                                    <input required type="text" placeholder="e.g. Acme Corporation" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500" value={newCustForm.name} onChange={e => setNewCustForm({ ...newCustForm, name: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Contact Person</label>
                                    <input required type="text" placeholder="e.g. John Doe" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500" value={newCustForm.contactPerson} onChange={e => setNewCustForm({ ...newCustForm, contactPerson: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Phone</label>
                                        <input required type="text" placeholder="+91 90000 12345" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500" value={newCustForm.phone} onChange={e => setNewCustForm({ ...newCustForm, phone: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Email</label>
                                        <input required type="email" placeholder="john@acme.com" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500" value={newCustForm.email} onChange={e => setNewCustForm({ ...newCustForm, email: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Full Address</label>
                                    <textarea required placeholder="Client Office Address details" className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 h-16" value={newCustForm.address} onChange={e => setNewCustForm({ ...newCustForm, address: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">City</label>
                                        <input required type="text" placeholder="Hyderabad" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500" value={newCustForm.city} onChange={e => setNewCustForm({ ...newCustForm, city: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">State</label>
                                        <input required type="text" placeholder="Telangana" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500" value={newCustForm.state} onChange={e => setNewCustForm({ ...newCustForm, state: e.target.value })} />
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-650/15 cursor-pointer">Save Customer</button>
                            </form>
                        </div>
                    )}

                    {/* New Visit / Check-in Modal */}
                    {activeModal === "add_visit" && (
                        <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-150 p-6 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-bottom-10 max-h-[80vh] overflow-y-auto">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Check-in at Client Office</h3>
                                <button onClick={() => setActiveModal(null)} className="text-slate-400 p-1 bg-slate-50 border border-slate-200/40 rounded-lg"><X size={15} /></button>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Select Customer</label>
                                    <select 
                                        className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 bg-white"
                                        value={newVisitForm.customerId} 
                                        onChange={e => setNewVisitForm({ ...newVisitForm, customerId: e.target.value })}
                                    >
                                        <option value="">-- Choose CRM Client --</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Check-in Remarks</label>
                                    <textarea placeholder="e.g. Routine follow-up visit" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 h-20" value={newVisitForm.notes} onChange={e => setNewVisitForm({ ...newVisitForm, notes: e.target.value })} />
                                </div>
                                
                                {gpsError && (
                                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-350 p-3 rounded-2xl text-[10px] font-bold flex items-center gap-2">
                                        <AlertCircle size={14} />
                                        <span>{gpsError}</span>
                                    </div>
                                )}

                                <button 
                                    onClick={() => handleCheckIn(newVisitForm.customerId, newVisitForm.notes)}
                                    className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-650/15 cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <Compass size={14} /> Start Geofence Check-in
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Record Expense Modal */}
                    {activeModal === "add_expense" && (
                        <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-150 p-6 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-bottom-10">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Record Travel Claims</h3>
                                <button onClick={() => setActiveModal(null)} className="text-slate-400 p-1 bg-slate-50 border border-slate-200/40 rounded-lg"><X size={15} /></button>
                            </div>
                            <form onSubmit={handleQuickExpenseSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Expense Amount (INR)</label>
                                    <input required type="number" placeholder="₹ Amount" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500" value={newExpenseForm.amount} onChange={e => setNewExpenseForm({ ...newExpenseForm, amount: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Category</label>
                                    <select className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 bg-white" value={newExpenseForm.expenseType} onChange={e => setNewExpenseForm({ ...newExpenseForm, expenseType: e.target.value })}>
                                        <option value="Fuel">Fuel Allowance</option>
                                        <option value="Food">Meals & Food</option>
                                        <option value="Lodging">Hotel / Lodging</option>
                                        <option value="Others">Others</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Expense Memo</label>
                                    <input type="text" placeholder="e.g. Client visit transport fare" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500" value={newExpenseForm.description} onChange={e => setNewExpenseForm({ ...newExpenseForm, description: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Attach Receipt / Image</label>
                                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setNewExpenseForm({ ...newExpenseForm, receiptName: "attached_receipt.jpg" })}>
                                        <Camera size={20} className="text-slate-400 mb-1" />
                                        <span className="text-[9px] font-black text-indigo-605 uppercase tracking-wide">
                                            {newExpenseForm.receiptName || "Capture Receipt"}
                                        </span>
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-650/15 cursor-pointer">Submit Expense claim</button>
                            </form>
                        </div>
                    )}

                    {/* Quick Follow-up Modal */}
                    {activeModal === "create_followup" && (
                        <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-150 p-6 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-bottom-10 max-h-[85vh] overflow-y-auto">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Schedule CRM Followup</h3>
                                <button onClick={() => setActiveModal(null)} className="text-slate-400 p-1 bg-slate-50 border border-slate-200/40 rounded-lg"><X size={15} /></button>
                            </div>
                            <form onSubmit={handleQuickFollowupSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Customer</label>
                                    <select 
                                        className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 bg-white"
                                        value={newFollowupForm.customerId} 
                                        onChange={e => setNewFollowupForm({ ...newFollowupForm, customerId: e.target.value })}
                                    >
                                        <option value="">-- Select Customer --</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Date</label>
                                        <input required type="date" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500" value={newFollowupForm.date} onChange={e => setNewFollowupForm({ ...newFollowupForm, date: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Time</label>
                                        <input type="time" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500" value={newFollowupForm.time} onChange={e => setNewFollowupForm({ ...newFollowupForm, time: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Schedule remarks</label>
                                    <textarea placeholder="e.g. Schedule call to finalize contract details." className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 h-16" value={newFollowupForm.remarks} onChange={e => setNewFollowupForm({ ...newFollowupForm, remarks: e.target.value })} />
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-650/15 cursor-pointer">Schedule Followup</button>
                            </form>
                        </div>
                    )}

                    {/* Visit Details overlay Modal */}
                    {activeModal === "visit_details" && selectedVisit && (
                        <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-150 p-6 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-bottom-10">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Visit Telemetry Details</h3>
                                <button onClick={() => setActiveModal(null)} className="text-slate-400 p-1 bg-slate-50 border border-slate-200/40 rounded-lg"><X size={15} /></button>
                            </div>
                            <div className="space-y-3.5">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Customer</label>
                                    <span className="text-sm font-black text-slate-800">{selectedVisit.customerName}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Checked In</label>
                                        <span className="text-xs font-extrabold text-slate-700">{new Date(selectedVisit.visitTime).toLocaleString()}</span>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Status</label>
                                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${selectedVisit.checkoutLat ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-650"}`}>
                                            {selectedVisit.checkoutLat ? "Checked-out" : "Active Check-in"}
                                        </span>
                                    </div>
                                </div>
                                {selectedVisit.checkoutLat && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Outcome</label>
                                            <span className="text-xs font-extrabold text-slate-750">{selectedVisit.outcome || "Completed"}</span>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Duration</label>
                                            <span className="text-xs font-extrabold text-slate-750">{selectedVisit.visitDuration || 0} mins</span>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Activity Log Notes</label>
                                    <p className="text-xs font-bold text-slate-455 bg-slate-50 border border-slate-100 rounded-2xl p-3 mt-1 leading-relaxed">{selectedVisit.notes || "No notes entered."}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Integrated Checkout Flow Wizard */}
                    {activeModal === "checkout_flow" && activeVisit && (
                        <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-150 p-6 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto pb-8">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Unified Visit Checkout</h3>
                                <button onClick={() => setActiveModal(null)} className="text-slate-400 p-1 bg-slate-50 border border-slate-200/40 rounded-lg"><X size={15} /></button>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-[10px] font-bold text-slate-450 space-y-1">
                                    <p className="text-slate-800 font-extrabold text-xs mb-1">Telemetry summary</p>
                                    <p>Client: <span className="text-slate-750 font-black">{activeVisit.customerName}</span></p>
                                    <p>Checkin duration: <span className="text-slate-750 font-black">{formatDuration(activeVisitDuration)}</span></p>
                                    <p className="text-indigo-600 font-extrabold">Auto Travel calculated: {checkoutKmGenerated} KM</p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Meeting Outcome</label>
                                    <select 
                                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 bg-white"
                                        value={checkoutForm.outcome}
                                        onChange={e => setCheckoutForm({ ...checkoutForm, outcome: e.target.value })}
                                    >
                                        <option value="Completed">Meeting Closed / Successful</option>
                                        <option value="Follow-Up">Follow-Up Required</option>
                                        <option value="Cancelled">No Response / Rescheduled</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Checkout visit notes</label>
                                    <textarea 
                                        required 
                                        placeholder="Enter outcome logs..." 
                                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 h-16"
                                        value={checkoutForm.notes} 
                                        onChange={e => setCheckoutForm({ ...checkoutForm, notes: e.target.value })} 
                                    />
                                </div>

                                {/* Step 2a: Link Expense Claim (Optional) */}
                                <div className="border border-slate-100 p-3.5 rounded-2xl bg-slate-50/50 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-[10px] font-black uppercase text-slate-600">Link Claim / Expense (Optional)</h4>
                                        <span className="text-[8px] bg-slate-150 text-slate-500 px-1.5 py-0.5 rounded uppercase font-black">linked claim</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black uppercase text-slate-400">Amount (₹)</label>
                                            <input type="number" placeholder="₹ Amount" className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold bg-white" value={newExpenseForm.amount} onChange={e => setNewExpenseForm({ ...newExpenseForm, amount: e.target.value })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black uppercase text-slate-400">Claim Category</label>
                                            <select className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold bg-white" value={newExpenseForm.expenseType} onChange={e => setNewExpenseForm({ ...newExpenseForm, expenseType: e.target.value })}>
                                                <option value="Fuel">Fuel</option>
                                                <option value="Food">Meals</option>
                                                <option value="Others">Others</option>
                                            </select>
                                        </div>
                                    </div>
                                    <input type="text" placeholder="Expense description..." className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold bg-white" value={newExpenseForm.description} onChange={e => setNewExpenseForm({ ...newExpenseForm, description: e.target.value })} />
                                </div>

                                {/* Step 2b: Schedule Next Follow-up (Optional) */}
                                {checkoutForm.outcome === "Follow-Up" && (
                                    <div className="border border-indigo-100 p-3.5 rounded-2xl bg-indigo-50/20 space-y-3">
                                        <h4 className="text-[10px] font-black uppercase text-indigo-700">Schedule Followup Date</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black uppercase text-slate-400">Followup Date</label>
                                                <input type="date" className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold bg-white" value={newFollowupForm.date} onChange={e => setNewFollowupForm({ ...newFollowupForm, date: e.target.value })} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black uppercase text-slate-400">Time</label>
                                                <input type="time" className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold bg-white" value={newFollowupForm.time} onChange={e => setNewFollowupForm({ ...newFollowupForm, time: e.target.value })} />
                                            </div>
                                        </div>
                                        <input type="text" placeholder="Followup remarks..." className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold bg-white" value={newFollowupForm.remarks} onChange={e => setNewFollowupForm({ ...newFollowupForm, remarks: e.target.value })} />
                                    </div>
                                )}

                                <button 
                                    onClick={completeCheckout}
                                    className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-500/15 cursor-pointer mt-2"
                                >
                                    Submit Checkout & Telemetry
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
