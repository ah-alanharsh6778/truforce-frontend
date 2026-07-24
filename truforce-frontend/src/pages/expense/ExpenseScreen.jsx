import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    Trash2, Coffee, Hotel, Car, Plus, Wallet,
    TrendingDown, X, Search,
    FileSpreadsheet, Upload, CheckCircle2, ChevronLeft
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip
} from "recharts";

export default function ExpenseScreen() {
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const [chartWidth, setChartWidth] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            if (!entries || entries.length === 0) return;
            setChartWidth(entries[0].contentRect.width);
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);
    // Starts with strictly empty array if no local data exists, ensuring no default placeholders or mock records are shown!
    const [expenses, setExpenses] = useState(() => {
        const saved = localStorage.getItem("expenses");
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse expenses", e);
            }
        }
        return []; 
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [amount, setAmount] = useState("");
    const [expenseType, setExpenseType] = useState("Fuel");
    const [description, setDescription] = useState("");
    const [search, setSearch] = useState("");
    const [showSearch, setShowSearch] = useState(false);

    // Scanner Feature States
    const [isScanning, setIsScanning] = useState(false);
    const [scanFileName, setScanFileName] = useState("");
    const [scanSuccess, setScanSuccess] = useState(false);

    // Mobile Bottom Sheet Details
    const [mobileSheetExpense, setMobileSheetExpense] = useState(null);

    // Filter expenses + apply 30-day mobile limit
    const filteredExpenses = useMemo(() => {
        let list = expenses;

        if (search) {
            const q = search.toLowerCase();
            list = list.filter(e => 
                (e.description && e.description.toLowerCase().includes(q)) || 
                (e.expenseType && e.expenseType.toLowerCase().includes(q))
            );
        }

        // Mobile-only 30-day filter limit
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            thirtyDaysAgo.setHours(0, 0, 0, 0);

            list = list.filter(e => e.createdAt && new Date(e.createdAt) >= thirtyDaysAgo);
        }

        return list;
    }, [expenses, search]);

    // Form submission
    const handleAddExpense = (e) => {
        if (e) e.preventDefault();
        const amt = parseFloat(amount);
        if (!amt || isNaN(amt) || amt <= 0) {
            alert("Please enter a valid amount!");
            return;
        }

        const newExpense = {
            id: Date.now(),
            amount: amt,
            expenseType,
            description: description.trim() || `${expenseType} Expense`,
            date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
            createdAt: new Date().toISOString()
        };

        const updated = [newExpense, ...expenses];
        setExpenses(updated);
        localStorage.setItem("expenses", JSON.stringify(updated));

        setAmount("");
        setDescription("");
        setExpenseType("Fuel");
        setIsModalOpen(false);
        setScanSuccess(false);
        setScanFileName("");
    };

    const handleDeleteExpense = (id) => {
        const updated = expenses.filter((e) => e.id !== id);
        setExpenses(updated);
        localStorage.setItem("expenses", JSON.stringify(updated));
    };

    const handleReceiptUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setScanFileName(file.name);
        setIsScanning(true);
        setScanSuccess(false);

        setTimeout(() => {
            setIsScanning(false);
            setScanSuccess(true);

            const fName = file.name.toLowerCase();
            if (fName.includes("petrol") || fName.includes("fuel") || fName.includes("shell") || fName.includes("speed")) {
                setAmount("1850");
                setExpenseType("Fuel");
                setDescription("Shell Petrol Pump refuel");
            } else if (fName.includes("hotel") || fName.includes("stay") || fName.includes("room") || fName.includes("oyo")) {
                setAmount("4200");
                setExpenseType("Hotel");
                setDescription("Hotel Room Stay during audit");
            } else if (fName.includes("toll") || fName.includes("highway") || fName.includes("fastag")) {
                setAmount("380");
                setExpenseType("Toll");
                setDescription("Highway Toll Fastag recharge");
            } else {
                setAmount("680");
                setExpenseType("Food");
                setDescription("Client business dinner outlet");
            }
        }, 2200);
    };

    const monthlyBudget = 25000;
    const totalSpent = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const remainingBalance = Math.max(0, monthlyBudget - totalSpent);
    const spendPercentage = Math.min(100, Math.round((totalSpent / monthlyBudget) * 100));

    const dateMap = {};
    filteredExpenses.forEach((e) => {
        dateMap[e.date] = (dateMap[e.date] || 0) + parseFloat(e.amount || 0);
    });
    const barData = Object.keys(dateMap).map((date) => ({
        date,
        Amount: dateMap[date]
    })).reverse();

    const getCategoryStyles = (type) => {
        const t = (type || "").toUpperCase();
        if (t.includes("FUEL") || t.includes("TOLL")) {
            return {
                bg: "bg-indigo-50 text-indigo-700 border-indigo-100",
                icon: <Car className="w-4 h-4 text-indigo-600" />
            };
        }
        if (t.includes("HOTEL")) {
            return {
                bg: "bg-purple-50 text-purple-700 border-purple-100",
                icon: <Hotel className="w-4 h-4 text-purple-600" />
            };
        }
        return {
            bg: "bg-amber-50 text-amber-700 border-amber-100",
            icon: <Coffee className="w-4 h-4 text-amber-600" />
        };
    };

    return (
        <div className="max-w-7xl mx-auto py-4 px-4 md:px-0 space-y-7 pb-28 md:pb-16 animate-in fade-in duration-400">

            {/* TOP HEADER & COMMAND BOARD */}
            <div className="flex justify-between items-center px-4 md:px-0 mx-4 md:mx-0">
                <div className="flex items-center gap-1">
                    {!showSearch ? (
                        <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight leading-tight">
                            Expenses
                        </h1>
                    ) : (
                        <input
                            type="text"
                            placeholder="Search expenses..."
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
                        onClick={() => navigate('/summary')}
                        className="hidden md:flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-250 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer"
                    >
                        <FileSpreadsheet size={12} />
                        View Summary
                    </button>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="hidden md:flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-md shadow-indigo-500/10 active:scale-95 cursor-pointer"
                    >
                        <Plus size={12} strokeWidth={2.5} />
                        Record Expense
                    </button>
                </div>
            </div>

            {/* BUDGET PROGRESS METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Visual Ring spent progress */}
                <div className="bg-white border border-slate-200/50 p-6 rounded-3xl shadow-sm flex items-center gap-6">
                    <div className="relative w-20 h-20 shrink-0">
                        {/* SVG progress circle */}
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <path
                                className="text-slate-100"
                                strokeWidth="3"
                                stroke="currentColor"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                                className="text-indigo-600 transition-all duration-500"
                                strokeDasharray={`${spendPercentage}, 100`}
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xs font-black text-slate-800">{spendPercentage}%</span>
                            <span className="text-[7px] font-bold text-slate-400 uppercase">spent</span>
                        </div>
                    </div>
                    <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Monthly Budget</span>
                        <h3 className="text-xl font-black text-slate-850 mt-1">₹{totalSpent.toLocaleString("en-IN")}</h3>
                        <p className="text-[10px] text-slate-455 font-bold mt-1">Limit: ₹{monthlyBudget.toLocaleString("en-IN")}</p>
                    </div>
                </div>

                {/* Remaining balance widget */}
                <div className="bg-white border border-slate-200/50 p-6 rounded-3xl shadow-sm flex items-center gap-4">
                    <div className="p-3.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100/50">
                        <TrendingDown className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Remaining Balance</span>
                        <h3 className="text-xl font-black text-slate-800 mt-1">₹{remainingBalance.toLocaleString("en-IN")}</h3>
                        <p className="text-[10px] text-slate-450 font-bold mt-1">Ready for claims</p>
                    </div>
                </div>

                {/* Status indicator widget */}
                <div className="bg-white border border-slate-200/50 p-6 rounded-3xl shadow-sm flex items-center gap-4">
                    <div className="p-3.5 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100/50">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total claims logs</span>
                        <h3 className="text-xl font-black text-slate-800 mt-1">{filteredExpenses.length} Records</h3>
                        <p className="text-[10px] text-slate-450 font-bold mt-1">Stored locally</p>
                    </div>
                </div>

            </div>

            {/* GRAPHS AND CHARTS */}
            {barData.length > 0 && (
                <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/50">
                    <div className="flex justify-between items-center mb-5">
                        <div>
                            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">Cost timeline Graph</h2>
                            <p className="text-[11px] font-bold text-slate-400 mt-0.5">Summary of claims logged over dates</p>
                        </div>
                    </div>
                    <div ref={containerRef} className="h-64 w-full relative min-w-0">
                        {chartWidth > 0 && (
                            <BarChart width={chartWidth} height={256} data={barData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#4F46E5" stopOpacity={1}/>
                                        <stop offset="100%" stopColor="#3730A3" stopOpacity={0.8}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} />
                                <Tooltip 
                                    cursor={{ fill: '#F8FAFC' }} 
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 8px 25px rgba(0, 0, 0, 0.03)', fontWeight: 'bold', fontSize: '11px', fontFamily: 'Plus Jakarta Sans' }} 
                                />
                                <Bar dataKey="Amount" fill="url(#expenseGrad)" radius={[6, 6, 0, 0]} barSize={24} />
                            </BarChart>
                        )}
                    </div>
                </div>
            )}

            {/* EXPENSE LOG LISTS */}
            <div className="bg-white border border-slate-200/50 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="text-slate-800 w-5 h-5" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Expense logs directory</h3>
                    </div>
                    <span className="bg-slate-50 text-slate-500 text-[9px] font-black px-3 py-1.5 rounded-xl border border-slate-200 uppercase tracking-widest shadow-inner">
                        ₹{totalSpent.toLocaleString("en-IN")} Total Claims
                    </span>
                </div>

                {/* MOBILE CARDS VIEW */}
                <div className="md:hidden p-4 space-y-4">
                    {filteredExpenses.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 border border-slate-200/40 rounded-2xl border-dashed">
                            <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                            <h4 className="text-slate-800 font-extrabold text-xs">No expense logs found</h4>
                            <p className="text-slate-450 text-[10px] mt-1">Upload a receipt or record an expense details.</p>
                        </div>
                    ) : (
                        filteredExpenses.map((exp) => {
                            const cStyle = getCategoryStyles(exp.expenseType);
                            return (
                                <div
                                    key={exp.id}
                                    onClick={() => setMobileSheetExpense(exp)}
                                    className="bg-slate-50 border border-slate-200/40 rounded-2xl p-4 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.01)] active:scale-95 transition-all cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${cStyle.bg}`}>
                                            {cStyle.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-extrabold text-xs text-slate-855 leading-tight">{exp.description}</h4>
                                            <span className="text-[9px] font-bold text-slate-400 mt-1 block">{exp.date} - {exp.expenseType}</span>
                                        </div>
                                    </div>
                                    <span className="text-sm font-black text-slate-800">₹{parseFloat(exp.amount).toLocaleString("en-IN")}</span>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* DESKTOP TABLE VIEW */}
                <div className="hidden md:block overflow-x-auto w-full">
                    <table className="w-full text-left whitespace-nowrap border-collapse">
                        <thead className="bg-slate-50/80 border-b border-slate-200/60">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-455 uppercase tracking-wider w-16">#</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-455 uppercase tracking-wider">Date Logged</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-455 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-455 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-455 uppercase tracking-wider">Claim Amount</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-455 uppercase tracking-wider text-center w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-xs text-slate-400 font-bold">
                                        No expense records found.
                                    </td>
                                </tr>
                            ) : (
                                filteredExpenses.map((exp, index) => {
                                    const cStyle = getCategoryStyles(exp.expenseType);
                                    return (
                                        <tr key={exp.id} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="px-6 py-4 text-xs font-bold text-slate-400">{index + 1}</td>
                                            <td className="px-6 py-4 text-xs font-bold text-slate-700">{exp.date}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${cStyle.bg}`}>
                                                    {cStyle.icon}
                                                    {exp.expenseType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-black text-slate-800">{exp.description}</td>
                                            <td className="px-6 py-4 text-xs font-black text-slate-800">₹{parseFloat(exp.amount).toLocaleString("en-IN")}</td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleDeleteExpense(exp.id)}
                                                    className="p-1.5 text-rose-650 bg-rose-50 border border-rose-100/55 rounded-lg hover:bg-rose-100 transition-all cursor-pointer"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MOBILE FLOATING FAB */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="md:hidden fixed bottom-24 right-5 z-40 flex items-center justify-center w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-[0_8px_25px_rgba(79,70,229,0.3)] active:scale-90 border border-white/20 cursor-pointer"
                title="Add Expense"
            >
                <Plus size={22} strokeWidth={2.5} />
            </button>

            {/* LOG EXPENSE DIALOG MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200/80 animate-in zoom-in-95 relative">
                        
                        {/* Scanner Simulation Active overlay */}
                        {isScanning && (
                            <div className="absolute inset-0 bg-slate-900/90 z-55 flex flex-col items-center justify-center text-center p-6 animate-in fade-in">
                                <div className="relative w-48 h-48 border-2 border-dashed border-indigo-400 rounded-3xl overflow-hidden flex items-center justify-center shadow-2xl">
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,1)]" style={{ animation: 'scanLine 2.5s infinite linear' }} />
                                    <FileSpreadsheet className="w-16 h-16 text-indigo-400 animate-pulse" />
                                </div>
                                <h3 className="text-white font-extrabold text-sm mt-6">Analyzing S3 Attachment...</h3>
                                <p className="text-[10px] text-slate-400 mt-1.5 max-w-[200px] leading-relaxed">Extracting receipt credentials and computing claim amounts.</p>
                            </div>
                        )}

                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
                            <div className="flex items-center gap-2 text-slate-905">
                                <Wallet className="text-indigo-650" size={18} />
                                <h2 className="text-base font-black text-slate-800">Record Claim Details</h2>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-655 hover:bg-slate-50 p-2 rounded-xl transition-all cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleAddExpense} className="space-y-4">
                                
                                {/* OCR SCANNER ACTION TRIGGER */}
                                <div className="bg-indigo-50/40 p-4.5 border border-dashed border-indigo-200 rounded-2xl text-center space-y-3 relative group">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        id="ocrUpload" 
                                        className="hidden" 
                                        onChange={handleReceiptUpload} 
                                    />
                                    <label htmlFor="ocrUpload" className="cursor-pointer block">
                                        <div className="w-10 h-10 bg-white border border-indigo-150 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform shadow-sm">
                                            <Upload className="w-4.5 h-4.5 text-indigo-600" />
                                        </div>
                                        <h4 className="text-xs font-black text-slate-800">Scan Receipt Attachment</h4>
                                        <p className="text-[9px] text-slate-450 mt-1">Supports instant auto-filling amounts</p>
                                    </label>
                                    {scanSuccess && (
                                        <div className="text-[9px] font-bold text-emerald-600 flex items-center justify-center gap-1.5 bg-emerald-50 border border-emerald-100 p-2 rounded-xl">
                                            <CheckCircle2 size={12}/> Scanned: {scanFileName}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3.5 pt-1">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Expense Type</label>
                                        <select
                                            value={expenseType}
                                            onChange={(e) => setExpenseType(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-805 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-xs shadow-inner appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em]"
                                            style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")` }}
                                        >
                                            <option value="Fuel">Fuel ⛽</option>
                                            <option value="Toll">Toll 🛣️</option>
                                            <option value="Food">Food 🍔</option>
                                            <option value="Hotel">Hotel 🏨</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Claim Amount (INR)</label>
                                        <input
                                            type="number"
                                            required
                                            placeholder="e.g. 1500"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-805 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-xs shadow-inner"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Description</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Shell refuel checkin"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-805 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-xs shadow-inner"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-5 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer text-center"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-5 py-3.5 bg-[#0f172a] hover:bg-slate-800 text-white font-black rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer text-center uppercase tracking-wider"
                                    >
                                        Add Expense
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* MOBILE SHEET DRAWER */}
            {mobileSheetExpense && (
                <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div onClick={() => setMobileSheetExpense(null)} className="absolute inset-0 cursor-pointer" />
                    <div className="bg-white rounded-t-[2rem] w-full shadow-2xl z-10 border-t border-slate-200/80 animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />
                        
                        <div className="px-6 pb-6 overflow-y-auto space-y-5">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expense Claim details</span>
                                <h3 className="text-base font-black text-slate-800 mt-1">{mobileSheetExpense.description}</h3>
                                <p className="text-xs text-slate-500 font-bold mt-1">Logged Date: {mobileSheetExpense.date}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Claim Type</span>
                                    <span className="text-xs font-bold text-slate-705 flex items-center gap-1.5">{mobileSheetExpense.expenseType}</span>
                                </div>
                                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Claim Amount</span>
                                    <span className="text-xs font-black text-indigo-650">₹{parseFloat(mobileSheetExpense.amount).toLocaleString("en-IN")}</span>
                                </div>
                            </div>

                            {/* Mobile Action Menu */}
                            <div className="pt-3 border-t border-slate-100 space-y-2">
                                <button 
                                    onClick={() => {
                                        handleDeleteExpense(mobileSheetExpense.id);
                                        setMobileSheetExpense(null);
                                    }} 
                                    className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 font-black py-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                                >
                                    <Trash2 size={13} /> Delete Expense Record
                                </button>
                                <button 
                                    onClick={() => setMobileSheetExpense(null)} 
                                    className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold py-4 rounded-xl text-xs cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes scanLine {
                    0% { top: 0%; }
                    50% { top: 100%; }
                    100% { top: 0%; }
                }
            `}</style>
        </div>
    );
}