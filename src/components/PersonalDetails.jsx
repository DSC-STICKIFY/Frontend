import React from 'react';

const PersonalDetails = ({ formData, onChange }) => {
    return (
        <div>
            <div className="flex gap-5">
                <div className="text-sm font-medium w-[320px]">

                    <div className="my-3">
                        <p className="mb-1">First Name*</p>
                        <input
                            type="text"
                            name="first_name"
                            value={formData.first_name || ''}
                            onChange={onChange}
                            placeholder="Enter your first name"
                            className="font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full"
                        />
                    </div>

                    <div className="my-3">
                        <p className="mb-1">Last Name*</p>
                        <input
                            type="text"
                            name="last_name"
                            value={formData.last_name || ''}
                            onChange={onChange}
                            placeholder="Enter your last name"
                            className="font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full"
                        />
                    </div>

                    <div className="my-3">
                        <p className="mb-1">Middle Name*</p>
                        <input
                            type="text"
                            name="middle_name"
                            value={formData.middle_name || ''}
                            onChange={onChange}
                            placeholder="Enter your middle name"
                            className="font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full"
                        />
                    </div>

                    <div className="my-3">
                        <p className="mb-1">Date of Birth*</p>
                        <input
                            type="date"
                            name="date_of_birth"
                            value={formData.date_of_birth || ''}
                            onChange={onChange}
                            className="font-normal text-gray-400 border-1 rounded-[6px] border-gray-400 p-2 w-full"
                        />
                    </div>

                    <div className="my-3">
                        <p className="mb-1">Contact No.*</p>
                        <input
                            type="tel"
                            name="contact_number"
                            value={formData.contact_number || ''}
                            onChange={onChange}
                            placeholder="+63 | xxx xxx xxxx"
                            className="font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full"
                        />
                    </div>

                </div>

                <div className="text-sm font-medium w-[320px]">

                    <div className="my-3">
                        <p className="mb-1">Street*</p>
                        <input
                            type="text"
                            name="street"
                            value={formData.street || ''}
                            onChange={onChange}
                            placeholder="e.g R. castillo"
                            className="font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full"
                        />
                    </div>

                    <div className="my-3">
                        <p className="mb-1">Barangay*</p>
                        <input
                            type="text"
                            name="barangay"
                            value={formData.barangay || ''}
                            onChange={onChange}
                            placeholder="e.g Ubalde"
                            className="font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full"
                        />
                    </div>

                    <div className="my-3">
                        <p className="mb-1">Block & Lot*</p>
                        <div className="flex gap-3 w-70">
                            <input
                                type="text"
                                name="block"
                                value={formData.block || ''}
                                onChange={onChange}
                                placeholder="e.g Blk 6"
                                className="font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full"
                            />
                            <input
                                type="text"
                                name="lot"
                                value={formData.lot || ''}
                                onChange={onChange}
                                placeholder="e.g Lot 33"
                                className="font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full"
                            />
                        </div>
                    </div>

                    <div className="my-3">
                        <p className="mb-1">City*</p>
                        <input
                            type="text"
                            name="city"
                            value={formData.city || ''}
                            onChange={onChange}
                            placeholder="e.g Davao City"
                            className="font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full"
                        />
                    </div>

                    <div className="my-3">
                        <p className="mb-1">Province*</p>
                        <input
                            type="text"
                            name="province"
                            value={formData.province || ''}
                            onChange={onChange}
                            placeholder="e.g Davao del Sur"
                            className="font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full"
                        />
                    </div>

                </div>

                <div className="text-sm font-medium w-[320px]">

                    <div className="my-3">
                        <p className="mb-1">Zip Code*</p>
                        <input
                            type="text"
                            name="zipC"
                            value={formData.zipC || ''}
                            onChange={onChange}
                            className="font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full"
                        />
                    </div>

                    <div className="my-3">
                        <p className="mb-1">Country*</p>
                        <input
                            type="text"
                            name="country"
                            value={formData.country || ''}
                            onChange={onChange}
                            placeholder="Philippines"
                            className="font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full"
                        />
                    </div>

                    <div className="my-3">
                        <p className="mb-1">Email*</p>
                        <input
                            type="email"
                            name="email"
                            value={formData.email || ''}
                            onChange={onChange}
                            placeholder="e.g johndoe2001@gmail.com"
                            className="font-normal border-1 rounded-[6px] border-gray-400 p-2 w-full"
                        />
                    </div>

                </div>
            </div>
        </div>
    );
};

export default PersonalDetails;
