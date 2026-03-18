import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'cookie_consent';

export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay for better UX
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
    // Enable analytics if needed
    if (window.gtag) {
      window.gtag('consent', 'update', {
        'analytics_storage': 'granted'
      });
    }
  };

  const handleRefuse = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'refused');
    setVisible(false);
    // Disable analytics
    if (window.gtag) {
      window.gtag('consent', 'update', {
        'analytics_storage': 'denied'
      });
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-slate-200 shadow-lg md:bottom-4 md:left-4 md:right-auto md:max-w-md md:rounded-lg md:border">
      <button
        onClick={handleRefuse}
        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="pr-6">
        <h3 className="font-semibold text-slate-900 mb-2">🍪 Cookies</h3>
        <p className="text-sm text-slate-600 mb-4">
          Nous utilisons des cookies essentiels au fonctionnement du site et des cookies d'analyse 
          pour améliorer votre expérience. 
          <a href="/privacy" className="text-blue-600 hover:underline ml-1">
            En savoir plus
          </a>
        </p>
        
        <div className="flex gap-2">
          <Button
            onClick={handleAccept}
            size="sm"
            className="flex-1 rounded-sm"
          >
            Accepter
          </Button>
          <Button
            onClick={handleRefuse}
            variant="outline"
            size="sm"
            className="flex-1 rounded-sm"
          >
            Refuser
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
