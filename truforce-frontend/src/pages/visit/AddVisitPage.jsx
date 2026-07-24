import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, UserPlus, Users, CheckCircle2, Loader2, ArrowLeft, ChevronLeft, Building2, User, Phone, Mail, Map, Navigation2, FileText, Briefcase, Camera, Image, Mic } from 'lucide-react';
import api from "../../api/axios";
import { saveOfflineVisit } from "../../utils/offlineSync";

export default function AddVisitPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const editData = location.state?.editData;
    const userId = localStorage.getItem("userId");

    const [loading, setLoading] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState(editData ? editData.customerId : "");
    const [geofenceError, setGeofenceError] = useState(null);
    const [isListening, setIsListening] = useState(false);

    const fileInputRef = useRef(null);
    const recognitionRef = useRef(null);

    const [newCustomer, setNewCustomer] = useState({
        name: "",
        phone: "",
        email: "",
        city: "",
        address: "",
        contactPerson: "",
        state: ""
    });

    const [visitDetails, setVisitDetails] = useState({
        purpose: editData ? editData.purpose || "Sales Pitch" : "Sales Pitch",
        notes: editData ? editData.notes || "" : "",
        status: editData ? editData.status || "COMPLETED" : "COMPLETED",
        photoUrl: editData ? editData.photoUrl || "" : ""
    });

    async function loadCustomers() {
        try {
            const res = await api.get("/customers");
            setCustomers(res.data?.data || res.data || []);
        } catch (error) {
            console.error("Failed to load customers", error);
        }
    }

    useEffect(() => {
        const t = setTimeout(loadCustomers, 0);
        return () => clearTimeout(t);
    }, []);

    // Speech recognition setup (Voice-to-Text)
    const toggleSpeechToText = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition is not supported on this browser. Chrome or Safari is recommended.");
            return;
        }

        if (isListening) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            setIsListening(false);
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognitionRef.current = recognition;
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = "en-IN"; // English and local dictation support

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setVisitDetails(prev => ({
                    ...prev,
                    notes: prev.notes ? `${prev.notes} ${transcript}` : transcript
                }));
            };

            recognition.onerror = (err) => {
                console.error("Speech Recognition Error:", err);
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.start();
        } catch (err) {
            console.error("Failed to start Speech Recognition:", err);
            setIsListening(false);
        }
    };

    // Get current device coordinates for geofence verification
    const getCurrentCoords = () => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                console.warn("Geolocation not supported");
                resolve({ latitude: null, longitude: null });
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    resolve({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    });
                },
                (err) => {
                    console.error("GPS coords capture error:", err);
                    resolve({ latitude: null, longitude: null });
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        });
    };

    // Photo capturing and S3 upload handler
    const handlePhotoCapture = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingPhoto(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            console.log("📤 Uploading capture to S3 backend endpoint...");
            const res = await api.post("/s3/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });
            const url = res.data?.url || res.data?.photoUrl || res.data?.imageUrl || "";
            setVisitDetails(prev => ({ ...prev, photoUrl: url }));
            console.log("✅ Capture uploaded successfully:", url);
        } catch (err) {
            console.error("❌ Capture upload failed:", err.response?.data || err.message);
            alert("Failed to upload photo to S3 endpoint.");
        } finally {
            setUploadingPhoto(false);
        }
    };

    const triggerCamera = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setGeofenceError(null);

        // Build payloads
        let finalCustomerId = selectedCustomerId;
        let coords = { latitude: null, longitude: null };

        try {
            // Get location if online
            if (navigator.onLine) {
                coords = await getCurrentCoords();
            }

            // 1. Create customer if new customer is toggled (Only when online, offline mode requires existing customer select)
            if (isNewCustomer && !editData) {
                if (!navigator.onLine) {
                    alert("📶 Creating a new customer requires internet connectivity. Please select an existing client when offline.");
                    setLoading(false);
                    return;
                }

                const customerPayload = {
                    name: newCustomer.name,
                    phone: newCustomer.phone,
                    email: newCustomer.email,
                    city: newCustomer.city,
                    address: newCustomer.address,
                    contactPerson: newCustomer.contactPerson,
                    state: newCustomer.state,
                    createdBy: userId
                };

                const customerRes = await api.post("/customers", customerPayload);
                finalCustomerId = customerRes.data?.data?.id || customerRes.data?.id;
            }

            const visitPayload = {
                customerId: finalCustomerId,
                checkinLat: coords.latitude || 0.0,
                checkinLng: coords.longitude || 0.0,
                notes: visitDetails.notes
            };

            // 📶 Offline-First Check: If offline, route payload to offline localStorage sync queue
            if (!navigator.onLine) {
                console.log("📶 Device is Offline: Redirecting visit save to offline queue...");
                saveOfflineVisit(visitPayload);
                alert("📶 Offline Mode: Visit check-in saved locally on your device. It will automatically sync to backend CRM once internet restores!");
                navigate("/visits");
                return;
            }

            if (editData) {
                await api.post("/visits/checkin", visitPayload);
                alert("Visit Checked In Successfully!");
            } else {
                await api.post("/visits/checkin", visitPayload);
                alert("Visit Logged Successfully!");
            }

            navigate("/visits");

        } catch (error) {
            console.error("Backend Error:", error.response?.data || error.message);
            const rawErrorMsg = error.response?.data?.message || error.response?.data?.error || error.message || "";
            
            // Check for geofence violation exception
            if (
                rawErrorMsg.includes("GeofenceViolationException") || 
                rawErrorMsg.toLowerCase().includes("geofence") || 
                error.response?.status === 400 && rawErrorMsg.toLowerCase().includes("range")
            ) {
                setGeofenceError("🚨 Geofence Violation: You are not within the allowed coordinates boundary of this client location. Check-in is blocked!");
                alert("🚨 Geofence Violation: You are not within the allowed geofence range of this customer's location! Check-in aborted.");
            } else if (!error.response) {
                // If it is a network error that bypassed navigator.onLine check
                console.log("📶 Network exception caught. Saving visit to offline queue...");
                const visitPayload = {
                    customerId: finalCustomerId,
                    userId: userId,
                    purpose: visitDetails.purpose,
                    notes: visitDetails.notes,
                    status: visitDetails.status,
                    visitDate: new Date().toISOString().split('T')[0],
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    photoUrl: visitDetails.photoUrl
                };
                saveOfflineVisit(visitPayload);
                alert("📶 Network Timeout: Visit check-in has been queued offline and will auto-sync once connectivity stabilizes!");
                navigate("/visits");
            } else {
                alert(rawErrorMsg || "Failed to log visit. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold placeholder:text-slate-405 text-xs shadow-inner";
    const labelClass = "block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1";

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-400">

            {/* HEADER PANEL */}
            <div className="flex items-center justify-between gap-5 mb-8 px-4 md:px-0">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight leading-tight">
                            {editData ? "Update Visit" : "Log Visit"}
                        </h1>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => navigate('/visits')}
                    className="bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                    Show Logs
                </button>
            </div>

            {geofenceError && (
                <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-600 p-4.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-sm animate-bounce">
                    <MapPin size={18} className="text-rose-500 shrink-0" />
                    <span>{geofenceError}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">

                {!editData && (
                    <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1.5 shadow-inner relative overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setIsNewCustomer(false)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black rounded-xl transition-all duration-300 cursor-pointer ${!isNewCustomer ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Users size={16} /> Existing Customer
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsNewCustomer(true)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black rounded-xl transition-all duration-300 cursor-pointer ${isNewCustomer ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <UserPlus size={16} /> New Customer
                        </button>
                    </div>
                )}

                {/* CUSTOMER CONFIGURATION SECTION */}
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/50 relative overflow-hidden">
                    <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-6 border-b border-slate-100 pb-3 flex items-center gap-2">
                        {isNewCustomer ? <Building2 size={15} className="text-indigo-600 animate-pulse" /> : <Users size={15} className="text-indigo-650" />}
                        {isNewCustomer ? "New Customer details" : "Select customer"}
                    </h2>

                    {!isNewCustomer ? (
                        <div>
                            <label className={labelClass}>Registered Customer</label>
                            <div className="relative">
                                <Building2 size={16} className="absolute left-4 top-3.5 text-slate-400" />
                                <select
                                    required
                                    disabled={!!editData}
                                    value={selectedCustomerId}
                                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                                    className={`${inputClass} pl-11 appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em] ${editData ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`}
                                    style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")` }}
                                >
                                    <option value="" disabled>-- Choose a registered customer --</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} - {c.city || c.phone}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5 animate-in fade-in slide-in-from-top-3 duration-300">
                            <div>
                                <label className={labelClass}>Company / Shop Name</label>
                                <div className="relative">
                                    <Building2 size={16} className="absolute left-4 top-3.5 text-slate-400" />
                                    <input
                                        type="text" required placeholder="Enter official name"
                                        value={newCustomer.name} onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                                        className={`${inputClass} pl-11`}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className={labelClass}>Contact Person</label>
                                    <div className="relative">
                                        <User size={16} className="absolute left-4 top-3.5 text-slate-400" />
                                        <input
                                            type="text" required placeholder="Manager/Owner Name"
                                            value={newCustomer.contactPerson} onChange={(e) => setNewCustomer({...newCustomer, contactPerson: e.target.value})}
                                            className={`${inputClass} pl-11`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Phone Number</label>
                                    <div className="relative">
                                        <Phone size={16} className="absolute left-4 top-3.5 text-slate-400" />
                                        <input
                                            type="tel" required placeholder="10-digit number"
                                            value={newCustomer.phone} onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                                            className={`${inputClass} pl-11`}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className={labelClass}>Email Address</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-4 top-3.5 text-slate-400" />
                                        <input
                                            type="email" required placeholder="example@mail.com"
                                            value={newCustomer.email} onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                                            className={`${inputClass} pl-11`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Full Address</label>
                                    <div className="relative">
                                        <MapPin size={16} className="absolute left-4 top-3.5 text-slate-400" />
                                        <input
                                            type="text" required placeholder="Shop No, Street, Area"
                                            value={newCustomer.address} onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                                            className={`${inputClass} pl-11`}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className={labelClass}>City</label>
                                    <div className="relative">
                                        <Navigation2 size={16} className="absolute left-4 top-3.5 text-slate-400" />
                                        <input
                                            type="text" required placeholder="Enter City"
                                            value={newCustomer.city} onChange={(e) => setNewCustomer({...newCustomer, city: e.target.value})}
                                            className={`${inputClass} pl-11`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>State</label>
                                    <div className="relative">
                                        <Map size={16} className="absolute left-4 top-3.5 text-slate-400" />
                                        <input
                                            type="text" required placeholder="Enter State"
                                            value={newCustomer.state} onChange={(e) => setNewCustomer({...newCustomer, state: e.target.value})}
                                            className={`${inputClass} pl-11`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* MEETING LOG PARAMETERS */}
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/50 relative overflow-hidden">
                    <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-6 border-b border-slate-100 pb-3 flex items-center gap-2">
                        <Briefcase size={15} className="text-indigo-650" /> Visit details
                    </h2>

                    <div className="space-y-5">
                        <div>
                            <label className={labelClass}>Purpose of Visit</label>
                            <select
                                value={visitDetails.purpose}
                                onChange={(e) => setVisitDetails({...visitDetails, purpose: e.target.value})}
                                className={`${inputClass} appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em]`}
                                style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")` }}
                            >
                                <option value="Sales Pitch">Sales Pitch 🎯</option>
                                <option value="Payment Collection">Payment Collection 💰</option>
                                <option value="Product Delivery">Product Delivery 📦</option>
                                <option value="General Meeting">General Meeting 🤝</option>
                            </select>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className={labelClass}>Meeting Notes / Summary</label>
                                <button
                                    type="button"
                                    onClick={toggleSpeechToText}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold border transition-all cursor-pointer ${
                                        isListening 
                                            ? 'bg-rose-50 border-rose-250 text-rose-600 animate-pulse shadow-sm shadow-rose-500/10' 
                                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                    }`}
                                >
                                    <Mic size={12} className={isListening ? 'text-rose-500' : 'text-slate-400'} />
                                    {isListening ? 'Listening...' : 'Voice Dictate'}
                                </button>
                            </div>
                            <div className="relative">
                                <FileText size={16} className="absolute left-4 top-3.5 text-slate-400" />
                                <textarea
                                    required rows="3"
                                    placeholder="Write a brief summary of the interaction outcome..."
                                    value={visitDetails.notes}
                                    onChange={(e) => setVisitDetails({...visitDetails, notes: e.target.value})}
                                    className={`${inputClass} pl-11 resize-none h-32 leading-relaxed`}
                                ></textarea>
                            </div>
                        </div>

                        {/* Capture Image Attachment */}
                        <div className="pt-2">
                            <label className={labelClass}>S3 Check-in image Attachment</label>
                            
                            <input 
                                type="file" 
                                accept="image/*" 
                                capture="environment" 
                                ref={fileInputRef}
                                onChange={handlePhotoCapture}
                                className="hidden"
                            />

                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <button
                                    type="button"
                                    onClick={triggerCamera}
                                    disabled={uploadingPhoto}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-5 py-3.5 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 shadow-sm"
                                >
                                    {uploadingPhoto ? (
                                        <Loader2 className="animate-spin w-4 h-4 text-slate-500" />
                                    ) : (
                                        <Camera size={14} className="text-slate-405" />
                                    )}
                                    Take Photo Capture
                                </button>

                                {visitDetails.photoUrl ? (
                                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-2.5 bg-slate-50 w-full sm:w-auto">
                                        <img 
                                            src={visitDetails.photoUrl} 
                                            alt="Visit Attachment Preview"
                                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-sm" 
                                        />
                                        <div className="flex-1 min-w-0 pr-2">
                                            <p className="text-[10px] font-bold text-slate-800 truncate max-w-[150px]">Check-in attachment</p>
                                            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide">Uploaded</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold">
                                        <Image size={14} />
                                        <span>No image capture attached yet.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || uploadingPhoto}
                    className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-all duration-200 bg-[#0f172a] hover:bg-slate-800 active:scale-[0.98] cursor-pointer shadow-md shadow-slate-900/10 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <><Loader2 className="animate-spin" size={15} /> Logging check-in...</>
                    ) : (
                        <><CheckCircle2 size={15} /> {editData ? 'Update Visit details' : 'Confirm Check-in & Log Visit'}</>
                    )}
                </button>

            </form>
        </div>
    );
}