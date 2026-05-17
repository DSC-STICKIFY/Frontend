import React, { useState } from "react";

const QuantitySelector = ({ initial = 1, min = 1, max = 99, onChange }) => {
    const [quantity, setQuantity] = useState(initial);

    const increment = () => {
        if (quantity < max) {
            setQuantity(prev => {
                const newQty = prev + 1;
                onChange?.(newQty);
                return newQty;
            });
        }
    };

    const decrement = () => {
        if (quantity > min) {
            setQuantity(prev => {
                const newQty = prev - 1;
                onChange?.(newQty);
                return newQty;
            });
        }
    };

    return (
        <div className="flex items-center border h-7 border-gray-300 rounded-md overflow-hidden w-max">
            <button
                onClick={decrement}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 mb-1 text-lg font-bold"
            >
                -
            </button>
            <span className="px-4 py-1 text-center w-12">{quantity}</span>
            <button
                onClick={increment}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 mb-1 text-lg font-bold"
            >
                +
            </button>
        </div>
    );
};

export default QuantitySelector;
