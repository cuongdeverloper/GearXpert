import React from 'react';
import ProductCard from '../common/ProductCard';
import { useTranslation } from 'react-i18next';

export default function FeaturedProductsSection({ devices = [] }) {
    const { t } = useTranslation();
    if (!devices || devices.length === 0) return null;

    return (
        <section className="px-4 md:px-6 lg:px-10 mb-8 md:mb-12">
            <div className="flex items-end justify-between mb-6 md:mb-8">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 font-display">{t('homepage.featured_products')}</h2>
                    <p className="text-slate-500 mt-1 md:mt-2 text-sm md:text-base font-medium">{t('homepage.featured_products_subtitle', { defaultValue: "Khám phá các thiết bị hàng đầu hiện có để thuê." })}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 lg:gap-8">
                {devices.map((device) => (
                    <ProductCard
                        key={device._id || device.id}
                        device={device}
                        variant="detailed"
                    />
                ))}
            </div>
        </section>
    );
}
