import React from "react";
import wrap from "../assets/wrap.png";
import stickers from "../assets/stickers.png";
import graphic from "../assets/graphic.png";
import signage from "../assets/signage.png";
import decals from "../assets/decals.png";
import tarpmandaw from "../assets/tarpmandaw.png";


const GallerySection = () => {
	const rows = [
		[
			{ src: wrap, alt: "Vehicle Wraps", flex: "flex-[2.5]" },
			{ src: stickers, alt: "Stickers", flex: "flex-1" },
			{ src: graphic, alt: "Anime Prints", flex: "flex-1" },
		],
		[
			{ src: signage, alt: "Signage", flex: "flex-1" },
			{ src: decals, alt: "Car Decals", flex: "flex-[2.5]" },
			{ src: tarpmandaw, alt: "Signage", flex: "flex-1" },
		],
	];

	return (
		<div className="py-16 flex flex-col items-center">
			<div className="space-y-6 w-full px-6">
				{rows.map((row, rowIndex) => (
					<div key={rowIndex} className="flex flex-col sm:flex-row gap-6 w-full h-auto sm:h-[400px]" >
						{row.map((item, itmsIdx) => (
						<div key={itmsIdx} className={`${item.flex} rounded-2xl overflow-hidden h-[250px] sm:h-auto`} style={item.bg ? { backgroundColor: item.bg } : {}}>
							{item.src && (
							<img src={item.src} alt={item.alt} loading="lazy" className="w-full h-full object-cover transition hover:scale-110"/>
							)}
						</div>
						))}
					</div>
				))}
			</div>
		</div>
	);
};

export default GallerySection;
