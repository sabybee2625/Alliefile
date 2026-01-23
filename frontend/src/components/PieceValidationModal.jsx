import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { piecesApi } from '../lib/api';
import { pieceTypeLabels, confidenceLabels, formatDate } from '../lib/utils';
import { toast } from 'sonner';
import { Loader2, AlertCircle, CheckCircle, Eye, Quote, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import { DateInput } from './DateInput';
import { FilePreviewModal } from './FilePreviewModal';

const pieceTypes = [
  'plainte',
  'main_courante',
  'certificat_medical',
  'attestation',
  'sms',
  'conclusions',
  'assignation',
  'recit',
  'facture',
  'contrat',
  'jugement',
  'ordonnance',
  'autre',
];

const ConfidenceBadge = ({ level }) => {
  if (!level) return null;
  
  const config = {
    fort: { icon: ShieldCheck, className: 'confidence-fort', label: 'Confiance élevée' },
    moyen: { icon: ShieldAlert, className: 'confidence-moyen', label: 'Confiance moyenne' },
    faible: { icon: ShieldQuestion, className: 'confidence-faible', label: 'Confiance faible' },
  };
  
  const cfg = config[level] || config.faible;
  const Icon = cfg.icon;
  
  return (
    <Badge variant="outline" className={`${cfg.className} text-xs flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
};

export const PieceValidationModal = ({ piece, onClose, onValidated }) => {
  const proposal = piece.ai_proposal || {};
  
  const [formData, setFormData] = useState({
    type_piece: proposal.type_piece || 'autre',
    date_document: proposal.date_document || '',
    titre: proposal.titre || piece.original_filename,
    resume_qui: proposal.resume_qui || '',
    resume_quoi: proposal.resume_quoi || '',
    resume_ou: proposal.resume_ou || '',
    resume_element_cle: proposal.resume_element_cle || '',
    mots_cles: proposal.mots_cles || [],
  });
  
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await piecesApi.validate(piece.id, formData);
      toast.success('Pièce validée avec succès');
      onValidated();
    } catch (error) {
      toast.error('Erreur lors de la validation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            Propositions IA - Pièce {piece.numero}
            {piece.status === 'a_verifier' && (
              <Badge variant="outline" className="status-a_verifier">À vérifier</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Vérifiez les informations extraites. Les niveaux de confiance et extraits justificatifs vous aident à évaluer la fiabilité.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Original filename & View button */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-sm">
            <div>
              <p className="text-xs text-slate-500">Fichier original</p>
              <p className="text-sm font-medium">{piece.original_filename}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(piecesApi.getFileUrl(piece.id), '_blank')}
              className="rounded-sm"
            >
              <Eye className="w-4 h-4 mr-1" />
              Voir
            </Button>
          </div>

          {/* Extrait justificatif - PROMINENTLY DISPLAYED */}
          {proposal.extrait_justificatif && (
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-sm">
              <div className="flex items-start gap-3">
                <Quote className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-1">
                    Extrait justificatif de l'analyse
                  </p>
                  <p className="text-sm text-sky-900 italic leading-relaxed">
                    "{proposal.extrait_justificatif}"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Type de pièce */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Type de pièce</Label>
              <ConfidenceBadge level={proposal.type_confidence} />
            </div>
            <Select
              value={formData.type_piece}
              onValueChange={(value) => handleChange('type_piece', value)}
            >
              <SelectTrigger className="rounded-sm" data-testid="type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pieceTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {pieceTypeLabels[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date du document */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Date du document</Label>
              <ConfidenceBadge level={proposal.date_confidence} />
            </div>
            <DateInput
              value={formData.date_document}
              onChange={(val) => handleChange('date_document', val)}
              placeholder="JJ/MM/AAAA"
              allowUnknown={true}
            />
          </div>

          {/* Titre */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Titre</Label>
              <ConfidenceBadge level={proposal.titre_confidence} />
            </div>
            <Input
              value={formData.titre}
              onChange={(e) => handleChange('titre', e.target.value)}
              className="rounded-sm"
              data-testid="titre-input"
            />
          </div>

          {/* Résumé factuel - Structured */}
          <div className="space-y-4 p-4 bg-slate-50 rounded-sm border border-slate-200">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-sky-600" />
              Résumé factuel structuré
            </h4>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide text-slate-500">Qui ?</Label>
                <Input
                  value={formData.resume_qui}
                  onChange={(e) => handleChange('resume_qui', e.target.value)}
                  placeholder="Personnes impliquées"
                  className="rounded-sm"
                  data-testid="resume-qui-input"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide text-slate-500">Quoi ?</Label>
                <Textarea
                  value={formData.resume_quoi}
                  onChange={(e) => handleChange('resume_quoi', e.target.value)}
                  placeholder="Fait ou motif principal"
                  className="rounded-sm resize-none"
                  rows={2}
                  data-testid="resume-quoi-input"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide text-slate-500">Où ?</Label>
                <Input
                  value={formData.resume_ou}
                  onChange={(e) => handleChange('resume_ou', e.target.value)}
                  placeholder="Lieu (si mentionné)"
                  className="rounded-sm"
                  data-testid="resume-ou-input"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide text-slate-500">Élément clé / Conséquence</Label>
                <Textarea
                  value={formData.resume_element_cle}
                  onChange={(e) => handleChange('resume_element_cle', e.target.value)}
                  placeholder="Diagnostic, menace, refus, constat, montant, décision..."
                  className="rounded-sm resize-none"
                  rows={2}
                  data-testid="resume-element-cle-input"
                />
              </div>
            </div>
          </div>

          {/* Mots-clés */}
          {formData.mots_cles.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-slate-500">Mots-clés suggérés</Label>
              <div className="flex flex-wrap gap-2">
                {formData.mots_cles.map((mot, index) => (
                  <Badge key={index} variant="secondary" className="rounded-sm">
                    {mot}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-sm">
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 rounded-sm"
            data-testid="confirm-validation"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Valider la pièce
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
