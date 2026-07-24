import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileBottomNav from "./MobileBottomNav.jsx";

export default function MainLayout() {
    return (
        <div className="flex h-screen w-full bg-gradient-to-tr from-slate-100 via-slate-50 to-indigo-50/30 overflow-hidden font-sans antialiased text-slate-800">

            {/* LEFT SIDEBAR (Desktop only) */}
            <div className="hidden md:block w-[280px] h-full flex-shrink-0">
                <Sidebar />
            </div>

            {/* RIGHT SIDE: Topbar + Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">

                {/* Topbar */}
                <Topbar />

                {/* Main Content Render Box */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28 md:pb-6 bg-transparent scroll-smooth">
                    <div className="w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Outlet />
                    </div>
                </main>

                {/* MOBILE BOTTOM NAV */}
                <div className="md:hidden">
                    <MobileBottomNav />
                </div>

            </div>
        </div>
    );
}