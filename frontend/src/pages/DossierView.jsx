import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { dossiersApi, piecesApi } from '../lib/api';
import { formatDate, pieceTypeLabels, statusLabels, downloadBlob } from '../lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Upload,
  FileText,
  Calendar,
  Loader2,
  MoreVertical,
  Trash2,
  Eye,
  Sparkles,
  CheckCircle,
  Clock,
  Download,
  Share2,
  ListOrdered,
  Copy,
} from 'lucide-react';
import { FileUploadZone } from '../components/FileUploadZone';
import { PieceValidationModal } from '../components/PieceValidationModal';
import { ChronologyView } from '../components/ChronologyView';

const DossierView = () => {
  const { id } = useParams();
  const [dossier, setDossier] = useState(null);
  const [pieces, setPieces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState({});
  const [validationPiece, setValidationPiece] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [creatingShare, setCreatingShare] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [dossierRes, piecesRes] = await Promise.all([
        dossiersApi.get(id),
        piecesApi.list(id),
      ]);
      setDossier(dossierRes.data);
      setPieces(piecesRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpload = async (files) => {
    setUploading(true);
    try {
      for (const file of files) {
        await piecesApi.upload(id, file);
      }
      toast.success(`${files.length} fichier${files.length > 1 ? 's' : ''} uploadé${files.length > 1 ? 's' : ''}`);
      setUploadOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async (pieceId) => {
    setAnalyzing((prev) => ({ ...prev, [pieceId]: true }));
    try {
      await piecesApi.analyze(pieceId);
      toast.success('Analyse terminée');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de l\'analyse');
    } finally {
      setAnalyzing((prev) => ({ ...prev, [pieceId]: false }));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await piecesApi.delete(deleteTarget);
      toast.success('Pièce supprimée');
      setDeleteTarget(null);
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  const handleRenumber = async () => {
    try {
      await dossiersApi.renumber(id);
      toast.success('Pièces renumérotées');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la renumérotation');
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await dossiersApi.exportCsv(id);
      downloadBlob(res.data, `sommaire_${dossier.title}.csv`);
      toast.success('Export CSV téléchargé');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const handleExportZip = async () => {
    try {
      const res = await dossiersApi.exportZip(id);
      downloadBlob(res.data, `${dossier.title}.zip`);
      toast.success('Archive ZIP téléchargée');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const handleCreateShareLink = async () => {
    setCreatingShare(true);
    try {
      const res = await dossiersApi.createShareLink(id, { dossier_id: id, expires_in_days: 7 });
      const link = `${window.location.origin}/shared/${res.data.token}`;
      setShareLink(link);
      toast.success('Lien de partage créé');
    } catch (error) {
      toast.error('Erreur lors de la création du lien');
    } finally {
      setCreatingShare(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success('Lien copié');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </Layout>
    );
  }

  if (!dossier) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-500">Dossier non trouvé</p>
          <Link to="/dashboard">
            <Button variant="link" className="mt-2">
              Retour aux dossiers
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const toVerifyCount = pieces.filter((p) => p.status === 'a_verifier').length;
  const readyCount = pieces.filter((p) => p.status === 'pret').length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-2"
              data-testid="back-to-dashboard"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Retour aux dossiers
            </Link>
            <h1 className="font-heading text-2xl font-bold text-slate-900">
              {dossier.title}
            </h1>
            {dossier.description && (
              <p className="text-sm text-slate-500 mt-1">{dossier.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-sm" data-testid="export-menu">
                  <Download className="w-4 h-4 mr-2" />
                  Exporter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCsv} data-testid="export-csv">
                  Sommaire CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportZip} data-testid="export-zip">
                  Archive ZIP
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              className="rounded-sm"
              onClick={handleCreateShareLink}
              disabled={creatingShare}
              data-testid="share-btn"
            >
              {creatingShare ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-2" />
                  Partager
                </>
              )}
            </Button>
            <Button
              className="bg-slate-900 hover:bg-slate-800 rounded-sm"
              onClick={() => setUploadOpen(true)}
              data-testid="upload-piece-btn"
            >
              <Upload className="w-4 h-4 mr-2" />
              Ajouter une pièce
            </Button>
          </div>
        </div>

        {/* Share Link Dialog */}
        {shareLink && (
          <Card className="border-sky-200 bg-sky-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-sky-900">Lien de partage (valable 7 jours)</p>
                  <p className="text-xs text-sky-700 font-mono mt-1">{shareLink}</p>
                </div>
                <Button
                  size="sm"
                  onClick={copyShareLink}
                  className="rounded-sm"
                  data-testid="copy-share-link"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copier
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-slate-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-sm flex items-center justify-center">
                  <FileText className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-slate-900">{pieces.length}</p>
                  <p className="text-xs text-slate-500">Pièces totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-sm flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-slate-900">{toVerifyCount}</p>
                  <p className="text-xs text-slate-500">À vérifier</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-sm flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-slate-900">{readyCount}</p>
                  <p className="text-xs text-slate-500">Prêtes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pieces" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pieces" data-testid="tab-pieces">Pièces</TabsTrigger>
            <TabsTrigger value="chronology" data-testid="tab-chronology">Chronologie</TabsTrigger>
          </TabsList>

          <TabsContent value="pieces" className="space-y-4">
            {/* Actions */}
            {pieces.length > 0 && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRenumber}
                  className="rounded-sm"
                  data-testid="renumber-btn"
                >
                  <ListOrdered className="w-4 h-4 mr-2" />
                  Renuméroter
                </Button>
              </div>
            )}

            {/* Pieces List */}
            {pieces.length === 0 ? (
              <Card className="border-slate-200 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="font-heading font-semibold text-slate-900 mb-1">
                    Aucune pièce
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Ajoutez votre première pièce au dossier
                  </p>
                  <Button
                    onClick={() => setUploadOpen(true)}
                    className="bg-slate-900 hover:bg-slate-800 rounded-sm"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Ajouter une pièce
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pieces.map((piece, index) => (
                  <Card
                    key={piece.id}
                    className="border-slate-200 card-hover animate-fade-in"
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
                              <h3 className="font-medium text-slate-900 truncate">
                                {piece.validated_data?.titre || piece.ai_proposal?.titre || piece.original_filename}
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
                              {(piece.validated_data?.type_piece || piece.ai_proposal?.type_piece) && (
                                <span>
                                  {pieceTypeLabels[piece.validated_data?.type_piece || piece.ai_proposal?.type_piece]}
                                </span>
                              )}
                              {(piece.validated_data?.date_document || piece.ai_proposal?.date_document) && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(piece.validated_data?.date_document || piece.ai_proposal?.date_document)}
                                </span>
                              )}
                            </div>
                            {piece.validated_data?.resume_quoi && (
                              <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                                {piece.validated_data.resume_quoi}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!piece.ai_proposal && piece.status === 'a_verifier' && (
                            <Button
                              size="sm"
                              onClick={() => handleAnalyze(piece.id)}
                              disabled={analyzing[piece.id]}
                              className="bg-sky-600 hover:bg-sky-700 rounded-sm"
                              data-testid={`analyze-piece-${index}`}
                            >
                              {analyzing[piece.id] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4 mr-1" />
                                  Analyser
                                </>
                              )}
                            </Button>
                          )}
                          {piece.ai_proposal && piece.status === 'a_verifier' && (
                            <Button
                              size="sm"
                              onClick={() => setValidationPiece(piece)}
                              className="bg-emerald-600 hover:bg-emerald-700 rounded-sm"
                              data-testid={`validate-piece-${index}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Valider
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                data-testid={`piece-menu-${index}`}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => window.open(piecesApi.getFileUrl(piece.id), '_blank')}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Voir le fichier
                              </DropdownMenuItem>
                              {piece.ai_proposal && (
                                <DropdownMenuItem onClick={() => setValidationPiece(piece)}>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Voir/Valider propositions
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(piece.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="chronology">
            <ChronologyView dossierId={id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Ajouter une pièce</DialogTitle>
            <DialogDescription>
              Déposez un fichier (PDF, image, DOCX) pour l'ajouter au dossier
            </DialogDescription>
          </DialogHeader>
          <FileUploadZone onUpload={handleUpload} uploading={uploading} />
        </DialogContent>
      </Dialog>

      {/* Validation Modal */}
      {validationPiece && (
        <PieceValidationModal
          piece={validationPiece}
          onClose={() => setValidationPiece(null)}
          onValidated={() => {
            setValidationPiece(null);
            fetchData();
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette pièce ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 rounded-sm"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default DossierView;
