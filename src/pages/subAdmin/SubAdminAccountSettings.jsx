import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import api from '../../services/api';
import ReturnPoliciesManager from './ReturnPoliciesManager';
import { updateProfile, updatePassword as updatePasswordService } from '../../services/authService';

const EyeIcon = ({ visible }) => (
    visible ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
    )
);

const FieldLabel = ({ children, required }) => (
    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 px-1">
        {children} {required && <span className="text-red-500 normal-case tracking-normal text-xs">*</span>}
    </label>
);

const InputField = ({ type = 'text', value, onChange, placeholder, disabled, rightElement, error }) => (
    <div className="relative">
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full px-4 py-3 rounded-xl border text-sm transition-all outline-none font-medium
                ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-[#DCDCDC]' : 'bg-gray-50/50 border-[#DCDCDC] focus:border-[#FDE31E] focus:ring-4 focus:ring-[#FDE31E]/10 focus:bg-white'}
                ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}
                ${rightElement ? 'pr-12' : ''}
            `}
        />
        {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {rightElement}
            </div>
        )}
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
);

const SaveButton = ({ onClick, loading, disabled, label = 'Save Changes' }) => (
    <button
        onClick={onClick}
        disabled={disabled || loading}
        className="px-8 py-3 bg-[#FDE31E] hover:bg-yellow-400 disabled:bg-gray-100 disabled:text-gray-400 text-black font-black text-xs uppercase rounded-xl transition-all shadow-md  active:scale-95 disabled:cursor-not-allowed"
    >
        {loading ? (
            <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Saving...
            </span>
        ) : label}
    </button>
);

const SuccessBadge = ({ message = 'Saved!' }) => (
    <span className="flex items-center gap-1.5 text-xs text-green-600 font-semibold bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        {message}
    </span>
);

// ── Avatar initials ────────────────────────────────────────────────────────────
const AdminAvatar = ({ name, size = 'lg' }) => {
    const initials = name
        ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
        : 'AD';
    const sizeClass = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-10 h-10 text-sm';
    return (
        <div className={`${sizeClass} rounded-2xl bg-[#FDE31E] border border-[#DCDCDC] flex items-center justify-center font-black text-black shadow-md`}>
            {initials}
        </div>
    );
};

