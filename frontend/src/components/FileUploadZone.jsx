import React, { useCallback, useState } from 'react';
import { Button } from './ui/button';
import { Loader2, Upload, FileText, Image, File } from 'lucide-react';

const ACCEPTED_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

export const FileUploadZone = ({ onUpload, uploading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

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
    for (const file of files) {
      if (ACCEPTED_TYPES[file.type]) {
        validFiles.push(file);
      }
    }
    return validFiles;
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const validFiles = validateFiles(Array.from(e.dataTransfer.files));
      setSelectedFiles(validFiles);
    }
  }, []);

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const validFiles = validateFiles(Array.from(e.target.files));
      setSelectedFiles(validFiles);
    }
  };

  const handleSubmit = () => {
    if (selectedFiles.length > 0) {
      onUpload(selectedFiles);
    }
  };

  const getFileIcon = (type) => {
    if (type.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
    if (type.includes('image')) return <Image className="w-4 h-4 text-blue-500" />;
    return <File className="w-4 h-4 text-slate-500" />;
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
          accept=".pdf,.jpg,.jpeg,.png,.docx"
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
              ou cliquez pour sélectionner (PDF, JPG, PNG, DOCX)
            </p>
          </div>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            Fichiers sélectionnés ({selectedFiles.length})
          </p>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-slate-50 rounded-sm text-sm"
              >
                {getFileIcon(file.type)}
                <span className="truncate flex-1">{file.name}</span>
                <span className="text-xs text-slate-400">
                  {(file.size / 1024).toFixed(0)} Ko
                </span>
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
