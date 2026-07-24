import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:8082/api"
});

// 🔥 1. REQUEST INTERCEPTOR (Token bhejne ke liye - Jo aapne sahi likha tha)
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 🔥 2. RESPONSE INTERCEPTOR (Agar token galat/expire ho toh clean Logout karne ke liye)
// 🔥 2. RESPONSE INTERCEPTOR
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // ADDED 403 HERE: Agar backend 401 ya 403 de (Token expired ya permission denied)
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.error("Token invalid ya expire ho gaya hai! Force Logout...");

            localStorage.clear();
            window.location.href = "/";
        }
        return Promise.reject(error);
    }
);

export default api;