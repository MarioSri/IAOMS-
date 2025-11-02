import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { RecipientSelector } from '@/components/RecipientSelector';
import { LoadingState } from '@/components/ui/loading-states';
import { BiDirectionalWorkflowEngine } from '@/services/BiDirectionalWorkflowEngine';
import { WorkflowRoute, WorkflowStep } from '@/types/workflow';
import { cn } from '@/lib/utils';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  ArrowRight,
  ArrowDown,
  Shield,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  Copy,
  RotateCcw,
  Upload,
  FileText,
  File,
  X,
  Send,
  Eye,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WatermarkFeature } from '@/components/WatermarkFeature';
import { FileViewer } from '@/components/FileViewer';

interface WorkflowConfigurationProps {
  className?: string;
  hideWorkflowsTab?: boolean;
}

export const WorkflowConfiguration: React.FC<WorkflowConfigurationProps> = ({ className, hideWorkflowsTab = false }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [workflowEngine] = useState(() => new BiDirectionalWorkflowEngine());
  const [workflows, setWorkflows] = useState<WorkflowRoute[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowRoute | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [activeTab, setActiveTab] = useState('workflows');

  // Form states
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [workflowType, setWorkflowType] = useState<'sequential' | 'parallel' | 'reverse' | 'bidirectional'>('sequential');

  const [autoEscalation, setAutoEscalation] = useState(false);
  const [escalationTimeout, setEscalationTimeout] = useState(24);
  const [escalationTimeUnit, setEscalationTimeUnit] = useState<'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months'>('hours');

  // Step form states
  const [stepName, setStepName] = useState('');
  const [stepDescription, setStepDescription] = useState('');
  const [stepRole, setStepRole] = useState('');
  const [stepRequiredApprovals, setStepRequiredApprovals] = useState(1);

  // Document management states
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [documentDescription, setDocumentDescription] = useState('');
  const [documentPriority, setDocumentPriority] = useState('normal');
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [documentAssignments, setDocumentAssignments] = useState<{[key: string]: string[]}>({});
  const [stepTimeoutHours, setStepTimeoutHours] = useState(24);
  const [stepEscalationRoles, setStepEscalationRoles] = useState<string[]>([]);

  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [pendingSubmissionData, setPendingSubmissionData] = useState<any>(null);
  const [viewingFile, setViewingFile] = useState<File | null>(null);
  const [showFileViewer, setShowFileViewer] = useState(false);

  const availableRoles = ['principal', 'registrar', 'program-head', 'hod', 'employee'];

  // Document management constants
  const documentTypeOptions = [
    { id: "letter", label: "Letter", icon: FileText },
    { id: "circular", label: "Circular", icon: File },
    { id: "report", label: "Report", icon: FileText },
  ];

  // Document management functions
  const handleDocumentTypeChange = (typeId: string, checked: boolean) => {
    if (checked) {
      setDocumentTypes([...documentTypes, typeId]);
    } else {
      setDocumentTypes(documentTypes.filter(id => id !== typeId));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles([...uploadedFiles, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleViewFile = (file: File) => {
    // Open the file in the FileViewer modal instead of a new tab
    setViewingFile(file);
    setShowFileViewer(true);
  };

  useEffect(() => {
    if (user) {
      refreshWorkflows();
    }
  }, [user]);

  useEffect(() => {
    if (hideWorkflowsTab && !selectedWorkflow && !isCreating) {
      setIsCreating(true);
      setIsEditing(true);
      setActiveTab('designer');
    }
  }, [hideWorkflowsTab, selectedWorkflow, isCreating]);

  const refreshWorkflows = () => {
    const allWorkflows = workflowEngine.getAllWorkflowRoutes();
    setWorkflows(allWorkflows);
  };

  const resetForms = () => {
    setWorkflowName('');
    setWorkflowDescription('');
    setWorkflowType('sequential');

    setAutoEscalation(false);
    setEscalationTimeout(24);
    setEscalationTimeUnit('hours');
    // Reset document management fields
    setDocumentTitle('');
    setDocumentTypes([]);
    setUploadedFiles([]);
    setSelectedRecipients([]);
    setDocumentDescription('');
    setDocumentPriority('normal');
    setDocumentAssignments({});
    resetStepForm();
  };

  const resetStepForm = () => {
    setStepName('');
    setStepDescription('');
    setStepRole('');
    setStepRequiredApprovals(1);
    setStepTimeoutHours(24);
    setStepEscalationRoles([]);

  };

  const loadWorkflow = (workflow: WorkflowRoute) => {
    setSelectedWorkflow(workflow);
    setWorkflowName(workflow.name);
    setWorkflowDescription(workflow.description);
    setWorkflowType(workflow.type);

    setAutoEscalation(workflow.autoEscalation.enabled);
    setEscalationTimeout(workflow.autoEscalation.timeoutHours);
    setEscalationTimeUnit('hours');
  };

  const loadStep = (step: WorkflowStep) => {
    setEditingStep(step);
    setStepName(step.name);
    setStepDescription(step.description);
    setStepRole(step.approverRole);
    setStepRequiredApprovals(step.requiredApprovals);
    setStepTimeoutHours(step.timeoutHours || 24);
    setStepEscalationRoles(step.escalationRoles || []);

  };

  const handleSaveWorkflow = async () => {
    if (!user) return;

    // If this is a document submission (has document title and files), create tracking card
    if (documentTitle && (uploadedFiles.length > 0 || selectedRecipients.length > 0)) {
      // Load user profile from Personal Information
      const userProfile = JSON.parse(localStorage.getItem('user-profile') || '{}');
      const currentUserName = userProfile.name || user?.fullName || user?.name || 'User';
      const currentUserDept = userProfile.department || user?.department || 'Department';
      const currentUserDesignation = userProfile.designation || user?.role || 'Employee';
      
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
      
      // Serialize uploaded files
      const serializedFiles = uploadedFiles.length > 0 
        ? await convertFilesToBase64(uploadedFiles)
        : [];
      
      // Create tracking card data following the exact same layout as "New Course Proposal – Data Science"
      const trackingCard = {
        id: `DOC-${Date.now()}`,
        title: documentTitle,
        type: documentTypes[0]?.charAt(0).toUpperCase() + documentTypes[0]?.slice(1) || 'Document',
        submittedBy: currentUserName,
        submittedByDepartment: currentUserDept,
        submittedByDesignation: currentUserDesignation,
        submittedDate: new Date().toISOString().split('T')[0],
        status: selectedRecipients.length > 0 ? 'pending' : 'approved', // Pending if has recipients, approved if bypass only
        priority: documentPriority === 'normal' ? 'Normal Priority' : 
                 documentPriority === 'medium' ? 'Medium Priority' :
                 documentPriority === 'high' ? 'High Priority' : 'Urgent Priority',
        workflow: {
          currentStep: 'Complete',
          progress: 100,
          steps: [
            { name: 'Submission', status: 'completed', assignee: currentUserName, completedDate: new Date().toISOString().split('T')[0] },
            { name: 'Bypass Approval', status: 'completed', assignee: 'System', completedDate: new Date().toISOString().split('T')[0] }
          ]
        },
        requiresSignature: true,
        signedBy: [currentUserName],
        description: documentDescription,
        files: serializedFiles,
        comments: []
      };
      
      // Save to localStorage for tracking
      const existingCards = JSON.parse(localStorage.getItem('submitted-documents') || '[]');
      existingCards.unshift(trackingCard);
      localStorage.setItem('submitted-documents', JSON.stringify(existingCards));
      
      // Create approval card for Approval Center following "Budget Request – Lab Equipment" layout
      if (selectedRecipients.length > 0) {
        // Map recipient IDs to names
        const getRecipientName = (recipientId: string) => {
          const recipientMap: { [key: string]: string } = {
            'principal-dr-robert-principal': 'Dr. Robert Smith',
            'registrar-prof-sarah-registrar': 'Prof. Sarah Registrar',
            'hod-dr-cse-hod-cse': 'Dr. Michael Chen',
            'hod-dr-eee-hod-eee': 'Dr. Mohammed Ali',
            'hod-dr-mech-hod-mech': 'Dr. MECH HOD',
            'hod-dr-ece-hod-ece': 'Dr. ECE HOD',
            'program-department-head-prof-cse-head-cse': 'Prof. CSE Head',
            'program-department-head-prof-eee-head-eee': 'Prof. EEE Head',
            'dean-dr-maria-dean': 'Dr. Maria Garcia',
            'controller-of-examinations-dr-robert-controller': 'Dr. Robert Controller'
          };
          return recipientMap[recipientId] || recipientId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        };
        
        const approvalCard = {
          id: trackingCard.id,
          title: documentTitle,
          type: documentTypes[0]?.charAt(0).toUpperCase() + documentTypes[0]?.slice(1) || 'Document',
          submitter: currentUserName,
          submittedDate: new Date().toISOString().split('T')[0],
          status: 'pending',
          priority: documentPriority,
          description: documentDescription,
          recipients: selectedRecipients.map((id: string) => getRecipientName(id)),
          files: serializedFiles
        };
        
        // Save to localStorage for approvals
        const existingApprovals = JSON.parse(localStorage.getItem('pending-approvals') || '[]');
        existingApprovals.unshift(approvalCard);
        localStorage.setItem('pending-approvals', JSON.stringify(existingApprovals));
        
        // Dispatch event for real-time updates
        window.dispatchEvent(new CustomEvent('document-approval-created'));
      }
      
      toast({
        title: "Bypass Document Submitted",
        description: `Your document has been submitted with bypass approval and is now visible in Track Documents${selectedRecipients.length > 0 ? ' and Approval Center' : ''}.`,
      });
      
      // Reset form
      setDocumentTitle('');
      setDocumentTypes([]);
      setUploadedFiles([]);
      setSelectedRecipients([]);
      setDocumentDescription('');
      setDocumentPriority('normal');
      setDocumentAssignments({});
      
      return;
    }

    const workflow: WorkflowRoute = {
      id: selectedWorkflow?.id || `workflow-${Date.now()}`,
      name: documentTitle || 'Bypass Workflow',
      description: workflowDescription,
      type: workflowType,
      documentType: 'general',
      steps: selectedWorkflow?.steps || [],
      escalationPaths: selectedWorkflow?.escalationPaths || [],

      autoEscalation: {
        enabled: autoEscalation,
        timeoutHours: escalationTimeout
      },
      isActive: true,
      createdBy: user.id,
      createdAt: selectedWorkflow?.createdAt || new Date(),
      updatedAt: new Date()
    };

    try {
      workflowEngine.createWorkflowRoute(workflow);
      
      toast({
        title: 'Success',
        description: `Workflow ${isCreating ? 'created' : 'updated'} successfully`,
        variant: 'default'
      });

      refreshWorkflows();
      setSelectedWorkflow(workflow);
      setIsEditing(false);
      setIsCreating(false);
      
      // Handle watermark completion
      if (pendingSubmissionData) {
        setPendingSubmissionData(null);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save workflow',
        variant: 'destructive'
      });
    }
  };

  const handleSaveStep = () => {
    if (!stepName.trim() || !stepRole) {
      toast({
        title: 'Validation Error',
        description: 'Step name and approver role are required',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedWorkflow) return;

    const step: WorkflowStep = {
      id: editingStep?.id || `step-${Date.now()}`,
      name: stepName,
      description: stepDescription,
      roleRequired: [stepRole],
      approverRole: stepRole,
      requiredApprovals: stepRequiredApprovals,
      timeoutHours: stepTimeoutHours,
      escalationRoles: stepEscalationRoles.length > 0 ? stepEscalationRoles : undefined,

      isOptional: false,
      order: editingStep?.order || selectedWorkflow.steps.length + 1
    };

    const updatedSteps = editingStep
      ? selectedWorkflow.steps.map(s => s.id === editingStep.id ? step : s)
      : [...selectedWorkflow.steps, step];

    const updatedWorkflow = {
      ...selectedWorkflow,
      steps: updatedSteps,
      updatedAt: new Date()
    };

    try {
      workflowEngine.createWorkflowRoute(updatedWorkflow);
      
      toast({
        title: 'Success',
        description: `Step ${editingStep ? 'updated' : 'added'} successfully`,
        variant: 'default'
      });

      refreshWorkflows();
      setSelectedWorkflow(updatedWorkflow);
      setEditingStep(null);
      resetStepForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save step',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteStep = (stepId: string) => {
    if (!selectedWorkflow) return;

    const updatedSteps = selectedWorkflow.steps
      .filter(s => s.id !== stepId)
      .map((step, index) => ({ ...step, order: index + 1 }));

    const updatedWorkflow = {
      ...selectedWorkflow,
      steps: updatedSteps,
      updatedAt: new Date()
    };

    try {
      workflowEngine.createWorkflowRoute(updatedWorkflow);
      
      toast({
        title: 'Success',
        description: 'Step deleted successfully',
        variant: 'default'
      });

      refreshWorkflows();
      setSelectedWorkflow(updatedWorkflow);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete step',
        variant: 'destructive'
      });
    }
  };

  const handleCloneWorkflow = (workflow: WorkflowRoute) => {
    const clonedWorkflow: WorkflowRoute = {
      ...workflow,
      id: `workflow-${Date.now()}`,
      name: `${workflow.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user?.id || ''
    };

    try {
      workflowEngine.createWorkflowRoute(clonedWorkflow);
      
      toast({
        title: 'Success',
        description: 'Workflow cloned successfully',
        variant: 'default'
      });

      refreshWorkflows();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clone workflow',
        variant: 'destructive'
      });
    }
  };

  const WorkflowCard: React.FC<{ workflow: WorkflowRoute }> = ({ workflow }) => (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{workflow.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {workflow.description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{workflow.type}</Badge>
            <Badge variant="secondary">
              {workflow.steps.length} steps
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">

            {workflow.autoEscalation.enabled && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Auto-Escalation
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCloneWorkflow(workflow)}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                loadWorkflow(workflow);
                setIsEditing(true);
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const StepCard: React.FC<{ step: WorkflowStep; index: number }> = ({ step, index }) => (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-medium">
              {index + 1}
            </div>
            <div>
              <CardTitle className="text-base">{step.name}</CardTitle>
              {step.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {step.description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadStep(step)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDeleteStep(step.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <Badge variant="outline">{step.approverRole}</Badge>
            <div className="text-sm text-muted-foreground">
              {step.requiredApprovals} approval{step.requiredApprovals > 1 ? 's' : ''} required
            </div>
          </div>
          
          {step.timeoutHours && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {step.timeoutHours}h timeout
            </div>
          )}
          
          {step.escalationRoles && step.escalationRoles.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="w-4 h-4" />
              Escalates to: {step.escalationRoles.join(', ')}
            </div>
          )}
          

        </div>
      </CardContent>
      
      {index < (selectedWorkflow?.steps.length || 0) - 1 && (
        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
          <ArrowDown className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
    </Card>
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
        </div>
        {!hideWorkflowsTab && (
          <Button
            onClick={() => {
              resetForms();
              setIsCreating(true);
              setIsEditing(true);
              setSelectedWorkflow(null);
              setActiveTab('designer');
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Workflow
          </Button>
        )}
      </div>

      <Tabs value={hideWorkflowsTab ? "designer" : activeTab} onValueChange={setActiveTab} className="space-y-4">
        {!hideWorkflowsTab && (
          <TabsList>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            {(selectedWorkflow || isCreating) && (
              <TabsTrigger value="designer">Workflow Designer</TabsTrigger>
            )}
          </TabsList>
        )}

        {!hideWorkflowsTab && (
          <TabsContent value="workflows" className="space-y-4">
          {workflows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Settings className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Workflows Configured</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first approval workflow to get started.
                </p>
                <Button
                  onClick={() => {
                    resetForms();
                    setIsCreating(true);
                    setIsEditing(true);
                    setSelectedWorkflow(null);
                    setActiveTab('designer');
                  }}
                >
                  Create Workflow
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {workflows.map(workflow => (
                <div key={workflow.id} onClick={() => setSelectedWorkflow(workflow)}>
                  <WorkflowCard workflow={workflow} />
                </div>
              ))}
            </div>
          )}
          </TabsContent>
        )}

        <TabsContent value="designer" className="space-y-6">
            {(isEditing || hideWorkflowsTab) ? (
              /* Workflow Editor */
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <div>
                      <label className="text-sm font-medium">Routing Type</label>
                      <Select value={workflowType} onValueChange={(value: 'sequential' | 'parallel' | 'reverse' | 'bidirectional') => setWorkflowType(value as any)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sequential">Sequential Routing</SelectItem>
                          <SelectItem value="parallel">Parallel Routing</SelectItem>
                          <SelectItem value="reverse">Reverse Routing</SelectItem>
                          <SelectItem value="bidirectional">Bi-Directional Routing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Submit Document Features */}
                  <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Upload className="w-5 h-5 text-primary" />
                      <label className="text-base font-medium">Submit Document</label>
                    </div>

                    {/* Document Title */}
                    <div>
                      <label className="text-sm font-medium">Document Title</label>
                      <Input
                        value={documentTitle}
                        onChange={(e) => setDocumentTitle(e.target.value)}
                        placeholder="Enter document title..."
                        className="mt-1"
                      />
                    </div>

                    {/* Document Type Selection */}
                    <div>
                      <label className="text-sm font-medium">Document Type</label>
                      <div className="grid grid-cols-3 gap-3 mt-1">
                        {documentTypeOptions.map((option) => (
                          <div key={option.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent transition-colors">
                            <Checkbox
                              id={`doc-${option.id}`}
                              checked={documentTypes.includes(option.id)}
                              onCheckedChange={(checked) => handleDocumentTypeChange(option.id, !!checked)}
                            />
                            <label htmlFor={`doc-${option.id}`} className="flex items-center gap-2 cursor-pointer text-sm">
                              <option.icon className="w-4 h-4" />
                              {option.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* File Upload */}
                    <div>
                      <label className="text-sm font-medium">Upload Documents</label>
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors mt-1">
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="workflow-file-upload"
                          title="Upload document files"
                        />
                        <label htmlFor="workflow-file-upload" className="cursor-pointer">
                          <div className="space-y-2">
                            <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Drag and drop files here, or click to browse
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Supports: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, JPEG
                            </p>
                          </div>
                        </label>
                      </div>

                      {/* Uploaded Files */}
                      {uploadedFiles.length > 0 && (
                        <div className="space-y-2 mt-3">
                          <label className="text-sm font-medium">Uploaded Files</label>
                          {uploadedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-accent rounded-md">
                              <div className="flex items-center gap-2">
                                <File className="w-4 h-4 text-primary" />
                                <span className="text-sm">{file.name}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {(file.size / 1024 / 1024).toFixed(1)} MB
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className="text-xs cursor-pointer hover:bg-primary/10"
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
                                size="sm"
                                onClick={() => removeFile(index)}
                                className="h-6 w-6 p-0"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Assignment Preview */}
                    {uploadedFiles.length > 1 && selectedRecipients.length > 1 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Document Assignment</label>
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

                    {/* Recipients */}
                    <div>
                      <label className="text-sm font-medium">Approval Chain with Bypass Recipients</label>
                      <div className="mt-1">
                        <RecipientSelector
                          userRole={user?.role || 'employee'}
                          selectedRecipients={selectedRecipients}
                          onRecipientsChange={setSelectedRecipients}
                        />
                      </div>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="text-sm font-medium">Priority Level</label>
                      <Select value={documentPriority} onValueChange={setDocumentPriority}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-blue-500" />
                              Normal Priority
                            </div>
                          </SelectItem>
                          <SelectItem value="medium">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-yellow-500" />
                              Medium Priority
                            </div>
                          </SelectItem>
                          <SelectItem value="high">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-orange-500" />
                              High Priority
                            </div>
                          </SelectItem>
                          <SelectItem value="urgent">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-red-500" />
                              Urgent Priority
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Document Description */}
                    <div>
                      <label className="text-sm font-medium">Document Description / Comments</label>
                      <Textarea
                        value={documentDescription}
                        onChange={(e) => setDocumentDescription(e.target.value)}
                        placeholder="Provide additional context or instructions..."
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={autoEscalation}
                      onCheckedChange={setAutoEscalation}
                    />
                    <label className="text-sm font-medium">Auto-Escalation</label>
                  </div>
                  
                  {autoEscalation && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Escalation Timeout</label>
                        <Input
                          type="number"
                          value={escalationTimeout}
                          onChange={(e) => setEscalationTimeout(Number(e.target.value))}
                          min={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Time Unit</label>
                        <Select
                          value={escalationTimeUnit}
                          onValueChange={(value: any) => setEscalationTimeUnit(value)}
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
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setIsCreating(false);
                        if (selectedWorkflow) {
                          loadWorkflow(selectedWorkflow);
                        } else {
                          resetForms();
                        }
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        // Submit directly without opening watermark modal
                        await handleSaveWorkflow();
                      }}
                      variant="default"
                      className="font-bold animate-pulse bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      SUBMIT BYPASS
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Workflow Display */
              selectedWorkflow && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedWorkflow.name}</CardTitle>
                        <p className="text-muted-foreground mt-1">
                          {selectedWorkflow.description}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-6">
                      <Badge variant="outline">{selectedWorkflow.type}</Badge>

                      {selectedWorkflow.autoEscalation.enabled && (
                        <Badge variant="secondary">Auto-Escalation</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            )}

            {/* Steps Section */}
            {!hideWorkflowsTab && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Workflow Steps</h3>
                  {!editingStep && (
                    <Button
                      variant="outline"
                      onClick={() => resetStepForm()}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Step
                    </Button>
                  )}
                </div>

                {/* Step Editor */}
                {(editingStep || (!editingStep && stepName)) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {editingStep ? 'Edit Step' : 'Add New Step'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium">Step Name</label>
                          <Input
                            value={stepName}
                            onChange={(e) => setStepName(e.target.value)}
                            placeholder="Enter step name"
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Approver Role</label>
                          <Select value={stepRole} onValueChange={setStepRole}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableRoles.map(role => (
                                <SelectItem key={role} value={role}>{role}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                          value={stepDescription}
                          onChange={(e) => setStepDescription(e.target.value)}
                          placeholder="Enter step description"
                          className="mt-1"
                        />
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium">Required Approvals</label>
                          <Input
                            type="number"
                            value={stepRequiredApprovals}
                            onChange={(e) => setStepRequiredApprovals(Number(e.target.value))}
                            min={1}
                            max={10}
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Timeout (hours)</label>
                          <Input
                            type="number"
                            value={stepTimeoutHours}
                            onChange={(e) => setStepTimeoutHours(Number(e.target.value))}
                            min={1}
                            max={168}
                            className="mt-1"
                          />
                        </div>
                        

                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Escalation Roles (Optional)</label>
                        <Select
                          value=""
                          onValueChange={(role) => {
                            if (!stepEscalationRoles.includes(role)) {
                              setStepEscalationRoles([...stepEscalationRoles, role]);
                            }
                          }}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Add escalation role" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles
                              .filter(role => role !== stepRole && !stepEscalationRoles.includes(role))
                              .map(role => (
                                <SelectItem key={role} value={role}>{role}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        
                        {stepEscalationRoles.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {stepEscalationRoles.map(role => (
                              <Badge key={role} variant="secondary" className="cursor-pointer">
                                {role}
                                <button
                                  onClick={() => setStepEscalationRoles(stepEscalationRoles.filter(r => r !== role))}
                                  className="ml-2 hover:text-destructive"
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 pt-4">
                        <Button onClick={handleSaveStep}>
                          <Save className="w-4 h-4 mr-2" />
                          {editingStep ? 'Update Step' : 'Add Step'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingStep(null);
                            resetStepForm();
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Steps List */}
                {selectedWorkflow?.steps && selectedWorkflow.steps.length > 0 && (
                  <div className="space-y-6">
                    {selectedWorkflow.steps
                      .sort((a, b) => a.order - b.order)
                      .map((step, index) => (
                        <StepCard key={step.id} step={step} index={index} />
                      ))}
                  </div>
                )}
                
                {(!selectedWorkflow?.steps || selectedWorkflow.steps.length === 0) && !editingStep && !stepName && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <ArrowRight className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Steps Configured</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        Add workflow steps to define the approval process.
                      </p>
                      <Button onClick={() => resetStepForm()}>
                        Add First Step
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
        </TabsContent>
      </Tabs>

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
            {uploadedFiles.map((file, fileIndex) => (
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
                          id={`workflow-${file.name}-${recipientId}`}
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
                        <label htmlFor={`workflow-${file.name}-${recipientId}`} className="text-sm cursor-pointer">
                          {recipientId.replace('-', ' ').toUpperCase()}
                        </label>
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
      
      {/* Watermark Feature Modal */}
      {showWatermarkModal && user && (
        <WatermarkFeature
          isOpen={showWatermarkModal}
          onClose={async () => {
            setShowWatermarkModal(false);
            
            // If there's pending submission data, proceed with the submission
            if (pendingSubmissionData) {
              setPendingSubmissionData(null);
              await handleSaveWorkflow();
            }
          }}
          document={{
            id: `bypass-${Date.now()}`,
            title: documentTitle || 'Approval Chain Bypass Document',
            content: documentDescription || 'This document will bypass normal approval workflows and be watermarked according to your specifications.',
            type: 'circular'
          }}
          user={{
            id: user.id,
            name: user.fullName || user.name || 'User',
            email: user.email || 'user@example.com',
            role: user.role || 'Employee'
          }}
          files={uploadedFiles}
          onFilesUpdate={(updatedFiles) => {
            setUploadedFiles(updatedFiles);
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
