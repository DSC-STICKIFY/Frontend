import React, { useState } from 'react';

const AccountSetup = ({ formData, onChange }) => {
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;

        onChange(e);

        if (name === 'password' || name === 'cPassword') {
            const newPassword = name === 'password' ? value : formData.password;
            const newCPassword = name === 'cPassword' ? value : formData.cPassword;


            if (newPassword.length < 8) {
                setError('Password must be at least 8 characters long');
            } else if (newPassword && newCPassword && newPassword !== newCPassword) {
                setError('Passwords do not match');
            } else {
                setError('');
            }
        }
    };

    return (
        <div className="flex justify-center mx-auto">
            <div className="flex gap-5">
                <div className="text-sm font-medium w-[320px] mb-[95px]">


                    <div className="my-3">
                        <p className="mb-1">Email*</p>
                        <input
                            type="text"
                            name="email"
                            value={formData.email}
                            onChange={onChange}
                            placeholder="Enter your email"
                            className="font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full"
                        />

                    </div>


                    <div className="my-3">
                        <p className="mb-1">Password*</p>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            className="font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full"
                        />
                    </div>

                    <div className="text-gray-400 font-normal">
                        <p>Minimum of 8 characters</p>
                        <p>Must contain alphanumeric characters</p>
                    </div>

                    <div className="my-3">
                        <p className="mb-1">Confirm Password*</p>
                        <input
                            type="password"
                            name="cPassword"
                            value={formData.cPassword}
                            onChange={handleChange}
                            placeholder="Confirm your password"
                            className="font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full"
                        />
                    </div>


                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>
            </div>
        </div>
    );
};

export default AccountSetup;
