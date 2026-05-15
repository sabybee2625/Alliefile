import React, { useMemo } from 'react';
import { getThemeStyle, getSubjectLabel } from './PieceThemeBadges';
import { X } from 'lucide-react';

/**
 * Sticky filter bar — affiche deux rangées de badges (Sujets / Thèmes).
 * Le clic sur un badge le toggle dans la sélection.
 *
 * Props:
 *  - pieces:        liste complète des pièces (pour calculer les options)
 *  - activeThemes:  Set<string>
 *  - activeSubjects:Set<string>
 *  - onToggleTheme: fn(theme)
 *  - onToggleSubject: fn(subject)
 *  - onClear:       fn()
 *  - sticky:        boolean (default true)
 */
export const PieceFilterBar = ({
  pieces = [],
  activeThemes,
  activeSubjects,
  onToggleTheme,
  onToggleSubject,
  onClear,
  sticky = true,
}) => {
  const { themes, subjects } = useMemo(() => {
    const themeCounts = new Map();
    const subjectCounts = new Map();
    for (const p of pieces) {
      const v = p.validated_data || {};
      const a = p.ai_proposal || {};
      const ths = (v.tags_thematiques?.length ? v.tags_thematiques : a.tags_thematiques) || [];
      const subs = (v.sujets_concernes?.length ? v.sujets_concernes : a.sujets_concernes) || [];
      for (const t of ths) themeCounts.set(t, (themeCounts.get(t) || 0) + 1);
      for (const s of subs) subjectCounts.set(s, (subjectCounts.get(s) || 0) + 1);
    }
    return {
      themes: [...themeCounts.entries()].sort((a, b) => b[1] - a[1]),
      subjects: [...subjectCounts.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [pieces]);

  if (!themes.length && !subjects.length) return null;

  const hasActive = (activeThemes?.size || 0) + (activeSubjects?.size || 0) > 0;

  return (
    <div
      className={`${sticky ? 'sticky top-0 z-20' : ''} bg-white/95 backdrop-blur border-b border-slate-200 -mx-4 px-4 py-3 mb-4`}
      data-testid="piece-filter-bar"
    >
      {subjects.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Sujets</div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:thin]" data-testid="filter-row-subjects">
            {subjects.map(([key, count]) => {
              const active = activeSubjects?.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onToggleSubject?.(key)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors border ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                  data-testid={`filter-subject-${key}`}
                >
                  {getSubjectLabel(key)}
                  <span className={`text-[10px] ${active ? 'text-slate-300' : 'text-slate-400'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {themes.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Thèmes</div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:thin]" data-testid="filter-row-themes">
            {themes.map(([key, count]) => {
              const s = getThemeStyle(key);
              const active = activeThemes?.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onToggleTheme?.(key)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors border ${
                    active ? 'ring-2 ring-offset-1 ring-slate-900' : ''
                  }`}
                  style={{
                    backgroundColor: s.bg,
                    color: s.fg,
                    borderColor: active ? s.dot : 'transparent',
                  }}
                  data-testid={`filter-theme-${key}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
                  {s.label || key}
                  <span className="text-[10px] opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {hasActive && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
            data-testid="filter-clear"
          >
            <X className="w-3 h-3" />
            Effacer les filtres
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Hook utilitaire : retourne {activeThemes, activeSubjects, toggle..., clear, applyTo}
 */
export function usePieceFilters() {
  const [activeThemes, setActiveThemes] = React.useState(() => new Set());
  const [activeSubjects, setActiveSubjects] = React.useState(() => new Set());

  const toggleTheme = (t) => setActiveThemes((prev) => {
    const next = new Set(prev);
    next.has(t) ? next.delete(t) : next.add(t);
    return next;
  });
  const toggleSubject = (s) => setActiveSubjects((prev) => {
    const next = new Set(prev);
    next.has(s) ? next.delete(s) : next.add(s);
    return next;
  });
  const clear = () => { setActiveThemes(new Set()); setActiveSubjects(new Set()); };

  /**
   * Filtre une liste de pièces : ET entre groupes (Sujets ET Thèmes), OU à l'intérieur de chaque groupe.
   */
  const applyTo = (pieces) => {
    if (!activeThemes.size && !activeSubjects.size) return pieces;
    return pieces.filter((p) => {
      const v = p.validated_data || {};
      const a = p.ai_proposal || {};
      const ths = new Set((v.tags_thematiques?.length ? v.tags_thematiques : a.tags_thematiques) || []);
      const subs = new Set((v.sujets_concernes?.length ? v.sujets_concernes : a.sujets_concernes) || []);
      const themeOk = !activeThemes.size || [...activeThemes].some((t) => ths.has(t));
      const subjectOk = !activeSubjects.size || [...activeSubjects].some((s) => subs.has(s));
      return themeOk && subjectOk;
    });
  };

  return { activeThemes, activeSubjects, toggleTheme, toggleSubject, clear, applyTo };
}

export default PieceFilterBar;
