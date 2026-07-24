import api from "../../api/axios";
import { logActivity } from "../../utils/activityLogger";

export const getAllVisits = async () => {
    const res = await api.get("/visits");
    return res.data;
};

export const createVisit = async (data) => {
    const res = await api.post("/visits/checkin", data);
    const performedBy = localStorage.getItem("userName") || "System";
    
    logActivity("VISIT", `Created new visit for customer`, performedBy, {
        visitTime: data.visitTime,
        outcome: data.outcome
    }).catch(err => console.error("Activity log failed:", err));
    
    return res.data;
};

export const updateVisit = async (id, data) => {
    const res = await api.put(`/visits/${id}`, data);
    const performedBy = localStorage.getItem("userName") || "System";
    
    logActivity("VISIT", `Updated visit record`, performedBy, {
        visitId: id,
        outcome: data.outcome
    }).catch(err => console.error("Activity log failed:", err));
    
    return res.data;
};

export const deleteVisit = async (id) => {
    const res = await api.delete(`/visits/${id}`);
    const performedBy = localStorage.getItem("userName") || "System";
    
    logActivity("VISIT", `Deleted visit record`, performedBy, {
        visitId: id
    }).catch(err => console.error("Activity log failed:", err));
    
    return res.data;
};