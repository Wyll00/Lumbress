import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const AnimatedNumber = ({ value, duration = 1.2, delay = 0, className }) => {
    const ref = useRef(null);
    const obj = useRef({ n: 0 });

    useEffect(() => {
        const target = Number(value) || 0;
        const tween = gsap.to(obj.current, {
            n: target,
            duration,
            delay,
            ease: 'power2.out',
            onUpdate: () => {
                if (ref.current) {
                    ref.current.textContent = Math.round(obj.current.n).toLocaleString();
                }
            },
        });
        return () => tween.kill();
    }, [value, duration, delay]);

    return <span ref={ref} className={className}>0</span>;
};

export default AnimatedNumber;
