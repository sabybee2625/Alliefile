import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { piecesApi } from '../lib/api';
import { Loader2, Download, FileText, Image, FileQuestion, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export const FilePreviewModal = ({ piece, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);

  const fileType = piece.file_type;
  const canPreview = fileType === 'pdf' || fileType === 'image';
  const isDocx = fileType === 'docx' || fileType === 'doc';

  useEffect(() => {
    if (!canPreview && !isDocx) {
      setLoading(false);
      return;
    }

    const loadPreview = async () => {
      try {
        if (isDocx) {
          // For DOCX, we'll use the download URL with Office Online viewer
          const fileUrl = await piecesApi.getFileUrl(piece.id);
          setPreviewUrl(fileUrl);
        } else {
          const blob = await piecesApi.fetchFile(piece.id);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }
      } catch (err) {
        console.error('Preview error:', err);
        setError('Impossible de charger la prévisualisation');
      } finally {
        setLoading(false);
      }
    };

    loadPreview();

    return () => {
      if (previewUrl && !isDocx) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [piece.id, canPreview, isDocx]);

  const handleDownload = async () => {
    try {
      await piecesApi.downloadFile(piece.id, piece.original_filename);
      toast.success('Fichier téléchargé');
    } catch (err) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const getIcon = () => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="w-16 h-16 text-red-500" />;
      case 'image':
        return <Image className="w-16 h-16 text-blue-500" />;
      case 'docx':
      case 'doc':
        return <FileText className="w-16 h-16 text-blue-600" />;
      default:
        return <FileQuestion className="w-16 h-16 text-slate-400" />;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-heading flex items-center gap-2">
              Pièce {piece.numero} - {piece.original_filename}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="rounded-sm"
            >
              <Download className="w-4 h-4 mr-1" />
              Télécharger
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : piece.file_missing ? (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500">
              <FileQuestion className="w-16 h-16 mb-4" />
              <p>Le fichier original est manquant.</p>
              <p className="text-sm text-slate-400">Cependant, les métadonnées et l'analyse IA sont disponibles.</p>
              {piece.extracted_text && (
                <div className="mt-4 p-4 bg-slate-100 rounded-sm max-h-48 overflow-y-auto w-3/4 text-sm text-slate-700">
                  <p className="font-semibold mb-2">Extrait de l'analyse IA :</p>
                  <p>{piece.extracted_text.substring(0, 500)}...</p>
                </div>
              )}
              <Button onClick={handleDownload} className="mt-4 rounded-sm" disabled>
                <Download className="w-4 h-4 mr-2" />
                Télécharger le fichier (indisponible)
              </Button>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500">
              <FileQuestion className="w-16 h-16 mb-4" />
              <p>{error}</p>
              <Button onClick={handleDownload} className="mt-4 rounded-sm">
                <Download className="w-4 h-4 mr-2" />
                Télécharger le fichier
              </Button>
            </div>
          ) : canPreview && previewUrl ? (
            <div className="h-full overflow-auto bg-slate-100 rounded-sm">
              {fileType === 'pdf' ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[70vh] border-0"
                  title={piece.original_filename}
                />
              ) : fileType === 'image' ? (
                <div className="flex items-center justify-center p-4">
                  <img
                    src={previewUrl}
                    alt={piece.original_filename}
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                </div>
              ) : null}
            </div>
          ) : isDocx ? (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500">
              <FileText className="w-16 h-16 text-blue-600 mb-4" />
              <p className="text-center mb-2">
                Document Word ({piece.file_type.toUpperCase()})
              </p>
              <p className="text-sm text-slate-400 mb-4">
                La prévisualisation des fichiers Word n'est pas disponible dans le navigateur.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleDownload} className="rounded-sm">
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500">
              {getIcon()}
              <p className="mt-4 text-center">
                Prévisualisation non disponible pour ce type de fichier
                <br />
                <span className="text-sm text-slate-400">
                  ({piece.file_type.toUpperCase()})
                </span>
              </p>
              <Button onClick={handleDownload} className="mt-4 rounded-sm">
                <Download className="w-4 h-4 mr-2" />
                Télécharger le fichier
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
