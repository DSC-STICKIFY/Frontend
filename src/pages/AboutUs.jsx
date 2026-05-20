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

// ─── Data ────────────────────────────────────────────────────────────────────

const storyCards = [
  { img: img1, icon: icon1, title: "Our Humble Start",           desc: "Small dreams sparked something big." },
  { img: img2, icon: icon2, title: "Passion Turned Purpose",     desc: "Creativity grew into lasting impact." },
  { img: img3, icon: icon3, title: "Growing Through Challenges", desc: "Every obstacle shaped our journey." },
  { img: img4, icon: icon4, title: "Achieving Today's Success",  desc: "Hard work built our proud legacy." },
];

const whyCards = [
  { icon: icon5, title: "Quality You Can Trust",     desc: "Premium materials, vibrant colors, and long-lasting prints that bring every design to life." },
  { icon: icon6, title: "Designs That Stand Out",    desc: "Our team transforms your ideas into eye-catching designs that capture attention and express your brand's personality." },
  { icon: icon7, title: "Fast and Reliable Service", desc: "We value your time—expect quick turnaround, dependable results, and a team that genuinely cares about your satisfaction." },
];

const coreValues = [
  { icon: icon10, title: "Creativity",            desc: "We turn ideas into unique and eye-catching designs that reflect every client's vision and style." },
  { icon: icon5,  title: "Quality",               desc: "We deliver prints made with premium materials and precise craftsmanship to ensure lasting results." },
  { icon: icon11, title: "Reliability",           desc: "Expect quick turnaround, dependable results, and a team that genuinely cares about your satisfaction." },
  { icon: icon12, title: "Innovation",            desc: "We embrace new tools, techniques, and trends to keep our designs fresh and ahead of the curve.", rotate: true },
  { icon: icon13, title: "Customer Satisfaction", desc: "Your happiness is our top priority—we go the extra mile to ensure every project exceeds expectations." },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

const Label = ({ children, light = false }) => (
  <span className={`inline-block text-[10px] font-black uppercase tracking-[0.3em] mb-2 ${light ? 'text-yellow-400/70' : 'text-gray-400'}`}>
    {children}
  </span>
);

const FeatureCard = ({ icon, title, desc, rotate }) => (
  <div className="group cursor-default h-full">
    <div className="
      relative bg-white flex flex-col p-6 rounded-2xl h-full overflow-hidden
      border border-gray-100
      transition-all duration-300 ease-out
      group-hover:-translate-y-2
      group-hover:shadow-[0_20px_60px_-10px_rgba(253,227,30,0.18)]
      group-hover:border-yellow-200
    ">
      <div className="
        absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-[#FDE31E]
        transition-all duration-300 ease-out
        translate-x-[-4px] opacity-0
        group-hover:translate-x-0 group-hover:opacity-100
      " />

      <div className="
        flex items-center justify-center w-11 h-11 rounded-xl bg-gray-100 shrink-0
        transition-all duration-300 ease-out
        group-hover:bg-[#FDE31E] group-hover:scale-110 group-hover:rotate-3
        group-hover:shadow-lg group-hover:shadow-yellow-300/50
      ">
        <img
          src={icon} alt=""
          className="w-5 h-5 object-contain transition-transform duration-300"
          style={rotate ? { transform: 'rotate(-53deg)' } : undefined}
        />
      </div>

      <h5 className="font-black text-[16px] mt-4 mb-2 text-gray-900 leading-snug">
        {title}
      </h5>
      <p className="text-gray-400 text-sm leading-relaxed transition-colors duration-300 group-hover:text-gray-500 flex-1">
        {desc}
      </p>
    </div>
  </div>
);

const DarkCard = ({ icon, title, desc }) => (
  <div className="group h-full">
    <div className="
      relative bg-[#141414] text-white flex flex-col p-8 rounded-2xl h-full overflow-hidden
      border border-white/5
      transition-all duration-300 ease-out
      group-hover:-translate-y-2
      group-hover:shadow-[0_24px_60px_-10px_rgba(253,227,30,0.15)]
      group-hover:border-yellow-400/20
    ">
      <div className="
        absolute top-0 left-0 right-0 h-[3px] bg-[#FDE31E] rounded-t-2xl
        transition-all duration-300 ease-out
        translate-y-[-3px] opacity-0
        group-hover:translate-y-0 group-hover:opacity-100
      " />

      <div className="
        flex items-center justify-center w-11 h-11 rounded-xl bg-white/5 shrink-0
        transition-all duration-300 ease-out
        group-hover:bg-yellow-400/15 group-hover:scale-110
      ">
        <img src={icon} alt="" className="w-5 h-5 object-contain" />
      </div>

      <h5 className="font-black text-xl mt-5 mb-3 transition-colors duration-300 group-hover:text-[#FDE31E] leading-snug">
        {title}
      </h5>
      <p className="text-white/50 text-[15px] leading-relaxed transition-colors duration-300 group-hover:text-white/70 flex-1">
        {desc}
      </p>
    </div>
  </div>
);

// ─── Page ────────────────────────────────────────────────────────────────────

const AboutUs = () => (
  <div className="relative z-0 min-h-screen w-full text-black bg-[#F1F3F7]">

    {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
    <section className="px-6 md:px-12 lg:px-20 pt-16 md:pt-24 pb-10 md:pb-14">
      <div className="max-w-3xl mx-auto text-center mt-10">
        <h1 className="font-black text-4xl md:text-5xl lg:text-[3.5rem] leading-[1.1] tracking-tight">
          Davao <span className="text-[#FDE31E]">Sticker</span> Custom
        </h1>
        <p className="mt-4 text-base md:text-lg text-gray-500 leading-relaxed">
          A local printing shop specializing in custom stickers, decals, car wraps, signages,
          graphic services, and personalized giveaways. With creative designs and quality prints,
          we help individuals and businesses bring their ideas to life — for branding, promotions,
          or personal use.
        </p>
      </div>
    </section>

    {/* ══ STORY CARDS ═══════════════════════════════════════════════════════ */}
    <section className="px-6 md:px-12 lg:px-20 pb-14 md:pb-16">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-7xl mx-auto">
        {storyCards.map((card, i) => (
          <div
            key={i}
            className="relative group cursor-pointer overflow-hidden rounded-2xl h-[280px] sm:h-[320px] lg:h-[360px]"
          >
            <img
              src={card.img} alt={card.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.08]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent transition-all duration-300 group-hover:from-black/90" />

            <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
              <div className="transition-transform duration-300 group-hover:-translate-y-1.5">
                <span className="
                  inline-block text-[10px] font-black uppercase tracking-[0.25em]
                  text-yellow-300/80 mb-1.5
                  transition-opacity duration-300 opacity-0 group-hover:opacity-100
                ">
                  Our Story
                </span>
                <h6 className="flex items-center gap-2 text-[15px] font-bold leading-snug mb-1">
                  <img src={card.icon} alt="" className="w-4 h-4 shrink-0" />
                  {card.title}
                </h6>
                <p className="text-sm text-white/60 leading-relaxed transition-colors duration-300 group-hover:text-white/85">
                  {card.desc}
                </p>
              </div>

              <div className="
                mt-3 h-[2px] bg-[#FDE31E] rounded-full
                transition-all duration-300 ease-out
                w-0 group-hover:w-10
              " />
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* ══ WHY DSC ═══════════════════════════════════════════════════════════ */}
    <section className="px-6 md:px-12 lg:px-20 py-12 md:py-16 ">
      <div className="text-center mb-10">
        <Label>What sets us apart</Label>
        <h2 className="font-black text-3xl md:text-4xl lg:text-5xl tracking-tight">
          Why Choose <span className="text-[#FDE31E]">DSC</span>?
        </h2>
        <p className="mt-3 text-gray-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Creative, high-quality, and reliable prints that bring your ideas to life — fast and flawlessly.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
        {whyCards.map((card, i) => (
          <FeatureCard key={i} {...card} />
        ))}
      </div>
    </section>

    {/* ══ MISSION & VISION ══════════════════════════════════════════════════ */}
    <section className="bg-black w-full py-12 md:py-16 px-6 md:px-12 lg:px-20 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-80px] left-1/3 w-80 h-80 bg-yellow-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-60px] right-1/3 w-64 h-64 bg-yellow-400/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <div className="text-center mb-10">
          <Label light>Our direction</Label>
          <h2 className="font-black text-3xl md:text-4xl lg:text-5xl tracking-tight text-white">
            Mission &amp; Vision
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto">
          <DarkCard
            icon={icon8}
            title="Our Mission"
            desc="To provide high-quality, creative, and affordable printing solutions that help individuals and businesses express their ideas with style and impact."
          />
          <DarkCard
            icon={icon9}
            title="Our Vision"
            desc="To be the leading custom printing shop in Davao, known for innovation, reliability, and exceptional customer experience."
          />
        </div>
      </div>
    </section>

    {/* ══ CORE VALUES ═══════════════════════════════════════════════════════ */}
    <section className="px-6 md:px-12 lg:px-20 py-12 md:py-16 bg-[#F1F3F7]">
      <div className="text-center mb-10">
        <Label>What drives us</Label>
        <h2 className="font-black text-3xl md:text-4xl lg:text-5xl tracking-tight">
          Our Core <span className="text-[#FDE31E]">Values</span>
        </h2>
        <p className="mt-3 text-gray-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          The principles that guide our creativity, quality, and commitment to every design we make.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-7xl mx-auto">
        {coreValues.map((card, i) => (
          <FeatureCard key={i} {...card} />
        ))}
      </div>
    </section>

  </div>
);

export default AboutUs;