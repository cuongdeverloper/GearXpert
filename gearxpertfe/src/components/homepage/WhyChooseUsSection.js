import React from 'react';
import ScrollAnimation from '../common/ScrollAnimation';
import { useTranslation } from 'react-i18next';

const WhyChooseUsSection = () => {
    const { t } = useTranslation();
    const reasons = [
        {
            id: 1,
            icon: 'verified_user',
            title: t('homepage.reason_1_title'),
            content: t('homepage.reason_1_desc'),
            iconColor: 'text-emerald-500'
        },
        {
            id: 2,
            icon: 'payments',
            title: t('homepage.reason_2_title'),
            content: t('homepage.reason_2_desc'),
            iconColor: 'text-indigo-500'
        },
        {
            id: 3,
            icon: 'auto_awesome',
            title: t('homepage.reason_3_title'),
            content: t('homepage.reason_3_desc'),
            iconColor: 'text-cyan-500'
        }
    ];

    return (
        <section className="px-4 md:px-6 lg:px-10 py-12 md:py-16 mb-8 md:mb-12 max-w-7xl mx-auto">
            <ScrollAnimation direction="up" className="text-center mb-10 md:mb-16">
                <h2 className="text-2xl md:text-5xl font-black text-slate-900 uppercase tracking-tight px-4">
                    {t('homepage.why_choose_us_title')}
                </h2>
                <p className="text-slate-500 mt-3 md:mt-4 font-bold text-sm md:text-lg uppercase tracking-[0.2em]">
                    {t('homepage.why_choose_us_subtitle')}
                </p>
                <div className="w-16 md:w-24 h-1 md:h-1.5 bg-gradient-to-r from-primary to-accent-cyan mx-auto mt-6 md:mt-8 rounded-full"></div>
            </ScrollAnimation>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {reasons.map((reason, index) => (
                    <ScrollAnimation 
                        key={reason.id} 
                        direction="up" 
                        delay={index * 0.1}
                        className="bg-slate-900 rounded-[24px] md:rounded-[32px] p-2 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 group border border-slate-800"
                    >
                        <div className="bg-slate-800/50 h-32 md:h-48 flex items-center justify-center rounded-[20px] md:rounded-[28px] mb-6 md:mb-8 transition-all duration-500 group-hover:bg-slate-800">
                            <span className={`material-symbols-outlined ${reason.iconColor} text-5xl md:text-7xl font-light drop-shadow-lg transition-transform duration-500 group-hover:scale-110`}>
                                {reason.icon}
                            </span>
                        </div>
                        <div className="px-6 md:px-8 pb-8 md:pb-10 text-center">
                            <h4 className="text-xl md:text-2xl font-black text-white mb-4 tracking-tight group-hover:text-primary transition-colors uppercase italic">
                                {reason.title}
                            </h4>
                            <p className="text-slate-400 text-xs md:text-sm leading-relaxed font-medium">
                                {reason.content}
                            </p>
                        </div>
                    </ScrollAnimation>
                ))}
            </div>
        </section>
    );
};

export default WhyChooseUsSection;
