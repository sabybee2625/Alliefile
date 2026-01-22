import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { sharedApi } from '../lib/api';
import { formatDate, pieceTypeLabels, statusLabels } from '../lib/utils';
import { toast } from 'sonner';
import {
  Loader2,
  Scale,
  FileText,
  Calendar,
  Eye,
  AlertCircle,
  Lock,
} from 'lucide-react';

const SharedDossier = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await sharedApi.getDossier(token);
        setData(res.data);
      } catch (err) {
        if (err.response?.status === 410) {
          setError('Ce lien de partage a expiré.');
        } else if (err.response?.status === 404) {
          setError('Ce lien de partage n\'existe pas.');
        } else {
          setError('Une erreur est survenue.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full border-slate-200">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="font-heading text-xl font-semibold text-slate-900 mb-2">
              Accès refusé
            </h2>
            <p className="text-slate-500 mb-4">{error}</p>
            <Link to="/login">
              <Button className="rounded-sm">
                Se connecter
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { dossier, pieces } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-900 rounded-sm flex items-center justify-center">
                <Scale className="w-4 h-4 text-white" />
              </div>
              <span className="font-heading font-bold text-lg text-slate-900">
                Dossier Juridique
              </span>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Lecture seule
            </Badge>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Dossier Info */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">{dossier.title}</CardTitle>
              {dossier.description && (
                <p className="text-slate-500">{dossier.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <FileText className="w-4 h-4" />
                <span>{pieces.length} pièce{pieces.length !== 1 ? 's' : ''}</span>
              </div>
            </CardContent>
          </Card>

          {/* Pieces List */}
          <div className="space-y-3">
            <h2 className="font-heading font-semibold text-lg text-slate-900">
              Pièces du dossier
            </h2>
            {pieces.length === 0 ? (
              <Card className="border-slate-200">
                <CardContent className="py-8 text-center">
                  <p className="text-slate-500">Aucune pièce dans ce dossier</p>
                </CardContent>
              </Card>
            ) : (
              pieces.map((piece, index) => (
                <Card
                  key={piece.id}
                  className="border-slate-200 animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-sm flex items-center justify-center flex-shrink-0">
                          <span className="font-mono font-semibold text-slate-700">
                            {piece.numero}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-slate-900">
                              {piece.validated_data?.titre ||
                                piece.ai_proposal?.titre ||
                                piece.original_filename}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                piece.status === 'pret'
                                  ? 'status-pret'
                                  : 'status-a_verifier'
                              }`}
                            >
                              {statusLabels[piece.status]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            {(piece.validated_data?.type_piece ||
                              piece.ai_proposal?.type_piece) && (
                              <span>
                                {pieceTypeLabels[
                                  piece.validated_data?.type_piece ||
                                    piece.ai_proposal?.type_piece
                                ]}
                              </span>
                            )}
                            {(piece.validated_data?.date_document ||
                              piece.ai_proposal?.date_document) && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(
                                  piece.validated_data?.date_document ||
                                    piece.ai_proposal?.date_document
                                )}
                              </span>
                            )}
                          </div>
                          {piece.validated_data?.resume_quoi && (
                            <p className="text-sm text-slate-600 mt-2">
                              {piece.validated_data.resume_quoi}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(sharedApi.getPieceFileUrl(token, piece.id), '_blank')
                        }
                        className="rounded-sm"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Voir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SharedDossier;
