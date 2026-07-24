import api from "../../api/axios";

export const getAllNotifications = async () => {
    const res = await api.get("/notifications");
    return res.data;
};

export const createNotification = async (data) => {
    const res = await api.post("/notifications", data);
    return res.data;
};

export const markAsRead = async (id) => {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data;
};