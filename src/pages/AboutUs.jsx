import React from 'react'
import img1 from '../assets/aboutUsImgIcon/img1.png';
import img2 from '../assets/aboutUsImgIcon/img2.png';
import img3 from '../assets/aboutUsImgIcon/img3.png';
import img4 from '../assets/aboutUsImgIcon/img4.png';
import icon1 from '../assets/aboutUsImgIcon/icon1.svg';
import icon2 from '../assets/aboutUsImgIcon/icon2.svg';
import icon3 from '../assets/aboutUsImgIcon/icon3.svg';
import icon4 from '../assets/aboutUsImgIcon/icon4.svg';
import icon5 from '../assets/aboutUsImgIcon/icon5.png';
import icon6 from '../assets/aboutUsImgIcon/icon6.png';
import icon7 from '../assets/aboutUsImgIcon/icon7.png';
import icon8 from '../assets/aboutUsImgIcon/icon8.png';
import icon9 from '../assets/aboutUsImgIcon/icon9.png';
import icon10 from '../assets/aboutUsImgIcon/icon10.png';
import icon11 from '../assets/aboutUsImgIcon/icon11.png';
import icon12 from '../assets/aboutUsImgIcon/icon12.png';
import icon13 from '../assets/aboutUsImgIcon/icon13.png';

