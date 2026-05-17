import React from 'react'

const StoreLocation = () => (
    <div className='w-full shadow-lg mt-3 rounded-2xl overflow-hidden h-[300px] sm:h-[450px] md:h-[600px] lg:h-[800px]'>
        <iframe
            title="StoreLocation"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4708.402222027536!2d125.63287890586673!3d7.0936762798478314!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x32f96d0079ba8b8d%3A0x590873d282b8fa3a!2sDAVAO%20STICKER%20CUSTOM!5e0!3m2!1sen!2sph!4v1763187964945!5m2!1sen!2sph"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
        />
    </div>
);

export default StoreLocation