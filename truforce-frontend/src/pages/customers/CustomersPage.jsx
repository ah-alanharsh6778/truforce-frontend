import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AddCustomerModal from "../../components/customer/AddCustomerModal";
import { Search, Plus, MapPin, Phone, Mail, Edit2, Trash2, Users, X, ChevronLeft } from "lucide-react"; // Premium Icons
import PaginationControls from "../../components/common/PaginationControls";
import { usePagination } from "../../hooks/usePagination";

import {
    getAllCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer
} from "../../features/customer/customerService";

export default function CustomersPage() {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [search, setSearch] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const itemsPerPage = 10;

    const fetchCustomers = async () => {
        try {
            const data = await getAllCustomers();
            setCustomers(data || []);
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        const t = setTimeout(fetchCustomers, 0);
        return () => clearTimeout(t);
    }, []);

    const handleCreate = async (payload) => {
        try {
            await createCustomer(payload);
            setOpen(false);
            fetchCustomers();
        } catch (error) {
            console.log(error);
        }
    };

    const handleUpdate = async (payload) => {
        try {
            await updateCustomer(editData.id, payload);
            setEditData(null);
            setOpen(false);
            fetchCustomers();
        } catch (error) {
            console.log(error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this customer?")) return;
        try {
            await deleteCustomer(id);
            fetchCustomers();
        } catch (error) {
            console.log(error);
        }
    };

    const filteredCustomers = useMemo(() => {
        return customers.filter((customer) =>
            customer.name?.toLowerCase().includes(search.toLowerCase()) ||
            customer.phone?.toLowerCase().includes(search.toLowerCase()) ||
            customer.email?.toLowerCase().includes(search.toLowerCase()) ||
            customer.city?.toLowerCase().includes(search.toLowerCase())
        );
    }, [customers, search]);

    const {
        currentPage,
        totalPages,
        paginatedItems: paginatedCustomers,
        goToPage
    } = usePagination(filteredCustomers, itemsPerPage, { search });

    return (
        <div className="max-w-7xl mx-auto py-4 px-2 sm:px-6 space-y-6 pb-24 md:pb-12 animate-in fade-in duration-500">

             {/* 🔥 HEADER & CONTROLS 🔥 */}
            <div className="flex justify-between items-center px-4 md:px-0 mx-4 md:mx-0">
                <div className="flex items-center gap-1">
                    {!showSearch ? (
                        <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight leading-tight flex items-center gap-2">
                            <Users className="text-indigo-600 w-5 h-5" /> Customers
                        </h1>
                    ) : (
                        <input
                            type="text"
                            placeholder="Search customers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                            className="bg-transparent border-b border-slate-300 text-xs py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 sm:w-48 font-semibold animate-in slide-in-from-left-2 duration-200 text-slate-800"
                        />
                    )}
                </div>

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
                        onClick={() => { setEditData(null); setOpen(true); }}
                        className="hidden md:flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-md shadow-indigo-500/10 active:scale-95 cursor-pointer"
                    >
                        <Plus size={12} strokeWidth={2.5} />
                        Add Customer
                    </button>
                </div>
            </div>

            {/* 🔥 MOBILE VIEW: COOL CARDS (Hidden on Laptop) 🔥 */}
            <div className="md:hidden space-y-4">
                {paginatedCustomers.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-3xl border border-slate-100">
                        <p className="text-slate-400 font-bold text-sm">No Customers Found</p>
                    </div>
                ) : (
                    paginatedCustomers.map((c) => (
                        <div key={c.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4">

                            {/* Card Header */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-black text-lg text-slate-800 leading-tight">{c.name}</h3>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mt-1">
                                        <MapPin size={12} className="text-blue-500"/> {c.city || "No City"}
                                    </p>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="bg-slate-50 rounded-2xl p-3 space-y-2 border border-slate-100">
                                <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                    <Phone size={14} className="text-emerald-500"/> {c.phone || "N/A"}
                                </p>
                                <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                    <Mail size={14} className="text-amber-500"/> {c.email || "N/A"}
                                </p>
                            </div>

                            {/* Card Actions */}
                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={() => { setEditData(c); setOpen(true); }}
                                    className="flex-1 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2.5 rounded-xl text-xs font-bold transition-all"
                                >
                                    <Edit2 size={14} /> Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(c.id)}
                                    className="flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 p-2.5 rounded-xl transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 🔥 LAPTOP VIEW: CLEAN TABLE (Hidden on Mobile) 🔥 */}
            <div className="hidden md:block bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider w-16">S.No.</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Phone</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Email Address</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">City</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-center">Action</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                        {paginatedCustomers.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-sm text-slate-400 font-bold">No Customers Found</td>
                            </tr>
                        ) : (
                            paginatedCustomers.map((c, index) => (
                                <tr key={c.id} className="hover:bg-slate-50 transition-colors duration-150">
                                    <td className="px-6 py-4 text-sm text-slate-400 font-bold">{index + 1}</td>
                                    <td className="px-6 py-4 text-sm font-black text-slate-800">{c.name}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-bold">{c.phone}</td>
                                    <td className="px-6 py-4 text-sm text-blue-600 font-bold">{c.email}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-bold">{c.city}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => { setEditData(c); setOpen(true); }} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all">
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={() => handleDelete(c.id)} className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-all">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {filteredCustomers.length > 0 && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={goToPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredCustomers.length}
                />
            )}

            <AddCustomerModal isOpen={open} onClose={() => { setOpen(false); setEditData(null); }} onSubmit={editData ? handleUpdate : handleCreate} editData={editData} />
        </div>
    );
}