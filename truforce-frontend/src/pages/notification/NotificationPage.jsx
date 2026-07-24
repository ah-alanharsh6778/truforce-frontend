import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Plus, Trash2, X, Bell, Shield, Clock, AlertTriangle, Info,
    Check, CheckSquare, Loader2, AlertCircle, ChevronLeft
} from "lucide-react";
import { formatRelativeTime } from "../../utils/time";
import api from "../../api/axios";

export default function NotificationPage() {
    const navigate = useNavigate();
    const [isLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error] = useState(null);

    const [notifications, setNotifications] = useState([]);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [form, setForm] = useState({
        title: "",
        message: "",
        type: "info"
    });

    const userRole = localStorage.getItem("role")?.toUpperCase() || "";
    const isAdmin = userRole.includes("ADMIN") || userRole.includes("MANAGER");

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
            console.error("Failed to load notifications:", error);
        }
    }, []);

    useEffect(() => {
        Promise.resolve().then(() => {
            loadNotifications();
        });
        window.addEventListener("notificationsUpdated", loadNotifications);
        return () => window.removeEventListener("notificationsUpdated", loadNotifications);
    }, [loadNotifications]);

    const handleFormChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmitNotification = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.message.trim()) {
            alert("Please fill out all fields!");
            return;
        }

        setIsSubmitting(true);
        try {
            const newAlert = {
                title: form.title.trim(),
                message: form.message.trim(),
                isRead: false,
                createdAt: new Date().toISOString()
            };
            await api.post("/notifications", newAlert);
            loadNotifications();
            window.dispatchEvent(new Event("notificationsUpdated"));
            setForm({ title: "", message: "", type: "info" });
            setIsModalOpen(false);
        } catch (error) {
            console.error("Failed to post notification:", error);
            alert("Failed to submit notification.");
        } finally {
            setIsSubmitting(false);
        }
    };

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

    const handleClearAll = () => {
        if (!window.confirm("Are you sure you want to clear notifications?")) return;
        setNotifications([]);
    };

    const handleToggleRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            loadNotifications();
            window.dispatchEvent(new Event("notificationsUpdated"));
        } catch (error) {
            console.error("Failed to toggle read status:", error);
        }
    };

    const handleDelete = (id) => {
        const updated = notifications.filter((n) => n.id !== id);
        setNotifications(updated);
    };

    const getIcon = (type) => {
        switch (type) {
            case "security":
                return <Shield className="w-5 h-5 text-rose-600" />;
            case "warning":
                return <AlertTriangle className="w-5 h-5 text-amber-600" />;
            case "task":
                return <Clock className="w-5 h-5 text-purple-600" />;
            default:
                return <Info className="w-5 h-5 text-blue-600" />;
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

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20 px-2 sm:px-4 md:px-0 animate-in fade-in duration-300">

            {/* 1. TOP HEADER SECTION */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">Notification Center</h1>
                        <p className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5">Audit system alerts, workflow assignments, and status updates.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {notifications.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
                        >
                            <Trash2 size={14} />
                            Clear All
                        </button>
                    )}

                    {isAdmin && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4.5 py-2 rounded-xl font-bold text-xs transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
                        >
                            <Plus size={14} strokeWidth={2.5} />
                            New Alert
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-100 font-bold text-xs shadow-sm">
                    <AlertCircle size={18} className="text-rose-500" />
                    <span>{error}</span>
                </div>
            )}

            {/* 2. ACTIONS SUB-BAR */}
            {notifications.length > 0 && (
                <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        {unreadCount} Unread alerts
                    </span>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="inline-flex items-center gap-1.5 text-[10px] font-black text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                        >
                            <CheckSquare className="w-3.5 h-3.5" />
                            Mark all as read
                        </button>
                    )}
                </div>
            )}

            {/* 3. MAIN NOTIFICATION LIST LOG */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col min-h-[380px]">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center py-20 text-blue-600">
                        <Loader2 className="animate-spin w-8 h-8" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 py-20">
                        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-4 border border-blue-100/50">
                            <Bell className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-black text-slate-800">You're all caught up!</h3>
                        <p className="text-xs text-slate-400 font-medium max-w-xs mt-1 leading-relaxed">No notification alerts or messages logged. Create a new simulated alert above to test.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-150/70">
                        {notifications.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => setSelectedNotification(item)}
                                className={`group relative flex gap-4 p-4 sm:p-5 cursor-pointer transition-colors duration-150 ${
                                    !item.read ? "bg-blue-50/15" : "bg-white hover:bg-slate-50/30"
                                }`}
                            >
                                {/* Left icon */}
                                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${getIconBg(item.type)}`}>
                                    {getIcon(item.type)}
                                </div>

                                {/* Middle content block */}
                                <div className="flex-1 min-w-0 pr-8">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2.5">
                                        <h4 className={`text-sm font-black tracking-tight ${!item.read ? "text-slate-900" : "text-slate-600"}`}>
                                            {item.title}
                                        </h4>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-500 mt-1 leading-relaxed max-w-2xl break-words">
                                        {item.message}
                                    </p>
                                    <span className="text-[10px] font-bold text-slate-400 mt-2 block">
                                        {formatRelativeTime(item.createdAt)}
                                    </span>
                                </div>

                                {/* Right indicators and hover trigger items */}
                                <div className="absolute right-5 top-5 flex flex-col items-end gap-2.5">
                                    {!item.read && (
                                        <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.8)]" />
                                    )}

                                    {/* Action Hover states */}
                                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity duration-200">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleRead(item.id);
                                            }}
                                            className="p-1.5 text-slate-450 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-lg transition-colors cursor-pointer bg-white/90"
                                            title={item.read ? "Mark as unread" : "Mark as read"}
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(item.id);
                                            }}
                                            className="p-1.5 text-slate-450 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-colors cursor-pointer bg-white/90"
                                            title="Delete notification"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 4. MODAL ALERTS CREATOR (SIMULATOR FOR ADMINS) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
                            <div className="flex items-center gap-2 text-blue-600">
                                <Plus size={20} />
                                <h2 className="text-lg font-black text-slate-800">Dispatch Notification</h2>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleSubmitNotification} className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Notification Type</label>
                                    <select
                                        name="type"
                                        value={form.type}
                                        onChange={handleFormChange}
                                        className="w-full appearance-none px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="info">Info Update ℹ️</option>
                                        <option value="security">Security Alert 🛡️</option>
                                        <option value="warning">System Warning ⚠️</option>
                                        <option value="task">Workflow Task 📅</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Title <span className="text-rose-500">*</span></label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={form.title}
                                        onChange={handleFormChange}
                                        placeholder="e.g. Schedule Update"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Message <span className="text-rose-500">*</span></label>
                                    <textarea
                                        name="message"
                                        value={form.message}
                                        onChange={handleFormChange}
                                        placeholder="Type alert body message..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 h-24 resize-none"
                                        required
                                    />
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer text-center"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer text-center"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : "Send Notification"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. MANAGE NOTIFICATION POPUP MODAL */}
            {selectedNotification && (
                <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden border border-slate-200/80 animate-in zoom-in-95 p-6 space-y-4">
                        <div className="text-center space-y-1">
                            <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-2">
                                <Bell size={20} />
                            </div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Manage Notification</h3>
                            <p className="text-xs font-bold text-slate-450">{selectedNotification.title}</p>
                        </div>
                        
                        <div className="flex flex-col gap-2.5 pt-2">
                            <button
                                onClick={() => {
                                    handleToggleRead(selectedNotification.id);
                                    setSelectedNotification(null);
                                }}
                                className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200 rounded-xl text-xs font-black text-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                                <Check size={14} className="text-indigo-600" />
                                {selectedNotification.read ? "Mark as Unread" : "Mark as Read"}
                            </button>
                            
                            <button
                                onClick={() => {
                                    handleDelete(selectedNotification.id);
                                    setSelectedNotification(null);
                                }}
                                className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 active:scale-95 border border-rose-200 rounded-xl text-xs font-black text-rose-600 transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                                <Trash2 size={14} />
                                Delete Notification
                            </button>
                            
                            <button
                                onClick={() => setSelectedNotification(null)}
                                className="w-full py-3.5 bg-white hover:bg-slate-50 active:scale-95 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}