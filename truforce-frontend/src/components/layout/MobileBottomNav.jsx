import { Link, useLocation } from "react-router-dom";
import { Home, MapPinned, ClipboardList, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function MobileBottomNav({ role }) {
    const location = useLocation();
    const { user } = useAuth();

    // Use passed role prop, fallback to auth context, fallback to localStorage, default to 'USER'
    const activeRole = role || user?.role || localStorage.getItem("role") || "USER";
    const uppercaseRole = activeRole.toUpperCase();
    const isAdminOrManager = uppercaseRole.includes("ADMIN") || uppercaseRole.includes("MANAGER");

    // Dynamic menu items: strictly show Home, Visits, Tracking, Profile for all users on mobile
    const navItems = [
        { title: "Home", icon: <Home size={20} />, path: "/dashboard" },
        { title: "Visits", icon: <ClipboardList size={20} />, path: "/visits" },
        { title: "Tracking", icon: <MapPinned size={20} />, path: "/tracking" },
        { title: "Profile", icon: <User size={20} />, path: "/profile" }
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 w-full h-16 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 flex justify-around items-center px-4 shadow-[0_-8px_32px_rgba(0,0,0,0.3)] z-50">
            {navItems.map((item) => {
                const isActive = item.path === "/dashboard" 
                    ? location.pathname === "/dashboard"
                    : location.pathname.startsWith(item.path);

                return (
                    <Link
                        key={item.title}
                        to={item.path}
                        className="flex flex-col items-center justify-center w-full h-full transition-all duration-200 active:scale-95"
                    >
                        <div className={`p-1 rounded-xl transition-all duration-200 relative flex flex-col items-center justify-center ${
                            isActive 
                                ? "text-indigo-400 scale-105" 
                                : "text-slate-500 hover:text-slate-400"
                        }`}>
                            {item.icon}
                        </div>
                        <span className={`text-[9px] mt-0.5 tracking-wider font-extrabold uppercase transition-colors duration-200 ${
                            isActive ? 'text-indigo-400 font-black' : 'text-slate-500'
                        }`}>
                            {item.title}
                        </span>
                        
                        {/* Glowing active indicator dot */}
                        {isActive && (
                            <span className="w-1 h-1 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.8)] mt-0.5 animate-in zoom-in duration-200" />
                        )}
                    </Link>
                );
            })}
        </div>
    );
}