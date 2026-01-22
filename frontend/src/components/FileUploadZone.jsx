import React, { useCallback, useState } from 'react';
import { Button } from './ui/button';
import { Loader2, Upload, FileText, Image, File, AlertCircle } from 'lucide-react';

const ACCEPTED_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/heic': 'heic',
  'image/heif': 'heic',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
};

const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.doc', '.heic', '.heif'];

const MAX_FILE_SIZE_MB = 50;

export const FileUploadZone = ({ onUpload, uploading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [errors, setErrors] = useState([]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateFiles = (files) => {
    const validFiles = [];
    const newErrors = [];
    
    for (const file of files) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      const isValidExt = ACCEPTED_EXTENSIONS.includes(ext);
      const isValidType = ACCEPTED_TYPES[file.type];
      
      if (!isValidExt && !isValidType) {
        newErrors.push(`${file.name}: format non supporté`);
        continue;
      }
      
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        newErrors.push(`${file.name}: fichier trop volumineux (max ${MAX_FILE_SIZE_MB} Mo)`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    setErrors(newErrors);
    return validFiles;
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const validFiles = validateFiles(Array.from(e.dataTransfer.files));
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  }, []);

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const validFiles = validateFiles(Array.from(e.target.files));
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleRemove = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (selectedFiles.length > 0) {
      onUpload(selectedFiles);
    }
  };

  const getFileIcon = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return <FileText className="w-4 h-4 text-red-500" />;
    if (['jpg', 'jpeg', 'png', 'heic', 'heif'].includes(ext)) return <Image className="w-4 h-4 text-blue-500" />;
    if (['doc', 'docx'].includes(ext)) return <FileText className="w-4 h-4 text-sky-600" />;
    return <File className="w-4 h-4 text-slate-500" />;
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="space-y-4">
      <div
        className={`upload-zone p-8 text-center cursor-pointer ${
          dragActive ? 'drag-active' : ''
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input').click()}
        data-testid="upload-zone"
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.docx,.doc,.heic,.heif"
          onChange={handleChange}
          className="hidden"
          data-testid="file-input"
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
            <Upload className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">
              Glissez-déposez vos fichiers ici
            </p>
            <p className="text-xs text-slate-500 mt-1">
              PDF, JPG, PNG, DOCX, DOC, HEIC (max {MAX_FILE_SIZE_MB} Mo)
            </p>
          </div>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-sm space-y-1">
          {errors.map((error, i) => (
            <p key={i} className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {error}
            </p>
          ))}
        </div>
      )}

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            Fichiers sélectionnés ({selectedFiles.length})
          </p>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-slate-50 rounded-sm text-sm group"
              >
                {getFileIcon(file)}
                <span className="truncate flex-1">{file.name}</span>
                <span className="text-xs text-slate-400">{formatSize(file.size)}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRemove(index); }}
                  className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={uploading}
            className="w-full bg-slate-900 hover:bg-slate-800 rounded-sm"
            data-testid="confirm-upload"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Upload en cours...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Uploader {selectedFiles.length} fichier{selectedFiles.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
