import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Zap, X, Check, Eye, Shield, Clock, AlertTriangle, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { formatRelativeTime } from "../../utils/time";
import api from "../../api/axios";

export default function Topbar() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const dropdownRef = useRef(null);

    const userName = user?.name || "User";
    const userRole = user?.role || "Executive";

    // Dropdown and Notification States
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isTrackingActive, setIsTrackingActive] = useState(false);

    const loadNotifications = useCallback(async () => {
        try {
            const res = await api.get("/notifications");
            const list = res.data?.data || res.data || [];
            const normalized = list.map(item => ({
                ...item,
                read: item.isRead || item.read || false,
                isRead: item.isRead || item.read || false
            }));
            normalized.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setNotifications(normalized);
        } catch (error) {
            console.error("Failed to load notifications from backend:", error);
        }
    }, []);

    const checkTrackingStatus = useCallback(async () => {
        const userId = localStorage.getItem("userId");
        if (!userId) return;
        try {
            const res = await api.get(`/attendance/status/${userId}`);
            if (res.data?.success && res.data.data?.status === "PUNCHED_IN") {
                setIsTrackingActive(true);
                localStorage.setItem("isTracking", "true");
            } else {
                setIsTrackingActive(false);
                localStorage.setItem("isTracking", "false");
            }
        } catch (err) {
            console.error("Failed to fetch tracking status in Topbar:", err);
        }
    }, []);

    useEffect(() => {
        Promise.resolve().then(() => {
            loadNotifications();
            checkTrackingStatus();
        });

        const handleSync = () => loadNotifications();
        const handleAttendance = () => checkTrackingStatus();

        window.addEventListener("notificationsUpdated", handleSync);
        window.addEventListener("attendanceChanged", handleAttendance);

        const interval = setInterval(checkTrackingStatus, 15000);

        return () => {
            window.removeEventListener("notificationsUpdated", handleSync);
            window.removeEventListener("attendanceChanged", handleAttendance);
            clearInterval(interval);
        };
    }, [loadNotifications, checkTrackingStatus]);

    // Close on outside click
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const unreadCount = notifications.filter((n) => !n.isRead && !n.read).length;
    const latestNotifications = notifications.slice(0, 5);

    const handleMarkAllRead = async () => {
        try {
            for (const n of notifications) {
                if (!n.isRead && !n.read) {
                    await api.put(`/notifications/${n.id}/read`);
                }
            }
            loadNotifications();
            window.dispatchEvent(new Event("notificationsUpdated"));
        } catch (error) {
            console.error("Failed to mark all read:", error);
        }
    };

    const handleToggleRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            loadNotifications();
            window.dispatchEvent(new Event("notificationsUpdated"));
        } catch (error) {
            console.error("Failed to mark read:", error);
        }
    };

    const handleDelete = (id) => {
        const updated = notifications.filter((n) => n.id !== id);
        setNotifications(updated);
    };

    const getInitials = (name) => {
        if (!name) return "U";
        const names = name.trim().split(" ");
        return names.length >= 2
            ? (names[0][0] + names[1][0]).toUpperCase()
            : name[0].toUpperCase();
    };

    const getIcon = (type) => {
        switch (type) {
            case "security":
                return <Shield className="w-4 h-4 text-rose-600" />;
            case "warning":
                return <AlertTriangle className="w-4 h-4 text-amber-600" />;
            case "task":
                return <Clock className="w-4 h-4 text-purple-600" />;
            default:
                return <Info className="w-4 h-4 text-blue-600" />;
        }
    };

    const getIconBg = (type) => {
        switch (type) {
            case "security":
                return "bg-rose-50 border-rose-100";
            case "warning":
                return "bg-amber-50 border-amber-100";
            case "task":
                return "bg-purple-50 border-purple-100";
            default:
                return "bg-blue-50 border-blue-100";
        }
    };

    return (
        <header className="h-[72px] w-full bg-white/70 backdrop-blur-md border-b border-slate-200/60 px-6 flex items-center justify-between sticky top-0 z-30 transition-all duration-200">

            {/* LEFT SIDE: Mobile branding */}
            <div className="flex items-center">
                <div
                    onClick={() => navigate("/dashboard")}
                    className="flex md:hidden items-center gap-2 cursor-pointer group"
                >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
                        <Zap size={16} className="text-white animate-pulse" />
                    </div>
                    <span className="text-lg font-black text-slate-900 tracking-tight">
                        TruForce
                    </span>
                </div>
            </div>

            {/* RIGHT SIDE: Profile & Popover Notification */}
            <div className="flex items-center gap-4">



                {/* Dropdown Notification Area */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="relative flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 hover:text-slate-850 hover:bg-slate-100/80 border border-slate-150 transition-all duration-200 cursor-pointer"
                        aria-label="Notification bell"
                    >
                        <Bell size={19} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white shadow-sm shadow-red-500/20">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Popover Dropdown Panel */}
                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden z-40 animate-in slide-in-from-top-2 fade-in duration-200">
                            {/* Dropdown Header */}
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white/80">
                                <h3 className="text-xs font-black text-slate-850 flex items-center gap-2 uppercase tracking-wider">
                                    <Bell className="w-4 h-4 text-indigo-650" /> Alerts Feed
                                </h3>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="text-[10px] font-bold text-indigo-655 hover:text-indigo-755 hover:underline cursor-pointer"
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>

                            {/* Dropdown List */}
                            <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
                                {latestNotifications.length === 0 ? (
                                    <div className="px-5 py-12 text-center">
                                        <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Bell className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <p className="text-slate-800 font-bold text-xs">You're all caught up!</p>
                                        <p className="text-[10px] text-slate-400 font-semibold mt-1">No alerts at the moment.</p>
                                    </div>
                                ) : (
                                    latestNotifications.map((item) => (
                                        <div
                                            key={item.id}
                                            className={`group relative flex gap-3.5 p-4.5 transition-colors ${
                                                !item.read ? "bg-indigo-50/20" : "bg-white hover:bg-slate-50/40"
                                            }`}
                                        >
                                            {/* Left Icon */}
                                            <div className={`w-8.5 h-8.5 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${getIconBg(item.type)}`}>
                                                {getIcon(item.type)}
                                            </div>

                                            {/* Middle content */}
                                            <div className="flex-1 min-w-0 pr-6">
                                                <h4 className={`text-xs font-bold leading-snug truncate ${!item.read ? "text-slate-900 font-black" : "text-slate-700"}`}>
                                                    {item.title}
                                                </h4>
                                                <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed break-words">
                                                    {item.message}
                                                </p>
                                                <span className="text-[9px] font-extrabold text-slate-400 mt-2 block">
                                                    {formatRelativeTime(item.createdAt)}
                                                </span>
                                            </div>

                                            {/* Right indicators & quick actions */}
                                            <div className="absolute right-4.5 top-4.5 flex flex-col items-end gap-1.5">
                                                {/* Unread blue dot */}
                                                {!item.read && (
                                                    <div className="w-2 h-2 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.7)]" />
                                                )}

                                                {/* Hover actions */}
                                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                                    <button
                                                        onClick={() => handleToggleRead(item.id)}
                                                        className="p-1 text-slate-400 hover:text-indigo-650 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer border border-slate-100"
                                                        title={item.read ? "Mark unread" : "Mark read"}
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-slate-100"
                                                        title="Delete alert"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Dropdown Footer */}
                            <div
                                onClick={() => {
                                    setIsDropdownOpen(false);
                                    navigate("/notifications");
                                }}
                                className="px-5 py-3.5 border-t border-slate-100 text-center bg-slate-50/50 hover:bg-slate-50 text-[10px] font-black text-indigo-650 hover:text-indigo-755 tracking-wider uppercase cursor-pointer flex items-center justify-center gap-1.5 transition-colors duration-150"
                            >
                                <Eye className="w-3.5 h-3.5" /> View all notifications
                            </div>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="hidden sm:block h-6 w-px bg-slate-200"></div>

                {/* Profile Section */}
                <div
                    onClick={() => navigate("/profile")}
                    className="flex items-center gap-3 cursor-pointer group"
                >
                    <div className="hidden sm:block text-right">
                        <p className="text-xs font-extrabold text-slate-800 group-hover:text-indigo-600 transition-colors leading-none">
                            {userName}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {userRole}
                        </p>
                    </div>
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-xs font-black shadow-md shadow-indigo-500/10 group-hover:scale-105 transition-transform duration-200 border border-white/20">
                            {getInitials(userName)}
                        </div>
                        <div className="absolute bottom-[-1px] right-[-1px] w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"></div>
                    </div>
                </div>

            </div>

        </header>
    );
}