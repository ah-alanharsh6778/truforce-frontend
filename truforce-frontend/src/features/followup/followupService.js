import api from "../../api/axios";
import { logActivity } from "../../utils/activityLogger";

export const getAllFollowUps = async () => {
    const res = await api.get("/followups");
    return res.data.data;
};

export const createFollowUp = async (data) => {
    const res = await api.post("/followups", data);
    const performedBy = localStorage.getItem("userName") || "System";
    
    logActivity("FOLLOWUP", `Created new follow-up`, performedBy, {
        followUpDate: data.followUpDate,
        status: data.status
    }).catch(err => console.error("Activity log failed:", err));
    
    return res.data.data;
};

export const updateFollowUp = async (id, data) => {
    const res = await api.put(`/followups/${id}`, data);
    const performedBy = localStorage.getItem("userName") || "System";
    
    if (data.status) {
        logActivity("FOLLOWUP", `Follow-up status updated to ${data.status}`, performedBy, {
            followUpId: id,
            newStatus: data.status,
            remarks: data.remarks
        }).catch(err => console.error("Activity log failed:", err));
    }
    
    return res.data.data;
};

export const deleteFollowUp = async (id) => {
    const res = await api.delete(`/followups/${id}`);
    const performedBy = localStorage.getItem("userName") || "System";
    
    logActivity("FOLLOWUP", `Deleted follow-up`, performedBy, {
        followUpId: id
    }).catch(err => console.error("Activity log failed:", err));
    
    return res.data;
};

export const getPendingFollowUps = async () => {
    const res = await api.get("/followups/pending");
    return res.data.data;
};

export const getTodayFollowUps = async () => {
    const res = await api.get("/followups/today");
    return res.data.data;
};

export const getOverdueFollowUps = async () => {
    const res = await api.get("/followups/overdue");
    return res.data.data;
};