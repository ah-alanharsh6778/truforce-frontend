/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem("token"));
    const [user, setUser] = useState(() => {
        const storedToken = localStorage.getItem("token");
        const userId = localStorage.getItem("userId");
        const name = localStorage.getItem("name");
        const email = localStorage.getItem("email");
        const role = localStorage.getItem("role");

        if (storedToken && userId) {
            return { userId, name, email, role };
        }
        return null;
    });

    const login = (authToken, userData) => {
        localStorage.setItem("token", authToken);
        localStorage.setItem("userId", userData.userId || "");
        localStorage.setItem("name", userData.name || "");
        localStorage.setItem("email", userData.email || "");
        localStorage.setItem("role", userData.role || "");

        setToken(authToken);
        setUser({
            userId: userData.userId || "",
            name: userData.name || "",
            email: userData.email || "",
            role: userData.role || ""
        });
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("name");
        localStorage.removeItem("email");
        localStorage.removeItem("role");

        setToken(null);
        setUser(null);
    };

    const updateUser = (newUserData) => {
        setUser((prev) => {
            if (!prev) return null;
            const updated = { ...prev };
            if (newUserData.name !== undefined) {
                updated.name = newUserData.name;
                localStorage.setItem("name", newUserData.name);
            }
            if (newUserData.email !== undefined) {
                updated.email = newUserData.email;
                localStorage.setItem("email", newUserData.email);
            }
            if (newUserData.role !== undefined) {
                updated.role = newUserData.role;
                localStorage.setItem("role", newUserData.role);
            }
            return updated;
        });
    };

    return (
        <AuthContext.Provider
            value={{
                token,
                user,
                isAuthenticated: !!token,
                login,
                logout,
                updateUser
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