const SubAdminAccountSettings = () => {
    const { currentUser, setCurrentUser } = useAdminAuth();

    // ── Personal info state ───────────────────────────────────────────────────
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [email, setEmail] = useState('');
    const [infoLoading, setInfoLoading] = useState(false);
    const [infoSuccess, setInfoSuccess] = useState(false);
    const [infoErrors, setInfoErrors] = useState({});

    // ── Password state ────────────────────────────────────────────────────────
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pwLoading, setPwLoading] = useState(false);
    const [pwSuccess, setPwSuccess] = useState(false);
    const [pwErrors, setPwErrors] = useState({});

    // ── Refund policy state ───────────────────────────────────────────────────
    const [refundPct, setRefundPct] = useState(70);
    const [refundInput, setRefundInput] = useState('70');
    const [refundLoading, setRefundLoading] = useState(false);
    const [refundFetching, setRefundFetching] = useState(true);
    const [refundSuccess, setRefundSuccess] = useState(false);
    const [refundError, setRefundError] = useState('');

    // ── Pre-fill from currentUser ─────────────────────────────────────────────
    useEffect(() => {
        if (currentUser) {
            setFirstName(currentUser.first_name || '');
            setLastName(currentUser.last_name || '');
            setContactNumber(currentUser.phone || currentUser.contact_number || '');
            setEmail(currentUser.email || '');
        }
    }, [currentUser]);

    // ── Fetch refund policy on mount ──────────────────────────────────────────
    useEffect(() => {
        const fetchPolicy = async () => {
            try {
                const res = await api.get('/admin/settings');
                const pct = res.data?.refund_percentage ?? 70;
                setRefundPct(pct);
                setRefundInput(String(pct));
            } catch {
                // fallback to 70 if fetch fails
            } finally {
                setRefundFetching(false);
            }
        };
        fetchPolicy();
    }, []);

    const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Admin User';
    const role = currentUser?.role === 'admin' ? 'Super Admin' : 'Sub Admin';

    // ── Validate & save personal info ─────────────────────────────────────────
    const handleSaveInfo = async () => {
        const errs = {};
        if (!firstName.trim()) errs.firstName = 'First name is required.';
        if (!email.trim()) errs.email = 'Email is required.';
        else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email.';
        if (Object.keys(errs).length) { setInfoErrors(errs); return; }

        setInfoErrors({});
        setInfoLoading(true);
        try {
            const res = await updateProfile({
                first_name: firstName,
                last_name: lastName,
                contact_number: contactNumber,
                email
            });
            
            if (res.data?.user) {
                setCurrentUser(res.data.user);
                sessionStorage.setItem(`user_${res.data.user.role}`, JSON.stringify(res.data.user));
            }

            setInfoSuccess(true);
            setTimeout(() => setInfoSuccess(false), 3000);
        } catch (err) {
            setInfoErrors({ general: err.response?.data?.message || 'Failed to save. Please try again.' });
        } finally {
            setInfoLoading(false);
        }
    };

    // ── Validate & save password ──────────────────────────────────────────────
    const handleSavePassword = async () => {
        const errs = {};
        if (!currentPw) errs.currentPw = 'Current password is required.';
        if (!newPw) errs.newPw = 'New password is required.';
        else if (newPw.length < 8) errs.newPw = 'Must be at least 8 characters.';
        if (!confirmPw) errs.confirmPw = 'Please confirm your new password.';
        else if (newPw !== confirmPw) errs.confirmPw = 'Passwords do not match.';
        if (Object.keys(errs).length) { setPwErrors(errs); return; }

        setPwErrors({});
        setPwLoading(true);
        try {
            await updatePasswordService({
                current_password: currentPw,
                new_password: newPw,
                new_password_confirmation: confirmPw
            });
            setPwSuccess(true);
            setCurrentPw(''); setNewPw(''); setConfirmPw('');
            setTimeout(() => setPwSuccess(false), 3000);
        } catch (err) {
            setPwErrors({ general: err.response?.data?.message || 'Failed to update password. Please try again.' });
        } finally {
            setPwLoading(false);
        }
    };

    // ── Save refund policy ────────────────────────────────────────────────────
    const handleSaveRefund = async () => {
        const val = Number(refundInput);
        if (!refundInput || isNaN(val) || val < 1 || val > 100) {
            setRefundError('Please enter a valid percentage between 1 and 100.');
            return;
        }
        setRefundError('');
        setRefundLoading(true);
        try {
            await api.post('/admin/settings', { refund_percentage: val });
            setRefundPct(val);
            setRefundSuccess(true);
            setTimeout(() => setRefundSuccess(false), 3000);
        } catch {
            setRefundError('Failed to save. Please try again.');
        } finally {
            setRefundLoading(false);
        }
    };

    const pwStrength = () => {
        if (!newPw) return null;
        if (newPw.length < 6) return { label: 'Weak', color: 'bg-red-400', width: 'w-1/4' };
        if (newPw.length < 8) return { label: 'Fair', color: 'bg-orange-400', width: 'w-2/4' };
        if (newPw.match(/[A-Z]/) && newPw.match(/[0-9]/) && newPw.length >= 10)
            return { label: 'Strong', color: 'bg-green-400', width: 'w-full' };
        return { label: 'Good', color: 'bg-yellow-400', width: 'w-3/4' };
    };
    const strength = pwStrength();

    // Derived refund display values
    const displayPct = Number(refundInput) || 0;
    const retainedPct = 100 - displayPct;
    const isValidPct = displayPct >= 1 && displayPct <= 100;

    return (
        <div className="p-8 bg-white rounded-[40px] border border-[#DCDCDC] min-h-[calc(100vh-2.5rem)] shadow-sm my-5 mr-5 ml-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 mb-5 mt-1">Account Settings</h1>

                {/* ── Profile header card ── */}
                <div className="flex items-center gap-6 bg-gray-50 border border-[#DCDCDC] rounded-3xl px-8 py-6 mb-8">
                    <AdminAvatar name={fullName} size="lg" />
                    <div>
                        <p className="text-xl font-black text-gray-900">{fullName}</p>
                        <p className="text-sm font-bold text-gray-400">{email || '—'}</p>
                        <span className="inline-block mt-3 px-3 py-1 bg-[#FDE31E] text-black text-[10px] font-black uppercase rounded-lg shadow-sm">
                            {role}
                        </span>
                    </div>
                </div>

                {/* ── Personal Information ── */}
                <div className="bg-white border border-[#DCDCDC] rounded-[32px] p-8 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Personal Information</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Update your name, contact, and email</p>
                        </div>
                        {infoSuccess && <SuccessBadge />}
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FieldLabel required>First Name</FieldLabel>
                                <InputField
                                    value={firstName}
                                    onChange={e => { setFirstName(e.target.value); setInfoErrors(p => ({ ...p, firstName: '' })); }}
                                    placeholder="Juan"
                                    error={infoErrors.firstName}
                                />
                            </div>
                            <div>
                                <FieldLabel>Last Name</FieldLabel>
                                <InputField
                                    value={lastName}
                                    onChange={e => setLastName(e.target.value)}
                                    placeholder="Dela Cruz"
                                />
                            </div>
                        </div>

                        <div>
                            <FieldLabel>Contact Number</FieldLabel>
                            <InputField
                                value={contactNumber}
                                onChange={e => setContactNumber(e.target.value)}
                                placeholder="09171234567"
                            />
                        </div>

                        <div>
                            <FieldLabel required>Email Address</FieldLabel>
                            <InputField
                                type="email"
                                value={email}
                                onChange={e => { setEmail(e.target.value); setInfoErrors(p => ({ ...p, email: '' })); }}
                                placeholder="juan@example.com"
                                error={infoErrors.email}
                            />
                        </div>

                        {infoErrors.general && (
                            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{infoErrors.general}</p>
                        )}
                    </div>

                    <div className="flex justify-end mt-8 pt-6 border-t border-[#DCDCDC]">
                        <SaveButton onClick={handleSaveInfo} loading={infoLoading} />
                    </div>
                </div>

                {/* ── Change Password ── */}
                <div className="bg-white border border-[#DCDCDC] rounded-[32px] p-8 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Change Password</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Use a strong password with letters, numbers, and symbols</p>
                        </div>
                        {pwSuccess && <SuccessBadge message="Updated!" />}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <FieldLabel required>Current Password</FieldLabel>
                            <InputField
                                type={showCurrent ? 'text' : 'password'}
                                value={currentPw}
                                onChange={e => { setCurrentPw(e.target.value); setPwErrors(p => ({ ...p, currentPw: '' })); }}
                                placeholder="Enter current password"
                                error={pwErrors.currentPw}
                                rightElement={
                                    <button type="button" onClick={() => setShowCurrent(v => !v)} className="hover:text-gray-600 transition">
                                        <EyeIcon visible={showCurrent} />
                                    </button>
                                }
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FieldLabel required>New Password</FieldLabel>
                                <InputField
                                    type={showNew ? 'text' : 'password'}
                                    value={newPw}
                                    onChange={e => { setNewPw(e.target.value); setPwErrors(p => ({ ...p, newPw: '' })); }}
                                    placeholder="Min. 8 characters"
                                    error={pwErrors.newPw}
                                    rightElement={
                                        <button type="button" onClick={() => setShowNew(v => !v)} className="hover:text-gray-600 transition">
                                            <EyeIcon visible={showNew} />
                                        </button>
                                    }
                                />
                                {strength && (
                                    <div className="mt-2">
                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                                        </div>
                                        <p className={`text-[11px] mt-1 font-medium ${strength.label === 'Weak' ? 'text-red-500' :
                                                strength.label === 'Fair' ? 'text-orange-500' :
                                                    strength.label === 'Good' ? 'text-yellow-600' : 'text-green-600'
                                            }`}>{strength.label}</p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <FieldLabel required>Confirm New Password</FieldLabel>
                                <InputField
                                    type={showConfirm ? 'text' : 'password'}
                                    value={confirmPw}
                                    onChange={e => { setConfirmPw(e.target.value); setPwErrors(p => ({ ...p, confirmPw: '' })); }}
                                    placeholder="Re-enter new password"
                                    error={pwErrors.confirmPw}
                                    rightElement={
                                        <button type="button" onClick={() => setShowConfirm(v => !v)} className="hover:text-gray-600 transition">
                                            <EyeIcon visible={showConfirm} />
                                        </button>
                                    }
                                />
                            </div>
                        </div>

                        {pwErrors.general && (
                            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{pwErrors.general}</p>
                        )}
                    </div>

                    <div className="flex justify-end mt-8 pt-6 border-t border-[#DCDCDC]">
                        <SaveButton
                            onClick={handleSavePassword}
                            loading={pwLoading}
                            disabled={!currentPw && !newPw && !confirmPw}
                            label="Update Password"
                        />
                    </div>
                </div>

                {/* ── Refund Policy ── */}
                <div className="bg-white border border-[#DCDCDC] rounded-[32px] p-8 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Return & Refund Policy</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Set the percentage refunded to customers on approved return requests</p>
                        </div>
                        {refundSuccess && <SuccessBadge />}
                    </div>

                    {refundFetching ? (
                        <div className="flex items-center gap-3 py-6 text-gray-400">
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            <span className="text-sm">Loading policy...</span>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Percentage input */}
                            <div>
                                <FieldLabel required>Refund Percentage</FieldLabel>
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1 max-w-[180px]">
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={refundInput}
                                            onChange={e => {
                                                setRefundInput(e.target.value);
                                                setRefundError('');
                                            }}
                                            className={`w-full px-4 py-3 pr-10 rounded-xl border text-sm font-black text-gray-900 outline-none transition-all
                                                bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-[#FDE31E]/10
                                                ${refundError ? 'border-red-300 focus:border-red-400' : 'border-[#DCDCDC] focus:border-[#FDE31E]'}
                                            `}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">%</span>
                                    </div>

                                    {/* Live split preview pill */}
                                    {isValidPct && (
                                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                                            <span className="px-2.5 py-1 bg-[#FDE31E]/20 text-yellow-700 rounded-lg border border-yellow-200">
                                                {displayPct}% to customer
                                            </span>
                                            <span className="text-gray-300">·</span>
                                            <span className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg border border-gray-200">
                                                {retainedPct}% retained
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {refundError && <p className="mt-1.5 text-xs text-red-500">{refundError}</p>}
                            </div>

                            {/* Visual progress bar */}
                            {isValidPct && (
                                <div className="space-y-1.5">
                                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                                        <div
                                            className="h-full bg-[#FDE31E] transition-all duration-300 rounded-full"
                                            style={{ width: `${displayPct}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest px-0.5">
                                        <span>Customer refund</span>
                                        <span>Store retains</span>
                                    </div>
                                </div>
                            )}

                            {/* Info note */}
                            <div className="flex items-start gap-3 bg-gray-50 border border-[#DCDCDC] rounded-2xl px-4 py-3.5">
                                <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    This percentage applies to all approved return requests. Currently, customers receive{' '}
                                    <strong className="text-gray-700">{refundPct}%</strong> of the item price — the remaining{' '}
                                    <strong className="text-gray-700">{100 - refundPct}%</strong> covers processing and restocking fees.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end mt-8 pt-6 border-t border-[#DCDCDC]">
                        <SaveButton
                            onClick={handleSaveRefund}
                            loading={refundLoading}
                            disabled={refundFetching || !isValidPct}
                            label="Save Policy"
                        />
                    </div>
                </div>

                {/* ── Return Eligibility Policies ── */}
                <ReturnPoliciesManager />

            </div>
        </div>
    );
};

export default SubAdminAccountSettings;