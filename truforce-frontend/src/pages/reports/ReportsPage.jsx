import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Search, Loader2, AlertCircle, FileSpreadsheet, ChevronLeft, ChevronDown, Sparkles } from "lucide-react";
import {
    getCustomerReport,
    getVisitReport,
    getFollowUpReport,
} from "../../features/report/reportService";
import PaginationControls from "../../components/common/PaginationControls";
import { usePagination } from "../../hooks/usePagination";

export default function ReportsPage() {
    const navigate = useNavigate();
    // UI States
    const [activeTab, setActiveTab] = useState("customers");
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const itemsPerPage = 10;

    // Data States
    const [customers, setCustomers] = useState([]);
    const [visits, setVisits] = useState([]);
    const [followUps, setFollowUps] = useState([]);

    async function loadReports() {
        try {
            setIsLoading(true);
            setError(null);

            const [customerRes, visitRes, followUpRes] = await Promise.all([
                getCustomerReport(),
                getVisitReport(),
                getFollowUpReport()
            ]);

            setCustomers(customerRes || []);
            setVisits(visitRes || []);
            setFollowUps(followUpRes || []);
        } catch (error) {
            console.error("Error fetching reports:", error);
            setError("Failed to load reports. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        const t = setTimeout(loadReports, 0);
        return () => clearTimeout(t);
    }, []);

    // Memoized filters
    const filteredCustomers = useMemo(() =>
            customers.filter((c) => c.customerName?.toLowerCase().includes(search.toLowerCase())),
        [customers, search]);

    const filteredVisits = useMemo(() =>
            visits.filter((v) => v.customerName?.toLowerCase().includes(search.toLowerCase())),
        [visits, search]);

    const filteredFollowUps = useMemo(() =>
            followUps.filter((f) => f.customerName?.toLowerCase().includes(search.toLowerCase())),
        [followUps, search]);

    // Pagination for each tab
    const customersPage = usePagination(filteredCustomers, itemsPerPage, { search });
    const visitsPage = usePagination(filteredVisits, itemsPerPage, { search });
    const followUpsPage = usePagination(filteredFollowUps, itemsPerPage, { search });

    // Export Handlers
    const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8082";

    const downloadCustomerExcel = () => window.open(`${API_BASE_URL}/api/reports/customers/excel`, "_blank");
    const downloadVisitExcel = () => window.open(`${API_BASE_URL}/api/reports/visits/excel`, "_blank");
    const downloadFollowUpExcel = () => window.open(`${API_BASE_URL}/api/reports/followups/excel`, "_blank");
    const downloadPdf = () => window.open(`${API_BASE_URL}/api/reports/customers/pdf`, "_blank");

    // ✅ FIXED: Return block se <MainLayout> hataya, direct clean container banaya
    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            {/* PAGE HEADER & ACTIONS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-4 md:px-0 mx-4 md:mx-0 gap-4">
                <div className="flex items-center gap-1">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-tight">
                        Reports Console
                    </h1>
                </div>

                <div className="w-full md:w-auto">
                    {/* Desktop horizontal buttons list */}
                    <div className="hidden md:flex flex-wrap items-center gap-2">
                        <button
                            onClick={downloadCustomerExcel}
                            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-all shadow-sm cursor-pointer"
                            title="Download Customers Excel List"
                        >
                            <FileSpreadsheet size={13} />
                            Customers (XLSX)
                        </button>
                        <button
                            onClick={downloadVisitExcel}
                            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-all shadow-sm cursor-pointer"
                            title="Download Visits Excel List"
                        >
                            <FileSpreadsheet size={13} />
                            Visits (XLSX)
                        </button>
                        <button
                            onClick={downloadFollowUpExcel}
                            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-all shadow-sm cursor-pointer"
                            title="Download Follow-Ups Excel List"
                        >
                            <FileSpreadsheet size={13} />
                            Follow-Ups (XLSX)
                        </button>
                        <button
                            onClick={downloadPdf}
                            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-all shadow-sm cursor-pointer"
                            title="Download Customers PDF"
                        >
                            <FileText size={13} />
                            Customers (PDF)
                        </button>
                    </div>

                    {/* Mobile/Tablet 2-column grid of buttons */}
                    <div className="md:hidden w-full grid grid-cols-2 gap-2.5">
                        <button
                            onClick={downloadCustomerExcel}
                            className="inline-flex items-center justify-center gap-2 px-3 py-3 text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200/50 rounded-xl hover:bg-indigo-100 transition-all shadow-sm cursor-pointer"
                        >
                            <FileSpreadsheet size={13} className="shrink-0" />
                            <span>Customers (Excel)</span>
                        </button>
                        <button
                            onClick={downloadVisitExcel}
                            className="inline-flex items-center justify-center gap-2 px-3 py-3 text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200/50 rounded-xl hover:bg-indigo-100 transition-all shadow-sm cursor-pointer"
                        >
                            <FileSpreadsheet size={13} className="shrink-0" />
                            <span>Visits (Excel)</span>
                        </button>
                        <button
                            onClick={downloadFollowUpExcel}
                            className="inline-flex items-center justify-center gap-2 px-3 py-3 text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200/50 rounded-xl hover:bg-indigo-100 transition-all shadow-sm cursor-pointer"
                        >
                            <FileSpreadsheet size={13} className="shrink-0" />
                            <span>Follow-Ups (Excel)</span>
                        </button>
                        <button
                            onClick={downloadPdf}
                            className="inline-flex items-center justify-center gap-2 px-3 py-3 text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200/50 rounded-xl hover:bg-indigo-100 transition-all shadow-sm cursor-pointer"
                        >
                            <FileText size={13} className="shrink-0" />
                            <span>Customers (PDF)</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ERROR STATE */}
            {error && (
                <div className="flex items-center gap-3 bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-100 font-bold text-sm">
                    <AlertCircle size={18} className="text-rose-500" />
                    {error}
                </div>
            )}

            {/* MAIN DASHBOARD CARD */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">

                {/* CARD HEADER: TABS & SEARCH */}
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">

                    {/* Segmented Control Tabs */}
                    <div className="flex p-1.5 space-x-1 bg-slate-200/50 rounded-xl w-full md:w-auto">
                        {[
                            { id: "customers", label: "Customers" },
                            { id: "visits", label: "Visits" },
                            { id: "followups", label: "Follow-Ups" }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 md:flex-none px-5 py-2 text-sm font-bold rounded-lg transition-all duration-200 ease-in-out ${
                                    activeTab === tab.id
                                        ? "bg-white text-blue-700 shadow-sm border border-slate-100/50"
                                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full md:w-72">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Search size={16} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search records..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-sm"
                        />
                    </div>
                </div>

                {/* TABLE AREA */}
                <div className="overflow-x-auto">
                    {/* Desktop View Table */}
                    <table className="hidden md:table w-full text-left whitespace-nowrap">

                        {/* DYNAMIC HEADERS */}
                        <thead className="bg-slate-50 border-b border-slate-200">
                        {activeTab === "customers" && (
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Customer Name</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">City</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Email</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Phone</th>
                            </tr>
                        )}
                        {activeTab === "visits" && (
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Assigned User</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Customer Name</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Visit Time</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Outcome</th>
                            </tr>
                        )}
                        {activeTab === "followups" && (
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Customer Name</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Follow-up Date</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Status</th>
                            </tr>
                        )}
                        </thead>

                        {/* TABLE BODY */}
                        <tbody className="divide-y divide-slate-100 bg-white">
                        {isLoading ? (
                            <tr>
                                <td colSpan="4" className="py-20 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-3">
                                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                        <span className="text-slate-400 text-sm font-bold">Loading records...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : activeTab === "customers" ? (
                            customersPage.paginatedItems.length > 0 ? (
                                customersPage.paginatedItems.map((c, index) => (
                                    <tr key={index} className="hover:bg-indigo-50/30 transition-colors">
                                        <td className="px-6 py-4 text-sm font-bold text-slate-800">{c.customerName || "-"}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{c.city || "-"}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-indigo-650">{c.email || "-"}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{c.phone || "-"}</td>
                                    </tr>
                                ))
                            ) : <EmptyState colSpan={4} />
                        ) : activeTab === "visits" ? (
                            visitsPage.paginatedItems.length > 0 ? (
                                visitsPage.paginatedItems.map((v, index) => (
                                    <tr key={index} className="hover:bg-indigo-50/30 transition-colors">
                                        <td className="px-6 py-4 text-sm font-bold text-slate-800">{v.userName || "-"}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{v.customerName || "-"}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{v.visitTime || "-"}</td>
                                        <td className="px-6 py-4 text-sm">
                                                <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold">
                                                    {v.outcome || "-"}
                                                </span>
                                        </td>
                                    </tr>
                                ))
                            ) : <EmptyState colSpan={4} />
                        ) : activeTab === "followups" ? (
                            followUpsPage.paginatedItems.length > 0 ? (
                                followUpsPage.paginatedItems.map((f, index) => (
                                    <tr key={index} className="hover:bg-indigo-50/30 transition-colors">
                                        <td className="px-6 py-4 text-sm font-bold text-slate-800">{f.customerName || "-"}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{f.followUpDate || "-"}</td>
                                        <td className="px-6 py-4 text-sm">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                                    f.status?.toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                        f.status?.toLowerCase() === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                            'bg-slate-50 text-slate-700 border-slate-200'
                                                }`}>
                                                    {f.status || "-"}
                                                </span>
                                        </td>
                                    </tr>
                                ))
                            ) : <EmptyState colSpan={3} />
                        ) : null}
                        </tbody>

                    </table>
                </div>

                {/* Mobile View Cards */}
                <div className="md:hidden p-4 space-y-4 bg-slate-50/30 border-t border-slate-100">
                    {isLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-3">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                            <span className="text-slate-400 text-sm font-bold">Loading records...</span>
                        </div>
                    ) : activeTab === "customers" ? (
                        customersPage.paginatedItems.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3.5">
                                {customersPage.paginatedItems.map((c, index) => (
                                    <div key={index} className="p-4 bg-white border border-slate-200/60 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-2">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{c.customerName || "-"}</h4>
                                            <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">{c.city || "-"}</span>
                                        </div>
                                        <div className="flex flex-col gap-1 text-[10px] text-slate-500 font-medium">
                                            <span>Email: <span className="text-indigo-600 font-bold">{c.email || "-"}</span></span>
                                            <span>Phone: <span className="text-slate-755 font-bold">{c.phone || "-"}</span></span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <MobileEmptyState />
                    ) : activeTab === "visits" ? (
                        visitsPage.paginatedItems.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3.5">
                                {visitsPage.paginatedItems.map((v, index) => (
                                    <div key={index} className="p-4 bg-white border border-slate-200/60 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-2.5">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{v.customerName || "-"}</h4>
                                            <span className="text-[9px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wide">{v.outcome || "-"}</span>
                                        </div>
                                        <div className="flex flex-col gap-1 text-[10px] text-slate-500 font-medium">
                                            <span>Assigned Executive: <span className="text-slate-800 font-bold">{v.userName || "-"}</span></span>
                                            <span>Visit Time: <span className="text-slate-755 font-bold">{v.visitTime || "-"}</span></span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <MobileEmptyState />
                    ) : activeTab === "followups" ? (
                        followUpsPage.paginatedItems.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3.5">
                                {followUpsPage.paginatedItems.map((f, index) => (
                                    <div key={index} className="p-4 bg-white border border-slate-200/60 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-2.5">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{f.customerName || "-"}</h4>
                                            <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider border ${
                                                f.status?.toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                f.status?.toLowerCase() === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                'bg-slate-50 text-slate-700 border-slate-100'
                                            }`}>{f.status || "Pending"}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-medium">
                                            <span>Follow-up Date: <span className="text-slate-800 font-bold">{f.followUpDate || "-"}</span></span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <MobileEmptyState />
                    ) : null}
                </div>

                {/* Pagination Controls - for Customers Tab */}
                {activeTab === "customers" && (
                    <PaginationControls
                        currentPage={customersPage.currentPage}
                        totalPages={customersPage.totalPages}
                        itemsPerPage={itemsPerPage}
                        totalItems={filteredCustomers.length}
                        onPageChange={customersPage.goToPage}
                        disabled={isLoading}
                    />
                )}

                {/* Pagination Controls - for Visits Tab */}
                {activeTab === "visits" && (
                    <PaginationControls
                        currentPage={visitsPage.currentPage}
                        totalPages={visitsPage.totalPages}
                        itemsPerPage={itemsPerPage}
                        totalItems={filteredVisits.length}
                        onPageChange={visitsPage.goToPage}
                        disabled={isLoading}
                    />
                )}

                {/* Pagination Controls - for Follow-Ups Tab */}
                {activeTab === "followups" && (
                    <PaginationControls
                        currentPage={followUpsPage.currentPage}
                        totalPages={followUpsPage.totalPages}
                        itemsPerPage={itemsPerPage}
                        totalItems={filteredFollowUps.length}
                        onPageChange={followUpsPage.goToPage}
                        disabled={isLoading}
                    />
                )}
            </div>
        </div>
    );
}

// Polished Empty State Component
function EmptyState({ colSpan }) {
    return (
        <tr>
            <td colSpan={colSpan} className="py-20 text-center">
                <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-3 shadow-sm">
                        <Search className="w-6 h-6 text-slate-300" />
                    </div>
                    <span className="text-slate-800 font-bold text-lg">No records found</span>
                    <span className="text-slate-400 text-sm mt-1 font-medium">We couldn't find anything matching your current filters.</span>
                </div>
            </td>
        </tr>
    );
}

function MobileEmptyState() {
    return (
        <div className="py-12 text-center flex flex-col items-center justify-center max-w-sm mx-auto">
            <Search className="w-8 h-8 text-slate-350 mb-2" />
            <span className="text-slate-800 font-bold text-sm">No records found</span>
            <span className="text-slate-400 text-[11px] mt-1 font-medium">We couldn't find anything matching your search.</span>
        </div>
    );
}