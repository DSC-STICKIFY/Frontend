import React from "react";

const CustDBProductsLayout = ({ children }) => {
    return (
        <div className="p-3 m-2 rounded-xl sm:p-4 sm:m-2 sm:rounded-2xl lg:p-4 lg:m-2 lg:rounded-2xl bg-white shadow-sm">
            {children}
        </div>
    );
};

export default CustDBProductsLayout;