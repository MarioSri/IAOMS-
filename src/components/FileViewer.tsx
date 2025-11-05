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
import isJpg from 'is-jpg';

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
    const mimeType = file.type.toLowerCase();
    
    console.log('🔍 FileViewer - Detecting file type:', {
      name: file.name,
      extension: extension,
      mimeType: mimeType,
      size: file.size
    });
    
    if (extension === 'pdf' || mimeType === 'application/pdf') return 'pdf';
    if (['doc', 'docx'].includes(extension || '') || mimeType.includes('word')) return 'word';
    if (['xls', 'xlsx'].includes(extension || '') || mimeType.includes('sheet')) return 'excel';
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(extension || '') || mimeType.startsWith('image/')) {
      console.log('✅ Image file detected:', extension || mimeType);
      return 'image';
    }
    
    console.warn('⚠️ Unsupported file type:', extension, mimeType);
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
    console.log('🖼️ Loading image file:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    // Validate file
    if (!file || file.size === 0) {
      console.error('❌ Invalid file: empty or null');
      throw new Error('Invalid image file: file is empty');
    }
    
    if (!file.type.startsWith('image/')) {
      console.warn('⚠️ File MIME type not recognized as image:', file.type);
    }
    
    return new Promise<void>((resolve, reject) => {
      // Try to read the file as text first to check if it's already a data URL
      const textReader = new FileReader();
      
      textReader.onload = (e) => {
        const text = e.target?.result as string;
        
        // Check if the file content is already a data URL (happens when File is created from base64)
        if (text && text.startsWith('data:image/')) {
          console.log('✅ File is already a data URL, using directly');
          
          // Verify the image can be loaded
          const img = new Image();
          
          img.onload = () => {
            console.log('✅ Image loaded successfully from existing data URL:', {
              width: img.naturalWidth,
              height: img.naturalHeight,
              type: file.type
            });
            setContent({ type: 'image', url: text });
            resolve();
          };
          
          img.onerror = (err) => {
            console.error('❌ Failed to load image from existing data URL:', err);
            // Try the normal FileReader approach as fallback
            loadImageWithFileReader(file, resolve, reject);
          };
          
          img.src = text;
        } else {
          // File is binary data, use FileReader to convert to data URL
          loadImageWithFileReader(file, resolve, reject);
        }
      };
      
      textReader.onerror = () => {
        // If text reading fails, try the normal FileReader approach
        console.log('⚠️ Could not read as text, trying binary read');
        loadImageWithFileReader(file, resolve, reject);
      };
      
      try {
        // Try to read a small portion as text to check format
        textReader.readAsText(file.slice(0, 100));
      } catch (error) {
        // If slicing fails, use normal approach
        loadImageWithFileReader(file, resolve, reject);
      }
    });
  };
  
  const loadImageWithFileReader = async (file: File, resolve: () => void, reject: (error: Error) => void) => {
    // First, validate JPG/JPEG files using is-jpg
    if (file.type === 'image/jpeg' || file.type === 'image/jpg' || 
        file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
      
      console.log('🔍 Validating JPEG file with is-jpg...');
      
      try {
        // Read file as ArrayBuffer for validation
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        console.log('📊 JPEG validation data:', {
          fileName: file.name,
          fileSize: file.size,
          arrayBufferSize: arrayBuffer.byteLength,
          firstBytes: Array.from(uint8Array.slice(0, 10)),
          lastBytes: Array.from(uint8Array.slice(-10))
        });
        
        // Validate JPEG signature
        const isValidJpg = isJpg(uint8Array);
        
        if (!isValidJpg) {
          console.error('❌ Invalid JPEG file detected by is-jpg');
          reject(new Error('Invalid JPEG file: File signature does not match JPEG format. The file may be corrupted.'));
          return;
        }
        
        console.log('✅ JPEG validation passed!');
      } catch (validationError) {
        console.error('❌ JPEG validation failed:', validationError);
        reject(new Error(`JPEG validation failed: ${validationError}`));
        return;
      }
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        console.error('❌ Failed to read image data');
        reject(new Error('Failed to read image data'));
        return;
      }
      
      console.log('✅ Image data URL created via FileReader:', {
        length: dataUrl.length,
        preview: dataUrl.substring(0, 50) + '...'
      });
      
      // Verify the image can be loaded
      const img = new Image();
      
      img.onload = () => {
        console.log('✅ Image loaded successfully:', {
          width: img.naturalWidth,
          height: img.naturalHeight,
          type: file.type
        });
        setContent({ type: 'image', url: dataUrl });
        resolve();
      };
      
      img.onerror = (err) => {
        console.error('❌ Failed to load image from data URL:', {
          error: err,
          fileType: file.type,
          fileName: file.name,
          dataUrlPreview: dataUrl.substring(0, 100),
          fileSize: file.size
        });
        reject(new Error(`Failed to load image. File type: ${file.type}. Size: ${file.size} bytes. The file may be corrupted or in an unsupported format.`));
      };
      
      img.src = dataUrl;
    };
    
    reader.onerror = (err) => {
      console.error('❌ FileReader error:', err);
      reject(new Error('Failed to read image file'));
    };
    
    try {
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('❌ Error reading file:', error);
      reject(error);
    }
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

    // Check if file has signature metadata attached
    const signatureMetadata = currentFile ? (currentFile as any).signatureMetadata : null;

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
                
                {/* Render signatures if metadata exists */}
                {signatureMetadata && signatureMetadata.length > 0 && (
                  <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{ 
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                      transformOrigin: 'center',
                    }}
                  >
                    {signatureMetadata
                      .filter((sig: any) => !sig.pageNumber || sig.pageNumber === index + 1)
                      .map((signature: any) => (
                        <div
                          key={signature.id}
                          className="absolute"
                          style={{
                            left: `${signature.x}px`,
                            top: `${signature.y}px`,
                            width: `${signature.width}px`,
                            height: `${signature.height}px`,
                            transform: `rotate(${signature.rotation}deg)`,
                            transformOrigin: 'center',
                          }}
                        >
                          <img
                            src={signature.data}
                            alt="Signature"
                            className="w-full h-full object-contain"
                            style={{ 
                              background: 'transparent',
                              mixBlendMode: 'multiply',
                              opacity: 1
                            }}
                            draggable={false}
                          />
                        </div>
                      ))
                    }
                  </div>
                )}
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
            <div className="relative">
              <div 
                className="prose prose-sm max-w-none p-6 bg-white rounded shadow-sm"
                style={{ 
                  zoom: `${zoom}%`,
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: 'top center',
                }}
                dangerouslySetInnerHTML={{ __html: content.html }}
              />
              
              {/* Render signatures if metadata exists */}
              {signatureMetadata && signatureMetadata.length > 0 && (
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{ 
                    zoom: `${zoom}%`,
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: 'top center',
                  }}
                >
                  {signatureMetadata.map((signature: any) => (
                    <div
                      key={signature.id}
                      className="absolute"
                      style={{
                        left: `${signature.x}px`,
                        top: `${signature.y}px`,
                        width: `${signature.width}px`,
                        height: `${signature.height}px`,
                        transform: `rotate(${signature.rotation}deg)`,
                        transformOrigin: 'center',
                      }}
                    >
                      <img
                        src={signature.data}
                        alt="Signature"
                        className="w-full h-full object-contain"
                        style={{ 
                          background: 'transparent',
                          mixBlendMode: 'multiply',
                          opacity: 1
                        }}
                        draggable={false}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
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
          <div className="flex justify-center items-center py-4 min-h-[400px]">
            <div className="relative inline-block">
              <img 
                src={content.url} 
                alt={currentFile?.name || 'Image'}
                style={{ 
                  maxWidth: '100%',
                  maxHeight: '80vh',
                  height: 'auto',
                  width: 'auto',
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transition: 'transform 0.3s ease',
                  transformOrigin: 'center',
                }}
                className="rounded shadow-lg"
                onLoad={() => console.log('✅ Image rendered in viewer successfully')}
                onError={(e) => {
                  console.error('❌ Image rendering in viewer failed:', e);
                }}
              />
              
              {/* Render signatures if metadata exists */}
              {signatureMetadata && signatureMetadata.length > 0 && (
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{ 
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transformOrigin: 'center',
                  }}
                >
                  {signatureMetadata.map((signature: any) => (
                    <div
                      key={signature.id}
                      className="absolute"
                      style={{
                        left: `${signature.x}px`,
                        top: `${signature.y}px`,
                        width: `${signature.width}px`,
                        height: `${signature.height}px`,
                        transform: `rotate(${signature.rotation}deg)`,
                        transformOrigin: 'center',
                      }}
                    >
                      <img
                        src={signature.data}
                        alt="Signature"
                        className="w-full h-full object-contain"
                        style={{ 
                          background: 'transparent',
                          mixBlendMode: 'multiply',
                          opacity: 1
                        }}
                        draggable={false}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
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
          <div className="flex items-center justify-between pr-12">
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
