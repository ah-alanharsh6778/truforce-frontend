import api from "../../api/axios";

export const getCustomerReport = async () => {
    const res = await api.get("/reports/customers");
    return res.data;
};

export const getVisitReport = async () => {
    const res = await api.get("/reports/visits");
    return res.data;
};

export const getFollowUpReport = async () => {
    const res = await api.get("/reports/followups");
    return res.data;
};