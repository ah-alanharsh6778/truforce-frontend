import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    Search, Plus, Trash2, Navigation, Loader2, X, Route, AlertCircle,
    MapPin, Clock, Users, Compass, Map as MapIcon, ChevronDown, Battery, Signal, ChevronLeft
} from "lucide-react";
import { getAllLocations, createLocation, deleteLocation } from "../../features/tracking/trackingService";
import api from "../../api/axios";

// Helper function to calculate real distance between two GPS coordinates in KM
const getHaversineDistance = (p1, p2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (p2.latitude - p1.latitude) * Math.PI / 180;
    const dLng = (p2.longitude - p1.longitude) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(p1.latitude * Math.PI / 180) * Math.cos(p2.latitude * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export default function TrackingPage() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [open, setOpen] = useState(false);
    const [locations, setLocations] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [search, setSearch] = useState("");
    const [showSearch, setShowSearch] = useState(false);

    // Leaflet Integration States & Refs
    const [leafletLoaded, setLeafletLoaded] = useState(false);
    const [currentGpsCoords, setCurrentGpsCoords] = useState(null);
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersGroupRef = useRef(null);
    const polylineRef = useRef(null);

    const [isTrackingActive, setIsTrackingActive] = useState(() => localStorage.getItem("isTracking") === "true");

    const toggleTracking = () => {
        const nextState = !isTrackingActive;
        setIsTrackingActive(nextState);
        localStorage.setItem("isTracking", nextState ? "true" : "false");
        window.dispatchEvent(new Event("attendanceChanged"));
    };

    useEffect(() => {
        const syncState = () => {
            setIsTrackingActive(localStorage.getItem("isTracking") === "true");
        };
        window.addEventListener("attendanceChanged", syncState);
        return () => window.removeEventListener("attendanceChanged", syncState);
    }, []);

    const userRole = (localStorage.getItem("role") || "").toUpperCase();
    const isManager = userRole === "MANAGER" || userRole === "ADMIN";

    const [selectedUserId, setSelectedUserId] = useState(() => {
        const role = (localStorage.getItem("role") || "").toUpperCase();
        if (role === "EXECUTIVE") {
            return localStorage.getItem("userId") || "";
        }
        return "";
    });

    const [form, setForm] = useState({
        userId: localStorage.getItem("userId") || "",
        latitude: "",
        longitude: "",
    });

    const [selectedPoint, setSelectedPoint] = useState(null);

    // Fetch Location Logs and Customers from database
    const loadLocations = useCallback(async () => {
        try {
            const res = await getAllLocations();
            let rawLogs = [];
            if (Array.isArray(res)) {
                rawLogs = res;
            } else if (res && Array.isArray(res.data)) {
                rawLogs = res.data;
            } else if (res && res.data && Array.isArray(res.data.data)) {
                rawLogs = res.data.data;
            } else if (res && typeof res === "object") {
                rawLogs = res.content || res.list || [];
            }
            setLocations(rawLogs);
            setError(null);
            
            // Set default selected user if not set
            const role = (localStorage.getItem("role") || "").toUpperCase();
            if (role === "EXECUTIVE") {
                setSelectedUserId(localStorage.getItem("userId") || "");
            } else if (rawLogs.length > 0 && !selectedUserId) {
                const firstUser = rawLogs[0].userId || rawLogs[0].user_id;
                setSelectedUserId(firstUser);
            }

            // Load Customer positions
            try {
                const custRes = await api.get("/customers");
                const custBody = custRes.data;
                let rawCust = [];
                if (Array.isArray(custBody)) {
                    rawCust = custBody;
                } else if (custBody && Array.isArray(custBody.data)) {
                    rawCust = custBody.data;
                } else if (custBody && custBody.data && Array.isArray(custBody.data.data)) {
                    rawCust = custBody.data.data;
                }
                setCustomers(rawCust);
            } catch (custErr) {
                console.error("Failed to load customer list for tracking page:", custErr);
            }
        } catch (err) {
            console.error(err);
            setError("Failed to load database logs.");
        } finally {
            setIsLoading(false);
        }
    }, [selectedUserId]);

    useEffect(() => {
        const t = setTimeout(loadLocations, 0);
        return () => clearTimeout(t);
    }, [loadLocations]);

    // Real-Time HTML5 Geolocation Watcher
    useEffect(() => {
        if (!isTrackingActive) return;

        if (!navigator.geolocation) {
            setError("HTML5 Geolocation is not supported by your browser.");
            return;
        }

        const options = {
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 8000
        };

        const successHandler = async (pos) => {
            const { latitude, longitude } = pos.coords;
            setCurrentGpsCoords({ latitude, longitude });

            // Fetch battery telemetry
            let batteryLevel = 1.0;
            let charging = false;
            try {
                if (navigator.getBattery) {
                    const battery = await navigator.getBattery();
                    batteryLevel = battery.level;
                    charging = battery.charging;
                }
            } catch (e) {}

            try {
                await createLocation({
                    userId: localStorage.getItem("userId") || "system-executive",
                    latitude,
                    longitude,
                    batteryLevel,
                    batteryCharging: charging,
                    networkStatus: navigator.onLine ? "ONLINE" : "OFFLINE"
                });
                loadLocations();
            } catch (err) {
                console.error("Failed to post real-time Geolocation coordinate:", err);
            }
        };

        const errorHandler = (err) => {
            console.error("HTML5 Geolocation Error:", err);
            if (err.code === 1) {
                setError("GPS permission denied. Enable location access to sync route.");
            }
        };

        const watchId = navigator.geolocation.watchPosition(successHandler, errorHandler, options);
        return () => navigator.geolocation.clearWatch(watchId);
    }, [isTrackingActive, loadLocations]);

    // Get unique list of employees from tracking logs
    const employees = useMemo(() => {
        const uniqueEmployees = {};
        locations.forEach(loc => {
            const uid = loc.userId || loc.user_id;
            const name = loc.userName || "Unknown Employee";
            if (uid && !uniqueEmployees[uid]) {
                uniqueEmployees[uid] = { id: uid, name: name };
            }
        });
        return Object.values(uniqueEmployees);
    }, [locations]);

    // Filter locations for selected employee and project them onto visualizer metadata
    const projectedData = useMemo(() => {
        if (!selectedUserId) return { journey: [], customerMarkers: [] };
        
        let userLogs = locations
            .filter(loc => (loc.userId === selectedUserId || loc.user_id === selectedUserId))
            .sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));

        // Get coordinates of customers
        const customerCoordinates = customers.map(c => ({
            latitude: c.latitude || 0,
            longitude: c.longitude || 0,
            name: c.name,
            address: c.address || "",
            isCustomer: true
        })).filter(c => c.latitude !== 0 && c.longitude !== 0);

        const allPoints = [
            ...userLogs.map(p => ({ latitude: p.latitude, longitude: p.longitude })),
            ...customerCoordinates
        ];

        if (allPoints.length === 0) return { journey: [], customerMarkers: [] };

        const journey = userLogs.map((p, idx) => {
            const isLive = idx === userLogs.length - 1;
            return {
                id: p.id || idx,
                latitude: p.latitude,
                longitude: p.longitude,
                batteryLevel: p.batteryLevel,
                batteryCharging: p.batteryCharging,
                networkStatus: p.networkStatus,
                time: new Date(p.recordedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
                location: `GPS: ${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}`,
                status: isLive ? "Live" : "Moving",
                duration: idx === 0 ? "Start Point" : `Waypoint ${idx}`,
                contact: p.userName || "Field Employee",
                recordedAt: p.recordedAt
            };
        });

        const customerMarkers = customerCoordinates.map((c, idx) => ({
            id: `cust-${idx}`,
            name: c.name,
            latitude: c.latitude,
            longitude: c.longitude,
            location: c.name,
            address: c.address,
            isCustomer: true
        }));

        return { journey, customerMarkers };
    }, [locations, customers, selectedUserId]);

    const activeJourney = projectedData.journey;
    const customerMarkers = projectedData.customerMarkers;

    // Halt detection logic:
    const halts = useMemo(() => {
        if (activeJourney.length < 2) return [];
        const detectedHalts = [];
        let currentHaltGroup = [];

        for (let i = 0; i < activeJourney.length; i++) {
            const currentPoint = activeJourney[i];
            
            if (currentHaltGroup.length === 0) {
                currentHaltGroup.push(currentPoint);
            } else {
                const firstPoint = currentHaltGroup[0];
                const distance = getHaversineDistance(firstPoint, currentPoint);
                
                // If within 0.04 km (40 meters), group as halt candidates
                if (distance < 0.04) {
                    currentHaltGroup.push(currentPoint);
                } else {
                    // Process the completed halt group
                    if (currentHaltGroup.length >= 2) {
                        const tStart = new Date(currentHaltGroup[0].recordedAt);
                        const tEnd = new Date(currentHaltGroup[currentHaltGroup.length - 1].recordedAt);
                        const diffMins = Math.round((tEnd - tStart) / 60000);
                        
                        // Minimum halt threshold: 5 minutes
                        if (diffMins >= 5) {
                            detectedHalts.push({
                                id: `halt-${detectedHalts.length}`,
                                latitude: firstPoint.latitude,
                                longitude: firstPoint.longitude,
                                startTime: currentHaltGroup[0].time,
                                endTime: currentHaltGroup[currentHaltGroup.length - 1].time,
                                durationMins: diffMins,
                                pointCount: currentHaltGroup.length,
                                batteryLevel: firstPoint.batteryLevel,
                                networkStatus: firstPoint.networkStatus,
                                location: `Stopped for ${diffMins} mins at GPS: ${firstPoint.latitude.toFixed(5)}, ${firstPoint.longitude.toFixed(5)}`,
                                isHalt: true
                            });
                        }
                    }
                    currentHaltGroup = [currentPoint];
                }
            }
        }

        // Catch last group
        if (currentHaltGroup.length >= 2) {
            const firstPoint = currentHaltGroup[0];
            const tStart = new Date(currentHaltGroup[0].recordedAt);
            const tEnd = new Date(currentHaltGroup[currentHaltGroup.length - 1].recordedAt);
            const diffMins = Math.round((tEnd - tStart) / 60000);
            if (diffMins >= 5) {
                detectedHalts.push({
                    id: `halt-${detectedHalts.length}`,
                    latitude: firstPoint.latitude,
                    longitude: firstPoint.longitude,
                    startTime: currentHaltGroup[0].time,
                    endTime: currentHaltGroup[currentHaltGroup.length - 1].time,
                    durationMins: diffMins,
                    pointCount: currentHaltGroup.length,
                    batteryLevel: firstPoint.batteryLevel,
                    networkStatus: firstPoint.networkStatus,
                    location: `Stopped for ${diffMins} mins at GPS: ${firstPoint.latitude.toFixed(5)}, ${firstPoint.longitude.toFixed(5)}`,
                    isHalt: true
                });
            }
        }

        return detectedHalts;
    }, [activeJourney]);

    // Handle updating selected item tooltip
    useEffect(() => {
        Promise.resolve().then(() => {
            if (activeJourney.length > 0) {
                setSelectedPoint(activeJourney[activeJourney.length - 1]);
            } else {
                setSelectedPoint(null);
            }
        });
    }, [activeJourney]);

    // Real Statistics Calculation
    const totalDistanceStr = useMemo(() => {
        if (activeJourney.length < 2) return "0.0 KM";
        let dist = 0;
        for (let i = 1; i < activeJourney.length; i++) {
            dist += getHaversineDistance(activeJourney[i - 1], activeJourney[i]);
        }
        return `${dist.toFixed(2)} KM`;
    }, [activeJourney]);

    const activeShiftTimeStr = useMemo(() => {
        if (activeJourney.length < 2) return "0 mins";
        const tStart = new Date(activeJourney[0].recordedAt);
        const tEnd = new Date(activeJourney[activeJourney.length - 1].recordedAt);
        const diffMins = Math.round((tEnd - tStart) / 60000);
        if (diffMins >= 60) {
            return `${Math.floor(diffMins / 60)} hrs ${diffMins % 60} mins`;
        }
        return `${diffMins} mins`;
    }, [activeJourney]);

    // Form Handlers
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await createLocation({
                userId: form.userId,
                latitude: Number(form.latitude),
                longitude: Number(form.longitude),
            });

            setOpen(false);
            setForm({ userId: localStorage.getItem("userId") || "", latitude: "", longitude: "" });
            setIsLoading(true);
            await loadLocations();
        } catch (err) {
            console.error(err);
            alert("Failed to save location.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) return alert("Geolocation not supported by this browser.");
        navigator.geolocation.getCurrentPosition(
            (p) => {
                setForm((prev) => ({
                    ...prev,
                    latitude: p.coords.latitude.toString(),
                    longitude: p.coords.longitude.toString()
                }));
            },
            () => alert("Permission denied. Could not fetch auto-detect coordinates.")
        );
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this coordinate log?")) return;
        try {
            await deleteLocation(id);
            setIsLoading(true);
            await loadLocations();
        } catch (err) {
            console.error(err);
            alert("Failed to delete log entry.");
        }
    };

    const openFullRoute = (targetUserId) => {
        const userLogs = locations
            .filter((loc) => loc.userId === targetUserId || loc.user_id === targetUserId)
            .sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));

        if (userLogs.length < 2) return alert("Not enough coordinate records to plot a direction.");

        const waypoints = userLogs.map((loc) => `${loc.latitude},${loc.longitude}`).join("|");
        const mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLogs[0].latitude},${userLogs[0].longitude}&destination=${userLogs[userLogs.length - 1].latitude},${userLogs[userLogs.length - 1].longitude}&waypoints=${waypoints}&travelmode=driving`;
        window.open(mapUrl, "_blank");
    };

    const handleMapFabClick = () => {
        const targetId = selectedUserId || localStorage.getItem("userId") || "";
        const userLogs = locations
            .filter((loc) => loc.userId === targetId || loc.user_id === targetId)
            .sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));

        if (userLogs.length > 0) {
            const latest = userLogs[userLogs.length - 1];
            if (userLogs.length >= 2) {
                openFullRoute(targetId);
            } else {
                window.open(`https://www.google.com/maps/search/?api=1&query=${latest.latitude},${latest.longitude}`, "_blank");
            }
        } else {
            window.open("https://www.google.com/maps", "_blank");
        }
    };

    // Filter location logs + apply 30-day mobile limit
    const filteredLocations = useMemo(() => {
        let list = locations.filter((item) =>
            item.userName?.toLowerCase().includes(search.toLowerCase())
        );

        // Mobile-only 30-day limit
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            thirtyDaysAgo.setHours(0, 0, 0, 0);

            list = list.filter(l => l.recordedAt && new Date(l.recordedAt) >= thirtyDaysAgo);
        }

        return list;
    }, [locations, search]);

    // Dynamic Leaflet Map Library Loader
    useEffect(() => {
        // Load Leaflet CSS
        if (!document.getElementById("leaflet-css")) {
            const link = document.createElement("link");
            link.id = "leaflet-css";
            link.rel = "stylesheet";
            link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
            document.head.appendChild(link);
        }
        // Load Leaflet JS
        if (!document.getElementById("leaflet-js")) {
            const script = document.createElement("script");
            script.id = "leaflet-js";
            script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
            script.async = true;
            script.onload = () => setLeafletLoaded(true);
            document.head.appendChild(script);
        } else {
            setLeafletLoaded(true);
        }
    }, []);

    // Update real Leaflet Map layer
    useEffect(() => {
        if (!leafletLoaded || !window.L || !mapContainerRef.current) return;

        const L = window.L;

        // Initialize Map once
        if (!mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current, {
                zoomControl: true,
                scrollWheelZoom: true
            }).setView([20.5937, 78.9629], 5);

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(mapRef.current);

            markersGroupRef.current = L.featureGroup().addTo(mapRef.current);
        }

        const map = mapRef.current;
        const markersGroup = markersGroupRef.current;
        markersGroup.clearLayers();

        // Custom Leaflet DivIcons to prevent asset url loading problems
        const employeeIcon = L.divIcon({
            html: `<div class="w-8 h-8 rounded-full bg-indigo-600 border-2 border-white flex items-center justify-center shadow-lg"><span class="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span></div>`,
            className: "custom-leaflet-marker",
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const customerIcon = L.divIcon({
            html: `<div class="w-8 h-8 rounded-xl bg-teal-600 border-2 border-white flex items-center justify-center shadow-lg text-white flex shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="mx-auto my-auto"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
            className: "custom-leaflet-marker",
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const haltIcon = L.divIcon({
            html: `<div class="w-8 h-8 rounded-xl bg-amber-600 border-2 border-white flex items-center justify-center shadow-lg text-white flex shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto my-auto"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>`,
            className: "custom-leaflet-marker",
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const points = [];

        // Plot Employee Journey Coordinates
        if (activeJourney && activeJourney.length > 0) {
            activeJourney.forEach((node, i) => {
                if (node.latitude && node.longitude) {
                    const latlng = [node.latitude, node.longitude];
                    points.push(latlng);

                    const isLatest = i === activeJourney.length - 1;
                    if (isLatest) {
                        L.marker(latlng, { icon: employeeIcon })
                            .bindPopup(`<b>${node.contact} (LIVE position)</b><br/>Time: ${node.time}<br/>Coordinates: ${node.latitude.toFixed(5)}, ${node.longitude.toFixed(5)}`)
                            .addTo(markersGroup);
                    } else {
                        const dotIcon = L.divIcon({
                            html: `<div class="w-3.5 h-3.5 rounded-full bg-indigo-500 border border-white shadow-sm"></div>`,
                            className: "custom-leaflet-dot",
                            iconSize: [14, 14],
                            iconAnchor: [7, 7]
                        });
                        L.marker(latlng, { icon: dotIcon })
                            .bindPopup(`<b>Waypoint #${i + 1}</b><br/>Recorded at: ${node.time}`)
                            .addTo(markersGroup);
                    }
                }
            });

            // Draw route lines connecting points
            if (polylineRef.current) {
                map.removeLayer(polylineRef.current);
            }
            if (points.length >= 2) {
                polylineRef.current = L.polyline(points, {
                    color: "#4F46E5",
                    weight: 4,
                    opacity: 0.8,
                    smoothFactor: 1
                }).addTo(map);
            }
        }

        // Plot Customer Locations
        if (customerMarkers && customerMarkers.length > 0) {
            customerMarkers.forEach((c) => {
                if (c.latitude && c.longitude) {
                    const latlng = [c.latitude, c.longitude];
                    L.marker(latlng, { icon: customerIcon })
                        .bindPopup(`<b>Customer: ${c.name}</b><br/>📍 Address: ${c.address || "Address not provided"}`)
                        .addTo(markersGroup);
                }
            });
        }

        // Plot Halts
        if (halts && halts.length > 0) {
            halts.forEach((h) => {
                if (h.latitude && h.longitude) {
                    const latlng = [h.latitude, h.longitude];
                    L.marker(latlng, { icon: haltIcon })
                        .bindPopup(`<b>Operational Halt</b><br/>Duration: ${h.durationMins} mins<br/>Active Time: ${h.startTime} - ${h.endTime}`)
                        .addTo(markersGroup);
                }
            });
        }

        // Bound map to fit all elements cleanly
        try {
            const bounds = markersGroup.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
            }
        } catch (e) {}

    }, [leafletLoaded, activeJourney, customerMarkers, halts]);

    return (
        <div className="max-w-7xl mx-auto py-4 px-4 md:px-0 space-y-7 pb-36 md:pb-16 animate-in fade-in duration-400">

            {/* TOP HEADER & COMMAND BOARD */}
            <div className="flex justify-between items-center px-4 md:px-0 mx-4 md:mx-0">
                <div className="flex items-center gap-1">
                    {!showSearch ? (
                        <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-tight">
                            Live GPS Tracking
                        </h1>
                    ) : (
                        <input
                            type="text"
                            placeholder="Search employee..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                            className="bg-transparent border-b border-slate-350 text-xs py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-32 sm:w-44 font-semibold animate-in slide-in-from-left-2 duration-200 text-slate-800"
                        />
                    )}
                </div>

                {/* Search & Actions */}
                <div className="flex items-center gap-3">
                    {/* User Selector Dropdown */}
                    {!showSearch && isManager && employees.length > 0 && (
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="block w-28 sm:w-36 px-2.5 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none text-center shadow-sm"
                        >
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name.split(" ")[0]}</option>
                            ))}
                        </select>
                    )}

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
                        onClick={() => setOpen(true)}
                        className="hidden md:flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-md shadow-indigo-500/10 active:scale-95 cursor-pointer"
                    >
                        <Plus size={12} strokeWidth={2.5} />
                        Simulate GPS
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-bounce">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                </div>
            )}

            {/* MOBILE QUICK STATS BAR */}
            <div className="md:hidden grid grid-cols-3 gap-2 bg-white border border-slate-200/60 p-3 rounded-2xl shadow-sm mx-1">
                <div className="text-center space-y-0.5 border-r border-slate-100">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Distance</span>
                    <span className="text-xs font-black text-slate-800">{totalDistanceStr}</span>
                </div>
                <div className="text-center space-y-0.5 border-r border-slate-100">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Nodes</span>
                    <span className="text-xs font-black text-slate-800">{activeJourney.length} pts</span>
                </div>
                <div className="text-center space-y-0.5 min-w-0">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Shift Time</span>
                    <span className="text-xs font-black text-slate-800 truncate block">{activeShiftTimeStr}</span>
                </div>
            </div>

            {/* DESKTOP QUICK STATS PANEL */}
            <div className="hidden md:grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white border border-slate-200/50 p-5 rounded-3xl shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-200">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/50">
                        <Compass className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Calculated Distance</p>
                        <h3 className="text-lg font-black text-slate-800 mt-0.5">{totalDistanceStr}</h3>
                    </div>
                </div>

                <div className="bg-white border border-slate-200/50 p-5 rounded-3xl shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-200">
                    <div className="p-3 bg-slate-50 text-slate-700 rounded-2xl border border-slate-200/60">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recorded Nodes</p>
                        <h3 className="text-lg font-black text-slate-800 mt-0.5">{activeJourney.length} coordinates</h3>
                    </div>
                </div>

                <div className="bg-white border border-slate-200/50 p-5 rounded-3xl shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-200">
                    <div className="p-3 bg-indigo-50 text-indigo-650 rounded-2xl border border-indigo-100/50">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Shift Time</p>
                        <h3 className="text-lg font-black text-slate-800 mt-0.5">{activeShiftTimeStr}</h3>
                    </div>
                </div>
            </div>

            {/* LIVE GPS SHOW / GEOLOCATION SYNC BANNER */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-lg border border-indigo-950/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mx-1">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isTrackingActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                            {isTrackingActive ? "Live telemetry tracking active" : "Telemetry route tracking stopped"}
                        </span>
                    </div>
                    <h2 className="text-base font-black uppercase tracking-tight">
                        {isManager ? "Active Employee Tracking Console" : "Shift Location Synchronization"}
                    </h2>
                    <p className="text-xs text-slate-300 font-medium max-w-xl">
                        {isManager 
                            ? "Plot real-time field executive routes, halt zones, and customer visit nodes directly on the interactive GIS system."
                            : "Share real-time coordinates during your active work shift to automatically trace visits, routes, and travel claims."
                        }
                    </p>
                </div>
                
                <div className="w-full sm:w-auto flex flex-col gap-2 shrink-0">
                    {isManager ? (
                        <button
                            onClick={handleMapFabClick}
                            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Compass className="w-4 h-4" />
                            Show Live GPS Route
                        </button>
                    ) : (
                        <button
                            onClick={toggleTracking}
                            className={`w-full px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 border ${
                                isTrackingActive 
                                    ? "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200" 
                                    : "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent shadow-md"
                            }`}
                        >
                            <Compass className={`w-4 h-4 ${isTrackingActive ? 'animate-spin' : ''}`} />
                            {isTrackingActive ? "Stop Shift Tracker" : "Start Shift Tracker"}
                        </button>
                    )}
                </div>
            </div>

            {/* GIS MAP CONTAINER & ROLE BASED DIRECTORY GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT COLUMN: REAL INTERACTIVE MAP */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/50 shadow-sm overflow-hidden flex flex-col min-h-[460px] relative">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
                        <div className="flex items-center gap-2">
                            <MapIcon className="text-indigo-650 w-5 h-5" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Operational GIS Live Map</h3>
                        </div>
                        <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl uppercase tracking-wider">
                            Interactive OpenStreetMap
                        </span>
                    </div>

                    <div className="flex-1 bg-slate-50 relative flex min-h-[380px]">
                        {!leafletLoaded ? (
                            <div className="flex-1 flex flex-col items-center justify-center space-y-3 bg-slate-50">
                                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Loading Live GIS map...</span>
                            </div>
                        ) : (
                            <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-10" />
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: ROLE-BASED SIDE PANEL */}
                <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200/50 shadow-sm overflow-hidden flex flex-col min-h-[460px] max-h-[560px]">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white z-10 relative">
                        <div className="flex items-center gap-2">
                            {isManager ? <Clock className="text-slate-800 w-5 h-5" /> : <Users className="text-slate-800 w-5 h-5" />}
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                                {isManager ? "Timeline logs" : "Customer offices"}
                            </h3>
                        </div>
                        <span className="text-[9px] font-black text-slate-455 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg uppercase tracking-widest">
                            {isManager ? `${activeJourney.length} logs` : `${customers.length} locations`}
                        </span>
                    </div>

                    {isManager ? (
                        /* Admin/Manager View: Timeline nodes logs */
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-slate-50/15">
                            {activeJourney.length > 0 ? (
                                activeJourney.map((item) => {
                                    const isLive = item.status === "Live";
                                    let statusBg = isLive ? "bg-indigo-50 text-indigo-755 border-indigo-100" : "bg-slate-100 text-slate-600 border-slate-200";
                                    
                                    return (
                                        <div
                                            key={item.id}
                                            className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex gap-3.5 hover:shadow-md hover:border-slate-300 transition-all group"
                                        >
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
                                                isLive ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm' : 'bg-slate-100 border-slate-200 text-slate-550'
                                            }`}>
                                                {isLive ? <MapPin size={16} /> : <Navigation size={14} className="transform rotate-45 text-slate-400" />}
                                            </div>
                                            <div className="min-w-0 flex-1 space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{item.time}</span>
                                                    <span className="text-[9px] font-bold text-slate-400">{item.duration}</span>
                                                </div>
                                                <h4 className="text-xs font-mono font-bold text-slate-700 truncate">{item.location}</h4>
                                                <div className="flex items-center justify-between pt-1 text-[9px] font-bold text-slate-400 border-t border-slate-100/50 mt-1">
                                                    <span>Battery: {item.batteryLevel ? `${(item.batteryLevel * 100).toFixed(0)}%` : "100%"}</span>
                                                    <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-wider ${statusBg}`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="py-12 text-center text-slate-400 text-xs font-bold">
                                    No nodes recorded yet.
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Executive/User View: Customer location directory with Haversine distance */
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-slate-50/15">
                            {customers.length > 0 ? (
                                customers.map((c) => {
                                    // Calculate distance from executive's latest recorded coordinate
                                    const latestLoc = activeJourney[activeJourney.length - 1];
                                    let distStr = "Distance unknown";
                                    if (latestLoc && latestLoc.latitude && latestLoc.longitude && c.latitude && c.longitude) {
                                        const d = getHaversineDistance(latestLoc, c);
                                        distStr = `${d.toFixed(1)} KM away`;
                                    } else if (currentGpsCoords && c.latitude && c.longitude) {
                                        const d = getHaversineDistance(currentGpsCoords, c);
                                        distStr = `${d.toFixed(1)} KM away`;
                                    }
                                    
                                    return (
                                        <div key={c.id || c.name} className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-md transition-all group">
                                            <div className="flex justify-between items-start gap-2">
                                                <div>
                                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{c.name}</h4>
                                                    <p className="text-[10px] text-slate-500 font-bold mt-1">📍 Address: {c.address || c.city || "Address not provided"}</p>
                                                </div>
                                                <span className="text-[9px] bg-teal-50 text-teal-700 border border-teal-100/50 px-2 py-0.5 rounded-lg font-black shrink-0">
                                                    {distStr}
                                                </span>
                                            </div>
                                            
                                            <button
                                                onClick={() => {
                                                    const startLat = latestLoc?.latitude || currentGpsCoords?.latitude || "";
                                                    const startLng = latestLoc?.longitude || currentGpsCoords?.longitude || "";
                                                    let mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}&travelmode=driving`;
                                                    if (startLat && startLng) {
                                                        mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${c.latitude},${c.longitude}&travelmode=driving`;
                                                    }
                                                    window.open(mapUrl, "_blank");
                                                }}
                                                className="w-full flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-sm mt-3"
                                            >
                                                <Navigation size={11} className="transform rotate-45" /> Navigate to Customer
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="py-12 text-center text-slate-400 text-xs font-bold">
                                    No customer offices located in database.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* HALT ANALYSIS PANEL */}
            {isManager && halts.length > 0 && (
                <div className="bg-white border border-slate-200/55 rounded-3xl shadow-sm overflow-hidden flex flex-col p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="text-amber-500 w-5 h-5 animate-pulse" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Operational Halt & Idle Analytics</h3>
                        </div>
                        <span className="bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                            {halts.length} Halts Detected
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {halts.map((halt) => {
                            const isLongHalt = halt.durationMins >= 15;
                            return (
                                <div 
                                    key={halt.id}
                                    onClick={() => setSelectedPoint(halt)}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer hover:-translate-y-0.5 active:scale-95 flex gap-3 ${
                                        isLongHalt 
                                            ? "bg-rose-50/50 border-rose-100 hover:bg-rose-50" 
                                            : "bg-amber-50/30 border-amber-100 hover:bg-amber-50/60"
                                    }`}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                                        isLongHalt 
                                            ? "bg-rose-100 border-rose-200 text-rose-600" 
                                            : "bg-amber-100 border-amber-200 text-amber-600"
                                    }`}>
                                        <Clock size={15} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-bold text-slate-700">
                                                Duration: {halt.durationMins} mins
                                            </span>
                                            {isLongHalt && (
                                                <span className="text-[8px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                    Idle Alert
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs font-mono font-bold text-slate-700 mt-1 truncate">
                                            GPS: {halt.latitude.toFixed(5)}, {halt.longitude.toFixed(5)}
                                        </p>
                                        <p className="text-[9px] text-slate-450 font-bold mt-1 uppercase">
                                            Time: {halt.startTime} - {halt.endTime}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* GPS TRACKING CONTROLLER */}
            <div className="bg-white border border-slate-200/60 p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 mx-1">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner shrink-0 ${
                        isTrackingActive 
                            ? "bg-indigo-50 text-indigo-600 border border-indigo-100" 
                            : "bg-slate-50 text-slate-400 border border-slate-100"
                    }`}>
                        <Route className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                                isTrackingActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                GPS Shift Sync status
                            </span>
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">
                            {isTrackingActive 
                                ? "LIVE ROUTE SYNCHRONIZATION ACTIVE" 
                                : "LIVE ROUTE SYNCHRONIZATION STOPPED"
                            }
                        </h3>
                    </div>
                </div>
                
                <button
                    onClick={toggleTracking}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center gap-2 border ${
                        isTrackingActive 
                            ? "bg-rose-50 hover:bg-rose-100/80 text-rose-600 border-rose-200" 
                            : "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent shadow-md shadow-indigo-500/10"
                    }`}
                >
                    <Compass size={14} className={isTrackingActive ? "animate-spin" : ""} />
                    {isTrackingActive ? "Stop Route Sync" : "Start Route Sync"}
                </button>
            </div>

            {/* DATABASE COORDINATE LOGS BOARD (DESKTOP ONLY) */}
            <div className="hidden md:flex bg-white rounded-3xl border border-slate-200/50 shadow-sm overflow-hidden flex-col">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white w-full">
                    <div className="flex items-center gap-2">
                        <Route className="text-slate-800 w-5 h-5" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Database Coordinates Log</h3>
                    </div>
                    <span className="bg-slate-50 text-slate-550 text-[9px] font-black px-3 py-1.5 rounded-xl border border-slate-200 uppercase tracking-widest shadow-inner">
                        {locations.length} Records
                    </span>
                </div>

                <div className="overflow-x-auto w-full">
                    {isLoading ? (
                        <div className="py-12 text-center text-slate-650"><Loader2 className="animate-spin mx-auto w-6 h-6" /></div>
                    ) : (
                        <table className="w-full text-left whitespace-nowrap border-collapse">
                            <thead className="bg-slate-50/80 border-b border-slate-200/60">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-455 uppercase tracking-wider w-16">#</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-455 uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-455 uppercase tracking-wider">Coordinates (Lat, Lng)</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-455 uppercase tracking-wider">Telemetry Info</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-455 uppercase tracking-wider w-40">Recorded Time</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-455 uppercase tracking-wider w-24 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredLocations.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-xs text-slate-400 font-bold">
                                            No recorded logs found in the database.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLocations.map((row, index) => (
                                        <tr key={row.id} className="hover:bg-slate-50/40 transition-colors">
                                            <td className="px-6 py-4 text-xs font-bold text-slate-400">{index + 1}</td>
                                            <td className="px-6 py-4 font-black text-slate-800 text-xs flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-black text-[9px] flex items-center justify-center">
                                                    {row.userName?.charAt(0) || "E"}
                                                </div>
                                                {row.userName || "Unknown Employee"}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-mono font-bold text-slate-650">
                                                {row.latitude.toFixed(6)}, {row.longitude.toFixed(6)}
                                            </td>
                                            <td className="px-6 py-4 text-[10px] font-bold text-slate-500">
                                                <span className="mr-3">🔋 {row.batteryLevel ? `${(row.batteryLevel * 100).toFixed(0)}%` : "100%"} {row.batteryCharging ? "⚡" : ""}</span>
                                                <span>📶 {row.networkStatus || "ONLINE"}</span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-slate-455">
                                                {new Date(row.recordedAt).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "short" })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openFullRoute(row.userId || row.user_id)}
                                                        className="p-1.5 text-indigo-650 bg-indigo-50 border border-indigo-100/50 rounded-lg hover:bg-indigo-100 transition-all cursor-pointer"
                                                        title="Open Google Maps direction route"
                                                    >
                                                        <Route size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(row.id)}
                                                        className="p-1.5 text-rose-600 bg-rose-50 border border-rose-100/50 rounded-lg hover:bg-rose-100 transition-all cursor-pointer"
                                                        title="Delete record"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* MOBILE FLOATING ACTION BUTTON */}
            <button
                onClick={() => setOpen(true)}
                className="md:hidden fixed bottom-24 right-5 z-40 flex items-center justify-center w-14 h-14 bg-indigo-600 text-white rounded-full shadow-[0_8px_25px_rgba(79,70,229,0.3)] active:scale-90 transition-all border border-white/20 cursor-pointer"
                title="Simulate GPS"
            >
                <Plus size={22} strokeWidth={2.5} />
            </button>

            {/* GPS MANUAL SIMULATOR MODAL */}
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200/80 animate-in zoom-in-95">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
                            <div className="flex items-center gap-2 text-slate-900">
                                <Navigation size={18} className="transform rotate-45 text-indigo-650" />
                                <h2 className="text-base font-black text-slate-800">Simulate GPS Node</h2>
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                className="text-slate-400 hover:text-slate-655 hover:bg-slate-50 p-2 rounded-xl transition-all cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <button
                                    type="button"
                                    onClick={getCurrentLocation}
                                    className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 py-3.5 rounded-xl font-black text-xs transition-all cursor-pointer active:scale-95 shadow-inner"
                                >
                                    <Compass size={14} className="text-indigo-650" /> Detect Coordinates
                                </button>

                                <div className="space-y-3.5 pt-1">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Latitude</label>
                                        <input
                                            name="latitude"
                                            value={form.latitude}
                                            onChange={handleChange}
                                            placeholder="e.g. 17.3850"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400 shadow-inner"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Longitude</label>
                                        <input
                                            name="longitude"
                                            value={form.longitude}
                                            onChange={handleChange}
                                            placeholder="e.g. 78.4867"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400 shadow-inner"
                                            required
                                        />
                                    </div>
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
                                        className="flex-1 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer text-center uppercase tracking-wider"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : "Save Node"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}