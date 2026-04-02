import { useState, useEffect } from 'react';

/**
 * Custom hook to track the background theme of elements at the header position.
 * It tracks all intersecting elements with [data-theme] and chooses the one 
 * that is most specific (deepest in the DOM tree) to determine the header theme.
 */
const useHeaderTheme = () => {
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        // Map to keep track of currently intersecting elements and their themes
        const intersectingElements = new Map();

        const updateTheme = () => {
            if (intersectingElements.size === 0) {
                setTheme('light');
                return;
            }

            // Find the element with the highest DOM depth (most specific)
            let deepestEntry = null;
            let maxDepth = -1;

            intersectingElements.forEach((theme, element) => {
                let depth = 0;
                let parent = element;
                while (parent) {
                    depth++;
                    parent = parent.parentElement;
                }

                if (depth > maxDepth) {
                    maxDepth = depth;
                    deepestEntry = theme;
                }
            });

            if (deepestEntry) {
                setTheme(deepestEntry);
            }
        };

        const observerOptions = {
            root: null,
            // Track intersection in the top 100px area
            rootMargin: '0px 0px -90% 0px',
            threshold: [0, 0.1, 0.5, 0.9, 1]
        };

        const handleIntersection = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const elTheme = entry.target.getAttribute('data-theme');
                    if (elTheme) {
                        intersectingElements.set(entry.target, elTheme);
                    }
                } else {
                    intersectingElements.delete(entry.target);
                }
            });
            updateTheme();
        };

        const observer = new IntersectionObserver(handleIntersection, observerOptions);

        const observeTargets = () => {
            const targets = document.querySelectorAll('[data-theme]');
            targets.forEach((target) => observer.observe(target));
        };

        observeTargets();

        const mutationObserver = new MutationObserver(() => {
            // Re-sync targets if DOM changes
            const newTargets = document.querySelectorAll('[data-theme]');
            newTargets.forEach(t => observer.observe(t));
        });

        mutationObserver.observe(document.body, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            mutationObserver.disconnect();
            intersectingElements.clear();
        };
    }, []);

    return theme;
};

export default useHeaderTheme;
