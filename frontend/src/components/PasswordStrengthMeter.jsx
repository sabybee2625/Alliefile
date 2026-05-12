import React from 'react';

/**
 * Calcule la force d'un mot de passe : 0..5
 *  +1 si longueur >= 8
 *  +1 si longueur >= 12
 *  +1 si contient une minuscule + une majuscule
 *  +1 si contient un chiffre
 *  +1 si contient un caractère spécial
 */
export function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '', bars: 0 };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score, label: 'Très faible', color: 'bg-red-500', text: 'text-red-600', bars: 1 };
  if (score === 2) return { score, label: 'Faible', color: 'bg-orange-500', text: 'text-orange-600', bars: 2 };
  if (score === 3) return { score, label: 'Moyen', color: 'bg-amber-500', text: 'text-amber-600', bars: 3 };
  if (score === 4) return { score, label: 'Fort', color: 'bg-emerald-500', text: 'text-emerald-600', bars: 4 };
  return { score, label: 'Très fort', color: 'bg-emerald-600', text: 'text-emerald-700', bars: 5 };
}

export const PasswordStrengthMeter = ({ password }) => {
  if (!password) return null;
  const s = getPasswordStrength(password);
  return (
    <div className="mt-2" data-testid="password-strength">
      <div className="flex gap-1 mb-1" aria-label={`Force: ${s.label}`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-sm transition-colors ${
              i <= s.bars ? s.color : 'bg-slate-200'
            }`}
            data-testid={`password-strength-bar-${i}`}
          />
        ))}
      </div>
      <p className={`text-xs ${s.text}`} data-testid="password-strength-label">
        Force : {s.label}
      </p>
      <p className="text-xs text-slate-400 mt-1">
        Minimum 8 caractères. Idéalement : majuscules, chiffres et caractères spéciaux.
      </p>
    </div>
  );
};
