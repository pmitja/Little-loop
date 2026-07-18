'use client';

import { useEffect } from 'react';

/** Progressive enhancement: the full page remains visible and usable without JavaScript. */
export function MarketingAnimations() {
  useEffect(() => {
    let cancelled = false;
    let dispose = () => {};

    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        if (cancelled) return;

        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ limitCallbacks: true });

        const media = gsap.matchMedia();
        media.add(
          {
            reduceMotion: '(prefers-reduced-motion: reduce)',
            mobile: '(max-width: 800px)',
          },
          (match) => {
            const { reduceMotion, mobile } = match.conditions as {
              reduceMotion: boolean;
              mobile: boolean;
            };

            if (reduceMotion) return;

            const context = gsap.context(() => {
              const hero = gsap.timeline({
                defaults: { duration: 0.78, ease: 'power3.out' },
              });

              hero
                .from('.site-header', { autoAlpha: 0, y: -18, duration: 0.55 })
                .from('.hero-copy > *', { autoAlpha: 0, y: 24, stagger: 0.075 }, '-=0.28')
                .from('.hero-visual', { autoAlpha: 0, y: 46, scale: 0.965, duration: 1 }, '-=0.78')
                .from('.float-note', { autoAlpha: 0, y: 18, stagger: 0.12 }, '-=0.42')
                .from('.hero-bear', { autoAlpha: 0, y: 20, rotation: -12 }, '-=0.58');

              gsap.to('.float-note', {
                y: -7,
                duration: 2.8,
                ease: 'sine.inOut',
                repeat: -1,
                yoyo: true,
                stagger: 0.35,
              });

              document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((element) => {
                gsap.from(element, {
                  autoAlpha: 0,
                  y: mobile ? 22 : 34,
                  duration: mobile ? 0.64 : 0.82,
                  ease: 'power3.out',
                  scrollTrigger: {
                    trigger: element,
                    start: mobile ? 'top 91%' : 'top 86%',
                    once: true,
                  },
                });
              });

              document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((group) => {
                const items = group.querySelectorAll<HTMLElement>('[data-stagger-item]');
                if (!items.length) return;

                gsap.from(items, {
                  autoAlpha: 0,
                  y: mobile ? 24 : 42,
                  scale: mobile ? 1 : 0.985,
                  duration: mobile ? 0.62 : 0.82,
                  stagger: mobile ? 0.08 : 0.13,
                  ease: 'power3.out',
                  scrollTrigger: {
                    trigger: group,
                    start: mobile ? 'top 91%' : 'top 84%',
                    once: true,
                  },
                });
              });

              gsap.from('.activity-bars span', {
                scaleY: 0,
                transformOrigin: 'bottom center',
                duration: 0.8,
                stagger: 0.07,
                ease: 'power2.out',
                scrollTrigger: {
                  trigger: '.activity-card',
                  start: 'top 82%',
                  once: true,
                },
              });

              gsap.from('.final-cta > :not(.final-cloud):not(.cta-character)', {
                autoAlpha: 0,
                y: 26,
                duration: 0.76,
                stagger: 0.085,
                ease: 'power3.out',
                scrollTrigger: {
                  trigger: '.final-cta',
                  start: mobile ? 'top 88%' : 'top 76%',
                  once: true,
                },
              });

              if (!mobile) {
                gsap.to('.phone', {
                  yPercent: 7,
                  ease: 'none',
                  scrollTrigger: {
                    trigger: '.hero',
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 0.8,
                  },
                });
                gsap.to('.hero-bear', {
                  yPercent: -14,
                  ease: 'none',
                  scrollTrigger: {
                    trigger: '.hero',
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 0.8,
                  },
                });
                gsap.to('.promise-section > img', {
                  y: -24,
                  ease: 'none',
                  scrollTrigger: {
                    trigger: '.promise-section',
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 0.8,
                  },
                });
                gsap.to('.cta-character', {
                  y: -30,
                  ease: 'none',
                  scrollTrigger: {
                    trigger: '.final-cta',
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 0.9,
                  },
                });
              }
            }, document.body);

            return () => context.revert();
          },
        );

        void document.fonts?.ready.then(() => {
          if (!cancelled) ScrollTrigger.refresh();
        });

        dispose = () => media.revert();
      },
    );

    return () => {
      cancelled = true;
      dispose();
    };
  }, []);

  return null;
}
