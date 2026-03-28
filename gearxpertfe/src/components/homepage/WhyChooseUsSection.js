import React from 'react';
import ScrollAnimation from '../common/ScrollAnimation';

const WhyChooseUsSection = () => {
    const reasons = [
        {
            id: 1,
            icon: 'verified_user',
            title: 'Thiết bị chuẩn - Bảo trì định kỳ',
            content: 'Tất cả thiết bị tại GearXpert đều được kiểm tra kỹ lưỡng trước khi giao. Chúng tôi cam kết máy ảnh, linh kiện luôn ở trạng thái tốt nhất.',
            iconColor: 'text-emerald-500'
        },
        {
            id: 2,
            icon: 'payments',
            title: 'Giá thuê công khai - Minh bạch',
            content: 'Chúng tôi niêm yết giá thuê rõ ràng, không có phí ẩn. Hợp đồng điện tử minh bạch giúp khách hàng hoàn toàn an tâm khi sử dụng.',
            iconColor: 'text-indigo-500'
        },
        {
            id: 3,
            icon: 'auto_awesome',
            title: 'Gợi ý AI - Tối ưu bối cảnh',
            content: 'SmartGear AI độc quyền giúp bạn tìm được combo thiết bị hoàn hảo nhất dựa trên bối cảnh thực tế, giúp tiết kiệm chi phí tối đa.',
            iconColor: 'text-cyan-500'
        }
    ];

    return (
        <section className="px-6 lg:px-10 py-16 mb-12 max-w-7xl mx-auto">
            <ScrollAnimation direction="up" className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tight">
                    LÝ DO NÊN CHỌN GEARXPERT
                </h2>
                <p className="text-slate-500 mt-4 font-bold text-lg uppercase tracking-[0.2em]">
                    GearXpert - Thuê thiết bị, <span className="text-primary">chọn sự an tâm!</span>
                </p>
                <div className="w-24 h-1.5 bg-gradient-to-r from-primary to-accent-cyan mx-auto mt-8 rounded-full"></div>
            </ScrollAnimation>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {reasons.map((reason, index) => (
                    <ScrollAnimation 
                        key={reason.id} 
                        direction="up" 
                        delay={index * 0.1}
                        className="bg-slate-900 rounded-[32px] p-2 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 group border border-slate-800"
                    >
                        <div className="bg-slate-800/50 h-48 flex items-center justify-center rounded-[28px] mb-8 transition-all duration-500 group-hover:bg-slate-800">
                            <span className={`material-symbols-outlined ${reason.iconColor} text-7xl font-light drop-shadow-lg transition-transform duration-500 group-hover:scale-110`}>
                                {reason.icon}
                            </span>
                        </div>
                        <div className="px-8 pb-10 text-center">
                            <h4 className="text-2xl font-black text-white mb-5 tracking-tight group-hover:text-primary transition-colors uppercase italic">
                                {reason.title}
                            </h4>
                            <p className="text-slate-400 text-sm leading-relaxed font-medium">
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
