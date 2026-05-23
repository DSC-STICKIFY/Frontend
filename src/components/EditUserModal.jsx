import React, { useState, useEffect } from "react";

const EditUserModal = ({ user, onClose, onSave, mode = "edit", userType }) => {
    const [formData, setFormData] = useState({
        user_id: "",
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        role: "",
        contact_number: "",
        address: "",
    });

    useEffect(() => {
        if (mode === "edit" && user) {
            setFormData({
                user_id: user.user_id ?? user.sub_admin_id ?? user.employee_id,
                first_name: user.first_name || "",
                last_name: user.last_name || "",
                email: user.email || "",
                password: "",
                role: user.role || "user",
                contact_number: user.contact_number || user.mobile_number || "",
                address: user.address || "",
            });
        } else if (mode === "add") {
            let defaultRole = "";
            if (userType === "Employees") defaultRole = "Staff";
            else if (userType === "SubAdmins") defaultRole = "subadmin";

            setFormData({
                user_id: "",
                first_name: "",
                last_name: "",
                email: "",
                password: "",
                role: defaultRole,
                contact_number: "",
                address: "",
            });
        }
    }, [user, mode, userType]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            return newData;
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const dataToSave = { ...formData };
        // If it's a subadmin, we don't need the role field according to the user request
        if (userType === "SubAdmins") {
            delete dataToSave.role;
        }

        onSave(dataToSave);
    };

    const typeDisplay = userType === "Employees" ? "Employee" :
                       userType === "SubAdmins" ? "Sub-Admin" : "User";

    const modalTitle = mode === "add"
        ? `Add New ${typeDisplay}`
        : `Edit ${typeDisplay}`;

    const isEmployee = userType === "Employees";
    const isSubAdmin = userType === "SubAdmins";

    return (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 transition-all duration-300">
            <div className="bg-white border border-gray-200 p-6 rounded-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-5 text-gray-800 tracking-tight">
                    {modalTitle}
                </h2>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-600 uppercase">First Name</label>
                            <input
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                required
                                className="bg-white/50 border border-gray-300 p-2 rounded w-full focus:outline-blue-500 focus:bg-white transition"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-600 uppercase">Last Name</label>
                            <input
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                required
                                className="bg-white/50 border border-gray-300 p-2 rounded w-full focus:outline-blue-500 focus:bg-white transition"
                            />
                        </div>
                    </div>



                    {/* Role for Employees */}
                    {isEmployee && (
                        <div>
                            <label className="text-xs font-bold text-gray-600 uppercase">
                                Role <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                required
                                className="bg-white/50 border border-gray-300 p-2 rounded w-full focus:outline-blue-500 focus:bg-white transition"
                            >
                                <option value="">Select Role</option>
                                <option value="Staff">Staff</option>
                                <option value="Artist">Artist</option>
                                <option value="Customer Service">Customer Service</option>
                            </select>
                        </div>
                    )}

                    {/* Email and Password - Conditional for Employees (Staff, Artists and CS require login), always for others */}
                    {(!isEmployee || ["Artist", "Customer Service", "Staff"].includes(formData.role)) && (
                        <>
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="text-xs font-bold text-gray-600 uppercase">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="bg-white/50 border border-gray-300 p-2 rounded w-full focus:outline-blue-500 focus:bg-white transition"
                                />
                            </div>

                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="text-xs font-bold text-gray-600 uppercase">
                                    {mode === "add" ? "Set Login Password *" : "Update Password (Optional)"}
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required={mode === "add"}
                                    placeholder={mode === "edit" ? "Leave blank to keep current" : ""}
                                    className="bg-white/50 border border-gray-300 p-2 rounded w-full focus:outline-blue-500 focus:bg-white transition"
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="text-xs font-bold text-gray-600 uppercase">Contact No.</label>
                        <input
                            name="contact_number"
                            value={formData.contact_number}
                            onChange={handleChange}
                            className="bg-white/50 border border-gray-300 p-2 rounded w-full focus:outline-blue-500 focus:bg-white transition"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-600 uppercase">Address</label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="bg-white/50 border border-gray-300 p-2 rounded w-full h-20 resize-none focus:outline-blue-500 focus:bg-white transition"
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 text-gray-700 bg-white/50 border border-gray-300 rounded hover:bg-white hover:shadow-md transition font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 bg-[#FFE100] rounded hover:bg-[#E4C900] hover:shadow-lg transition font-medium"
                        >
                            {mode === "add" ? "Create" : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditUserModal;
