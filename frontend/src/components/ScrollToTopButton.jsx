import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * Bouton flottant qui apparaît après quelques centaines de pixels de scroll
 * et ramène la page tout en haut au clic.
 *
 * Posé sans modifier la mise en page : `fixed bottom-right`, z-index élevé,
 * petit + discret pour ne pas gêner le contenu.
 */
export const ScrollToTopButton = ({ threshold = 320 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Remonter en haut"
      data-testid="scroll-to-top-btn"
      className="fixed bottom-5 right-5 z-40 w-11 h-11 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg flex items-center justify-center transition-all duration-200 ease-out"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
};

export default ScrollToTopButton;
