import React from 'react';

const PasswordStrengthMeter = ({ password }) => {
    const getStrength = (pass) => {
        let score = 0;
        if (!pass) return score;

        if (pass.length >= 6) score++;
        if (pass.length >= 10) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[0-9]/.test(pass)) score++;
        if (/[\W_]/.test(pass)) score++;

        return score;
    };

    const score = getStrength(password);

    const getColor = () => {
        if (score === 0) return 'bg-gray-200';
        if (score <= 2) return 'bg-red-500';
        if (score <= 4) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getLabel = () => {
        if (score === 0) return '';
        if (score <= 2) return 'Yếu';
        if (score <= 4) return 'Trung bình';
        return 'Mạnh';
    };

    // Calculate percentage for width (max 5 points)
    // 0 -> 0%, 1 -> 20%, 2 -> 40%, 3 -> 60%, 4 -> 80%, 5 -> 100%
    // However, let's make it simple: 3 sections? or just fluid width?
    // Let's use 4 sections based on requirements:
    // Requirements: >6 chars, Upper, Number, Special.
    // Let's map score to progress.

    const widthPercent = Math.min(100, Math.max(0, (score / 5) * 100));

    return (
        <div className="mt-2 text-left">
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                    className={`h-full ${getColor()} transition-all duration-300 ease-out`}
                    style={{ width: `${widthPercent}%` }}
                ></div>
            </div>
            <div className="flex justify-between items-center mt-1">
                <span className={`text-xs font-semibold ${score <= 2 ? 'text-red-500' : score <= 4 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                    {getLabel()}
                </span>
                {password && score < 5 && (
                    <span className="text-[10px] text-slate-400">
                        Gợi ý: Cần thêm {
                            !/[A-Z]/.test(password) ? 'chữ hoa, ' : ''
                        }{
                            !/[0-9]/.test(password) ? 'số, ' : ''
                        }{
                            !/[\W_]/.test(password) ? 'ký tự đặc biệt' : ''
                        }
                    </span>
                )}
            </div>
        </div>
    );
};

export default PasswordStrengthMeter;
