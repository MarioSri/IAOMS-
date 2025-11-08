import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AdvancedDigitalSignature } from "@/components/AdvancedDigitalSignature";
import { LiveMeetingRequestModal } from "@/components/LiveMeetingRequestModal";
import { FileViewer } from "@/components/FileViewer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Clock, FileText, User, Calendar, MessageSquare, Video, Eye, ChevronRight, CircleAlert, Undo2, SquarePen, AlertTriangle, Zap, Share2 } from "lucide-react";
import { DocumensoIntegration } from "@/components/DocumensoIntegration";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ExternalNotificationDispatcher } from "@/services/ExternalNotificationDispatcher";
import isJpg from 'is-jpg';

const Approvals = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showLiveMeetingModal, setShowLiveMeetingModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState({ id: '', type: 'letter', title: '' });
  const [showDocumenso, setShowDocumenso] = useState(false);
  const [documensoDocument, setDocumensoDocument] = useState<any>(null);
  const [comments, setComments] = useState<{[key: string]: Array<{author: string, date: string, message: string}>}>({});
  const [commentInputs, setCommentInputs] = useState<{[key: string]: string}>({});
  const [sharedComments, setSharedComments] = useState<{[key: string]: Array<{comment: string, sharedBy: string, sharedFor: string, timestamp: string}>}>({});
  const [approvalHistory, setApprovalHistory] = useState<any[]>([]);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<any>(null);
  const [viewingFile, setViewingFile] = useState<File | null>(null);
  const [viewingFiles, setViewingFiles] = useState<File[]>([]);
  
  useEffect(() => {
    const savedInputs = JSON.parse(localStorage.getItem('comment-inputs') || '{}');
    setCommentInputs(savedInputs);
    
    const savedComments = JSON.parse(localStorage.getItem('approval-comments') || '{}');
    setComments(savedComments);
    
    const savedSharedComments = JSON.parse(localStorage.getItem('shared-comments') || '{}');
    // Initialize with demo shared comment for Research Methodology Guidelines if not already present
    if (!savedSharedComments['research-methodology']) {
      savedSharedComments['research-methodology'] = [
        {
          comment: 'Insufficient literature review and theoretical framework. References need to be updated to the latest 3 years.',
          sharedBy: 'Dr. Maria Garcia (HOD)',
          sharedFor: 'all',  // Demo comment visible to all
          timestamp: new Date().toISOString()
        }
      ];
      localStorage.setItem('shared-comments', JSON.stringify(savedSharedComments));
    }
    setSharedComments(savedSharedComments);
    
    // Listen for document management approval cards
    const handleDocumentApprovalCreated = (event: any) => {
      console.log('🚨 [Approvals] Document approval event received:', event.type);
      const approval = event.detail?.approval || event.detail?.document || event.detail?.approvalCard;
      
      if (approval) {
        console.log('📋 [Approvals] Approval card received:', {
          id: approval.id,
          title: approval.title,
          isEmergency: approval.isEmergency,
          recipients: approval.recipients,
          recipientIds: approval.recipientIds
        });
        console.log('👤 [Approvals] Current user:', user?.name, '| Role:', user?.role);
        
        // Check if user should see this card
        const shouldShow = isUserInRecipients(approval);
        console.log(`🔍 [Approvals] Should show card "${approval.title}" to current user: ${shouldShow}`);
        
        // Add to state if not duplicate and user should see it
        setPendingApprovals(prev => {
          const isDuplicate = prev.some((existing: any) => existing.id === approval.id);
          
          if (!isDuplicate) {
            console.log('✅ [Approvals] Adding approval card to state');
            const newState = [approval, ...prev];
            
            // Show notification if user should see this card
            if (shouldShow) {
              toast({
                title: "New Approval Required",
                description: `${approval.title} requires your approval`,
                duration: 5000,
              });
            }
            
            return newState;
          } else {
            console.log('ℹ️ [Approvals] Approval card already exists, skipping duplicate');
            return prev;
          }
        });
      } else {
        // Fallback: reload from localStorage if no event detail
        console.log('🔄 [Approvals] No event detail, reloading from localStorage');
        const stored = JSON.parse(localStorage.getItem('pending-approvals') || '[]');
        console.log('📥 [Approvals] Loaded', stored.length, 'cards from localStorage');
        setPendingApprovals(stored);
      }
    };
    
    // Listen for shared comment updates
    const handleSharedCommentUpdate = (event: any) => {
      console.log('🔄 Shared comment update received:', event.detail);
      // Reload shared comments from localStorage to get latest updates
      const updatedSharedComments = JSON.parse(localStorage.getItem('shared-comments') || '{}');
      setSharedComments(updatedSharedComments);
    };
    
    // 🆕 Listen for approval card updates (bypass/rejection handling)
    const handleApprovalCardUpdate = (event: any) => {
      console.log('🔄 Approval card update received:', event.detail);
      // Reload pending approvals from localStorage to see updated workflow state
      const stored = JSON.parse(localStorage.getItem('pending-approvals') || '[]');
      console.log('📥 [Approvals] Reloaded', stored.length, 'cards after update event');
      setPendingApprovals(stored);
      
      // Show notification if user is now the current recipient
      if (event.detail?.action === 'bypassed' && user) {
        const updatedCard = stored.find((card: any) => card.id === event.detail.docId);
        if (updatedCard && isUserInRecipients(updatedCard)) {
          // Check if it's now user's turn
          const trackingCards = JSON.parse(localStorage.getItem('submitted-documents') || '[]');
          const trackingCard = trackingCards.find((tc: any) => tc.id === updatedCard.trackingCardId || tc.id === updatedCard.id);
          
          if (trackingCard?.workflow?.steps) {
            const currentUserRole = user?.role?.toLowerCase() || '';
            const currentUserName = user?.name?.toLowerCase() || '';
            
            const userStep = trackingCard.workflow.steps.find((step: any) => {
              const assigneeLower = step.assignee.toLowerCase();
              return (
                assigneeLower.includes(currentUserRole) ||
                assigneeLower.includes(currentUserName) ||
                (user?.department && assigneeLower.includes(user.department.toLowerCase())) ||
                (user?.branch && assigneeLower.includes(user.branch.toLowerCase()))
              );
            });
            
            if (userStep?.status === 'current') {
              toast({
                title: "Document Requires Your Approval",
                description: `${updatedCard.title} has been forwarded to you for approval`,
                duration: 5000,
              });
            }
          }
        }
      }
    };
    
    window.addEventListener('document-approval-created', handleDocumentApprovalCreated);
    window.addEventListener('approval-card-created', handleDocumentApprovalCreated);
    window.addEventListener('emergency-document-created', handleDocumentApprovalCreated);
    window.addEventListener('document-submitted', handleDocumentApprovalCreated);
    window.addEventListener('shared-comment-updated', handleSharedCommentUpdate);
    window.addEventListener('approval-card-updated', handleApprovalCardUpdate);
    
    return () => {
      window.removeEventListener('document-approval-created', handleDocumentApprovalCreated);
      window.removeEventListener('approval-card-created', handleDocumentApprovalCreated);
      window.removeEventListener('emergency-document-created', handleDocumentApprovalCreated);
      window.removeEventListener('document-submitted', handleDocumentApprovalCreated);
      window.removeEventListener('shared-comment-updated', handleSharedCommentUpdate);
      window.removeEventListener('approval-card-updated', handleApprovalCardUpdate);
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
  };

  const handleAddComment = (cardId: string) => {
    const comment = commentInputs[cardId]?.trim();
    if (comment) {
      const newComment = {
        author: user?.name || 'Reviewer',
        date: new Date().toISOString().split('T')[0],
        message: comment
      };
      
      // Save to localStorage for Track Documents
      const existingComments = JSON.parse(localStorage.getItem('document-comments') || '{}');
      existingComments[cardId] = [...(existingComments[cardId] || []), newComment];
      localStorage.setItem('document-comments', JSON.stringify(existingComments));
      
      // Save to approval-comments with author info (now consistent with document-comments)
      const newComments = {
        ...comments,
        [cardId]: [...(comments[cardId] || []), newComment]
      };
      setComments(newComments);
      
      // Save comments to localStorage for persistence
      localStorage.setItem('approval-comments', JSON.stringify(newComments));
      
      // Clear input field after submission
      const clearedInputs = { ...commentInputs, [cardId]: '' };
      setCommentInputs(clearedInputs);
      localStorage.setItem('comment-inputs', JSON.stringify(clearedInputs));
    }
  };

  const handleShareComment = (cardId: string, doc?: any) => {
    const comment = commentInputs[cardId]?.trim();
    if (comment) {
      // Determine the next recipient
      let nextRecipient = 'all';
      if (doc) {
        nextRecipient = getNextRecipient(doc);
      }
      
      const sharedComment = {
        comment,
        sharedBy: user?.name || 'Previous Approver',
        sharedFor: nextRecipient,  // Who should see this shared comment
        timestamp: new Date().toISOString()
      };
      
      const newSharedComments = {
        ...sharedComments,
        [cardId]: [...(sharedComments[cardId] || []), sharedComment]
      };
      setSharedComments(newSharedComments);
      localStorage.setItem('shared-comments', JSON.stringify(newSharedComments));
      
      // Clear input field after sharing
      const clearedInputs = { ...commentInputs, [cardId]: '' };
      setCommentInputs(clearedInputs);
      localStorage.setItem('comment-inputs', JSON.stringify(clearedInputs));
      
      toast({
        title: "Comment Shared",
        description: "Your comment will be visible only to the next recipients in the approval chain.",
      });
    }
  };

  const handleUndoComment = (cardId: string, index: number) => {
    // Remove from comments state
    const newComments = {
      ...comments,
      [cardId]: comments[cardId]?.filter((_, i) => i !== index) || []
    };
    setComments(newComments);
    
    // Save updated comments to localStorage
    localStorage.setItem('approval-comments', JSON.stringify(newComments));
    
    // Remove from localStorage comments for Track Documents
    const existingComments = JSON.parse(localStorage.getItem('document-comments') || '{}');
    if (existingComments[cardId]) {
      existingComments[cardId] = existingComments[cardId].filter((_: any, i: number) => i !== index);
      localStorage.setItem('document-comments', JSON.stringify(existingComments));
    }
    
    // Trigger real-time update for Track Documents
    window.dispatchEvent(new CustomEvent('approval-comments-changed'));
  };

  const handleUndoSharedComment = (cardId: string, index: number) => {
    const removedComment = sharedComments[cardId]?.[index];
    const newSharedComments = {
      ...sharedComments,
      [cardId]: sharedComments[cardId]?.filter((_, i) => i !== index) || []
    };
    setSharedComments(newSharedComments);
    localStorage.setItem('shared-comments', JSON.stringify(newSharedComments));
    
    // Trigger real-time update for next recipient's approval card
    if (removedComment) {
      window.dispatchEvent(new CustomEvent('shared-comment-updated', {
        detail: { cardId, action: 'undo', comment: removedComment }
      }));
    }
  };

  const handleEditSharedComment = (cardId: string, index: number) => {
    const sharedComment = sharedComments[cardId]?.[index];
    if (sharedComment) {
      const newInputs = { ...commentInputs, [cardId]: sharedComment.comment };
      setCommentInputs(newInputs);
      localStorage.setItem('comment-inputs', JSON.stringify(newInputs));
      handleUndoSharedComment(cardId, index);
      
      // Trigger real-time update for next recipient's approval card
      window.dispatchEvent(new CustomEvent('shared-comment-updated', {
        detail: { cardId, action: 'edit', comment: sharedComment }
      }));
    }
  };

  const handleEditComment = (cardId: string, index: number) => {
    const commentObj = comments[cardId]?.[index];
    if (commentObj) {
      // Load the comment message back into the input field
      const newInputs = { ...commentInputs, [cardId]: commentObj.message };
      setCommentInputs(newInputs);
      localStorage.setItem('comment-inputs', JSON.stringify(newInputs));
      handleUndoComment(cardId, index);
      
      // Trigger real-time update for Track Documents
      window.dispatchEvent(new CustomEvent('approval-comments-changed'));
    }
  };

  // Create a demo file for the document or convert from base64
  const createDocumentFile = (doc: any): File => {
    // 🆕 Filter files based on assignments first
    let filesToUse = doc.files || [];
    
    if (doc.fileAssignments && Object.keys(doc.fileAssignments).length > 0 && user) {
      const currentUserRole = user?.role?.toLowerCase() || '';
      const userRecipientId = doc.recipientIds?.find((id: string) => 
        id.toLowerCase().includes(currentUserRole)
      );
      
      filesToUse = doc.files.filter((file: any) => {
        const assignedRecipients = doc.fileAssignments[file.name];
        if (!assignedRecipients || assignedRecipients.length === 0) return true;
        return assignedRecipients.includes(userRecipientId);
      });
    }
    
    // If document has uploaded files, use the first one
    if (filesToUse && filesToUse.length > 0) {
      const fileData = filesToUse[0];
      if (fileData.data) {
        // Convert base64 back to File
        const byteCharacters = atob(fileData.data.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new File([byteArray], fileData.name, { type: fileData.type });
      }
    }

    // Fallback to demo HTML file
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${doc.title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      color: #2563eb;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 10px;
    }
    .info {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .section {
      margin: 20px 0;
    }
    .emergency {
      background: #fee2e2;
      border: 2px solid #dc2626;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>${doc.title}</h1>
  ${doc.isEmergency ? '<div class="emergency"><strong>EMERGENCY DOCUMENT</strong><br>This document requires immediate attention.</div>' : ''}
  <div class="info">
    <p><strong>Submitted by:</strong> ${doc.submitter || doc.submittedBy}</p>
    <p><strong>Date:</strong> ${doc.submittedDate || doc.date}</p>
    <p><strong>Type:</strong> ${doc.type}</p>
    <p><strong>Priority:</strong> ${doc.priority}</p>
  </div>
  <div class="section">
    <h2>Description</h2>
    <p>${doc.description}</p>
  </div>
  ${doc.emergencyFeatures ? `
  <div class="section">
    <h2>Emergency Features</h2>
    <ul>
      <li>Auto-escalation: ${doc.emergencyFeatures.autoEscalation ? 'Enabled' : 'Disabled'}</li>
      <li>Notification Settings: ${doc.emergencyFeatures.notificationSettings}</li>
      <li>Smart Delivery: ${doc.emergencyFeatures.smartDelivery ? 'Enabled' : 'Disabled'}</li>
    </ul>
  </div>
  ` : ''}
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const fileName = `${doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    return new File([blob], fileName, { type: 'text/html' });
  };



  // Handle view document with FileViewer
  const handleViewDocument = async (doc: any) => {
    // 🆕 Filter files based on assignments (if any)
    let filesToView = doc.files || [];
    
    if (doc.fileAssignments && Object.keys(doc.fileAssignments).length > 0 && user) {
      console.log('📋 File assignments detected, filtering for current user...');
      
      // Find current user's recipient ID
      const currentUserRole = user?.role?.toLowerCase() || '';
      const userRecipientId = doc.recipientIds?.find((id: string) => 
        id.toLowerCase().includes(currentUserRole)
      );
      
      console.log('👤 Current user recipient ID:', userRecipientId);
      
      // Filter files assigned to this user
      filesToView = doc.files.filter((file: any) => {
        const assignedRecipients = doc.fileAssignments[file.name];
        
        // If no specific assignments for this file, show to all
        if (!assignedRecipients || assignedRecipients.length === 0) {
          return true;
        }
        
        // Check if user is in assigned recipients
        const isAssigned = assignedRecipients.includes(userRecipientId);
        console.log(`📄 File "${file.name}" assigned to user: ${isAssigned}`);
        return isAssigned;
      });
      
      console.log(`✅ Filtered files: ${filesToView.length} of ${doc.files.length} files visible to user`);
    }
    
    // Check if document has multiple uploaded files
    if (filesToView && filesToView.length > 0) {
      try {
        console.log('📄 Reconstructing files for viewing:', filesToView.length, 'files');
        // Reconstruct all files from base64
        const reconstructedFiles: File[] = [];
        
        for (const file of filesToView) {
          const fileName = file.name || 'Unknown File';
          const fileType = file.type || 'application/octet-stream';
          const fileData = file.data || file;
          
          console.log('🔄 Processing file:', {
            name: fileName,
            type: fileType,
            hasData: !!fileData,
            dataType: typeof fileData
          });
          
          // If file has base64 data, reconstruct File object
          if (typeof fileData === 'string' && fileData.startsWith('data:')) {
            try {
              // Extract base64 data and MIME type from data URL
              const matches = fileData.match(/^data:([^;]+);base64,(.+)$/);
              if (!matches) {
                throw new Error('Invalid data URL format');
              }
              
              const mimeType = matches[1] || fileType;
              const base64Data = matches[2];
              
              console.log('📦 Decoding base64:', {
                mimeType: mimeType,
                base64Length: base64Data.length,
                base64Preview: base64Data.substring(0, 50) + '...',
                base64IsValid: /^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)
              });
              
              // CRITICAL DEBUG: Check if this is actually a data URL nested in the data
              if (base64Data.startsWith('data:')) {
                console.error('🚨 FOUND THE PROBLEM: Base64 data contains another data URL!');
                console.log('Raw stored data preview:', fileData.substring(0, 200));
                
                // The data URL is double-encoded, extract the actual base64
                const innerMatches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
                if (innerMatches) {
                  console.log('✅ Extracting inner base64 data');
                  const realBase64 = innerMatches[2];
                  
                  const binaryString = atob(realBase64);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  
                  // Validate JPEG
                  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
                    const isValidJpg = isJpg(bytes);
                    if (!isValidJpg) {
                      console.error('❌ Still invalid after extraction:', {
                        firstBytes: Array.from(bytes.slice(0, 10)),
                        lastBytes: Array.from(bytes.slice(-10))
                      });
                      throw new Error(`Invalid JPEG file: ${fileName}. Even after extraction, file signature is wrong.`);
                    }
                    console.log('✅ JPEG validation passed after extraction!');
                  }
                  
                  const blob = new Blob([bytes], { type: mimeType });
                  const reconstructedFile = new File([blob], fileName, { type: mimeType });
                  console.log('✅ File reconstructed from nested data URL:', reconstructedFile.size);
                  reconstructedFiles.push(reconstructedFile);
                  continue; // Skip normal processing
                }
              }
              
              // Convert base64 to binary
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              // Validate JPEG files with is-jpg
              if (mimeType === 'image/jpeg' || mimeType === 'image/jpg' || 
                  fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg')) {
                
                console.log('🔍 Validating JPEG with is-jpg:', fileName);
                console.log('📊 Byte analysis:', {
                  firstBytes: Array.from(bytes.slice(0, 10)),
                  firstBytesAsText: String.fromCharCode(...bytes.slice(0, 20)),
                  lastBytes: Array.from(bytes.slice(-10)),
                  expectedStart: [255, 216], // FF D8
                  expectedEnd: [255, 217]    // FF D9
                });
                
                const isValidJpg = isJpg(bytes);
                
                if (!isValidJpg) {
                  console.error('❌ Invalid JPEG detected:', {
                    fileName,
                    size: bytes.length,
                    firstBytes: Array.from(bytes.slice(0, 10)),
                    lastBytes: Array.from(bytes.slice(-10)),
                    asText: String.fromCharCode(...bytes.slice(0, 50))
                  });
                  
                  // Try to give helpful error message based on what we found
                  const firstByte = bytes[0];
                  let errorHint = '';
                  if (firstByte === 100 && bytes[1] === 97) { // 'd', 'a'
                    errorHint = ' (Appears to be text starting with "da..." - possibly corrupted base64)';
                  } else if (firstByte === 60) { // '<'
                    errorHint = ' (Appears to be HTML/XML content)';
                  } else if (firstByte === 123) { // '{'
                    errorHint = ' (Appears to be JSON data)';
                  }
                  
                  throw new Error(`Invalid JPEG file: ${fileName}. The file signature does not match JPEG format${errorHint}.`);
                }
                
                console.log('✅ JPEG validation passed for:', fileName);
              }
              
              // Create blob with correct MIME type
              const blob = new Blob([bytes], { type: mimeType });
              const reconstructedFile = new File([blob], fileName, { type: mimeType });
              
              // DETAILED DEBUG: Check if blob is valid
              console.log('✅ File reconstructed:', {
                name: fileName,
                size: reconstructedFile.size,
                type: reconstructedFile.type,
                blobSize: blob.size,
                firstBytes: Array.from(bytes.slice(0, 10))
              });
              
              // DETAILED DEBUG: Try creating blob URL to verify
              const testUrl = URL.createObjectURL(blob);
              console.log('🔍 Test blob URL created:', testUrl);
              
              // DETAILED DEBUG: For images, test if they can load
              if (mimeType.startsWith('image/')) {
                const testImg = new Image();
                testImg.onload = () => {
                  console.log('✅ Blob test: Image loaded successfully via blob URL', {
                    width: testImg.width,
                    height: testImg.height
                  });
                  URL.revokeObjectURL(testUrl);
                };
                testImg.onerror = (e) => {
                  console.error('❌ Blob test: Image failed to load via blob URL', e);
                  URL.revokeObjectURL(testUrl);
                };
                testImg.src = testUrl;
              }
              
              reconstructedFiles.push(reconstructedFile);
            } catch (err) {
              console.error('❌ Failed to reconstruct file:', fileName, err);
              toast({
                title: "File Error",
                description: `Failed to load ${fileName}: ${err instanceof Error ? err.message : 'Unknown error'}`,
                variant: "destructive"
              });
            }
          } else if (fileData instanceof File) {
            reconstructedFiles.push(fileData);
          }
        }
        
        // Use multi-file viewer if has multiple files
        if (reconstructedFiles.length === 0) {
          console.warn('⚠️ No files could be reconstructed');
          toast({
            title: "No Files",
            description: "No valid files found to display",
            variant: "destructive"
          });
          return;
        } else if (reconstructedFiles.length > 1) {
          console.log('✅ Opening multi-file viewer with', reconstructedFiles.length, 'files');
          setViewingFiles(reconstructedFiles);
          setViewingFile(null);
        } else if (reconstructedFiles.length === 1) {
          console.log('✅ Opening single file:', reconstructedFiles[0].name);
          setViewingFile(reconstructedFiles[0]);
          setViewingFiles([]);
        }
      } catch (error) {
        console.error('❌ Error reconstructing files:', error);
        toast({
          title: "Error",
          description: `Failed to load files: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        });
        return;
      }
    } else {
      // Fallback to creating a demo HTML file
      const file = createDocumentFile(doc);
      setViewingFile(file);
      setViewingFiles([]);
    }
    
    setViewingDocument(doc);
    setShowDocumentViewer(true);
  };

  // Handle Approve & Sign with file routing
  const handleApproveSign = (doc: any) => {
    // Create or retrieve file for the document
    const file = createDocumentFile(doc);
    
    // Set document metadata for Documenso
    setDocumensoDocument({
      id: doc.id,
      title: doc.title,
      content: doc.description,
      type: doc.type,
      file: file  // Store file reference
    });
    
    // Store the file for Documenso to use
    setViewingFile(file);
    setShowDocumenso(true);
  };

  if (!user) {
    return null; // This should be handled by ProtectedRoute, but adding as safety
  }

  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  
  // Load pending approvals on component mount
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('pending-approvals') || '[]');
    setPendingApprovals(stored);
  }, []);
  
  const handleAcceptDocument = (docId: string) => {
    // Find the document in pending approvals
    const doc = pendingApprovals.find(d => d.id === docId) || 
                staticPendingDocs.find(d => d.id === docId);
    
    if (doc) {
      const currentUserName = user?.name || 'Approver';
      const currentDate = new Date().toISOString().split('T')[0];
      
      console.log(`✅ [Accept] Processing approval for: ${doc.title}`);
      console.log(`   User: ${currentUserName}`);
      console.log(`   Source: ${doc.source}, Routing: ${doc.routingType}`);
      console.log(`   Is Parallel: ${doc.isParallel}`);
      
      // Update document in Track Documents with signature
      const submittedDocs = JSON.parse(localStorage.getItem('submitted-documents') || '[]');
      const updatedDocs = submittedDocs.map((trackDoc: any) => {
        // Match by ID or trackingCardId
        const isMatch = trackDoc.id === docId || trackDoc.id === doc.trackingCardId;
        
        if (isMatch) {
          const currentSignedBy = trackDoc.signedBy || [];
          const newSignedBy = [...currentSignedBy, currentUserName];
          
          // Check workflow mode
          const isParallel = trackDoc.workflow?.isParallel || doc.isParallel;
          const routingType = trackDoc.routingType || doc.routingType;
          const isApprovalChainBypass = trackDoc.source === 'approval-chain-bypass' || doc.source === 'approval-chain-bypass';
          
          // 🆕 APPROVAL CHAIN WITH BYPASS ROUTING HANDLING
          if (isApprovalChainBypass && routingType) {
            console.log(`  🔀 Approval Chain Bypass - ${routingType.toUpperCase()} MODE`);
            
            // Find current user's step
            const currentStepIndex = trackDoc.workflow.steps.findIndex((step: any) => {
              const assigneeLower = step.assignee.toLowerCase();
              const userNameLower = currentUserName.toLowerCase();
              return assigneeLower.includes(userNameLower) || assigneeLower.includes(user?.role?.toLowerCase() || '');
            });
            
            if (currentStepIndex !== -1) {
              const updatedSteps = [...trackDoc.workflow.steps];
              updatedSteps[currentStepIndex] = {
                ...updatedSteps[currentStepIndex],
                status: 'completed',
                completedDate: currentDate
              };
              
              if (routingType === 'sequential' || routingType === 'reverse') {
                // Sequential/Reverse: Move to next recipient
                console.log(`  🔄 ${routingType.toUpperCase()}: Moving to next recipient`);
                if (currentStepIndex + 1 < updatedSteps.length) {
                  updatedSteps[currentStepIndex + 1] = {
                    ...updatedSteps[currentStepIndex + 1],
                    status: 'current'
                  };
                }
                
                const recipientSteps = updatedSteps.filter((s: any) => s.name !== 'Submission');
                const completedCount = recipientSteps.filter((s: any) => s.status === 'completed' || s.status === 'bypassed').length;
                const allCompleted = completedCount === recipientSteps.length;
                const newProgress = Math.round((completedCount / recipientSteps.length) * 100);
                
                return {
                  ...trackDoc,
                  signedBy: newSignedBy,
                  status: allCompleted ? 'approved' : 'pending',
                  workflow: {
                    ...trackDoc.workflow,
                    currentStep: allCompleted ? 'Complete' : updatedSteps[currentStepIndex + 1]?.name || 'Complete',
                    progress: newProgress,
                    steps: updatedSteps
                  }
                };
              } else if (routingType === 'parallel' || routingType === 'bidirectional') {
                // Parallel/Bi-Directional: All continue
                console.log(`  ⚡ ${routingType.toUpperCase()}: Tracking signature`);
                
                const recipientSteps = updatedSteps.filter((s: any) => s.name !== 'Submission');
                const completedCount = recipientSteps.filter((s: any) => s.status === 'completed' || s.status === 'bypassed').length;
                const allCompleted = completedCount === recipientSteps.length;
                const newProgress = Math.round((completedCount / recipientSteps.length) * 100);
                
                return {
                  ...trackDoc,
                  signedBy: newSignedBy,
                  status: allCompleted ? 'approved' : 'pending',
                  workflow: {
                    ...trackDoc.workflow,
                    currentStep: allCompleted ? 'Complete' : `Signed by ${completedCount} of ${recipientSteps.length} recipients`,
                    progress: newProgress,
                    steps: updatedSteps
                  }
                };
              }
            }
          }
          
          if (isParallel) {
            // ⚡ PARALLEL MODE: Track individual signatures, don't advance steps
            console.log('  ⚡ PARALLEL MODE: Recording signature without advancing workflow');
            
            // Find and mark user's step as completed (but others stay 'current')
            const updatedSteps = trackDoc.workflow.steps.map((step: any) => {
              const assigneeLower = step.assignee.toLowerCase();
              const userNameLower = currentUserName.toLowerCase();
              
              if (assigneeLower.includes(userNameLower) || assigneeLower.includes(user?.role?.toLowerCase() || '')) {
                // Mark this user's step as completed
                return { ...step, status: 'completed', completedDate: currentDate };
              }
              return step;
            });
            
            // Calculate progress based on completed signatures
            const recipientSteps = updatedSteps.filter((s: any) => s.name !== 'Submission');
            const completedCount = recipientSteps.filter((s: any) => s.status === 'completed').length;
            const totalRecipients = recipientSteps.length;
            const newProgress = Math.round((completedCount / totalRecipients) * 100);
            const allCompleted = completedCount === totalRecipients;
            
            console.log(`  📊 Progress: ${completedCount} of ${totalRecipients} signed (${newProgress}%)`);
            
            return {
              ...trackDoc,
              signedBy: newSignedBy,
              status: allCompleted ? 'approved' : 'pending',
              workflow: {
                ...trackDoc.workflow,
                currentStep: allCompleted ? 'Complete' : `Signed by ${completedCount} of ${totalRecipients} recipients`,
                progress: newProgress,
                steps: updatedSteps
              }
            };
          } else {
            // 📋 SEQUENTIAL MODE: Advance to next step
            console.log('  📋 SEQUENTIAL MODE: Advancing workflow to next step');
            
            const currentStepIndex = trackDoc.workflow.steps.findIndex((step: any) => step.status === 'current');
            const updatedSteps = trackDoc.workflow.steps.map((step: any, index: number) => {
              if (index === currentStepIndex) {
                return { ...step, status: 'completed', completedDate: currentDate };
              } else if (index === currentStepIndex + 1) {
                return { ...step, status: 'current' };
              }
              return step;
            });
            
            const isLastStep = currentStepIndex === trackDoc.workflow.steps.length - 1;
            const newProgress = isLastStep ? 100 : Math.round(((currentStepIndex + 1) / trackDoc.workflow.steps.length) * 100);
            const newCurrentStep = isLastStep ? 'Complete' : updatedSteps[currentStepIndex + 1]?.name;
            const newStatus = isLastStep ? 'approved' : 'pending';
            
            console.log(`  📊 Progress: Step ${currentStepIndex + 1} of ${trackDoc.workflow.steps.length} (${newProgress}%)`);
            
            return {
              ...trackDoc,
              signedBy: newSignedBy,
              status: newStatus,
              workflow: {
                ...trackDoc.workflow,
                currentStep: newCurrentStep,
                progress: newProgress,
                steps: updatedSteps
              }
            };
          }
        }
        return trackDoc;
      });
      
      localStorage.setItem('submitted-documents', JSON.stringify(updatedDocs));
      
      // Handle post-approval notifications
      const updatedDoc = updatedDocs.find((d: any) => d.id === docId || d.id === doc.trackingCardId);
      const isParallel = updatedDoc?.workflow?.isParallel || doc.isParallel;
      
      if (updatedDoc && updatedDoc.status !== 'approved') {
        if (!isParallel) {
          // SEQUENTIAL: Notify next recipient
          const currentStepIndex = updatedDoc.workflow.steps.findIndex((s: any) => s.status === 'current');
          if (currentStepIndex !== -1) {
            const nextStep = updatedDoc.workflow.steps[currentStepIndex];
            const nextRecipientName = nextStep.assignee;
            const nextRecipientId = doc.recipientIds?.[currentStepIndex - 1];
            
            if (nextRecipientId && nextRecipientName) {
              console.log(`📬 Notifying next recipient: ${nextRecipientName}`);
              
              ExternalNotificationDispatcher.notifyRecipient(
                nextRecipientId,
                nextRecipientName,
                {
                  type: 'update',
                  documentTitle: doc.title,
                  submitter: currentUserName,
                  priority: doc.priority,
                  approvalCenterLink: `${window.location.origin}/approvals`,
                  recipientName: nextRecipientName
                }
              ).then((result) => {
                if (result.success) {
                  console.log(`✅ Next recipient notified via: ${result.channels.join(', ')}`);
                }
              }).catch((error) => {
                console.error('❌ Error notifying next recipient:', error);
              });
            }
          }
        } else {
          // PARALLEL: Notify remaining recipients (optional - they already have the card)
          console.log('  ⚡ Parallel mode: Other recipients already have access, no sequential notification needed');
        }
      }
      
      // Trigger real-time update for Track Documents
      window.dispatchEvent(new CustomEvent('workflow-updated'));
      
      // 🆕 Dispatch document-signed event with signature details for real-time badge updates
      const currentSignedCount = updatedDoc?.signedBy?.length || 0;
      const totalRecipients = updatedDoc?.workflow?.steps?.filter((step: any) => 
        step.name !== 'Submission' && step.assignee !== updatedDoc.submittedBy
      ).length || 1;
      
      window.dispatchEvent(new CustomEvent('document-signed', {
        detail: {
          documentId: doc.trackingCardId || docId,
          signerName: currentUserName,
          totalSigned: currentSignedCount,
          totalRecipients: totalRecipients
        }
      }));
      
      const approvedDoc = {
        ...doc,
        status: 'approved',
        approvedBy: currentUserName,
        approvedDate: currentDate,
        comment: comments[docId]?.join(' ') || 'Document approved successfully.'
      };
      
      // Add to approval history state
      setApprovalHistory(prev => {
        const updated = [approvedDoc, ...prev];
        // Save to localStorage for persistence
        try {
          localStorage.setItem('approval-history-new', JSON.stringify(updated));
          console.log('✅ [Approval History] Saved approved document to localStorage');
        } catch (error) {
          console.error('❌ [Approval History] Error saving to localStorage:', error);
        }
        return updated;
      });
      
      // Handle card removal based on routing type
      const isApprovalChainBypass = doc.source === 'approval-chain-bypass';
      const routingType = doc.routingType;
      
      const pendingApprovalsData = JSON.parse(localStorage.getItem('pending-approvals') || '[]');
      
      // 🆕 Check if workflow is complete for this card
      const workflowDoc = updatedDocs.find((d: any) => d.id === docId || d.id === doc.trackingCardId);
      const isWorkflowComplete = workflowDoc?.status === 'approved';
      
      // 🆕 For Approval Chain Bypass routing types, keep card for next recipients unless workflow is complete
      if (isApprovalChainBypass && (routingType === 'sequential' || routingType === 'reverse') && !isWorkflowComplete) {
        console.log(`  🔄 Approval Chain Bypass ${routingType.toUpperCase()}: Card continues for next recipient`);
        // Keep card in localStorage for next recipients
        localStorage.setItem('pending-approvals', JSON.stringify(pendingApprovalsData));
        
        // Broadcast update event for next recipient to see the card
        window.dispatchEvent(new CustomEvent('approval-card-updated', {
          detail: { 
            docId,
            action: 'approved',
            routingType: routingType
          }
        }));
        
        // Remove from local state only for current user
        setPendingApprovals(prev => prev.filter(d => d.id !== docId));
      } else if (isApprovalChainBypass && (routingType === 'parallel' || routingType === 'bidirectional') && !isWorkflowComplete) {
        console.log(`  ⚡ Approval Chain Bypass ${routingType.toUpperCase()}: Card stays for all recipients`);
        // Keep card in localStorage for all recipients
        localStorage.setItem('pending-approvals', JSON.stringify(pendingApprovalsData));
        
        // Broadcast update event
        window.dispatchEvent(new CustomEvent('approval-card-updated', {
          detail: { 
            docId,
            action: 'approved',
            routingType: routingType
          }
        }));
        
        // Remove from local state only for current user
        setPendingApprovals(prev => prev.filter(d => d.id !== docId));
      } else {
        // Workflow complete or non-bypass cards: Remove for everyone
        console.log('  🗑️ Removing card for ALL recipients (workflow complete or non-bypass)');
        const updatedPendingApprovals = pendingApprovalsData.filter((approval: any) => 
          approval.id !== docId && approval.trackingCardId !== docId
        );
        localStorage.setItem('pending-approvals', JSON.stringify(updatedPendingApprovals));
        setPendingApprovals(prev => prev.filter(d => d.id !== docId));
      }
      
      // Dispatch event to update Dashboard widget to remove approved card
      window.dispatchEvent(new CustomEvent('approval-card-status-changed', {
        detail: { 
          docId,
          action: 'approved',
          approvedBy: currentUserName,
          approvedDate: currentDate
        }
      }));
      
      toast({
        title: "Document Signed & Approved",
        description: `${doc.title} has been signed and forwarded to the next recipient.`,
      });
    }
  };
  
  const handleRejectDocument = (docId: string) => {
    const userComments = comments[docId];
    if (!userComments || userComments.length === 0) {
      toast({
        title: "Comments Required",
        description: "Please provide comments before rejecting the document.",
        variant: "destructive"
      });
      return;
    }
    
    // Find the document in pending approvals
    const doc = pendingApprovals.find(d => d.id === docId) || 
                staticPendingDocs.find(d => d.id === docId);
    
    if (doc) {
      const currentUserName = user?.name || 'Approver';
      const currentDate = new Date().toISOString().split('T')[0];
      
      console.log(`❌ [Reject] Processing rejection for: ${doc.title}`);
      console.log(`   User: ${currentUserName}`);
      console.log(`   Source: ${doc.source}, Routing: ${doc.routingType}`);
      console.log(`   Is Parallel: ${doc.isParallel}, Has Bypass: ${doc.hasBypass}`);
      
      // Update document in Track Documents with rejection status
      const submittedDocs = JSON.parse(localStorage.getItem('submitted-documents') || '[]');
      const updatedDocs = submittedDocs.map((trackDoc: any) => {
        // Match by ID or trackingCardId
        const isMatch = trackDoc.id === docId || trackDoc.id === doc.trackingCardId;
        
        if (isMatch) {
          const isParallel = trackDoc.workflow?.isParallel || doc.isParallel;
          const hasBypass = trackDoc.workflow?.hasBypass || doc.hasBypass;
          const routingType = trackDoc.routingType || doc.routingType;
          const isApprovalChainBypass = trackDoc.source === 'approval-chain-bypass' || doc.source === 'approval-chain-bypass';
          
          // Track rejected users
          const currentRejectedBy = trackDoc.rejectedBy || [];
          const newRejectedBy = [...currentRejectedBy, currentUserName];
          
          // 🆕 Initialize bypassed recipients array if doesn't exist
          const bypassedRecipients = trackDoc.workflow?.bypassedRecipients || [];
          
          // 🆕 APPROVAL CHAIN WITH BYPASS ROUTING HANDLING
          if (isApprovalChainBypass && routingType) {
            console.log(`  🔀 Approval Chain Bypass - ${routingType.toUpperCase()} MODE`);
            
            // Find current user's step
            const currentStepIndex = trackDoc.workflow.steps.findIndex((step: any) => {
              const assigneeLower = step.assignee.toLowerCase();
              const userNameLower = currentUserName.toLowerCase();
              return assigneeLower.includes(userNameLower) || assigneeLower.includes(user?.role?.toLowerCase() || '');
            });
            
            if (currentStepIndex !== -1) {
              const updatedSteps = [...trackDoc.workflow.steps];
              
              // Mark current user's step as rejected with BYPASS
              updatedSteps[currentStepIndex] = {
                ...updatedSteps[currentStepIndex],
                status: 'bypassed', // 🆕 Use 'bypassed' instead of 'rejected'
                rejectedBy: currentUserName,
                rejectedDate: currentDate,
                bypassReason: userComments.join(' ')
              };
              
              // Add to bypassed recipients
              bypassedRecipients.push(currentUserName);
              
              if (routingType === 'sequential') {
                // Sequential: Move to next recipient
                console.log('  🔄 SEQUENTIAL: Moving to next recipient');
                if (currentStepIndex + 1 < updatedSteps.length) {
                  updatedSteps[currentStepIndex + 1] = {
                    ...updatedSteps[currentStepIndex + 1],
                    status: 'current'
                  };
                }
                
                const recipientSteps = updatedSteps.filter((s: any) => s.name !== 'Submission');
                const actionedCount = recipientSteps.filter((s: any) => 
                  s.status === 'completed' || s.status === 'bypassed'
                ).length;
                const allActioned = actionedCount === recipientSteps.length;
                
                return {
                  ...trackDoc,
                  rejectedBy: newRejectedBy,
                  status: allActioned ? 'partially-approved' : 'pending',
                  workflow: {
                    ...trackDoc.workflow,
                    currentStep: allActioned ? 'Complete (with bypasses)' : updatedSteps[currentStepIndex + 1]?.name || 'Complete',
                    progress: Math.round((actionedCount / recipientSteps.length) * 100),
                    steps: updatedSteps,
                    bypassedRecipients: bypassedRecipients
                  }
                };
              } else if (routingType === 'parallel' || routingType === 'bidirectional') {
                // Parallel/Bi-Directional: All continue
                console.log(`  ⚡ ${routingType.toUpperCase()}: Others continue`);
                
                const recipientSteps = updatedSteps.filter((s: any) => s.name !== 'Submission');
                const actionedCount = recipientSteps.filter((s: any) => 
                  s.status === 'completed' || s.status === 'bypassed'
                ).length;
                const allActioned = actionedCount === recipientSteps.length;
                
                return {
                  ...trackDoc,
                  rejectedBy: newRejectedBy,
                  status: allActioned ? 'partially-approved' : 'pending',
                  workflow: {
                    ...trackDoc.workflow,
                    currentStep: allActioned ? 'Complete (with bypasses)' : `${actionedCount} of ${recipientSteps.length} completed`,
                    progress: Math.round((actionedCount / recipientSteps.length) * 100),
                    steps: updatedSteps,
                    bypassedRecipients: bypassedRecipients
                  }
                };
              } else if (routingType === 'reverse') {
                // Reverse: Move to next (downward in hierarchy)
                console.log('  🔙 REVERSE: Moving to next level down');
                if (currentStepIndex + 1 < updatedSteps.length) {
                  updatedSteps[currentStepIndex + 1] = {
                    ...updatedSteps[currentStepIndex + 1],
                    status: 'current'
                  };
                }
                
                const recipientSteps = updatedSteps.filter((s: any) => s.name !== 'Submission');
                const actionedCount = recipientSteps.filter((s: any) => 
                  s.status === 'completed' || s.status === 'bypassed'
                ).length;
                const allActioned = actionedCount === recipientSteps.length;
                
                return {
                  ...trackDoc,
                  rejectedBy: newRejectedBy,
                  status: allActioned ? 'partially-approved' : 'pending',
                  workflow: {
                    ...trackDoc.workflow,
                    currentStep: allActioned ? 'Complete (with bypasses)' : updatedSteps[currentStepIndex + 1]?.name || 'Complete',
                    progress: Math.round((actionedCount / recipientSteps.length) * 100),
                    steps: updatedSteps,
                    bypassedRecipients: bypassedRecipients
                  }
                };
              }
            }
          }
          
          if (isParallel && hasBypass) {
            // ⚡ PARALLEL WITH BYPASS: Mark user's step as rejected, others continue
            console.log('  🔄 PARALLEL + BYPASS MODE: Rejection bypassed, workflow continues');
            
            const updatedSteps = trackDoc.workflow.steps.map((step: any) => {
              const assigneeLower = step.assignee.toLowerCase();
              const userNameLower = currentUserName.toLowerCase();
              
              if (assigneeLower.includes(userNameLower) || assigneeLower.includes(user?.role?.toLowerCase() || '')) {
                // Mark this user's step as rejected
                return { 
                  ...step, 
                  status: 'rejected',
                  rejectedBy: currentUserName,
                  rejectedDate: currentDate
                };
              }
              return step;
            });
            
            // Calculate progress: (completed + rejected) / total
            const recipientSteps = updatedSteps.filter((s: any) => s.name !== 'Submission');
            const actionedCount = recipientSteps.filter((s: any) => 
              s.status === 'completed' || s.status === 'rejected'
            ).length;
            const totalRecipients = recipientSteps.length;
            const newProgress = Math.round((actionedCount / totalRecipients) * 100);
            const allActioned = actionedCount === totalRecipients;
            
            console.log(`  📊 Progress: ${actionedCount} of ${totalRecipients} actioned (${newProgress}%)`);
            
            return {
              ...trackDoc,
              rejectedBy: newRejectedBy,
              status: allActioned ? 'partially-approved' : 'pending', // Special status for bypass
              workflow: {
                ...trackDoc.workflow,
                currentStep: allActioned ? 'Complete (with rejections)' : `${actionedCount} of ${totalRecipients} completed`,
                progress: newProgress,
                steps: updatedSteps
              }
            };
          } else if (isParallel && !hasBypass) {
            // ⚡ PARALLEL WITHOUT BYPASS: Stop entire workflow, cancel all
            console.log('  🛑 PARALLEL MODE: Rejection stops all recipients');
            
            const currentStepIndex = trackDoc.workflow.steps.findIndex((step: any) => {
              const assigneeLower = step.assignee.toLowerCase();
              const userNameLower = currentUserName.toLowerCase();
              return assigneeLower.includes(userNameLower) || assigneeLower.includes(user?.role?.toLowerCase() || '');
            });
            
            const updatedSteps = trackDoc.workflow.steps.map((step: any, index: number) => {
              if (index === currentStepIndex) {
                return { 
                  ...step, 
                  status: 'rejected',
                  rejectedBy: currentUserName,
                  rejectedDate: currentDate
                };
              } else if (step.status === 'current' || step.status === 'pending') {
                return { ...step, status: 'cancelled' };
              }
              return step;
            });
            
            return {
              ...trackDoc,
              status: 'rejected',
              rejectedBy: newRejectedBy,
              rejectedDate: currentDate,
              workflow: {
                ...trackDoc.workflow,
                currentStep: 'Rejected',
                progress: trackDoc.workflow.progress,
                steps: updatedSteps
              }
            };
          } else {
            // 📋 SEQUENTIAL MODE: Mark rejected, cancel pending
            console.log('  📋 SEQUENTIAL MODE: Rejection stops workflow');
            
            const currentStepIndex = trackDoc.workflow.steps.findIndex(
              (step: any) => step.status === 'current'
            );
            
            const updatedSteps = trackDoc.workflow.steps.map((step: any, index: number) => {
              if (index === currentStepIndex) {
                return { 
                  ...step, 
                  status: 'rejected',
                  rejectedBy: currentUserName,
                  rejectedDate: currentDate
                };
              } else if (step.status === 'pending') {
                return { ...step, status: 'cancelled' };
              }
              return step;
            });
            
            return {
              ...trackDoc,
              status: 'rejected',
              rejectedBy: newRejectedBy,
              rejectedDate: currentDate,
              workflow: {
                ...trackDoc.workflow,
                currentStep: 'Rejected',
                progress: trackDoc.workflow.progress,
                steps: updatedSteps
              }
            };
          }
        }
        return trackDoc;
      });
      
      localStorage.setItem('submitted-documents', JSON.stringify(updatedDocs));
      
      // Handle card removal based on mode
      const isParallel = doc.isParallel;
      const hasBypass = doc.hasBypass;
      const routingType = doc.routingType;
      const isApprovalChainBypass = doc.source === 'approval-chain-bypass';
      
      const pendingApprovalsData = JSON.parse(localStorage.getItem('pending-approvals') || '[]');
      let updatedPendingApprovals;
      
      // 🆕 ALL Approval Chain with Bypass routing types continue workflow
      if (isApprovalChainBypass && (routingType === 'sequential' || routingType === 'parallel' || routingType === 'reverse' || routingType === 'bidirectional')) {
        console.log(`  🔄 Approval Chain Bypass ${routingType.toUpperCase()}: Card continues for others`);
        updatedPendingApprovals = pendingApprovalsData; // Keep all cards in storage
        localStorage.setItem('pending-approvals', JSON.stringify(updatedPendingApprovals)); // 🆕 Save to localStorage
        
        // Broadcast update event for other users to refresh
        window.dispatchEvent(new CustomEvent('approval-card-updated', {
          detail: { 
            docId,
            action: 'bypassed',
            routingType: routingType
          }
        }));
        
        // Remove from local state only for current user
        setPendingApprovals(prev => prev.filter(d => d.id !== docId));
      } else if (isParallel && hasBypass) {
        // BYPASS MODE (Emergency Management): Remove only for current user (card stays for others)
        console.log('  🔄 Bypass mode: Removing card only for current user');
        updatedPendingApprovals = pendingApprovalsData; // Keep all cards in storage
        // Remove from local state only
        setPendingApprovals(prev => prev.filter(d => d.id !== docId));
      } else {
        // NO BYPASS: Remove for ALL users
        console.log('  🗑️ Removing card for ALL recipients');
        updatedPendingApprovals = pendingApprovalsData.filter((approval: any) => 
          approval.id !== docId && approval.trackingCardId !== docId
        );
        localStorage.setItem('pending-approvals', JSON.stringify(updatedPendingApprovals));
        setPendingApprovals(prev => prev.filter(d => d.id !== docId));
        
        // Broadcast rejection event
        window.dispatchEvent(new CustomEvent('document-rejected', {
          detail: { 
            docId, 
            rejectedBy: currentUserName,
            rejectedDate: currentDate
          }
        }));
        
        // Force storage event
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'pending-approvals',
          newValue: JSON.stringify(updatedPendingApprovals)
        }));
      }
      
      // Trigger real-time update for Track Documents
      window.dispatchEvent(new CustomEvent('workflow-updated'));
      
      const rejectedDoc = {
        ...doc,
        status: 'rejected',
        rejectedBy: currentUserName,
        rejectedDate: currentDate,
        reason: 'Insufficient documentation',
        comment: userComments.join(' ')
      };
      
      // Add to approval history state
      setApprovalHistory(prev => {
        const updated = [rejectedDoc, ...prev];
        // Save to localStorage for persistence
        try {
          localStorage.setItem('approval-history-new', JSON.stringify(updated));
          console.log('✅ [Approval History] Saved rejected document to localStorage');
        } catch (error) {
          console.error('❌ [Approval History] Error saving to localStorage:', error);
        }
        return updated;
      });
      
      // Dispatch event to update Dashboard widget to remove rejected card
      window.dispatchEvent(new CustomEvent('approval-card-status-changed', {
        detail: { 
          docId,
          action: 'rejected',
          rejectedBy: currentUserName,
          rejectedDate: currentDate
        }
      }));
      
      const rejectionMessage = (isApprovalChainBypass && routingType)
        ? `Rejection bypassed. Workflow continues in ${routingType} mode. Next recipient will receive the card.`
        : (isParallel && hasBypass)
        ? "Your rejection has been recorded. Other recipients can still approve."
        : "Document rejected. Workflow stopped for all recipients.";
      
      toast({
        title: "Document Rejected",
        description: rejectionMessage,
        variant: "destructive"
      });
    }
  };
  
  const staticPendingDocs = [
    {
      id: 'faculty-meeting',
      title: 'Faculty Meeting Minutes – Q4 2024',
      type: 'Circular',
      submitter: 'Dr. Sarah Johnson',
      submittedDate: '2024-01-15',
      priority: 'high',
      description: 'Add a risk-mitigation section to highlight potential delays or issues.'
    },
    {
      id: 'budget-request',
      title: 'Budget Request – Lab Equipment',
      type: 'Letter',
      submitter: 'Prof. David Brown',
      submittedDate: '2024-01-13',
      priority: 'medium',
      description: 'Consider revising the scope to focus on priority items within this quarter\'s budget.'
    },
    {
      id: 'student-event',
      title: 'Student Event Proposal – Tech Fest 2024',
      type: 'Circular',
      submitter: 'Dr. Emily Davis',
      submittedDate: '2024-01-14',
      priority: 'medium',
      description: 'Annual technology festival proposal including budget allocation, venue requirements, and guest speaker arrangements.'
    },
    {
      id: 'research-methodology',
      title: 'Research Methodology Guidelines – Academic Review',
      type: 'Report',
      submitter: 'Prof. Jessica Chen',
      submittedDate: '2024-01-20',
      priority: 'normal',
      description: 'Comprehensive guidelines for research methodology standards and academic review processes.'
    }
  ];
  
  // Test function to verify recipient matching
  const testRecipientMatching = () => {
    const testCases = [
      {
        user: { name: 'Dr. Robert Principal', role: 'principal' },
        recipientIds: ['principal-dr.-robert-principal', 'registrar-prof.-sarah-registrar'],
        expected: true
      },
      {
        user: { name: 'Prof. Sarah Registrar', role: 'registrar' },
        recipientIds: ['principal-dr.-robert-principal', 'registrar-prof.-sarah-registrar'],
        expected: true
      },
      {
        user: { name: 'Dr. CSE HOD', role: 'hod' },
        recipientIds: ['hod-dr.-cse-hod-cse', 'principal-dr.-robert-principal'],
        expected: true
      },
      {
        user: { name: 'Random User', role: 'student' },
        recipientIds: ['principal-dr.-robert-principal', 'registrar-prof.-sarah-registrar'],
        expected: false
      }
    ];
    
    console.log('🧪 Testing recipient matching logic:');
    testCases.forEach((testCase, index) => {
      const mockDoc = { recipientIds: testCase.recipientIds };
      const mockUser = testCase.user;
      
      // Temporarily set user for testing
      const originalUser = user;
      (window as any).testUser = mockUser;
      
      const result = testCase.recipientIds.some((recipientId: string) => {
        const recipientLower = recipientId.toLowerCase();
        const userRoleLower = mockUser.role.toLowerCase();
        
        const roleMatches = [
          userRoleLower === 'principal' && recipientLower.includes('principal'),
          userRoleLower === 'registrar' && recipientLower.includes('registrar'),
          userRoleLower === 'hod' && recipientLower.includes('hod')
        ];
        
        return roleMatches.some(match => match);
      });
      
      console.log(`  Test ${index + 1}: ${result === testCase.expected ? '✅ PASS' : '❌ FAIL'} - User: ${mockUser.name} (${mockUser.role}) - Recipients: ${testCase.recipientIds.join(', ')} - Expected: ${testCase.expected}, Got: ${result}`);
    });
  };
  
  // Run test on component mount (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      testRecipientMatching();
    }
  }, []);

  // Helper function to check if current user is in recipients list
  const isUserInRecipients = (doc: any): boolean => {
    // If no recipients specified, show to everyone (for backward compatibility)
    if ((!doc.recipients || doc.recipients.length === 0) && (!doc.recipientIds || doc.recipientIds.length === 0)) {
      console.log('✅ No recipients filter - showing card:', doc.title);
      return true;
    }
    
    const currentUserName = user?.name || '';
    const currentUserRole = user?.role || '';
    
    console.log(`🔍 Checking card "${doc.title}" for user: ${currentUserName} (${currentUserRole})`);
    
    // Use recipientIds if available (from Document Management), otherwise use recipients
    const recipientsToCheck = doc.recipientIds || doc.recipients || [];
    console.log('📋 Recipients to check:', recipientsToCheck);
    
    const isMatch = recipientsToCheck.some((recipient: string) => {
      const recipientLower = recipient.toLowerCase();
      const userNameLower = currentUserName.toLowerCase();
      const userRoleLower = currentUserRole.toLowerCase();
      
      // If checking recipient IDs (from Document Management)
      if (doc.recipientIds) {
        // Match by role in recipient ID
        const roleMatches = [
          userRoleLower === 'principal' && recipientLower.includes('principal'),
          userRoleLower === 'registrar' && recipientLower.includes('registrar'),
          userRoleLower === 'dean' && recipientLower.includes('dean'),
          userRoleLower === 'hod' && recipientLower.includes('hod'),
          userRoleLower === 'program-head' && recipientLower.includes('program-department-head'),
          userRoleLower === 'controller' && recipientLower.includes('controller'),
          userRoleLower === 'cdc' && recipientLower.includes('cdc'),
          // Department matching for faculty/students
          user?.department && recipientLower.includes(user.department.toLowerCase()),
          user?.branch && recipientLower.includes(user.branch.toLowerCase())
        ];
        
        if (roleMatches.some(match => match)) {
          console.log(`✅ Role ID match: ${recipient} matches role ${currentUserRole}`);
          return true;
        }
      } else {
        // If checking display names (legacy cards)
        // Direct name match
        if (recipientLower.includes(userNameLower) && userNameLower.length > 2) {
          console.log(`✅ Name match: ${recipient} contains ${currentUserName}`);
          return true;
        }
        
        // Role-based matching with display names
        const roleMatches = [
          userRoleLower === 'principal' && (recipientLower.includes('principal') || recipientLower.includes('dr. robert')),
          userRoleLower === 'registrar' && (recipientLower.includes('registrar') || recipientLower.includes('prof. sarah')),
          userRoleLower === 'dean' && (recipientLower.includes('dean') || recipientLower.includes('dr. maria')),
          userRoleLower === 'hod' && (recipientLower.includes('hod') || recipientLower.includes('head of department')),
          userRoleLower === 'program-head' && (recipientLower.includes('program') && recipientLower.includes('head')),
          userRoleLower === 'controller' && recipientLower.includes('controller'),
          userRoleLower === 'cdc' && recipientLower.includes('cdc'),
          recipientLower.includes(userRoleLower)
        ];
        
        if (roleMatches.some(match => match)) {
          console.log(`✅ Role match: ${recipient} matches role ${currentUserRole}`);
          return true;
        }
      }
      
      return false;
    });
    
    console.log(`${isMatch ? '✅' : '❌'} Final result for "${doc.title}": ${isMatch ? 'SHOW' : 'HIDE'}`);
    return isMatch;
  };

  // Helper function to check if current user should see a shared comment
  const shouldSeeSharedComment = (sharedFor: string): boolean => {
    if (!user) return false;
    if (!sharedFor) return false;
    
    // If shared for 'all', everyone can see it
    if (sharedFor === 'all') return true;
    
    const currentUserRole = (user.role || '').toLowerCase();
    const currentUserName = (user.name || '').toLowerCase();
    const sharedForLower = sharedFor.toLowerCase();
    
    // Return false if user info is incomplete
    if (!currentUserRole && !currentUserName) return false;
    
    // Check if the sharedFor matches current user's role or name
    const matches = (currentUserRole && sharedForLower.includes(currentUserRole)) || 
                   (currentUserName && sharedForLower.includes(currentUserName)) ||
                   (currentUserName && currentUserName.includes(sharedForLower)) ||
                   (currentUserName && sharedForLower.replace(/\s+/g, '-').includes(currentUserName.replace(/\s+/g, '-')));
    
    console.log(`👁️ Shared comment visibility check: sharedFor="${sharedFor}", user="${user.name}", role="${user.role}", visible=${matches}`);
    return matches;
  };

  // Helper function to get the next recipient in the approval chain
  const getNextRecipient = (doc: any): string => {
    if (!user) return 'all';

    // Check if document has workflow structure
    if (doc.workflow && doc.workflow.steps) {
      const currentStepIndex = doc.workflow.steps.findIndex(
        (step: any) => step.status === 'current'
      );
      
      if (currentStepIndex !== -1 && currentStepIndex < doc.workflow.steps.length - 1) {
        const nextStep = doc.workflow.steps[currentStepIndex + 1];
        const nextRecipient = nextStep.name || nextStep.assignee || 'next-recipient';
        console.log(`📤 Next recipient from workflow: ${nextRecipient}`);
        return nextRecipient;
      }
    }
    
    // Fallback: Check recipientIds array if no workflow
    if (doc.recipientIds && Array.isArray(doc.recipientIds)) {
      const currentUserRole = (user.role || '').toLowerCase();
      const currentUserName = (user.name || '').toLowerCase().replace(/\s+/g, '-');
      
      // Find current user's position in recipients array
      const userIndex = doc.recipientIds.findIndex((recipientId: string) => {
        const recipientLower = recipientId.toLowerCase();
        return (currentUserRole && recipientLower.includes(currentUserRole)) || 
               (currentUserName && recipientLower.includes(currentUserName));
      });
      
      if (userIndex !== -1 && userIndex < doc.recipientIds.length - 1) {
        const nextRecipientId = doc.recipientIds[userIndex + 1];
        console.log(`📤 Next recipient from recipientIds: ${nextRecipientId}`);
        return nextRecipientId;
      }
    }
    
    // Default to 'all' if next recipient cannot be determined
    console.log(`⚠️ Cannot determine next recipient - sharing with all`);
    return 'all';
  };

  // Helper function to check if current user is the last recipient in approval chain
  const isLastRecipient = (doc: any): boolean => {
    if (!user) return false;

    // Check if document has workflow structure
    if (doc.workflow && doc.workflow.steps) {
      const currentStepIndex = doc.workflow.steps.findIndex(
        (step: any) => step.status === 'current'
      );
      const isLastStep = currentStepIndex === doc.workflow.steps.length - 1;
      console.log(`🔍 Workflow check for "${doc.title}": currentStep=${currentStepIndex}, lastStep=${doc.workflow.steps.length - 1}, isLast=${isLastStep}`);
      return isLastStep;
    }
    
    // Fallback: Check recipientIds array if no workflow
    if (doc.recipientIds && Array.isArray(doc.recipientIds)) {
      const currentUserRole = (user.role || '').toLowerCase();
      const currentUserName = (user.name || '').toLowerCase().replace(/\s+/g, '-');
      
      // Find current user's position in recipients array
      const userIndex = doc.recipientIds.findIndex((recipientId: string) => {
        const recipientLower = recipientId.toLowerCase();
        return recipientLower.includes(currentUserRole) || recipientLower.includes(currentUserName);
      });
      
      if (userIndex !== -1) {
        const isLast = userIndex === doc.recipientIds.length - 1;
        console.log(`🔍 RecipientIds check for "${doc.title}": userIndex=${userIndex}, totalRecipients=${doc.recipientIds.length}, isLast=${isLast}`);
        return isLast;
      }
    }
    
    // Default to false (show button) if structure is unclear
    console.log(`⚠️ Cannot determine last recipient for "${doc.title}" - showing share button`);
    return false;
  };

  useEffect(() => {
    const loadPendingApprovals = () => {
      const stored = JSON.parse(localStorage.getItem('pending-approvals') || '[]');
      console.log('📥 Loading pending approvals from localStorage:', stored.length, 'cards');
      setPendingApprovals(stored);
    };
    
    const loadApprovalHistory = () => {
      const stored = JSON.parse(localStorage.getItem('approval-history-new') || '[]');
      setApprovalHistory(stored);
    };
    
    // Save approval data to localStorage for search
    const saveApprovalData = () => {
      const pendingData = [
        { id: 'faculty-meeting', title: 'Faculty Meeting Minutes – Q4 2024', description: 'Add a risk-mitigation section to highlight potential delays or issues.' },
        { id: 'budget-request', title: 'Budget Request – Lab Equipment', description: 'Consider revising the scope to focus on priority items within this quarter\'s budget.' },
        { id: 'student-event', title: 'Student Event Proposal – Tech Fest 2024', description: 'Annual technology festival proposal including budget allocation, venue requirements, and guest speaker arrangements.' },
        { id: 'research-methodology', title: 'Research Methodology Guidelines – Academic Review', description: 'Comprehensive guidelines for research methodology standards and academic review processes.' }
      ];
      localStorage.setItem('pendingApprovals', JSON.stringify(pendingData));
      
      const historyData = recentApprovals.map(doc => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        status: doc.status
      }));
      localStorage.setItem('approvalHistory', JSON.stringify(historyData));
    };
    
    loadPendingApprovals();
    loadApprovalHistory();
    saveApprovalData();
    
    const handleStorageChange = () => {
      console.log('🔄 Storage changed, reloading approvals');
      loadPendingApprovals();
    };
    
    // Listen for document removal from Track Documents
    const handleDocumentRemoval = (event: any) => {
      const { docId } = event.detail;
      console.log('🗑️ Document removed:', docId);
      setPendingApprovals(prev => prev.filter(doc => doc.id !== docId));
    };

    // Listen for new approval cards from Emergency Management
    const handleApprovalCardCreated = (event: any) => {
      const { approval } = event.detail;
      console.log('📋 New approval card received in Approvals page:', approval);
      console.log('👤 Current user:', user?.name, '| Role:', user?.role);
      console.log('👥 Card recipients:', approval.recipients);
      
      // Check if card already exists
      setPendingApprovals(prev => {
        const isDuplicate = prev.some((existing: any) => existing.id === approval.id);
        
        if (!isDuplicate) {
          console.log('✅ Adding new approval card to state');
          return [approval, ...prev];
        } else {
          console.log('ℹ️ Approval card already exists, skipping duplicate');
          return prev;
        }
      });
    };
    
    // Listen for document rejections to remove from all recipients
    const handleDocumentRejected = (event: any) => {
      const { docId, rejectedBy } = event.detail;
      console.log('❌ Document rejected:', docId, 'by', rejectedBy);
      setPendingApprovals(prev => prev.filter(doc => doc.id !== docId));
      
      toast({
        title: "Document Rejected",
        description: `Document was rejected by ${rejectedBy}. Removed from your pending approvals.`,
        variant: "destructive"
      });
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('document-removed', handleDocumentRemoval);
    window.addEventListener('approval-card-created', handleApprovalCardCreated);
    window.addEventListener('document-rejected', handleDocumentRejected);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('document-removed', handleDocumentRemoval);
      window.removeEventListener('approval-card-created', handleApprovalCardCreated);
      window.removeEventListener('document-rejected', handleDocumentRejected);
    };
  }, []);
  
  // Listen for document signature events
  useEffect(() => {
    const handleDocumentSigned = (event: any) => {
      console.log('🖊️ [Approval Center] Document signed event received:', event.detail);
      
      // Reload pending approvals to show updated signed files
      const stored = JSON.parse(localStorage.getItem('pending-approvals') || '[]');
      setPendingApprovals(stored);
      
      if (event.detail?.documentId) {
        toast({
          title: "Document Signed",
          description: `Document has been digitally signed and updated`,
          duration: 3000,
        });
      }
    };
    
    window.addEventListener('document-signed', handleDocumentSigned);
    
    return () => {
      window.removeEventListener('document-signed', handleDocumentSigned);
    };
  }, [toast]);
  
  // Save approval history to localStorage whenever it changes (with quota management)
  useEffect(() => {
    try {
      // Keep only the last 50 approval history items to prevent quota issues
      const limitedHistory = approvalHistory.slice(0, 50);
      
      // Remove large file data from history to save space
      const compactHistory = limitedHistory.map(item => ({
        ...item,
        files: undefined, // Don't store full files in history
        description: item.description?.substring(0, 200) // Limit description length
      }));
      
      localStorage.setItem('approval-history-new', JSON.stringify(compactHistory));
      console.log('💾 Saved approval history:', compactHistory.length, 'items');
    } catch (quotaError) {
      console.error('⚠️ LocalStorage quota exceeded for approval history:', quotaError);
      // Clear old history and try again
      try {
        const recentHistory = approvalHistory.slice(0, 20).map(item => ({
          id: item.id,
          title: item.title,
          status: item.status,
          approvedBy: item.approvedBy,
          approvedDate: item.approvedDate
        }));
        localStorage.setItem('approval-history-new', JSON.stringify(recentHistory));
        toast({
          title: "Storage Optimized",
          description: "Cleared old approval history to free up space",
          duration: 3000,
        });
      } catch (e) {
        console.error('Failed to save even compact history:', e);
      }
    }
  }, [approvalHistory, toast]);
  
  // Handle Documenso completion
  const handleDocumensoComplete = (docId: string) => {
    handleAcceptDocument(docId);
    setShowDocumenso(false);
    setDocumensoDocument(null);
  };

  const recentApprovals = [
    {
      id: 10,
      title: "Academic Standards Review Report",
      type: "Letter",
      submitter: "Prof. Jessica Chen",
      submittedDate: "2024-01-18",
      status: "approved",
      priority: "normal",
      approvedBy: "Principal",
      approvedDate: "2024-01-19",
      description: "Comprehensive review of academic standards and quality assurance measures across all departments",
      comment: "Academic standards review approved. Implementation timeline is realistic and quality metrics are well-defined."
    },
    {
      id: 9,
      title: "Infrastructure Upgrade Request",
      type: "Proposal",
      submitter: "IT Department",
      submittedDate: "2024-01-16",
      status: "approved",
      priority: "high",
      approvedBy: "Principal",
      approvedDate: "2024-01-17",
      description: "Request for upgrading campus network infrastructure and server capacity to support increased digital learning initiatives",
      comment: "Critical infrastructure upgrade approved. The proposed timeline and phased implementation approach will minimize disruption to ongoing activities. Budget allocation confirmed from IT modernization fund."
    },
    {
      id: 6,
      title: "Research Grant Application",
      type: "Report",
      submitter: "Dr. Michael Anderson",
      submittedDate: "2024-01-10",
      status: "approved",
      priority: "high",
      approvedBy: "Principal",
      approvedDate: "2024-01-12",
      description: "Application for NSF research funding for AI in education project",
      comment: "Excellent proposal with clear objectives and realistic timeline. The budget allocation is well-justified and the expected outcomes align with institutional goals."
    },
    {
      id: 7,
      title: "Event Permission Request",
      type: "Letter",
      submitter: "Prof. Lisa Thompson",
      submittedDate: "2024-01-09",
      status: "rejected", 
      rejectedBy: "HOD - CSE",
      rejectedDate: "2024-01-11",
      priority: "medium",
      reason: "Insufficient documentation",
      description: "Permission request for annual tech symposium with external speakers",
      comment: "Please provide detailed speaker profiles, venue safety certificates, and revised budget breakdown before resubmission."
    },
    {
      id: 8,
      title: "Course Curriculum Update",
      type: "Circular",
      submitter: "Dr. Emily Chen",
      submittedDate: "2024-01-08",
      status: "approved",
      priority: "normal",
      approvedBy: "Academic Committee",
      approvedDate: "2024-01-10",
      description: "Proposal to update computer science curriculum with modern AI and machine learning modules",
      comment: "Well-structured curriculum update that addresses current industry needs. Implementation timeline is reasonable and faculty training plan is comprehensive."
    }
  ];

  return (
    <DashboardLayout userRole={user.role} onLogout={handleLogout}>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Approval Center</h1>
          <p className="text-muted-foreground">Review and approve pending documents with digital signatures</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-warning/10 rounded-lg">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingApprovals.filter(doc => isUserInRecipients(doc)).length + 4}</p>
                  <p className="text-sm text-muted-foreground">Pending Approvals</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">24</p>
                  <p className="text-sm text-muted-foreground">Approved This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <XCircle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">3</p>
                  <p className="text-sm text-muted-foreground">Rejected This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
            <TabsTrigger value="signature">Advanced Signature</TabsTrigger>
            <TabsTrigger value="history">Approval History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Documents Awaiting Your Approval</CardTitle>
                <CardDescription>Review and approve or reject pending documents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Dynamic Submitted Documents */}
                  {pendingApprovals.filter(doc => {
                    // First check: Is user in recipients?
                    const isInRecipients = isUserInRecipients(doc);
                    console.log(`📄 Card "${doc.title}" - Is in recipients: ${isInRecipients}`);
                    
                    if (!isInRecipients) {
                      console.log('  ❌ User not in recipients, hiding card');
                      return false;
                    }
                    
                    // 🆕 Check if this is an Approval Chain with Bypass card
                    if (doc.source === 'approval-chain-bypass' && doc.routingType) {
                      console.log(`  🔀 Approval Chain Bypass - Routing Type: ${doc.routingType.toUpperCase()}`);
                      
                      // Get tracking card for workflow state
                      const trackingCards = JSON.parse(localStorage.getItem('submitted-documents') || '[]');
                      const trackingCard = trackingCards.find((tc: any) => tc.id === doc.trackingCardId || tc.id === doc.id);
                      
                      if (trackingCard?.workflow?.steps) {
                        const currentUserRole = user?.role?.toLowerCase() || '';
                        const currentUserName = user?.name?.toLowerCase() || '';
                        
                        // Find user's step in workflow
                        const userStepIndex = trackingCard.workflow.steps.findIndex((step: any) => {
                          const assigneeLower = step.assignee.toLowerCase();
                          return (
                            assigneeLower.includes(currentUserRole) ||
                            assigneeLower.includes(currentUserName) ||
                            (user?.department && assigneeLower.includes(user.department.toLowerCase())) ||
                            (user?.branch && assigneeLower.includes(user.branch.toLowerCase()))
                          );
                        });
                        
                        if (userStepIndex !== -1) {
                          const userStep = trackingCard.workflow.steps[userStepIndex];
                          
                          if (doc.routingType === 'sequential') {
                            // Sequential: Only show if it's user's turn
                            const shouldShow = userStep.status === 'current';
                            console.log(`  🔄 SEQUENTIAL - User step status: ${userStep.status}, Show: ${shouldShow}`);
                            return shouldShow;
                          } else if (doc.routingType === 'parallel' || doc.routingType === 'bidirectional') {
                            // Parallel/Bi-Directional: Show to all recipients simultaneously
                            const shouldShow = userStep.status === 'current' || userStep.status === 'pending';
                            console.log(`  ⚡ ${doc.routingType.toUpperCase()} - Show to all recipients: ${shouldShow}`);
                            return shouldShow;
                          } else if (doc.routingType === 'reverse') {
                            // Reverse: Sequential from highest authority down
                            const shouldShow = userStep.status === 'current';
                            console.log(`  🔙 REVERSE - User step status: ${userStep.status}, Show: ${shouldShow}`);
                            return shouldShow;
                          }
                        }
                      }
                      
                      // Fallback: show if in recipients
                      console.log('  ✅ Fallback: showing to recipient');
                      return true;
                    }
                    
                    // Check if this is a parallel mode card (Emergency Management feature)
                    if (doc.isParallel) {
                      console.log('  ⚡ PARALLEL MODE - Showing card to all recipients simultaneously');
                      return true; // All recipients see card at once
                    }
                    
                    // Second check: For SEQUENTIAL workflow, is it user's turn?
                    // Only applicable for cards with tracking (Document Management / Emergency Management)
                    if (doc.trackingCardId) {
                      const trackingCards = JSON.parse(localStorage.getItem('submitted-documents') || '[]');
                      const trackingCard = trackingCards.find((tc: any) => tc.id === doc.trackingCardId);
                      
                      if (trackingCard?.workflow?.steps) {
                        // Check if tracking card is also in parallel mode
                        if (trackingCard.workflow.isParallel) {
                          console.log('  ⚡ Tracking card is PARALLEL - Showing to all recipients');
                          return true;
                        }
                        
                        // SEQUENTIAL MODE: Check if it's user's turn
                        const currentUserRole = user?.role?.toLowerCase() || '';
                        const currentUserName = user?.name?.toLowerCase() || '';
                        
                        // Find user's step in workflow
                        const userStepIndex = trackingCard.workflow.steps.findIndex((step: any) => {
                          const assigneeLower = step.assignee.toLowerCase();
                          return (
                            assigneeLower.includes(currentUserRole) ||
                            assigneeLower.includes(currentUserName) ||
                            (user?.department && assigneeLower.includes(user.department.toLowerCase())) ||
                            (user?.branch && assigneeLower.includes(user.branch.toLowerCase()))
                          );
                        });
                        
                        if (userStepIndex !== -1) {
                          const userStep = trackingCard.workflow.steps[userStepIndex];
                          const shouldShow = userStep.status === 'current';
                          
                          console.log(`  🔄 SEQUENTIAL workflow check:`, {
                            userRole: currentUserRole,
                            userStepIndex,
                            userStepStatus: userStep.status,
                            shouldShow
                          });
                          
                          return shouldShow;
                        } else {
                          console.log(`  ⚠️ User not found in workflow steps, showing card by default`);
                          return true;
                        }
                      }
                    }
                    
                    // For non-tracking cards or legacy cards, show if user is in recipients
                    console.log('  ✅ Non-sequential card or no tracking, showing card');
                    if (doc.recipientIds) {
                      console.log('  🆔 Using recipient IDs for filtering:', doc.recipientIds);
                    } else {
                      console.log('  🆔 Using display names for filtering:', doc.recipients);
                    }
                    return true;
                  }).map((doc) => (
                    <Card key={doc.id} className={`hover:shadow-md transition-shadow ${doc.isEmergency ? 'border-destructive bg-red-50 animate-pulse' : ''}`}>
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row gap-6">
                          <div className="flex-1 space-y-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg flex items-center gap-2 flex-wrap">
                                  {doc.title}
                                  {doc.isEmergency && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      EMERGENCY
                                    </Badge>
                                  )}
                                  {(() => {
                                    // Check if this document has escalation
                                    const trackingCards = JSON.parse(localStorage.getItem('submitted-documents') || '[]');
                                    const trackingCard = trackingCards.find((tc: any) => 
                                      tc.id === doc.id || tc.id === doc.trackingCardId
                                    );
                                    const escalationLevel = trackingCard?.workflow?.escalationLevel || 0;
                                    
                                    if (escalationLevel > 0) {
                                      return (
                                        <Badge variant="outline" className="text-xs bg-orange-50 border-orange-300 text-orange-700">
                                          <Zap className="w-3 h-3 mr-1" />
                                          Escalated {escalationLevel}x
                                        </Badge>
                                      );
                                    }
                                    return null;
                                  })()}
                                </h3>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <FileText className="h-4 w-4" />
                                    {doc.type}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <User className="h-4 w-4" />
                                    {doc.submitter}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {doc.submittedDate}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-yellow-600" />
                                <Badge variant="warning">Pending</Badge>
                                <Badge variant="outline" className={`${
                                  doc.priority === 'high' || doc.priority === 'critical' ? 'text-orange-600 font-semibold' :
                                  doc.priority === 'medium' || doc.priority === 'urgent' ? 'text-yellow-600' :
                                  'text-blue-600'
                                }`}>
                                  {doc.priority === 'high' || doc.priority === 'critical' ? 'High Priority' :
                                   doc.priority === 'medium' || doc.priority === 'urgent' ? 'Medium Priority' :
                                   'Normal Priority'}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                <span className="text-sm font-medium">Description</span>
                              </div>
                              <div className="bg-muted p-3 rounded text-sm">
                                <p>{doc.description}</p>
                              </div>
                            </div>

                            {/* Action Required Indicator */}
                            {(() => {
                              const trackingCards = JSON.parse(localStorage.getItem('submitted-documents') || '[]');
                              const trackingCard = trackingCards.find((tc: any) => 
                                tc.id === doc.id || tc.id === doc.trackingCardId
                              );
                              const escalationLevel = trackingCard?.workflow?.escalationLevel || 0;
                              
                              if (doc.isEmergency || escalationLevel > 0) {
                                return (
                                  <div className="flex items-center gap-2 p-2 bg-warning/10 rounded border border-warning/20">
                                    <Zap className="w-4 h-4 text-warning" />
                                    <span className="text-sm font-medium text-warning">
                                      Action Required
                                    </span>
                                    {escalationLevel > 0 && (
                                      <Badge variant="outline" className="text-xs bg-orange-100 border-orange-300 text-orange-700">
                                        Escalated {escalationLevel}x
                                      </Badge>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            
                            {/* Shared Comments from Previous Approvers */}
                            {sharedComments[doc.id]?.filter(s => shouldSeeSharedComment(s.sharedFor) && s.sharedBy !== user?.name).length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-1">
                                  <Share2 className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-700">Comment Shared by Previous Recipient</span>
                                </div>
                                <div className="space-y-2">
                                  {sharedComments[doc.id].filter(s => shouldSeeSharedComment(s.sharedFor) && s.sharedBy !== user?.name).map((shared, index) => (
                                    <div key={index} className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded text-sm">
                                      <p className="text-blue-800">{shared.comment}</p>
                                      <p className="text-xs text-blue-600 mt-1">— {shared.sharedBy}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Your Shared Comments (above input field) */}
                            {sharedComments[doc.id]?.filter(s => s.sharedBy === user?.name).length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-1">
                                  <Share2 className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-700">Share Comment with Next Recipient(s)</span>
                                </div>
                                <div className="space-y-2">
                                  {sharedComments[doc.id].filter(s => s.sharedBy === user?.name).map((shared, index) => (
                                    <div key={index} className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded text-sm flex justify-between items-start">
                                      <div className="flex-1">
                                        <p className="text-blue-800">{shared.comment}</p>
                                      </div>
                                      <div className="flex gap-1 ml-2">
                                        <button 
                                          className="px-4 py-2 bg-blue-200 rounded-full flex items-center justify-center hover:bg-blue-300 transition-colors"
                                          onClick={() => {
                                            const originalIndex = sharedComments[doc.id].findIndex(s => s.comment === shared.comment && s.timestamp === shared.timestamp);
                                            handleEditSharedComment(doc.id, originalIndex);
                                          }}
                                          title="Edit"
                                        >
                                          <SquarePen className="h-4 w-4 text-blue-700" />
                                        </button>
                                        <button 
                                          className="px-4 py-2 bg-blue-200 rounded-full flex items-center justify-center hover:bg-blue-300 transition-colors"
                                          onClick={() => {
                                            const originalIndex = sharedComments[doc.id].findIndex(s => s.comment === shared.comment && s.timestamp === shared.timestamp);
                                            handleUndoSharedComment(doc.id, originalIndex);
                                          }}
                                          title="Undo"
                                        >
                                          <Undo2 className="h-4 w-4 text-blue-700" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {comments[doc.id]?.filter(c => c.author === user?.name).length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="h-4 w-4" />
                                  <span className="text-sm font-medium">Your Comments</span>
                                </div>
                                <div className="space-y-2">
                                  {comments[doc.id].filter(c => c.author === user?.name).map((commentObj, index) => (
                                    <div key={index} className="bg-muted p-3 rounded-lg text-sm flex justify-between items-start">
                                      <div className="flex-1">
                                        <p>{commentObj.message}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{commentObj.date}</p>
                                      </div>
                                      <div className="flex gap-1 ml-2">
                                        <button 
                                          className="px-4 py-2 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                          onClick={() => {
                                            const originalIndex = comments[doc.id].findIndex(c => c.message === commentObj.message && c.date === commentObj.date);
                                            handleEditComment(doc.id, originalIndex);
                                          }}
                                          title="Edit"
                                        >
                                          <SquarePen className="h-4 w-4 text-gray-600" />
                                        </button>
                                        <button 
                                          className="px-4 py-2 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                          onClick={() => {
                                            const originalIndex = comments[doc.id].findIndex(c => c.message === commentObj.message && c.date === commentObj.date);
                                            handleUndoComment(doc.id, originalIndex);
                                          }}
                                          title="Undo"
                                        >
                                          <Undo2 className="h-4 w-4 text-gray-600" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {!comments[doc.id]?.length && (
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                <span className="text-sm font-medium">Your Comments</span>
                              </div>
                            )}
                            
                            <div className="space-y-2">
                              <div className="flex items-start border rounded-lg focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-colors bg-white">
                                <textarea
                                  className="flex-1 min-h-[40px] p-3 border-0 rounded-l-lg resize-none text-sm focus:outline-none bg-white"
                                  placeholder="Add your comment..."
                                  rows={1}
                                  style={{ resize: 'none' }}
                                  value={commentInputs[doc.id] || ''}
                                  onChange={(e) => {
                                  const newInputs = { ...commentInputs, [doc.id]: e.target.value };
                                  setCommentInputs(newInputs);
                                  localStorage.setItem('comment-inputs', JSON.stringify(newInputs));
                                }}
                                  onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = target.scrollHeight + 'px';
                                  }}
                                />
                                <div className="flex gap-1 m-2">
                                  <button 
                                    className="px-3 py-2 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                    title="Send comment"
                                    onClick={() => handleAddComment(doc.id)}
                                  >
                                    <ChevronRight className="h-4 w-4 text-gray-600" />
                                  </button>
                                  {!isLastRecipient(doc) && (
                                    <button 
                                      className="px-3 py-2 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors"
                                      title="Share comment with next recipient(s)"
                                      onClick={() => handleShareComment(doc.id, doc)}
                                    >
                                      <Share2 className="h-4 w-4 text-blue-600" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 min-w-[150px]">
                            <Button variant="outline" size="sm" onClick={() => handleViewDocument(doc)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-orange-500 text-orange-600 hover:bg-orange-50"
                              onClick={() => {
                                setSelectedDocument({ id: doc.id, type: doc.type.toLowerCase(), title: doc.title });
                                setShowLiveMeetingModal(true);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div className="relative w-4 h-4">
                                  <div className="absolute inset-0 w-4 h-4 bg-green-400 rounded-full"></div>
                                  <div className="absolute inset-1 w-2 h-2 bg-red-500 rounded-full"></div>
                                </div>
                                LiveMeet+
                              </div>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleApproveSign(doc)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Approve & Sign
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleRejectDocument(doc.id)}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Faculty Meeting Minutes Card */}
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg flex items-center gap-2">
                                Faculty Meeting Minutes – Q4 2024
                              </h3>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <FileText className="h-4 w-4" />
                                  Circular
                                </div>
                                <div className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  Dr. Sarah Johnson
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  2024-01-15
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-yellow-600" />
                              <Badge variant="warning">Pending</Badge>
                              <Badge variant="outline" className="text-orange-600 font-semibold">High Priority</Badge>
                            </div>
                          </div>
                          
                          {/* Description */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              <span className="text-sm font-medium">Description</span>
                            </div>
                            <div className="bg-muted p-3 rounded text-sm">
                              <p>Add a risk-mitigation section to highlight potential delays or issues.</p>
                            </div>
                          </div>
                          
                          {/* Shared Comments from Previous Approvers */}
                          {sharedComments['faculty-meeting']?.filter(s => shouldSeeSharedComment(s.sharedFor) && s.sharedBy !== user?.name).length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1">
                                <Share2 className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-700">Comment Shared by Previous Recipient</span>
                              </div>
                              <div className="space-y-2">
                                {sharedComments['faculty-meeting'].filter(s => shouldSeeSharedComment(s.sharedFor) && s.sharedBy !== user?.name).map((shared, index) => (
                                  <div key={index} className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded text-sm">
                                    <p className="text-blue-800">{shared.comment}</p>
                                    <p className="text-xs text-blue-600 mt-1">— {shared.sharedBy}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Your Shared Comments (above input field) */}
                          {sharedComments['faculty-meeting']?.filter(s => s.sharedBy === user?.name).length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1">
                                <Share2 className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-700">Share Comment with Next Recipient(s)</span>
                              </div>
                              <div className="space-y-2">
                                {sharedComments['faculty-meeting'].filter(s => s.sharedBy === user?.name).map((shared, index) => (
                                  <div key={index} className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded text-sm flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="text-blue-800">{shared.comment}</p>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                      <button 
                                        className="px-4 py-2 bg-blue-200 rounded-full flex items-center justify-center hover:bg-blue-300 transition-colors"
                                        onClick={() => {
                                          const originalIndex = sharedComments['faculty-meeting'].findIndex(s => s.comment === shared.comment && s.timestamp === shared.timestamp);
                                          handleEditSharedComment('faculty-meeting', originalIndex);
                                        }}
                                        title="Edit"
                                      >
                                        <SquarePen className="h-4 w-4 text-blue-700" />
                                      </button>
                                      <button 
                                        className="px-4 py-2 bg-blue-200 rounded-full flex items-center justify-center hover:bg-blue-300 transition-colors"
                                        onClick={() => {
                                          const originalIndex = sharedComments['faculty-meeting'].findIndex(s => s.comment === shared.comment && s.timestamp === shared.timestamp);
                                          handleUndoSharedComment('faculty-meeting', originalIndex);
                                        }}
                                        title="Undo"
                                      >
                                        <Undo2 className="h-4 w-4 text-blue-700" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Your Comments */}
                          {comments['faculty-meeting']?.filter(c => c.author === user?.name).length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                <span className="text-sm font-medium">Your Comments</span>
                              </div>
                              <div className="space-y-2">
                                {comments['faculty-meeting'].filter(c => c.author === user?.name).map((commentObj, index) => (
                                  <div key={index} className="bg-muted p-3 rounded-lg text-sm flex justify-between items-start">
                                    <div className="flex-1">
                                      <p>{commentObj.message}</p>
                                      <p className="text-xs text-muted-foreground mt-1">{commentObj.date}</p>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                      <button 
                                        className="px-4 py-2 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                        onClick={() => {
                                          const originalIndex = comments['faculty-meeting'].findIndex(c => c.message === commentObj.message && c.date === commentObj.date);
                                          handleEditComment('faculty-meeting', originalIndex);
                                        }}
                                        title="Edit"
                                      >
                                        <SquarePen className="h-4 w-4 text-gray-600" />
                                      </button>
                                      <button 
                                        className="px-4 py-2 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                        onClick={() => {
                                          const originalIndex = comments['faculty-meeting'].findIndex(c => c.message === commentObj.message && c.date === commentObj.date);
                                          handleUndoComment('faculty-meeting', originalIndex);
                                        }}
                                        title="Undo"
                                      >
                                        <Undo2 className="h-4 w-4 text-gray-600" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Your Comments Header - only when no comments exist */}
                          {!comments['faculty-meeting']?.length && (
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              <span className="text-sm font-medium">Your Comments</span>
                            </div>
                          )}
                          
                          {/* Input Field */}
                          <div className="space-y-2">
                            <div className="flex items-start border rounded-lg focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-colors bg-white">
                              <textarea
                                className="flex-1 min-h-[40px] p-3 border-0 rounded-l-lg resize-none text-sm focus:outline-none bg-white"
                                placeholder="Add your comment..."
                                rows={1}
                                style={{ resize: 'none' }}
                                value={commentInputs['faculty-meeting'] || ''}
                                onChange={(e) => {
                                  const newInputs = { ...commentInputs, 'faculty-meeting': e.target.value };
                                  setCommentInputs(newInputs);
                                  localStorage.setItem('comment-inputs', JSON.stringify(newInputs));
                                }}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = target.scrollHeight + 'px';
                                }}
                              />
                              <div className="flex gap-1 m-2">
                                <button 
                                  className="px-3 py-2 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                  title="Send comment"
                                  onClick={() => handleAddComment('faculty-meeting')}
                                >
                                  <ChevronRight className="h-4 w-4 text-gray-600" />
                                </button>
                                {!isLastRecipient({ id: 'faculty-meeting', workflow: null, recipientIds: null }) && (
                                  <button 
                                    className="px-3 py-2 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors"
                                    title="Share comment with next recipient(s)"
                                    onClick={() => handleShareComment('faculty-meeting')}
                                  >
                                    <Share2 className="h-4 w-4 text-blue-600" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 min-w-[150px]">
                          <Button variant="outline" size="sm" onClick={() => handleViewDocument({
                            id: 'faculty-meeting',
                            title: 'Faculty Meeting Minutes – Q4 2024',
                            type: 'Circular',
                            submitter: 'Dr. Sarah Johnson',
                            submittedDate: '2024-01-15',
                            submittedBy: 'Dr. Sarah Johnson',
                            date: '2024-01-15',
                            status: 'pending',
                            description: 'Add a risk-mitigation section to highlight potential delays or issues.'
                          })}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-orange-500 text-orange-600 hover:bg-orange-50"
                            onClick={() => {
                              setSelectedDocument({ id: 'faculty-meeting', type: 'circular', title: 'Faculty Meeting Minutes – Q4 2024' });
                              setShowLiveMeetingModal(true);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="relative w-4 h-4">
                                <div className="absolute inset-0 w-4 h-4 bg-green-400 rounded-full"></div>
                                <div className="absolute inset-1 w-2 h-2 bg-red-500 rounded-full"></div>
                              </div>
                              LiveMeet+
                            </div>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setDocumensoDocument({
                                id: 'faculty-meeting',
                                title: 'Faculty Meeting Minutes – Q4 2024',
                                content: 'Add a risk-mitigation section to highlight potential delays or issues.',
                                type: 'Circular'
                              });
                              setShowDocumenso(true);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve & Sign
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRejectDocument('faculty-meeting')}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Budget Request Card */}
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg flex items-center gap-2">
                                Budget Request – Lab Equipment
                              </h3>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <FileText className="h-4 w-4" />
                                  Letter
                                </div>
                                <div className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  Prof. David Brown
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  2024-01-13
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-yellow-600" />
                              <Badge variant="warning">Pending</Badge>
                              <Badge variant="outline" className="text-yellow-600">Medium Priority</Badge>
                            </div>
                          </div>
                          
                          {/* Description */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              <span className="text-sm font-medium">Description</span>
                            </div>
                            <div className="bg-muted p-3 rounded text-sm">
                              <p>Consider revising the scope to focus on priority items within this quarter's budget.</p>
                            </div>
                          </div>
                          
                          {/* Shared Comments from Previous Approvers */}
                          {sharedComments['budget-request']?.filter(s => shouldSeeSharedComment(s.sharedFor) && s.sharedBy !== user?.name).length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1">
                                <Share2 className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-700">Comment Shared by Previous Recipient</span>
                              </div>
                              <div className="space-y-2">
                                {sharedComments['budget-request'].filter(s => shouldSeeSharedComment(s.sharedFor) && s.sharedBy !== user?.name).map((shared, index) => (
                                  <div key={index} className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded text-sm">
                                    <p className="text-blue-800">{shared.comment}</p>
                                    <p className="text-xs text-blue-600 mt-1">— {shared.sharedBy}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Your Shared Comments (above input field) */}
                          {sharedComments['budget-request']?.filter(s => s.sharedBy === user?.name).length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1">
                                <Share2 className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-700">Share Comment with Next Recipient(s)</span>
                              </div>
                              <div className="space-y-2">
                                {sharedComments['budget-request'].filter(s => s.sharedBy === user?.name).map((shared, index) => (
                                  <div key={index} className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded text-sm flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="text-blue-800">{shared.comment}</p>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                      <button 
                                        className="px-4 py-2 bg-blue-200 rounded-full flex items-center justify-center hover:bg-blue-300 transition-colors"
                                        onClick={() => {
                                          const originalIndex = sharedComments['budget-request'].findIndex(s => s.comment === shared.comment && s.timestamp === shared.timestamp);
                                          handleEditSharedComment('budget-request', originalIndex);
                                        }}
                                        title="Edit"
                                      >
                                        <SquarePen className="h-4 w-4 text-blue-700" />
                                      </button>
                                      <button 
                                        className="px-4 py-2 bg-blue-200 rounded-full flex items-center justify-center hover:bg-blue-300 transition-colors"
                                        onClick={() => {
                                          const originalIndex = sharedComments['budget-request'].findIndex(s => s.comment === shared.comment && s.timestamp === shared.timestamp);
                                          handleUndoSharedComment('budget-request', originalIndex);
                                        }}
                                        title="Undo"
                                      >
                                        <Undo2 className="h-4 w-4 text-blue-700" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Your Comments */}
                          {comments['budget-request']?.filter(c => c.author === user?.name).length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                <span className="text-sm font-medium">Your Comments</span>
                              </div>
                              <div className="space-y-2">
                                {comments['budget-request'].filter(c => c.author === user?.name).map((commentObj, index) => (
                                  <div key={index} className="bg-muted p-3 rounded-lg text-sm flex justify-between items-start">
                                    <div className="flex-1">
                                      <p>{commentObj.message}</p>
                                      <p className="text-xs text-muted-foreground mt-1">{commentObj.date}</p>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                      <button 
                                        className="px-4 py-2 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                        onClick={() => {
                                          const originalIndex = comments['budget-request'].findIndex(c => c.message === commentObj.message && c.date === commentObj.date);
                                          handleEditComment('budget-request', originalIndex);
                                        }}
                                        title="Edit"
                                      >
                                        <SquarePen className="h-4 w-4 text-gray-600" />
                                      </button>
                                      <button 
                                        className="px-4 py-2 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                        onClick={() => {
                                          const originalIndex = comments['budget-request'].findIndex(c => c.message === commentObj.message && c.date === commentObj.date);
                                          handleUndoComment('budget-request', originalIndex);
                                        }}
                                        title="Undo"
                                      >
                                        <Undo2 className="h-4 w-4 text-gray-600" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Your Comments Header - only when no comments exist */}
                          {!comments['budget-request']?.length && (
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              <span className="text-sm font-medium">Your Comments</span>
                            </div>
                          )}
                          
                          {/* Input Field */}
                          <div className="space-y-2">
                            <div className="flex items-start border rounded-lg focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-colors bg-white">
                              <textarea
                                className="flex-1 min-h-[40px] p-3 border-0 rounded-l-lg resize-none text-sm focus:outline-none bg-white"
                                placeholder="Add your comment..."
                                rows={1}
                                style={{ resize: 'none' }}
                                value={commentInputs['budget-request'] || ''}
                                onChange={(e) => {
                                  const newInputs = { ...commentInputs, 'budget-request': e.target.value };
                                  setCommentInputs(newInputs);
                                  localStorage.setItem('comment-inputs', JSON.stringify(newInputs));
                                }}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = target.scrollHeight + 'px';
                                }}
                              />
                              <div className="flex gap-1 m-2">
                                <button 
                                  className="px-3 py-2 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                  title="Send comment"
                                  onClick={() => handleAddComment('budget-request')}
                                >
                                  <ChevronRight className="h-4 w-4 text-gray-600" />
                                </button>
                                {!isLastRecipient({ id: 'budget-request', workflow: null, recipientIds: null }) && (
                                  <button 
                                    className="px-3 py-2 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors"
                                    title="Share comment with next recipient(s)"
                                    onClick={() => handleShareComment('budget-request')}
                                  >
                                    <Share2 className="h-4 w-4 text-blue-600" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 min-w-[150px]">
                          <Button variant="outline" size="sm" onClick={() => handleViewDocument({
                            id: 'budget-request',
                            title: 'Budget Request – Lab Equipment',
                            type: 'Letter',
                            submitter: 'Prof. David Brown',
                            submittedDate: '2024-01-13',
                            submittedBy: 'Prof. David Brown',
                            date: '2024-01-13',
                            status: 'pending',
                            description: 'Consider revising the scope to focus on priority items within this quarter\'s budget.'
                          })}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-orange-500 text-orange-600 hover:bg-orange-50"
                            onClick={() => {
                              setSelectedDocument({ id: 'budget-request', type: 'letter', title: 'Budget Request – Lab Equipment' });
                              setShowLiveMeetingModal(true);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="relative w-4 h-4">
                                <div className="absolute inset-0 w-4 h-4 bg-green-400 rounded-full"></div>
                                <div className="absolute inset-1 w-2 h-2 bg-red-500 rounded-full"></div>
                              </div>
                              LiveMeet+
                            </div>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setDocumensoDocument({
                                id: 'budget-request',
                                title: 'Budget Request – Lab Equipment',
                                content: 'Consider revising the scope to focus on priority items within this quarter\'s budget.',
                                type: 'Letter'
                              });
                              setShowDocumenso(true);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve & Sign
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRejectDocument('budget-request')}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Student Event Proposal Card */}
                  <Card className="hover:shadow-md transition-shadow border-destructive bg-red-50 animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg flex items-center gap-2">
                                Student Event Proposal – Tech Fest 2024
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  EMERGENCY
                                </Badge>
                              </h3>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <FileText className="h-4 w-4" />
                                  Circular
                                </div>
                                <div className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  Dr. Emily Davis
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  2024-01-14
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-yellow-600" />
                              <Badge variant="warning">Pending</Badge>
                              <Badge variant="outline" className="text-yellow-600">Medium Priority</Badge>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              <span className="text-sm font-medium">Description</span>
                            </div>
                            <div className="bg-muted p-3 rounded text-sm">
                              <p>Annual technology festival proposal including budget allocation, venue requirements, and guest speaker arrangements.</p>
                            </div>
                          </div>
                          
                          {/* Action Required Indicator */}
                          <div className="flex items-center gap-2 p-2 bg-warning/10 rounded border border-warning/20">
                            <Zap className="w-4 h-4 text-warning" />
                            <span className="text-sm font-medium text-warning">
                              Action Required
                            </span>
                            <Badge variant="destructive" className="text-xs">
                              Escalated 2x
                            </Badge>
                          </div>
                          
                          {comments['student-event']?.filter(c => c.author === user?.name).length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                <span className="text-sm font-medium">Your Comments</span>
                              </div>
                              <div className="space-y-2">
                                {comments['student-event'].filter(c => c.author === user?.name).map((commentObj, index) => (
                                  <div key={index} className="bg-muted p-3 rounded-lg text-sm flex justify-between items-start">
                                    <div className="flex-1">
                                      <p>{commentObj.message}</p>
                                      <p className="text-xs text-muted-foreground mt-1">{commentObj.date}</p>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                      <button 
                                        className="px-4 py-2 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                        onClick={() => {
                                          const originalIndex = comments['student-event'].findIndex(c => c.message === commentObj.message && c.date === commentObj.date);
                                          handleEditComment('student-event', originalIndex);
                                        }}
                                        title="Edit"
                                      >
                                        <SquarePen className="h-4 w-4 text-gray-600" />
                                      </button>
                                      <button 
                                        className="px-4 py-2 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                        onClick={() => {
                                          const originalIndex = comments['student-event'].findIndex(c => c.message === commentObj.message && c.date === commentObj.date);
                                          handleUndoComment('student-event', originalIndex);
                                        }}
                                        title="Undo"
                                      >
                                        <Undo2 className="h-4 w-4 text-gray-600" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {!comments['student-event']?.length && (
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              <span className="text-sm font-medium">Your Comments</span>
                            </div>
                          )}
                          
                          <div className="flex items-start border rounded-lg focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-colors bg-white">
                            <textarea
                              className="flex-1 min-h-[40px] p-3 border-0 rounded-l-lg resize-none text-sm focus:outline-none bg-white"
                              placeholder="Add your comment..."
                              rows={1}
                              style={{ resize: 'none' }}
                              value={commentInputs['student-event'] || ''}
                              onChange={(e) => {
                                const newInputs = { ...commentInputs, 'student-event': e.target.value };
                                setCommentInputs(newInputs);
                                localStorage.setItem('comment-inputs', JSON.stringify(newInputs));
                              }}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = target.scrollHeight + 'px';
                              }}
                            />
                            <div className="flex gap-1 m-2">
                              <button 
                                className="px-3 py-2 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                title="Send comment"
                                onClick={() => handleAddComment('student-event')}
                              >
                                <ChevronRight className="h-4 w-4 text-gray-600" />
                              </button>
                              <button 
                                className="px-3 py-2 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors"
                                title="Share comment with next recipient(s)"
                                onClick={() => handleShareComment('student-event')}
                              >
                                <Share2 className="h-4 w-4 text-blue-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 min-w-[150px]">
                          <Button variant="outline" size="sm" onClick={() => handleViewDocument({
                            id: 'student-event',
                            title: 'Student Event Proposal – Tech Fest 2024',
                            type: 'Circular',
                            submitter: 'Dr. Emily Davis',
                            submittedDate: '2024-01-14',
                            submittedBy: 'Dr. Emily Davis',
                            date: '2024-01-14',
                            status: 'pending',
                            description: 'Annual technology festival proposal including budget allocation, venue requirements, and guest speaker arrangements.'
                          })}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-orange-500 text-orange-600 hover:bg-orange-50"
                            onClick={() => {
                              setSelectedDocument({ id: 'student-event', type: 'circular', title: 'Student Event Proposal – Tech Fest 2024' });
                              setShowLiveMeetingModal(true);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="relative w-4 h-4">
                                <div className="absolute inset-0 w-4 h-4 bg-green-400 rounded-full"></div>
                                <div className="absolute inset-1 w-2 h-2 bg-red-500 rounded-full"></div>
                              </div>
                              LiveMeet+
                            </div>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setDocumensoDocument({
                                id: 'student-event',
                                title: 'Student Event Proposal – Tech Fest 2024',
                                content: 'Annual technology festival proposal including budget allocation, venue requirements, and guest speaker arrangements.',
                                type: 'Circular'
                              });
                              setShowDocumenso(true);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve & Sign
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRejectDocument('student-event')}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Demo Card - Pending Approvals */}
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg flex items-center gap-2">
                                Research Methodology Guidelines – Academic Review
                              </h3>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <FileText className="h-4 w-4" />
                                  Report
                                </div>
                                <div className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  Prof. Jessica Chen
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  2024-01-20
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-yellow-600" />
                              <Badge variant="warning">Pending</Badge>
                              <Badge variant="outline" className="text-blue-600">Normal Priority</Badge>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              <span className="text-sm font-medium">Description</span>
                            </div>
                            <div className="bg-muted p-3 rounded text-sm">
                              <p>Comprehensive guidelines for research methodology standards and academic review processes.</p>
                            </div>
                          </div>
                          
                          {/* Shared Comments from Previous Approvers */}
                          {sharedComments['research-methodology']?.filter(s => shouldSeeSharedComment(s.sharedFor) && s.sharedBy !== user?.name).length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1">
                                <Share2 className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-700">Comment Shared by Previous Recipient</span>
                              </div>
                              <div className="space-y-2">
                                {sharedComments['research-methodology'].filter(s => shouldSeeSharedComment(s.sharedFor) && s.sharedBy !== user?.name).map((shared, index) => (
                                  <div key={index} className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded text-sm">
                                    <p className="text-blue-800">{shared.comment}</p>
                                    <p className="text-xs text-blue-600 mt-1">— {shared.sharedBy}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Your Shared Comments (above input field) */}
                          {sharedComments['research-methodology']?.filter(s => s.sharedBy === user?.name).length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1">
                                <Share2 className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-700">Share Comment with Next Recipient(s)</span>
                              </div>
                              <div className="space-y-2">
                                {sharedComments['research-methodology'].filter(s => s.sharedBy === user?.name).map((shared, index) => (
                                  <div key={index} className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded text-sm flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="text-blue-800">{shared.comment}</p>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                      <button 
                                        className="px-4 py-2 bg-blue-200 rounded-full flex items-center justify-center hover:bg-blue-300 transition-colors"
                                        onClick={() => {
                                          const originalIndex = sharedComments['research-methodology'].findIndex(s => s.comment === shared.comment && s.timestamp === shared.timestamp);
                                          handleEditSharedComment('research-methodology', originalIndex);
                                        }}
                                        title="Edit"
                                      >
                                        <SquarePen className="h-4 w-4 text-blue-700" />
                                      </button>
                                      <button 
                                        className="px-4 py-2 bg-blue-200 rounded-full flex items-center justify-center hover:bg-blue-300 transition-colors"
                                        onClick={() => {
                                          const originalIndex = sharedComments['research-methodology'].findIndex(s => s.comment === shared.comment && s.timestamp === shared.timestamp);
                                          handleUndoSharedComment('research-methodology', originalIndex);
                                        }}
                                        title="Undo"
                                      >
                                        <Undo2 className="h-4 w-4 text-blue-700" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Your Comments */}
                          {comments['research-methodology']?.filter(c => c.author === user?.name).length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                <span className="text-sm font-medium">Your Comments</span>
                              </div>
                              <div className="space-y-2">
                                {comments['research-methodology'].filter(c => c.author === user?.name).map((commentObj, index) => (
                                  <div key={index} className="bg-muted p-3 rounded-lg text-sm flex justify-between items-start">
                                    <div className="flex-1">
                                      <p>{commentObj.message}</p>
                                      <p className="text-xs text-muted-foreground mt-1">{commentObj.date}</p>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                      <button 
                                        className="px-4 py-2 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                        onClick={() => {
                                          const originalIndex = comments['research-methodology'].findIndex(c => c.message === commentObj.message && c.date === commentObj.date);
                                          handleEditComment('research-methodology', originalIndex);
                                        }}
                                        title="Edit"
                                      >
                                        <SquarePen className="h-4 w-4 text-gray-600" />
                                      </button>
                                      <button 
                                        className="px-4 py-2 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                        onClick={() => {
                                          const originalIndex = comments['research-methodology'].findIndex(c => c.message === commentObj.message && c.date === commentObj.date);
                                          handleUndoComment('research-methodology', originalIndex);
                                        }}
                                        title="Undo"
                                      >
                                        <Undo2 className="h-4 w-4 text-gray-600" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Your Comments Header - only when no comments exist */}
                          {!comments['research-methodology']?.length && (
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              <span className="text-sm font-medium">Your Comments</span>
                            </div>
                          )}
                          
                          {/* Input Field */}
                          <div className="space-y-2">
                            <div className="flex items-start border rounded-lg focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-colors bg-white">
                              <textarea
                                className="flex-1 min-h-[40px] p-3 border-0 rounded-l-lg resize-none text-sm focus:outline-none bg-white"
                                placeholder="Add your comment..."
                                rows={1}
                                style={{ resize: 'none' }}
                                value={commentInputs['research-methodology'] || ''}
                                onChange={(e) => {
                                  const newInputs = { ...commentInputs, 'research-methodology': e.target.value };
                                  setCommentInputs(newInputs);
                                  localStorage.setItem('comment-inputs', JSON.stringify(newInputs));
                                }}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = target.scrollHeight + 'px';
                                }}
                              />
                              <div className="flex gap-1 m-2">
                                <button 
                                  className="px-3 py-2 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                  title="Send comment"
                                  onClick={() => handleAddComment('research-methodology')}
                                >
                                  <ChevronRight className="h-4 w-4 text-gray-600" />
                                </button>
                                {!isLastRecipient({ id: 'research-methodology', workflow: null, recipientIds: null }) && (
                                  <button 
                                    className="px-3 py-2 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors"
                                    title="Share comment with next recipient(s)"
                                    onClick={() => handleShareComment('research-methodology')}
                                  >
                                    <Share2 className="h-4 w-4 text-blue-600" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 min-w-[150px]">
                          <Button variant="outline" size="sm" onClick={() => handleViewDocument({
                            id: 'research-methodology',
                            title: 'Research Methodology Guidelines – Academic Review',
                            type: 'Report',
                            submitter: 'Prof. Jessica Chen',
                            submittedDate: '2024-01-20',
                            submittedBy: 'Prof. Jessica Chen',
                            date: '2024-01-20',
                            status: 'pending',
                            description: 'Comprehensive guidelines for research methodology standards and academic review processes.'
                          })}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-orange-500 text-orange-600 hover:bg-orange-50"
                            onClick={() => {
                              setSelectedDocument({ id: 'research-methodology', type: 'report', title: 'Research Methodology Guidelines – Academic Review' });
                              setShowLiveMeetingModal(true);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="relative w-4 h-4">
                                <div className="absolute inset-0 w-4 h-4 bg-green-400 rounded-full"></div>
                                <div className="absolute inset-1 w-2 h-2 bg-red-500 rounded-full"></div>
                              </div>
                              LiveMeet+
                            </div>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setDocumensoDocument({
                                id: 'research-methodology',
                                title: 'Research Methodology Guidelines – Academic Review',
                                content: 'Comprehensive guidelines for research methodology standards and academic review processes.',
                                type: 'Report'
                              });
                              setShowDocumenso(true);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve & Sign
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRejectDocument('research-methodology')}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="signature" className="space-y-6">
            <AdvancedDigitalSignature userRole={user.role} />
          </TabsContent>
          
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Approval History</CardTitle>
                <CardDescription>View your recent approval activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...approvalHistory, ...recentApprovals].map((doc) => {
                    // Check if this is an emergency card
                    const isEmergency = doc.isEmergency || doc.priority === 'emergency' || doc.title === 'Course Curriculum Update';
                    
                    return (
                    <Card key={doc.id} className={`relative hover:shadow-md transition-shadow ${isEmergency ? 'border-destructive bg-red-50 animate-pulse' : ''}`}>
                      <CardContent className="p-6">
                        {/* Emergency indicator - blinking light for emergency cards */}
                        {isEmergency && (
                          <div className="absolute top-2 left-2 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                        )}
                        
                        <div className="flex flex-col lg:flex-row gap-6">
                          <div className="flex-1 space-y-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                  {doc.title}
                                  {isEmergency && (
                                    <Badge variant="destructive" className="text-xs animate-pulse">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      EMERGENCY
                                    </Badge>
                                  )}
                                </h3>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <FileText className="h-4 w-4" />
                                    {doc.type}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <User className="h-4 w-4" />
                                    {doc.submitter}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {doc.submittedDate}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {doc.status === "approved" ? (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 text-red-600" />
                                    <Badge variant="destructive">Rejected</Badge>
                                  </>
                                )}
                                <Badge variant="outline" className={
                                  doc.priority === "high" ? "text-orange-600 font-semibold" : 
                                  doc.priority === "medium" ? "text-yellow-600" : 
                                  doc.title === 'Course Curriculum Update' ? "text-yellow-600" :
                                  "text-blue-600"
                                }>
                                  {doc.title === 'Course Curriculum Update' ? 'Medium Priority' : 
                                   doc.priority.charAt(0).toUpperCase() + doc.priority.slice(1) + ' Priority'}
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Description */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                <span className="text-sm font-medium">Description</span>
                              </div>
                              <div className="bg-muted p-3 rounded text-sm">
                                <p>{doc.description}</p>
                              </div>
                            </div>
                            
                            {/* Shared Comments from Previous Approvers - only for Research Grant Application */}
                            {doc.title === 'Research Grant Application' && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-1">
                                  <Share2 className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-700">Comment Shared by Previous Recipient</span>
                                </div>
                                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded text-sm">
                                  <p className="text-blue-800">Insufficient literature review and theoretical framework. References need to be updated to the latest 3 years.</p>
                                  <p className="text-xs text-blue-600 mt-1">— Dr. Maria Garcia (HOD)</p>
                                </div>
                              </div>
                            )}
                            
                            {/* Your Comments */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                <span className="text-sm font-medium">Your Comments</span>
                              </div>
                              <div className="bg-muted p-3 rounded text-sm">
                                <p>{doc.comment}</p>
                              </div>
                            </div>
                            
                            {/* Status Information */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span className="text-sm font-medium">Status Details</span>
                              </div>
                              <div className="bg-muted p-3 rounded text-sm">
                                {doc.status === "approved" ? (
                                  <p>Approved by {doc.approvedBy} on {doc.approvedDate}</p>
                                ) : (
                                  <p>Rejected by {doc.rejectedBy} on {doc.rejectedDate}</p>
                                )}
                              </div>
                            </div>
                            

                          </div>
                          <div className="flex flex-col gap-2 min-w-[150px]">
                            <Button variant="outline" size="sm" onClick={() => handleViewDocument(doc)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            {doc.status === "approved" ? (
                              <Button variant="outline" size="sm" className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100">
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Approved
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100">
                                <XCircle className="h-4 w-4 mr-2" />
                                Rejected
                              </Button>
                            )}

                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <LiveMeetingRequestModal
          isOpen={showLiveMeetingModal}
          onClose={() => setShowLiveMeetingModal(false)}
          documentId={selectedDocument.id}
          documentType={selectedDocument.type as 'letter' | 'circular' | 'report'}
          documentTitle={selectedDocument.title}
        />
        
        {documensoDocument && (
          <DocumensoIntegration
            isOpen={showDocumenso}
            onClose={() => setShowDocumenso(false)}
            onComplete={() => handleDocumensoComplete(documensoDocument.id)}
            document={documensoDocument}
            user={{
              name: user?.name || 'User',
              email: user?.email || 'user@university.edu',
              role: user?.role || 'Employee'
            }}
            file={viewingFile || undefined}
            files={viewingFiles.length > 0 ? viewingFiles : undefined}
          />
        )}

        {/* FileViewer Modal */}
        <FileViewer
          file={viewingFile}
          files={viewingFiles.length > 0 ? viewingFiles : undefined}
          open={showDocumentViewer}
          onOpenChange={setShowDocumentViewer}
        />
      </div>
    </DashboardLayout>
  );
};

export default Approvals;