export const ROLE_PERMISSIONS = {
    ADMIN: [
        "dashboard", "customers", "visits", "tracking",
        "followUps", "reports", "notifications", "activityLogs", "summary"
    ],
    MANAGER: [
        "dashboard", "customers", "visits", "tracking",
        "followUps", "reports", "notifications", "summary"
    ],
    USER: [
        "dashboard", "visits", "tracking",
        "followUps", "notifications", "summary"
    ]
};

// Yeh function check karega ki user ke paas module ka access hai ya nahi
export const hasAccess = (role, module) => {
    if (!role) return false;
    const normalizedRole = role.toUpperCase();
    return ROLE_PERMISSIONS[normalizedRole]?.includes(module) || false;
};