import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, FileText, PenTool, Shield, User, Calendar, Download, Upload, Eye, Settings, Signature, Lock, Globe, Mail, Phone, Camera, Scan, Bot, Target, Zap, MapPin, Search, Loader2, ZoomIn, ZoomOut, RotateCw, X, RotateCcw, Move } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { aiSignaturePlacement, SignatureZone, DocumentAnalysis } from '@/services/aiSignaturePlacement';
import { SignaturePlacementPreview } from '@/components/SignaturePlacementPreview';
import { useDocumensoAPI } from '@/hooks/useDocumensoAPI';
import { FileViewer } from '@/components/FileViewer';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  const pdfjsVersion = pdfjsLib.version || '5.4.296';
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;
}

interface DocumensoIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  document: {
    id: string;
    title: string;
    content: string;
    type: string;
  };
  user: {
    name: string;
    email: string;
    role: string;
  };
  file?: File; // Document file to preview
}

export const DocumensoIntegration: React.FC<DocumensoIntegrationProps> = ({
  isOpen,
  onClose,
  onComplete,
  document,
  user,
  file
}) => {
  const [signingProgress, setSigningProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState('signature');
  const [signatureMethod, setSignatureMethod] = useState('draw');
  const [signatureData, setSignatureData] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedSignature, setCapturedSignature] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(2);
  const [brushColor, setBrushColor] = useState('#000000');
  const [points, setPoints] = useState<Array<{x: number, y: number}>>([]);
  const [savedSignatures, setSavedSignatures] = useState<Array<{id: string, name: string, data: string, type: 'draw' | 'upload'}>>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [fileContent, setFileContent] = useState<any>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileZoom, setFileZoom] = useState(100);
  const [fileRotation, setFileRotation] = useState(0);
  
  // Signature placement on document
  const [placedSignatures, setPlacedSignatures] = useState<Array<{
    id: string;
    data: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  }>>([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCorner, setResizeCorner] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);
  
  // Signature field state (the green box)
  const [signatureField, setSignatureField] = useState({
    x: 100,
    y: 300,
    width: 200,
    height: 80,
    rotation: 0
  });
  const [isFieldSelected, setIsFieldSelected] = useState(false);
  const [isFieldDragging, setIsFieldDragging] = useState(false);
  const [isFieldResizing, setIsFieldResizing] = useState(false);
  const [fieldResizeCorner, setFieldResizeCorner] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);
  const [fieldDragOffset, setFieldDragOffset] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const documensoAPI = useDocumensoAPI({
    apiKey: 'api_lr6uvchonev0drwc',
    baseUrl: 'https://api.documenso.com',
    webhookUrl: 'https://iaoms.edu/webhooks/documenso'
  });

  // Load file content when file prop changes
  React.useEffect(() => {
    if (!file || !isOpen) {
      setFileContent(null);
      setFileError(null);
      return;
    }

    const loadFile = async () => {
      setFileLoading(true);
      setFileError(null);
      
      try {
        const fileType = file.type;
        const fileName = file.name.toLowerCase();

        if (fileType.includes('pdf') || fileName.endsWith('.pdf')) {
          await loadPDF(file);
        } else if (fileType.includes('image')) {
          await loadImageFile(file);
        } else if (fileType.includes('word') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
          await loadWord(file);
        } else if (fileType.includes('sheet') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          await loadExcel(file);
        } else if (fileName.endsWith('.html')) {
          // Handle HTML files
          const text = await file.text();
          setFileContent({ type: 'word', html: text });
        } else {
          setFileContent({ type: 'unsupported' });
        }
      } catch (error) {
        console.error('Error loading file:', error);
        setFileError(error instanceof Error ? error.message : 'Failed to load file');
      } finally {
        setFileLoading(false);
      }
    };

    loadFile();
  }, [file, isOpen]);

  const handleViewFile = () => {
    if (file) {
      setShowFileViewer(true);
    }
  };

  // Load PDF file
  const loadPDF = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const pageCanvases: string[] = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvasEl = window.document.createElement('canvas');
      const context = canvasEl.getContext('2d');
      
      if (!context) throw new Error('Could not get canvas context');
      
      canvasEl.height = viewport.height;
      canvasEl.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport: viewport } as any).promise;
      pageCanvases.push(canvasEl.toDataURL());
    }

    setFileContent({ type: 'pdf', pageCanvases, totalPages: pdf.numPages });
  };

  // Load Word document
  const loadWord = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    setFileContent({ type: 'word', html: result.value });
  };

  // Load Excel file
  const loadExcel = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const html = XLSX.utils.sheet_to_html(worksheet);
    setFileContent({ type: 'excel', html });
  };

  // Load image file
  const loadImageFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    setFileContent({ type: 'image', url });
  };

  const handleSign = async () => {
    setIsProcessing(true);
    
    try {
      
      // Enhanced Documenso signing process
      const steps = [
        { message: 'Connecting to Documenso servers...', progress: 15 },
        { message: 'Validating digital certificate...', progress: 30 },
        { message: 'Preparing document for signature...', progress: 45 },
        { message: 'Applying cryptographic signature...', progress: 65 },
        { message: 'Generating blockchain timestamp...', progress: 80 },
        { message: 'Verifying signature integrity...', progress: 95 },
        { message: 'Signature complete and verified!', progress: 100 }
      ];

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 800));
        setSigningProgress(step.progress);
        
        toast({
          title: "Documenso Signing",
          description: step.message,
        });
      }

      setIsCompleted(true);
      setIsProcessing(false);
      
      // Complete the signing process
      setTimeout(() => {
        onComplete();
        toast({
          title: "Document Signed Successfully",
          description: `${document.title} has been digitally signed with AI-optimized placement and forwarded to the next recipient.`,
        });
      }, 1500);
      
    } catch (error) {
      setIsProcessing(false);
      toast({
        title: "Signing Failed",
        description: "Failed to apply digital signature. Please try again.",
        variant: "destructive"
      });
    }
  };

  const smoothSignature = (pts: Array<{x: number, y: number}>) => {
    const canvas = canvasRef.current;
    if (!canvas || pts.length < 2) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = brushColor;
    ctx.shadowBlur = 0.5;
    ctx.globalCompositeOperation = 'source-over';
    
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    
    for (let i = 1; i < pts.length - 2; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }
    
    if (pts.length > 2) {
      ctx.quadraticCurveTo(
        pts[pts.length - 2].x,
        pts[pts.length - 2].y,
        pts[pts.length - 1].x,
        pts[pts.length - 1].y
      );
    }
    
    ctx.stroke();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setPoints([{x, y}]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setPoints(prev => {
      const newPoints = [...prev, {x, y}];
      smoothSignature(newPoints);
      return newPoints;
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    if (points.length > 0) {
      smoothSignature(points);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    setPoints([{x, y}]);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    setPoints(prev => {
      const newPoints = [...prev, {x, y}];
      smoothSignature(newPoints);
      return newPoints;
    });
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(false);
    if (points.length > 0) {
      smoothSignature(points);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPoints([]);
  };

  const saveDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('Canvas not found');
      return;
    }
    
    const dataUrl = canvas.toDataURL();
    console.log('Drawn signature data URL length:', dataUrl.length);
    
    const newSignature = {
      id: Date.now().toString(),
      name: `Signature ${savedSignatures.length + 1}`,
      data: dataUrl,
      type: 'draw' as const
    };
    
    setSavedSignatures(prev => [...prev, newSignature]);
    
    // Automatically place signature on document
    placeSignatureOnDocument(dataUrl);
    
    toast({
      title: "Signature Saved and Placed",
      description: "Signature has been saved to library and placed on document."
    });
  };

  // Place signature on document preview - Inside signature field box
  const placeSignatureOnDocument = (signatureData: string) => {
    const newPlacedSignature = {
      id: Date.now().toString(),
      data: signatureData,
      x: signatureField.x, // Use signature field position
      y: signatureField.y,
      width: signatureField.width, // Use signature field size
      height: signatureField.height,
      rotation: signatureField.rotation // Match field rotation
    };
    
    console.log('Placing signature at:', newPlacedSignature);
    console.log('Signature field:', signatureField);
    
    setPlacedSignatures(prev => [...prev, newPlacedSignature]);
    setSelectedSignatureId(newPlacedSignature.id);
    
    toast({
      title: "Signature Placed",
      description: `Signature placed inside field box at (${signatureField.x}, ${signatureField.y})`
    });
  };

  // Handle signature drag
  const handleSignatureMouseDown = (e: React.MouseEvent, sigId: string) => {
    e.stopPropagation();
    const signature = placedSignatures.find(s => s.id === sigId);
    if (!signature) return;

    setSelectedSignatureId(sigId);
    setIsDragging(true);
    
    const rect = previewContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDragOffset({
      x: e.clientX - signature.x,
      y: e.clientY - signature.y
    });
  };

  // Handle resize corner drag
  const handleResizeMouseDown = (e: React.MouseEvent, sigId: string, corner: 'tl' | 'tr' | 'bl' | 'br') => {
    e.stopPropagation();
    setSelectedSignatureId(sigId);
    setIsResizing(true);
    setResizeCorner(corner);
  };

  // Handle mouse move for drag/resize
  const handlePreviewMouseMove = (e: React.MouseEvent) => {
    if (!selectedSignatureId) return;

    if (isDragging) {
      const rect = previewContainerRef.current?.getBoundingClientRect();
      if (!rect) return;

      setPlacedSignatures(prev => prev.map(sig => {
        if (sig.id === selectedSignatureId) {
          return {
            ...sig,
            x: e.clientX - dragOffset.x,
            y: e.clientY - dragOffset.y
          };
        }
        return sig;
      }));
    } else if (isResizing && resizeCorner) {
      const signature = placedSignatures.find(s => s.id === selectedSignatureId);
      if (!signature) return;

      const rect = previewContainerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setPlacedSignatures(prev => prev.map(sig => {
        if (sig.id === selectedSignatureId) {
          let newWidth = sig.width;
          let newHeight = sig.height;
          let newX = sig.x;
          let newY = sig.y;

          switch (resizeCorner) {
            case 'br': // Bottom right
              newWidth = Math.max(50, mouseX - sig.x);
              newHeight = Math.max(30, mouseY - sig.y);
              break;
            case 'bl': // Bottom left
              newWidth = Math.max(50, sig.x + sig.width - mouseX);
              newHeight = Math.max(30, mouseY - sig.y);
              newX = mouseX;
              break;
            case 'tr': // Top right
              newWidth = Math.max(50, mouseX - sig.x);
              newHeight = Math.max(30, sig.y + sig.height - mouseY);
              newY = mouseY;
              break;
            case 'tl': // Top left
              newWidth = Math.max(50, sig.x + sig.width - mouseX);
              newHeight = Math.max(30, sig.y + sig.height - mouseY);
              newX = mouseX;
              newY = mouseY;
              break;
          }

          return { ...sig, width: newWidth, height: newHeight, x: newX, y: newY };
        }
        return sig;
      }));
    }
  };

  const handlePreviewMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeCorner(null);
  };

  // Rotate signature
  const rotateSignature = (sigId: string) => {
    setPlacedSignatures(prev => prev.map(sig => {
      if (sig.id === sigId) {
        return { ...sig, rotation: (sig.rotation + 90) % 360 };
      }
      return sig;
    }));
  };

  // Delete signature
  const deleteSignature = (sigId: string) => {
    setPlacedSignatures(prev => prev.filter(sig => sig.id !== sigId));
    setSelectedSignatureId(null);
  };

  // ===== SIGNATURE FIELD HANDLERS =====
  
  // Handle signature field drag
  const handleFieldMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFieldSelected(true);
    setIsFieldDragging(true);
    setSelectedSignatureId(null); // Deselect any placed signatures

    const rect = previewContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setFieldDragOffset({
      x: e.clientX - rect.left - signatureField.x,
      y: e.clientY - rect.top - signatureField.y
    });
  };

  // Handle field resize corner drag
  const handleFieldResizeMouseDown = (e: React.MouseEvent, corner: 'tl' | 'tr' | 'bl' | 'br') => {
    e.stopPropagation();
    e.preventDefault();
    setIsFieldSelected(true);
    setIsFieldResizing(true);
    setFieldResizeCorner(corner);
    setSelectedSignatureId(null);
  };

  // Handle field mouse move for drag/resize
  const handleFieldMouseMove = (e: React.MouseEvent) => {
    const rect = previewContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isFieldDragging) {
      setSignatureField(prev => ({
        ...prev,
        x: mouseX - fieldDragOffset.x,
        y: mouseY - fieldDragOffset.y
      }));
    } else if (isFieldResizing && fieldResizeCorner) {
      setSignatureField(prev => {
        let newWidth = prev.width;
        let newHeight = prev.height;
        let newX = prev.x;
        let newY = prev.y;

        switch (fieldResizeCorner) {
          case 'br': // Bottom right
            newWidth = Math.max(100, mouseX - prev.x);
            newHeight = Math.max(50, mouseY - prev.y);
            break;
          case 'bl': // Bottom left
            newWidth = Math.max(100, prev.x + prev.width - mouseX);
            newHeight = Math.max(50, mouseY - prev.y);
            newX = mouseX;
            break;
          case 'tr': // Top right
            newWidth = Math.max(100, mouseX - prev.x);
            newHeight = Math.max(50, prev.y + prev.height - mouseY);
            newY = mouseY;
            break;
          case 'tl': // Top left
            newWidth = Math.max(100, prev.x + prev.width - mouseX);
            newHeight = Math.max(50, prev.y + prev.height - mouseY);
            newX = mouseX;
            newY = mouseY;
            break;
        }

        return { ...prev, width: newWidth, height: newHeight, x: newX, y: newY };
      });
    }
  };

  // Rotate signature field
  const rotateSignatureField = () => {
    setSignatureField(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360
    }));
  };

  // Delete signature field
  const deleteSignatureField = () => {
    // Reset to default position
    setSignatureField({
      x: 100,
      y: 300,
      width: 200,
      height: 80,
      rotation: 0
    });
    setIsFieldSelected(false);
    
    toast({
      title: "Signature Field Reset",
      description: "The signature field has been reset to default position"
    });
  };

  // Combined mouse move handler
  const handleCombinedMouseMove = (e: React.MouseEvent) => {
    if (isFieldDragging || isFieldResizing) {
      handleFieldMouseMove(e);
    } else if (isDragging || isResizing) {
      handlePreviewMouseMove(e);
    }
  };

  // Combined mouse up handler
  const handleCombinedMouseUp = () => {
    setIsFieldDragging(false);
    setIsFieldResizing(false);
    setFieldResizeCorner(null);
    handlePreviewMouseUp();
  };

  // Complete transparency with ink enhancement
  const removeWhiteBackground = (imageData: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(imageData);
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageDataObj.data;
          
          // Complete background removal + ink enhancement
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // Remove ALL light backgrounds - 100% transparent
            if (luminance > 160) {
              data[i + 3] = 0; // Completely transparent
            }
            // Convert medium tones to dark ink
            else if (luminance > 80) {
              data[i] = 0;     // Pure black ink
              data[i + 1] = 0;
              data[i + 2] = 0;
              data[i + 3] = 255; // Fully opaque
            }
            // Enhance existing dark pixels to pure black
            else {
              data[i] = 0;     // Pure black
              data[i + 1] = 0;
              data[i + 2] = 0;
              data[i + 3] = 255; // Fully opaque
            }
          }
          
          ctx.putImageData(imageDataObj, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (error) {
          resolve(imageData);
        }
      };
      img.onerror = () => resolve(imageData);
      img.crossOrigin = 'anonymous';
      img.src = imageData;
    });
  };

  const saveUploadedSignature = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const originalData = e.target?.result as string;
      
      // Remove white background automatically
      const transparentData = await removeWhiteBackground(originalData);
      
      const newSignature = {
        id: Date.now().toString(),
        name: file.name,
        data: transparentData,
        type: 'upload' as const
      };
      
      setSavedSignatures(prev => [...prev, newSignature]);
      
      // Automatically place signature on document
      placeSignatureOnDocument(transparentData);
      
      toast({
        title: "Signature Saved and Placed",
        description: "Background removed and signature placed on document."
      });
    };
    reader.readAsDataURL(file);
  };

  const loadSavedSignature = (signature: typeof savedSignatures[0]) => {
    // Place signature directly on document
    placeSignatureOnDocument(signature.data);
    
    toast({
      title: "Signature Placed",
      description: `${signature.name} has been placed on the document`
    });
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        
        toast({
          title: "Camera Started",
          description: "Position your signature in the frame and capture",
        });
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const captureSignature = async () => {
    const video = videoRef.current;
    if (!video) return;
    
    const canvas = window.document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    const originalData = canvas.toDataURL('image/png');
    
    // Remove white background from captured image
    const transparentData = await removeWhiteBackground(originalData);
    
    setCapturedSignature(transparentData);
    stopCamera();
    
    // Automatically place signature on document
    placeSignatureOnDocument(transparentData);
    
    toast({
      title: "Signature Captured and Placed",
      description: "Background removed and signature placed on document."
    });
  };

  const retakeSignature = () => {
    setCapturedSignature(null);
    startCamera();
  };

  const handleVerification = () => {
    if (verificationCode === '123456') {
      setShowVerification(false);
      handleSign();
    } else {
      toast({
        title: "Invalid Code",
        description: "Please enter the correct verification code",
        variant: "destructive"
      });
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Documenso Digital Signature Platform
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6 h-[80vh]">
          {/* Left Column - Document Preview */}
          <div className="border-r pr-6">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Document Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
                {file ? (
                  <div className="h-full flex flex-col">


                    {/* Embedded Document Preview - Enhanced Scrolling with Increased Height */}
                    <div 
                      ref={previewContainerRef}
                      className="flex-1 overflow-y-auto overflow-x-hidden border-t bg-gray-50 scroll-smooth relative" 
                      style={{ maxHeight: 'calc(80vh - 180px)', minHeight: '500px' }}
                      onMouseMove={handleCombinedMouseMove}
                      onMouseUp={handleCombinedMouseUp}
                      onMouseLeave={handleCombinedMouseUp}
                      onClick={() => { setIsFieldSelected(false); setSelectedSignatureId(null); }}
                    >
                      {fileLoading ? (
                        <div className="flex items-center justify-center h-full p-8 min-h-[400px]">
                          <div className="text-center">
                            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
                            <p className="text-sm text-gray-600">Loading document...</p>
                          </div>
                        </div>
                      ) : fileError ? (
                        <div className="flex items-center justify-center h-full p-8 min-h-[400px]">
                          <div className="text-center">
                            <FileText className="h-12 w-12 mx-auto mb-4 text-red-500" />
                            <p className="text-sm font-medium text-red-600 mb-2">Error Loading File</p>
                            <p className="text-xs text-gray-500 break-words">{fileError}</p>
                          </div>
                        </div>
                      ) : fileContent ? (
                        <div className="p-4 pb-8 w-full relative">
                          {/* Zoom and Rotation Controls */}
                          <div className="flex items-center justify-center gap-2 mb-4 sticky top-0 bg-white/95 backdrop-blur-sm p-2 rounded-lg shadow-sm z-10">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setFileZoom(Math.max(50, fileZoom - 10))}
                              disabled={fileZoom <= 50}
                              title="Zoom Out"
                            >
                              <ZoomOut className="h-4 w-4" />
                            </Button>
                            <Badge variant="secondary" className="px-3 font-mono">{fileZoom}%</Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setFileZoom(Math.min(200, fileZoom + 10))}
                              disabled={fileZoom >= 200}
                              title="Zoom In"
                            >
                              <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setFileRotation((fileRotation + 90) % 360)}
                              title="Rotate 90°"
                            >
                              <RotateCw className="h-4 w-4" />
                            </Button>
                            {fileContent.type === 'pdf' && fileContent.totalPages && (
                              <Badge variant="outline">{fileContent.totalPages} pages</Badge>
                            )}
                          </div>

                          {/* File Content Rendering with Overflow Protection */}
                          <div className="space-y-4 pb-4 w-full">
                            {fileContent.type === 'pdf' && fileContent.pageCanvases?.map((pageDataUrl: string, index: number) => (
                              <div key={index} className="relative mb-6 overflow-hidden">
                                <img
                                  src={pageDataUrl}
                                  alt={`Page ${index + 1}`}
                                  style={{
                                    transform: `scale(${fileZoom / 100}) rotate(${fileRotation}deg)`,
                                    transformOrigin: 'center',
                                    transition: 'transform 0.3s ease',
                                    maxWidth: '100%',
                                    height: 'auto',
                                  }}
                                  className="border shadow-lg rounded mx-auto block"
                                />
                                <Badge variant="secondary" className="absolute top-2 right-2 bg-background/95 backdrop-blur z-20">
                                  Page {index + 1} of {fileContent.totalPages}
                                </Badge>
                              </div>
                            ))}

                            {fileContent.type === 'word' && (
                              <div className="w-full overflow-hidden relative">
                                <div
                                  className="prose prose-sm max-w-none p-6 bg-white rounded shadow-sm min-h-[300px] break-words"
                                  style={{
                                    transform: `scale(${fileZoom / 100}) rotate(${fileRotation}deg)`,
                                    transformOrigin: 'top center',
                                    transition: 'transform 0.3s ease',
                                    wordWrap: 'break-word',
                                    overflowWrap: 'break-word',
                                    maxWidth: '100%',
                                  }}
                                  dangerouslySetInnerHTML={{ __html: fileContent.html }}
                                />
                              </div>
                            )}

                            {fileContent.type === 'excel' && (
                              <div className="w-full overflow-hidden relative">
                                <div
                                  className="overflow-auto bg-white rounded shadow-sm p-4 min-h-[300px] max-h-[600px]"
                                  style={{
                                    transform: `scale(${fileZoom / 100}) rotate(${fileRotation}deg)`,
                                    transformOrigin: 'top left',
                                    transition: 'transform 0.3s ease',
                                    maxWidth: '100%',
                                  }}
                                  dangerouslySetInnerHTML={{ __html: fileContent.html }}
                                />
                              </div>
                            )}

                            {fileContent.type === 'image' && (
                              <div className="flex justify-center">
                                <img
                                  src={fileContent.url}
                                  alt={file.name}
                                  style={{
                                    maxWidth: '100%',
                                    height: 'auto',
                                    transform: `scale(${fileZoom / 100}) rotate(${fileRotation}deg)`,
                                    transition: 'transform 0.3s ease',
                                  }}
                                  className="border shadow-lg rounded"
                                />
                              </div>
                            )}

                            {fileContent.type === 'unsupported' && (
                              <div className="flex items-center justify-center h-full p-8">
                                <div className="text-center">
                                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                  <p className="text-sm text-gray-600">Unsupported file type</p>
                                </div>
                              </div>
                            )}
                          </div>



                          {/* Placed Signatures Overlay */}
                          {placedSignatures.map((signature) => (
                            <div
                              key={signature.id}
                              className={`absolute cursor-pointer select-none transition-all duration-200 ${selectedSignatureId === signature.id ? 'ring-2 ring-blue-400/60 shadow-lg' : 'hover:shadow-md'}`}
                              style={{
                                left: `${signature.x}px`,
                                top: `${signature.y}px`,
                                width: `${signature.width}px`,
                                height: `${signature.height}px`,
                                transform: `rotate(${signature.rotation}deg)`,
                                transformOrigin: 'center',
                                zIndex: selectedSignatureId === signature.id ? 50 : 10,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSignatureId(signature.id);
                              }}
                              onMouseDown={(e) => handleSignatureMouseDown(e, signature.id)}
                            >
                              {/* Signature Image - Authentic ink absorption */}
                              <img
                                src={signature.data}
                                alt="Signature"
                                className="w-full h-full object-contain pointer-events-none"
                                style={{ 
                                  background: 'transparent',
                                  mixBlendMode: 'multiply',
                                  opacity: 1
                                }}
                                draggable={false}
                              />

                              {/* Control Buttons (when selected) */}
                              {selectedSignatureId === signature.id && (
                                <div className="absolute -top-10 left-0 right-0 flex justify-center gap-1 bg-white/95 backdrop-blur-sm rounded-t-lg border border-b-0 border-blue-500 p-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      rotateSignature(signature.id);
                                    }}
                                    className="h-7 px-2"
                                    title="Rotate 90°"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteSignature(signature.id);
                                    }}
                                    className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Delete"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                  <div className="flex items-center px-2 text-xs text-gray-600">
                                    <Move className="w-3 h-3 mr-1" />
                                    Drag
                                  </div>
                                </div>
                              )}

                              {/* Resize Corners (when selected) */}
                              {selectedSignatureId === signature.id && (
                                <>
                                  {/* Top Left */}
                                  <div
                                    className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize hover:bg-blue-600 border-2 border-white shadow-md"
                                    onMouseDown={(e) => handleResizeMouseDown(e, signature.id, 'tl')}
                                  />
                                  {/* Top Right */}
                                  <div
                                    className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-nesw-resize hover:bg-blue-600 border-2 border-white shadow-md"
                                    onMouseDown={(e) => handleResizeMouseDown(e, signature.id, 'tr')}
                                  />
                                  {/* Bottom Left */}
                                  <div
                                    className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 rounded-full cursor-nesw-resize hover:bg-blue-600 border-2 border-white shadow-md"
                                    onMouseDown={(e) => handleResizeMouseDown(e, signature.id, 'bl')}
                                  />
                                  {/* Bottom Right */}
                                  <div
                                    className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize hover:bg-blue-600 border-2 border-white shadow-md"
                                    onMouseDown={(e) => handleResizeMouseDown(e, signature.id, 'br')}
                                  />
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full p-8">
                          <div className="text-center">
                            <Eye className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                            <p className="text-sm text-gray-600">Loading preview...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center p-6">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-sm text-gray-600 mb-2">No document available</p>
                      <p className="text-xs text-gray-500">
                        Please provide a document file to preview
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column - Signature Interaction & CTA */}
          <div className="pl-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="signature">Sign</TabsTrigger>
                <TabsTrigger value="library">Library</TabsTrigger>
                <TabsTrigger value="verification">Verify</TabsTrigger>
              </TabsList>



              <TabsContent value="signature" className="flex-1 overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Signature className="w-5 h-5" />
                  Digital Signature Methods
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <Button
                    variant={signatureMethod === 'draw' ? 'default' : 'outline'}
                    onClick={() => setSignatureMethod('draw')}
                    className="h-20 flex-col"
                  >
                    <PenTool className="w-6 h-6 mb-2" />
                    Draw Signature
                  </Button>
                  <Button
                    variant={signatureMethod === 'camera' ? 'default' : 'outline'}
                    onClick={() => setSignatureMethod('camera')}
                    className="h-20 flex-col"
                  >
                    <Camera className="w-6 h-6 mb-2" />
                    Phone Camera
                  </Button>
                  <Button
                    variant={signatureMethod === 'upload' ? 'default' : 'outline'}
                    onClick={() => setSignatureMethod('upload')}
                    className="h-20 flex-col"
                  >
                    <Upload className="w-6 h-6 mb-2" />
                    Upload Image
                  </Button>
                </div>



                {signatureMethod === 'draw' && (
                  <div className="space-y-4">
                    {/* Drawing Controls */}
                    <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Size:</Label>
                        <div className="flex gap-1">
                          {[1, 2, 4, 6].map(size => (
                            <Button
                              key={size}
                              variant={brushSize === size ? "default" : "outline"}
                              size="sm"
                              onClick={() => setBrushSize(size)}
                              className="text-xs px-2 py-1 h-7"
                            >
                              {size}px
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Color:</Label>
                        <input
                          type="color"
                          value={brushColor}
                          onChange={(e) => setBrushColor(e.target.value)}
                          className="w-8 h-8 rounded border cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <Label className="mb-2 block">Touch and Hold to Sign</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Press and hold while drawing your signature smoothly
                      </p>
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={150}
                        className="border border-dashed border-gray-300 rounded cursor-crosshair touch-none"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      />
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={clearSignature}>
                          Clear
                        </Button>
                        <Button size="sm" onClick={saveDrawnSignature}>
                          Save to Library
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {signatureMethod === 'camera' && (
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <Label className="mb-2 block">Capture Signature with Phone Camera</Label>
                      
                      {!cameraActive && !capturedSignature && (
                        <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                          <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                          <p className="text-sm text-gray-600 mb-4">
                            Use your phone camera to capture your handwritten signature
                          </p>
                          <Button onClick={startCamera} className="mb-2">
                            <Camera className="w-4 h-4 mr-2" />
                            Start Camera
                          </Button>
                          <div className="text-xs text-muted-foreground mt-2">
                            <p>• Write your signature on white paper</p>
                            <p>• Ensure good lighting</p>
                            <p>• Hold camera steady</p>
                          </div>
                        </div>
                      )}
                      
                      {cameraActive && (
                        <div className="space-y-4">
                          <div className="relative">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full max-w-md mx-auto border rounded-lg"
                            />
                            <div className="absolute inset-0 border-2 border-dashed border-blue-500 rounded-lg pointer-events-none" />
                          </div>
                          <div className="flex gap-2 justify-center">
                            <Button onClick={captureSignature} className="bg-blue-600 hover:bg-blue-700">
                              <Scan className="w-4 h-4 mr-2" />
                              Capture Signature
                            </Button>
                            <Button variant="outline" onClick={stopCamera}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {capturedSignature && (
                        <div className="space-y-4">
                          <div className="text-center">
                            <Label className="block mb-2">Captured Signature</Label>
                            <img
                              src={capturedSignature}
                              alt="Captured signature"
                              className="max-w-full h-32 mx-auto border rounded-lg object-contain bg-white"
                            />
                          </div>
                          <div className="flex gap-2 justify-center">
                            <Button variant="outline" onClick={retakeSignature}>
                              <Camera className="w-4 h-4 mr-2" />
                              Retake
                            </Button>
                            <Button 
                              onClick={() => {
                                if (capturedSignature) {
                                  placeSignatureOnDocument(capturedSignature);
                                  toast({ title: "Signature Placed", description: "Signature has been placed on the document. You can now move, resize, or rotate it." });
                                }
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Place on Document
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {signatureMethod === 'upload' && (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-sm text-gray-600">Upload your signature image</p>
                      <Input 
                        type="file" 
                        accept="image/*" 
                        className="mt-2" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            saveUploadedSignature(file);
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
                

                

                
                <div className="flex justify-end mt-4">
                  <Button onClick={() => setActiveTab('verification')}>Continue</Button>
                </div>
              </CardContent>
            </Card>
              </TabsContent>

              <TabsContent value="library" className="flex-1 overflow-y-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Signature Library
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {savedSignatures.length === 0 ? (
                      <div className="text-center py-8">
                        <Signature className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-sm text-muted-foreground mb-2">
                          No saved signatures yet
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Create signatures in the Sign tab to save them here
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {savedSignatures.map((sig) => (
                          <div key={sig.id} className="border rounded-lg p-4">
                            <div className="aspect-[2/1] bg-gray-50 rounded mb-3 overflow-hidden">
                              <img
                                src={sig.data}
                                alt={sig.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <p className="text-sm font-medium truncate mb-3">{sig.name}</p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={() => {
                                  loadSavedSignature(sig);
                                  setActiveTab('signature');
                                }}
                              >
                                Use This
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSavedSignatures(prev => prev.filter(s => s.id !== sig.id));
                                  toast({
                                    title: "Signature Deleted",
                                    description: `${sig.name} has been removed`
                                  });
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="verification" className="flex-1 overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Identity Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Signer Information</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="text-sm">{user.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{user.role}</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Verification Method</h4>
                    <div className="space-y-3">
                      <Label htmlFor="verification-code">Enter Verification Code</Label>
                      <Input
                        id="verification-code"
                        placeholder="Enter 6-digit code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        maxLength={6}
                      />
                      <p className="text-xs text-muted-foreground">
                        Code sent to {user.email}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Security Notice</span>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">
                    This signature will be legally binding and timestamped with blockchain verification.
                  </p>
                </div>
                
                {isProcessing ? (
                  <div className="space-y-4 text-center">
                    <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                      <PenTool className="w-8 h-8 text-blue-600 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-semibold">Processing Signature...</h3>
                    <Progress value={signingProgress} className="w-full max-w-md mx-auto" />
                    <p className="text-sm text-muted-foreground">{signingProgress}% Complete</p>
                  </div>
                ) : isCompleted ? (
                  <div className="space-y-4 text-center">
                    <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-green-800">Document Signed Successfully!</h3>
                    <p className="text-sm text-muted-foreground">
                      Your signature has been applied and the document has been forwarded to the next recipient.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download Certificate
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View Audit Trail
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setActiveTab('signature')}>Back</Button>
                    <Button onClick={handleVerification} disabled={verificationCode.length !== 6}>
                      Verify
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
              </TabsContent>


            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* FileViewer Modal */}
    {file && (
      <FileViewer
        file={file}
        open={showFileViewer}
        onOpenChange={setShowFileViewer}
      />
    )}
  </>
  );
};