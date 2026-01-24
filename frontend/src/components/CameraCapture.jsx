import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Camera,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  ZoomIn,
  ZoomOut,
  Check,
  X,
  RefreshCw,
  Loader2,
  AlertCircle,
  SwitchCamera,
} from 'lucide-react';
import { toast } from 'sonner';

// Compression quality for juridical readability (0.8 is a good balance)
const COMPRESSION_QUALITY = 0.85;
const MAX_DIMENSION = 2048; // Max width/height for compressed image

export const CameraCapture = ({ open, onClose, onCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  // Image editing state
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [zoom, setZoom] = useState(1);
  
  // Camera selection
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' = back camera, 'user' = front
  const [availableCameras, setAvailableCameras] = useState([]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraReady(false);
    
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
        };
      }
      
      // Get available cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(d => d.kind === 'videoinput');
      setAvailableCameras(cameras);
      
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('Accès à la caméra refusé. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('Aucune caméra détectée sur cet appareil.');
      } else {
        setCameraError(`Erreur caméra: ${err.message}`);
      }
    }
  }, [facingMode]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  // Initialize camera when dialog opens
  useEffect(() => {
    if (open && !capturedImage) {
      startCamera();
    }
    return () => {
      if (!open) {
        stopCamera();
      }
    };
  }, [open, capturedImage, startCamera, stopCamera]);

  // Handle dialog close
  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setRotation(0);
    setFlipH(false);
    setZoom(1);
    setCameraError(null);
    onClose();
  };

  // Capture photo from video stream
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data
    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(imageData);
    
    // Stop camera while editing
    stopCamera();
  };

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null);
    setRotation(0);
    setFlipH(false);
    setZoom(1);
    startCamera();
  };

  // Switch camera (front/back)
  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Rotate image
  const rotate = (degrees) => {
    setRotation(prev => (prev + degrees + 360) % 360);
  };

  // Compress and process image
  const processImage = async () => {
    if (!capturedImage) return null;
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate dimensions with rotation
        const isRotated90 = rotation === 90 || rotation === 270;
        let targetWidth = img.width;
        let targetHeight = img.height;
        
        if (isRotated90) {
          [targetWidth, targetHeight] = [targetHeight, targetWidth];
        }
        
        // Apply max dimension constraint
        const scale = Math.min(1, MAX_DIMENSION / Math.max(targetWidth, targetHeight));
        targetWidth = Math.round(targetWidth * scale * zoom);
        targetHeight = Math.round(targetHeight * scale * zoom);
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        // Apply transformations
        ctx.save();
        ctx.translate(targetWidth / 2, targetHeight / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        if (flipH) ctx.scale(-1, 1);
        
        // Draw image centered
        const drawWidth = isRotated90 ? targetHeight : targetWidth;
        const drawHeight = isRotated90 ? targetWidth : targetHeight;
        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();
        
        // Convert to blob
        canvas.toBlob(
          (blob) => resolve(blob),
          'image/jpeg',
          COMPRESSION_QUALITY
        );
      };
      img.src = capturedImage;
    });
  };

  // Confirm and send photo
  const confirmPhoto = async () => {
    setProcessing(true);
    
    try {
      const blob = await processImage();
      if (!blob) {
        toast.error('Erreur lors du traitement de l\'image');
        return;
      }
      
      // Create File object
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = new File([blob], `photo_${timestamp}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
      
      // Add metadata to indicate it's from camera
      file.isFromCamera = true;
      
      onCapture(file);
      handleClose();
      toast.success('Photo capturée avec succès');
      
    } catch (err) {
      console.error('Error processing image:', err);
      toast.error('Erreur lors du traitement de l\'image');
    } finally {
      setProcessing(false);
    }
  };

  // Render preview with transformations
  const getPreviewStyle = () => {
    const transforms = [];
    if (rotation) transforms.push(`rotate(${rotation}deg)`);
    if (flipH) transforms.push('scaleX(-1)');
    if (zoom !== 1) transforms.push(`scale(${zoom})`);
    return {
      transform: transforms.join(' '),
      transition: 'transform 0.2s ease',
    };
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            {capturedImage ? 'Ajuster la photo' : 'Prendre une photo'}
          </DialogTitle>
        </DialogHeader>

        <div className="relative bg-black min-h-[400px] flex items-center justify-center">
          {/* Camera View */}
          {!capturedImage && !cameraError && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-w-full max-h-[400px] object-contain"
                style={{ display: cameraReady ? 'block' : 'none' }}
              />
              {!cameraReady && (
                <div className="flex flex-col items-center gap-3 text-white">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm">Initialisation de la caméra...</p>
                </div>
              )}
            </>
          )}

          {/* Camera Error */}
          {cameraError && (
            <div className="flex flex-col items-center gap-4 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-white text-sm max-w-xs">{cameraError}</p>
              <Button
                variant="outline"
                onClick={startCamera}
                className="rounded-sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            </div>
          )}

          {/* Captured Image Preview */}
          {capturedImage && (
            <div className="overflow-hidden flex items-center justify-center p-4">
              <img
                src={capturedImage}
                alt="Captured"
                className="max-w-full max-h-[350px] object-contain"
                style={getPreviewStyle()}
              />
            </div>
          )}

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Camera switch button (if multiple cameras) */}
          {!capturedImage && cameraReady && availableCameras.length > 1 && (
            <Button
              size="icon"
              variant="secondary"
              onClick={switchCamera}
              className="absolute top-4 right-4 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur"
              data-testid="switch-camera-btn"
            >
              <SwitchCamera className="w-5 h-5 text-white" />
            </Button>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 space-y-4 bg-slate-50">
          {!capturedImage ? (
            /* Capture Controls */
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={capturePhoto}
                disabled={!cameraReady}
                className="rounded-full w-16 h-16 bg-slate-900 hover:bg-slate-800"
                data-testid="capture-photo-btn"
              >
                <Camera className="w-6 h-6" />
              </Button>
            </div>
          ) : (
            /* Edit Controls */
            <div className="space-y-4">
              {/* Rotation & Flip */}
              <div className="flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => rotate(-90)}
                  className="rounded-sm"
                  data-testid="rotate-left-btn"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => rotate(90)}
                  className="rounded-sm"
                  data-testid="rotate-right-btn"
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant={flipH ? 'default' : 'outline'}
                  onClick={() => setFlipH(!flipH)}
                  className="rounded-sm"
                  data-testid="flip-btn"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </Button>
              </div>

              {/* Zoom */}
              <div className="flex items-center gap-3 px-4">
                <ZoomOut className="w-4 h-4 text-slate-400" />
                <Slider
                  value={[zoom]}
                  onValueChange={(v) => setZoom(v[0])}
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="flex-1"
                  data-testid="zoom-slider"
                />
                <ZoomIn className="w-4 h-4 text-slate-400" />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={retakePhoto}
                  className="flex-1 rounded-sm"
                  disabled={processing}
                  data-testid="retake-btn"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reprendre
                </Button>
                <Button
                  onClick={confirmPhoto}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 rounded-sm"
                  disabled={processing}
                  data-testid="confirm-capture-btn"
                >
                  {processing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Valider
                </Button>
              </div>
            </div>
          )}

          {/* Cancel button */}
          {!capturedImage && (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                onClick={handleClose}
                className="text-slate-500"
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
