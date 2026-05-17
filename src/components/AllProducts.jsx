import { categories } from "../components/ProductsData.jsx";
import wrapImg from "../assets/wrapImg.png";
import decalImg from "../assets/decalImg.png";
import signageImg from "../assets/signageImg.png";
import stickerImg from "../assets/stickerImg.png";

export const AllProducts = [
    {
        id: "wrap",
        name: "Wrap",
        image: wrapImg,
        price: "50000",
        description: "Premium full vehicle wrapping with custom design and high-quality vinyl."
    },
    {
        id: "Signage",
        name: "Signage",
        image: signageImg,
        price: "4000",
        description: "Eye-catching indoor/outdoor signage — acrylic, LED, 3D letters, and more."
    },
    {
        id: "decal",
        name: "Decal",
        image: decalImg,
        price: "50000",
        description: "Custom decals for vehicles, windows, walls — durable and vibrant."
    },
    {
        id: "sticker",
        name: "Sticker",
        image: stickerImg,
        price: "200",
        description: "High-quality custom stickers — holographic, die-cut, waterproof."
    },

    categories.flatMap(product_category =>
        product_category.items.map(item => ({
            id: item.id,         
            name: item.objct,
            image: item.src,
            price: item.price,
            description: item.description || `${item.objct} — high-quality custom printing service by DSC.`
        }))
    )
];
