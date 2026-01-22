import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { dossiersApi } from '../lib/api';
import { formatDate, pieceTypeLabels } from '../lib/utils';
import { toast } from 'sonner';
import { Loader2, Calendar, FileText, AlertCircle } from 'lucide-react';

export const ChronologyView = ({ dossierId }) => {
  const [chronology, setChronology] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-600" />
            Chronologie des faits
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                    {/* Date */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-slate-900">
                          {entry.date ? formatDate(entry.date) : 'Date non définie'}
                        </span>
                        {entry.type_piece && (
                          <Badge variant="outline" className="text-xs">
                            {pieceTypeLabels[entry.type_piece]}
                          </Badge>
                        )}
                      </div>
                      <Badge variant="secondary" className="rounded-sm font-mono">
                        Pièce {entry.numero}
                      </Badge>
                    </div>

                    {/* Title */}
                    <h4 className="font-medium text-slate-900 mb-2">{entry.titre}</h4>

                    {/* Resume */}
                    <div className="space-y-1 text-sm text-slate-600">
                      {entry.resume.qui && (
                        <p>
                          <span className="font-medium text-slate-700">Qui : </span>
                          {entry.resume.qui}
                        </p>
                      )}
                      {entry.resume.quoi && (
                        <p>
                          <span className="font-medium text-slate-700">Quoi : </span>
                          {entry.resume.quoi}
                        </p>
                      )}
                      {entry.resume.ou && (
                        <p>
                          <span className="font-medium text-slate-700">Où : </span>
                          {entry.resume.ou}
                        </p>
                      )}
                      {entry.resume.element_cle && (
                        <p className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-sm text-amber-800">
                          <span className="font-medium">Élément clé : </span>
                          {entry.resume.element_cle}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export hint */}
      <div className="flex items-start gap-2 p-3 bg-sky-50 border border-sky-200 rounded-sm">
        <AlertCircle className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-sky-800">
          Utilisez le bouton "Exporter" pour télécharger cette chronologie au format CSV
          ou exporter toutes les pièces dans une archive ZIP.
        </p>
      </div>
    </div>
  );
};
