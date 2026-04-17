import { useEffect, useRef } from 'react';
import { useInView, useAnimation } from 'motion/react';

export const useScrollAnimation = (threshold = 0.1, triggerOnce = true) => {
  const controls = useAnimation();
  const ref = useRef(null);
  const inView = useInView(ref, { amount: threshold as number, once: triggerOnce });

  useEffect(() => {
    if (inView) {
      controls.start('visible');
    }
  }, [controls, inView]);

  return { ref, controls };
};

// Animation variants
export const fadeInUp = {
  hidden: { 
    opacity: 0, 
    y: 60,
    transition: { duration: 0.6, ease: "easeInOut" }
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: "easeInOut" }
  }
} as any;

export const fadeIn = {
  hidden: { 
    opacity: 0,
    transition: { duration: 0.4 }
  },
  visible: { 
    opacity: 1,
    transition: { duration: 0.6, ease: "easeInOut" }
  }
} as any;

export const slideInLeft = {
  hidden: { 
    opacity: 0, 
    x: -100,
    transition: { duration: 0.6 }
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.8, ease: "easeInOut" }
  }
} as any;

export const slideInRight = {
  hidden: {
    opacity: 0,
    x: 100,
    transition: { duration: 0.6 }
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, ease: "easeInOut" }
  }
} as any;

export const slideInUp = {
  hidden: {
    opacity: 0,
    y: 100,
    transition: { duration: 0.6 }
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: "easeInOut" }
  }
} as any;

export const slideInDown = {
  hidden: {
    opacity: 0,
    y: -100,
    transition: { duration: 0.6 }
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: "easeInOut" }
  }
} as any;

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
} as any;

export const staggerItem = {
  hidden: { 
    opacity: 0, 
    y: 20,
    transition: { duration: 0.4 }
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeInOut" }
  }
} as any;

export const scaleIn = {
  hidden: { 
    opacity: 0, 
    scale: 0.8,
    transition: { duration: 0.4 }
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.6, ease: "easeInOut" }
  }
} as any;