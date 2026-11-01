import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import './banner.css';

const banners = [
  { image: '/banners/ramen.png', category: 'Ramen', text: 'Your favourite ramen. A little closer. Discover comforting Japanese flavours. Explore ramen.' },
  { image: '/banners/chocolate.png', category: 'Chocolate', text: 'Sweet little escapes. Discover your new favourite Japanese treats. Explore treats.' },
  { image: '/banners/beauty.png', category: 'Beauty', text: 'Your everyday glow starts here. Thoughtful Japanese care for your daily ritual. Explore beauty.' },
];

export default function BannerSlider({ onShop }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (paused || hovered || focused || reduced) return;
    const timer = window.setInterval(() => setActive(index => (index + 1) % banners.length), 5000);
    return () => window.clearInterval(timer);
  }, [active, paused, hovered, focused, reduced]);
  const move = direction => setActive(index => (index + direction + banners.length) % banners.length);
  return <section className="banner-slider" aria-label="KUMO featured collections" aria-roledescription="carousel"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
    onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); } if (event.key === 'ArrowRight') { event.preventDefault(); move(1); } }}>
    <div className="banner-stage">
      {banners.map((banner, index) => <button key={banner.category} className={'banner-slide' + (active === index ? ' is-active' : '')}
        tabIndex={active === index ? 0 : -1} aria-hidden={active !== index}
        aria-label={banner.text} onClick={() => onShop(banner.category)}>
        <img src={banner.image} alt={banner.text} loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'auto'} />
      </button>)}
    </div>
    <div className="banner-controls">
      <button aria-label="Previous banner" onClick={() => move(-1)}><ChevronLeft size={17} /></button>
      <div className="banner-dots">{banners.map((banner, index) => <button key={banner.category} aria-label={`Show ${banner.category} banner`} aria-current={active === index ? 'true' : undefined} className={active === index ? 'is-active' : ''} onClick={() => setActive(index)} />)}</div>
      <button aria-label="Next banner" onClick={() => move(1)}><ChevronRight size={17} /></button>
      {!reduced && <button aria-label={paused ? 'Play slideshow' : 'Pause slideshow'} onClick={() => setPaused(value => !value)}>{paused ? <Play size={14} /> : <Pause size={14} />}</button>}
    </div>
  </section>;
}
