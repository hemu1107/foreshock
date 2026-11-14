import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SignalBackground() {
  const [paused, setPaused] = useState(false);
  const background = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const seen = new WeakSet<Element>();
    let frame = 0;
    let observer: IntersectionObserver | undefined;
    const update = () => {
      frame = 0;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const fraction = Math.min(1, Math.max(0, window.scrollY / max));
      progress.current?.style.setProperty('--reading-progress', String(fraction));
      background.current?.style.setProperty('--scroll-depth', `${paused || media.matches ? 0 : fraction * -110}px`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observe = () => {
      if (!observer || paused || media.matches) return;
      document.querySelectorAll('#main-content .page > section, #main-content .section-heading, #main-content .featured-trace, #main-content .signal-stack, #main-content .origin-section, #main-content .spread-section, #main-content .evidence-layout, #main-content .method-rule, #main-content ol > li, #main-content .site-footer, #main-content .workspace-state, #main-content .empty-state, #main-content .table-frame').forEach(element => {
        if (seen.has(element)) return;
        seen.add(element);
        observer?.observe(element);
      });
      schedule();
    };
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          observer?.unobserve(entry.target);
          if (paused || media.matches) return;
          const element = entry.target;
          const siblings = Array.from(element.parentElement?.children ?? []);
          const delay = element.classList.contains('featured-trace') || element.matches('ol > li') ? Math.min(siblings.indexOf(element), 3) * 80 : 0;
          element.animate([
            { opacity: 0.55, translate: '0 22px' },
            { opacity: 1, translate: '0 0' },
          ], { duration: 650, delay, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' });
        });
      }, { threshold: 0, rootMargin: '0px 0px -5% 0px' });
    }
    const stopMotion = () => {
      if (paused || media.matches) document.querySelectorAll('#main-content *').forEach(el => el.getAnimations().forEach(animation => animation.cancel()));
      update();
      observe();
    };
    const mutations = new MutationObserver(observe);
    mutations.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    media.addEventListener('change', stopMotion);
    stopMotion();
    return () => {
      observer?.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      media.removeEventListener('change', stopMotion);
    };
  }, [paused]);
  return <>
    <div ref={progress} className="reading-progress" aria-hidden="true" />
    <div ref={background} className={`signal-background${paused ? ' motion-paused' : ''}`} aria-hidden="true">
      <div className="signal-depth-layer">
      <div className="signal-mesh" />
      <div className="signal-stream stream-one" />
      <div className="signal-stream stream-two" />
      <div className="signal-stream stream-three" />
      <div className="signal-stream stream-four" />
      </div>
    </div>
    <Button variant="outline" size="icon" className="ambient-control" onClick={() => setPaused(value => !value)} aria-pressed={paused} aria-label={paused ? 'Resume background animation' : 'Pause background animation'} title={paused ? 'Resume background animation' : 'Pause background animation'}>
      {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
    </Button>
  </>;
}