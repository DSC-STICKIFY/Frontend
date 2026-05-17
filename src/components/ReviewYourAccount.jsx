
import React, { useState } from 'react';
import hide from '../assets/hide.svg'
import show from '../assets/show.svg'

const ReviewYourAccount = ({ formData }) => {
    const [showPassword, setShowPassword] = useState(false);
    return (
        <div>
            <p className='text-gray-400 text-[14px] font-medium'>Personal Details</p>
            <div className='flex gap-5'>
                
                <div className='text-sm font-medium w-[320px]'>
                    <div className='my-3'>
                        <p className='mb-1'>First Name*</p>
                        <input
                            type="text"
                            name='fName'
                            value={formData.first_name}
                            readOnly
                            className='font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full bg-gray-100 cursor-not-allowed'
                        />
                    </div>
                    <div className='my-3'>
                        <p className='mb-1'>Last Name*</p>
                        <input
                            type="text"
                            name='lName'
                            value={formData.last_name}
                            readOnly
                            className='font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full bg-gray-100 cursor-not-allowed'
                        />
                    </div>
                    <div className='my-3'>
                        <p className='mb-1'>Middle Name*</p>
                        <input
                            type="text"
                            name='mName'
                            value={formData.middle_name}
                            readOnly
                            className='font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full bg-gray-100 cursor-not-allowed'
                        />
                    </div>
                    <div className='my-3'>
                        <p className='mb-1'>Date of Birth*</p>
                        <input
                            type="date"
                            name='dob'
                            value={formData.date_of_birth}
                            readOnly
                            className='font-normal text-gray-400 border-1 rounded-[6px] border-gray-400 p-2 w-full bg-gray-100 cursor-not-allowed'
                        />
                    </div>
                    <div className='my-3'>
                        <p className='mb-1'>Contact No.*</p>
                        <input
                            type="tel"
                            name='contact_number'
                            value={formData.contact_number}
                            readOnly
                            className='font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full bg-gray-100 cursor-not-allowed'
                        />
                    </div>
                </div>

                <div className='text-sm font-medium w-[320px]'>
                    <div className='my-3'>
                        <p className='mb-1'>Street*</p>
                        <input
                            type="text"
                            name='street'
                            value={formData.street}
                            readOnly
                            className='font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full bg-gray-100 cursor-not-allowed'
                        />
                    </div>
                    <div className='my-3'>
                        <p className='mb-1'>Barangay*</p>
                        <input
                            type="text"
                            name='barangay'
                            value={formData.barangay}
                            readOnly
                            className='font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full bg-gray-100 cursor-not-allowed'
                        />
                    </div>
                    <div className='my-3'>
                        <p className='mb-1'>Block & Lot*</p>
                        <div className='flex gap-3 w-70'>
                            <input
                            type="text"
                            name='block'
                            value={formData.block}
                            readOnly
                            className='font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full bg-gray-100 cursor-not-allowed'
                            />
                            <input
                            type="text"
                            name='lot'
                            value={formData.lot}
                            readOnly
                            className='font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full bg-gray-100 cursor-not-allowed'
                            />

                        </div>
                        
                    </div>
                    <div className='my-3'>
                        <p className='mb-1'>City*</p>
                        <input
                            type="text"
                            name='city'
                            value={formData.city}
                            readOnly
                            className='font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full bg-gray-100 cursor-not-allowed'
                        />
                    </div>
                    <div className='my-3'>
                        <p className='mb-1'>Province*</p>
                        <input
                            type="text"
                            name='province'
                            value={formData.province}
                            readOnly
                            className='font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full bg-gray-100 cursor-not-allowed'
                        />
                    </div>
                </div>

                <div className='text-sm font-medium w-[320px]'>
                    <div className='my-3'>
                        <p className='mb-1'>Zip Code*</p>
                        <input
                            type="text"
                            name='zipC'
                            value={formData.zipC}
                            readOnly
                            className='font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full bg-gray-100 cursor-not-allowed'
                        />
                    </div>
                    <div className='my-3'>
                        <p className='mb-1'>Country*</p>
                        <input
                            type="text"
                            name='country'
                            value={formData.country}
                            readOnly
                            className='font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full bg-gray-100 cursor-not-allowed'
                        />
                    </div>

                    <p className='text-gray-400 text-[14px] pt-5'>Account Setup</p>
                    <div className='my-3'>
                        <p className='mb-1'>Email*</p>
                        <input
                            type="text"
                            name='email'
                            value={formData.email}
                            readOnly
                            className='font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full bg-gray-100 cursor-not-allowed'
                        />
                    </div>

                    <div className='my-3 relative'>
                        <p className='mb-1'>Password*</p>
                        <input
                            type={showPassword ? "text" : "password"}
                            name='password'
                            value={formData.password}
                            readOnly
                            className='font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full bg-gray-100 cursor-not-allowed'
                        />
                        <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        >
                        <img src={showPassword ? show : hide} alt="toggle password visibility" className="w-5 h-5 flex mt-6 cursor-pointer" />
                        </button>
                    </div>

                 
                </div>
            </div>
        </div>
    )
}

export default ReviewYourAccount
