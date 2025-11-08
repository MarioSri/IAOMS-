import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, X, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Document {
  id: string;
  title: string;
  type: string;
  description: string;
  submittedBy: string;
  date: string;
  approvalCard?: any;
}

interface AISummarizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document;
  approvalCard?: any;
}

export const AISummarizerModal: React.FC<AISummarizerModalProps> = ({
  isOpen,
  onClose,
  document,
  approvalCard
}) => {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [animatedText, setAnimatedText] = useState('');
  const [fileContent, setFileContent] = useState<string>('');
  const [extracting, setExtracting] = useState(false);

  // Helper function to convert base64 to ArrayBuffer
  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = atob(base64.split(',')[1] || base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  // Extract PDF content from all pages
  const extractPDFContent = async (base64Data: string): Promise<string> => {
    try {
      console.log('📄 [AI Summarizer] Extracting PDF content...');
      const arrayBuffer = base64ToArrayBuffer(base64Data);
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      // Extract text from ALL pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `\n\n--- Page ${pageNum} ---\n${pageText}`;
      }
      
      console.log('✅ [AI Summarizer] Extracted PDF content:', fullText.length, 'characters from', pdf.numPages, 'pages');
      return fullText;
    } catch (error) {
      console.error('❌ [AI Summarizer] PDF extraction error:', error);
      return '';
    }
  };

  // Extract DOCX/DOC content
  const extractWordContent = async (base64Data: string): Promise<string> => {
    try {
      console.log('📝 [AI Summarizer] Extracting Word document content...');
      
      // Convert base64 to ArrayBuffer
      const arrayBuffer = base64ToArrayBuffer(base64Data);
      
      // Use mammoth to extract plain text
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      console.log('✅ [AI Summarizer] Extracted Word content:', result.value.length, 'characters');
      return result.value; // Plain text content
    } catch (error) {
      console.error('❌ [AI Summarizer] Word extraction error:', error);
      return '';
    }
  };

  // Extract XLS/XLSX content
  const extractExcelContent = async (base64Data: string): Promise<string> => {
    try {
      console.log('📊 [AI Summarizer] Extracting Excel content...');
      
      // Convert base64 to ArrayBuffer
      const arrayBuffer = base64ToArrayBuffer(base64Data);
      
      // Read workbook
      const workbook = XLSX.read(arrayBuffer);
      
      let fullText = '';
      
      // Extract text from ALL sheets
      workbook.SheetNames.forEach((sheetName, index) => {
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert sheet to CSV format for text extraction
        const csvContent = XLSX.utils.sheet_to_csv(worksheet);
        
        fullText += `\n\n--- Sheet ${index + 1}: ${sheetName} ---\n${csvContent}`;
      });
      
      console.log('✅ [AI Summarizer] Extracted Excel content:', fullText.length, 'characters from', workbook.SheetNames.length, 'sheets');
      return fullText;
    } catch (error) {
      console.error('❌ [AI Summarizer] Excel extraction error:', error);
      return '';
    }
  };

  // Analyze image using Gemini Vision API
  const analyzeImage = async (base64Data: string, fileType: string): Promise<string> => {
    try {
      console.log('🖼️ [AI Summarizer] Analyzing image...');
      
      // Determine mime type
      let mimeType = 'image/jpeg';
      if (fileType.includes('png')) mimeType = 'image/png';
      else if (fileType.includes('jpg') || fileType.includes('jpeg')) mimeType = 'image/jpeg';
      
      const imageData = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyDC41PALf1ZZ4IxRBwUcQFK7p3lw93SIyE`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: "Describe this image in detail. Extract any text visible in the image. Identify key elements, objects, people, and visual information. Provide a comprehensive analysis."
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: imageData
                  }
                }
              ]
            }]
          })
        }
      );
      
      const data = await response.json();
      const description = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to analyze image';
      console.log('✅ [AI Summarizer] Image analysis complete:', description.length, 'characters');
      return description;
    } catch (error) {
      console.error('❌ [AI Summarizer] Image analysis error:', error);
      return '';
    }
  };

  // Extract file content based on type
  const extractFileContent = async (fileData: any) => {
    console.log('📖 [AI Summarizer] Extracting content from:', fileData.type || fileData.name);
    setExtracting(true);
    
    try {
      const fileType = (fileData.type || fileData.name || '').toLowerCase();
      let content = '';
      
      // PDF Files - All pages
      if (fileType.includes('pdf')) {
        content = await extractPDFContent(fileData.data);
      } 
      // Word Documents - Full text extraction
      else if (fileType.includes('word') || fileType.includes('doc') || fileType.includes('.docx') || fileType.includes('.doc')) {
        content = await extractWordContent(fileData.data);
      }
      // Excel Spreadsheets - All sheets
      else if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('.xlsx') || fileType.includes('.xls')) {
        content = await extractExcelContent(fileData.data);
      }
      // Image Files - OCR with Gemini Vision (TODO: Fix later)
      else if (fileType.includes('image') || fileType.includes('png') || fileType.includes('jpg') || fileType.includes('jpeg')) {
        // TODO: Image extraction - will be fixed later
        console.log('🖼️ [AI Summarizer] Image analysis - Will be implemented later');
        content = document.description;
      }
      // Fallback for unsupported types
      else {
        content = document.description;
      }
      
      setFileContent(content);
    } catch (error) {
      console.error('❌ [AI Summarizer] File extraction error:', error);
      setFileContent(document.description);
    } finally {
      setExtracting(false);
    }
  };

  // Extract file from approval card if available
  useEffect(() => {
    if (approvalCard?.files && approvalCard.files.length > 0) {
      console.log('📄 [AI Summarizer] Extracting file from approval card');
      const firstFile = approvalCard.files[0];
      extractFileContent(firstFile);
    } else {
      setFileContent('');
    }
  }, [approvalCard]);

  const generateSummary = async () => {
    setLoading(true);
    setSummary('');
    setAnimatedText('');

    try {
      // Truncate file content if too large (Gemini has ~1M token limit)
      // Approximately 4 characters per token, keep under 30,000 characters for safety
      const MAX_CONTENT_LENGTH = 30000;
      let processedContent = fileContent;
      
      if (fileContent && fileContent.length > MAX_CONTENT_LENGTH) {
        console.warn(`⚠️ [AI Summarizer] Content too large (${fileContent.length} chars), truncating to ${MAX_CONTENT_LENGTH} chars`);
        processedContent = fileContent.substring(0, MAX_CONTENT_LENGTH) + '\n\n[... Content truncated due to length ...]';
      }
      
      // Build comprehensive prompt with file content
      const prompt = processedContent 
        ? `Please provide a comprehensive summary of this document:

Title: ${document.title}
Type: ${document.type}
Submitted by: ${document.submittedBy}
Date: ${document.date}
Description: ${document.description}

FULL DOCUMENT CONTENT:
${processedContent}

Please analyze ALL content thoroughly. Include:
1. Main topics and key points from each section
2. Important data, numbers, or statistics mentioned
3. Visual elements or images described
4. Action items or recommendations
5. Conclusions or outcomes

Provide a detailed yet concise summary (200-300 words).`
        : `Please provide a concise summary of this document:

Title: ${document.title}
Type: ${document.type}
Submitted by: ${document.submittedBy}
Date: ${document.date}
Description: ${document.description}

Generate a professional summary highlighting key points, objectives, and any action items. Keep it under 150 words.`;

      console.log('🤖 [AI Summarizer] Sending request to Gemini API...');
      console.log('📝 [AI Summarizer] Prompt length:', prompt.length, 'characters');

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyDC41PALf1ZZ4IxRBwUcQFK7p3lw93SIyE`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      console.log('📡 [AI Summarizer] API Response Status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [AI Summarizer] API Error Response:', errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('📦 [AI Summarizer] API Response Data:', JSON.stringify(data, null, 2));
      
      const generatedSummary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate summary at this time.';
      
      if (generatedSummary === 'Unable to generate summary at this time.') {
        console.warn('⚠️ [AI Summarizer] No summary in response. Full response:', data);
      }
      
      setSummary(generatedSummary);
      animateText(generatedSummary);
      
      console.log('✅ [AI Summarizer] Summary generated:', generatedSummary.length, 'characters');
    } catch (error) {
      console.error('❌ [AI Summarizer] Summary generation error:', error);
      
      // Detailed error logging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // Create a fallback summary - Show only document content without metadata headers
      let fallbackSummary = '';
      
      if (fileContent && fileContent.length > 0) {
        // Show extracted content directly without metadata headers
        fallbackSummary = fileContent.trim();
      } else {
        // Fallback to description only if no content available
        fallbackSummary = document.description || 'No content available for this document.';
      }
      
      setSummary(fallbackSummary);
      animateText(fallbackSummary);
    } finally {
      setLoading(false);
    }
  };

  const animateText = (text: string) => {
    const words = text.split(' ');
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        setAnimatedText(prev => prev + (currentIndex === 0 ? '' : ' ') + words[currentIndex]);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 100);
  };

  useEffect(() => {
    if (isOpen) {
      generateSummary();
    }
  }, [isOpen, document]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] mx-auto bg-white rounded-3xl shadow-2xl border-0 p-0 overflow-hidden [&>button]:hidden">
        <div className="relative flex flex-col h-full max-h-[90vh]">
          <DialogHeader className="p-8 pb-6 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                AI Document Summarizer
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="rounded-full hover:bg-white/50"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-6 overflow-y-auto flex-1">
            {/* File extraction status */}
            {extracting && (
              <div className="bg-blue-50 rounded-2xl p-4 flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span className="text-sm text-blue-700">Extracting file content...</span>
              </div>
            )}
            
            {/* File info */}
            {approvalCard?.files && approvalCard.files.length > 0 && !extracting && (
              <div className="bg-green-50 rounded-2xl p-4">
                <p className="text-sm text-green-700">
                  ✅ Analyzing file: <strong>{approvalCard.files[0].name}</strong>
                  {fileContent && ` (${fileContent.length} characters extracted)`}
                </p>
              </div>
            )}
            
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 min-h-[200px] max-h-[500px] overflow-y-auto">
              <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2 sticky top-0 bg-gradient-to-br from-blue-50 to-purple-50 pb-2 z-10">
                <Sparkles className="w-5 h-5 text-blue-500" />
                AI-Generated Summary
              </h3>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <span className="ml-3 text-gray-600">Generating summary...</span>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {animatedText}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end sticky bottom-0 bg-white pt-4">
              <Button 
                onClick={generateSummary} 
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Regenerate Summary
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};