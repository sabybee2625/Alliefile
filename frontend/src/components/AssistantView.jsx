import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { dossiersApi } from '../lib/api';
import { formatDate, downloadBlob } from '../lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Loader2,
  Sparkles,
  FileText,
  Calendar as CalendarIcon,
  Copy,
  Download,
  AlertTriangle,
  CheckCircle,
  Info,
  Scale,
} from 'lucide-react';

// Types de documents génériques (sans référence JAF codée en dur)
const documentTypes = [
  { value: 'expose_faits', label: 'Exposé des faits', description: 'Document factuel chronologique' },
  { value: 'chronologie_narrative', label: 'Chronologie narrative', description: 'Texte rédigé avec dates et références' },
  { value: 'courrier_avocat', label: 'Courrier à un avocat', description: 'Projet de courrier présentant la situation' },
  { value: 'projet_requete', label: 'Projet de requête', description: 'Projet de requête (juridiction à préciser)' },
];

// Types de juridictions
const jurisdictionTypes = [
  { value: 'jaf', label: 'Juge aux Affaires Familiales (JAF)' },
  { value: 'penal', label: 'Pénal' },
  { value: 'prudhommes', label: 'Prud\'hommes' },
  { value: 'administratif', label: 'Administratif' },
  { value: 'civil', label: 'Civil (Tribunal judiciaire)' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'autre', label: 'Autre / Libre' },
];

