import api from "../../api/axios";

export const getTotalKm = async (userId) => {

    const response =
        await api.get(
            `/location-logs/total-km/${userId}`
        );

    return response.data;
};