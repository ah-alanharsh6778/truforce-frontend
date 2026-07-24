import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Calendar, Clock, Trash2, Edit2, User, FileText, Briefcase, X, CheckCircle2, Loader2, ChevronLeft } from "lucide-react";
import api from "../../api/axios";

import {
    getAllVisits,
    deleteVisit,
} from "../../features/visit/visitService";
import PaginationControls from "../../components/common/PaginationControls";
import { usePagination } from "../../hooks/usePagination";

export default function VisitsPage() {
    const navigate = useNavigate();
    const [visits, setVisits] = useState([]);
    const [search, setSearch] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [loading, setLoading] = useState(true);
    const itemsPerPage = 10;

    // View Summary Modal (Desktop)
    const [selectedVisit, setSelectedVisit] = useState(null);
    
    // Bottom Action Sheet & Details Drawer (Mobile)
    const [mobileSheetVisit, setMobileSheetVisit] = useState(null);

    async function loadData() {
        try {
            setLoading(true);
            const userId = localStorage.getItem("userId");
            const rawRole = localStorage.getItem("role") || "";
            const roleName = rawRole.toUpperCase();
            const isAdmin = roleName.includes("ADMIN") || roleName.includes("MANAGER");

            let visitRes;
            if (isAdmin) {
                visitRes = await getAllVisits();
            } else if (userId) {
                const res = await api.get(`/visits/user/${userId}`);
                visitRes = res.data;
            } else {
                visitRes = { data: [] };
            }
            setVisits(visitRes.data || visitRes || []);
        } catch (error) {
            console.log("Error loading visits:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const t = setTimeout(loadData, 0);
        return () => clearTimeout(t);
    }, []);

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this visit?")) return;
        try {
            await deleteVisit(id);
            loadData();
        } catch (error) {
            console.log(error);
        }
    };

    const handleEdit = (e, visit) => {
        e.stopPropagation();
        navigate('/add-visit', { state: { editData: visit } });
    };

    // Filter logic with 30-day mobile limitation
    const filteredVisits = useMemo(() => {
        let list = visits.filter((visit) =>
            visit.customerName?.toLowerCase().includes(search.toLowerCase()) ||
            visit.userName?.toLowerCase().includes(search.toLowerCase())
        );

        // Mobile-only 30-day filter limit
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            thirtyDaysAgo.setHours(0, 0, 0, 0);

            list = list.filter(v => v.visitTime && new Date(v.visitTime) >= thirtyDaysAgo);
        }

        return list;
    }, [visits, search]);

    const {
        currentPage,
        totalPages,
        paginatedItems: paginatedVisits,
        goToPage
    } = usePagination(filteredVisits, itemsPerPage, { search });

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('en-IN', options);
    };

    const getOutcomeColor = (outcome) => {
        const o = (outcome || "").toUpperCase();
        if (o.includes("CLOSED") || o.includes("INTERESTED")) {
            return "bg-emerald-50 text-emerald-700 border-emerald-100";
        }
        if (o.includes("FOLLOW") || o.includes("PENDING")) {
            return "bg-indigo-50 text-indigo-700 border-indigo-100";
        }
        return "bg-slate-50 text-slate-600 border-slate-200";
    };

    return (
        <div className="max-w-7xl mx-auto py-4 px-4 md:px-0 space-y-7 pb-28 md:pb-16 animate-in fade-in duration-300">

            {/* TOP HEADER & COMMAND BOARD */}
            {/* Header section */}
            <div className="flex justify-between items-center px-4 md:px-0 mx-4 md:mx-0">
                <div className="flex items-center gap-1">
                    {!showSearch ? (
                        <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight leading-tight">
                            Visits
                        </h1>
                    ) : (
                        <input
                            type="text"
                            placeholder="Search visits..."
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
                        onClick={() => navigate('/add-visit')}
                        className="hidden md:flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-md shadow-indigo-500/10 active:scale-95 cursor-pointer"
                    >
                        <Plus size={12} strokeWidth={2.5} />
                        Log Visit
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="py-24 text-center">
                    <Loader2 className="animate-spin mx-auto text-indigo-650 mb-3" size={28} />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Syncing Registry Logs...</span>
                </div>
            ) : (
                <>
                    {/* MOBILE CARDS VIEW */}
                    <div className="md:hidden space-y-4">
                        {paginatedVisits.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/50 shadow-sm px-6">
                                <Calendar size={36} className="text-slate-300 mx-auto mb-3" />
                                <h4 className="text-slate-850 font-black text-sm">No visit records found</h4>
                                <p className="text-slate-450 text-[10px] mt-1.5 max-w-[200px] mx-auto">Create a new visit log using the quick action button below.</p>
                            </div>
                        ) : (
                            paginatedVisits.map((visit) => (
                                <div
                                    key={visit.id}
                                    onClick={() => setMobileSheetVisit(visit)}
                                    className="bg-white rounded-2xl border border-slate-200/40 p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col gap-3 relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer border-l-4 border-l-indigo-600"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-extrabold text-sm text-slate-800 tracking-tight leading-tight">{visit.customerName}</h4>
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-bold bg-slate-50 text-slate-600 border border-slate-200/60 uppercase mt-2">
                                                <User size={10} /> {visit.userName}
                                            </span>
                                        </div>
                                        <span className={`border px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${getOutcomeColor(visit.outcome)}`}>
                                            {visit.outcome || "COMPLETED"}
                                        </span>
                                    </div>
                                    <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-2.5 flex justify-between items-center text-[10px] font-bold text-slate-450">
                                        <span className="flex items-center gap-1.5"><Calendar size={13} className="text-indigo-400"/> {formatDate(visit.visitTime)}</span>
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
                                        <th className="px-6 py-4.5 text-[10px] font-black text-slate-455 uppercase tracking-wider">Date & Time</th>
                                        <th className="px-6 py-4.5 text-[10px] font-black text-slate-455 uppercase tracking-wider">Representative</th>
                                        <th className="px-6 py-4.5 text-[10px] font-black text-slate-455 uppercase tracking-wider">Customer</th>
                                        <th className="px-6 py-4.5 text-[10px] font-black text-slate-455 uppercase tracking-wider">Outcome</th>
                                        <th className="px-6 py-4.5 text-[10px] font-black text-slate-455 uppercase tracking-wider w-64">Notes</th>
                                        <th className="px-6 py-4.5 text-[10px] font-black text-slate-455 uppercase tracking-wider text-center w-32">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedVisits.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-12 text-center text-xs text-slate-400 font-bold">No recorded visits available.</td>
                                        </tr>
                                    ) : (
                                        paginatedVisits.map((visit, index) => (
                                            <tr
                                                key={visit.id}
                                                onClick={() => setSelectedVisit(visit)}
                                                className="hover:bg-slate-50/30 cursor-pointer transition-colors duration-150"
                                            >
                                                <td className="px-6 py-4 text-xs font-bold text-slate-400">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-700">
                                                    <div className="flex items-center gap-1.5"><Calendar size={13} className="text-indigo-400" /> {formatDate(visit.visitTime)}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-50 text-slate-700 border border-slate-150"><User size={12} /> {visit.userName}</span>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-black text-slate-800">{visit.customerName}</td>
                                                <td className="px-6 py-4 text-xs">
                                                    <span className={`border px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getOutcomeColor(visit.outcome)}`}>{visit.outcome || "COMPLETED"}</span>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate font-semibold" title={visit.notes}>{visit.notes || "-"}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={(e) => handleEdit(e, visit)} className="p-2 text-indigo-650 bg-indigo-50 border border-indigo-100/50 rounded-xl transition-all hover:bg-indigo-100/80 cursor-pointer"><Edit2 size={13} /></button>
                                                        <button onClick={(e) => handleDelete(e, visit.id)} className="p-2 text-rose-600 bg-rose-50 border border-rose-100/50 rounded-xl transition-all hover:bg-rose-100/80 cursor-pointer"><Trash2 size={13} /></button>
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
                            totalItems={filteredVisits.length}
                            onPageChange={goToPage}
                            disabled={loading}
                        />
                    </div>
                </>
            )}

            {/* MOBILE FLOATING ACTION BUTTON */}
            <button
                onClick={() => navigate('/add-visit')}
                className="md:hidden fixed bottom-24 right-5 z-40 flex items-center justify-center w-14 h-14 bg-indigo-600 text-white rounded-full shadow-[0_8px_25px_rgba(79,70,229,0.3)] active:scale-90 transition-all border border-white/20 cursor-pointer"
                title="Log Visit"
            >
                <Plus size={22} strokeWidth={2.5} />
            </button>

            {/* DESKTOP DETAIL VIEW MODAL */}
            {selectedVisit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200/80">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                            <div className="flex items-center gap-2">
                                <Briefcase className="text-indigo-650 w-5 h-5" />
                                <h2 className="text-base font-black text-slate-800">{selectedVisit.customerName}</h2>
                            </div>
                            <button onClick={() => setSelectedVisit(null)} className="text-slate-400 hover:text-slate-655 hover:bg-slate-50 p-2 rounded-xl transition-all cursor-pointer"><X size={16} /></button>
                        </div>

                        <div className="p-6 md:p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Meeting Time</p>
                                    <p className="text-xs font-bold text-slate-800 flex items-center gap-2"><Calendar size={14} className="text-indigo-500"/> {formatDate(selectedVisit.visitTime)}</p>
                                </div>
                                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-150">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status / Outcome</p>
                                    <p className="text-xs font-bold text-emerald-650 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-505"/> {selectedVisit.outcome || "Completed"}</p>
                                </div>
                                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-150">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                                    <p className="text-xs font-bold text-slate-800 flex items-center gap-2"><Clock size={14} className="text-amber-500"/> {selectedVisit.visitDuration || "0"} Minutes</p>
                                </div>
                                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-150">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Representative</p>
                                    <p className="text-xs font-bold text-slate-800 flex items-center gap-2"><User size={14} className="text-blue-500"/> {selectedVisit.userName}</p>
                                </div>
                            </div>

                            <div className="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100/50">
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-1.5"><FileText size={14}/> Meeting Notes</p>
                                <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                                    {selectedVisit.notes || "No meeting notes registered."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MOBILE SHEET DRAWER */}
            {mobileSheetVisit && (
                <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div onClick={() => setMobileSheetVisit(null)} className="absolute inset-0 cursor-pointer" />
                    <div className="bg-white rounded-t-[2rem] w-full shadow-2xl z-10 border-t border-slate-200/80 animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />
                        
                        <div className="px-6 pb-6 overflow-y-auto space-y-5">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Meeting Details</span>
                                <h3 className="text-base font-black text-slate-800 mt-1">{mobileSheetVisit.customerName}</h3>
                                <p className="text-xs text-slate-500 font-bold mt-1">Logged by: {mobileSheetVisit.userName}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Visit Date</span>
                                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Calendar size={13} className="text-indigo-600"/> {formatDate(mobileSheetVisit.visitTime)}</span>
                                </div>
                                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Outcome Status</span>
                                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5"><CheckCircle2 size={13}/> {mobileSheetVisit.outcome || "Completed"}</span>
                                </div>
                            </div>

                            <div className="bg-indigo-50/30 p-4.5 rounded-2xl border border-indigo-100/50">
                                <span className="text-[9px] font-black text-indigo-650 uppercase tracking-widest block mb-2">Meeting Notes / Summary</span>
                                <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                                    {mobileSheetVisit.notes || "No notes registered."}
                                </p>
                            </div>

                            {/* Mobile Action Menu */}
                            <div className="pt-3 border-t border-slate-100 space-y-2">
                                <button 
                                    onClick={(e) => {
                                        handleEdit(e, mobileSheetVisit);
                                        setMobileSheetVisit(null);
                                    }} 
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-500/10 active:scale-95 transition-all"
                                >
                                    <Edit2 size={13} /> Edit Visit Log
                                </button>
                                <button 
                                    onClick={(e) => {
                                        handleDelete(e, mobileSheetVisit.id);
                                        setMobileSheetVisit(null);
                                    }} 
                                    className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-605 font-black py-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                                >
                                    <Trash2 size={13} /> Delete Visit Log
                                </button>
                                <button 
                                    onClick={() => setMobileSheetVisit(null)} 
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