import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye, 
  Download, 
  MessageSquare,
  Calendar,
  User,
  PenTool,
  Signature,
  Shield,
  FileClock,
  Trash2,
  ArrowRight,
  Building,
  CircleCheckBig,
  Siren,
  Users
} from "lucide-react";
import { DigitalSignature } from "./DigitalSignature";
import { useToast } from "@/hooks/use-toast";
import isJpg from 'is-jpg';

interface DocumentTrackerProps {
  userRole: string;
  onViewFile?: (file: File) => void;
  onViewFiles?: (files: File[]) => void; // Support for multiple files
}

interface Document {
  id: string;
  title: string;
  type: 'Letter' | 'Circular' | 'Report';
  submittedBy: string;
  submittedDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'in-review' | 'submitted';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  workflow: {
    currentStep: string;
    progress: number;
    steps: Array<{
      name: string;
      status: 'completed' | 'current' | 'pending' | 'rejected' | 'cancelled';
      assignee: string;
      completedDate?: string;
      rejectedBy?: string;
      rejectedDate?: string;
    }>;
  };
  requiresSignature: boolean;
  signedBy?: string[];
  description?: string;
  comments?: Array<{
    author: string;
    date: string;
    message: string;
  }>;
  files?: File[];
}

const mockDocuments: Document[] = [
  {
    id: 'DOC-DEMO2',
    title: 'Quality Assurance Framework - Implementation Plan',
    type: 'Report',
    submittedBy: 'Dr. Jennifer Park',
    submittedDate: '2024-01-22',
    status: 'approved',
    priority: 'high',
    workflow: {
      currentStep: 'Complete',
      progress: 100,
      steps: [
        { name: 'Submission', status: 'completed', assignee: 'Dr. Jennifer Park', completedDate: '2024-01-22' },
        { name: 'Department Review', status: 'completed', assignee: 'Prof. Mark Johnson', completedDate: '2024-01-23' },
        { name: 'Principal Approval', status: 'completed', assignee: 'Dr. Principal', completedDate: '2024-01-24' },
      ]
    },
    requiresSignature: true,
    signedBy: ['Dr. Jennifer Park', 'Prof. Mark Johnson', 'Dr. Principal'],
    description: 'Comprehensive framework for implementing quality assurance measures across academic and administrative processes.',
    comments: [
      { author: 'Prof. Mark Johnson', date: '2024-01-23', message: 'Excellent framework with clear implementation guidelines. Approved for next level.' },
      { author: 'Dr. Principal', date: '2024-01-24', message: 'Quality framework approved. Timeline is realistic and metrics are well-defined.' }
    ]
  },
  {
    id: 'DOC-DEMO',
    title: 'Demo Document - Sample Tracking',
    type: 'Letter',
    submittedBy: 'Prof. Alex Martinez',
    submittedDate: '2024-01-20',
    status: 'pending',
    priority: 'medium',
    workflow: {
      currentStep: 'HOD Review',
      progress: 50,
      steps: [
        { name: 'Submission', status: 'completed', assignee: 'Prof. Alex Martinez', completedDate: '2024-01-20' },
        { name: 'HOD Review', status: 'current', assignee: 'Dr. Rachel Thompson' },
        { name: 'Principal Approval', status: 'pending', assignee: 'Dr. Principal' },
      ]
    },
    requiresSignature: true,
    signedBy: ['Prof. Alex Martinez'],
    description: 'This is a demonstration document for testing the document tracking system functionality.',
    comments: [
      { author: 'Dr. Rachel Thompson', date: '2024-01-20', message: 'Document submitted for departmental review and approval.' }
    ]
  },
  {
    id: 'DOC-001',
    title: 'Faculty Meeting Minutes - Q4 2024',
    type: 'Report',
    submittedBy: 'Dr. Sarah Johnson',
    submittedDate: '2024-01-15',
    status: 'pending',
    priority: 'high',
    workflow: {
      currentStep: 'Principal Approval',
      progress: 75,
      steps: [
        { name: 'Submission', status: 'completed', assignee: 'Dr. Sarah Johnson', completedDate: '2024-01-15' },
        { name: 'HOD Review', status: 'completed', assignee: 'Prof. Michael Chen', completedDate: '2024-01-16' },
        { name: 'Registrar Review', status: 'completed', assignee: 'Ms. Lisa Wang', completedDate: '2024-01-17' },
        { name: 'Principal Approval', status: 'current', assignee: 'Dr. Robert Smith' },
      ]
    },
    requiresSignature: true,
    signedBy: ['Prof. Michael Chen', 'Ms. Lisa Wang'],
    description: 'Summary of faculty meeting outcomes, including budget allocation updates, curriculum changes, and department-level project progress discussions.',
    comments: [
      { author: 'Prof. Michael Chen', date: '2024-01-16', message: 'Minutes look comprehensive. Approved for next level.' },
      { author: 'Ms. Lisa Wang', date: '2024-01-18', message: 'Minutes are well-structured. Suggest adding attendance details for completeness.' }
    ]
  },
  {
    id: 'DOC-002',
    title: 'New Course Proposal - Data Science',
    type: 'Circular',
    submittedBy: 'Dr. Emily Davis',
    submittedDate: '2024-01-14',
    status: 'approved',
    priority: 'urgent',
    workflow: {
      currentStep: 'Complete',
      progress: 100,
      steps: [
        { name: 'Submission', status: 'completed', assignee: 'Dr. Emily Davis', completedDate: '2024-01-14' },
        { name: 'Department Review', status: 'completed', assignee: 'Prof. James Wilson', completedDate: '2024-01-15' },
        { name: 'Academic Committee', status: 'completed', assignee: 'Dr. Maria Garcia', completedDate: '2024-01-16' },
        { name: 'Principal Approval', status: 'completed', assignee: 'Dr. Robert Smith', completedDate: '2024-01-17' },
      ]
    },
    requiresSignature: true,
    signedBy: ['Prof. James Wilson', 'Dr. Maria Garcia', 'Dr. Robert Smith'],
    description: 'Detailed proposal outlining the structure, objectives, and expected outcomes of the new Data Science course, including prerequisites and lab modules.',
    comments: [
      { author: 'Prof. James Wilson', date: '2024-01-15', message: 'Please attach vendor quotations for the requested equipment to justify costs.' },
      { author: 'Dr. Maria Garcia', date: '2024-01-18', message: 'Follow-up tasks should include timelines for each item discussed.' },
      { author: 'Dr. Robert Smith', date: '2024-01-15', message: 'Ensure the proposed purchase aligns with the department\'s annual procurement plan.' }
    ]
  },
  {
    id: 'DOC-003',
    title: 'Budget Request - Lab Equipment',
    type: 'Letter',
    submittedBy: 'Prof. David Brown',
    submittedDate: '2024-01-13',
    status: 'rejected',
    priority: 'medium',
    workflow: {
      currentStep: 'Rejected',
      progress: 50,
      steps: [
        { name: 'Submission', status: 'completed', assignee: 'Prof. David Brown', completedDate: '2024-01-13' },
        { name: 'Finance Review', status: 'completed', assignee: 'Ms. Jennifer Lee', completedDate: '2024-01-14' },
        { name: 'Principal Review', status: 'completed', assignee: 'Dr. Robert Smith', completedDate: '2024-01-15' },
      ]
    },
    requiresSignature: true,
    signedBy: ['Ms. Jennifer Lee'],
    description: 'Request for allocation of funds for advanced lab equipment and IoT testing kits to support ongoing academic research and student projects.',
    comments: [
      { author: 'Ms. Jennifer Lee', date: '2024-01-14', message: 'Budget allocation exceeded. Please revise and resubmit with detailed justification.' },
      { author: 'Dr. Robert Smith', date: '2024-01-15', message: 'Consider phasing the purchase over two quarters to stay within the current budget.' }
    ]
  }
];

