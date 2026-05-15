import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getThemeStyle, getSubjectLabel } from './PieceThemeBadges';
import { Lightbulb, BarChart3 } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Affiche la synthèse factuelle + l'aide à la constitution.
 *
 * Props:
 *  - dossierId:  string (mode privé, token JWT requis)
 *  - shareToken: string (mode partagé public)
 *  - synthesis:  objet déjà calculé (priorité sur les fetch — utilisé par SharedDossier qui reçoit synthesis dans /shared/{token})
 *  - compact:    boolean
 */
export const DossierSynthesis = ({ dossierId, shareToken, synthesis: synthesisProp, compact = false }) => {
  const [synthesis, setSynthesis] = useState(synthesisProp || null);
  const [loading, setLoading] = useState(!synthesisProp);

  useEffect(() => {
    if (synthesisProp) { setSynthesis(synthesisProp); setLoading(false); return; }
    if (!dossierId) return;
    const token = localStorage.getItem('token');
    axios
      .get(`${API}/api/dossiers/${dossierId}/synthesis`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 5000,
      })
      .then((r) => setSynthesis(r.data))
      .catch(() => setSynthesis(null))
      .finally(() => setLoading(false));
  }, [dossierId, synthesisProp]);

  if (loading) return null;
  if (!synthesis || !synthesis.pieces_classifiees) return null;

  const top = synthesis.themes.slice(0, 5);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-sm p-4 mb-4" data-testid="dossier-synthesis">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-slate-600" />
        <h3 className="text-sm font-semibold text-slate-900">Synthèse du dossier</h3>
        <span className="text-xs text-slate-500">
          ({synthesis.pieces_classifiees}/{synthesis.total_pieces} pièces analysées)
        </span>
      </div>

      {/* Thèmes top */}
      {top.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Thèmes principaux</div>
          <div className="flex flex-wrap gap-1.5">
            {top.map((t) => {
              const s = getThemeStyle(t.key);
              return (
                <span
                  key={t.key}
                  className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-medium"
                  style={{ backgroundColor: s.bg, color: s.fg }}
                  data-testid={`synthesis-theme-${t.key}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
                  {s.label || t.key}
                  <span className="opacity-70 ml-0.5">{t.count}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Sujets top */}
      {synthesis.sujets.length > 0 && !compact && (
        <div className="mb-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Sujets concernés</div>
          <div className="flex flex-wrap gap-1.5">
            {synthesis.sujets.slice(0, 6).map((s) => (
              <span
                key={s.key}
                className="inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700"
                data-testid={`synthesis-subject-${s.key}`}
              >
                {getSubjectLabel(s.key)}
                <span className="opacity-70 ml-1">{s.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Aide à la constitution */}
      {synthesis.hints && synthesis.hints.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200" data-testid="constitution-help">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-xs font-semibold text-slate-900 mb-1">Aide à la constitution</div>
              <p className="text-[11px] text-slate-500 mb-2">
                Selon les thèmes détectés, ces pièces sont souvent utiles si vous les avez :
              </p>
              <ul className="space-y-1">
                {synthesis.hints.slice(0, 6).map((h, i) => {
                  const s = getThemeStyle(h.theme);
                  return (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <span
                        className="inline-block mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: s.dot }}
                      />
                      <span>
                        <span className="text-slate-400 mr-1">[{s.label || h.theme}]</span>
                        {h.suggestion}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DossierSynthesis;
