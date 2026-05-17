import React from 'react';
import footLogo from '../assets/footer-logo.png';

const Footer = () => {
    const year = new Date().getFullYear();

    return (
        <div className="bg-black text-white text-sm sm:text-base mt-10">
            <div className="px-4 sm:px-6 md:px-8 lg:px-24 py-12">

                {/* TOP BAR */}
                <div className="flex flex-col md:flex-row gap-6 md:gap-0 justify-between items-start md:items-center border-b border-[#333333] pb-8">
                    <img src={footLogo} alt="Logo" className="h-16 w-auto" />

                    <p className="font-bold mt-2 md:mt-0">
                        Stickify: DSC Printing Services
                    </p>

                    <div className="text-left md:text-right mt-2 md:mt-0">
                        <a 
                            href="tel:+631234567890" 
                            className="font-bold block hover:text-[#FDE31E]"
                        >
                            +63 123 456 7890
                        </a>
                        <a 
                            href="mailto:davaostickercustom@gmail.com" 
                            className="hover:text-[#FDE31E]"
                        >
                            davaostickercustom@gmail.com
                        </a>
                    </div>
                </div>

                {/* MIDDLE GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 border-b border-[#333333] py-8">

                    {/* Navigation */}
                    <div className="font-bold">
                        <a href="/" className="block pb-2 sm:pb-4 hover:text-[#FDE31E]">Home</a>
                        <a href="/services" className="block pb-2 sm:pb-4 hover:text-[#FDE31E]">Services</a>
                        <a href="/about" className="block pb-2 sm:pb-4 hover:text-[#FDE31E]">About Us</a>
                        <a href="/blogs" className="block hover:text-[#FDE31E]">Blogs</a>
                    </div>

                    {/* Open Hours */}
                    <div>
                        <p className="font-bold pb-2 sm:pb-4">Open Hours</p>
                        <p>Monday - Saturday: 8am - 5pm</p>
                    </div>

                    {/* Address (Google Maps Link) */}
                    <div>
                        <p className="font-bold pb-2 sm:pb-4">Address</p>
                        <a
                            href="https://www.google.com/maps/search/?api=1&query=R.+Castillo+St.,+Agdao,+Davao+City"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[#FDE31E]"
                        >
                            R. Castillo St., Agdao, Davao City, PH
                        </a>
                    </div>

                    {/* Social Media */}
                    <div>
                        <p className="font-bold pb-2 sm:pb-4">Follow Us</p>
                        <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="block pb-2 sm:pb-4 hover:text-[#FDE31E]">Facebook</a>
                        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="block pb-2 sm:pb-4 hover:text-[#FDE31E]">Instagram</a>
                        <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="block hover:text-[#FDE31E]">Tiktok</a>
                    </div>
                </div>

                {/* BOTTOM BAR */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-8 py-6">
                    <p>© {year} Davao Sticker Custom. All Rights Reserved.</p>

                    <p>Est. 2021</p>

                    <div className="flex gap-5">
                        <a href="/privacy" className="hover:text-[#FDE31E]">Privacy</a>
                        <a href="/terms" className="hover:text-[#FDE31E]">Terms</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Footer;
