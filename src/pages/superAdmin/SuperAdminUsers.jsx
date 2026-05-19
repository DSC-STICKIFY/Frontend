import React, { useState, useEffect } from 'react';
import editIcon from '../../assets/edit.svg';
import deleteIcon from '../../assets/delete.svg';
import EditUserModal from '../../components/EditUserModal.jsx';
import {
    fetchAllUsers,
    fetchAllEmployees,
    fetchAllSubAdmins,
    deleteUser,
    updateUser,
    addUser
} from '../../services/Employees.js';
import add from '../../assets/add.svg';

import { useAdminAuth } from '../../context/AdminAuthContext';
import { Navigate } from 'react-router-dom';

const SuperAdminUsers = () => {
    const { currentUser } = useAdminAuth();

    // Guard: Only SuperAdmin (role: admin) can access this page
    if (currentUser && currentUser.role !== 'admin') {
        return <Navigate to="/sub-admin-dashboard" replace />;
    }

    const [usersData, setUsersData] = useState([]);
    const [userType, setUserType] = useState('Employees');
    const [loading, setLoading] = useState(true);

    const [showEditModal, setShowEditModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedUser, setSelectedUser] = useState(null);

    // Modal control states
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalTitle, setModalTitle] = useState('');
    const [userToDelete, setUserToDelete] = useState(null);

    const loadUsers = async () => {
        setLoading(true);
        setUsersData([]);
        try {
            let res;
            if (userType === 'Employees') res = await fetchAllEmployees();
            else if (userType === 'SubAdmins') res = await fetchAllSubAdmins();
            else res = await fetchAllUsers();

            const data = res?.data || [];
            setUsersData(data);
        } catch (err) {
            console.error(`Failed to fetch ${userType}:`, err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, [userType]);

    const requestDelete = (user) => {
        setUserToDelete(user);
        setShowConfirmModal(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        try {
            await deleteUser(userToDelete.user_id);
            setUsersData(prev => prev.filter(u => u.user_id !== userToDelete.user_id));
            setShowConfirmModal(false);
            setShowSuccessModal(true);
            setModalMessage("User deleted successfully.");
            setModalTitle("Success");
        } catch (err) {
            console.error("Delete failed:", err);
            setShowConfirmModal(false);
            setShowErrorModal(true);
            setModalMessage("Failed to delete user. Please try again.");
            setModalTitle("Error");
        }
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setModalMode('edit');
        setShowEditModal(true);
    };

    const openAddModal = () => {
        const defaultRole = userType === 'Employees'
            ? 'employee'
            : userType === 'SubAdmins'
                ? 'manager'
                : 'user';

        setSelectedUser({
            role: defaultRole,
            first_name: '',
            last_name: '',
            email: '',
            address: '',
            contact_number: '',
            password: ''
        });
        setModalMode('add');
        setShowEditModal(true);
    };

    const handleSave = async (formData) => {
        try {
            const payload = {
                ...formData,
                role: formData.role || (userType === 'SubAdmins' ? 'manager' : 'employee')
            };

            if (modalMode === 'add') {
                await addUser(payload);
            } else {
                await updateUser(formData.user_id, payload, userType); // ← gi-add ang userType
            }

            setShowEditModal(false);
            setShowSuccessModal(true);
            setModalMessage(modalMode === 'add' ? "New user created successfully!" : "User updated successfully!");
            setModalTitle("Success");

            loadUsers();
        } catch (err) {
            console.error("Save failed:", err);
            const errorMsg = err.response?.data?.message || err.response?.data?.error || "Operation failed.";
            setShowEditModal(false);
            setShowErrorModal(true);
            setModalMessage(`Error: ${errorMsg}`);
            setModalTitle("Error");
        }
    };
    const tableHeaders = {
        Employees: ["ID", "Name", "Email", "Address", "Role", "Contact No."],
        SubAdmins: ["ID", "Name", "Email", "Address", "Role", "Contact No."],
        Customers: ["ID", "Name", "Username", "Email", "Verified", "Date Joined", "Contact No."]
    };

    const renderUserCells = (user) => {
        const userId = user.user_id;
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A';

        const commonCells = (
            <>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">#{userId}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{fullName}</td>
                <td className="px-4 py-3 text-gray-600">{user.email || '-'}</td>
                <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate" title={user.address}>
                    {user.address || '-'}
                </td>
            </>
        );

        if (userType === 'Employees' || userType === 'SubAdmins') {
            return (
                <>
                    {commonCells}
                    <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${user.role === 'admin' ? 'bg-red-100 text-red-700' :
                                user.role === 'manager' ? 'bg-purple-100 text-purple-700' :
                                    user.role === 'staff' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-700'
                            }`}>
                            {user.role || 'employee'}
                        </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.contact_number || '-'}</td>
                </>
            );
        }

        return (
            <>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">#{userId}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{fullName}</td>
                <td className="px-4 py-3 text-gray-600 font-medium">@{user.username || 'n/a'}</td>
                <td className="px-4 py-3 text-gray-600">{user.email || '-'}</td>
                <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${user.email_verified_at ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {user.email_verified_at ? 'Verified' : 'Pending'}
                    </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-3 text-gray-600">{user.contact_number || user.mobile_number || '-'}</td>
            </>
        );
    };

    const showAddButton = userType !== 'Customers';

    return (
        <div className="p-3 bg-white rounded-3xl shadow-md my-5 mr-5 ml-1 min-h-[calc(100vh-2.5rem)] flex flex-col">
            <h1 className="text-2xl font-bold text-gray-900 mb-5 mt-1">User Management</h1>

            <div className="flex justify-between items-center mb-4">
                <select
                    value={userType}
                    onChange={(e) => setUserType(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 cursor-pointer"
                >
                    <option value="Employees">Employees</option>
                    <option value="SubAdmins">Sub-Admins</option>
                    <option value="Customers">Customers</option>
                </select>

                {showAddButton && (
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#FDE31E] hover:bg-yellow-400 transition font-bold">
                        <img src={add} alt="add" className="w-4 h-4" />
                        <span className='text-[13px]'>Add New {userType.slice(0, -1)}</span>
                    </button>
                )}
            </div>




            <div className="flex flex-col w-full overflow-hidden flex-1 rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-6 py-4 bg-gray-50/50 flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-400 uppercase">
                        {loading ? "Syncing database..." : `${usersData.length} ${userType} identified`}
                    </p>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full table-auto border-collapse">
                        <thead className="bg-gray-50/50 sticky top-0 z-10 border-b border-gray-100">
                            <tr>
                                {tableHeaders[userType].map(header => (
                                    <th key={header} className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase">
                                        {header}
                                    </th>
                                ))}
                                <th className="px-6 py-4 text-center text-[10px] font-bold text-gray-400 uppercase">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="10" className="text-center py-20">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-2 border-gray-200 border-t-yellow-500 rounded-full animate-spin" />
                                            <p className="text-xs font-bold text-gray-400 uppercase">Fetching users...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : usersData.length > 0 ? (
                                usersData.map(user => (
                                    <tr key={user.user_id} className="hover:bg-gray-50/50 transition-colors group">
                                        {renderUserCells(user)}
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="p-2 bg-gray-50 hover:bg-yellow-50 border border-gray-100 hover:border-yellow-200 rounded-xl transition-all shadow-sm group/edit"
                                                    title="Edit"
                                                >
                                                    <img src={editIcon} alt="Edit" className="w-4 h-4 opacity-70 group-hover/edit:opacity-100 transition-opacity" />
                                                </button>
                                                <button
                                                    onClick={() => requestDelete(user)}
                                                    className="p-2 bg-gray-50 hover:bg-red-50 border border-gray-100 hover:border-red-200 rounded-xl transition-all shadow-sm group/delete"
                                                    title="Delete"
                                                >
                                                    <img src={deleteIcon} alt="Delete" className="w-4 h-4 opacity-70 group-hover/delete:opacity-100 transition-opacity" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="10" className="text-center py-20">
                                        <p className="font-bold text-gray-400 uppercase">No records found for {userType}.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showEditModal && (
                <EditUserModal
                    user={selectedUser}
                    mode={modalMode}
                    userType={userType}
                    showRoleField={userType === 'SubAdmins'}
                    roleOptions={['admin', 'manager', 'staff']}
                    onClose={() => setShowEditModal(false)}
                    onSave={handleSave}
                />
            )}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(0,0,0,0.4)" }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center text-center">
                        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-green-50 mb-5">
                            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{modalTitle}</h3>
                        <p className="text-gray-500 text-sm mb-6">{modalMessage}</p>
                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="w-full px-6 py-2.5 bg-[#FDE31E] text-sm font-bold rounded-lg hover:bg-yellow-400 transition"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
            {showErrorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(0,0,0,0.4)" }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center text-center">
                        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-50 mb-5">
                            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{modalTitle}</h3>
                        <p className="text-gray-500 text-sm mb-6">{modalMessage}</p>
                        <button
                            onClick={() => setShowErrorModal(false)}
                            className="w-full py-2.5 bg-gray-100 text-sm font-bold rounded-lg hover:bg-gray-200 transition"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {showConfirmModal && userToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(0,0,0,0.4)" }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center text-center">
                        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-amber-50 mb-5">
                            <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Delete</h3>
                        <p className="text-gray-500 text-sm mb-6 px-2">
                            Are you sure you want to delete <span className="font-bold text-gray-800">{userToDelete.first_name} {userToDelete.last_name}</span>? This action is permanent.
                        </p>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-2.5 bg-gray-100 text-sm font-bold rounded-lg hover:bg-gray-200 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminUsers;
