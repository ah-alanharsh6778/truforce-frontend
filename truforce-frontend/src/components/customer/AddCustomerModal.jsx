import { useState, useEffect } from "react";

const initialForm = {
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    latitude: "",
    longitude: ""
};

export default function AddCustomerModal({
                                             isOpen,
                                             onClose,
                                             onSubmit,
                                             editData
                                         }) {

    const [form, setForm] = useState(initialForm);

    useEffect(() => {
        const t = setTimeout(() => {
            if (editData) {
                setForm({
                    name: editData.name || "",
                    contactPerson: editData.contactPerson || "",
                    phone: editData.phone || "",
                    email: editData.email || "",
                    address: editData.address || "",
                    city: editData.city || "",
                    state: editData.state || "",
                    latitude: editData.latitude || "",
                    longitude: editData.longitude || ""
                });
            } else {
                setForm(initialForm);
            }
        }, 0);
        return () => clearTimeout(t);
    }, [editData]);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            ...form,
            latitude: form.latitude ? Number(form.latitude) : null,
            longitude: form.longitude ? Number(form.longitude) : null,
            createdBy: localStorage.getItem("userId")
        };

        await onSubmit(payload);
        setForm(initialForm);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm transition-opacity">

            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-full">

                {/* MODAL HEADER */}
                <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {editData ? "Edit Customer Details" : "Add New Customer"}
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {editData
                                ? "Update the information for this client."
                                : "Fill in the details to register a new client."}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* MODAL BODY (Scrollable) */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <form id="customerForm" onSubmit={handleSubmit} className="space-y-5">

                        {/* Section: Basic Info */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                                Basic Information
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Company / Customer Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        placeholder="e.g. Acme Corporation"
                                        required
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Contact Person
                                        </label>
                                        <input
                                            type="text"
                                            name="contactPerson"
                                            value={form.contactPerson}
                                            onChange={handleChange}
                                            placeholder="e.g. John Doe"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Phone Number
                                        </label>
                                        <input
                                            type="text"
                                            name="phone"
                                            value={form.phone}
                                            onChange={handleChange}
                                            placeholder="e.g. +91 9876543210"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="e.g. contact@acme.com"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: Location Info */}
                        <div className="pt-2">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                                Location Details
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Address
                                    </label>
                                    <textarea
                                        name="address"
                                        value={form.address}
                                        onChange={handleChange}
                                        placeholder="Enter complete street address..."
                                        rows="2"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            City
                                        </label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={form.city}
                                            onChange={handleChange}
                                            placeholder="e.g. Mumbai"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            State
                                        </label>
                                        <input
                                            type="text"
                                            name="state"
                                            value={form.state}
                                            onChange={handleChange}
                                            placeholder="e.g. Maharashtra"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Latitude <span className="text-gray-400 font-normal">(Optional)</span>
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            name="latitude"
                                            value={form.latitude}
                                            onChange={handleChange}
                                            placeholder="e.g. 19.0760"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Longitude <span className="text-gray-400 font-normal">(Optional)</span>
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            name="longitude"
                                            value={form.longitude}
                                            onChange={handleChange}
                                            placeholder="e.g. 72.8777"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                {/* MODAL FOOTER (Fixed at bottom) */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        form="customerForm"
                        type="submit"
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-blue-500/30"
                    >
                        {editData ? "Update Customer" : "Save Customer"}
                    </button>
                </div>

            </div>
        </div>
    );
}