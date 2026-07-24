import api from "../../api/axios";

export const getAllLocations = async () => {
    const res = await api.get("/location-logs");
    return res.data;
};

export const createLocation = async (data) => {
    const res = await api.post("/location-logs", data);
    return res.data;
};

export const deleteLocation = async (id) => {
    const res = await api.delete(`/location-logs/${id}`);
    return res.data;
};

export const getTotalKm = async (userId) => {

    const response =
        await api.get(
            `/location-logs/total-km/${userId}`
        );

    return response.data;
};