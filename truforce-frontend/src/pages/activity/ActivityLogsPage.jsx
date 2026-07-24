import { useEffect, useState, useMemo } from "react";
import {
    Search,
    Filter,
    AlertCircle,
    Activity,
    Clock,
    User,
    ChevronLeft,
    ChevronRight,
    Loader2
} from "lucide-react"; // Premium icons import
import { getAllActivityLogs } from "../../features/activity/activityService";

export default function ActivityLogsPage() {
    // Data & Filter States
    const [logs, setLogs] = useState([]);
    const [search, setSearch] = useState("");
    const [moduleFilter, setModuleFilter] = useState("");

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Status States
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch initial data
    async function loadLogs() {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getAllActivityLogs();
            setLogs(data || []);
        } catch (err) {
            console.error("Error fetching logs:", err);
            setError("Failed to load activity logs. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        const t = setTimeout(loadLogs, 0); // defer to avoid sync setState in effect
        return () => clearTimeout(t);
    }, []);

    // Reset to page 1 whenever filters change
    useEffect(() => {
        const t = setTimeout(() => setCurrentPage(1), 0);
        return () => clearTimeout(t);
    }, [search, moduleFilter]);

    // Filter logs based on search and module dropdown
    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            const searchTerm = search.toLowerCase();
            const searchMatch =
                log.action?.toLowerCase().includes(searchTerm) ||
                log.performedBy?.toLowerCase().includes(searchTerm);
            const moduleMatch = moduleFilter === "" || log.moduleName === moduleFilter;
            return searchMatch && moduleMatch;
        });
    }, [logs, search, moduleFilter]);

    // Calculate pagination slice
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Helper function for dynamic badge colors
    const getModuleStyle = (moduleName) => {
        switch (moduleName?.toUpperCase()) {
            case "CUSTOMER":
                return "bg-emerald-50 text-emerald-700 border-emerald-200";
            case "VISIT":
                return "bg-purple-50 text-purple-700 border-purple-200";
            case "FOLLOWUP":
                return "bg-amber-50 text-amber-700 border-amber-200";
            case "TRACKING":
                return "bg-blue-50 text-blue-700 border-blue-200";
            default:
                return "bg-slate-100 text-slate-700 border-slate-200";
        }
    };

    // ✅ FIXED: MainLayout ko hatakar standalone responsive fluid container lagaya
    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">

            {/* HEADER & FILTERS */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Activity Logs
                    </h1>
                    <p className="text-slate-500 mt-1 text-xs sm:text-sm font-semibold">
                        Monitor system audits, team actions, and field interactions.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-64 group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                            <Search size={16} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search actions or users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                        />
                    </div>

                    {/* Module Filter */}
                    <div className="relative w-full sm:w-48 group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                            <Filter size={16} />
                        </div>
                        <select
                            value={moduleFilter}
                            onChange={(e) => setModuleFilter(e.target.value)}
                            className="w-full appearance-none pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                        >
                            <option value="">All Modules</option>
                            <option value="CUSTOMER">Customer</option>
                            <option value="VISIT">Visit</option>
                            <option value="FOLLOWUP">Follow-up</option>
                            <option value="TRACKING">Tracking</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* ERROR STATE */}
            {error && (
                <div className="bg-rose-50 text-rose-600 p-4 rounded-xl border border-rose-200 flex items-center gap-3 shadow-sm animate-shake">
                    <AlertCircle size={18} className="text-rose-500" />
                    <span className="text-sm font-bold">{error}</span>
                </div>
            )}

            {/* TABLE CARD */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full whitespace-nowrap text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Action Description</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Module</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Performed By</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Date & Time</th>
                        </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-50">
                        {isLoading ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-3">
                                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                        <span className="text-slate-500 font-bold text-sm">Loading activity logs...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedLogs.length > 0 ? (
                            paginatedLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-blue-50/20 transition-colors group">
                                    <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                                                {log.action}
                                            </span>
                                    </td>
                                    <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm ${getModuleStyle(log.moduleName)}`}>
                                                {log.moduleName || "SYSTEM"}
                                            </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-black shadow-sm">
                                                {log.performedBy ? log.performedBy.charAt(0).toUpperCase() : <User size={14} />}
                                            </div>
                                            <span className="text-slate-700 font-semibold text-sm">
                                                    {log.performedBy || "System User"}
                                                </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                            <span className="text-slate-500 text-sm font-medium flex items-center gap-1.5">
                                                <Clock size={14} className="text-slate-400" />
                                                {log.createdAt ? new Date(log.createdAt).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }) : "-"}
                                            </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-3 shadow-sm">
                                            <Activity className="w-6 h-6 text-slate-300" />
                                        </div>
                                        <span className="text-slate-800 font-bold text-lg">No activities found</span>
                                        <span className="text-slate-400 text-sm mt-1 font-semibold">Try adjusting your search or module filters.</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION CONTROLS */}
                {!isLoading && filteredLogs.length > 0 && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Showing <span className="text-blue-600">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="text-blue-600">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> of <span className="text-blue-600">{filteredLogs.length}</span> entries
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <ChevronLeft size={16} strokeWidth={3} />
                            </button>

                            <div className="text-xs font-black text-slate-600 px-3 bg-white border border-slate-200 rounded-lg py-1.5 shadow-sm">
                                {currentPage} / {totalPages || 1}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <ChevronRight size={16} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}