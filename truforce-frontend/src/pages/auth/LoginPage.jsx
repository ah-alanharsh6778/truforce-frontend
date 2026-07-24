import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

// Icons from lucide-react
import { 
    Mail, Lock, Loader2, Eye, EyeOff, 
    Fingerprint, ShieldAlert, Sparkles, 
    Shield, Target, X, Zap, User as UserIcon, 
    Phone, CheckCircle, Navigation, Map
} from "lucide-react";
import "./LoginPage.css";

export default function LoginPage() {
    const [authMode, setAuthMode] = useState("login"); // "login" or "register"
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [roleId, setRoleId] = useState("");
    
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Custom states for credentials or biometrics inside modal
    const [activeTab, setActiveTab] = useState("password");
    const [registerBio, setRegisterBio] = useState(false);

    // MFA and Forgot Password states
    const [showMfaChallenge, setShowMfaChallenge] = useState(false);
    const [mfaEmail, setMfaEmail] = useState("");
    const [mfaOtp, setMfaOtp] = useState("");
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [resetOtp, setResetOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [forgotStep, setForgotStep] = useState(1); // 1 = request email, 2 = verify and reset
    
    // Desktop View Landing Page States
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [consultationAlert, setConsultationAlert] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    // Check pathname on mount or route changes
    useEffect(() => {
        Promise.resolve().then(() => {
            if (location.pathname === "/register") {
                setAuthMode("register");
                setShowLoginModal(true);
            } else {
                setAuthMode("login");
            }
        });
    }, [location.pathname]);

    // Fetch default user roles on mount
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
                setError("System configuration offline. Please reload the page.");
            }
        };
        fetchDefaultRole();
    }, []);

    // Auto-dismiss floating error/success toast alerts after 5 seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(""), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(""), 5000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    // Helper: Register Biometric Credentials via browser WebAuthn API
    const handleRegisterBiometrics = async (userEmail, userPassword) => {
        try {
            if (!window.PublicKeyCredential) {
                console.warn("Biometrics not supported on this browser.");
                return;
            }

            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);
            
            const userId = new Uint8Array(16);
            window.crypto.getRandomValues(userId);

            console.log("🔒 Requesting biometric registration challenge...");
            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge,
                    rp: { name: "TruForce CRM" },
                    user: {
                        id: userId,
                        name: userEmail,
                        displayName: userEmail
                    },
                    pubKeyCredParams: [
                        { alg: -7, type: "public-key" },
                        { alg: -257, type: "public-key" }
                    ],
                    authenticatorSelection: {
                        userVerification: "required",
                        residentKey: "preferred"
                    },
                    timeout: 60000
                }
            });

            if (credential) {
                localStorage.setItem("bio_email", userEmail);
                localStorage.setItem("bio_password", userPassword);
                console.log("✅ Biometric registration stored locally!");
            }
        } catch (err) {
            console.error("Biometric registration failed:", err);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            const response = await api.post("/auth/login", {
                email,
                password
            });

            const data = response.data?.data || response.data;

            if (data.mfaRequired) {
                setMfaEmail(data.email || email);
                setShowMfaChallenge(true);
                setSuccess("MFA required. Verification code sent to your email!");
                return;
            }

            login(data.token, {
                userId: data.userId,
                name: data.name,
                email: data.email,
                role: data.role
            });

            if (registerBio) {
                await handleRegisterBiometrics(email, password);
            }

            navigate("/dashboard");

        } catch (err) {
            setError(
                err?.response?.data?.message ||
                "Login Failed. Please check your credentials."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleVerify2fa = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            const response = await api.post("/auth/verify-2fa", {
                email: mfaEmail,
                otp: mfaOtp
            });

            const data = response.data?.data || response.data;

            login(data.token, {
                userId: data.userId,
                name: data.name,
                email: data.email,
                role: data.role
            });

            navigate("/dashboard");
        } catch (err) {
            setError(err?.response?.data?.message || "2FA verification failed. Please check the code.");
        } finally {
            setLoading(false);
        }
    };

    const handleRequestForgotPassword = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            await api.post("/auth/forgot-password", { email: forgotEmail });
            setSuccess("Verification OTP sent successfully! Check your email.");
            setForgotStep(2);
        } catch (err) {
            setError(err?.response?.data?.message || "Failed to request password reset OTP.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtpAndResetPassword = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            await api.post("/auth/verify-otp", {
                email: forgotEmail,
                otp: resetOtp,
                newPassword: newPassword
            });
            setSuccess("Password updated successfully! Switching to Login...");
            setTimeout(() => {
                setShowForgotPassword(false);
                setForgotStep(1);
                setForgotEmail("");
                setResetOtp("");
                setNewPassword("");
                setError("");
                setSuccess("");
            }, 2000);
        } catch (err) {
            setError(err?.response?.data?.message || "Invalid OTP code or email.");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!roleId) {
            setError("Operations configuration syncing. Please try again.");
            return;
        }

        setLoading(true);

        try {
            await api.post("/auth/register", { name, email, phone, password, roleId });
            setSuccess("Account registered! Switching to Secure Login...");
            setTimeout(() => { 
                setAuthMode("login");
                setSuccess("");
                setPassword("");
            }, 1800);
        } catch (err) {
            setError(err?.response?.data?.message || "Registration failed. Try checking details.");
        } finally {
            setLoading(false);
        }
    };

    // Next-Gen Biometric TouchID/FaceID Login Handler
    const handleBiometricLogin = async () => {
        setError("");
        
        const storedEmail = localStorage.getItem("bio_email");
        const storedPassword = localStorage.getItem("bio_password");
        
        if (!storedEmail || !storedPassword) {
            setError("Biometric key not registered. Please log in with credentials first and tick 'Enable Biometrics'.");
            return;
        }

        setLoading(true);
        try {
            if (window.PublicKeyCredential) {
                console.log("🔒 Accessing hardware scanner key challenge...");
                
                const challenge = new Uint8Array(32);
                window.crypto.getRandomValues(challenge);

                const assertion = await navigator.credentials.get({
                    publicKey: {
                        challenge,
                        userVerification: "required",
                        timeout: 60000
                    }
                });

                if (assertion) {
                    const response = await api.post("/auth/login", {
                        email: storedEmail,
                        password: storedPassword
                    });

                    const data = response.data;

                    login(data.token, {
                        userId: data.userId,
                        name: data.name,
                        email: data.email,
                        role: data.role
                    });

                    navigate("/dashboard");
                    console.log("✅ Biometrics verified. Logged in successfully!");
                }
            } else {
                setError("Hardware verification protocols are not supported on this browser.");
            }
        } catch (err) {
            console.error("Biometrics failed:", err);
            setError("Biometric scan cancelled or mismatch occurred.");
        } finally {
            setLoading(false);
        }
    };

    const toggleAuthMode = (mode) => {
        setError("");
        setSuccess("");
        setAuthMode(mode);
    };

    return (
        <div className="min-h-screen bg-[#060b16] text-slate-105 font-sans selection:bg-[#06b6d4] selection:text-black overflow-x-hidden relative">

            {/* ADVANCED GLASSMORPHIC NEON ERROR TOAST */}
            {error && (
                <div className="fixed top-6 right-5 left-5 sm:left-auto sm:w-[380px] z-55 animate-in slide-in-from-top-6 duration-300">
                    <div className="bg-slate-950/85 backdrop-blur-xl border border-red-500/25 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_15px_rgba(239,68,68,0.15)] flex items-start gap-3.5 relative overflow-hidden group">
                        {/* Red glow indicator line on the left side */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-rose-600" />
                        
                        {/* Modern layout icon */}
                        <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                            <ShieldAlert size={18} className="text-red-500 animate-pulse" />
                        </div>
                        
                        {/* Message content */}
                        <div className="flex-1 min-w-0 text-left space-y-0.5">
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-red-500 font-mono">Authentication Mismatch</h4>
                            <p className="text-xs font-bold text-slate-200 leading-tight">{error}</p>
                        </div>
                        
                        {/* Close button */}
                        <button
                            onClick={() => setError("")}
                            className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                            <X size={14} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            )}

            {/* ADVANCED GLASSMORPHIC NEON SUCCESS TOAST */}
            {success && (
                <div className="fixed top-6 right-5 left-5 sm:left-auto sm:w-[380px] z-55 animate-in slide-in-from-top-6 duration-300">
                    <div className="bg-slate-950/85 backdrop-blur-xl border border-emerald-500/25 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_15px_rgba(16,185,129,0.15)] flex items-start gap-3.5 relative overflow-hidden group">
                        {/* Green glow indicator line on the left side */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-teal-600" />
                        
                        {/* Modern layout icon */}
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <CheckCircle size={18} className="text-emerald-500" />
                        </div>
                        
                        {/* Message content */}
                        <div className="flex-1 min-w-0 text-left space-y-0.5">
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-emerald-500 font-mono">System Broadcast</h4>
                            <p className="text-xs font-bold text-slate-200 leading-tight">{success}</p>
                        </div>
                        
                        {/* Close button */}
                        <button
                            onClick={() => setSuccess("")}
                            className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                            <X size={14} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* 💻 DESKTOP VIEW: LUXURY LANDING PAGE & MAP DASHBOARD */}
            {/* ======================================================== */}
            <div className="hidden lg:block min-h-screen w-full midnight-mesh-bg relative pb-20">
                {/* Vercel-style Masked Dotted Grid Background */}
                <div className="premium-masked-grid" />

                {/* 1. Top Navigation Bar */}
                <nav className="relative z-10 max-w-7xl mx-auto px-8 py-6 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3 select-none">
                        <div className="bg-gradient-to-br from-[#082f49] to-[#f97316]/20 p-2.5 rounded-xl border border-[#06b6d4]/30 shadow-xl shadow-black/80">
                            <span className="text-xl font-black tracking-tighter text-[#06b6d4] font-serif">T</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
                                TRUFORCE
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-8 font-semibold">
                        <a href="#performance" className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#06b6d4] transition-colors">Performance Engine</a>
                        <a href="#workforce" className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#06b6d4] transition-colors">Workforce Intelligence</a>
                        <a href="#insights" className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#06b6d4] transition-colors">Strategic Insights</a>
                        <a href="#pricing" className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#06b6d4] transition-colors">Pricing</a>
                    </div>

                    <button 
                        onClick={() => {
                            toggleAuthMode("login");
                            setShowLoginModal(true);
                        }}
                        className="btn-cyan-glow font-extrabold text-[11px] uppercase tracking-widest px-6 py-3 rounded-full cursor-pointer"
                    >
                        Request Admin Access
                    </button>
                </nav>

                {/* 2. Hero Section (High-End & Spacious) */}
                <header className="relative z-10 max-w-4xl mx-auto text-center mt-20 px-6">
                    <div className="inline-flex items-center gap-2 bg-[#082f49]/30 border border-[#06b6d4]/20 text-[#06b6d4] text-[9px] font-black px-4.5 py-1.5 rounded-full mb-6 tracking-widest uppercase shadow-sm">
                        <Sparkles size={11} className="text-[#06b6d4]" />
                        Precision Workforce Optimization
                    </div>
                    
                    <h1 className="font-serif text-5xl md:text-6.5xl font-black tracking-tight text-white leading-[1.08] select-none">
                        Unleash True Force.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#06b6d4] via-[#38bdf8] to-[#f97316]">
                            Elevate Every Performance.
                        </span>
                    </h1>
                    
                    <p className="text-slate-400 text-sm md:text-[15px] mt-6 max-w-2.5xl mx-auto leading-relaxed font-normal">
                        Truforce provides a precision workforce optimization platform, harnessing data and AI to build teams, predict outcomes, and empower exceptional business execution. Not just tracking—optimization.
                    </p>

                    <div className="flex items-center justify-center gap-4.5 mt-8.5">
                        <button 
                            onClick={() => {
                                toggleAuthMode("login");
                                setShowLoginModal(true);
                            }}
                            className="btn-cyan-glow font-extrabold text-[11px] uppercase tracking-widest px-8 py-4.5 rounded-full cursor-pointer shadow-xl shadow-[#06b6d4]/20"
                        >
                            Begin Optimization
                        </button>
                        <button 
                            onClick={() => {
                                setConsultationAlert(true);
                                setTimeout(() => setConsultationAlert(false), 3000);
                            }}
                            className="border border-slate-700 hover:border-white text-slate-350 hover:text-white font-extrabold text-[11px] uppercase tracking-widest px-8 py-4.5 rounded-full transition-all active:scale-95 cursor-pointer bg-white/5 backdrop-blur-sm"
                        >
                            Schedule a Consultation
                        </button>
                    </div>

                    {consultationAlert && (
                        <div className="mt-4 bg-[#082f49]/80 border border-[#06b6d4]/30 text-[#06b6d4] py-2.5 px-4 rounded-xl text-xs font-bold inline-block animate-in fade-in duration-200">
                            📅 Consultation Scheduler initialized! We will contact you soon.
                        </div>
                    )}
                </header>

                {/* 3. Premium Dashboard Preview (Distinct UI) */}
                <section className="relative z-10 max-w-7xl mx-auto mt-20 px-6">
                    <div className="glass-panel-cyan rounded-3xl p-6 relative ring-1 ring-white/5">
                        
                        {/* Dashboard Top Header */}
                        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-[#082f49]/60 text-[#06b6d4] rounded-xl border border-[#06b6d4]/20">
                                    <Target size={18} />
                                </div>
                                <div>
                                    <h3 className="text-[13px] font-extrabold text-white uppercase tracking-widest">Workforce Command Center</h3>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Enterprise Dashboard Console</p>
                                </div>
                            </div>
                            <span className="text-[9px] font-black text-[#06b6d4] bg-[#06b6d4]/10 border border-[#06b6d4]/20 px-3 py-1 rounded">
                                SYSTEM DISPATCH ACTIVE
                            </span>
                        </div>

                        {/* Distinct 3-Column SaaS Panel Layout */}
                        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                            
                            {/* Column 1: Real-time Analytics & Dwell Time Chart (Left Side) */}
                            <div className="xl:col-span-1 bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                                <div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Real-Time Analytics</span>
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <div className="bg-[#060b16]/60 rounded-xl p-3 border border-white/5">
                                            <span className="text-[8px] text-slate-500 font-bold uppercase">Active Nodes</span>
                                            <span className="block text-lg font-black text-[#06b6d4] mt-0.5">85+</span>
                                        </div>
                                        <div className="bg-[#060b16]/60 rounded-xl p-3 border border-white/5">
                                            <span className="text-[8px] text-slate-500 font-bold uppercase">Latency</span>
                                            <span className="block text-lg font-black text-[#f97316] mt-0.5">45ms</span>
                                        </div>
                                    </div>
                                    
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Agent Dwell Time</span>
                                    
                                    {/* Dwell Time Chart SVG */}
                                    <div className="h-32 bg-[#060b16]/60 rounded-xl border border-white/5 flex items-end justify-between p-3 gap-2">
                                        <div className="flex flex-col items-center w-full">
                                            <div className="w-full bg-[#06b6d4]/80 rounded-t-sm h-16 shadow-[0_0_10px_rgba(6,182,212,0.3)]" />
                                            <span className="text-[7px] font-black text-slate-500 mt-1">A</span>
                                        </div>
                                        <div className="flex flex-col items-center w-full">
                                            <div className="w-full bg-[#f97316]/80 rounded-t-sm h-24 shadow-[0_0_10px_rgba(249,115,22,0.3)]" />
                                            <span className="text-[7px] font-black text-slate-500 mt-1">B</span>
                                        </div>
                                        <div className="flex flex-col items-center w-full">
                                            <div className="w-full bg-[#06b6d4]/80 rounded-t-sm h-10 shadow-[0_0_10px_rgba(6,182,212,0.2)]" />
                                            <span className="text-[7px] font-black text-slate-500 mt-1">C</span>
                                        </div>
                                        <div className="flex flex-col items-center w-full">
                                            <div className="w-full bg-[#f97316]/80 rounded-t-sm h-18 shadow-[0_0_10px_rgba(249,115,22,0.2)]" />
                                            <span className="text-[7px] font-black text-slate-500 mt-1">D</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="border-t border-white/5 pt-3 mt-4 flex justify-between items-center text-[9px] font-black text-slate-550 uppercase">
                                    <span>Scale Monitor</span>
                                    <span className="text-emerald-400">+14% Growth</span>
                                </div>
                            </div>

                            {/* Column 2 & 3: Large Central Dark-themed Geo-Tracking Map */}
                            <div className="xl:col-span-2 bg-[#060b16]/70 border border-white/5 rounded-2xl overflow-hidden relative min-h-[350px]">
                                {/* Animated Grid-Map backdrop */}
                                <div className="absolute inset-0 map-bg-pattern opacity-10" />
                                
                                {/* Live Telemetry Visual SVG */}
                                <svg className="absolute inset-0 w-full h-full p-4" viewBox="0 0 500 350" xmlns="http://www.w3.org/2000/svg">
                                    {/* Road network paths */}
                                    <path d="M 20 50 L 480 50 M 20 180 L 480 180 M 20 300 L 480 300 M 100 20 L 100 330 M 250 20 L 250 330 M 400 20 L 400 330" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1.5" />
                                    
                                    {/* Dispatch Route animated lines */}
                                    <path d="M 100 180 Q 250 50 250 180 T 400 300" fill="none" stroke="url(#cyanGlowGrad)" strokeWidth="3" className="route-path-solid-draw" strokeLinecap="round" />
                                    <path d="M 100 180 Q 250 50 250 180 T 400 300" fill="none" stroke="#f97316" strokeWidth="2.5" strokeDasharray="10 5" className="route-path-draw" strokeLinecap="round" />

                                    <defs>
                                        <linearGradient id="cyanGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#06b6d4" />
                                            <stop offset="100%" stopColor="#0891b2" />
                                        </linearGradient>
                                    </defs>

                                    {/* Live Location markers with radar pings */}
                                    <g transform="translate(100, 180)">
                                        <circle cx="0" cy="0" r="10" fill="none" stroke="#f97316" strokeWidth="1.5" className="location-ping" />
                                        <circle cx="0" cy="0" r="4.5" fill="#f97316" />
                                    </g>
                                    <g transform="translate(250, 180)">
                                        <circle cx="0" cy="0" r="10" fill="none" stroke="#06b6d4" strokeWidth="1.5" className="location-ping" style={{ animationDelay: '0.8s' }} />
                                        <circle cx="0" cy="0" r="4.5" fill="#06b6d4" />
                                    </g>
                                    <g transform="translate(325, 240)">
                                        <circle cx="0" cy="0" r="10" fill="none" stroke="#f97316" strokeWidth="1.5" className="location-ping" style={{ animationDelay: '1.4s' }} />
                                        <circle cx="0" cy="0" r="4.5" fill="#f97316" />
                                    </g>
                                </svg>

                                {/* Floating HUD elements */}
                                <div className="absolute top-4 left-4 bg-slate-950/85 backdrop-blur border border-white/5 rounded-xl p-3 flex items-center gap-3">
                                    <Navigation size={14} className="text-[#06b6d4] animate-bounce" />
                                    <div>
                                        <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Active Dispatch Node</span>
                                        <span className="block text-[10px] font-bold text-white mt-0.5">Route #044-HQ</span>
                                    </div>
                                </div>

                                <div className="absolute bottom-4 right-4 bg-slate-950/85 backdrop-blur border border-white/5 rounded-xl p-3 flex items-center gap-3 select-none">
                                    <Map size={14} className="text-[#f97316]" />
                                    <div>
                                        <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Map Telemetry</span>
                                        <span className="block text-[10px] font-bold text-white mt-0.5">Live Agent Routing</span>
                                    </div>
                                </div>
                            </div>

                            {/* Column 4: Dispatch Queue & AI Insights (Right Side) */}
                            <div className="xl:col-span-1 bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                                <div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-3.5">Dispatch Queue</span>
                                    
                                    {/* Operations active queue list */}
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between p-2.5 bg-[#060b16]/70 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] pulse-indicator" />
                                                <span className="text-[10px] font-bold text-white">Agent #09</span>
                                            </div>
                                            <span className="text-[8px] font-black uppercase text-[#06b6d4] bg-[#06b6d4]/10 px-1.5 py-0.5 rounded">En Route</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2.5 bg-[#060b16]/70 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] pulse-indicator" />
                                                <span className="text-[10px] font-bold text-white">Agent #14</span>
                                            </div>
                                            <span className="text-[8px] font-black uppercase text-[#f97316] bg-[#f97316]/10 px-1.5 py-0.5 rounded">Dwell Alert</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2.5 bg-[#060b16]/70 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                <span className="text-[10px] font-bold text-white">Agent #02</span>
                                            </div>
                                            <span className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-950/20 px-1.5 py-0.5 rounded">Completed</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Text feed: AI Insights */}
                                <div className="mt-6 border-t border-white/5 pt-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap size={11} className="text-[#06b6d4]" />
                                        <span className="text-[9px] font-bold text-slate-350 uppercase tracking-widest">Truforce AI Insights</span>
                                    </div>
                                    <div className="bg-[#060b16]/60 rounded-xl p-3 border border-white/5 text-[9.5px] font-semibold text-slate-400 leading-normal">
                                        Performance in Department A is on track for Q3 goals. Immediate optimization opportunity: Cross-training for sales tools recommended for Team Gamma.
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>
                </section>
            </div>

            {/* ======================================================== */}
            {/* 📱 MOBILE VIEW: MINIMAL GLASSMOBILE LOGIN SCREEN */}
            {/* ======================================================== */}
            <div className="lg:hidden min-h-screen w-full mockup-mobile-bg flex flex-col justify-between p-6 relative font-sans">
                
                {/* Backdrop blur overlay */}
                <div className="absolute inset-0 backdrop-blur-[3.5px] pointer-events-none z-0" />

                {/* Top header Logo & Branding */}
                <div className="flex flex-col items-center pt-8 select-none relative z-10">
                    {/* Thunderbolt T Logo */}
                    <div className="flex items-center gap-2 mb-3">
                        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" stroke="white" />
                        </svg>
                        <span className="text-2xl font-black tracking-tight text-white select-none">
                            Truf<span className="inline-flex items-center justify-center bg-[#06b6d4] text-white w-4.5 h-4.5 rounded-full text-[8px] font-black mx-0.5 align-middle relative top-[-1px]"><Zap size={9} fill="white" className="stroke-none" /></span>rce
                        </span>
                    </div>
                    <h2 className="text-[20px] font-extrabold text-white tracking-tight drop-shadow-md animate-in slide-in-from-top duration-300">
                        {authMode === "login" ? "Welcome Back" : "Create Account"}
                    </h2>
                    <p className="text-slate-300 text-xs font-semibold mt-1 select-none animate-in fade-in duration-300">
                        {authMode === "login" ? "Access your Truforce hub." : "Get started with your operations workspace"}
                    </p>
                </div>

                {/* Form Fields & Primary Action */}
                <div className="w-full max-w-sm mx-auto my-auto space-y-5 relative z-10 pt-6">


                    {authMode === "login" ? (
                        <form onSubmit={handleLogin} className="space-y-4 font-sans" autoComplete="off">
                            {/* Email Input Field */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-300 mb-1.5 pl-1 select-none">
                                    Work Email
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#06b6d4] transition-colors z-10">
                                        <Mail size={16} />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="off"
                                        placeholder="admin@truforce.com"
                                        className="w-full pl-11 pr-4 py-3.5 glass-input-mockup focus:outline-none placeholder-slate-500 text-xs focus:ring-1 focus:ring-[#06b6d4]"
                                    />
                                </div>
                            </div>

                            {/* Password Input Field */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-300 mb-1.5 pl-1 select-none">
                                    Password
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#06b6d4] transition-colors z-10">
                                        <Lock size={16} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                        placeholder="••••••••"
                                        className="w-full pl-11 pr-12 py-3.5 glass-input-mockup focus:outline-none placeholder-slate-500 text-xs focus:ring-1 focus:ring-[#06b6d4]"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(!showPassword)} 
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-200 transition-colors focus:outline-none cursor-pointer z-10"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Biometrics quick access */}
                            <div className="flex flex-col items-center justify-center pt-3 select-none">
                                <button
                                    type="button"
                                    onClick={handleBiometricLogin}
                                    className="relative w-16 h-16 rounded-full bg-[#082f49]/35 border border-[#06b6d4]/30 flex items-center justify-center text-[#06b6d4] hover:text-white hover:border-[#06b6d4] hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg group"
                                >
                                    <Fingerprint size={28} className="relative z-10" />
                                    {!loading && (
                                        <div className="absolute inset-0 bg-[#06b6d4]/10 rounded-full biometric-ripple-cyan opacity-40 pointer-events-none" />
                                    )}
                                </button>
                            </div>

                            {/* Primary Action Button: Connect */}
                            <button 
                                type="submit" 
                                disabled={loading} 
                                className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-white font-extrabold py-3.5 rounded-full transition-all duration-305 flex items-center justify-center gap-2 mt-4 text-xs cursor-pointer shadow-lg shadow-cyan-500/20 uppercase tracking-wider text-center"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Authorizing...</span>
                                    </>
                                ) : (
                                    <span>Secure Login</span>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} className="space-y-4" autoComplete="off">
                            {/* Full Name */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-300 mb-1.5 pl-1 select-none">
                                    Full Name
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#06b6d4] transition-colors z-10">
                                        <UserIcon size={16} />
                                    </div>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        placeholder="Full Name"
                                        className="w-full pl-11 pr-4 py-3 glass-input-mockup focus:outline-none text-xs focus:ring-1 focus:ring-[#06b6d4]"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-300 mb-1.5 pl-1 select-none">
                                    Work Email
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#06b6d4] transition-colors z-10">
                                        <Mail size={16} />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="admin@truforce.com"
                                        className="w-full pl-11 pr-4 py-3 glass-input-mockup focus:outline-none text-xs focus:ring-1 focus:ring-[#06b6d4]"
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-300 mb-1.5 pl-1 select-none">
                                    Phone Number
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#06b6d4] transition-colors z-10">
                                        <Phone size={16} />
                                    </div>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        required
                                        placeholder="Phone Number"
                                        className="w-full pl-11 pr-4 py-3 glass-input-mockup focus:outline-none text-xs focus:ring-1 focus:ring-[#06b6d4]"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-300 mb-1.5 pl-1 select-none">
                                    Password
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#06b6d4] transition-colors z-10">
                                        <Lock size={16} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder="Password"
                                        className="w-full pl-11 pr-12 py-3 glass-input-mockup focus:outline-none text-xs focus:ring-1 focus:ring-[#06b6d4]"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(!showPassword)} 
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-200 transition-colors focus:outline-none cursor-pointer z-10"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Primary Action Button: Connect */}
                            <button 
                                type="submit" 
                                disabled={loading || !roleId} 
                                className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-white font-extrabold py-3.5 rounded-full transition-all duration-305 flex items-center justify-center gap-2 mt-4 text-xs cursor-pointer shadow-lg shadow-cyan-500/20"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Creating Account...</span>
                                    </>
                                ) : (
                                    <span>Register Hub</span>
                                )}
                            </button>
                        </form>
                    )}

                    {authMode === "login" && (
                        <div className="text-center pt-2">
                            <button 
                                type="button"
                                onClick={() => {
                                    setError("");
                                    setSuccess("");
                                    setForgotEmail("");
                                    setResetOtp("");
                                    setNewPassword("");
                                    setForgotStep(1);
                                    setShowForgotPassword(true);
                                }}
                                className="text-xs text-[#06b6d4] font-bold hover:text-cyan-400 transition-colors tracking-wide select-none cursor-pointer"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    )}
                </div>

                {/* Mode Switch Footer */}
                <div className="w-full max-w-sm mx-auto space-y-4 pt-6 border-t border-white/5 pb-4 relative z-10 text-center">
                    <p className="text-xs text-slate-400 font-semibold select-none">
                        {authMode === "login" ? (
                            <>
                                Don't have an account?{" "}
                                <button 
                                    type="button"
                                    onClick={() => toggleAuthMode("register")}
                                    className="text-white hover:underline font-bold ml-1 cursor-pointer focus:outline-none"
                                >
                                    Sign Up.
                                </button>
                            </>
                        ) : (
                            <>
                                Already have an account?{" "}
                                <button 
                                    type="button"
                                    onClick={() => toggleAuthMode("login")}
                                    className="text-white hover:underline font-bold ml-1 cursor-pointer focus:outline-none"
                                >
                                    Log In.
                                </button>
                            </>
                        )}
                    </p>
                    <div className="text-[10px] font-bold text-slate-500 tracking-wider uppercase select-none">
                        © {new Date().getFullYear()} TruForce CRM
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* 🚪 ADMIN LOGIN / REGISTER MODAL: FOR DESKTOP LANDING PAGE */}
            {/* ======================================================== */}
            {showLoginModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="w-full max-w-md glass-panel-cyan rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
                        
                        {/* Close Button */}
                        <button 
                            onClick={() => {
                                setError("");
                                setSuccess("");
                                setShowLoginModal(false);
                            }}
                            className="absolute top-4 right-4 p-2 bg-[#050c0a] hover:bg-[#082f49] text-slate-400 hover:text-white rounded-xl border border-white/5 transition-all cursor-pointer"
                        >
                            <X size={16} />
                        </button>

                        <div className="flex flex-col items-center mb-6">
                            <div className="bg-gradient-to-br from-[#082f49] to-[#f97316]/20 p-3 rounded-2xl shadow-lg border border-[#06b6d4]/40 mb-3 ring-1 ring-white/10 animate-float">
                                <Shield size={24} className="text-[#06b6d4]" strokeWidth={2.5} />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-serif font-black text-white tracking-tight">
                                {authMode === "login" ? "Administrator Access" : "Create Account"}
                            </h2>
                            <p className="text-slate-400 mt-1.5 text-xs font-semibold tracking-wide text-center">
                                {authMode === "login" ? "Authenticate to unlock command dashboard" : "Register to access the operations suite"}
                            </p>
                        </div>



                        {authMode === "login" ? (
                            <>
                                {/* Tabs */}
                                <div className="flex bg-[#050c0a] p-1 rounded-xl border border-white/5 mb-6 select-none">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setError("");
                                            setActiveTab("password");
                                        }}
                                        className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${activeTab === "password" ? "bg-[#06b6d4] text-[#060b16] shadow-md animate-in fade-in" : "text-slate-400 hover:text-slate-200"}`}
                                    >
                                        Credentials
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setError("");
                                            setActiveTab("biometric");
                                        }}
                                        className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${activeTab === "biometric" ? "bg-[#06b6d4] text-[#060b16] shadow-md animate-in fade-in" : "text-slate-400 hover:text-slate-200"}`}
                                    >
                                        Biometric Key
                                    </button>
                                </div>

                                {activeTab === "password" ? (
                                    <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 pl-1 select-none">
                                                Email Address
                                            </label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-550 group-focus-within:text-[#06b6d4] transition-colors">
                                                    <Mail size={16} />
                                                </div>
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    required
                                                    placeholder="admin@truforce.com"
                                                    className="w-full pl-11 pr-4 py-3 bg-[#050c0a] border border-white/5 rounded-xl focus:outline-none focus:border-[#06b6d4] transition-all text-slate-100 font-semibold placeholder-slate-650 smooth-input shadow-inner text-xs focus:ring-1 focus:ring-[#06b6d4]"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 pl-1 select-none">
                                                Password
                                            </label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-555 group-focus-within:text-[#06b6d4] transition-colors">
                                                    <Lock size={16} />
                                                </div>
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    required
                                                    placeholder="••••••••"
                                                    className="w-full pl-11 pr-12 py-3 bg-[#050c0a] border border-white/5 rounded-xl focus:outline-none focus:border-[#06b6d4] transition-all text-slate-100 font-semibold placeholder-slate-650 smooth-input shadow-inner text-xs focus:ring-1 focus:ring-[#06b6d4]"
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => setShowPassword(!showPassword)} 
                                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-550 hover:text-slate-200 transition-colors focus:outline-none cursor-pointer"
                                                >
                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pl-1 select-none">
                                            <label className="flex items-center gap-2.5 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={registerBio}
                                                    onChange={(e) => setRegisterBio(e.target.checked)}
                                                    className="w-4.5 h-4.5 rounded bg-slate-955 border-slate-850 text-[#06b6d4] focus:ring-[#06b6d4] cursor-pointer"
                                                />
                                                <span className="text-[11px] text-slate-400 font-semibold hover:text-slate-350">
                                                    Register biometrics
                                                </span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setError("");
                                                    setSuccess("");
                                                    setForgotEmail("");
                                                    setResetOtp("");
                                                    setNewPassword("");
                                                    setForgotStep(1);
                                                    setShowForgotPassword(true);
                                                }}
                                                className="text-[11px] text-[#06b6d4] hover:text-[#22d3ee] font-semibold transition-colors cursor-pointer focus:outline-none"
                                            >
                                                Forgot?
                                            </button>
                                        </div>

                                        <button 
                                            type="submit" 
                                            disabled={loading} 
                                            className="w-full btn-cyan-glow font-extrabold py-3.5 rounded-xl transition-all duration-300 active:scale-98 flex items-center justify-center gap-2 mt-2 disabled:from-slate-850 disabled:cursor-not-allowed cursor-pointer text-xs uppercase tracking-widest"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    <span>Authorizing...</span>
                                                </>
                                            ) : (
                                                <span>Sign In</span>
                                            )}
                                        </button>
                                    </form>
                                ) : (
                                    <div className="space-y-6 text-center py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex flex-col items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={handleBiometricLogin}
                                                disabled={loading}
                                                className="relative w-20 h-20 rounded-full bg-[#082f49]/40 border border-[#06b6d4]/40 flex items-center justify-center text-[#06b6d4] hover:text-white hover:border-[#06b6d4] hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg group"
                                            >
                                                <Fingerprint size={36} className="relative z-10 transition-transform group-hover:scale-110" />
                                                {!loading && (
                                                    <div className="absolute inset-0 bg-[#06b6d4]/10 rounded-full biometric-ripple-cyan opacity-35 pointer-events-none" />
                                                )}
                                            </button>
                                            <h3 className="text-sm font-bold text-slate-205 mt-4">Security Key Access</h3>
                                            <p className="text-xs text-slate-500 font-semibold mt-1.5 max-w-[260px] mx-auto leading-relaxed">
                                                Authenticate using your secure local hardware via Touch ID, Face ID, or Windows Hello.
                                            </p>
                                        </div>

                                        <button 
                                            type="button" 
                                            onClick={handleBiometricLogin}
                                            disabled={loading}
                                            className="w-full btn-cyan-glow font-extrabold py-3.5 rounded-xl transition-all duration-300 active:scale-98 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    <span>Scanning hardware...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Shield size={14} className="text-[#060b16] shrink-0" />
                                                    <span>Scan Hardware Key</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {/* Switch to Register link */}
                                <div className="mt-6 text-center border-t border-[#1b3a2b]/20 pt-5 select-none">
                                    <p className="text-xs text-slate-400 font-bold tracking-wide">
                                        New to TruForce? 
                                        <button 
                                            onClick={() => toggleAuthMode("register")}
                                            className="text-[#06b6d4] hover:text-[#22d3ee] hover:underline font-extrabold transition-colors ml-1 cursor-pointer focus:outline-none"
                                        >
                                            Create Account
                                        </button>
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Register Form inside Modal */}
                                <form onSubmit={handleRegister} className="space-y-4" autoComplete="off">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 pl-1 select-none">
                                            Full Name
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-550 group-focus-within:text-[#06b6d4] transition-colors">
                                                <UserIcon size={16} />
                                            </div>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                                placeholder="Full Name"
                                                className="w-full pl-11 pr-4 py-3 bg-[#050c0a] border border-white/5 rounded-xl focus:outline-none focus:border-[#06b6d4] transition-all text-slate-100 font-semibold placeholder-slate-650 smooth-input shadow-inner text-xs focus:ring-1 focus:ring-[#06b6d4]"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 pl-1 select-none">
                                            Email Address
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-555 group-focus-within:text-[#06b6d4] transition-colors">
                                                <Mail size={16} />
                                            </div>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                placeholder="admin@truforce.com"
                                                className="w-full pl-11 pr-4 py-3 bg-[#050c0a] border border-white/5 rounded-xl focus:outline-none focus:border-[#06b6d4] transition-all text-slate-100 font-semibold placeholder-slate-655 smooth-input shadow-inner text-xs focus:ring-1 focus:ring-[#06b6d4]"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 pl-1 select-none">
                                            Phone Number
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-555 group-focus-within:text-[#06b6d4] transition-colors">
                                                <Phone size={16} />
                                            </div>
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                required
                                                placeholder="Phone Number"
                                                className="w-full pl-11 pr-4 py-3 bg-[#050c0a] border border-white/5 rounded-xl focus:outline-none focus:border-[#06b6d4] transition-all text-slate-105 font-semibold placeholder-slate-655 smooth-input shadow-inner text-xs focus:ring-1 focus:ring-[#06b6d4]"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 pl-1 select-none">
                                            Password
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-555 group-focus-within:text-[#06b6d4] transition-colors">
                                                <Lock size={16} />
                                            </div>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                placeholder="Password"
                                                className="w-full pl-11 pr-12 py-3 bg-[#050c0a] border border-white/5 rounded-xl focus:outline-none focus:border-[#06b6d4] transition-all text-slate-100 font-semibold placeholder-slate-655 smooth-input shadow-inner text-xs focus:ring-1 focus:ring-[#06b6d4]"
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

                                    <button 
                                        type="submit" 
                                        disabled={loading || !roleId} 
                                        className="w-full btn-cyan-glow font-extrabold py-3.5 rounded-xl transition-all duration-305 flex items-center justify-center gap-2 mt-4 disabled:from-slate-850 disabled:cursor-not-allowed cursor-pointer text-xs uppercase tracking-widest"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                <span>Registering Hub...</span>
                                            </>
                                        ) : (
                                            <span>Create Account</span>
                                        )}
                                    </button>
                                </form>

                                {/* Switch to Login link */}
                                <div className="mt-6 text-center border-t border-white/5 pt-5 select-none">
                                    <p className="text-xs text-slate-400 font-bold tracking-wide">
                                        Already have an account? 
                                        <button 
                                            onClick={() => toggleAuthMode("login")}
                                            className="text-[#06b6d4] hover:text-[#22d3ee] hover:underline font-extrabold transition-colors ml-1 cursor-pointer focus:outline-none"
                                        >
                                            Log In
                                        </button>
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* 🔑 FORGOT PASSWORD OVERLAY MODAL */}
            {showForgotPassword && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-250">
                    <div className="w-full max-w-md glass-panel-cyan rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10 animate-in zoom-in-95 duration-250 border border-white/10 text-left">
                        {/* Close Button */}
                        <button 
                            onClick={() => {
                                setError("");
                                setSuccess("");
                                setShowForgotPassword(false);
                            }}
                            className="absolute top-4 right-4 p-2 bg-[#050c0a] hover:bg-[#082f49] text-slate-400 hover:text-white rounded-xl border border-white/5 transition-all cursor-pointer"
                        >
                            <X size={16} />
                        </button>

                        <div className="flex flex-col items-center mb-6">
                            <div className="bg-gradient-to-br from-[#082f49] to-[#f97316]/20 p-3 rounded-2xl shadow-lg border border-[#06b6d4]/40 mb-3 ring-1 ring-white/10">
                                <Lock size={24} className="text-[#06b6d4]" strokeWidth={2.5} />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-serif font-black text-white tracking-tight text-center">
                                Password Recovery
                            </h2>
                            <p className="text-slate-400 mt-1.5 text-xs font-semibold tracking-wide text-center">
                                {forgotStep === 1 ? "Enter your email to receive a password reset OTP" : "Enter the verification code & your new password"}
                            </p>
                        </div>

                        {forgotStep === 1 ? (
                            <form onSubmit={handleRequestForgotPassword} className="space-y-5" autoComplete="off">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 pl-1 select-none">
                                        Work Email
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-555 group-focus-within:text-[#06b6d4] transition-colors">
                                            <Mail size={16} />
                                        </div>
                                        <input
                                            type="email"
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                            required
                                            placeholder="admin@truforce.com"
                                            className="w-full pl-11 pr-4 py-3 bg-[#050c0a] border border-white/5 rounded-xl focus:outline-none focus:border-[#06b6d4] transition-all text-slate-100 font-semibold placeholder-slate-650 smooth-input shadow-inner text-xs focus:ring-1 focus:ring-[#06b6d4]"
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={loading} 
                                    className="w-full btn-cyan-glow font-extrabold py-3.5 rounded-xl transition-all duration-300 active:scale-98 flex items-center justify-center gap-2 mt-2 disabled:from-slate-850 cursor-pointer text-xs uppercase tracking-widest"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Sending Code...</span>
                                        </>
                                    ) : (
                                        <span>Request OTP</span>
                                    )}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOtpAndResetPassword} className="space-y-4" autoComplete="off">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 pl-1 select-none">
                                        Verification OTP
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-555 group-focus-within:text-[#06b6d4] transition-colors">
                                            <Shield size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            value={resetOtp}
                                            onChange={(e) => setResetOtp(e.target.value)}
                                            required
                                            placeholder="6-digit OTP code"
                                            className="w-full pl-11 pr-4 py-3 bg-[#050c0a] border border-white/5 rounded-xl focus:outline-none focus:border-[#06b6d4] transition-all text-slate-100 font-semibold placeholder-slate-650 smooth-input shadow-inner text-xs focus:ring-1 focus:ring-[#06b6d4] text-center tracking-widest"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 pl-1 select-none">
                                        New Secure Password
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-555 group-focus-within:text-[#06b6d4] transition-colors">
                                            <Lock size={16} />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            placeholder="••••••••"
                                            className="w-full pl-11 pr-12 py-3 bg-[#050c0a] border border-white/5 rounded-xl focus:outline-none focus:border-[#06b6d4] transition-all text-slate-100 font-semibold placeholder-slate-650 smooth-input shadow-inner text-xs focus:ring-1 focus:ring-[#06b6d4]"
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

                                <button 
                                    type="submit" 
                                    disabled={loading} 
                                    className="w-full btn-cyan-glow font-extrabold py-3.5 rounded-xl transition-all duration-300 active:scale-98 flex items-center justify-center gap-2 mt-4 disabled:from-slate-850 cursor-pointer text-xs uppercase tracking-widest"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Resetting Password...</span>
                                        </>
                                    ) : (
                                        <span>Reset & Verify</span>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* 🛡️ MFA CODE CHALLENGE OVERLAY MODAL */}
            {showMfaChallenge && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-250">
                    <div className="w-full max-w-md glass-panel-cyan rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10 animate-in zoom-in-95 duration-250 border border-white/10 text-left">
                        {/* Cancel / Close Button */}
                        <button 
                            onClick={() => {
                                setError("");
                                setSuccess("");
                                setMfaOtp("");
                                setShowMfaChallenge(false);
                            }}
                            className="absolute top-4 right-4 p-2 bg-[#050c0a] hover:bg-[#082f49] text-slate-400 hover:text-white rounded-xl border border-white/5 transition-all cursor-pointer"
                        >
                            <X size={16} />
                        </button>

                        <div className="flex flex-col items-center mb-6">
                            <div className="bg-gradient-to-br from-[#082f49] to-[#06b6d4]/20 p-3 rounded-2xl shadow-lg border border-[#06b6d4]/40 mb-3 ring-1 ring-white/10">
                                <Shield size={24} className="text-[#06b6d4]" strokeWidth={2.5} />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-serif font-black text-white tracking-tight text-center">
                                Two-Factor Verification
                            </h2>
                            <p className="text-slate-400 mt-1.5 text-xs font-semibold tracking-wide text-center leading-relaxed max-w-[320px]">
                                A 6-digit verification code has been dispatched to <b>{mfaEmail}</b>. Please input it below to complete login authorization.
                            </p>
                        </div>

                        <form onSubmit={handleVerify2fa} className="space-y-5" autoComplete="off">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 pl-1 select-none text-center">
                                    Verification Code
                                </label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        maxLength="6"
                                        value={mfaOtp}
                                        onChange={(e) => setMfaOtp(e.target.value)}
                                        required
                                        placeholder="0 0 0 0 0 0"
                                        className="w-full py-4 bg-[#050c0a] border border-white/5 rounded-xl focus:outline-none focus:border-[#06b6d4] transition-all text-slate-105 font-black placeholder-slate-700 smooth-input shadow-inner text-xl text-center tracking-[12px] sm:tracking-[18px] focus:ring-1 focus:ring-[#06b6d4]"
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading || mfaOtp.length < 6} 
                                className="w-full btn-cyan-glow font-extrabold py-3.5 rounded-xl transition-all duration-300 active:scale-98 flex items-center justify-center gap-2 mt-2 disabled:from-slate-850 disabled:cursor-not-allowed cursor-pointer text-xs uppercase tracking-widest"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Authorizing Code...</span>
                                    </>
                                ) : (
                                    <span>Verify & Unlock</span>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}