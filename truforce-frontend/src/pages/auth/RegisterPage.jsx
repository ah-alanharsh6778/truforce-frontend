import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";

// Icons from lucide-react
import { 
    Mail, Lock, User as UserIcon, Phone, 
    Loader2, Eye, EyeOff, CheckCircle, 
    ShieldAlert, Shield
} from "lucide-react";
import "./LoginPage.css";

export default function RegisterPage() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [roleId, setRoleId] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchDefaultRole = async () => {
            try {
                const response = await api.get("/auth/roles");
                const userRole = response.data.find(r => r.roleName.toUpperCase() === "USER");

                if (userRole) {
                    setRoleId(userRole.id);
                } else if (response.data.length > 0) {
                    setRoleId(response.data[0].id);
                }
            } catch (err) {
                console.error("Failed to load roles", err);
                setError("Network error. Please refresh the page.");
            }
        };
        fetchDefaultRole();
    }, []);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!roleId) {
            setError("System is still connecting. Please wait a second and try again.");
            return;
        }

        setLoading(true);

        try {
            await api.post("/auth/register", { name, email, phone, password, roleId });
            setSuccess("Account created successfully! Redirecting to login...");
            setTimeout(() => { navigate("/"); }, 2000);
        } catch (err) {
            setError(err?.response?.data?.message || "Registration Failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050c0a] luxury-mesh-bg flex items-center justify-center p-4 sm:p-6 text-slate-100 font-sans selection:bg-[#c58b53] selection:text-black overflow-hidden relative">
            {/* Vercel-style Masked Dotted Grid Background */}
            <div className="premium-masked-grid" />
            
            {/* Ambient glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#0f3020]/15 blur-[130px] animate-glow-slow" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#c58b53]/5 blur-[130px] animate-glow-slow" />

            {/* Form Card */}
            <div className="w-full max-w-md glass-panel rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10 ring-1 ring-white/5 shadow-black/85">
                
                {/* Header: Logo & Title */}
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-gradient-to-br from-[#0f3020] to-[#c58b53]/20 p-3 rounded-2xl shadow-lg border border-[#c58b53]/40 mb-3 ring-1 ring-white/10 animate-float">
                        <Shield size={24} className="text-[#c58b53]" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-serif font-black text-white tracking-tight">
                        Join TruForce
                    </h2>
                    <p className="text-slate-400 mt-1.5 text-xs font-semibold tracking-wide text-center">
                        Register your account to manage field trackers
                    </p>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mb-5 flex items-start gap-3 bg-red-955/70 border border-red-800/80 text-red-200 px-4 py-3 rounded-xl text-xs font-semibold shadow-lg animate-in fade-in">
                        <ShieldAlert size={16} className="mt-0.5 shrink-0 text-red-400" />
                        <p>{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mb-5 flex items-start gap-3 bg-emerald-955/70 border border-emerald-800/80 text-emerald-200 px-4 py-3 rounded-xl text-xs font-semibold shadow-lg animate-in fade-in">
                        <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                        <p>{success}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleRegister} className="space-y-4" autoComplete="off">
                    
                    {/* Full Name */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 pl-1 select-none">
                            Full Name
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-550 group-focus-within:text-[#c58b53] transition-colors">
                                <UserIcon size={16} />
                            </div>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder="Full Name"
                                className="w-full pl-11 pr-4 py-3 bg-[#050c0a] border border-[#1b3a2b]/30 rounded-xl focus:outline-none focus:border-[#c58b53] transition-all text-slate-100 font-semibold placeholder-slate-650 smooth-input shadow-inner text-xs focus:ring-1 focus:ring-[#c58b53]"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 pl-1 select-none">
                            Email Address
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-550 group-focus-within:text-[#c58b53] transition-colors">
                                <Mail size={16} />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="Email Address"
                                className="w-full pl-11 pr-4 py-3 bg-[#050c0a] border border-[#1b3a2b]/30 rounded-xl focus:outline-none focus:border-[#c58b53] transition-all text-slate-100 font-semibold placeholder-slate-650 smooth-input shadow-inner text-xs focus:ring-1 focus:ring-[#c58b53]"
                            />
                        </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 pl-1 select-none">
                            Phone Number
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-555 group-focus-within:text-[#c58b53] transition-colors">
                                <Phone size={16} />
                            </div>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                                placeholder="Phone Number"
                                className="w-full pl-11 pr-4 py-3 bg-[#050c0a] border border-[#1b3a2b]/30 rounded-xl focus:outline-none focus:border-[#c58b53] transition-all text-slate-100 font-semibold placeholder-slate-650 smooth-input shadow-inner text-xs focus:ring-1 focus:ring-[#c58b53]"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 pl-1 select-none">
                            Password
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-555 group-focus-within:text-[#c58b53] transition-colors">
                                <Lock size={16} />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Password"
                                className="w-full pl-11 pr-12 py-3 bg-[#050c0a] border border-[#1b3a2b]/30 rounded-xl focus:outline-none focus:border-[#c58b53] transition-all text-slate-100 font-semibold placeholder-slate-650 smooth-input shadow-inner text-xs focus:ring-1 focus:ring-[#c58b53]"
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)} 
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-555 hover:text-slate-200 transition-colors focus:outline-none cursor-pointer"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button 
                        type="submit" 
                        disabled={loading || !roleId} 
                        className="w-full btn-bronze-glow font-extrabold py-3.5 rounded-xl transition-all duration-305 flex items-center justify-center gap-2 mt-4 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-600 disabled:cursor-not-allowed cursor-pointer text-xs uppercase tracking-widest"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Registering Hub...</span>
                            </>
                        ) : (
                            <span>Sign Up</span>
                        )}
                    </button>
                </form>

                {/* Login Link */}
                <div className="mt-6 text-center border-t border-white/5 pt-5">
                    <p className="text-xs text-slate-400 font-bold tracking-wide select-none">
                        Already have an account? 
                        <Link 
                            to="/" 
                            className="text-[#c58b53] hover:text-[#dca26a] hover:underline font-extrabold transition-colors ml-1"
                        >
                            Log In
                        </Link>
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-4 text-slate-600 text-[10px] font-bold z-10 text-center tracking-widest uppercase select-none">
                © {new Date().getFullYear()} TruForce CRM
            </div>
        </div>
    );
}