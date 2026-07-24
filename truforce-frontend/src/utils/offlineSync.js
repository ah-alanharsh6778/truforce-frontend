import api from "../api/axios";

// Save visit locally when offline
export const saveOfflineVisit = (visit) => {
    try {
        const stored = localStorage.getItem("offline_visits");
        const queue = stored ? JSON.parse(stored) : [];
        queue.push({
            ...visit,
            id: `offline-${Date.now()}`,
            isOfflineQueued: true
        });
        localStorage.setItem("offline_visits", JSON.stringify(queue));
        console.log("💾 Visit stored locally in offline queue.");
    } catch (err) {
        console.error("Failed to save offline visit:", err);
    }
};

// Save location logs locally when offline
export const saveOfflineLocations = (userId, locations) => {
    try {
        const stored = localStorage.getItem("offline_locations");
        const queue = stored ? JSON.parse(stored) : [];
        
        // Append locations to the queue
        const updated = [
            ...queue,
            ...locations.map(loc => ({ ...loc, userId }))
        ];
        
        localStorage.setItem("offline_locations", JSON.stringify(updated));
        console.log("💾 Locations stored locally in offline queue.");
    } catch (err) {
        console.error("Failed to save offline locations:", err);
    }
};

// Flush and synchronize all cached offline items to the backend
export const syncOfflineData = async () => {
    if (!navigator.onLine) return;

    // 1. Sync offline visits
    const storedVisits = localStorage.getItem("offline_visits");
    if (storedVisits) {
        const visits = JSON.parse(storedVisits);
        if (visits.length > 0) {
            console.log(`📡 Syncing ${visits.length} offline visits to backend...`);
            const successfulIds = [];
            
            for (const visit of visits) {
                try {
                    // Remove temporary offline properties
                    const payload = { ...visit };
                    delete payload.id;
                    delete payload.isOfflineQueued;
                    await api.post("/visits/checkin", payload);
                    successfulIds.push(visit.id);
                } catch (err) {
                    console.error("Failed to sync offline visit, will retry later:", err);
                }
            }

            // Filter out successful visits from local queue
            const remaining = visits.filter(v => !successfulIds.includes(v.id));
            if (remaining.length > 0) {
                localStorage.setItem("offline_visits", JSON.stringify(remaining));
            } else {
                localStorage.removeItem("offline_visits");
                console.log("✅ All offline visits synchronized successfully!");
            }
        }
    }

    // 2. Sync offline location logs
    const storedLocs = localStorage.getItem("offline_locations");
    if (storedLocs) {
        const locations = JSON.parse(storedLocs);
        if (locations.length > 0) {
            console.log(`📡 Syncing ${locations.length} offline locations to backend...`);
            
            // Group location logs by userId to perform batched post requests
            const grouped = {};
            locations.forEach(loc => {
                const uid = loc.userId;
                if (!grouped[uid]) grouped[uid] = [];
                const locData = { ...loc };
                delete locData.userId;
                grouped[uid].push(locData);
            });

            let syncSuccess = true;
            for (const [userId, logs] of Object.entries(grouped)) {
                try {
                    // Convert parameters to standard LocationDto (latitude, longitude, accuracy, timestamp) and post flat list
                    const locationDtos = logs.map(l => ({
                        latitude: Number(l.latitude),
                        longitude: Number(l.longitude),
                        accuracy: Number(l.accuracy || 10.0),
                        timestamp: l.timestamp || l.recordedAt
                    }));
                    await api.post("/v1/location/sync", locationDtos);
                } catch (err) {
                    console.error(`Failed to sync locations for user ${userId}:`, err);
                    syncSuccess = false;
                }
            }

            if (syncSuccess) {
                localStorage.removeItem("offline_locations");
                console.log("✅ All offline location logs synchronized successfully!");
            }
        }
    }
};

// Set up automatic online connection synchronization listener
if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
        console.log("📶 Connection restored! Initializing offline data auto-sync...");
        // Delay slightly to ensure full network sockets resolve
        setTimeout(syncOfflineData, 2000);
    });
}
