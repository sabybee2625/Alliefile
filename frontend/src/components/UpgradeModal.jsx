import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';

/**
 * Modal d'upsell vers le plan Essentiel.
 * Props:
 *  - open: boolean
 *  - onOpenChange: fn(boolean)
 *  - feature: 'export_pdf' | 'export_docx' | 'assistant_per_dossier' | 'assistant_document_type' | string
 *  - title?: string (override)
 *  - message?: string (override)
 */
const FEATURE_COPY = {
  export_pdf: {
    title: 'Passez au niveau supérieur',
    message: "Pour télécharger votre dossier complet en PDF, passez au forfait Essentiel.",
  },
  export_docx: {
    title: 'Passez au niveau supérieur',
    message: "Pour exporter votre dossier au format DOCX éditable, passez au forfait Essentiel.",
  },
  assistant_per_dossier: {
    title: 'Vous avez déjà utilisé votre exposé des faits',
    message: "Le plan Découverte autorise un seul exposé des faits par dossier. Passez au plan Essentiel pour rédiger autant de courriers et exposés que vous souhaitez.",
  },
  assistant_document_type: {
    title: 'Cette fonctionnalité est réservée au plan Essentiel',
    message: "Pour rédiger des courriers à votre avocat, propriétaire ou administration, passez au plan Essentiel et débloquez la rédaction illimitée.",
  },
  default: {
    title: 'Passez au niveau supérieur',
    message: "Cette fonctionnalité est réservée aux plans Essentiel et Sérénité. Passez au niveau supérieur pour en profiter.",
  },
};

export const UpgradeModal = ({ open, onOpenChange, feature, title, message }) => {
  const navigate = useNavigate();
  const copy = FEATURE_COPY[feature] || FEATURE_COPY.default;

  const handleUpgrade = () => {
    onOpenChange?.(false);
    navigate('/pricing');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="upgrade-modal">
        <DialogHeader>
          <div className="w-12 h-12 rounded-sm bg-sky-50 flex items-center justify-center mb-3 mx-auto">
            <Sparkles className="w-6 h-6 text-sky-600" />
          </div>
          <DialogTitle className="text-center text-xl font-heading" data-testid="upgrade-modal-title">
            {title || copy.title}
          </DialogTitle>
          <DialogDescription className="text-center text-slate-600 pt-2" data-testid="upgrade-modal-message">
            {message || copy.message}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row-reverse gap-2 mt-4">
          <Button
            onClick={handleUpgrade}
            className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white rounded-sm"
            data-testid="upgrade-modal-cta"
          >
            Passer à Essentiel
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange?.(false)}
            className="w-full sm:w-auto rounded-sm"
            data-testid="upgrade-modal-close"
          >
            Plus tard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Helper: ouvre la modale d'upgrade si la réponse API contient un PLAN_LIMIT_EXCEEDED.
 * Returns true if handled.
 */
export function handlePlanLimitError(err, setModalState) {
  const detail = err?.response?.data?.detail;
  if (detail && typeof detail === 'object' && detail.error === 'PLAN_LIMIT_EXCEEDED') {
    setModalState({
      open: true,
      feature: detail.feature,
      message: detail.message,
    });
    return true;
  }
  return false;
}

export default UpgradeModal;
