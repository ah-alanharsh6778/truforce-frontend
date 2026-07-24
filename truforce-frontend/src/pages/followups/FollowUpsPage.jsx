import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    getAllFollowUps,
    createFollowUp,
    updateFollowUp,
    deleteFollowUp
} from "../../features/followup/followupService";
import { getAllCustomers } from "../../features/customer/customerService";
import {
    Search, Plus, Edit2, Trash2, CalendarClock, X, BellRing, 
    Clock3, Loader2, Calendar, User, ChevronLeft
} from "lucide-react";
import PaginationControls from "../../components/common/PaginationControls";
import { usePagination } from "../../hooks/usePagination";

export default function FollowUpsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    // UI States
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [search, setSearch] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const itemsPerPage = 10;

    // Data States
    const [followups, setFollowups] = useState([]);
    const [customers, setCustomers] = useState([]);

    // Bottom Action Sheet & Details Drawer (Mobile)
    const [mobileSheetFollowup, setMobileSheetFollowup] = useState(null);

    const userId = localStorage.getItem("userId") || "";

    const [form, setForm] = useState({
        customerId: "",
        followUpDate: "",
        status: "PENDING",
        remarks: ""
    });

    async function loadData() {
        try {
            setIsLoading(true);
            const [followupData, customerData] = await Promise.all([
                getAllFollowUps(),
                getAllCustomers()
            ]);

            const fData = followupData?.data || followupData;
            const cData = customerData?.data || customerData;

            setFollowups(Array.isArray(fData) ? fData : []);
            setCustomers(Array.isArray(cData) ? cData : []);
        } catch (err) {
            console.error("Error loading follow-ups:", err);
            setFollowups([]);
            setCustomers([]);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        const t = setTimeout(loadData, 0);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (location.state?.openAddModal) {
            setEditMode(false);
            setForm({ customerId: "", followUpDate: "", status: "PENDING", remarks: "" });
            setOpen(true);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, location.pathname]);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const payload = { ...form, userId };

            if (editMode) {
                await updateFollowUp(editId, payload);
            } else {
                await createFollowUp(payload);
            }

            setOpen(false);
            setEditMode(false);
            setEditId(null);
            setForm({ customerId: "", followUpDate: "", status: "PENDING", remarks: "" });

            await loadData();
        } catch (err) {
            console.error("Error saving follow-up:", err);
            alert("Failed to save follow-up.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (f) => {
        setForm({
            customerId: f.customerId || "",
            followUpDate: f.followUpDate ? f.followUpDate.slice(0, 16) : "",
            status: f.status || "PENDING",
            remarks: f.remarks || ""
        });

        setEditId(f.id);
        setEditMode(true);
        setOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this follow-up?")) return;
        try {
            await deleteFollowUp(id);
            await loadData();
        } catch (err) {
            console.error("Error deleting follow-up:", err);
        }
    };

    // Filter logic including search & status dropdown + 30-day mobile limit
    const filteredFollowups = useMemo(() => {
        if (!Array.isArray(followups)) return [];
        let list = followups.filter((f) => {
            const cName = f.customerName || "";
            const matchesSearch = cName.toLowerCase().includes((search || "").toLowerCase());
            const matchesStatus = statusFilter === "ALL" || f.status === statusFilter;
            return matchesSearch && matchesStatus;
        });

        // Mobile-only 30-day filter limit
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            thirtyDaysAgo.setHours(0, 0, 0, 0);

            list = list.filter(f => f.followUpDate && new Date(f.followUpDate) >= thirtyDaysAgo);
        }

        return list;
    }, [followups, search, statusFilter]);

    const {
        currentPage,
        totalPages,
        paginatedItems: paginatedFollowups,
        goToPage
    } = usePagination(filteredFollowups, itemsPerPage, { search, statusFilter });

    const getStatusColor = (status) => {
        const s = (status || "").toUpperCase();
        if (s.includes("COMPLETED")) return "bg-emerald-50 text-emerald-700 border-emerald-100";
        if (s.includes("CANCEL")) return "bg-slate-50 text-slate-505 border-slate-200";
        return "bg-amber-50 text-amber-705 border-amber-100";
    };

    const pendingCount = useMemo(() => {
        if (!Array.isArray(followups)) return 0;
        return followups.filter(f => f.status === "PENDING").length;
    }, [followups]);

    return (
        <div className="max-w-7xl mx-auto py-4 px-4 md:px-0 space-y-7 pb-28 md:pb-16 animate-in fade-in duration-400">

            {/* TOP HEADER & COMMAND BOARD */}
            <div className="flex justify-between items-center px-4 md:px-0 mx-4 md:mx-0">
                <div className="flex items-center gap-1">
                    {!showSearch ? (
                        <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight leading-tight">
                            Follow-Ups
                        </h1>
                    ) : (
                        <input
                            type="text"
                            placeholder="Search follow-ups..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                            className="bg-transparent border-b border-slate-300 text-xs py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 sm:w-48 font-semibold animate-in slide-in-from-left-2 duration-200 text-slate-800"
                        />
                    )}
                </div>

                {/* Search & Actions */}
                <div className="flex items-center gap-3">

                    <button 
                        onClick={() => {
                            if (showSearch) setSearch("");
                            setShowSearch(!showSearch);
                        }}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-full active:scale-95 transition-all cursor-pointer"
                    >
                        {showSearch ? <X size={16} /> : <Search size={16} />}
                    </button>

                    <button
                        onClick={() => {
                            setEditMode(false);
                            setForm({ customerId: "", followUpDate: "", status: "PENDING", remarks: "" });
                            setOpen(true);
                        }}
                        className="hidden md:flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-md shadow-indigo-500/10 active:scale-95 cursor-pointer"
                    >
                        <Plus size={12} strokeWidth={2.5} />
                        Schedule outreach
                    </button>
                </div>
            </div>

            {/* QUICK FILTER PILLS */}
            <div className="flex gap-2 overflow-x-auto pb-1 px-1 sm:px-0">
                {["ALL", "PENDING", "COMPLETED", "CANCELLED"].map((filter) => {
                    const isActive = statusFilter === filter;
                    return (
                        <button
                            key={filter}
                            onClick={() => setStatusFilter(filter)}
                            className={`px-4.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer shrink-0 ${
                                isActive 
                                    ? "bg-slate-900 text-white border-slate-900 shadow-sm" 
                                    : "bg-white text-slate-500 border-slate-200/60 hover:bg-slate-50"
                            }`}
                        >
                            {filter}
                        </button>
                    );
                })}
                <div className="ml-auto hidden sm:flex items-center gap-1.5 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl text-[10px] font-black text-slate-550 uppercase tracking-widest shadow-inner">
                    <BellRing size={12} className="text-amber-500 animate-pulse" /> {pendingCount} tasks due
                </div>
            </div>

            {isLoading ? (
                <div className="py-24 text-center">
                    <Loader2 className="animate-spin mx-auto text-indigo-655 mb-3" size={28} />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Syncing Pipelines...</span>
                </div>
            ) : (
                <>
                    {/* MOBILE CARDS VIEW */}
                    <div className="md:hidden space-y-4">
                        {paginatedFollowups.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/50 shadow-sm px-6">
                                <CalendarClock size={36} className="text-slate-300 mx-auto mb-3 animate-pulse" />
                                <h4 className="text-slate-800 font-extrabold text-sm">No scheduled outreach tasks</h4>
                                <p className="text-slate-450 text-[10px] mt-1.5 max-w-[220px] mx-auto">Create a new scheduled follow-up outreach using the button below.</p>
                            </div>
                        ) : (
                            paginatedFollowups.map((f) => (
                                <div
                                    key={f.id}
                                    onClick={() => setMobileSheetFollowup(f)}
                                    className="bg-white rounded-2xl border border-slate-200/40 p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col gap-3 relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer border-l-4 border-l-indigo-650"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-extrabold text-sm text-slate-800 tracking-tight leading-tight">{f.customerName}</h4>
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-bold bg-slate-50 text-slate-600 border border-slate-200 uppercase mt-2">
                                                <User size={10} /> {f.userName || "Representative"}
                                            </span>
                                        </div>
                                        <span className={`border px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${getStatusColor(f.status)}`}>
                                            {f.status}
                                        </span>
                                    </div>
                                    <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-2.5 flex justify-between items-center text-[10px] font-bold text-slate-450">
                                        <span className="flex items-center gap-1.5"><Calendar size={13} className="text-indigo-400"/> {new Date(f.followUpDate).toLocaleDateString()}</span>
                                        <span className="text-indigo-600 font-extrabold">Details →</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* DESKTOP TABLE VIEW */}
                    <div className="hidden md:block bg-white border border-slate-200/50 rounded-3xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-200/60">
                                        <th className="px-6 py-4.5 text-[10px] font-black text-slate-455 uppercase tracking-wider w-16">#</th>
                                        <th className="px-6 py-4.5 text-[10px] font-black text-slate-455 uppercase tracking-wider">Scheduled Date</th>
                                        <th className="px-6 py-4.5 text-[10px] font-black text-slate-455 uppercase tracking-wider">Client Name</th>
                                        <th className="px-6 py-4.5 text-[10px] font-black text-slate-455 uppercase tracking-wider">Representative</th>
                                        <th className="px-6 py-4.5 text-[10px] font-black text-slate-455 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4.5 text-[10px] font-black text-slate-455 uppercase tracking-wider w-64">Remarks / Details</th>
                                        <th className="px-6 py-4.5 text-[10px] font-black text-slate-455 uppercase tracking-wider text-center w-32">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedFollowups.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-12 text-center text-xs text-slate-400 font-bold">No outreach schedules registered.</td>
                                        </tr>
                                    ) : (
                                        paginatedFollowups.map((f, index) => (
                                            <tr
                                                key={f.id}
                                                className="hover:bg-slate-50/30 transition-colors duration-150"
                                            >
                                                <td className="px-6 py-4 text-xs font-bold text-slate-400">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-700">
                                                    <div className="flex items-center gap-1.5"><Calendar size={13} className="text-indigo-400" /> {new Date(f.followUpDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-black text-slate-800">{f.customerName}</td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-50 text-slate-700 border border-slate-150"><User size={12} /> {f.userName || "Representative"}</span>
                                                </td>
                                                <td className="px-6 py-4 text-xs">
                                                    <span className={`border px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getStatusColor(f.status)}`}>{f.status}</span>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate font-semibold" title={f.remarks}>{f.remarks || "-"}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => handleEdit(f)} className="p-2 text-indigo-650 bg-indigo-50 border border-indigo-100/50 rounded-xl transition-all hover:bg-indigo-100/80 cursor-pointer"><Edit2 size={13} /></button>
                                                        <button onClick={() => handleDelete(f.id)} className="p-2 text-rose-600 bg-rose-50 border border-rose-100/50 rounded-xl transition-all hover:bg-rose-100/80 cursor-pointer"><Trash2 size={13} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            itemsPerPage={itemsPerPage}
                            totalItems={filteredFollowups.length}
                            onPageChange={goToPage}
                            disabled={isLoading}
                        />
                    </div>
                </>
            )}

            {/* MOBILE FLOATING FAB */}
            <button
                onClick={() => {
                    setEditMode(false);
                    setForm({ customerId: "", followUpDate: "", status: "PENDING", remarks: "" });
                    setOpen(true);
                }}
                className="md:hidden fixed bottom-24 right-5 z-40 flex items-center justify-center w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-[0_8px_25px_rgba(79,70,229,0.3)] active:scale-90 transition-all border border-white/20 cursor-pointer"
                title="Schedule follow-up"
            >
                <Plus size={22} strokeWidth={2.5} />
            </button>

            {/* FORM DIALOG OVERLAY */}
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200/80 animate-in zoom-in-95">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
                            <div className="flex items-center gap-2 text-slate-905">
                                <CalendarClock className="text-indigo-600" size={18} />
                                <h2 className="text-base font-black text-slate-800">{editMode ? "Modify Outreach Schedule" : "Schedule Outreach"}</h2>
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                className="text-slate-400 hover:text-slate-650 hover:bg-slate-50 p-2 rounded-xl transition-all cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Client Business</label>
                                    <select
                                        name="customerId"
                                        required
                                        value={form.customerId}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-805 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-xs shadow-inner appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em]"
                                        style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")` }}
                                    >
                                        <option value="" disabled>-- Select Customer --</option>
                                        {customers.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name} - {c.city}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Schedule date & Time</label>
                                    <input
                                        type="datetime-local"
                                        name="followUpDate"
                                        required
                                        value={form.followUpDate}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-805 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-xs shadow-inner"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Status Check</label>
                                    <select
                                        name="status"
                                        required
                                        value={form.status}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-805 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-xs shadow-inner appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em]"
                                        style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")` }}
                                    >
                                        <option value="PENDING">PENDING ⏳</option>
                                        <option value="COMPLETED">COMPLETED ✅</option>
                                        <option value="CANCELLED">CANCELLED ❌</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Outreach Remarks</label>
                                    <textarea
                                        name="remarks"
                                        rows="3"
                                        placeholder="Add instructions, purpose details, or notes..."
                                        value={form.remarks}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-805 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-xs shadow-inner resize-none h-24"
                                    ></textarea>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="flex-1 px-5 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer text-center"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-5 py-3.5 bg-[#0f172a] hover:bg-slate-800 text-white font-black rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer text-center uppercase tracking-wider"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : "Save schedule"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* MOBILE SHEET DRAWER */}
            {mobileSheetFollowup && (
                <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div onClick={() => setMobileSheetFollowup(null)} className="absolute inset-0 cursor-pointer" />
                    <div className="bg-white rounded-t-[2rem] w-full shadow-2xl z-10 border-t border-slate-200/80 animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />
                        
                        <div className="px-6 pb-6 overflow-y-auto space-y-5">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Outreach Task Details</span>
                                <h3 className="text-base font-black text-slate-800 mt-1">{mobileSheetFollowup.customerName}</h3>
                                <p className="text-xs text-slate-500 font-bold mt-1">Assigned to: {mobileSheetFollowup.userName || "Representative"}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Target Date</span>
                                    <span className="text-xs font-bold text-slate-705 flex items-center gap-1.5"><CalendarClock size={13} className="text-indigo-600"/> {new Date(mobileSheetFollowup.followUpDate).toLocaleDateString()}</span>
                                </div>
                                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Outreach Status</span>
                                    <span className="text-xs font-bold text-indigo-705 flex items-center gap-1.5"><Clock3 size={13}/> {mobileSheetFollowup.status}</span>
                                </div>
                            </div>

                            <div className="bg-indigo-50/30 p-4.5 rounded-2xl border border-indigo-100/50">
                                <span className="text-[9px] font-black text-indigo-650 uppercase tracking-widest block mb-2">Remarks / Notes</span>
                                <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                                    {mobileSheetFollowup.remarks || "No remarks noted."}
                                </p>
                            </div>

                            {/* Mobile Action Menu */}
                            <div className="pt-3 border-t border-slate-100 space-y-2">
                                <button 
                                    onClick={() => {
                                        handleEdit(mobileSheetFollowup);
                                        setMobileSheetFollowup(null);
                                    }} 
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-500/10 active:scale-95 transition-all"
                                >
                                    <Edit2 size={13} /> Edit Followup Outreach
                                </button>
                                <button 
                                    onClick={() => {
                                        handleDelete(mobileSheetFollowup.id);
                                        setMobileSheetFollowup(null);
                                    }} 
                                    className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-105 text-rose-600 font-black py-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                                >
                                    <Trash2 size={13} /> Delete Followup Outreach
                                </button>
                                <button 
                                    onClick={() => setMobileSheetFollowup(null)} 
                                    className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold py-4 rounded-xl text-xs cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}