import api from "../../api/axios";

export const getAllActivityLogs = async () => {
    try {
        const response = await api.get("/activity-logs");
        const data = response.data?.data || response.data || [];
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Error fetching activity logs:", error);
        return [];
    }
};

export const logActivity = async (moduleName, action, performedBy, metadata = {}) => {
    try {
        const payload = {
            moduleName,
            action,
            performedBy,
            metadata,
            createdAt: new Date().toISOString()
        };

        const response = await api.post("/activity-logs", payload);
        return response.data;
    } catch (error) {
        console.error("Error logging activity:", error);
        return null;
    }
};

export const logStatusChange = async (moduleName, itemId, itemName, oldStatus, newStatus, performedBy, metadata = {}) => {
    const action = `Status changed: ${itemName} from ${oldStatus} to ${newStatus}`;
    
    return logActivity(moduleName, action, performedBy, {
        itemId,
        itemName,
        oldStatus,
        newStatus,
        ...metadata
    });
};