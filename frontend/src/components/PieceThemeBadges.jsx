import React from 'react';

// Palette pastels :
// - Rouge brique → urgence (violence, harcèlement)
// - Bleu ardoise → travail
// - Vert sauge → santé
// - Autres tons doux distincts
const THEME_STYLES = {
  // urgence (rouge brique pastel)
  violence:     { bg: '#FCE7E5', fg: '#9B3A3A', dot: '#B5524F', label: 'Violence' },
  harcelement:  { bg: '#FCE7E5', fg: '#9B3A3A', dot: '#B5524F', label: 'Harcèlement' },
  // travail (bleu ardoise pastel)
  travail:      { bg: '#E2E8F0', fg: '#334155', dot: '#475569', label: 'Travail' },
  // sante (vert sauge pastel)
  sante:        { bg: '#DCE9DC', fg: '#3F6E47', dot: '#5A8364', label: 'Santé' },
  // autres thèmes (doux)
  famille:      { bg: '#F3E8DB', fg: '#7C5A36', dot: '#A07C4F', label: 'Famille' },
  logement:     { bg: '#E4DDF2', fg: '#5B4882', dot: '#7A66A1', label: 'Logement' },
  finances:     { bg: '#FAEFCF', fg: '#7C6212', dot: '#A8881E', label: 'Finances' },
  administratif:{ bg: '#E0EBF3', fg: '#365D7C', dot: '#5A7FA0', label: 'Administratif' },
  scolaire:     { bg: '#E5F0E8', fg: '#3F6645', dot: '#5C8064', label: 'Scolaire' },
  succession:   { bg: '#F0E5DD', fg: '#7A5A45', dot: '#9B7558', label: 'Succession' },
  consommation: { bg: '#E8E4F1', fg: '#54467A', dot: '#76679B', label: 'Consommation' },
};

const SUBJECT_LABELS = {
  utilisateur: 'Vous',
  conjoint: 'Conjoint',
  'ex-conjoint': 'Ex-conjoint',
  enfant: 'Enfant',
  employeur: 'Employeur',
  bailleur: 'Bailleur',
  voisin: 'Voisin',
  administration: 'Administration',
  medecin: 'Médecin',
  police: 'Police',
  tiers: 'Tiers',
};

const SUBJECT_STYLE = { bg: '#F1F5F9', fg: '#334155' };

export function getThemeStyle(key) {
  return THEME_STYLES[key] || { bg: '#F1F5F9', fg: '#475569', label: key };
}

export function getSubjectLabel(key) {
  return SUBJECT_LABELS[key] || key;
}

/**
 * Petits badges de thèmes/sujets affichés sur chaque carte de pièce.
 * Props:
 *  - themes: string[]
 *  - subjects: string[]
 *  - size: 'sm' (par défaut) | 'xs'
 */
export const PieceThemeBadges = ({ themes = [], subjects = [], size = 'sm' }) => {
  if (!themes.length && !subjects.length) return null;
  const padding = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]';
  return (
    <div className="flex flex-wrap gap-1 mt-1" data-testid="piece-theme-badges">
      {themes.map((t) => {
        const s = getThemeStyle(t);
        return (
          <span
            key={`th-${t}`}
            className={`inline-flex items-center gap-1 rounded-sm font-medium ${padding}`}
            style={{ backgroundColor: s.bg, color: s.fg }}
            data-testid={`piece-theme-${t}`}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
            {s.label || t}
          </span>
        );
      })}
      {subjects.map((sj) => (
        <span
          key={`sj-${sj}`}
          className={`inline-flex items-center rounded-sm font-medium ${padding}`}
          style={{ backgroundColor: SUBJECT_STYLE.bg, color: SUBJECT_STYLE.fg }}
          data-testid={`piece-subject-${sj}`}
        >
          {getSubjectLabel(sj)}
        </span>
      ))}
    </div>
  );
};

export default PieceThemeBadges;
