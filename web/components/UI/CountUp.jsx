import { useState, useEffect, useRef } from "react";

export default function CountUp({
  end,
  start = 0,
  duration = 1000,
  decimals = 0,
  useEasing = true,
  useGrouping = true,
  prefix = '',
  suffix = '',
  startOnVisible = true,
  className = '',
}) {
  const [currentValue, setCurrentValue] = useState(start);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef(null);
  const frameRef = useRef(null);
  const prevEndRef = useRef(end);

  const formatNumber = (num) => {
    const fixed = Number(num).toFixed(decimals);
    const formatted = useGrouping
      ? parseFloat(fixed).toLocaleString('pt-BR')
      : fixed;
    return `${prefix}${formatted}${suffix}`;
  };

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const animate = () => {
    if (hasAnimated && end === prevEndRef.current) return;

    const startValue = startOnVisible ? start : currentValue;
    const endValue = end;
    const startTime = performance.now();
    prevEndRef.current = endValue;

    const update = (timestamp) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = useEasing ? easeOutCubic(progress) : progress;

      const newValue = startValue + (endValue - startValue) * easedProgress;
      setCurrentValue(newValue);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(update);
      } else {
        setHasAnimated(true);
      }
    };

    frameRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!startOnVisible) {
      animate();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animate();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [end, startOnVisible]);

  useEffect(() => {
    if (!startOnVisible) {
      animate();
    }
  }, [end]);

  return (
    <span ref={elementRef} className={className}>
      {formatNumber(currentValue)}
    </span>
  );
}