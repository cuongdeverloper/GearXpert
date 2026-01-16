import React from 'react';
import { motion } from 'framer-motion';

/**
 * ScrollAnimation Component
 * 
 * A wrapper component that applies scroll-triggered animations using Framer Motion.
 * 
 * @param {ReactNode} children - The content to animate
 * @param {string} direction - Direction of entry: 'up', 'down', 'left', 'right', 'none'
 * @param {string} effect - Additional effect: 'fade' (default), 'scale', 'rotate', 'flip'
 * @param {number} delay - Delay in seconds
 * @param {number} duration - Duration in seconds
 * @param {string} className - Additional CSS classes
 * @param {number} viewportAmount - Amount of element visible to trigger (0-1)
 * @param {boolean} once - Trigger only once (default: true)
 */
const ScrollAnimation = ({
    children,
    direction = 'up',
    effect = 'fade',
    delay = 0,
    duration = 0.5,
    className = '',
    viewportAmount = 0.3,
    once = true
}) => {

    // Define initial states based on direction
    const getInitialState = () => {
        const state = { opacity: 0 };

        // Direction offsets
        switch (direction) {
            case 'up': state.y = 50; break;
            case 'down': state.y = -50; break;
            case 'left': state.x = 50; break; // Comes from right to left
            case 'right': state.x = -50; break; // Comes from left to right
            default: break;
        }

        // Effect modifications
        switch (effect) {
            case 'scale': state.scale = 0.8; break;
            case 'rotate': state.rotate = -5; break;
            case 'flip': state.rotateX = 90; break;
            default: break;
        }

        return state;
    };

    // Define target state (animate to)
    const getTargetState = () => {
        return {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            rotate: 0,
            rotateX: 0
        };
    };

    return (
        <motion.div
            className={className}
            initial={getInitialState()}
            whileInView={getTargetState()}
            viewport={{ once: once, amount: viewportAmount }}
            transition={{
                duration: duration,
                delay: delay,
                ease: [0.25, 0.46, 0.45, 0.94] // easeOutQuad-ish
            }}
        >
            {children}
        </motion.div>
    );
};

export default ScrollAnimation;
