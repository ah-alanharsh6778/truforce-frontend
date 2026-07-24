import {
    LayoutDashboard,
    Users,
    MapPinned,
    ClipboardList,
    LogOut,
    PhoneCall,
    PieChart,
    Zap,
    Bell,
    History,
    User,
    Wallet // 1. Wallet icon imported
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar() {
    const location = useLocation();
    const { user, logout } = useAuth();
    const role = user?.role || "USER";

    const handleLogout = () => {
        logout();
        window.location.href = "/";
    };

    const allMenus = [
        {
            title: "Dashboard",
            icon: <LayoutDashboard size={20} />,
            path: "/dashboard",
            roles: ["Admin", "Manager", "User"]
        },
        {
            title: "Customers",
            icon: <Users size={20} />,
            path: "/customers",
            roles: ["Admin", "Manager"]
        },
        {
            title: "Visits",
            icon: <ClipboardList size={20} />,
            path: "/visits",
            roles: ["Admin", "Manager", "User"]
        },
        {
            title: "Tracking",
            icon: <MapPinned size={20} />,
            path: "/tracking",
            roles: ["Admin", "Manager", "User"]
        },
        {
            title: "Follow Ups",
            icon: <PhoneCall size={20} />,
            path: "/followups",
            roles: ["Admin", "Manager", "User"]
        },
        {
            title: "Reports",
            icon: <PieChart size={20} />,
            path: "/reports",
            roles: ["Admin", "Manager"]
        },
        {
            title: "Notifications",
            icon: <Bell size={20} />,
            path: "/notifications",
            roles: ["Admin", "Manager", "User"]
        },
        {
            title: "Activity Logs",
            icon: <History size={20} />,
            path: "/activity-logs",
            roles: ["Admin"]
        },
        {
            title: "Summary",
            icon: <History size={20} />,
            path: "/summary",
            roles: ["Admin", "Manager", "User"]
        },
        // 2. Added Expenses to the menu
        {
            title: "Expenses",
            icon: <Wallet size={20} />,
            path: "/expenses",
            roles: ["Admin", "Manager", "User"]
        },
        {
            title: "My Profile",
            icon: <User size={20} />,
            path: "/profile",
            roles: ["Admin", "Manager", "User"]
        }
    ];

    const menuItems = allMenus.filter(item =>
        item.roles.some(r => r.toUpperCase() === role.toUpperCase())
    );
    return (
        <aside className="w-[280px] min-w-[280px] max-w-[280px] h-screen flex flex-col bg-[#090d16] text-slate-350 border-r border-slate-800/50 relative overflow-hidden">
            {/* Background Decorative Blur Accent */}
            <div className="absolute top-[-100px] left-[-50px] w-[250px] h-[250px] rounded-full bg-blue-500/5 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-[-100px] right-[-50px] w-[250px] h-[250px] rounded-full bg-indigo-500/5 blur-[80px] pointer-events-none" />

            {/* LOGO */}
            <div className="h-[80px] px-6 border-b border-slate-800/50 flex items-center relative z-10 bg-slate-950/20">
                <div className="flex items-center gap-3 w-full">
                    <div className="relative group">
                        <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 opacity-60 blur-sm group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative w-11 h-11 rounded-xl bg-slate-900 border border-slate-700/40 flex items-center justify-center">
                            <Zap size={20} className="text-blue-400 animate-pulse" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-md font-extrabold text-white tracking-wide font-display leading-tight">
                            TruForce
                        </h1>
                        <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">
                            Field Operations
                        </p>
                    </div>
                </div>
            </div>

            {/* NAVIGATION */}
            <div className="flex-1 overflow-y-auto px-4 py-6 relative z-10 custom-scrollbar">
                <p className="px-3 mb-4 text-[10px] uppercase tracking-[0.2em] font-extrabold text-slate-600">
                    Navigation
                </p>

                <div className="space-y-1">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.title}
                                to={item.path}
                                className={`group flex items-center gap-3.5 h-11 px-4 rounded-xl border transition-all duration-200 relative
                                ${
                                    isActive
                                        ? "bg-gradient-to-r from-blue-600/12 to-indigo-600/4 border-blue-500/20 text-white font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                                        : "border-transparent text-slate-400 hover:text-white hover:bg-white/[0.03]"
                                }`}
                            >
                                {/* Left active border indicator */}
                                {isActive && (
                                    <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.9)]"></div>
                                )}

                                <div
                                    className={`transition-colors duration-200 ${
                                        isActive
                                            ? "text-blue-400 scale-105"
                                            : "text-slate-500 group-hover:text-slate-350"
                                    }`}
                                >
                                    {item.icon}
                                </div>

                                <span className="text-xs font-medium tracking-wide">
                                    {item.title}
                                </span>

                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* FOOTER */}
            <div className="mt-auto p-4 border-t border-slate-800/50 relative z-10 bg-slate-950/20">
                <button
                    onClick={handleLogout}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-xl text-slate-450 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 transition-all duration-200 text-xs font-bold cursor-pointer"
                >
                    <LogOut size={16} />
                    Logout
                </button>
            </div>

        </aside>
    );
}