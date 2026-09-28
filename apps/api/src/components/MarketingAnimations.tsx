'use client';

import { useEffect } from 'react';

/** Replays the paused `a-*` CSS animations inside `root` from their first frame. */
function replay(root: Element | null) {
  if (!root) return;
  for (const animation of root.getAnimations({ subtree: true })) {
    if (animation.effect?.getComputedTiming().iterations === Infinity) continue;
    animation.currentTime = 0;
    animation.play();
  }
}

/**
 * Progressive enhancement: the full page remains visible and usable without
 * JavaScript. Scroll position drives which app screen the pinned phone shows
 * (with or without reduced motion); everything else is decoration.
 */
export function MarketingAnimations() {
  useEffect(() => {
    let cancelled = false;
    let dispose = () => {};
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) root.classList.add('motion');

    const story = document.querySelector<HTMLElement>('.story');
    const steps = [...document.querySelectorAll<HTMLElement>('.story-step')];
    const stage = document.querySelector<HTMLElement>('.stage-device');

    let current = -1;
    const setStep = (index: number) => {
      if (!story || current === index) return;
      current = index;
      story.dataset.step = String(index);
      steps.forEach((step, i) => step.classList.toggle('is-current', i === index));
      stage?.querySelectorAll<HTMLElement>('[data-layer]').forEach((layer) => {
        const active = layer.dataset.layer === String(index);
        layer.classList.toggle('is-active', active);
        if (active && !reduceMotion) replay(layer);
      });
      document.querySelectorAll<HTMLElement>('[data-dot]').forEach((dot) => {
        dot.classList.toggle('is-active', dot.dataset.dot === String(index));
      });
    };
    steps[0]?.classList.add('is-current');

    // Small screens show one phone per step; play each as it scrolls into view.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          replay(entry.target);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.35 },
    );
    if (!reduceMotion) document.querySelectorAll('.step-device').forEach((el) => observer.observe(el));

    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        if (cancelled) return;

        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ limitCallbacks: true });

        const media = gsap.matchMedia();

        media.add('(min-width: 1024px)', () => {
          steps.forEach((step, i) => {
            ScrollTrigger.create({
              trigger: step,
              start: 'top 55%',
              end: 'bottom 55%',
              onToggle: (self) => self.isActive && setStep(i),
            });
          });
          return () => {
            setStep(0);
            current = -1;
          };
        });

        media.add(
          {
            reduceMotion: '(prefers-reduced-motion: reduce)',
            mobile: '(max-width: 860px)',
            fine: '(hover: hover) and (pointer: fine)',
          },
          (match) => {
            const { reduceMotion: reduce, mobile, fine } = match.conditions as Record<string, boolean>;

            if (reduce) return;

            const context = gsap.context(() => {
              gsap
                .timeline({ defaults: { duration: 0.8, ease: 'power3.out' } })
                .from('.hero-copy > *', { autoAlpha: 0, y: 26, stagger: 0.08 })
                .from('.hero-device', { autoAlpha: 0, y: 60, rotation: 6, duration: 1.1 }, 0.1)
                .add(() => replay(document.querySelector('.hero-device')), 0.55)
                .from('.hero-char', { autoAlpha: 0, scale: 0.6, stagger: 0.12, ease: 'back.out(1.8)' }, 0.6)
                .from('.chip', { autoAlpha: 0, y: 16, scale: 0.9, stagger: 0.14, ease: 'back.out(1.6)' }, 0.85);

              document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((element) => {
                gsap.from(element, {
                  autoAlpha: 0,
                  y: mobile ? 22 : 34,
                  duration: 0.8,
                  ease: 'power3.out',
                  scrollTrigger: { trigger: element, start: 'top 88%', once: true },
                });
              });

              document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((group) => {
                const items = group.querySelectorAll<HTMLElement>('[data-stagger-item]');
                if (!items.length) return;
                gsap.from(items, {
                  autoAlpha: 0,
                  y: mobile ? 24 : 44,
                  duration: 0.8,
                  stagger: mobile ? 0.08 : 0.12,
                  ease: 'power3.out',
                  scrollTrigger: { trigger: group, start: 'top 85%', once: true },
                });
              });

              for (const card of ['.fam-caregivers', '.fam-device']) {
                gsap.from(`${card} .caregiver, ${card} .connection-line, ${card} .pair-tablet, ${card} .pair-phone`, {
                  autoAlpha: 0,
                  scale: 0.6,
                  duration: 0.6,
                  stagger: 0.1,
                  ease: 'back.out(1.8)',
                  scrollTrigger: { trigger: card, start: 'top 75%', once: true },
                });
              }

              gsap.from('.activity-bars span', {
                scaleY: 0,
                transformOrigin: 'bottom center',
                duration: 0.8,
                stagger: 0.07,
                ease: 'power2.out',
                scrollTrigger: { trigger: '.fam-activity', start: 'top 80%', once: true },
              });

              gsap.from('.final-cta > :not(.cta-char)', {
                autoAlpha: 0,
                y: 28,
                duration: 0.8,
                stagger: 0.09,
                ease: 'power3.out',
                scrollTrigger: { trigger: '.final-cta', start: 'top 78%', once: true },
              });

              if (!mobile) {
                gsap.to('.hero-device', {
                  yPercent: 6,
                  ease: 'none',
                  scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.8 },
                });
                gsap.to('.hero-char', {
                  yPercent: -40,
                  ease: 'none',
                  scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.8 },
                });
              }

              // The hero phone leans gently toward the pointer.
              if (fine && !mobile) {
                const inner = document.querySelector<HTMLElement>('.hero-device .device-inner');
                const hero = document.querySelector<HTMLElement>('.hero');
                if (inner && hero) {
                  gsap.set(inner, { transformPerspective: 1100 });
                  const rotY = gsap.quickTo(inner, 'rotationY', { duration: 0.8, ease: 'power3.out' });
                  const rotX = gsap.quickTo(inner, 'rotationX', { duration: 0.8, ease: 'power3.out' });
                  const onMove = (event: PointerEvent) => {
                    const box = hero.getBoundingClientRect();
                    rotY(((event.clientX - box.left) / box.width - 0.5) * 10);
                    rotX(-((event.clientY - box.top) / box.height - 0.5) * 7);
                  };
                  const onLeave = () => { rotY(0); rotX(0); };
                  hero.addEventListener('pointermove', onMove);
                  hero.addEventListener('pointerleave', onLeave);
                  return () => {
                    hero.removeEventListener('pointermove', onMove);
                    hero.removeEventListener('pointerleave', onLeave);
                  };
                }
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
      observer.disconnect();
      root.classList.remove('motion');
      dispose();
    };
  }, []);

  return null;
}