export const DocumentTracker: React.FC<DocumentTrackerProps> = ({ userRole, onViewFile, onViewFiles }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [comment, setComment] = useState('');
  const [submittedDocuments, setSubmittedDocuments] = useState<Document[]>([]);
  const [removedDocuments, setRemovedDocuments] = useState<string[]>([]);
  const [recentlyRemoved, setRecentlyRemoved] = useState<string[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState({
    name: 'Current User',
    department: '',
    designation: ''
  });
  const [approvalComments, setApprovalComments] = useState<{[key: string]: any[]}>({});
  const { toast } = useToast();
  


  // Load submitted documents and user profile from localStorage
  useEffect(() => {
    const loadSubmittedDocuments = () => {
      const stored = JSON.parse(localStorage.getItem('submitted-documents') || '[]');
      console.log('📄 [Track Documents] Loading submitted documents:', stored.length, 'documents');
      console.log('📋 [Track Documents] Documents:', stored.map(doc => ({ id: doc.id, title: doc.title, submittedBy: doc.submittedBy })));
      setSubmittedDocuments(stored);
    };
    
    const handleWorkflowUpdate = () => {
      loadSubmittedDocuments();
    };

    const handleEmergencyDocumentCreated = (event: CustomEvent) => {
      console.log('🚨 [Track Documents] Emergency document event received:', event.detail);
      const { document: emergencyDoc } = event.detail;
      
      if (emergencyDoc) {
        console.log('📋 [Track Documents] Adding emergency document:', emergencyDoc.title);
        setSubmittedDocuments(prev => {
          // Check if document already exists to avoid duplicates
          const exists = prev.some(doc => doc.id === emergencyDoc.id);
          if (!exists) {
            console.log('✅ [Track Documents] Emergency document added to state');
            return [emergencyDoc, ...prev];
          } else {
            console.log('ℹ️ [Track Documents] Emergency document already exists, skipping');
            return prev;
          }
        });
        
        // Show notification that emergency document card was created
        toast({
          title: "Emergency Document Card Created",
          description: `${emergencyDoc.title} is now visible with emergency features applied`,
          duration: 5000,
        });
      }
    };
    
    // Save track documents to localStorage for search
    const saveTrackDocuments = () => {
      const trackDocuments = [...submittedDocuments, ...mockDocuments].map(doc => ({
        id: doc.id,
        title: doc.title,
        description: doc.description || '',
        type: doc.type,
        status: doc.status
      }));
      localStorage.setItem('trackDocuments', JSON.stringify(trackDocuments));
    };
    
    const loadUserProfile = () => {
      const savedProfile = localStorage.getItem('user-profile');
      if (savedProfile) {
        try {
          const parsedProfile = JSON.parse(savedProfile);
          setCurrentUserProfile({
            name: parsedProfile.name || 'Current User',
            department: parsedProfile.department || '',
            designation: parsedProfile.designation || ''
          });
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      }
    };
    
    const loadApprovalComments = () => {
      const comments = JSON.parse(localStorage.getItem('document-comments') || '{}');
      setApprovalComments(comments);
    };
    
    loadSubmittedDocuments();
    loadUserProfile();
    loadApprovalComments();
    saveTrackDocuments();
    
    // Listen for document submission events
    const handleDocumentSubmitted = (event?: any) => {
      console.log('📢 [Track Documents] Document submission event received, reloading...', event?.detail);
      loadSubmittedDocuments();
      
      // Show immediate feedback for new submissions
      if (event?.detail?.trackingCard) {
        const newCard = event.detail.trackingCard;
        console.log('✨ [Track Documents] New tracking card received:', newCard.title);
        
        setSubmittedDocuments(prev => {
          const exists = prev.some(doc => doc.id === newCard.id);
          if (!exists) {
            console.log('✅ [Track Documents] Adding new tracking card to state');
            return [newCard, ...prev];
          }
          return prev;
        });
        
        toast({
          title: "Document Tracking Started",
          description: `${newCard.title} is now being tracked`,
          duration: 3000,
        });
      }
    };
    
    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'submitted-documents') {
        console.log('📢 [Track Documents] Storage change detected for submitted-documents');
        loadSubmittedDocuments();
      } else if (e.key === 'user-profile') {
        loadUserProfile();
      } else if (e.key === 'document-comments') {
        loadApprovalComments();
      }
    };
    
    // Listen for real-time updates from Approval Center
    const handleApprovalChanges = () => {
      loadApprovalComments();
    };
    
    // Listen for document signature events
    const handleDocumentSigned = (event: any) => {
      console.log('🖊️ [Track Documents] Document signed event received:', event.detail);
      loadSubmittedDocuments();
      
      if (event.detail?.documentId) {
        toast({
          title: "Document Signed",
          description: `Document has been digitally signed and updated`,
          duration: 3000,
        });
      }
    };
    
    window.addEventListener('approval-comments-changed', handleApprovalChanges);
    window.addEventListener('workflow-updated', handleWorkflowUpdate);
    window.addEventListener('emergency-document-created', handleEmergencyDocumentCreated as EventListener);
    window.addEventListener('document-approval-created', handleDocumentSubmitted);
    window.addEventListener('approval-card-created', handleDocumentSubmitted);
    window.addEventListener('document-submitted', handleDocumentSubmitted);
    window.addEventListener('document-signed', handleDocumentSigned);
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('approval-comments-changed', handleApprovalChanges);
      window.removeEventListener('workflow-updated', handleWorkflowUpdate);
      window.removeEventListener('emergency-document-created', handleEmergencyDocumentCreated as EventListener);
      window.removeEventListener('document-approval-created', handleDocumentSubmitted);
      window.removeEventListener('approval-card-created', handleDocumentSubmitted);
      window.removeEventListener('document-submitted', handleDocumentSubmitted);
      window.removeEventListener('document-signed', handleDocumentSigned);
    };
  }, []);

  const getStatusIcon = (status: string): JSX.Element => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'in-review': return <FileClock className="h-4 w-4 text-blue-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string): "success" | "warning" | "default" | "destructive" => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'destructive';
      case 'pending': return 'warning';
      case 'in-review': return 'default';
      case 'submitted': return 'warning';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical':
      case 'Critical Priority': return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent':
      case 'urgent priority':
      case 'Urgent Priority': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high':
      case 'high priority':
      case 'High Priority': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
      case 'medium priority':
      case 'Medium Priority': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityTextColor = (priority: string): string => {
    switch (priority) {
      case 'critical':
      case 'Critical Priority': return 'text-red-600 font-bold';
      case 'urgent':
      case 'urgent priority':
      case 'Urgent Priority': return 'text-yellow-600 font-bold';
      case 'high':
      case 'high priority':
      case 'High Priority': return 'text-orange-600 font-semibold';
      case 'medium':
      case 'medium priority':
      case 'Medium Priority': return 'text-blue-600';
      case 'low': return 'text-green-600';
      case 'normal':
      case 'Normal Priority': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  // Combine mock documents with submitted documents
  const allDocuments = [...submittedDocuments, ...mockDocuments];
  
  const filteredDocuments = allDocuments.filter(doc => {
    const notRemoved = !removedDocuments.includes(doc.id);
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    
    // Mock documents are always visible
    const isMockDocument = mockDocuments.some(mockDoc => mockDoc.id === doc.id);
    
    // For submitted documents, only show to the submitting user
    const isOwnDocument = doc.submittedBy === currentUserProfile.name ||
                         doc.submittedBy === userRole ||
                         (doc as any).submittedByDesignation === userRole ||
                         (doc as any).submittedByDesignation === currentUserProfile.designation;
    
    const shouldShow = notRemoved && matchesSearch && matchesStatus && matchesType && (isMockDocument || isOwnDocument);
    
    if (!isMockDocument) {
      console.log(`🔍 [Track Documents] Filtering document "${doc.title}":`, {
        submittedBy: doc.submittedBy,
        currentUserName: currentUserProfile.name,
        userRole: userRole,
        submittedByDesignation: (doc as any).submittedByDesignation,
        isOwnDocument: isOwnDocument,
        shouldShow: shouldShow
      });
    }
    
    return shouldShow;
  });

  const handleApprove = (docId: string) => {
    if (selectedDocument?.requiresSignature) {
      setShowSignatureDialog(true);
    } else {
      toast({
        title: "Document Approved",
        description: `Document ${docId} has been approved`,
      });
    }
  };

  const handleReject = (docId: string) => {
    toast({
      title: "Document Rejected",
      description: `Document ${docId} has been rejected`,
      variant: "destructive"
    });
  };

  const handleSignatureCapture = (signatureData: string) => {
    toast({
      title: "Signature Captured",
      description: "Digital signature has been applied to the document",
    });
    setShowSignatureDialog(false);
  };

  const handleRemove = (docId: string) => {
    // Remove from submitted documents if it exists there
    const updatedSubmitted = submittedDocuments.filter(doc => doc.id !== docId);
    setSubmittedDocuments(updatedSubmitted);
    localStorage.setItem('submitted-documents', JSON.stringify(updatedSubmitted));
    
    // Remove from pending approvals in Approval Center
    const existingApprovals = JSON.parse(localStorage.getItem('pending-approvals') || '[]');
    const updatedApprovals = existingApprovals.filter((doc: any) => doc.id !== docId);
    localStorage.setItem('pending-approvals', JSON.stringify(updatedApprovals));
    
    // Remove associated comments and inputs
    const existingComments = JSON.parse(localStorage.getItem('document-comments') || '{}');
    delete existingComments[docId];
    localStorage.setItem('document-comments', JSON.stringify(existingComments));
    
    const existingInputs = JSON.parse(localStorage.getItem('comment-inputs') || '{}');
    delete existingInputs[docId];
    localStorage.setItem('comment-inputs', JSON.stringify(existingInputs));
    
    const approvalComments = JSON.parse(localStorage.getItem('approval-comments') || '{}');
    delete approvalComments[docId];
    localStorage.setItem('approval-comments', JSON.stringify(approvalComments));
    
    // Add to removed list for mock documents
    setRemovedDocuments(prev => [...prev, docId]);
    setRecentlyRemoved(prev => [...prev, docId]);
    
    // Trigger real-time update for Approval Center
    window.dispatchEvent(new CustomEvent('document-removed', { detail: { docId } }));
    
    toast({
      title: "Document Removed",
      description: `Document ${docId} has been removed. Click 'Undo Remove' to restore it.`,
      variant: "destructive"
    });
  };

  // Helper function to create a demo PDF file for viewing
  const createDocumentFile = (document: Document): File => {
    // Create HTML content for the document
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${document.title}</title>
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
    h2 {
      color: #374151;
      margin-top: 30px;
    }
    p {
      margin: 10px 0;
    }
    .info {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
    }
    .approved { background: #dcfce7; color: #166534; }
    .pending { background: #fef3c7; color: #92400e; }
    .rejected { background: #fee2e2; color: #991b1b; }
    .in-review { background: #dbeafe; color: #1e40af; }
  </style>
</head>
<body>
  <h1>${document.title}</h1>
  <div class="info">
    <p><strong>Type:</strong> ${document.type}</p>
    <p><strong>Submitted by:</strong> ${document.submittedBy}</p>
    <p><strong>Date:</strong> ${document.submittedDate}</p>
    <p><strong>Status:</strong> <span class="status ${document.status}">${document.status.toUpperCase()}</span></p>
    <p><strong>Priority:</strong> ${document.priority}</p>
  </div>
  <h2>Workflow Progress</h2>
  <p><strong>Current Step:</strong> ${document.workflow.currentStep}</p>
  <p><strong>Progress:</strong> ${document.workflow.progress}%</p>
  ${(document as any).description ? `<h2>Description</h2><p>${(document as any).description}</p>` : ''}
  <h2>Workflow Steps</h2>
  <ul>
    ${document.workflow.steps.map(step => `
      <li>
        <strong>${step.name}</strong> - ${step.assignee} 
        ${step.status === 'completed' ? '✓' : step.status === 'current' ? '⏳' : '⏸'}
      </li>
    `).join('')}
  </ul>
  ${document.requiresSignature ? `
    <h2>Digital Signatures</h2>
    <p>${document.signedBy && document.signedBy.length > 0 ? `Signed by: ${document.signedBy.join(', ')}` : 'Pending signature'}</p>
  ` : ''}
</body>
</html>
    `;

    // Create a Blob from the HTML content
    const blob = new Blob([htmlContent], { type: 'text/html' });
    
    // Create a File object with a .html extension
    const fileName = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    return new File([blob], fileName, { type: 'text/html' });
  };


  return (
    <div className="space-y-6">
      {/* Undo Remove Button */}
      {recentlyRemoved.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  {recentlyRemoved.length} document(s) recently removed
                </span>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setRemovedDocuments(prev => prev.filter(id => !recentlyRemoved.includes(id)));
                  setRecentlyRemoved([]);
                  toast({
                    title: "Documents Restored",
                    description: "Recently removed documents have been restored",
                  });
                }}
                className="text-blue-600 border-blue-300 hover:bg-blue-100"
              >
                Undo Remove
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Document Tracking & Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents by title or submitter..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    All Status
                  </div>
                </SelectItem>
                <SelectItem value="pending">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    Pending
                  </div>
                </SelectItem>

                <SelectItem value="approved">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Approved
                  </div>
                </SelectItem>
                <SelectItem value="rejected">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    Rejected
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Letter">Letter</SelectItem>
                <SelectItem value="Circular">Circular</SelectItem>
                <SelectItem value="Report">Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Document List */}
      <div className="space-y-4">
        {filteredDocuments.map((document) => {
          const isEmergency = (document as any).isEmergency || document.id === 'DOC-DEMO';
          const emergencyFeatures = (document as any).emergencyFeatures;
          
          return (
          <Card key={document.id} className={`hover:shadow-md transition-shadow ${
            isEmergency ? 'border-destructive bg-red-50 animate-pulse' : ''
          }`}>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Document Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{document.title}</h3>
                        {isEmergency && (
                          <Badge variant="destructive" className="animate-pulse">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            EMERGENCY
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {document.type}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{document.submittedBy}</span>
                          {(document as any).submittedByDesignation && (
                            <span className="text-xs text-muted-foreground"> • {(document as any).submittedByDesignation.toUpperCase()}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {document.submittedDate}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(document.status)}
                      <Badge variant={getStatusBadge(document.status)}>
                        {document.status === 'submitted' ? 'Pending' : document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                      </Badge>
                      <Badge variant="outline" className={getPriorityTextColor(document.priority)}>
                        {typeof document.priority === 'string' && document.priority.includes('Priority') 
                          ? document.priority 
                          : `${document.priority.charAt(0).toUpperCase() + document.priority.slice(1)} Priority`}
                      </Badge>

                    </div>
                  </div>

                  {/* Workflow Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Workflow Progress</span>
                      <span>{document.workflow.progress}%</span>
                    </div>
                    <Progress value={document.workflow.progress} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      Current Step: {document.workflow.currentStep}
                    </p>
                  </div>

                  {/* Workflow Steps */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                    {document.workflow.steps.map((step, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        {/* Show red X for rejected steps */}
                        {step.status === 'rejected' && <XCircle className="h-4 w-4 text-red-600" />}
                        {/* Show gray circle-slash for cancelled steps */}
                        {step.status === 'cancelled' && <div className="h-4 w-4 rounded-full border-2 border-gray-400 flex items-center justify-center"><span className="text-gray-400 text-xs">✕</span></div>}
                        {/* Demo cards specific icons */}
                        {step.status === 'completed' && document.id === 'DOC-003' && step.name === 'Principal Review' && <XCircle className="h-4 w-4 text-red-600" />}
                        {step.status === 'completed' && document.id === 'DOC-002' && step.name === 'Academic Committee' && <XCircle className="h-4 w-4 text-red-600" />}
                        {step.status === 'completed' && document.id === 'DOC-002' && step.name === 'Department Review' && <CircleCheckBig className="h-4 w-4 text-green-600" />}
                        {/* Regular completed steps */}
                        {step.status === 'completed' && !(document.id === 'DOC-003' && step.name === 'Principal Review') && !(document.id === 'DOC-002' && step.name === 'Academic Committee') && !(document.id === 'DOC-002' && step.name === 'Department Review') && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {/* Current and pending steps */}
                        {step.status === 'current' && <Clock className="h-4 w-4 text-blue-600" />}
                        {step.status === 'pending' && <div className="h-4 w-4 rounded-full border border-gray-300" />}
                        <div className="flex-1">
                          <div className={`${step.status === 'current' ? 'font-semibold' : ''}`}>
                            {step.name}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">{step.assignee}</div>
                            {document.id === 'DOC-DEMO' && step.name === 'HOD Review' && (
                              <Badge variant="destructive" className="text-xs">
                                Escalated 2x
                              </Badge>
                            )}
                            {document.id === 'DOC-002' && step.name === 'Department Review' && (
                              <Badge variant="destructive" className="text-xs">
                                Escalated 1x
                              </Badge>
                            )}
                            {document.id === 'DOC-002' && step.name === 'Academic Committee' && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                                BYPASS
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Signature Status */}
                  {document.requiresSignature && (
                    <div className="flex items-center gap-2 text-sm">
                      <Signature className="h-4 w-4" />
                      {document.signedBy && document.signedBy.length > 0 ? (
                        <>
                          <span>{isEmergency ? 'Signed by Recipient' : `Signed by ${document.signedBy.length} Recipient${document.signedBy.length > 1 ? 's' : ''}`}</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            {isEmergency ? 'Signature' : `${document.signedBy.length} Signature${document.signedBy.length > 1 ? 's' : ''}`}
                          </Badge>
                        </>
                      ) : (
                        <>
                          <span>Signed by Recipients</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            Signature
                          </Badge>
                        </>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  {(document as any).description && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-sm font-medium">Description</span>
                      </div>
                      <div className="bg-muted p-3 rounded text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">{document.submittedBy}</span>
                          <span className="text-muted-foreground">{document.submittedDate}</span>
                        </div>
                        <p>{(document as any).description}</p>
                      </div>
                    </div>
                  )}

                  {/* Comments */}
                  {((document.comments && document.comments.length > 0) || (approvalComments[document.id] && approvalComments[document.id].length > 0)) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-sm font-medium">Comments</span>
                      </div>
                      {/* Original comments */}
                      {document.comments && document.comments.map((comment, index) => (
                        <div key={`original-${index}`} className="bg-muted p-3 rounded text-sm">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">{comment.author}</span>
                            <span className="text-muted-foreground">{comment.date}</span>
                          </div>
                          <p>{comment.message}</p>
                        </div>
                      ))}
                      {/* Approval comments from Approval Center */}
                      {approvalComments[document.id] && approvalComments[document.id].map((comment, index) => (
                        <div key={`approval-${index}`} className="bg-muted p-3 rounded text-sm">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">{comment.author}</span>
                            <span className="text-muted-foreground">{comment.date}</span>
                          </div>
                          <p>{comment.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 min-w-[150px]">
                  <Button variant="outline" size="sm" onClick={() => handleRemove(document.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                  <Button variant="outline" size="sm" onClick={async () => {
                    const documentFiles = (document as any).files;
                    
                    // Check if document has multiple uploaded files
                    if (documentFiles && documentFiles.length > 0) {
                      try {
                        console.log('📄 [Track Documents] Reconstructing files:', documentFiles.length, 'files');
                        // Reconstruct all files from base64
                        const reconstructedFiles: File[] = [];
                        
                        for (const file of documentFiles) {
                          const fileName = file.name || 'Unknown File';
                          const fileType = file.type || 'application/octet-stream';
                          const fileData = file.data || file;
                          
                          console.log('🔄 [Track Documents] Processing file:', {
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
                              
                              console.log('📦 [Track Documents] Decoding base64:', {
                                mimeType: mimeType,
                                base64Length: base64Data.length
                              });
                              
                              // Convert base64 to binary
                              const binaryString = atob(base64Data);
                              const bytes = new Uint8Array(binaryString.length);
                              for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                              }
                              
                              // Validate JPEG files with is-jpg
                              if (mimeType === 'image/jpeg' || mimeType === 'image/jpg' || 
                                  fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg')) {
                                
                                console.log('🔍 [Track Documents] Validating JPEG with is-jpg:', fileName);
                                const isValidJpg = isJpg(bytes);
                                
                                if (!isValidJpg) {
                                  console.error('❌ [Track Documents] Invalid JPEG detected:', {
                                    fileName,
                                    size: bytes.length,
                                    firstBytes: Array.from(bytes.slice(0, 10)),
                                    lastBytes: Array.from(bytes.slice(-10))
                                  });
                                  throw new Error(`Invalid JPEG file: ${fileName}. The file signature does not match JPEG format.`);
                                }
                                
                                console.log('✅ [Track Documents] JPEG validation passed for:', fileName);
                              }
                              
                              // Create blob with correct MIME type
                              const blob = new Blob([bytes], { type: mimeType });
                              const reconstructedFile = new File([blob], fileName, { type: mimeType });
                              
                              console.log('✅ [Track Documents] File reconstructed:', {
                                name: fileName,
                                size: reconstructedFile.size,
                                type: reconstructedFile.type
                              });
                              
                              reconstructedFiles.push(reconstructedFile);
                            } catch (err) {
                              console.error('❌ [Track Documents] Failed to reconstruct file:', fileName, err);
                              toast({
                                title: "File Error",
                                description: `Failed to load ${fileName}`,
                                variant: "destructive"
                              });
                            }
                          } else if (fileData instanceof File) {
                            reconstructedFiles.push(fileData);
                          }
                        }
                        
                        // Attach signature metadata to files if document has signatures
                        if ((document as any).signatureMetadata && reconstructedFiles.length > 0) {
                          console.log('🖊️ [Track Documents] Attaching signature metadata to files:', (document as any).signatureMetadata);
                          reconstructedFiles.forEach(file => {
                            (file as any).signatureMetadata = (document as any).signatureMetadata;
                          });
                        }
                        
                        // Use multi-file viewer if available and has multiple files
                        if (reconstructedFiles.length > 1 && onViewFiles) {
                          onViewFiles(reconstructedFiles);
                        } else if (reconstructedFiles.length > 0 && onViewFile) {
                          onViewFile(reconstructedFiles[0]);
                        }
                      } catch (error) {
                        console.error('Error reconstructing files:', error);
                        toast({
                          title: "Error",
                          description: "Failed to load files",
                          variant: "destructive"
                        });
                      }
                    } else if (onViewFile) {
                      // Fallback to creating a demo HTML file for mock documents
                      const file = createDocumentFile(document);
                      onViewFile(file);
                    }
                  }}>
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={async () => {
                    const documentFiles = (document as any).files;
                    
                    // Download actual files if available
                    if (documentFiles && documentFiles.length > 0) {
                      try {
                        console.log('📥 [Track Documents] Starting download for', documentFiles.length, 'files');
                        
                        for (const file of documentFiles) {
                          const fileName = file.name || 'document';
                          const fileType = file.type || 'application/octet-stream';
                          const fileData = file.data || file;
                          
                          console.log('📄 [Track Documents] Downloading file:', {
                            name: fileName,
                            type: fileType,
                            hasData: !!fileData,
                            dataType: typeof fileData
                          });
                          
                          // If file has base64 data, reconstruct and download
                          if (typeof fileData === 'string' && fileData.startsWith('data:')) {
                            try {
                              // Parse the data URL
                              const matches = fileData.match(/^data:([^;]+);base64,(.+)$/);
                              if (matches && matches.length === 3) {
                                const mimeType = matches[1];
                                const base64Data = matches[2];
                                
                                // Convert base64 to binary
                                const byteCharacters = atob(base64Data);
                                const byteNumbers = new Array(byteCharacters.length);
                                for (let i = 0; i < byteCharacters.length; i++) {
                                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                                }
                                const byteArray = new Uint8Array(byteNumbers);
                                const blob = new Blob([byteArray], { type: mimeType });
                                
                                // Create download link
                                const url = URL.createObjectURL(blob);
                                const link = window.document.createElement('a');
                                link.href = url;
                                link.download = fileName;
                                window.document.body.appendChild(link);
                                link.click();
                                window.document.body.removeChild(link);
                                URL.revokeObjectURL(url);
                                
                                console.log('✅ [Track Documents] File downloaded:', fileName);
                              } else {
                                console.error('❌ [Track Documents] Invalid data URL format for:', fileName);
                              }
                            } catch (err) {
                              console.error('❌ [Track Documents] Failed to download file:', fileName, err);
                            }
                          } else if (fileData instanceof File || fileData instanceof Blob) {
                            // If it's already a File or Blob object, download directly
                            const url = URL.createObjectURL(fileData);
                            const link = window.document.createElement('a');
                            link.href = url;
                            link.download = fileName;
                            window.document.body.appendChild(link);
                            link.click();
                            window.document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                            
                            console.log('✅ [Track Documents] File downloaded:', fileName);
                          }
                        }
                        
                        toast({
                          title: "Download Complete",
                          description: `${documentFiles.length} file(s) downloaded successfully`,
                        });
                      } catch (error) {
                        console.error('❌ [Track Documents] Download failed:', error);
                        toast({
                          title: "Download Failed",
                          description: "Failed to download files",
                          variant: "destructive"
                        });
                      }
                    } else {
                      // Fallback: download HTML document for demo documents without files
                      const htmlFile = createDocumentFile(document);
                      const url = URL.createObjectURL(htmlFile);
                      const link = window.document.createElement('a');
                      link.href = url;
                      link.download = htmlFile.name;
                      link.click();
                      URL.revokeObjectURL(url);
                      
                      toast({
                        title: "Download Started",
                        description: `${document.title} downloaded as HTML`,
                      });
                    }
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>


                  
                  {userRole === 'Principal' || userRole === 'Registrar' || userRole === 'HOD' ? (
                    <>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            onClick={() => setSelectedDocument(document)}
                            disabled={document.status === 'approved' || document.status === 'rejected'}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Review & Approve Document</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <Label>Document</Label>
                                <p>{document.title}</p>
                              </div>
                              <div>
                                <Label>Type</Label>
                                <p>{document.type}</p>
                              </div>
                              <div>
                                <Label>Submitted By</Label>
                                <p>{document.submittedBy}</p>
                              </div>
                              <div>
                                <Label>Date</Label>
                                <p>{document.submittedDate}</p>
                              </div>
                            </div>

                            {document.requiresSignature && (
                              <div>
                                <Label className="text-base font-semibold">Digital Signature Required</Label>
                                <DigitalSignature 
                                  userRole={userRole}
                                  userName={currentUserProfile.name}
                                  onSignatureCapture={handleSignatureCapture}
                                />
                              </div>
                            )}

                            <div>
                              <Label htmlFor="comment">Add Comment (Optional)</Label>
                              <Textarea
                                id="comment"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Add your review comments here..."
                                className="mt-2"
                              />
                            </div>

                            <div className="flex gap-2 justify-end">
                              <Button 
                                variant="outline" 
                                onClick={() => handleReject(document.id)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                              <Button onClick={() => handleApprove(document.id)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
          );
        })}
        
        {filteredDocuments.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Documents Found</h3>
              <p className="text-muted-foreground">
                No documents match your current search and filter criteria.
              </p>
            </CardContent>
          </Card>
        )}
      </div>



    </div>
  );
};