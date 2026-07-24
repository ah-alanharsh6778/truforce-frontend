import api from "../../api/axios";
import { logActivity } from "../../utils/activityLogger";

export const getAllCustomers = async () => {
    const res = await api.get("/customers");
    return res.data.data;
};

export const createCustomer = async (data) => {
    const res = await api.post("/customers", data);
    const performedBy = localStorage.getItem("userName") || "System";
    
    logActivity("CUSTOMER", `Created new customer: ${data.name}`, performedBy, {
        customerId: res.id,
        city: data.city,
        email: data.email,
        phone: data.phone
    }).catch(err => console.error("Activity log failed:", err));
    
    return res.data.data;
};

export const updateCustomer = async (id, data) => {
    const res = await api.put(`/customers/${id}`, data);
    const performedBy = localStorage.getItem("userName") || "System";
    
    logActivity("CUSTOMER", `Updated customer: ${data.name}`, performedBy, {
        customerId: id,
        changes: Object.keys(data).join(", ")
    }).catch(err => console.error("Activity log failed:", err));
    
    return res.data.data;
};

export const deleteCustomer = async (id) => {
    const res = await api.delete(`/customers/${id}`);
    const performedBy = localStorage.getItem("userName") || "System";
    
    logActivity("CUSTOMER", `Deleted customer`, performedBy, {
        customerId: id
    }).catch(err => console.error("Activity log failed:", err));
    
    return res.data;
};
