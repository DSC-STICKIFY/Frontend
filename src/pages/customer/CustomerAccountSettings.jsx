import { useState, useEffect } from "react";
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/CustomerAuthContext';
import {
    fetchVerificationStatus,
    resendVerificationEmail,
    updateProfile,
    updatePassword,
    deleteAccount,
} from "../../services/authService";
import toast from 'react-hot-toast';

const CustomerAccountSettings = () => {
    const location = useLocation();
    const { currentUser, setCurrentUser, logout } = useAuth();

    // Verification
    const [verified, setVerified] = useState(null);
    const [resending, setResending] = useState(false);
    const [resendMsg, setResendMsg] = useState("");
    const [resendType, setResendType] = useState("success");
    const [lastSent, setLastSent] = useState(null);
    const [receivePromo, setReceivePromo] = useState(false);

    // Edit profile
    const [editOpen, setEditOpen] = useState(location.state?.edit || false);
    const [firstName, setFirstName] = useState(currentUser?.first_name || "");
    const [lastName, setLastName] = useState(currentUser?.last_name || "");
    const [email, setEmail] = useState(currentUser?.email || "");
    const [contactNumber, setContactNumber] = useState(currentUser?.contact_number || "");
    const [address, setAddress] = useState(currentUser?.address || "");
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(currentUser?.profile_image ? `${import.meta.env.VITE_API_URL}/storage/${currentUser.profile_image}` : null);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState("");
    const [profileMsgType, setProfileMsgType] = useState("success");

    // Change password
    const [pwdOpen, setPwdOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [pwdSaving, setPwdSaving] = useState(false);
    const [pwdMsg, setPwdMsg] = useState("");
    const [pwdMsgType, setPwdMsgType] = useState("success");
    const [pwdStrength, setPwdStrength] = useState(0);

    // Delete account
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [deleteMsg, setDeleteMsg] = useState("");
    const [deleteMsgType, setDeleteMsgType] = useState("success");

    const fetchStatus = () => {
        fetchVerificationStatus()
            .then((res) => {
                setVerified(res.data?.verified);
                setLastSent(res.data?.last_verification_sent_at);
                setReceivePromo(res.data?.receive_promotional_emails);
            })
            .catch(() => setVerified(null));
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    // Listen for verification success from other tabs
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === "email_verified_success") {
                fetchStatus();
                toast.success("Email verified successfully!");
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    // Sync form fields if currentUser changes
    useEffect(() => {
        setFirstName(currentUser?.first_name || "");
        setLastName(currentUser?.last_name || "");
        setEmail(currentUser?.email || "");
        setContactNumber(currentUser?.contact_number || "");
        setAddress(currentUser?.address || "");
        if (currentUser?.profile_image) {
            setImagePreview(`${import.meta.env.VITE_API_URL}/storage/${currentUser.profile_image}`);
        } else {
            setImagePreview(null);
        }
    }, [currentUser]);

    const fullName =
        [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(" ") ||
        "Customer";

    const initials = fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    // ─── Password strength ───────────────────────────────────────────────────
    const calcStrength = (val) => {
        let score = 0;
        if (val.length >= 8) score++;
        if (/[A-Z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;
        return score;
    };

    const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];
    const strengthColors = ["", "#E24B4A", "#EF9F27", "#639922", "#1D9E75"];

    const handleNewPasswordChange = (val) => {
        setNewPassword(val);
        setPwdStrength(calcStrength(val));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    // ─── Resend verification ─────────────────────────────────────────────────
    const handleResend = async () => {
        setResending(true);
        setResendMsg("");
        try {
            const res = await resendVerificationEmail();
            setResendMsg(res.data?.message || "Verification email sent!");
            setResendType("success");
        } catch (err) {
            setResendMsg(err.response?.data?.message || "Failed to resend. Try again.");
            setResendType("error");
        } finally {
            setResending(false);
        }
    };

    // ─── Update profile ──────────────────────────────────────────────────────
    const handleSaveProfile = async () => {
        if (!firstName.trim() && !lastName.trim()) {
            setProfileMsg("Name cannot be empty.");
            setProfileMsgType("error");
            return;
        }
        if (!email.trim() || !email.includes("@")) {
            setProfileMsg("Enter a valid email address.");
            setProfileMsgType("error");
            return;
        }

        setProfileSaving(true);
        setProfileMsg("");

        try {
            const formData = new FormData();
            formData.append("first_name", firstName);
            formData.append("last_name", lastName);
            formData.append("email", email);
            formData.append("contact_number", contactNumber);
            formData.append("address", address);
            if (imageFile) {
                formData.append("profile_image", imageFile);
            }

            const res = await updateProfile(formData);
            const updatedUser = res.data?.user || { ...currentUser, first_name: firstName, last_name: lastName, email, contact_number: contactNumber, address: address };
            
            // Update context and storage
            setCurrentUser(updatedUser);
            sessionStorage.setItem("user_user", JSON.stringify(updatedUser));
            
            setProfileMsg("Profile updated successfully.");
            setProfileMsgType("success");
            setEditOpen(false);
            setImageFile(null);
        } catch (err) {
            setProfileMsg(err.response?.data?.message || "Failed to update profile.");
            setProfileMsgType("error");
        } finally {
            setProfileSaving(false);
        }
    };

    // ─── Change password ─────────────────────────────────────────────────────
    const handleChangePassword = async () => {
        if (!currentPassword) {
            setPwdMsg("Enter your current password.");
            setPwdMsgType("error");
            return;
        }
        if (newPassword.length < 8) {
            setPwdMsg("New password must be at least 8 characters.");
            setPwdMsgType("error");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPwdMsg("Passwords do not match.");
            setPwdMsgType("error");
            return;
        }

        setPwdSaving(true);
        setPwdMsg("");
        try {
            await updatePassword({ current_password: currentPassword, new_password: newPassword });
            setPwdMsg("Password updated successfully.");
            setPwdMsgType("success");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setPwdStrength(0);
            setPwdOpen(false);
        } catch (err) {
            setPwdMsg(err.response?.data?.message || "Failed to update password.");
            setPwdMsgType("error");
        } finally {
            setPwdSaving(false);
        }
    };

    // ─── Delete account ──────────────────────────────────────────────────────
    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== "DELETE") return;

        setDeleting(true);
        setDeleteMsg("");
        try {
            await deleteAccount();
            logout();
        } catch (err) {
            setDeleteMsg(err.response?.data?.message || "Failed to delete account. Try again.");
            setDeleteMsgType("error");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="p-5 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h1>

            {/* ── Profile Card ────────────────────────────────────────────── */}
            <div className="border border-gray-200 rounded-2xl px-6 py-5 mb-5 relative overflow-hidden">
                <div className="flex items-center gap-5 mb-4">
                    <div className="relative group">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center font-black text-black text-2xl shadow-md flex-shrink-0 overflow-hidden border-2 border-white">
                            {imagePreview ? (
                                <img 
                                    src={imagePreview} 
                                    alt="Profile" 
                                    className="w-full h-full object-cover" 
                                    onError={() => setImagePreview(null)}
                                />
                            ) : (
                                initials
                            )}
                        </div>
                        {editOpen && (
                            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                            </label>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-lg font-bold text-gray-900">{fullName}</p>
                        <p className="text-sm text-gray-500 truncate">{currentUser?.email || "—"}</p>
                        <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                            Customer
                        </span>
                    </div>
                    <button
                        onClick={() => setEditOpen((v) => !v)}
                        className="ml-auto text-sm font-semibold text-gray-700 border border-gray-300 rounded-xl px-4 py-1.5 hover:bg-gray-50 transition"
                    >
                        {editOpen ? "Cancel" : "Edit"}
                    </button>
                </div>

                {editOpen && (
                    <div className="border-t border-gray-100 pt-5">
                        <p className="text-sm font-semibold text-gray-700 mb-3">Edit profile</p>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">First name</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Last name</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs text-gray-500 mb-1">Email address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>
                        <div className="mb-3">
                            <label className="block text-xs text-gray-500 mb-1">Contact number</label>
                            <input
                                type="text"
                                value={contactNumber}
                                onChange={(e) => setContactNumber(e.target.value)}
                                placeholder="e.g. 09123456789"
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs text-gray-500 mb-1">Address</label>
                            <textarea
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Enter your full address"
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black h-20 resize-none"
                            />
                        </div>
                        {profileMsg && (
                            <p className={`text-sm mb-3 font-medium ${profileMsgType === "success" ? "text-green-600" : "text-red-500"}`}>
                                {profileMsg}
                            </p>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveProfile}
                                disabled={profileSaving}
                                className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                {profileSaving ? "Saving..." : "Save changes"}
                            </button>
                            <button
                                onClick={() => { setEditOpen(false); setProfileMsg(""); }}
                                className="px-4 py-2 border border-gray-200 text-sm font-semibold rounded-xl hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Email Verification ──────────────────────────────────────── */}
            <div className="border border-gray-200 rounded-2xl px-6 py-5 mb-5">
                <h2 className="text-base font-bold text-gray-900 mb-1">Email Verification</h2>
                <p className="text-xs text-gray-400 mb-4">
                    Verify your email to access all features like checkout and orders.
                </p>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <p className="text-sm text-gray-600 mb-1">
                            Email: <span className="font-medium">{currentUser?.email || "—"}</span>
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm">Status:</span>
                                {verified === null ? (
                                    <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                                        <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                                        Checking...
                                    </div>
                                ) : verified ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-100">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                        VERIFIED
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-100">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        NOT VERIFIED
                                    </div>
                                )}
                            </div>
                            {lastSent && !verified && (
                                <p className="text-xs text-gray-400 italic">
                                    Last verification email sent: {new Date(lastSent).toLocaleString()}
                                </p>
                            )}
                        </div>
                    </div>
                    {verified === false && (
                        <button
                            onClick={handleResend}
                            disabled={resending}
                            className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                        >
                            {resending && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                            {resending ? "Sending..." : "Resend Verification Email"}
                        </button>
                    )}
                </div>
                {resendMsg && (
                    <p className={`mt-3 text-sm font-medium ${resendType === "success" ? "text-green-600" : "text-red-500"}`}>
                        {resendMsg}
                    </p>
                )}
            </div>

            {/* ── Notification Preferences ────────────────────────────────── */}
            <div className="border border-gray-200 rounded-2xl px-6 py-5 mb-5">
                <h2 className="text-base font-bold text-gray-900 mb-1">Notification Preferences</h2>
                <p className="text-xs text-gray-400 mb-4">
                    Choose what updates you'd like to receive via email.
                </p>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-gray-800">Promotional Emails</p>
                        <p className="text-xs text-gray-500">Receive updates about new products, discounts, and giveaways.</p>
                    </div>
                    <button 
                        onClick={async () => {
                            const newVal = !receivePromo;
                            setReceivePromo(newVal);
                            try {
                                await updateProfile({ receive_promotional_emails: newVal ? 1 : 0 });
                                toast.success("Preferences updated!");
                            } catch (err) {
                                setReceivePromo(!newVal);
                                toast.error("Failed to update preferences.");
                            }
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${receivePromo ? 'bg-yellow-400' : 'bg-gray-200'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${receivePromo ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            {/* ── Change Password ─────────────────────────────────────────── */}
            <div className="border border-gray-200 rounded-2xl px-6 py-5 mb-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 mb-0.5">Password</h2>
                        <p className="text-xs text-gray-400">Keep your account secure with a strong password.</p>
                    </div>
                    <button
                        onClick={() => setPwdOpen((v) => !v)}
                        className="text-sm font-semibold text-gray-700 border border-gray-300 rounded-xl px-4 py-1.5 hover:bg-gray-50 transition"
                    >
                        {pwdOpen ? "Cancel" : "Change"}
                    </button>
                </div>

                {pwdOpen && (
                    <div className="border-t border-gray-100 pt-5 mt-4">
                        <div className="mb-3">
                            <label className="block text-xs text-gray-500 mb-1">Current password</label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>
                        <div className="mb-3">
                            <label className="block text-xs text-gray-500 mb-1">New password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => handleNewPasswordChange(e.target.value)}
                                placeholder="••••••••"
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            />
                            {newPassword && (
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-200"
                                            style={{
                                                width: `${pwdStrength * 25}%`,
                                                backgroundColor: strengthColors[pwdStrength],
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium" style={{ color: strengthColors[pwdStrength] }}>
                                        {strengthLabels[pwdStrength]}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs text-gray-500 mb-1">Confirm new password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>
                        {pwdMsg && (
                            <p className={`text-sm mb-3 font-medium ${pwdMsgType === "success" ? "text-green-600" : "text-red-500"}`}>
                                {pwdMsg}
                            </p>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={handleChangePassword}
                                disabled={pwdSaving}
                                className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                {pwdSaving ? "Updating..." : "Update password"}
                            </button>
                            <button
                                onClick={() => { setPwdOpen(false); setPwdMsg(""); }}
                                className="px-4 py-2 border border-gray-200 text-sm font-semibold rounded-xl hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Delete Account ──────────────────────────────────────────── */}
            <div className="border border-red-200 rounded-2xl px-6 py-5">
                <h2 className="text-base font-bold text-red-600 mb-1">Danger zone</h2>
                <p className="text-xs text-gray-400 mb-4">
                    Permanently delete your account and all associated data. This cannot be undone.
                </p>
                <button
                    onClick={() => setDeleteOpen((v) => !v)}
                    className="px-4 py-2 border border-red-300 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 transition"
                >
                    {deleteOpen ? "Cancel" : "Delete account"}
                </button>

                {deleteOpen && (
                    <div className="border-t border-red-100 pt-5 mt-4">
                        <p className="text-sm text-gray-600 mb-3">
                            Type <span className="font-bold text-gray-900">DELETE</span> to confirm:
                        </p>
                        <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Type DELETE here"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-400"
                        />
                        {deleteMsg && (
                            <p className={`text-sm mb-3 font-medium ${deleteMsgType === "success" ? "text-green-600" : "text-red-500"}`}>
                                {deleteMsg}
                            </p>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmText !== "DELETE" || deleting}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >
                                {deleting ? "Deleting..." : "Confirm delete"}
                            </button>
                            <button
                                onClick={() => { setDeleteOpen(false); setDeleteConfirmText(""); setDeleteMsg(""); }}
                                className="px-4 py-2 border border-gray-200 text-sm font-semibold rounded-xl hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerAccountSettings;