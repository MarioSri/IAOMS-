import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  FileText, 
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// Set up PDF.js worker with unpkg CDN for better compatibility
if (typeof window !== 'undefined') {
  // Use unpkg CDN which has better CORS support
  // Version 5.x uses .mjs extension for ES modules
  const pdfjsVersion = pdfjsLib.version || '5.4.296';
  const workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;
  
  console.log('PDF.js version:', pdfjsVersion);
  console.log('Setting worker source to:', workerSrc);
  
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
}

interface FileViewerProps {
  file: File | null;
  files?: File[]; // Support for multiple files
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FileType = 'pdf' | 'word' | 'excel' | 'image' | 'unsupported';

export const FileViewer: React.FC<FileViewerProps> = ({ file, files, open, onOpenChange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fileType, setFileType] = useState<FileType>('unsupported');
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const { toast } = useToast();

  // Determine if we're in multi-file mode
  const isMultiFile = files && files.length > 1;
  const currentFile = isMultiFile ? files[currentIndex] : file;

  // Reset current index when modal opens or files change
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
    }
  }, [open, files]);

  useEffect(() => {
    if (currentFile && open) {
      // Add a small delay to ensure modal and canvas are fully mounted
      const timer = setTimeout(() => {
        loadFile(currentFile);
      }, 100); // 100ms delay for DOM to be ready
      
      return () => clearTimeout(timer);
    }
    return () => {
      // Cleanup
      setContent(null);
      setError(null);
      setZoom(100);
      setRotation(0);
    };
  }, [currentFile, open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open || !isMultiFile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isMultiFile, currentIndex]);

  const getFileType = (file: File): FileType => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(extension || '')) return 'word';
    if (['xls', 'xlsx'].includes(extension || '')) return 'excel';
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(extension || '')) return 'image';
    
    return 'unsupported';
  };

  const loadFile = async (file: File) => {
    setLoading(true);
    setError(null);
    const type = getFileType(file);
    setFileType(type);

    try {
      switch (type) {
        case 'pdf':
          await loadPDF(file);
          break;
        case 'word':
          await loadWord(file);
          break;
        case 'excel':
          await loadExcel(file);
          break;
        case 'image':
          await loadImage(file);
          break;
        default:
          setError('Unsupported file type');
      }
    } catch (err) {
      console.error('Error loading file:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Full error details:', {
        message: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
        fileType: type,
        fileName: file.name
      });
      
      setError(`Failed to load file: ${errorMessage}`);
      toast({
        title: "Error Loading File",
        description: `${errorMessage}. Check browser console for details.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPDF = async (file: File) => {
    try {
      console.log('Starting PDF load for file:', file.name, 'Size:', file.size);
      
      const arrayBuffer = await file.arrayBuffer();
      console.log('ArrayBuffer created, size:', arrayBuffer.byteLength);
      
      // Load PDF document
      console.log('Creating PDF loading task...');
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      
      console.log('Waiting for PDF to load...');
      const pdf = await loadingTask.promise;
      console.log('PDF loaded successfully! Pages:', pdf.numPages);
      
      // Render ALL pages
      const pageCanvases: string[] = [];
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`Rendering page ${pageNum} of ${pdf.numPages}...`);
        
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        
        // Create a temporary canvas for this page
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error(`Could not get canvas context for page ${pageNum}`);
        }
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render the page
        await page.render({
          canvasContext: context,
          viewport: viewport,
        } as any).promise;
        
        // Convert canvas to data URL and store
        pageCanvases.push(canvas.toDataURL());
        console.log(`Page ${pageNum} rendered successfully`);
      }
      
      setContent({ 
        type: 'pdf', 
        totalPages: pdf.numPages,
        currentPage: 1,
        pdf: pdf,
        pageCanvases: pageCanvases
      });
      
      console.log('All PDF pages rendered and content state updated');
    } catch (error) {
      console.error('PDF loading error:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to load PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const loadWord = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    
    if (result.messages.length > 0) {
      console.warn('Mammoth conversion warnings:', result.messages);
    }
    
    setContent({ type: 'word', html: result.value });
  };

  const loadExcel = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to HTML
    const html = XLSX.utils.sheet_to_html(worksheet);
    
    setContent({ 
      type: 'excel', 
      html, 
      sheetNames: workbook.SheetNames,
      workbook 
    });
  };

  const loadImage = async (file: File) => {
    const url = URL.createObjectURL(file);
    setContent({ type: 'image', url });
  };



  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Multi-file navigation handlers
  const handlePrevious = () => {
    if (isMultiFile && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setZoom(100);
      setRotation(0);
    }
  };

  const handleNext = () => {
    if (isMultiFile && files && currentIndex < files.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setZoom(100);
      setRotation(0);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading file...</p>
            {fileType === 'pdf' && (
              <p className="text-xs text-muted-foreground mt-2">
                Rendering all pages...
              </p>
            )}
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-destructive font-medium mb-2">Error Loading File</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      );
    }

    if (!content) {
      return null;
    }

    switch (fileType) {
      case 'pdf':
        return (
          <div className="flex flex-col items-center space-y-4 py-4">
            {content?.pageCanvases && content.pageCanvases.map((pageDataUrl, index) => (
              <div key={index} className="relative">
                <img 
                  src={pageDataUrl}
                  alt={`Page ${index + 1}`}
                  style={{ 
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transformOrigin: 'center',
                    transition: 'transform 0.3s ease',
                    maxWidth: '100%',
                    height: 'auto',
                  }}
                  className="border shadow-lg rounded"
                />
                <Badge variant="secondary" className="absolute top-2 right-2 bg-background/95 backdrop-blur">
                  Page {index + 1}
                </Badge>
              </div>
            ))}
            {content && content.totalPages > 1 && (
              <Badge variant="secondary" className="sticky bottom-4 bg-background/95 backdrop-blur">
                Total: {content.totalPages} pages
              </Badge>
            )}
          </div>
        );

      case 'word':
        return (
          <div className="w-full max-w-4xl mx-auto">
            <div 
              className="prose prose-sm max-w-none p-6 bg-white rounded shadow-sm"
              style={{ 
                zoom: `${zoom}%`,
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'top center',
              }}
              dangerouslySetInnerHTML={{ __html: content.html }}
            />
          </div>
        );

      case 'excel':
        return (
          <div className="w-full space-y-4">
            {content.sheetNames.length > 1 && (
              <div className="flex gap-2 flex-wrap sticky top-0 bg-background/95 backdrop-blur p-2 rounded-lg border">
                {content.sheetNames.map((name: string, index: number) => (
                  <Badge key={index} variant="outline">
                    <FileSpreadsheet className="h-3 w-3 mr-1" />
                    {name}
                  </Badge>
                ))}
              </div>
            )}
            <div className="overflow-x-auto">
              <div 
                className="bg-white rounded p-4 shadow-sm inline-block min-w-full"
                style={{ 
                  zoom: `${zoom}%`,
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: 'top left',
                }}
                dangerouslySetInnerHTML={{ __html: content.html }}
              />
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="flex justify-center items-center py-4">
            <img 
              src={content.url} 
              alt={file?.name || 'Image'}
              style={{ 
                maxWidth: '100%',
                height: 'auto',
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transition: 'transform 0.3s ease',
                transformOrigin: 'center',
              }}
              className="rounded shadow-lg"
            />
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Unsupported file type</p>
            </div>
          </div>
        );
    }
  };

  const getFileIcon = () => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'word':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'excel':
        return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      case 'image':
        return <ImageIcon className="h-5 w-5 text-purple-500" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getFileIcon()}
              <div>
                <DialogTitle className="text-lg">
                  {currentFile?.name || 'File Viewer'}
                  {isMultiFile && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {currentIndex + 1} of {files?.length}
                    </Badge>
                  )}
                </DialogTitle>
                {currentFile && (
                  <p className="text-sm text-muted-foreground">
                    {(currentFile.size / 1024 / 1024).toFixed(2)} MB • {fileType.toUpperCase()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Multi-file Navigation */}
              {isMultiFile && (
                <>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    title="Previous file (←)"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleNext}
                    disabled={!files || currentIndex === files.length - 1}
                    title="Next file (→)"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <div className="h-6 w-px bg-border mx-1" />
                </>
              )}
              
              {/* Zoom Controls */}
              {['pdf', 'word', 'excel', 'image'].includes(fileType) && (
                <>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleZoomOut}
                    disabled={zoom <= 50}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Badge variant="secondary" className="px-3">
                    {zoom}%
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleZoomIn}
                    disabled={zoom >= 200}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleRotate}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </>
              )}

            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 mt-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          <div className="min-h-[400px] px-4 pb-4">
            {renderContent()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
