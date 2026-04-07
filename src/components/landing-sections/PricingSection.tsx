
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaCheck, FaArrowRight, FaBolt, FaCrown, FaWhatsapp, FaRobot, FaBoxes, FaLock } from "react-icons/fa";

export default function PricingSection() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const plans = [
    {
      name: "Starter",
      badge: "Pay-as-you-go",
      price: "0.15",
      period: "/ bill",
      description: "Pay only for what you use. Perfect for getting started.",
      features: [
        "₹0.15 per Digital Bill",
        "Default WhatsApp Integration", // Shared/Branded
        "Inventory OR Service Module", // Only one access
      ],
      notIncluded: [],
      buttonText: "Start for Free",
      isPro: false,
    },
    {
      name: "Pro",
      badge: "Full Access",
      price: "149",
      period: "/ month",
      description: "Unlimited power for growing businesses and retailers.",
      features: [
        "Own WhatsApp API Integration", // Specific Feature
        "Both Inventory & Service Access", // Specific Feature
        "Personal AI Business Advisor", // Specific Feature
        "Priority 24/7 Support",
      ],
      notIncluded: [],
      buttonText: "Go Pro Now",
      isPro: true,
    },
  ];

  if (!mounted) return <section className="min-h-screen bg-white" />;

  return (
    <section id="pricing" className="relative w-full py-16 md:py-32 px-4 overflow-hidden bg-white">
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        @keyframes shine {
          100% { transform: translateX(100%); }
        }
        .animate-shine { animation: shine 1s; }
      `}</style>

      {/* Background Decor */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" style={{ animationDelay: '2s' }}></div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-100 text-[#5a4fcf] font-semibold text-xs uppercase tracking-wide mb-6 shadow-sm">
            <FaCrown className="text-[10px]" /> Simple Subscription
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight tracking-tight">
            Plans for <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5a4fcf] to-[#8c82fc]">Every Business</span>
          </h2>
          <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto">
            Choose the plan that fits your growth. Switch or cancel any time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto items-stretch">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative group h-full flex flex-col ${plan.isPro ? 'md:animate-float' : ''}`}
            >
              {plan.isPro && (
                <div className="absolute -inset-1 bg-gradient-to-r from-[#5a4fcf] via-[#7d73e6] to-blue-400 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              )}

              <div className={`relative flex flex-col h-full bg-white rounded-3xl p-5 sm:p-6 md:p-10 border ${
                plan.isPro ? 'border-[#5a4fcf]/20 shadow-2xl' : 'border-gray-100 shadow-xl'
              }`}>
                
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-gray-500 text-sm mt-2">{plan.description}</p>
                  </div>
                  <div className={`text-[10px] md:text-xs font-bold px-3 py-1 rounded-full shadow-md ${
                    plan.isPro 
                    ? 'bg-gradient-to-r from-[#5a4fcf] to-[#8c82fc] text-white' 
                    : 'bg-gray-100 text-gray-600 uppercase'
                  }`}>
                    {plan.badge}
                  </div>
                </div>

                {/* Price */}
                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tighter">
                      ₹{plan.price}
                    </span>
                    <span className="text-lg text-gray-500 font-medium">{plan.period}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs font-bold text-[#5a4fcf]">
                    {plan.isPro ? <FaBolt className="text-yellow-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
                    {plan.isPro ? "UNLIMITED GROWTH" : "CHEAPER THAN PAPER"}
                  </div>
                </div>

                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-8"></div>

                {/* Features */}
                <ul className="space-y-4 mb-10 flex-grow">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center shadow-sm ${
                        plan.isPro ? 'bg-gradient-to-br from-[#5a4fcf] to-[#8c82fc]' : 'bg-green-100'
                      }`}>
                        <FaCheck className={`text-[8px] ${plan.isPro ? 'text-white' : 'text-green-600'}`} />
                      </div>
                      <span className="text-sm md:text-base text-gray-800 font-medium">{feature}</span>
                    </li>
                  ))}
                  
                  {plan.notIncluded.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 opacity-30">
                      <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200">
                        <FaLock className="text-[8px] text-gray-400" />
                      </div>
                      <span className="text-sm md:text-base text-gray-500 italic">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => router.push(plan.isPro ? '/login?plan=pro' : '/login')}
                  className={`
                    w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 transform active:scale-95 relative overflow-hidden group
                    ${plan.isPro 
                      ? 'bg-gradient-to-r from-[#5a4fcf] to-[#4c42b3] text-white shadow-xl shadow-purple-500/20 md:hover:-translate-y-1' 
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }
                  `}
                >
                  {plan.isPro && (
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine" />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {plan.buttonText} <FaArrowRight className="text-xs" />
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pro Feature Highlights */}
        <div className="mt-16 md:mt-20 flex flex-wrap justify-center gap-6 sm:gap-10 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
             <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                <div className="p-2 bg-green-50 rounded-lg text-green-600"><FaWhatsapp className="text-xl" /></div>
                Own WhatsApp API
             </div>
             <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><FaRobot className="text-xl" /></div>
                AI Business Advisor
             </div>
             <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><FaBoxes className="text-xl" /></div>
                Inventory & Service Modules
             </div>
        </div>
      </div>
    </section>
  );
}