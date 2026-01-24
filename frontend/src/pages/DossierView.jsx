import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  RefreshCw,
  PenTool,
  AlertCircle,
  XCircle,
  PlayCircle,
  CheckSquare,
  Square,
  Filter,
  AlertTriangle,
  Image,
  FileQuestion,
} from 'lucide-react';
import { FileUploadZone } from '../components/FileUploadZone';
import { PieceValidationModal } from '../components/PieceValidationModal';
import { ChronologyView } from '../components/ChronologyView';
import { AssistantView } from '../components/AssistantView';
import { FilePreviewModal } from '../components/FilePreviewModal';

// Analysis status labels
const analysisStatusLabels = {
  pending: 'En attente',
  queued: 'En file d\'attente',
  analyzing: 'Analyse en cours',
  complete: 'Analysé',
  error: 'Erreur',
};

const analysisStatusColors = {
  pending: 'bg-slate-100 text-slate-600',
  queued: 'bg-purple-100 text-purple-600',
  analyzing: 'bg-blue-100 text-blue-600',
  complete: 'bg-emerald-100 text-emerald-600',
  error: 'bg-red-100 text-red-600',
};

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
  
  // Selection state
  const [selectedPieces, setSelectedPieces] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false);
  
  // Queue state
  const [queueStatus, setQueueStatus] = useState(null);
  const [processingQueue, setProcessingQueue] = useState(false);
  const queueIntervalRef = useRef(null);
  
  // Preview state
  const [previewPiece, setPreviewPiece] = useState(null);
  
  // Filter state
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  
  // Duplicate modal state
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [duplicatePendingFile, setDuplicatePendingFile] = useState(null);

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

  const fetchQueueStatus = useCallback(async () => {
    try {
      const res = await dossiersApi.getQueueStatus(id);
      setQueueStatus(res.data);
      
      // If there are items in queue or analyzing, keep processing
      if (res.data.queued > 0 || res.data.analyzing > 0) {
        // Auto-process queue
        if (!processingQueue) {
          setProcessingQueue(true);
          try {
            await dossiersApi.processQueue(id);
            fetchData(); // Refresh pieces
          } finally {
            setProcessingQueue(false);
          }
        }
      }
    } catch (error) {
      console.error('Queue status error:', error);
    }
  }, [id, processingQueue, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll queue status when there's activity
  useEffect(() => {
    if (queueStatus && (queueStatus.queued > 0 || queueStatus.analyzing > 0)) {
      queueIntervalRef.current = setInterval(() => {
        fetchQueueStatus();
        fetchData();
      }, 3000);
    } else {
      if (queueIntervalRef.current) {
        clearInterval(queueIntervalRef.current);
      }
    }
    
    return () => {
      if (queueIntervalRef.current) {
        clearInterval(queueIntervalRef.current);
      }
    };
  }, [queueStatus, fetchQueueStatus, fetchData]);

  const handleUpload = async (files, forceUpload = false) => {
    setUploading(true);
    let uploaded = 0;
    
    try {
      for (const file of files) {
        try {
          await piecesApi.upload(id, file, forceUpload);
          uploaded++;
        } catch (error) {
          if (error.response?.status === 409) {
            // Show duplicate modal with details
            const info = error.duplicateInfo || {
              existingPieceNumero: '?',
              existingFilename: file.name,
              message: 'Fichier identique déjà présent'
            };
            setDuplicateInfo(info);
            setDuplicatePendingFile(file);
            setDuplicateModalOpen(true);
            setUploading(false);
            return; // Stop processing, wait for user decision
          } else if (error.response?.status === 400) {
            toast.error(`Fichier invalide: ${file.name} (${error.response?.data?.detail || 'erreur'})`);
          } else {
            throw error;
          }
        }
      }
      
      if (uploaded > 0) {
        toast.success(`${uploaded} fichier${uploaded > 1 ? 's' : ''} uploadé${uploaded > 1 ? 's' : ''}`);
      }
      
      setUploadOpen(false);
      fetchData();
    } catch (error) {
      if (error.response?.status === 413) {
        toast.error('Fichier trop volumineux (max 50 Mo)');
      } else {
        toast.error('Erreur lors de l\'upload');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDuplicateCancel = () => {
    setDuplicateModalOpen(false);
    setDuplicateInfo(null);
    setDuplicatePendingFile(null);
    setUploadOpen(false);
  };

  const handleDuplicateForceUpload = async () => {
    if (!duplicatePendingFile) return;
    setDuplicateModalOpen(false);
    setUploading(true);
    
    try {
      await piecesApi.upload(id, duplicatePendingFile, true);
      toast.success('Fichier importé (marqué comme doublon)');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de l\'import');
    } finally {
      setUploading(false);
      setDuplicateInfo(null);
      setDuplicatePendingFile(null);
      setUploadOpen(false);
    }
  };

  const handleAnalyzeAll = async () => {
    try {
      const pendingPieces = pieces.filter(p => 
        p.analysis_status === 'pending' || p.analysis_status === 'error'
      );
      
      if (pendingPieces.length === 0) {
        toast.info('Aucune pièce à analyser');
        return;
      }
      
      const res = await dossiersApi.queueAnalysis(id);
      toast.success(res.data.message);
      
      // Start processing
      await fetchQueueStatus();
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la mise en file d\'attente');
    }
  };

  const handleRetryFailed = async () => {
    try {
      const res = await dossiersApi.queueFailed(id);
      toast.success(res.data.message);
      await fetchQueueStatus();
      fetchData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleAnalyze = async (pieceId) => {
    setAnalyzing((prev) => ({ ...prev, [pieceId]: true }));
    try {
      await piecesApi.analyze(pieceId);
      toast.success('Analyse terminée');
      fetchData();
    } catch (error) {
      if (error.response?.status === 429) {
        toast.warning('Veuillez patienter avant de relancer');
      } else {
        toast.error('Erreur lors de l\'analyse');
      }
    } finally {
      setAnalyzing((prev) => ({ ...prev, [pieceId]: false }));
    }
  };

  const handleReanalyze = async (pieceId) => {
    setAnalyzing((prev) => ({ ...prev, [pieceId]: true }));
    try {
      await piecesApi.reanalyze(pieceId);
      toast.success('Ré-analyse terminée');
      fetchData();
    } catch (error) {
      if (error.response?.status === 429) {
        toast.warning('Veuillez patienter avant de relancer');
      } else {
        toast.error('Erreur lors de la ré-analyse');
      }
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

  const handleDeleteSelected = async () => {
    if (selectedPieces.length === 0) return;
    setDeleting(true);
    try {
      const res = await piecesApi.deleteMany(id, selectedPieces);
      toast.success(res.data.message);
      setSelectedPieces([]);
      setSelectMode(false);
      setDeleteSelectedOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteErrors = async () => {
    try {
      const res = await piecesApi.deleteErrors(id);
      toast.success(res.data.message);
      fetchData();
    } catch (error) {
      toast.error('Erreur');
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

  const copyShareLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareLink);
        toast.success('Lien copié');
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Lien copié');
      }
    } catch {
      toast.error('Impossible de copier le lien');
    }
  };

  const togglePieceSelection = (pieceId) => {
    setSelectedPieces(prev => 
      prev.includes(pieceId) 
        ? prev.filter(id => id !== pieceId)
        : [...prev, pieceId]
    );
  };

  const selectAllPieces = () => {
    setSelectedPieces(filteredPieces.map(p => p.id));
  };

  const deselectAllPieces = () => {
    setSelectedPieces([]);
  };

  const handleViewFile = async (piece) => {
    setPreviewPiece(piece);
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
            <Button variant="link" className="mt-2">Retour aux dossiers</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  // Apply filters
  let filteredPieces = pieces;
  if (showDuplicates) {
    filteredPieces = pieces.filter(p => p.is_duplicate);
  } else if (showErrors) {
    filteredPieces = pieces.filter(p => p.analysis_status === 'error');
  }

  const toVerifyCount = pieces.filter((p) => p.status === 'a_verifier').length;
  const readyCount = pieces.filter((p) => p.status === 'pret').length;
  const errorCount = pieces.filter((p) => p.analysis_status === 'error').length;
  const duplicateCount = pieces.filter((p) => p.is_duplicate).length;
  const pendingAnalysis = pieces.filter((p) => p.analysis_status === 'pending' || p.analysis_status === 'queued').length;

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
            <h1 className="font-heading text-2xl font-bold text-slate-900">{dossier.title}</h1>
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
                <DropdownMenuItem 
                  onClick={async () => {
                    try {
                      const res = await dossiersApi.exportPdf(id);
                      downloadBlob(res.data, `chronologie_${dossier.title}.pdf`);
                      toast.success('PDF téléchargé');
                    } catch { toast.error('Erreur'); }
                  }}
                  data-testid="export-pdf"
                >
                  <FileText className="w-4 h-4 mr-2 text-red-600" />
                  Chronologie PDF
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={async () => {
                    try {
                      const res = await dossiersApi.exportDocx(id);
                      downloadBlob(res.data, `chronologie_${dossier.title}.docx`);
                      toast.success('DOCX téléchargé');
                    } catch { toast.error('Erreur'); }
                  }}
                  data-testid="export-docx"
                >
                  <FileText className="w-4 h-4 mr-2 text-blue-600" />
                  Chronologie DOCX
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportZip} data-testid="export-zip">
                  <FileText className="w-4 h-4 mr-2 text-amber-600" />
                  Archive ZIP (pièces)
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
              {creatingShare ? <Loader2 className="w-4 h-4 animate-spin" /> : (
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

        {/* Share Link */}
        {shareLink && (
          <Card className="border-sky-200 bg-sky-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-sky-900">Lien de partage (valable 7 jours)</p>
                  <p className="text-xs text-sky-700 font-mono mt-1 break-all">{shareLink}</p>
                </div>
                <Button size="sm" onClick={copyShareLink} className="rounded-sm" data-testid="copy-share-link">
                  <Copy className="w-4 h-4 mr-2" />
                  Copier
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <Card className="border-slate-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-sm flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-slate-900">{errorCount}</p>
                  <p className="text-xs text-slate-500">Erreurs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Queue Status Banner */}
        {queueStatus && (queueStatus.queued > 0 || queueStatus.analyzing > 0) && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <span className="text-sm text-blue-800">
                    <strong>{queueStatus.analyzing}</strong> analyse(s) en cours, 
                    <strong> {queueStatus.queued}</strong> en file d'attente
                  </span>
                </div>
                <span className="text-xs text-blue-600">Actualisation automatique...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="pieces" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pieces" data-testid="tab-pieces">Pièces</TabsTrigger>
            <TabsTrigger value="chronology" data-testid="tab-chronology">Chronologie</TabsTrigger>
            <TabsTrigger value="assistant" data-testid="tab-assistant">
              <PenTool className="w-4 h-4 mr-1" />
              Assistant
            </TabsTrigger>
          </TabsList>

          {/* PIECES TAB */}
          <TabsContent value="pieces" className="space-y-4">
            {/* Actions Bar */}
            {pieces.length > 0 && (
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {/* Selection Mode Toggle */}
                  <Button
                    variant={selectMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectMode(!selectMode);
                      if (selectMode) setSelectedPieces([]);
                    }}
                    className="rounded-sm"
                  >
                    {selectMode ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />}
                    Sélection
                  </Button>
                  
                  {selectMode && (
                    <>
                      <Button variant="ghost" size="sm" onClick={selectAllPieces}>
                        Tout sélectionner
                      </Button>
                      <Button variant="ghost" size="sm" onClick={deselectAllPieces}>
                        Désélectionner
                      </Button>
                      {selectedPieces.length > 0 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteSelectedOpen(true)}
                          className="rounded-sm"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Supprimer ({selectedPieces.length})
                        </Button>
                      )}
                    </>
                  )}
                  
                  {/* Filters */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-sm">
                        <Filter className="w-4 h-4 mr-1" />
                        Filtrer
                        {(showDuplicates || showErrors) && (
                          <Badge variant="secondary" className="ml-1 text-xs">{showDuplicates ? duplicateCount : errorCount}</Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => { setShowDuplicates(false); setShowErrors(false); }}>
                        Toutes les pièces
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { setShowDuplicates(true); setShowErrors(false); }}>
                        <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
                        Doublons ({duplicateCount})
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setShowErrors(true); setShowDuplicates(false); }}>
                        <XCircle className="w-4 h-4 mr-2 text-red-500" />
                        Erreurs ({errorCount})
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Analyze All Button */}
                  {pendingAnalysis > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAnalyzeAll}
                      className="rounded-sm bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100"
                      data-testid="analyze-all-btn"
                    >
                      <PlayCircle className="w-4 h-4 mr-1" />
                      Analyser tout ({pendingAnalysis})
                    </Button>
                  )}
                  
                  {/* Retry Failed Button */}
                  {errorCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetryFailed}
                      className="rounded-sm text-amber-700"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Relancer échecs ({errorCount})
                    </Button>
                  )}
                  
                  {/* Delete Errors Button */}
                  {errorCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteErrors}
                      className="rounded-sm text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Supprimer erreurs
                    </Button>
                  )}
                  
                  <Button variant="outline" size="sm" onClick={handleRenumber} className="rounded-sm" data-testid="renumber-btn">
                    <ListOrdered className="w-4 h-4 mr-2" />
                    Renuméroter
                  </Button>
                </div>
              </div>
            )}

            {/* Filter indicator */}
            {(showDuplicates || showErrors) && (
              <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-sm">
                <span className="text-sm text-slate-600">
                  Filtre actif: {showDuplicates ? 'Doublons' : 'Erreurs'}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setShowDuplicates(false); setShowErrors(false); }}
                >
                  Effacer
                </Button>
              </div>
            )}

            {filteredPieces.length === 0 ? (
              <Card className="border-slate-200 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="font-heading font-semibold text-slate-900 mb-1">
                    {(showDuplicates || showErrors) ? 'Aucune pièce correspondante' : 'Aucune pièce'}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    {(showDuplicates || showErrors) 
                      ? 'Aucune pièce ne correspond au filtre sélectionné'
                      : 'Ajoutez votre première pièce au dossier'
                    }
                  </p>
                  {!(showDuplicates || showErrors) && (
                    <Button onClick={() => setUploadOpen(true)} className="bg-slate-900 hover:bg-slate-800 rounded-sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Ajouter une pièce
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredPieces.map((piece, index) => (
                  <Card
                    key={piece.id}
                    className={`border-slate-200 card-hover animate-fade-in ${
                      selectedPieces.includes(piece.id) ? 'ring-2 ring-sky-500 border-sky-500' : ''
                    } ${piece.is_duplicate ? 'border-amber-300 bg-amber-50/50' : ''}`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          {/* Selection Checkbox */}
                          {selectMode && (
                            <Checkbox
                              checked={selectedPieces.includes(piece.id)}
                              onCheckedChange={() => togglePieceSelection(piece.id)}
                              className="mt-3"
                            />
                          )}
                          
                          <div className="w-12 h-12 bg-slate-100 rounded-sm flex items-center justify-center flex-shrink-0">
                            <span className="font-mono font-semibold text-slate-700">{piece.numero}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-medium text-slate-900 truncate">
                                {piece.validated_data?.titre || piece.ai_proposal?.titre || piece.original_filename}
                              </h3>
                              <Badge variant="outline" className={`text-xs ${piece.status === 'pret' ? 'status-pret' : 'status-a_verifier'}`}>
                                {statusLabels[piece.status]}
                              </Badge>
                              {piece.analysis_status && piece.analysis_status !== 'complete' && (
                                <Badge variant="outline" className={`text-xs ${analysisStatusColors[piece.analysis_status]}`}>
                                  {piece.analysis_status === 'analyzing' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                                  {analysisStatusLabels[piece.analysis_status]}
                                </Badge>
                              )}
                              {piece.is_duplicate && (
                                <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Doublon
                                </Badge>
                              )}
                              {piece.source === 'camera' && (
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                                  📷 Photo
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              {(piece.validated_data?.type_piece || piece.ai_proposal?.type_piece) && (
                                <span>{pieceTypeLabels[piece.validated_data?.type_piece || piece.ai_proposal?.type_piece]}</span>
                              )}
                              {(piece.validated_data?.date_document || piece.ai_proposal?.date_document) && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(piece.validated_data?.date_document || piece.ai_proposal?.date_document)}
                                </span>
                              )}
                              {piece.file_size > 0 && (
                                <span className="text-xs text-slate-400">
                                  {(piece.file_size / 1024 / 1024).toFixed(1)} Mo
                                </span>
                              )}
                            </div>
                            
                            {/* Error message */}
                            {piece.analysis_status === 'error' && piece.analysis_error && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-sm">
                                <p className="text-xs text-red-700 flex items-start gap-1">
                                  <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  {piece.analysis_error}
                                </p>
                              </div>
                            )}
                            
                            {piece.validated_data?.resume_quoi && (
                              <p className="text-sm text-slate-600 mt-2 line-clamp-2">{piece.validated_data.resume_quoi}</p>
                            )}
                            
                            {piece.ai_proposal && !piece.validated_data && (
                              <div className="mt-2 flex items-center gap-2 text-xs">
                                <AlertCircle className="w-3 h-3 text-amber-500" />
                                <span className="text-amber-600">Propositions IA disponibles - à valider</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* View File Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewFile(piece)}
                            className="rounded-sm"
                            data-testid={`view-file-${index}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Voir
                          </Button>
                          
                          {!piece.ai_proposal && piece.status === 'a_verifier' && piece.analysis_status !== 'analyzing' && (
                            <Button
                              size="sm"
                              onClick={() => handleAnalyze(piece.id)}
                              disabled={analyzing[piece.id]}
                              className="bg-sky-600 hover:bg-sky-700 rounded-sm"
                              data-testid={`analyze-piece-${index}`}
                            >
                              {analyzing[piece.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : (
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
                              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`piece-menu-${index}`}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewFile(piece)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Voir le fichier
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => piecesApi.downloadFile(piece.id, piece.original_filename)}>
                                <Download className="w-4 h-4 mr-2" />
                                Télécharger
                              </DropdownMenuItem>
                              {piece.ai_proposal && (
                                <DropdownMenuItem onClick={() => setValidationPiece(piece)}>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Voir/Valider propositions
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleReanalyze(piece.id)}
                                disabled={analyzing[piece.id]}
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Relancer l'analyse
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteTarget(piece.id)} className="text-red-600">
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

          {/* CHRONOLOGY TAB */}
          <TabsContent value="chronology">
            <ChronologyView dossierId={id} dossierTitle={dossier.title} />
          </TabsContent>

          {/* ASSISTANT TAB */}
          <TabsContent value="assistant">
            <AssistantView dossierId={id} pieces={pieces} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Ajouter une pièce</DialogTitle>
            <DialogDescription>
              Déposez un fichier (PDF, image, DOCX, DOC, HEIC) pour l'ajouter au dossier.
              Les doublons sont automatiquement détectés.
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

      {/* Preview Modal */}
      {previewPiece && (
        <FilePreviewModal
          piece={previewPiece}
          onClose={() => setPreviewPiece(null)}
        />
      )}

      {/* Delete Single Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette pièce ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
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

      {/* Delete Selected Confirmation */}
      <AlertDialog open={deleteSelectedOpen} onOpenChange={setDeleteSelectedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {selectedPieces.length} pièce(s) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les fichiers seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 rounded-sm"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Supprimer ${selectedPieces.length} pièce(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Detection Modal */}
      <AlertDialog open={duplicateModalOpen} onOpenChange={setDuplicateModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Doublon détecté
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Ce fichier existe déjà dans ce dossier :
              </p>
              {duplicateInfo && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm">
                  <p className="font-medium text-amber-900">
                    Pièce {duplicateInfo.existingPieceNumero} : {duplicateInfo.existingFilename}
                  </p>
                </div>
              )}
              <p className="text-sm">
                Que souhaitez-vous faire ?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={handleDuplicateCancel} className="rounded-sm">
              Annuler (ne pas importer)
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDuplicateForceUpload}
              className="bg-amber-600 hover:bg-amber-700 rounded-sm"
            >
              Importer quand même
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default DossierView;
