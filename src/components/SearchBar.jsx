import React from 'react';
import searchB from '../assets/search.svg';
import filter from '../assets/filter.svg';

const SearchBar = ({ searchText, setSearchText }) => {
    return (
        <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3 sm:gap-4 m-5 sm:m-8">
            {/* Search Input */}
            <div className="flex items-center border border-[#5A5A5A] rounded-lg h-10 w-full sm:w-[550px] px-4 sm:px-5">
                <input
                    type="text"
                    placeholder="Search products and services"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    className="flex-grow bg-transparent outline-none text-gray-700 placeholder-gray-500 text-sm sm:text-base"
                />
                <img src={searchB} alt="Search Icon" className="h-5 w-5 ml-2 cursor-pointer" />
            </div>

            {/* Filter Icon */}
            <img
                src={filter}
                alt="Filter Icon"
                className="h-5 w-5 self-center sm:self-auto cursor-pointer"
            />
        </div>
    );
};

export default SearchBar;