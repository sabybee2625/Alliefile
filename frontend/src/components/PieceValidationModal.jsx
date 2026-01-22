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
import { Loader2, AlertCircle, CheckCircle, Eye, Quote } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const pieceTypes = [
  'plainte',
  'main_courante',
  'certificat_medical',
  'attestation',
  'sms',
  'conclusions',
  'assignation',
  'recit',
  'autre',
];

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
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDateSelect = (date) => {
    if (date) {
      handleChange('date_document', format(date, 'yyyy-MM-dd'));
    }
    setCalendarOpen(false);
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

  const getConfidenceBadge = (level) => {
    if (!level) return null;
    return (
      <Badge variant="outline" className={`confidence-${level} text-xs`}>
        {confidenceLabels[level]}
      </Badge>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            Propositions IA
            {piece.status === 'a_verifier' && (
              <Badge variant="outline" className="status-a_verifier">À vérifier</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Vérifiez et modifiez les informations extraites automatiquement
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Original filename */}
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

          {/* Extract justificatif */}
          {proposal.extrait_justificatif && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-sm">
              <div className="flex items-start gap-2">
                <Quote className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-sky-700 mb-1">Extrait justificatif</p>
                  <p className="text-sm text-sky-900 italic">"{proposal.extrait_justificatif}"</p>
                </div>
              </div>
            </div>
          )}

          {/* Type de pièce */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Type de pièce</Label>
              {getConfidenceBadge(proposal.type_confidence)}
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
                    {pieceTypeLabels[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date du document */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Date du document</Label>
              {getConfidenceBadge(proposal.date_confidence)}
            </div>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal rounded-sm"
                  data-testid="date-picker"
                >
                  {formData.date_document
                    ? formatDate(formData.date_document)
                    : 'Sélectionner une date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date_document ? new Date(formData.date_document) : undefined}
                  onSelect={handleDateSelect}
                  locale={fr}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Titre */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Titre</Label>
              {getConfidenceBadge(proposal.titre_confidence)}
            </div>
            <Input
              value={formData.titre}
              onChange={(e) => handleChange('titre', e.target.value)}
              className="rounded-sm"
              data-testid="titre-input"
            />
          </div>

          {/* Résumé factuel */}
          <div className="space-y-4 p-4 bg-slate-50 rounded-sm">
            <h4 className="font-medium text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-slate-500" />
              Résumé factuel
            </h4>
            
            <div className="space-y-2">
              <Label>Qui ?</Label>
              <Input
                value={formData.resume_qui}
                onChange={(e) => handleChange('resume_qui', e.target.value)}
                placeholder="Personnes impliquées"
                className="rounded-sm"
                data-testid="resume-qui-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Quoi ?</Label>
              <Textarea
                value={formData.resume_quoi}
                onChange={(e) => handleChange('resume_quoi', e.target.value)}
                placeholder="Fait ou motif principal"
                className="rounded-sm resize-none"
                rows={2}
                data-testid="resume-quoi-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Où ?</Label>
              <Input
                value={formData.resume_ou}
                onChange={(e) => handleChange('resume_ou', e.target.value)}
                placeholder="Lieu (si mentionné)"
                className="rounded-sm"
                data-testid="resume-ou-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Élément clé / Conséquence</Label>
              <Textarea
                value={formData.resume_element_cle}
                onChange={(e) => handleChange('resume_element_cle', e.target.value)}
                placeholder="Diagnostic, menace, refus, constat..."
                className="rounded-sm resize-none"
                rows={2}
                data-testid="resume-element-cle-input"
              />
            </div>
          </div>

          {/* Mots-clés */}
          {formData.mots_cles.length > 0 && (
            <div className="space-y-2">
              <Label>Mots-clés suggérés</Label>
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

        <DialogFooter>
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
