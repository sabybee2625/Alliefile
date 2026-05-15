import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getThemeStyle, getSubjectLabel } from './PieceThemeBadges';
import { Lightbulb, BarChart3, Loader2, Wand2 } from 'lucide-react';
import { dossiersApi } from '../lib/api';
import { toast } from 'sonner';

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
export const DossierSynthesis = ({ dossierId, shareToken, synthesis: synthesisProp, compact = false, onChanged }) => {
  const [synthesis, setSynthesis] = useState(synthesisProp || null);
  const [loading, setLoading] = useState(!synthesisProp);
  const [reclassifying, setReclassifying] = useState(false);

  const fetchSynthesis = () => {
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
  };

  useEffect(() => {
    if (synthesisProp) { setSynthesis(synthesisProp); setLoading(false); return; }
    fetchSynthesis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossierId, synthesisProp]);

  const handleReclassify = async () => {
    if (!dossierId) return;
    setReclassifying(true);
    try {
      const res = await dossiersApi.reclassify(dossierId);
      const { updated, skipped, total } = res.data;
      toast.success(`Classement terminé : ${updated} pièce(s) classée(s), ${skipped} déjà à jour.`);
      fetchSynthesis();
      onChanged?.();
    } catch (e) {
      toast.error("Erreur lors du classement");
    } finally {
      setReclassifying(false);
    }
  };

  if (loading) return null;
  // Affiche toujours en mode privé (pour pouvoir lancer le reclassement même si 0 pièce classée)
  if (!synthesis) return null;
  if (!synthesis.pieces_classifiees && !dossierId) return null;

  const top = synthesis.themes.slice(0, 5);
  const needsClassification = dossierId && synthesis.total_pieces > 0 && synthesis.pieces_classifiees < synthesis.total_pieces;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-sm p-4 mb-4" data-testid="dossier-synthesis">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-900">Synthèse du dossier</h3>
          <span className="text-xs text-slate-500">
            ({synthesis.pieces_classifiees}/{synthesis.total_pieces} pièces classées)
          </span>
        </div>
        {needsClassification && (
          <button
            type="button"
            onClick={handleReclassify}
            disabled={reclassifying}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 px-3 py-1.5 rounded-sm"
            data-testid="reclassify-button"
          >
            {reclassifying ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Classement…</>
            ) : (
              <><Wand2 className="w-3.5 h-3.5" />Classer les anciennes pièces</>
            )}
          </button>
        )}
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
