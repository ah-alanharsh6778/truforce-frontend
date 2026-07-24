import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
    const { token, user } = useAuth();
    const userRole = user?.role;
    const location = useLocation(); // Current page ki location

    // 1. Agar token nahi hai, toh seedha Login par bhej do
    if (!token) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // 2. Agar page ke liye roles define hain, toh check karo
    if (allowedRoles && allowedRoles.length > 0) {

        // 🔥 YAHAN FIX KIYA HAI: '===' ki jagah '.includes()' lagaya hai
        const hasPermission = allowedRoles.some(
            (role) => userRole?.toUpperCase().includes(role.toUpperCase())
        );

        // Agar permission nahi hai, toh Unauthorized page ya Dashboard par bhej do
        if (!hasPermission) {
            // Agar pehle se dashboard par hai aur loop ban raha hai, toh loop roko
            if (location.pathname === "/dashboard") {
                console.error("Role mismatch on dashboard! Clearing data.");
                localStorage.clear(); // Galat data hai, saaf karo
                return <Navigate to="/" replace />;
            }
            return <Navigate to="/dashboard" replace />;
        }
    }

    // 3. Sab theek hai, toh page render kardo
    return children;
}