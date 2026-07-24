import { useState, useEffect, useRef, useMemo } from "react";
import api from "../api/axios";
import { saveOfflineLocations } from "../utils/offlineSync";

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

/**
 * Custom hook for background location tracking, batching GPS logs,
 * broadcasting live coordinates, battery levels, and connection latency via WebSockets.
 */
export default function useLocationTracker(userId, isTracking) {
    const [currentLoc, setCurrentLoc] = useState("Off");
    const [coordinates, setCoordinates] = useState([]);
    const [error, setError] = useState(null);
    const [liveSpeed, setLiveSpeed] = useState(0); // in km/h

    const queueRef = useRef([]);
    const socketRef = useRef(null);
    const watchIdRef = useRef(null);
    const syncIntervalRef = useRef(null);
    
    // Stable coordinates ref to avoid hook dependency re-subscription loops
    const coordinatesRef = useRef([]);
    // Sync coordinates state with ref
    useEffect(() => {
        coordinatesRef.current = coordinates;
    }, [coordinates]);

    // Battery Status Ref
    const batteryRef = useRef({ level: 1.0, charging: false });
    // Battery Status State for rendering
    const [batteryState, setBatteryState] = useState({ level: 1.0, charging: false });

    // Retrieve network status class
    const getNetworkStatus = () => {
        if (!navigator.onLine) return "OFFLINE";
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn) {
            return `ONLINE (${conn.effectiveType?.toUpperCase() || "WIFI"})`;
        }
        return "ONLINE";
    };

    // Calculate live distance covered in this session
    const liveDistance = useMemo(() => {
        if (coordinates.length < 2) return 0;
        let dist = 0;
        for (let i = 1; i < coordinates.length; i++) {
            dist += getHaversineDistance(coordinates[i - 1], coordinates[i]);
        }
        return dist;
    }, [coordinates]);

    // 1. Monitor device battery level and state
    useEffect(() => {
        if (!navigator.getBattery) return;
        navigator.getBattery().then((battery) => {
            const initialBattery = {
                level: battery.level,
                charging: battery.charging
            };
            batteryRef.current = initialBattery;
            setBatteryState(initialBattery);

            const updateBattery = () => {
                const updatedBattery = {
                    level: battery.level,
                    charging: battery.charging
                };
                batteryRef.current = updatedBattery;
                setBatteryState(updatedBattery);
            };
            battery.addEventListener("levelchange", updateBattery);
            battery.addEventListener("chargingchange", updateBattery);
            return () => {
                battery.removeEventListener("levelchange", updateBattery);
                battery.removeEventListener("chargingchange", updateBattery);
            };
        }).catch(err => console.warn("Failed to read Battery API:", err));
    }, []);

    // Derive WebSocket path
    const getWsUrl = () => {
        const httpBase = api.defaults.baseURL || "http://localhost:8082/api";
        const wsBase = httpBase.replace(/^http/, "ws");
        const host = wsBase.split("/api")[0];
        return `${host}/ws`;
    };

    // 2. Establish WebSocket connection
    useEffect(() => {
        if (!isTracking || !userId) {
            if (socketRef.current) {
                console.log("🔌 Closing live WebSocket connection...");
                socketRef.current.close();
                socketRef.current = null;
            }
            return;
        }

        if (!navigator.onLine) {
            console.log("🔌 Offline: Skipping WebSocket connection");
            return;
        }

        const wsUrl = getWsUrl();
        console.log(`🔌 Connecting to live tracking WebSocket: ${wsUrl}`);
        
        try {
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log("✅ WebSocket opened! Sending STOMP CONNECT frame...");
                const connectFrame = "CONNECT\naccept-version:1.1,1.0\nheart-beat:10000,10000\n\n\u0000";
                socket.send(connectFrame);
            };

            socket.onerror = (err) => {
                console.error("❌ WebSocket Error:", err);
            };

            socket.onclose = () => {
                console.log("🔌 WebSocket Connection Closed");
            };
        } catch (err) {
            console.error("❌ Failed to initialize WebSocket:", err);
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
        };
    }, [isTracking, userId]);

    // 3. Start Geolocation Watching & Periodic Syncing
    useEffect(() => {
        if (!isTracking || !userId) {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
            Promise.resolve().then(() => {
                setCurrentLoc("Off");
                setLiveSpeed(0);
            });
            return;
        }

        Promise.resolve().then(() => {
            setCurrentLoc("Initializing GPS...");
        });

        if (navigator.geolocation) {
            const options = {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            };

            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const accuracy = position.coords.accuracy || 10.0;
                    const timestamp = new Date(position.timestamp || Date.now()).toISOString();

                    const currentCoords = coordinatesRef.current;

                    // Calculate speed
                    if (position.coords.speed !== null && position.coords.speed !== undefined) {
                        setLiveSpeed(position.coords.speed * 3.6); // convert m/s to km/h
                    } else if (currentCoords.length > 0) {
                        // fallback: compute from last coordinate delta
                        const prev = currentCoords[currentCoords.length - 1];
                        const distKm = getHaversineDistance(prev, { latitude: lat, longitude: lng });
                        const timeHrs = (new Date(timestamp) - new Date(prev.timestamp)) / 3600000;
                        if (timeHrs > 0) {
                            setLiveSpeed(Math.min(distKm / timeHrs, 120)); // cap fallback speed at 120 km/h
                        }
                    }

                    setCurrentLoc(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
                    setError(null);

                    // Create Location Log package including battery and network status
                    const locationNode = {
                        userId: userId,
                        latitude: lat,
                        longitude: lng,
                        accuracy: accuracy,
                        batteryLevel: batteryRef.current.level,
                        batteryCharging: batteryRef.current.charging,
                        networkStatus: getNetworkStatus(),
                        timestamp: timestamp
                    };

                    setCoordinates((prev) => [...prev, locationNode]);
                    queueRef.current.push(locationNode);

                    // Broadcast live coordinate immediately via WebSockets if online
                    if (navigator.onLine && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                        try {
                            const stompFrame = `SEND\ndestination:/topic/live-tracking/${userId}\ncontent-type:application/json\n\n${JSON.stringify(locationNode)}\u0000`;
                            socketRef.current.send(stompFrame);
                        } catch (err) {
                            console.error("❌ Failed to send WebSocket payload:", err);
                        }
                    }
                },
                (err) => {
                    console.error("❌ Geolocation watch error:", err);
                    setError(`GPS error: ${err.message}`);
                },
                options
            );
        } else {
            Promise.resolve().then(() => {
                setError("HTML5 Geolocation is not supported by this device.");
            });
        }

        // Start batch sync timer (every 15 seconds)
        syncIntervalRef.current = setInterval(async () => {
            if (queueRef.current.length === 0) return;

            const logsToSync = [...queueRef.current];

            if (!navigator.onLine) {
                console.log(`📶 Device Offline: Redirecting ${logsToSync.length} logs to offline storage.`);
                saveOfflineLocations(userId, logsToSync);
                queueRef.current = queueRef.current.slice(logsToSync.length);
                return;
            }

            console.log(`📤 Syncing batch of ${logsToSync.length} location logs to backend...`);
            try {
                await api.post("/v1/location/sync", logsToSync);
                queueRef.current = queueRef.current.slice(logsToSync.length);
                console.log("✅ Location logs synced successfully.");
            } catch (err) {
                console.error("❌ Location logs sync failed. Redirecting to offline storage:", err.message);
                saveOfflineLocations(userId, logsToSync);
                queueRef.current = queueRef.current.slice(logsToSync.length);
            }
        }, 15000);

        return () => {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
        };
    }, [isTracking, userId]); // Stable dependencies: effect will not tear down on coordinates update

    return { 
        currentLoc, 
        coordinates, 
        error, 
        liveDistance, 
        liveSpeed, 
        battery: batteryState, 
        networkStatus: getNetworkStatus() 
    };
}
