
"use client";

import React, { useState, useEffect } from "react";
import { Poppins } from "next/font/google";
import { motion } from "framer-motion";

const poppins = Poppins({
    weight: ["300", "400", "500", "600", "700"],
    subsets: ["latin"],
});

const navLinks = [
    { name: "Comparison", href: "#comparison" },
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "FAQs", href: "#faq" },
    { name: "Testimonials", href: "#testimonials" },
];

export default function Navbar() {
    const [isHovered, setIsHovered] = useState(false);
    const [activeSection, setActiveSection] = useState("");

    const [isScrolled, setIsScrolled] = useState(false);
    const isCompact = isScrolled && !isHovered;

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // SCROLL SPY LOGIC
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            {
                rootMargin: "-50% 0px -50% 0px", // Trigger when section is in middle of viewport
                threshold: 0
            }
        );

        navLinks.forEach((link) => {
            const section = document.querySelector(link.href);
            if (section) observer.observe(section);
        });

        return () => observer.disconnect();
    }, []);

    return (
        <>
            <div className={`hidden md:flex fixed top-6 left-0 right-0 z-50 justify-center pointer-events-none ${poppins.className}`}>
                {/* Dynamic Island Container - Auto-sizes based on content */}
                <motion.nav
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="pointer-events-auto"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <motion.div
                        layout
                        className={`
              flex items-center gap-2 px-4 py-2
              bg-white/95 backdrop-blur-xl text-gray-900
              shadow-2xl rounded-full border border-gray-200
              transition-all duration-300 ease-spring
            `}
                        style={{
                            // Optional: Subtle glow matching the brand
                            boxShadow: isHovered ? "0 10px 40px -10px rgba(90, 79, 207, 0.2)" : "0 4px 20px -5px rgba(0,0,0,0.1)"
                        }}
                    >
                        {/* LOGO (Always Visible) */}
                        <button
                            type="button"
                            aria-label="Scroll to top"
                            className="flex items-center gap-2 cursor-pointer px-4 border-r border-gray-200 border-y-0 border-l-0 bg-transparent outline-none"
                            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        >
                            <span className="text-lg font-bold tracking-tight text-[#4F46E5]">
                                Billzzy <span className="font-normal">Lite</span>
                            </span>
                        </button>

                        {/* LINKS (Visible) */}
                        <div className="flex items-center gap-1">
                            {navLinks.map((link, index) => {
                                const isActive = activeSection === link.href.substring(1);
                                const shouldHide = isCompact && !isActive;
                                const activeIndex = navLinks.findIndex((l) => l.href.substring(1) === activeSection);
                                // If index > activeIndex, it's below/after. When hiding, it should go DOWN (20) wait, if scrolling down (A->B):
                                // A (was active, now before). index < activeIndex. slides UP (-20). Correct ("scroll upwards").
                                // B (was after, now active). index == activeIndex. moves from 20 to 0. Slides UP. Correct.
                                const yOffset = index > activeIndex ? 20 : -20;

                                return (
                                    <motion.a
                                        key={link.name}
                                        href={link.href}
                                        layout
                                        initial={false}
                                        animate={{
                                            width: shouldHide ? 0 : "auto",
                                            opacity: shouldHide ? 0 : 1,
                                            paddingLeft: shouldHide ? 0 : "1rem",
                                            paddingRight: shouldHide ? 0 : "1rem",
                                            scale: shouldHide ? 0.9 : 1,
                                            y: shouldHide ? yOffset : 0,
                                        }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className={`
                                            relative rounded-full text-sm font-medium transition-colors whitespace-nowrap overflow-hidden
                                            ${isActive ? "text-white" : "text-gray-500 hover:text-gray-900"}
                                        `}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            const target = document.querySelector(link.href);
                                            if (target) {
                                                target.scrollIntoView({ behavior: "smooth" });
                                            }
                                        }}
                                    >
                                        <div className="py-2"> {/* Inner wrapper for vertical padding to avoid clipping issues if we automated height */}
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activePill"
                                                    className="absolute inset-0 bg-[#5a4fcf] rounded-full"
                                                    style={{ borderRadius: 9999 }}
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                />
                                            )}
                                            <span className="relative z-10 block">{link.name}</span>
                                        </div>
                                    </motion.a>
                                );
                            })}
                        </div>
                    </motion.div>
                </motion.nav>
            </div>

            {/* Mobile Nav Placeholder (Hidden since user requested no mobile nav, keeping code structural but hidden) */}
            <div className="md:hidden"></div>
        </>
    );
}
