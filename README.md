# TruForce Frontend

A modern React-based frontend for the **TruForce Field Sales Management System**. This application enables sales representatives and managers to manage customers, track visits, monitor field activities, and securely access business data through JWT-based authentication.

---

## 🚀 Features

- 🔐 Secure JWT Authentication
- 👤 Role-based Dashboard (Admin / Manager / Sales Executive)
- 👥 Customer Management
- 📍 Visit Tracking
- 📊 Dashboard Analytics
- 📝 Create & Manage Customer Visits
- 🔍 Search & Filter Records
- 📱 Responsive UI
- ⚡ Fast Development with Vite

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| React.js | Frontend Library |
| Vite | Build Tool |
| React Router DOM | Routing |
| Axios | API Calls |
| CSS3 | Styling |
| LocalStorage | JWT Storage |
| JavaScript (ES6+) | Programming Language |

---

## 📂 Project Structure

```
src/
│
├── assets/
├── components/
│   ├── Navbar
│   ├── Sidebar
│   ├── ProtectedRoute
│   └── Loader
│
├── pages/
│   ├── Login
│   ├── Dashboard
│   ├── Customers
│   ├── Visits
│   ├── Profile
│   └── NotFound
│
├── services/
│   ├── api.js
│   └── authService.js
│
├── hooks/
├── utils/
├── styles/
├── App.jsx
└── main.jsx
```

---

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/your-username/truforce-frontend.git
```

```bash
cd truforce-frontend
```

### Install Dependencies

```bash
npm install
```

### Configure Environment

Create a `.env` file in the project root.

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

---

## ▶️ Run Development Server

```bash
npm run dev
```

Application will start on

```
http://localhost:5173
```

---

## 📦 Build for Production

```bash
npm run build
```

Preview production build

```bash
npm run preview
```

---

## 🔑 Authentication

- User Login
- JWT Token Generation
- Protected Routes
- Automatic Authorization Header
- Session Persistence using LocalStorage

---

## 🌐 API Integration

The frontend communicates with the Spring Boot backend using Axios.

Example:

```javascript
GET /api/customers
POST /api/auth/login
POST /api/visits
GET /api/profile
```

---

## 📸 Major Modules

### Dashboard

- Statistics
- Quick Actions
- Recent Visits

### Customer Module

- Add Customer
- Edit Customer
- Delete Customer
- Search Customers

### Visit Module

- Check-In
- Check-Out
- Visit History
- Visit Details

### User Profile

- Profile Information
- Logout

---

## 🔒 Security

- JWT Authentication
- Protected Routes
- Axios Authorization Interceptor
- Session Handling
- Secure API Communication

---

## 📱 Responsive Design

Supports

- Desktop
- Laptop
- Tablet
- Mobile Devices

---

## 📋 Available Scripts

```bash
npm run dev
```

Starts development server.

```bash
npm run build
```

Creates production build.

```bash
npm run preview
```

Runs production preview.

```bash
npm run lint
```

Checks code quality.

---

## 🤝 Backend Repository

The frontend works with the TruForce Spring Boot backend.

Backend Features:

- Spring Boot
- Spring Security
- JWT Authentication
- PostgreSQL
- REST APIs
- Role Based Access Control

---

## 👨‍💻 Developer

**Harsh Singh**

Java Full Stack Developer

**Tech Stack**

- Java
- Spring Boot
- React.js
- PostgreSQL
- REST APIs
- JWT Authentication
- Git & GitHub

---

## 📄 License

This project is developed for educational and professional portfolio purposes.

---

## ⭐ Future Enhancements

- Google Maps Integration
- Live Location Tracking
- Push Notifications
- Dark Mode
- Offline Support
- PWA Support
- Report Export (PDF/Excel)
- Advanced Analytics Dashboard
