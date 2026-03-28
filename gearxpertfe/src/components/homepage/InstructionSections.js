import React from 'react';
import ScrollAnimation from '../common/ScrollAnimation';

const RentalInstructionsSection = () => {
    const steps = [
        {
            id: 1,
            icon: 'local_shipping',
            title: 'Giao hàng tận nơi',
            desc: 'Thiết bị được đóng gói chuyên nghiệp và giao tận tay bạn đúng giờ hẹn. Đảm bảo an toàn cho mọi linh kiện.',
            color: 'text-indigo-500'
        },
        {
            id: 2,
            icon: 'store',
            title: 'Nhận tại cửa hàng',
            desc: 'Bạn có thể đến trực tiếp các điểm giao dịch của GearXpert để kiểm tra máy và nhận thiết bị một cách nhanh chóng.',
            color: 'text-emerald-500'
        },
        {
            id: 3,
            icon: 'engineering',
            title: 'Setup & Kỹ thuật',
            desc: 'Đội ngũ kỹ thuật viên sẵn sàng hỗ trợ lắp đặt và hướng dẫn sử dụng ngay tại bối cảnh quay chụp của bạn.',
            color: 'text-cyan-500'
        }
    ];

    return (
        <section className="px-6 lg:px-10 py-16">
            <div className="max-w-7xl mx-auto">
                <ScrollAnimation direction="up" className="mb-12">
                    <h2 className="text-3xl font-black text-slate-900 uppercase">Hình thức thuê hàng</h2>
                    <div className="w-20 h-1 bg-primary mt-4 rounded-full"></div>
                </ScrollAnimation>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {steps.map((step, idx) => (
                        <ScrollAnimation 
                            key={step.id} 
                            direction="up" 
                            delay={idx * 0.1}
                            className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group"
                        >
                            <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary transition-colors duration-300">
                                <span className={`material-symbols-outlined ${step.color} group-hover:text-white text-3xl transition-colors`}>{step.icon}</span>
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h4>
                            <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                        </ScrollAnimation>
                    ))}
                </div>
            </div>
        </section>
    );
};

const PaymentMethodsSection = () => {
    const methods = [
        {
            id: 1,
            icon: 'account_balance_wallet',
            title: 'Ví điện tử GearXpert',
            desc: 'Nạp tiền và thanh toán tức thì với ví nội bộ. Tích lũy điểm thưởng và nhận ưu đãi hoàn tiền cực hấp dẫn.',
            color: 'text-orange-500'
        },
        {
            id: 2,
            icon: 'credit_card',
            title: 'Thẻ ATM / Visa / Master',
            desc: 'Hỗ trợ thanh toán qua cổng Napas với mọi ngân hàng nội địa và các loại thẻ quốc tế phổ biến nhất hiện nay.',
            color: 'text-blue-500'
        },
        {
            id: 3,
            icon: 'qr_code_2',
            title: 'Chuyển khoản / QR Code',
            desc: 'Xác thực thanh toán tự động qua mã QR. Nhanh chóng, chính xác và hoàn toàn miễn phí giao dịch.',
            color: 'text-violet-500'
        }
    ];

    return (
        <section className="px-6 lg:px-10 py-16 mb-12">
            <div className="max-w-7xl mx-auto">
                <ScrollAnimation direction="up" className="mb-12">
                    <h2 className="text-3xl font-black text-slate-900 uppercase">Hình thức thanh toán</h2>
                    <div className="w-20 h-1 bg-primary mt-4 rounded-full"></div>
                </ScrollAnimation>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {methods.map((item, idx) => (
                        <ScrollAnimation 
                            key={item.id} 
                            direction="up" 
                            delay={idx * 0.1}
                            className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group"
                        >
                            <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary transition-colors duration-300">
                                <span className={`material-symbols-outlined ${item.color} group-hover:text-white text-3xl transition-colors`}>{item.icon}</span>
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h4>
                            <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                        </ScrollAnimation>
                    ))}
                </div>
            </div>
        </section>
    );
};

export { RentalInstructionsSection, PaymentMethodsSection };