export const AssistantView = ({ dossierId, pieces = [] }) => {
  const [documentType, setDocumentType] = useState('expose_faits');
  const [jurisdiction, setJurisdiction] = useState('');
  const [dateStart, setDateStart] = useState(null);
  const [dateEnd, setDateEnd] = useState(null);
  const [selectedPieces, setSelectedPieces] = useState([]);
  const [selectAll, setSelectAll] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [editedContent, setEditedContent] = useState('');

  // Filter only validated pieces
  const validatedPieces = pieces.filter(p => p.status === 'pret');

  // Show jurisdiction selector only for projet_requete
  const showJurisdiction = documentType === 'projet_requete';

  useEffect(() => {
    if (selectAll) {
      setSelectedPieces(validatedPieces.map(p => p.id));
    }
  }, [selectAll, pieces]);

  // Reset jurisdiction when document type changes
  useEffect(() => {
    if (documentType !== 'projet_requete') {
      setJurisdiction('');
    }
  }, [documentType]);

  const handleGenerate = async () => {
    if (!selectAll && selectedPieces.length === 0) {
      toast.error('Sélectionnez au moins une pièce');
      return;
    }

    if (documentType === 'projet_requete' && !jurisdiction) {
      toast.error('Veuillez sélectionner une juridiction pour le projet de requête');
      return;
    }

    setGenerating(true);
    setResult(null);
    
    try {
      const res = await dossiersApi.generateAssistant(dossierId, {
        document_type: documentType,
        jurisdiction: jurisdiction || null,
        piece_ids: selectAll ? [] : selectedPieces,
        date_start: dateStart ? format(dateStart, 'yyyy-MM-dd') : null,
        date_end: dateEnd ? format(dateEnd, 'yyyy-MM-dd') : null,
      });
      
      setResult(res.data);
      setEditedContent(res.data.content);
      toast.success('Document généré');
    } catch (error) {
      toast.error('Erreur lors de la génération');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedContent);
      toast.success('Copié dans le presse-papier');
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = editedContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Copié');
    }
  };

  const handleExportDocx = async () => {
    try {
      const blob = new Blob([editedContent], { type: 'text/plain' });
      const docType = documentTypes.find(d => d.value === documentType);
      let filename = docType?.label || 'document';
      if (jurisdiction) {
        const jurisdictionLabel = jurisdictionTypes.find(j => j.value === jurisdiction)?.label || jurisdiction;
        filename += ` - ${jurisdictionLabel}`;
      }
      downloadBlob(blob, `${filename}.txt`);
      toast.success('Document téléchargé');
    } catch {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const togglePiece = (pieceId) => {
    setSelectAll(false);
    setSelectedPieces(prev => 
      prev.includes(pieceId) 
        ? prev.filter(id => id !== pieceId)
        : [...prev, pieceId]
    );
  };

  const getDocumentTitle = () => {
    const docType = documentTypes.find(d => d.value === documentType);
    if (documentType === 'projet_requete' && jurisdiction) {
      const jurisdictionLabel = jurisdictionTypes.find(j => j.value === jurisdiction)?.label || jurisdiction;
      return `Projet de requête – ${jurisdictionLabel}`;
    }
    return docType?.label || 'Document';
  };

  if (validatedPieces.length === 0) {
    return (
      <Card className="border-slate-200 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="font-heading font-semibold text-slate-900 mb-1">
            Aucune pièce validée
          </h3>
          <p className="text-sm text-slate-500 text-center max-w-md">
            L'assistant de rédaction fonctionne uniquement à partir des pièces validées.
            Analysez et validez vos pièces pour utiliser cette fonctionnalité.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Warning */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <strong>Important :</strong> L'assistant génère des brouillons à partir des données validées uniquement.
          Chaque information cite sa source (Pièce X). Vérifiez et adaptez le texte avant utilisation juridique.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <Card className="border-slate-200 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-600" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Document Type */}
            <div className="space-y-2">
              <Label>Type de document</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger className="rounded-sm" data-testid="doc-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map(dt => (
                    <SelectItem key={dt.value} value={dt.value}>
                      <div>
                        <div className="font-medium">{dt.label}</div>
                        <div className="text-xs text-slate-500">{dt.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Jurisdiction Selector - Only for projet_requete */}
            {showJurisdiction && (
              <div className="space-y-2 p-3 bg-slate-50 rounded-sm border border-slate-200">
                <Label className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-slate-600" />
                  Juridiction *
                </Label>
                <Select value={jurisdiction} onValueChange={setJurisdiction}>
                  <SelectTrigger className="rounded-sm" data-testid="jurisdiction-select">
                    <SelectValue placeholder="Sélectionner la juridiction" />
                  </SelectTrigger>
                  <SelectContent>
                    {jurisdictionTypes.map(jt => (
                      <SelectItem key={jt.value} value={jt.value}>
                        {jt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Le choix de juridiction influence uniquement le cadre rédactionnel, pas les faits.
                </p>
              </div>
            )}

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Période (optionnel)</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start rounded-sm text-xs">
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {dateStart ? format(dateStart, 'dd/MM/yyyy') : 'Début'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateStart}
                      onSelect={setDateStart}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start rounded-sm text-xs">
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {dateEnd ? format(dateEnd, 'dd/MM/yyyy') : 'Fin'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateEnd}
                      onSelect={setDateEnd}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {(dateStart || dateEnd) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setDateStart(null); setDateEnd(null); }}
                  className="text-xs"
                >
                  Effacer les dates
                </Button>
              )}
            </div>

            {/* Piece Selection */}
            <div className="space-y-2">
              <Label>Pièces à inclure</Label>
              <div className="flex items-center gap-2 mb-2">
                <Checkbox 
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={(checked) => {
                    setSelectAll(checked);
                    if (checked) {
                      setSelectedPieces(validatedPieces.map(p => p.id));
                    }
                  }}
                />
                <label htmlFor="select-all" className="text-sm">
                  Toutes les pièces validées ({validatedPieces.length})
                </label>
              </div>
              
              {!selectAll && (
                <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-200 rounded-sm p-2">
                  {validatedPieces.map(piece => (
                    <div key={piece.id} className="flex items-center gap-2">
                      <Checkbox 
                        id={`piece-${piece.id}`}
                        checked={selectedPieces.includes(piece.id)}
                        onCheckedChange={() => togglePiece(piece.id)}
                      />
                      <label htmlFor={`piece-${piece.id}`} className="text-xs flex-1 truncate">
                        Pièce {piece.numero} - {piece.validated_data?.titre || piece.original_filename}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Generate Button */}
            <Button 
              onClick={handleGenerate}
              disabled={generating || (!selectAll && selectedPieces.length === 0) || (showJurisdiction && !jurisdiction)}
              className="w-full bg-slate-900 hover:bg-slate-800 rounded-sm"
              data-testid="generate-btn"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Générer le document
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Result Panel */}
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-lg">
                {result ? getDocumentTitle() : 'Résultat'}
              </CardTitle>
              {result && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="rounded-sm"
                    data-testid="copy-btn"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportDocx}
                    className="rounded-sm"
                    data-testid="export-result-btn"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Télécharger
                  </Button>
                </div>
              )}
            </div>
            {result && (
              <CardDescription className="flex items-center gap-2 mt-1">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Basé sur {result.pieces_used.length} pièce{result.pieces_used.length > 1 ? 's' : ''}: 
                {result.pieces_used.map(n => ` Pièce ${n}`).join(',')}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Info className="w-12 h-12 mb-4 text-slate-300" />
                <p className="text-sm text-center">
                  Configurez les options et cliquez sur "Générer" pour créer un brouillon.
                </p>
                {showJurisdiction && (
                  <p className="text-xs text-amber-600 mt-2">
                    N'oubliez pas de sélectionner la juridiction pour un projet de requête.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Warnings */}
                {result.warnings && result.warnings.length > 0 && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-sm">
                    {result.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {w}
                      </p>
                    ))}
                  </div>
                )}

                {/* Editable Content */}
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[400px] font-mono text-sm rounded-sm"
                  placeholder="Le contenu généré apparaîtra ici..."
                  data-testid="result-textarea"
                />

                <p className="text-xs text-slate-500">
                  Vous pouvez modifier le texte ci-dessus avant de le copier ou télécharger.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