const AboutUs = () => {
  return (
    <>
    
    <div className='relative z-0 min-h-screen w-full text-black bg-[#F1F3F7]'>
        <header className='px-6 md:px-20'>
            <h1 className='text-center mt-10 md:mt-[110px] font-bold text-[25px]'>Davao Sticker Custom</h1>
            <p className='text-center mt-5 text-sm md:text-base'>
                Davao Sticker Custom is a local printing shop specializing in custom stickers, decals, car wraps, signages, graphic services, and personalized giveaways. 
                With creative designs and quality prints, it helps individuals and businesses bring their ideas to life for branding, promotions, or personal use.
            </p>
        </header>
        <div className='mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full px-6 md:px-[65px]'>
            <div className="relative w-full">
                <img src={img1} alt="Our Humble Start"className="rounded-[16px] w-full h-auto object-cover"/>
                <div className="absolute inset-0 flex flex-col justify-end p-3 text-white bg-black/10 rounded-[16px]">
                    <h6 className="flex text-[14px] italic font-semibold">
                        <img src={icon1} alt="icon1" className='pr-1'/>Our Humble Start
                    </h6>
                    <p className="text-sm font-light">Small dreams sparked something big.</p>
                </div>
            </div>
            <div className="relative w-full">
                <img src={img2} alt="Our Humble Start"className="rounded-[16px] w-full h-auto object-cover"/>
                <div className="absolute inset-0 flex flex-col justify-end p-3 text-white bg-black/10 rounded-[16px]">
                    <h6 className="flex text-[14px] italic font-semibold">
                        <img src={icon2} alt="icon1" className='pr-1'/>Passion Turned Purpose
                    </h6>
                    <p className="text-sm font-light">Creativity grew into lasting impact.</p>
                </div>
            </div>
            <div className="relative w-full">
                <img src={img3} alt="Our Humble Start"className="rounded-[16px] w-full h-auto object-cover"/>
                <div className="absolute inset-0 flex flex-col justify-end p-3 text-white bg-black/10 rounded-[16px]">
                    <h6 className="flex text-[14px] italic font-semibold">
                        <img src={icon3} alt="icon1" className='pr-1'/>Growing Through Challenges
                    </h6>
                    <p className="text-sm font-light">Every obstacle shaped our journey.</p>
                </div>
            </div>
            <div className="relative w-full">
                <img src={img4} alt="Our Humble Start"className="rounded-[16px] w-full h-auto object-cover"/>
                <div className="absolute inset-0 flex flex-col justify-end p-3 text-white bg-black/10 rounded-[16px]">
                    <h6 className="flex text-[14px] italic font-semibold">
                        <img src={icon4} alt="icon1" className='pr-1'/>Achieving Today’s Success
                    </h6>
                    <p className="text-sm font-light">Hard work built our proud legacy.</p>
                </div>
            </div>  
        </div>
        <div>
            <h1 className='text-center mt-16 font-bold text-[25px]'>Why Choose DSC?</h1>
            <p className='text-center mt-5'>Davao Sticker Custom delivers creative, high-quality, and reliable prints that bring your ideas to life — fast and flawlessly.</p>
        </div>
        <div className='mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full px-6 sm:px-10 lg:px-20'>
            <div className="relative w-full">
                <div className='bg-white p-8 h-80 rounded-[16px] '>
                    <div className='p-2 bg-[#EAEAEA] rounded-lg w-11 h-11 justify-items-center'>
                        <img src={icon5} alt=""/>
                    </div>
                    <h5 className='font-bold text-lg py-8'>Quality You Can Trust</h5>
                    <p>Premium materials, vibrant colors, and long-lasting prints that bring every design to life.</p>
                </div>
            </div>
            <div className="relative w-full">
                <div className='bg-white p-8 h-80 rounded-[16px] '>
                    <img src={icon6} alt="" className='p-2 bg-[#EAEAEA] rounded-lg'/>
                    <h5 className='font-bold text-lg py-8'>Designs That Stand Out</h5>
                    <p>Our team transforms your ideas into eye-catching designs that capture attention and express your brand’s personality.</p>
                </div>
            </div>
            <div className="relative w-full">
                <div className='bg-white p-8 h-80 rounded-[16px]'>
                    <img src={icon7} alt="" className='p-2 bg-[#EAEAEA] rounded-lg'/>
                    <h5 className='font-bold text-lg py-8'>Fast and Reliable Service</h5>
                    <p>We value your time—expect quick turnaround, dependable results, and a team that genuinely cares about your satisfaction.</p>
                </div>
            </div>
        </div>
    </div>
    <div className='bg-black w-full mt-20 md:mt-50 py-20 px-6 sm:px-10 md:px-20 lg:px-40'>
        <div className='relative md:max-w-6xl mx-auto'>
            <div className="md:absolute md:left-24 md:-top-40 md:w-90 mb-10 md:mb-0">
                <div className='bg-[#343434] text-white p-8 md:h-80 rounded-[16px] border border-gray-500 shadow-xl'>
                    <img src={icon8} alt="" className='p-2 bg-[#535353] rounded-lg h-13 mb-4'/>
                    <h5 className='font-bold text-xl mb-4'>Our Mission</h5>
                    <p className='text-gray-300 leading-relaxed font-light'>To provide high-quality, creative, and affordable printing solutions that help individuals and businesses express their ideas with style and impact.</p>
                </div>
            </div>
            <div className="md:absolute md:right-24 md:-top-40 md:w-90">
                <div className='bg-[#343434] text-white p-8 md:h-80 rounded-[16px] border border-gray-500 shadow-xl'>
                    <img src={icon9} alt="" className='p-2 bg-[#535353] rounded-lg h-13 mb-4'/>
                    <h5 className='font-bold text-xl mb-4'>Our Vision</h5>
                    <p className='text-gray-300 leading-relaxed font-light'>To be the leading custom printing shop in Davao, known for innovation, reliability, and exceptional customer experience.</p>
                </div>
            </div>
        </div>
    </div>
    <div className='min-h-screen w-full text-black bg-[#F1F3F7] py-20 px-6 md:px-[65px]'>
        <div>
            <h1 className='text-center font-bold text-[25px]'>Our Core Values</h1>
            <p className='text-center font-light mt-5 mb-12'>The principles that guide our creativity, quality, and commitment to every design we make.</p>
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 w-full'>
            <div className="relative w-full">
                <div className='bg-white p-8 h-80 rounded-[16px] '>
                    <img src={icon10} alt="" className='p-2 bg-[#EAEAEA] rounded-lg'/>
                    <h5 className='font-bold text-lg py-4'>Creativity</h5>
                    <p>We turn ideas into unique and eye-catching designs that reflect every client’s vision and style.</p>
                </div>
            </div>
            <div className="relative w-full">
                <div className='bg-white p-8 h-80 rounded-[16px] '>
                    <div className='p-2 bg-[#EAEAEA] rounded-lg w-11 h-11 justify-items-center'>
                        <img src={icon5} alt=""/>
                    </div>
                    <h5 className='font-bold text-lg py-4'>Quality</h5>
                    <p>We deliver prints made with premium materials and precise craftsmanship to ensure lasting results.</p>
                </div>
            </div>
            <div className="relative w-full">
                <div className='bg-white p-8 h-80 rounded-[16px]'>
                    <img src={icon11} alt="" className='p-2 bg-[#EAEAEA] rounded-lg'/>
                    <h5 className='font-bold text-lg py-4'>Reliability</h5>
                    <p>We value your time—expect quick turnaround, dependable results, and a team that genuinely cares about your satisfaction.</p>
                </div>
            </div>
            <div className="relative w-full">
                <div className='bg-white p-8 h-80 rounded-[16px]'>
                    <div className='p-2 bg-[#EAEAEA] rounded-lg w-fit'>
                        <img src={icon12} alt="" style={{ transform: 'rotate(-53deg)' }}/>
                    </div>
                    
                    <h5 className='font-bold text-lg py-4'>Innovation</h5>
                    <p>We embrace new tools, techniques, and trends to keep our designs fresh and ahead of the curve.</p>
                </div>
            </div>
            <div className="relative w-full">
                <div className='bg-white p-8 h-80 rounded-[16px]'>
                    <img src={icon13} alt="" className='p-2 bg-[#EAEAEA] rounded-lg'/>
                    <h5 className='font-bold text-lg py-4'>Customer Satisfaction</h5>
                    <p>Your happiness is our top priority, we go the extra mile to make sure every project exceeds expectations.</p>
                </div>
            </div>
        </div>
    </div>
    </>
  )
}

export default AboutUs;