import React from 'react';
import { testimonials } from '../../mocks/reviews.mock';
import ScrollAnimation from '../common/ScrollAnimation';

const TestimonialsSection = () => {
    return (
        <section className="relative py-24 overflow-hidden bg-slate-900 rounded-[48px]">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[60%] bg-indigo-500 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[60%] bg-cyan-400 blur-[120px] rounded-full"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                <ScrollAnimation direction="up" className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight">
                        KHÁCH HÀNG LÀ TRUNG TÂM, HÀI LÒNG LÀ SỨ MỆNH!
                    </h2>
                    <div className="w-24 h-1.5 bg-gradient-to-r from-indigo-500 to-cyan-400 mx-auto mt-6 rounded-full"></div>
                </ScrollAnimation>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {testimonials.map((testi, index) => (
                        <ScrollAnimation 
                            key={testi.id} 
                            direction="up" 
                            delay={index * 0.1}
                            className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-glow-cyan/20 transition-all duration-500 hover:-translate-y-2 group"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full blur-md opacity-0 group-hover:opacity-40 transition-opacity"></div>
                                    <img 
                                        src={testi.avatar} 
                                        alt={testi.name} 
                                        className="relative w-14 h-14 rounded-full border-2 border-slate-100 object-cover" 
                                    />
                                    <div className="absolute -top-3 -left-3">
                                        <span className="material-symbols-outlined text-amber-500 text-3xl font-black rotate-180 opacity-20 group-hover:opacity-100 transition-opacity">
                                            format_quote
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-base">{testi.name}</h4>
                                    <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest">{testi.role}</p>
                                </div>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed italic">
                                "{testi.content}"
                            </p>
                        </ScrollAnimation>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TestimonialsSection;
