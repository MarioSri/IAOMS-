import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecipientSelector } from "@/components/RecipientSelector";
import { 
  AlertTriangle, 
  Siren, 
  Zap, 
  Clock, 
  Users, 
  FileText, 
  Send,
  Shield,
  Bell,
  CheckCircle2,
  XCircle,
  Eye,
  History,
  Upload,
  X,
  File,
  AlertCircle,
  Settings,
  Mail,
  Phone,
  Smartphone,
  MessageCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { WatermarkFeature } from "@/components/WatermarkFeature";
import { useAuth } from "@/contexts/AuthContext";
import { Siren as SirenIcon } from "lucide-react";
import { FileViewer } from "@/components/FileViewer";
import { NotificationBehaviorPreview } from "@/components/NotificationBehaviorPreview";
import type { EmergencyNotificationSettings } from "@/services/EmergencyNotificationService";

interface EmergencySubmission {
  id: string;
  title: string;
  description: string;
  reason: string;
  urgencyLevel: 'medium' | 'urgent' | 'high' | 'critical';
  recipients: string[];
  submittedBy: string;
  submittedAt: Date;
  status: 'submitted' | 'acknowledged' | 'resolved' | 'rejected' | 'escalated';
  responseTime?: number;
  escalationLevel: number;
  currentRecipientIndex?: number;
  originalRecipients?: string[];
  rejectedBy?: string;
  escalationStopped?: boolean;
}

interface EmergencyWorkflowInterfaceProps {
  userRole: string;
}

export const EmergencyWorkflowInterface: React.FC<EmergencyWorkflowInterfaceProps> = ({ userRole }) => {
  const { user } = useAuth();
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [viewingFile, setViewingFile] = useState<File | null>(null);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [emergencyData, setEmergencyData] = useState({
    title: '',
    description: '',
    reason: '',
    urgencyLevel: 'medium' as const,
    documentTypes: [] as string[],
    uploadedFiles: [] as File[],
    attachments: [] as File[],
    autoEscalation: false,
    escalationTimeout: 24,
    escalationTimeUnit: 'hours' as 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months',
    cyclicEscalation: true
  });
  const [useProfileDefaults, setUseProfileDefaults] = useState(true);
  const [overrideNotifications, setOverrideNotifications] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: false,
    emailInterval: '15',
    emailUnit: 'minutes' as 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months',
    smsAlerts: false,
    smsInterval: '30',
    smsUnit: 'minutes' as 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months',
    pushNotifications: false,
    pushInterval: '5',
    pushUnit: 'minutes' as 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months',
    whatsappNotifications: false,
    whatsappInterval: '1',
    whatsappUnit: 'hours' as 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months',
    notificationLogic: 'document' as 'document' | 'recipient'
  });
  const [recipientNotifications, setRecipientNotifications] = useState<{[key: string]: typeof notificationSettings}>({});
  const [openRecipients, setOpenRecipients] = useState<{[key: string]: boolean}>({});
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [documentAssignments, setDocumentAssignments] = useState<{[key: string]: string[]}>({});
  const [showRecipientSelection, setShowRecipientSelection] = useState(false);
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [pendingSubmissionData, setPendingSubmissionData] = useState<any>(null);
  const [finalSelectedRecipients, setFinalSelectedRecipients] = useState<string[]>([]);
  const [useSmartDelivery, setUseSmartDelivery] = useState(false);
  const [emergencyHistory, setEmergencyHistory] = useState<EmergencySubmission[]>([
    {
      id: '1',
      title: 'Infrastructure Damage - Block A',
      description: 'Severe water leakage affecting electrical systems in Block A',
      reason: 'Infrastructure failure requiring immediate attention',
      urgencyLevel: 'critical',
      recipients: ['principal', 'registrar', 'maintenance-head'],
      submittedBy: 'Maintenance Team',
      submittedAt: new Date('2024-01-10T08:30:00'),
      status: 'resolved',
      responseTime: 45,
      escalationLevel: 2
    },
    {
      id: '2',
      title: 'Student Medical Emergency Protocol',
      description: 'Updated emergency response procedures for medical incidents',
      reason: 'Policy update requiring immediate implementation',
      urgencyLevel: 'high',
      recipients: ['all-hods', 'health-center', 'security'],
      submittedBy: 'Health Center',
      submittedAt: new Date('2024-01-08T14:15:00'),
      status: 'acknowledged',
      responseTime: 12,
      escalationLevel: 1
    }
  ]);

  const { toast } = useToast();

  const urgencyLevels = {
    medium: {
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: Clock,
      description: ''
    },
    urgent: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: AlertTriangle,
      description: ''
    },
    high: {
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: AlertTriangle,
      description: ''
    },
    critical: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: Siren,
      description: ''
    }
  };

  const documentTypeOptions = [
    { id: "letter", label: "Letter", icon: FileText },
    { id: "circular", label: "Circular", icon: File },
    { id: "report", label: "Report", icon: FileText },
  ];

  const handleDocumentTypeChange = (typeId: string, checked: boolean) => {
    if (checked) {
      setEmergencyData({...emergencyData, documentTypes: [...emergencyData.documentTypes, typeId]});
    } else {
      setEmergencyData({...emergencyData, documentTypes: emergencyData.documentTypes.filter(id => id !== typeId)});
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setEmergencyData({...emergencyData, uploadedFiles: [...emergencyData.uploadedFiles, ...files]});
  };

  const removeFile = (index: number) => {
    setEmergencyData({
      ...emergencyData, 
      uploadedFiles: emergencyData.uploadedFiles.filter((_, i) => i !== index)
    });
  };

  const handleViewFile = (file: File) => {
    // Open the file in the FileViewer modal instead of a new tab
    setViewingFile(file);
    setShowFileViewer(true);
  };

  const formatRecipientName = (recipientId: string) => {
    // Map recipient IDs to proper names with designations like other cards
    const recipientMap: {[key: string]: string} = {
      'cdc-head-dr.-cdc-head': 'Dr. CDC Head',
      'principal-dr.-robert-principal': 'Dr. Robert Smith',
      'registrar-prof.-sarah-registrar': 'Prof. Sarah Registrar',
      'hod-dr.-cse-hod': 'Prof. Michael Chen',
      'hod-dr.-ece-hod': 'Ms. Lisa Wang',
      'program-department-head-prof.-cse-head': 'Prof. James Wilson',
      'dean-dr.-maria-dean': 'Dr. Maria Garcia',
      'hod-dr.-eee-hod': 'Dr. EEE HOD',
      'hod-dr.-mech-hod': 'Dr. MECH HOD',
      'hod-dr.-csm-hod': 'Dr. CSM HOD',
      'hod-dr.-cso-hod': 'Dr. CSO HOD',
      'hod-dr.-csd-hod': 'Dr. CSD HOD',
      'hod-dr.-csc-hod': 'Dr. CSC HOD'
    };
    
    return recipientMap[recipientId] || recipientId.split('-').slice(-2).join(' ').replace(/\./g, '');
  };

  const createEmergencyDocumentCard = async (emergencyDoc: any, recipientsToSend: string[]) => {
    // Convert files to base64 for localStorage storage
    const convertFilesToBase64 = async (files: File[]) => {
      const filePromises = files.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              name: file.name,
              size: file.size,
              type: file.type,
              data: reader.result // base64 data URL
            });
          };
          reader.readAsDataURL(file);
        });
      });
      return Promise.all(filePromises);
    };

    const serializedFiles = emergencyData.uploadedFiles.length > 0 
      ? await convertFilesToBase64(emergencyData.uploadedFiles)
      : [];

    // Create emergency document card for Track Documents page
    const emergencyCard = {
      id: emergencyDoc.id,
      title: emergencyDoc.title,
      type: emergencyData.documentTypes.includes('circular') ? 'Circular' : 
            emergencyData.documentTypes.includes('report') ? 'Report' : 'Letter',
      submittedBy: user?.fullName || user?.name || userRole,
      submittedByDesignation: userRole,
      submittedDate: new Date().toISOString().split('T')[0],
      status: 'submitted',
      priority: emergencyDoc.urgencyLevel,
      isEmergency: true,
      workflow: {
        currentStep: 'Submission',
        progress: 0,
        steps: [
          { 
            name: 'Submission', 
            status: 'completed', 
            assignee: user?.fullName || user?.name || userRole, 
            completedDate: new Date().toISOString().split('T')[0] 
          },
          ...recipientsToSend.map((recipient, index) => ({
            name: formatRecipientName(recipient),
            status: index === 0 ? 'current' : 'pending',
            assignee: formatRecipientName(recipient)
          }))
        ]
      },
      requiresSignature: true,
      signedBy: [user?.fullName || user?.name || userRole],
      description: emergencyDoc.description,
      recipients: recipientsToSend,
      files: serializedFiles, // Store base64 serialized files
      emergencyFeatures: {
        autoEscalation: emergencyData.autoEscalation,
        escalationTimeout: emergencyData.escalationTimeout,
        escalationTimeUnit: emergencyData.escalationTimeUnit,
        notificationSettings: useProfileDefaults ? 'profile-based' : 'emergency-override',
        smartDelivery: useSmartDelivery,
        assignedDocuments: documentAssignments
      },
      comments: [{
        author: user?.fullName || user?.name || userRole,
        date: new Date().toISOString().split('T')[0],
        message: `Emergency document submitted with ${emergencyDoc.urgencyLevel} priority. ${emergencyData.autoEscalation ? 'Auto-escalation enabled.' : ''}`
      }]
    };

    // Save to submitted documents for Track Documents page
    const existingDocs = JSON.parse(localStorage.getItem('submitted-documents') || '[]');
    existingDocs.unshift(emergencyCard);
    localStorage.setItem('submitted-documents', JSON.stringify(existingDocs));

    // Create approval card for Approval Center page
    const approvalCard = {
      id: emergencyDoc.id,
      title: emergencyDoc.title,
      type: emergencyData.documentTypes.includes('circular') ? 'Circular' : 
            emergencyData.documentTypes.includes('report') ? 'Report' : 'Letter',
      submitter: user?.fullName || user?.name || userRole,
      submittedDate: new Date().toISOString().split('T')[0],
      priority: emergencyDoc.urgencyLevel === 'critical' ? 'high' : emergencyDoc.urgencyLevel,
      description: emergencyDoc.description,
      files: serializedFiles,
      recipients: recipientsToSend,
      isEmergency: true,
      emergencyFeatures: {
        autoEscalation: emergencyData.autoEscalation,
        escalationTimeout: emergencyData.escalationTimeout,
        escalationTimeUnit: emergencyData.escalationTimeUnit,
        notificationSettings: useProfileDefaults ? 'profile-based' : 'emergency-override',
        smartDelivery: useSmartDelivery
      }
    };

    // Save to pending approvals for Approval Center page
    const existingApprovals = JSON.parse(localStorage.getItem('pending-approvals') || '[]');
    existingApprovals.unshift(approvalCard);
    localStorage.setItem('pending-approvals', JSON.stringify(existingApprovals));

    // Trigger real-time update for Track Documents page
    window.dispatchEvent(new CustomEvent('emergency-document-created', { 
      detail: { document: emergencyCard } 
    }));

    // Trigger real-time update for Approval Center page
    window.dispatchEvent(new CustomEvent('approval-card-created', { 
      detail: { approval: approvalCard } 
    }));

    return emergencyCard;
  };

  const handleEmergencySubmit = async () => {
    const recipientsToSend = selectedRecipients;
    
    if (!emergencyData.title || !emergencyData.description || selectedRecipients.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select recipients",
        variant: "destructive"
      });
      return;
    }

    // Create emergency document directly without opening watermark modal
    const emergencyDocument = {
      id: Date.now().toString(),
      title: emergencyData.title,
      description: emergencyData.description,
      urgencyLevel: emergencyData.urgencyLevel,
      submittedBy: userRole,
      autoEscalation: emergencyData.autoEscalation,
      escalationTimeout: emergencyData.escalationTimeout,
      escalationTimeUnit: emergencyData.escalationTimeUnit,
      cyclicEscalation: emergencyData.cyclicEscalation
    };

    // Create emergency document card for Track Documents and approval card for Approval Center
    const emergencyCard = await createEmergencyDocumentCard(emergencyDocument, recipientsToSend);

    // Prepare notification settings
    const emergencyNotificationSettings = {
      useProfileDefaults,
      overrideForEmergency: overrideNotifications,
      notificationStrategy: notificationSettings.notificationLogic,
      channels: [
        { type: 'email' as const, enabled: notificationSettings.emailNotifications, interval: parseInt(notificationSettings.emailInterval), unit: notificationSettings.emailUnit },
        { type: 'sms' as const, enabled: notificationSettings.smsAlerts, interval: parseInt(notificationSettings.smsInterval), unit: notificationSettings.smsUnit },
        { type: 'push' as const, enabled: notificationSettings.pushNotifications, interval: parseInt(notificationSettings.pushInterval), unit: notificationSettings.pushUnit },
        { type: 'whatsapp' as const, enabled: notificationSettings.whatsappNotifications, interval: parseInt(notificationSettings.whatsappInterval), unit: notificationSettings.whatsappUnit }
      ].filter(channel => channel.enabled),
      schedulingOptions: {
        interval: parseInt(notificationSettings.emailInterval),
        unit: notificationSettings.emailUnit
      }
    };

    // Send emergency notifications using the service
    try {
      const { emergencyNotificationService } = await import('@/services/EmergencyNotificationService');
      await emergencyNotificationService.sendEmergencyNotification(
        recipientsToSend,
        emergencyDocument,
        emergencyNotificationSettings
      );

      // Initialize escalation if enabled
      if (emergencyData.autoEscalation) {
        emergencyNotificationService.initializeEscalation(emergencyDocument, recipientsToSend);
      }

      // Create submission record
      const newSubmission: EmergencySubmission = {
        id: emergencyDocument.id,
        title: emergencyData.title,
        description: emergencyData.description,
        reason: '',
        urgencyLevel: emergencyData.urgencyLevel,
        recipients: recipientsToSend,
        submittedBy: userRole,
        submittedAt: new Date(),
        status: 'submitted',
        escalationLevel: 0,
        currentRecipientIndex: 0,
        originalRecipients: [...recipientsToSend],
        escalationStopped: false
      };

      setEmergencyHistory([newSubmission, ...emergencyHistory]);
      
      // Create channel for emergency collaboration
      const channelName = `Emergency: ${emergencyData.title.substring(0, 25)}${emergencyData.title.length > 25 ? '...' : ''}`;
      const newChannel = {
        id: `emergency-${newSubmission.id}`,
        name: channelName,
        members: [userRole, ...recipientsToSend],
        isPrivate: true,
        createdAt: new Date().toISOString(),
        createdBy: userRole,
        emergencyId: newSubmission.id,
        emergencyTitle: emergencyData.title,
        urgencyLevel: emergencyData.urgencyLevel
      };
      
      // Save channel to localStorage
      const existingChannels = JSON.parse(localStorage.getItem('document-channels') || '[]');
      existingChannels.unshift(newChannel);
      localStorage.setItem('document-channels', JSON.stringify(existingChannels));
      
      // Reset form
      resetEmergencyForm();

      // Show additional confirmation for approval card creation
      setTimeout(() => {
        toast({
          title: "Approval Card Ready",
          description: `Recipients can now view and approve the emergency document in Approval Center → Pending Approvals section`,
          variant: "default"
        });
      }, 4000);

      // Show success notification
      const notificationBehavior = useProfileDefaults ? 'profile-based' : 'emergency override';
      toast({
        title: "EMERGENCY SUBMITTED",
        description: `Emergency document card created and sent to ${recipientsToSend.length} recipients using ${notificationBehavior} notifications`,
        duration: 10000,
      });

      // Show delivery confirmation
      setTimeout(() => {
        toast({
          title: "Cards Created Successfully",
          description: `Emergency document card is now visible in Track Documents and approval card created in Approval Center → Pending Approvals`,
          variant: "default"
        });
      }, 2000);

    } catch (error) {
      console.error('Emergency notification failed:', error);
      toast({
        title: "Notification Error",
        description: "Failed to send emergency notifications. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const resetEmergencyForm = () => {
    setEmergencyData({
      title: '',
      description: '',
      reason: '',
      urgencyLevel: 'medium',
      documentTypes: [],
      uploadedFiles: [],
      attachments: [],
      autoEscalation: false,
      escalationTimeout: 24,
      escalationTimeUnit: 'hours' as 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months',
      cyclicEscalation: true
    });
    setSelectedRecipients([]);
    setUseSmartDelivery(false);
    setIsEmergencyMode(false);
  };
  
  const handleWatermarkComplete = async () => {
    setShowWatermarkModal(false);
    
    if (pendingSubmissionData) {
      const recipientsToSend = selectedRecipients;
      
      const emergencyDoc = {
        id: Date.now().toString(),
        title: pendingSubmissionData.title,
        description: pendingSubmissionData.description,
        urgencyLevel: pendingSubmissionData.urgencyLevel,
        submittedBy: userRole,
        autoEscalation: emergencyData.autoEscalation,
        escalationTimeout: emergencyData.escalationTimeout,
        escalationTimeUnit: emergencyData.escalationTimeUnit,
        cyclicEscalation: emergencyData.cyclicEscalation
      };

      // Create emergency document card for Track Documents and approval card for Approval Center
      const emergencyCard = await createEmergencyDocumentCard(emergencyDoc, recipientsToSend);

      // Initialize escalation if enabled
      if (emergencyData.autoEscalation) {
        import('@/services/EmergencyNotificationService').then(({ emergencyNotificationService }) => {
          emergencyNotificationService.initializeEscalation(emergencyDoc, recipientsToSend);
        });
      }

      const newSubmission: EmergencySubmission = {
        id: emergencyDoc.id,
        title: pendingSubmissionData.title,
        description: pendingSubmissionData.description,
        reason: '',
        urgencyLevel: pendingSubmissionData.urgencyLevel,
        recipients: recipientsToSend,
        submittedBy: userRole,
        submittedAt: new Date(),
        status: 'submitted',
        escalationLevel: 0,
        currentRecipientIndex: 0,
        originalRecipients: [...recipientsToSend],
        escalationStopped: false
      };

      setEmergencyHistory([newSubmission, ...emergencyHistory]);
      
      setPendingSubmissionData(null);
      resetEmergencyForm();

      toast({
        title: "EMERGENCY SUBMITTED",
        description: `Emergency document card with watermark created and sent to ${recipientsToSend.length} recipient(s). Approval card created in Approval Center.`,
        duration: 10000,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      submitted: { variant: "destructive" as const, text: "Submitted", icon: Siren },
      acknowledged: { variant: "warning" as const, text: "Acknowledged", icon: Eye },
      resolved: { variant: "success" as const, text: "Resolved", icon: CheckCircle2 }
    };
    return variants[status as keyof typeof variants] || { variant: "default" as const, text: status, icon: AlertTriangle };
  };

  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime <= 15) return 'text-success';
    if (responseTime <= 60) return 'text-warning';
    return 'text-destructive';
  };

  // Handle document rejection - stops escalation
  const handleDocumentRejection = async (documentId: string, rejectedBy: string) => {
    try {
      const { emergencyNotificationService } = await import('@/services/EmergencyNotificationService');
      emergencyNotificationService.handleDocumentRejection(documentId, rejectedBy);
      
      // Update emergency history
      setEmergencyHistory(prev => prev.map(item => 
        item.id === documentId 
          ? { ...item, status: 'rejected' as const, rejectedBy, escalationStopped: true }
          : item
      ));
      
      toast({
        title: "Document Rejected",
        description: "Escalation has been stopped due to rejection.",
        variant: "destructive"
      });
    } catch (error) {
      console.error('Error handling document rejection:', error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Emergency Header */}
      <Card className={`shadow-elegant ${isEmergencyMode ? 'border-destructive bg-red-50' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Siren className={`w-6 h-6 ${isEmergencyMode ? 'text-destructive animate-pulse' : 'text-primary'}`} />
              Emergency Workflow
            </CardTitle>
            
            <Button
              onClick={() => setIsEmergencyMode(!isEmergencyMode)}
              variant={isEmergencyMode ? "destructive" : "outline"}
              size="lg"
              className={`font-bold ${isEmergencyMode ? 'animate-pulse shadow-glow' : ''}`}
            >
              {isEmergencyMode ? (
                <>
                  <XCircle className="w-5 h-5 mr-2" />
                  Cancel Emergency
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  ACTIVATE EMERGENCY
                </>
              )}
            </Button>
          </div>
          
          {isEmergencyMode && (
            <div className="bg-red-100 border border-red-200 rounded-lg p-4 mt-4">
              <div className="flex items-center gap-2 text-red-800 font-semibold mb-2">
                <Siren className="w-5 h-5" />
                EMERGENCY MODE ACTIVE
              </div>

            </div>
          )}
        </CardHeader>
      </Card>

      {/* Emergency Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-elegant border-l-4 border-l-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Siren className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">
                  {emergencyHistory.filter(e => e.status === 'submitted').length}
                </p>
                <p className="text-sm text-muted-foreground">Active Emergencies</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elegant border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">
                  {emergencyHistory.length > 0 
                    ? Math.round(emergencyHistory.reduce((acc, e) => acc + (e.responseTime || 0), 0) / emergencyHistory.length)
                    : 0
                  }m
                </p>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elegant border-l-4 border-l-success">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">
                  {emergencyHistory.filter(e => e.status === 'resolved').length}
                </p>
                <p className="text-sm text-muted-foreground">Resolved This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elegant border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">98.5%</p>
                <p className="text-sm text-muted-foreground">Response Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Emergency Submission Form */}
      {isEmergencyMode && (
        <Card className="shadow-elegant border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Emergency Document Submission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergency-title">Emergency Title</Label>
                <Input
                  id="emergency-title"
                  value={emergencyData.title}
                  onChange={(e) => setEmergencyData({...emergencyData, title: e.target.value})}
                  placeholder="Brief emergency title"
                  className="border-destructive focus:ring-destructive"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority-level">Priority Level</Label>
                <Select
                  value={emergencyData.urgencyLevel}
                  onValueChange={(value: any) => setEmergencyData({...emergencyData, urgencyLevel: value})}
                >
                  <SelectTrigger className="border-destructive focus:ring-destructive">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">
                      <div className="flex items-center gap-2">
                        <Siren className="w-4 h-4 text-red-600" />
                        Critical Priority
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        High Priority
                      </div>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        Urgent Priority
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-600" />
                        Medium Priority
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Document Management Integration */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Document Details
              </h3>
              
              {/* Document Type Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Document Type</Label>
                <div className="grid grid-cols-3 gap-3">
                  {documentTypeOptions.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <div key={option.id} className="flex items-center space-x-2 p-3 border-2 border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                        <Checkbox
                          id={option.id}
                          checked={emergencyData.documentTypes.includes(option.id)}
                          onCheckedChange={(checked) => handleDocumentTypeChange(option.id, !!checked)}
                        />
                        <Label htmlFor={option.id} className="flex items-center gap-2 cursor-pointer text-red-800">
                          <IconComponent className="w-4 h-4 text-red-600" />
                          {option.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Upload Documents</Label>
                <div className="border-2 border-dashed border-red-300 bg-red-50 rounded-lg p-6">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="emergency-file-upload"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.png"
                  />
                  <label htmlFor="emergency-file-upload" className="cursor-pointer">
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-red-500 mx-auto mb-2" />
                      <p className="text-sm text-red-700 mb-1 font-medium">
                        Drag and drop emergency files or click to upload
                      </p>
                      <p className="text-xs text-red-600">
                        PDF, DOC, DOCX, TXT, JPG, PNG (Max 10MB each)
                      </p>
                    </div>
                  </label>
                </div>

                {/* Uploaded Files Display */}
                {emergencyData.uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Uploaded Files ({emergencyData.uploadedFiles.length})</Label>
                    <div className="space-y-2">
                      {emergencyData.uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-accent rounded-md">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{file.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {(file.size / 1024 / 1024).toFixed(1)} MB
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                              onClick={() => handleViewFile(file)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className="text-xs cursor-pointer hover:bg-primary/10"
                              onClick={() => setShowWatermarkModal(true)}
                            >
                              <Settings className="w-3 h-3 mr-1" />
                              Watermark
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(index)}
                            className="h-6 w-6"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Assignment Preview */}
              {emergencyData.uploadedFiles.length > 1 && selectedRecipients.length > 1 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Document Assignment</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAssignmentModal(true)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Customize Assignment
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md">
                    <p>Multiple files and recipients detected. You can customize which documents go to which recipients.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Auto-Escalation Feature */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={emergencyData.autoEscalation || false}
                  onCheckedChange={(checked) => setEmergencyData({...emergencyData, autoEscalation: checked})}
                />
                <label className="text-sm font-medium">Auto-Escalation</label>
              </div>
            </div>
            
            {emergencyData.autoEscalation && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Escalation Timeout</label>
                  <Input
                    type="number"
                    value={emergencyData.escalationTimeout || 24}
                    onChange={(e) => setEmergencyData({...emergencyData, escalationTimeout: Number(e.target.value)})}
                    min={1}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Time Unit</label>
                  <Select
                    value={emergencyData.escalationTimeUnit}
                    onValueChange={(value: any) => setEmergencyData({...emergencyData, escalationTimeUnit: value})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seconds">Seconds</SelectItem>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="weeks">Weeks</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Notification Alert Options */}
            <div className="space-y-4 p-4 border-2 border-orange-200 rounded-lg bg-orange-50">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-600" />
                Emergency Notification Settings
              </h3>
              
              {/* Notification Behavior Options */}
              <div className="space-y-3">
                <h4 className="font-semibold text-base">🔔 Notification Behavior Options</h4>
                
                {/* Use Profile Defaults */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Receive Notifications Based on Selected Recipients' Profile Settings</p>
                      <p className="text-sm text-muted-foreground">Each selected recipient receives one-time notifications through all channels (Email, SMS, Push, WhatsApp) - no recurring notifications</p>
                    </div>
                  </div>
                  <Switch
                    checked={useProfileDefaults}
                    onCheckedChange={(checked) => {
                      setUseProfileDefaults(checked);
                      if (checked) setOverrideNotifications(false);
                    }}
                  />
                </div>

                {/* Override for Emergency */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-medium">Override for Emergency (Takes Priority)</p>
                      <p className="text-sm text-muted-foreground">Manually define emergency-specific notification channels and custom scheduling for alerts</p>
                    </div>
                  </div>
                  <Switch
                    checked={overrideNotifications}
                    onCheckedChange={(checked) => {
                      setOverrideNotifications(checked);
                      if (checked) setUseProfileDefaults(false);
                    }}
                  />
                </div>
              </div>

              {/* Custom Notification Settings */}
              {overrideNotifications && !useProfileDefaults && (
                <div className="space-y-4 p-4 bg-white rounded-lg border">
                  {/* ⏱️ Scheduling Options */}
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-base font-semibold">⏱️ Scheduling Options</h4>
                    <p className="text-sm text-muted-foreground">Support customizable scheduling intervals for emergency notifications</p>
                  </div>

                  {/* Notification Strategy */}
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-base font-medium">Override Configuration</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            id="logic-recipient"
                            name="notification-logic"
                            checked={notificationSettings.notificationLogic === 'recipient'}
                            onChange={() => setNotificationSettings({...notificationSettings, notificationLogic: 'recipient'})}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="logic-recipient" className="cursor-pointer flex-1">
                            <span className="font-medium">Recipient-Based (Recommended)</span>
                            <p className="text-xs text-muted-foreground mt-1">Send notifications based on individual recipient roles and responsibilities</p>
                          </Label>
                        </div>
                        {notificationSettings.notificationLogic === 'recipient' && selectedRecipients.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCustomizeModal(true)}
                            className="ml-2"
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Customize Recipients
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            id="logic-document"
                            name="notification-logic"
                            checked={notificationSettings.notificationLogic === 'document'}
                            onChange={() => setNotificationSettings({...notificationSettings, notificationLogic: 'document'})}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="logic-document" className="cursor-pointer flex-1">
                            <span className="font-medium">Document-Based</span>
                            <p className="text-xs text-muted-foreground mt-1">Send the same type of notification uniformly to all recipients</p>
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Alert Channels - Show when Document-Based is selected */}
                  {notificationSettings.notificationLogic === 'document' && (
                    <>
                      {/* Alert Channels Title */}
                      <div className="pt-4 border-t">
                        <h4 className="text-base font-semibold mb-4">Alert Channels</h4>
                      </div>
                      {/* Email Notifications */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Email Notifications</p>
                              <p className="text-sm text-muted-foreground">Receive updates via email</p>
                            </div>
                          </div>
                          <Switch
                            checked={notificationSettings.emailNotifications}
                            onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, emailNotifications: checked})}
                          />
                        </div>
                        {notificationSettings.emailNotifications && (
                          <div className="grid grid-cols-2 gap-3 ml-8">
                            <select
                              value={`${notificationSettings.emailInterval}-${notificationSettings.emailUnit}`}
                              onChange={(e) => {
                                const [interval, unit] = e.target.value.split('-');
                                setNotificationSettings({...notificationSettings, emailInterval: interval, emailUnit: unit as any});
                              }}
                              className="h-10 px-3 py-2 border rounded-md"
                            >
                              <option value="1-minutes">Every 1 minute</option>
                              <option value="15-minutes">Every 15 minutes</option>
                              <option value="1-hours">Hourly</option>
                              <option value="1-days">Daily</option>
                              <option value="1-weeks">Weekly</option>
                            </select>
                            <Input
                              type="number"
                              value={notificationSettings.emailInterval}
                              onChange={(e) => setNotificationSettings({...notificationSettings, emailInterval: e.target.value})}
                              min={1}
                              placeholder="Custom (X)"
                            />
                          </div>
                        )}
                      </div>

                      {/* SMS Alerts */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-3">
                            <Phone className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">SMS Alerts</p>
                              <p className="text-sm text-muted-foreground">Critical updates via SMS</p>
                            </div>
                          </div>
                          <Switch
                            checked={notificationSettings.smsAlerts}
                            onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, smsAlerts: checked})}
                          />
                        </div>
                        {notificationSettings.smsAlerts && (
                          <div className="grid grid-cols-2 gap-3 ml-8">
                            <Input
                              type="number"
                              value={notificationSettings.smsInterval}
                              onChange={(e) => setNotificationSettings({...notificationSettings, smsInterval: e.target.value})}
                              min={1}
                              placeholder="Interval"
                            />
                            <Select
                              value={notificationSettings.smsUnit}
                              onValueChange={(value: any) => setNotificationSettings({...notificationSettings, smsUnit: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="seconds">Seconds</SelectItem>
                                <SelectItem value="minutes">Minutes</SelectItem>
                                <SelectItem value="hours">Hours</SelectItem>
                                <SelectItem value="days">Days</SelectItem>
                                <SelectItem value="weeks">Weeks</SelectItem>
                                <SelectItem value="months">Months</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      {/* Push Notifications */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-3">
                            <Smartphone className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Push Notifications</p>
                              <p className="text-sm text-muted-foreground">Browser and mobile notifications</p>
                            </div>
                          </div>
                          <Switch
                            checked={notificationSettings.pushNotifications}
                            onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, pushNotifications: checked})}
                          />
                        </div>
                        {notificationSettings.pushNotifications && (
                          <div className="grid grid-cols-2 gap-3 ml-8">
                            <Input
                              type="number"
                              value={notificationSettings.pushInterval}
                              onChange={(e) => setNotificationSettings({...notificationSettings, pushInterval: e.target.value})}
                              min={1}
                              placeholder="Interval"
                            />
                            <Select
                              value={notificationSettings.pushUnit}
                              onValueChange={(value: any) => setNotificationSettings({...notificationSettings, pushUnit: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="seconds">Seconds</SelectItem>
                                <SelectItem value="minutes">Minutes</SelectItem>
                                <SelectItem value="hours">Hours</SelectItem>
                                <SelectItem value="days">Days</SelectItem>
                                <SelectItem value="weeks">Weeks</SelectItem>
                                <SelectItem value="months">Months</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      {/* WhatsApp Notifications */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-3">
                            <MessageCircle className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="font-medium">WhatsApp Notifications</p>
                              <p className="text-sm text-muted-foreground">Receive updates via WhatsApp</p>
                            </div>
                          </div>
                          <Switch
                            checked={notificationSettings.whatsappNotifications}
                            onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, whatsappNotifications: checked})}
                          />
                        </div>
                        {notificationSettings.whatsappNotifications && (
                          <div className="grid grid-cols-2 gap-3 ml-8">
                            <Input
                              type="number"
                              value={notificationSettings.whatsappInterval}
                              onChange={(e) => setNotificationSettings({...notificationSettings, whatsappInterval: e.target.value})}
                              min={1}
                              placeholder="Interval"
                            />
                            <Select
                              value={notificationSettings.whatsappUnit}
                              onValueChange={(value: any) => setNotificationSettings({...notificationSettings, whatsappUnit: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="seconds">Seconds</SelectItem>
                                <SelectItem value="minutes">Minutes</SelectItem>
                                <SelectItem value="hours">Hours</SelectItem>
                                <SelectItem value="days">Days</SelectItem>
                                <SelectItem value="weeks">Weeks</SelectItem>
                                <SelectItem value="months">Months</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                </div>
              )}

              {/* ⚙️ Behavior Summary */}
              <div className="space-y-3 pt-4 border-t">
                <h4 className="text-base font-semibold">⚙️ Behavior Summary</h4>
                {useProfileDefaults && (
                  <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <div>
                      <p className="font-medium">One-Time Notification Mode Active</p>
                      <p className="text-xs">Recipients will receive notifications only once through all available channels (Email, SMS, Push, WhatsApp)</p>
                    </div>
                  </div>
                )}
                {overrideNotifications && (
                  <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <div>
                      <p className="font-medium">Emergency Override Active</p>
                      <p className="text-xs">Default preferences are bypassed. Emergency alerts will follow manually configured settings, ensuring critical updates reach recipients immediately through selected channels.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Smart Recipient Delivery Option */}
            {selectedRecipients.length > 1 && (
              <div className="space-y-3 p-4 border rounded-lg bg-blue-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={useSmartDelivery}
                      onCheckedChange={setUseSmartDelivery}
                    />
                    <Label className="text-base font-medium cursor-pointer" onClick={() => setUseSmartDelivery(!useSmartDelivery)}>
                      Use Smart Recipient Delivery Option
                    </Label>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {selectedRecipients.length} Recipients Selected
                  </Badge>
                </div>
                
                {useSmartDelivery && (
                  <>
                    <div className="text-sm text-blue-700 bg-blue-100 p-3 rounded-md">
                      <p className="font-medium mb-1">Purpose:</p>
                      <p className="mb-2">This feature allows users to control how emergency documents are distributed to multiple recipients efficiently and instantly. It ensures that documents are sent simultaneously to selected users without any delay or sequential sending.</p>
                      <p className="font-medium mb-1">User Benefit:</p>
                      <p>This feature helps users save time, ensures faster emergency communication, and allows targeted delivery of urgent documents to the right people when every second matters.</p>
                    </div>
                    <div className="space-y-3 mt-3">
                      <div className="flex items-start space-x-2">
                        <div className="flex-1">
                          <Label className="text-sm font-medium">
                            Batch Send to All Recipients ({selectedRecipients.length})
                          </Label>
                          <p className="text-xs text-gray-600 mt-1">
                            Instantly sends documents to all {selectedRecipients.length} selected recipients simultaneously. Fast and efficient for urgent emergencies.
                          </p>
                        </div>
                      </div>
                    </div>

                  </>
                )}
              </div>
            )}



            {/* Expanded Recipient Selection */}
            <div className="space-y-4">
              <Label>Emergency Management Recipients</Label>
              <RecipientSelector
                userRole={userRole}
                selectedRecipients={selectedRecipients}
                onRecipientsChange={setSelectedRecipients}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency-description">Emergency Description / Comments</Label>
              <Textarea
                id="emergency-description"
                value={emergencyData.description}
                onChange={(e) => setEmergencyData({...emergencyData, description: e.target.value})}
                placeholder="Detailed description of the emergency situation"
                rows={4}
                className="border-destructive focus:ring-destructive"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEmergencyMode(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEmergencySubmit}
                variant="destructive"
                className="font-bold animate-pulse"
              >
                <Send className="w-4 h-4 mr-2" />
                SUBMIT EMERGENCY
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customize Recipients Modal */}
      <Dialog open={showCustomizeModal} onOpenChange={setShowCustomizeModal}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Customize Notifications per Recipient
            </DialogTitle>
            <DialogDescription>
              Configure individual notification preferences for each recipient
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-3">
              {selectedRecipients.map((recipientId) => {
                const recipientSettings = recipientNotifications[recipientId] || notificationSettings;
                const isOpen = openRecipients[recipientId] || false;
                return (
                  <Card key={recipientId} className="overflow-hidden">
                    <div className="p-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors flex items-center justify-between" onClick={() => setOpenRecipients({...openRecipients, [recipientId]: !isOpen})}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <h4 className="font-semibold text-sm uppercase">{recipientId.replace('-', ' ')}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {[recipientSettings.emailNotifications && 'Email', recipientSettings.smsAlerts && 'SMS', recipientSettings.pushNotifications && 'Push', recipientSettings.whatsappNotifications && 'WhatsApp'].filter(Boolean).join(', ') || 'None'}
                        </Badge>
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                    {isOpen && (
                      <div className="p-4 border-t space-y-3">
                        <div className="space-y-2"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-medium">Email</span></div><Switch checked={recipientSettings.emailNotifications} onCheckedChange={(checked) => setRecipientNotifications({...recipientNotifications, [recipientId]: {...recipientSettings, emailNotifications: checked}})} /></div>{recipientSettings.emailNotifications && (<div className="grid grid-cols-2 gap-2 ml-6"><Input type="number" value={recipientSettings.emailInterval} onChange={(e) => setRecipientNotifications({...recipientNotifications, [recipientId]: {...recipientSettings, emailInterval: e.target.value}})} min={1} className="h-8 text-sm" /><Select value={recipientSettings.emailUnit} onValueChange={(value: any) => setRecipientNotifications({...recipientNotifications, [recipientId]: {...recipientSettings, emailUnit: value}})}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="seconds">Seconds</SelectItem><SelectItem value="minutes">Minutes</SelectItem><SelectItem value="hours">Hours</SelectItem><SelectItem value="days">Days</SelectItem><SelectItem value="weeks">Weeks</SelectItem><SelectItem value="months">Months</SelectItem></SelectContent></Select></div>)}</div>
                        <div className="space-y-2"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-medium">SMS</span></div><Switch checked={recipientSettings.smsAlerts} onCheckedChange={(checked) => setRecipientNotifications({...recipientNotifications, [recipientId]: {...recipientSettings, smsAlerts: checked}})} /></div>{recipientSettings.smsAlerts && (<div className="grid grid-cols-2 gap-2 ml-6"><Input type="number" value={recipientSettings.smsInterval} onChange={(e) => setRecipientNotifications({...recipientNotifications, [recipientId]: {...recipientSettings, smsInterval: e.target.value}})} min={1} className="h-8 text-sm" /><Select value={recipientSettings.smsUnit} onValueChange={(value: any) => setRecipientNotifications({...recipientNotifications, [recipientId]: {...recipientSettings, smsUnit: value}})}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="seconds">Seconds</SelectItem><SelectItem value="minutes">Minutes</SelectItem><SelectItem value="hours">Hours</SelectItem><SelectItem value="days">Days</SelectItem><SelectItem value="weeks">Weeks</SelectItem><SelectItem value="months">Months</SelectItem></SelectContent></Select></div>)}</div>
                        <div className="space-y-2"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-medium">Push</span></div><Switch checked={recipientSettings.pushNotifications} onCheckedChange={(checked) => setRecipientNotifications({...recipientNotifications, [recipientId]: {...recipientSettings, pushNotifications: checked}})} /></div>{recipientSettings.pushNotifications && (<div className="grid grid-cols-2 gap-2 ml-6"><Input type="number" value={recipientSettings.pushInterval} onChange={(e) => setRecipientNotifications({...recipientNotifications, [recipientId]: {...recipientSettings, pushInterval: e.target.value}})} min={1} className="h-8 text-sm" /><Select value={recipientSettings.pushUnit} onValueChange={(value: any) => setRecipientNotifications({...recipientNotifications, [recipientId]: {...recipientSettings, pushUnit: value}})}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="seconds">Seconds</SelectItem><SelectItem value="minutes">Minutes</SelectItem><SelectItem value="hours">Hours</SelectItem><SelectItem value="days">Days</SelectItem><SelectItem value="weeks">Weeks</SelectItem><SelectItem value="months">Months</SelectItem></SelectContent></Select></div>)}</div>
                        <div className="space-y-2"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-green-600" /><span className="text-sm font-medium">WhatsApp</span></div><Switch checked={recipientSettings.whatsappNotifications} onCheckedChange={(checked) => setRecipientNotifications({...recipientNotifications, [recipientId]: {...recipientSettings, whatsappNotifications: checked}})} /></div>{recipientSettings.whatsappNotifications && (<div className="grid grid-cols-2 gap-2 ml-6"><Input type="number" value={recipientSettings.whatsappInterval} onChange={(e) => setRecipientNotifications({...recipientNotifications, [recipientId]: {...recipientSettings, whatsappInterval: e.target.value}})} min={1} className="h-8 text-sm" /><Select value={recipientSettings.whatsappUnit} onValueChange={(value: any) => setRecipientNotifications({...recipientNotifications, [recipientId]: {...recipientSettings, whatsappUnit: value}})}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="seconds">Seconds</SelectItem><SelectItem value="minutes">Minutes</SelectItem><SelectItem value="hours">Hours</SelectItem><SelectItem value="days">Days</SelectItem><SelectItem value="weeks">Weeks</SelectItem><SelectItem value="months">Months</SelectItem></SelectContent></Select></div>)}</div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomizeModal(false)}>Cancel</Button>
            <Button onClick={() => { setShowCustomizeModal(false); toast({ title: "Settings Saved", description: "Recipient notification preferences saved successfully." }); }}><CheckCircle2 className="w-4 h-4 mr-2" />Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Assignment Modal */}
      <Dialog open={showAssignmentModal} onOpenChange={setShowAssignmentModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Documents to Recipients</DialogTitle>
            <DialogDescription>
              Select which documents should be sent to each recipient. By default, all documents will be sent to all recipients.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {emergencyData.uploadedFiles.map((file, fileIndex) => (
              <Card key={fileIndex}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <File className="w-4 h-4" />
                    {file.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedRecipients.map((recipientId) => (
                      <div key={recipientId} className="flex items-center space-x-2 p-2 border rounded">
                        <Checkbox
                          id={`${file.name}-${recipientId}`}
                          checked={documentAssignments[file.name]?.includes(recipientId) ?? true}
                          onCheckedChange={(checked) => {
                            setDocumentAssignments(prev => {
                              const current = prev[file.name] || [];
                              if (checked) {
                                return { ...prev, [file.name]: [...current, recipientId] };
                              } else {
                                return { ...prev, [file.name]: current.filter(id => id !== recipientId) };
                              }
                            });
                          }}
                        />
                        <Label htmlFor={`${file.name}-${recipientId}`} className="text-sm cursor-pointer">
                          {recipientId.replace('-', ' ').toUpperCase()}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignmentModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setShowAssignmentModal(false);
              toast({
                title: "Assignment Saved",
                description: "Document assignments have been saved successfully.",
                variant: "default"
              });
            }}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Emergency Contacts - Only show when not in emergency mode */}
      {!isEmergencyMode && (
        <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { role: 'Principal', name: 'Dr. Rajesh Kumar', phone: '+91-9876543210', available: true },
              { role: 'Registrar', name: 'Prof. Anita Sharma', phone: '+91-9876543211', available: true },
              { role: 'Security Head', name: 'Mr. Ramesh Singh', phone: '+91-9876543212', available: true },
              { role: 'Medical Officer', name: 'Dr. Priya Patel', phone: '+91-9876543213', available: false },
              { role: 'Maintenance Head', name: 'Mr. Suresh Kumar', phone: '+91-9876543214', available: true },
              { role: 'IT Head', name: 'Ms. Kavya Reddy', phone: '+91-9876543215', available: true }
            ].map((contact, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${contact.available ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
                  <div>
                    <h4 className="font-medium text-sm">{contact.name}</h4>
                    <p className="text-xs text-muted-foreground">{contact.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium">{contact.phone}</p>
                  <Badge 
                    variant={contact.available ? "success" : "secondary"} 
                    className="text-xs"
                  >
                    {contact.available ? "Available" : "Unavailable"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      )}
      
      {/* Watermark Feature Modal */}
      {showWatermarkModal && user && (
        <WatermarkFeature
          isOpen={showWatermarkModal}
          onClose={() => {
            setShowWatermarkModal(false);
            
            // If there's pending submission data, proceed with the submission
            if (pendingSubmissionData) {
              handleWatermarkComplete();
            }
          }}
          document={{
            id: `emergency-${Date.now()}`,
            title: emergencyData.title || 'Emergency Circular',
            content: emergencyData.description || 'This emergency circular document will be watermarked according to your specifications.',
            type: 'circular'
          }}
          user={{
            id: user?.id || 'emergency-user',
            name: user?.fullName || user?.name || 'Emergency User',
            email: user?.email || 'emergency@example.com',
            role: user?.role || userRole
          }}
          files={emergencyData.uploadedFiles}
          onFilesUpdate={(updatedFiles) => {
            setEmergencyData({ ...emergencyData, uploadedFiles: updatedFiles });
            toast({
              title: "Files Updated",
              description: "Watermark has been applied to your files.",
            });
          }}
        />
      )}

      {/* File Viewer Modal */}
      <FileViewer
        file={viewingFile}
        open={showFileViewer}
        onOpenChange={setShowFileViewer}
      />
    </div>
  );
};