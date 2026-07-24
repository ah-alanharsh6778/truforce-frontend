import api from "../../api/axios";

// Fetch all daily summaries with proper error handling
export const getAllSummaries = async () => {
    try {
        const response = await api.get("/summary/all");
        console.log("📡 summaryService - API Response:", response);
        
        let data = response.data?.data || response.data || [];
        console.log("📡 summaryService - Extracted data:", data);
        
        // Ensure data is array
        if (!Array.isArray(data)) {
            console.warn("📡 summaryService - Data is not array, converting...", typeof data);
            data = [];
        }
        
        // Log each record to check structure
        if (data.length > 0) {
            console.log("📡 summaryService - First record structure:", data[0]);
            console.log("📡 summaryService - Sample user_ids:", data.map(d => d.user_id || d.userId).slice(0, 5));
        }
        
        const result = {
            data: data
        };
        console.log("📡 summaryService - Final result with", data.length, "records:", result);
        return result;
    } catch (error) {
        console.error("❌ summaryService - Error fetching summaries:", error);
        console.error("❌ summaryService - Error response:", error.response?.data);
        console.error("❌ summaryService - Error status:", error.response?.status);
        
        // Return empty array on error
        return { data: [] };
    }
};

// Create a new daily summary
export const createSummary = async (payload) => {
    try {
        const response = await api.post("/summary/create", payload);
        return response.data;
    } catch (error) {
        console.error("Error creating summary:", error);
        throw error;
    }
};