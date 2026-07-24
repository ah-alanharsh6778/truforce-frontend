import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/auth/LoginPage";
import ProfilePage from "./pages/profile/profilePage";
import ExpensePage from "./pages/expense/ExpenseScreen.jsx";

import DashboardPage from "./pages/dashboard/DashboardPage";
import CustomersPage from "./pages/customers/CustomersPage";
import VisitsPage from "./pages/visit/VisitsPage";
import TrackingPage from "./pages/tracking/TrackingPage";
import FollowUpsPage from "./pages/followups/FollowUpsPage";
import DailySummaryPage from "./pages/summary/DailySummaryPage";

import ReportsPage from "./pages/reports/ReportsPage";
import NotificationPage from "./pages/notification/NotificationPage";
import ActivityLogsPage from "./pages/activity/ActivityLogsPage";

import ProtectedRoute from "./routes/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";
import AddVisitPage from "./pages/visit/AddVisitPage";
import { useAuth } from "./context/AuthContext";

function App() {
    // Check if user is already logged in via context
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            {/* Public Routes*/}
            <Route
                path="/"
                element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
            />
            <Route
                path="/register"
                element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
            />

            {/* 🔥 SINGLE MASTER WRAPPER 🔥 */}
            <Route element={<MainLayout />}>

                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute allowedRoles={["Admin", "Manager", "User", "ROLE_ADMIN", "ROLE_USER"]}>
                            <ProfilePage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute allowedRoles={["Admin", "Manager", "User", "ROLE_ADMIN", "ROLE_USER"]}>
                            <DashboardPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/customers"
                    element={
                        <ProtectedRoute allowedRoles={["Admin", "Manager", "ROLE_ADMIN"]}>
                            <CustomersPage />
                        </ProtectedRoute>
                    }
                />

                <Route path="/add-visit" element={<AddVisitPage />} />

                <Route
                    path="/visits"
                    element={
                        <ProtectedRoute allowedRoles={["Admin", "Manager", "User", "ROLE_ADMIN", "ROLE_USER"]}>
                            <VisitsPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/tracking"
                    element={
                        <ProtectedRoute allowedRoles={["Admin", "Manager", "User", "ROLE_ADMIN", "ROLE_USER"]}>
                            <TrackingPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/expenses"
                    element={
                        <ProtectedRoute allowedRoles={["Admin", "Manager", "User"]}>
                            <ExpensePage /> {/* Yahan ExpensePage hi hona chahiye, ProfilePage nahi */}
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/followups"
                    element={
                        <ProtectedRoute allowedRoles={["Admin", "Manager", "User", "ROLE_ADMIN", "ROLE_USER"]}>
                            <FollowUpsPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/reports"
                    element={
                        <ProtectedRoute allowedRoles={["Admin", "Manager", "ROLE_ADMIN"]}>
                            <ReportsPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/notifications"
                    element={
                        <ProtectedRoute allowedRoles={["Admin", "Manager", "User", "ROLE_ADMIN", "ROLE_USER"]}>
                            <NotificationPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/activity-logs"
                    element={
                        <ProtectedRoute allowedRoles={["Admin", "ROLE_ADMIN"]}>
                            <ActivityLogsPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/summary"
                    element={
                        <ProtectedRoute allowedRoles={["Admin", "Manager", "User", "ROLE_ADMIN"]}>
                            <DailySummaryPage />
                        </ProtectedRoute>
                    }
                />

            </Route>

            {/* Catch All Route - Agar koi galat URL dale */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;