import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { dossiersApi } from '../lib/api';
import { formatDate, pieceTypeLabels, downloadBlob } from '../lib/utils';
import { toast } from 'sonner';
import { 
  Loader2, 
  Calendar, 
  FileText, 
  Download,
  FileDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export const ChronologyView = ({ dossierId, dossierTitle }) => {
  const [chronology, setChronology] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchChronology = async () => {
      try {
        const res = await dossiersApi.getChronology(dossierId);
        setChronology(res.data);
      } catch (error) {
        toast.error('Erreur lors du chargement de la chronologie');
      } finally {
        setLoading(false);
      }
    };

    fetchChronology();
  }, [dossierId]);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const res = await dossiersApi.exportPdf(dossierId);
      downloadBlob(res.data, `chronologie_${dossierTitle || 'dossier'}.pdf`);
      toast.success('PDF chronologie téléchargé');
    } catch (error) {
      toast.error('Erreur lors de l\'export PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleExportDocx = async () => {
    setExporting(true);
    try {
      const res = await dossiersApi.exportDocx(dossierId);
      downloadBlob(res.data, `chronologie_narrative_${dossierTitle || 'dossier'}.docx`);
      toast.success('DOCX chronologie téléchargé');
    } catch (error) {
      toast.error('Erreur lors de l\'export DOCX');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!chronology || chronology.entries.length === 0) {
    return (
      <Card className="border-slate-200 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="font-heading font-semibold text-slate-900 mb-1">
            Chronologie vide
          </h3>
          <p className="text-sm text-slate-500 text-center max-w-md">
            Validez des pièces pour construire la chronologie des faits.
            Seules les pièces avec le statut "Prêt" apparaissent ici.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Export Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-sky-600" />
          <h3 className="font-heading font-semibold text-slate-900">
            Chronologie des faits
          </h3>
          <Badge variant="secondary" className="ml-2">
            {chronology.entries.length} entrée{chronology.entries.length > 1 ? 's' : ''}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="rounded-sm"
              disabled={exporting}
              data-testid="export-chronology-btn"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <FileDown className="w-4 h-4 mr-2" />
              )}
              Exporter la chronologie
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportPdf} data-testid="export-pdf">
              <FileText className="w-4 h-4 mr-2 text-red-600" />
              PDF (tableau structuré)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportDocx} data-testid="export-docx">
              <FileText className="w-4 h-4 mr-2 text-blue-600" />
              DOCX (chronologie narrative)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={async () => {
                try {
                  const res = await dossiersApi.exportCsv(dossierId);
                  downloadBlob(res.data, `sommaire_${dossierTitle || 'dossier'}.csv`);
                  toast.success('CSV téléchargé');
                } catch {
                  toast.error('Erreur export CSV');
                }
              }}
            >
              <FileText className="w-4 h-4 mr-2 text-green-600" />
              CSV (sommaire)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Timeline */}
      <Card className="border-slate-200">
        <CardContent className="pt-6">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

            {/* Entries */}
            <div className="space-y-6">
              {chronology.entries.map((entry, index) => (
                <div
                  key={entry.piece_id}
                  className="relative pl-10 animate-slide-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Timeline dot */}
                  <div className="absolute left-2.5 w-3 h-3 bg-sky-600 rounded-full border-2 border-white shadow-sm" />

                  <div className="bg-white border border-slate-200 rounded-sm p-4 card-hover">
                    {/* Date & Type */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-slate-900">
                          {entry.date ? formatDate(entry.date) : 'Date non définie'}
                        </span>
                        {entry.type_piece && (
                          <Badge variant="outline" className="text-xs">
                            {pieceTypeLabels[entry.type_piece] || entry.type_piece}
                          </Badge>
                        )}
                      </div>
                      <Badge variant="secondary" className="rounded-sm font-mono text-xs">
                        Pièce {entry.numero}
                      </Badge>
                    </div>

                    {/* Title */}
                    <h4 className="font-medium text-slate-900 mb-3">{entry.titre}</h4>

                    {/* Structured Resume */}
                    <div className="space-y-2 text-sm">
                      {entry.resume.qui && (
                        <div className="flex gap-2">
                          <span className="font-semibold text-slate-700 w-20 flex-shrink-0">Qui :</span>
                          <span className="text-slate-600">{entry.resume.qui}</span>
                        </div>
                      )}
                      {entry.resume.quoi && (
                        <div className="flex gap-2">
                          <span className="font-semibold text-slate-700 w-20 flex-shrink-0">Quoi :</span>
                          <span className="text-slate-600">{entry.resume.quoi}</span>
                        </div>
                      )}
                      {entry.resume.ou && (
                        <div className="flex gap-2">
                          <span className="font-semibold text-slate-700 w-20 flex-shrink-0">Où :</span>
                          <span className="text-slate-600">{entry.resume.ou}</span>
                        </div>
                      )}
                      {entry.resume.element_cle && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-sm">
                          <span className="font-semibold text-amber-800">Élément clé : </span>
                          <span className="text-amber-700">{entry.resume.element_cle}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="p-3 bg-sky-50 border border-sky-200 rounded-sm text-sm text-sky-800">
        <strong>Conseil :</strong> Utilisez l'export PDF pour une version imprimable professionnelle, 
        ou le DOCX pour une chronologie narrative modifiable.
      </div>
    </div>
  );
};
