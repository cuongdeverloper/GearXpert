import React from 'react';
import ScrollAnimation from '../common/ScrollAnimation';
import { useTranslation } from 'react-i18next';

const RentalInstructionsSection = () => {
    const { t } = useTranslation();
    const steps = [
        {
            id: 1,
            icon: 'local_shipping',
            title: t('homepage.step_1_title'),
            desc: t('homepage.step_1_desc'),
            color: 'text-indigo-500'
        },
        {
            id: 2,
            icon: 'store',
            title: t('homepage.step_2_title'),
            desc: t('homepage.step_2_desc'),
            color: 'text-emerald-500'
        },
        {
            id: 3,
            icon: 'engineering',
            title: t('homepage.step_3_title'),
            desc: t('homepage.step_3_desc'),
            color: 'text-cyan-500'
        }
    ];

    return (
        <section className="px-4 md:px-6 lg:px-10 py-10 md:py-16">
            <div className="max-w-7xl mx-auto">
                <ScrollAnimation direction="up" className="mb-8 md:mb-12">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase">{t('homepage.rental_method')}</h2>
                    <div className="w-16 md:w-20 h-1 bg-primary mt-3 md:mt-4 rounded-full"></div>
                </ScrollAnimation>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {steps.map((step, idx) => (
                        <ScrollAnimation 
                            key={step.id} 
                            direction="up" 
                            delay={idx * 0.1}
                            className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group"
                        >
                            <div className="bg-slate-50 w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center mb-5 md:mb-6 group-hover:bg-primary transition-colors duration-300">
                                <span className={`material-symbols-outlined ${step.color} group-hover:text-white text-2xl md:text-3xl transition-colors`}>{step.icon}</span>
                            </div>
                            <h4 className="text-lg md:text-xl font-bold text-slate-900 mb-2 md:mb-3">{step.title}</h4>
                            <p className="text-slate-500 text-xs md:text-sm leading-relaxed">{step.desc}</p>
                        </ScrollAnimation>
                    ))}
                </div>
            </div>
        </section>
    );
};

const PaymentMethodsSection = () => {
    const { t } = useTranslation();
    const methods = [
        {
            id: 1,
            icon: 'account_balance_wallet',
            title: t('homepage.pay_1_title'),
            desc: t('homepage.pay_1_desc'),
            color: 'text-orange-500'
        },
        {
            id: 2,
            icon: 'credit_card',
            title: t('homepage.pay_2_title'),
            desc: t('homepage.pay_2_desc'),
            color: 'text-blue-500'
        },
        {
            id: 3,
            icon: 'qr_code_2',
            title: t('homepage.pay_3_title'),
            desc: t('homepage.pay_3_desc'),
            color: 'text-violet-500'
        }
    ];

    return (
        <section className="px-4 md:px-6 lg:px-10 py-10 md:py-16 mb-8 md:mb-12">
            <div className="max-w-7xl mx-auto">
                <ScrollAnimation direction="up" className="mb-8 md:mb-12">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase">{t('homepage.payment_method')}</h2>
                    <div className="w-16 md:w-20 h-1 bg-primary mt-3 md:mt-4 rounded-full"></div>
                </ScrollAnimation>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {methods.map((item, idx) => (
                        <ScrollAnimation 
                            key={item.id} 
                            direction="up" 
                            delay={idx * 0.1}
                            className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group"
                        >
                            <div className="bg-slate-50 w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center mb-5 md:mb-6 group-hover:bg-primary transition-colors duration-300">
                                <span className={`material-symbols-outlined ${item.color} group-hover:text-white text-2xl md:text-3xl transition-colors`}>{item.icon}</span>
                            </div>
                            <h4 className="text-lg md:text-xl font-bold text-slate-900 mb-2 md:mb-3">{item.title}</h4>
                            <p className="text-slate-500 text-xs md:text-sm leading-relaxed">{item.desc}</p>
                        </ScrollAnimation>
                    ))}
                </div>
            </div>
        </section>
    );
};

export { RentalInstructionsSection, PaymentMethodsSection };
