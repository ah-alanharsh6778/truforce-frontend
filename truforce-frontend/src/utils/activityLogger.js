import api from "../api/axios";

export const logActivity = async (moduleName, action, performedBy, metadata = {}) => {
    try {
        const payload = {
            moduleName,
            action,
            performedBy,
            metadata
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

export const logCreate = async (moduleName, itemName, performedBy, metadata = {}) => {
    const action = `Created new ${moduleName.toLowerCase()}: ${itemName}`;
    return logActivity(moduleName, action, performedBy, { ...metadata });
};

export const logUpdate = async (moduleName, itemName, performedBy, changes = {}, metadata = {}) => {
    const changesList = Object.keys(changes).join(", ");
    const action = `Updated ${moduleName.toLowerCase()}: ${itemName} (${changesList})`;
    return logActivity(moduleName, action, performedBy, { changes, ...metadata });
};

export const logDelete = async (moduleName, itemName, performedBy, metadata = {}) => {
    const action = `Deleted ${moduleName.toLowerCase()}: ${itemName}`;
    return logActivity(moduleName, action, performedBy, { ...metadata });
};

export const logSearch = async (moduleName, searchTerm, resultsCount, performedBy) => {
    const action = `Searched for "${searchTerm}" in ${moduleName.toLowerCase()}`;
    return logActivity(moduleName, action, performedBy, { searchTerm, resultsCount });
};

export const logFilter = async (moduleName, filterCriteria, performedBy) => {
    const action = `Applied filters to ${moduleName.toLowerCase()}`;
    return logActivity(moduleName, action, performedBy, { filterCriteria });
};
