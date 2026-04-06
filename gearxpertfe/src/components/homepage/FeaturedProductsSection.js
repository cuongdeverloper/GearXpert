import React from 'react';
import ProductCard from '../common/ProductCard';
import { useTranslation } from 'react-i18next';

export default function FeaturedProductsSection({ devices = [] }) {
    const { t } = useTranslation();
    if (!devices || devices.length === 0) return null;

    return (
        <section className="px-6 lg:px-10 mb-12">
            <div className="flex items-end justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 font-display">{t('homepage.featured_products')}</h2>
                    <p className="text-slate-500 mt-2 font-medium">{t('homepage.featured_products_subtitle', { defaultValue: "Khám phá các thiết bị hàng đầu hiện có để thuê." })}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
