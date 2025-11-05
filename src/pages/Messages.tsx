import { DashboardLayout } from "@/components/DashboardLayout";
import { NotesReminders } from "@/components/NotesReminders";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/ChatInterface";
import { LiveMeetingRequestManager } from "@/components/LiveMeetingRequestManager";
import { DecentralizedChatService } from "@/services/DecentralizedChatService";
import { useAuth } from "@/contexts/AuthContext";
import { 
  MessageCircle, 
  Users, 
  BarChart3, 
  PenTool, 
  Zap, 
  MessageSquare,
  Hash,
  Lock,
  Video,
  FileText,
  Calendar,
  Clock,
  User,
  Settings,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Monitor,
  Building,
  Wifi,
  MapPin,
  Globe
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Messages = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [chatService] = useState(() => new DecentralizedChatService(
    import.meta.env.VITE_WS_URL || 'ws://localhost:8080',
    import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  ));
  const [isInitialized, setIsInitialized] = useState(false);

  // Memoized initial data for instant loading
  const initialStats = useMemo(() => ({
    unreadMessages: 26,
    pendingSignatures: 2,
    activePolls: 1,
    onlineUsers: 23,
    totalChannels: 5,
    notifications: 4,
    liveMeetingRequests: 3
  }), []);

  const initialChannelCounts = useMemo(() => ({
    'Administrative Council': 9,
    'Faculty Board': 5,
    'General': 12
  }), []);

  const [stats, setStats] = useState(initialStats);
  const [channelMessageCounts, setChannelMessageCounts] = useState(initialChannelCounts);
  const [liveMeetRequests, setLiveMeetRequests] = useState<any[]>([]);

  // Memoized data initialization for instant loading
  const messagesData = useMemo(() => ({
    meetings: [
      { id: 'team-standup', title: 'Daily Team Standup', description: 'Daily sync at 9:00 AM' },
      { id: 'client-review', title: 'Client Quarterly Review Meeting', description: 'Quarterly business review' },
      { id: 'product-planning', title: 'Product Roadmap Planning Session', description: 'Roadmap discussion' },
      { id: 'all-hands', title: 'Monthly All Hands Meeting', description: 'Company updates' }
    ],
    reminders: [
      { id: 'project-deadline', title: 'Project Milestone Deadline', description: 'Due tomorrow' },
      { id: 'client-followup', title: 'Client Follow-up Call Reminder', description: 'Schedule for next week' },
      { id: 'performance-review', title: 'Annual Performance Review Due', description: 'Submit by Friday' },
      { id: 'contract-renewal', title: 'Contract Renewal Reminder', description: 'Review terms' }
    ],
    stickyNotes: [
      { id: 'contract-review', title: 'Review Legal Contract Terms', description: 'Legal feedback needed' },
      { id: 'timeline-update', title: 'Update Project Timeline', description: 'Adjust milestones' },
      { id: 'presentation-prep', title: 'Prepare Board Presentation', description: 'Board meeting prep' },
      { id: 'budget-analysis', title: 'Complete Budget Analysis', description: 'Financial review' }
    ],
    channels: [
      { id: 'engineering', name: 'Engineering Team', description: '24 members online' },
      { id: 'marketing', name: 'Marketing Department', description: '18 members online' },
      { id: 'general', name: 'General Discussion', description: '45 members online' },
      { id: 'product', name: 'Product Updates', description: '32 members online' },
      { id: 'hr', name: 'HR Announcements', description: '67 members online' }
    ]
  }), []);

  // Optimized callbacks
  const updateMessageCounts = useCallback(() => {
    setChannelMessageCounts(prev => {
      const channels = Object.keys(prev);
      const randomChannel = channels[Math.floor(Math.random() * channels.length)];
      const newCounts = { ...prev };
      newCounts[randomChannel] = prev[randomChannel] + 1;
      
      const totalMessages = Object.values(newCounts).reduce((sum, count) => sum + count, 0);
      setStats(prevStats => ({ ...prevStats, unreadMessages: totalMessages }));
      
      return newCounts;
    });
  }, []);

  const loadLiveMeetRequests = useCallback(() => {
    // Load all LiveMeet+ requests from localStorage
    const allRequests = JSON.parse(localStorage.getItem('livemeet-requests') || '[]');
    
    if (!user) {
      setLiveMeetRequests([]);
      setStats(prev => ({ ...prev, liveMeetingRequests: 0 }));
      return;
    }
    
    // Get current user information
    const currentUserId = user.id;
    const currentUserName = user.name;
    const currentUserRole = user.role;
    
    // ⭐ FILTER: Show only requests where current user is a target participant (NOT the initiator)
    const filteredRequests = allRequests.filter((request: any) => {
      // First, check if user is the initiator - if so, EXCLUDE this request
      if (request.submitter && currentUserName) {
        if (request.submitter.toLowerCase().trim() === currentUserName.toLowerCase().trim()) {
          console.log(`[LiveMeet+ Filtering] Excluding request initiated by current user: ${request.title}`);
          return false; // Initiator should NOT see their own request
        }
      }
      
      // Check if current user ID is in targetParticipantIds array
      if (request.targetParticipantIds && Array.isArray(request.targetParticipantIds)) {
        if (request.targetParticipantIds.includes(currentUserId)) {
          return true;
        }
      }
      
      // Fallback: Check by name if ID matching doesn't work
      if (request.targetParticipants && Array.isArray(request.targetParticipants)) {
        const nameMatch = request.targetParticipants.some((name: string) => 
          name.toLowerCase().trim() === currentUserName?.toLowerCase().trim()
        );
        if (nameMatch) {
          return true;
        }
      }
      
      return false;
    });
    
    console.log(`[LiveMeet+ Filtering] User: ${currentUserName} | Total requests: ${allRequests.length} | Filtered: ${filteredRequests.length}`);
    
    // Update state with filtered requests only
    setLiveMeetRequests(filteredRequests);
    setStats(prev => ({ ...prev, liveMeetingRequests: filteredRequests.length }));
  }, [user]);

  // Instant initialization effect
  useEffect(() => {
    if (!user) return;

    // Immediate data setup for instant loading
    Object.entries(messagesData).forEach(([key, data]) => {
      localStorage.setItem(key, JSON.stringify(data));
    });
    
    loadLiveMeetRequests();
    setIsInitialized(true);

    // Background updates (non-blocking)
    const messageInterval = setInterval(updateMessageCounts, 5000);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'livemeet-requests') {
        loadLiveMeetRequests();
      }
    };

    const handleDocumentRemoval = (event: any) => {
      const { docId } = event.detail;
      // Handle document removal if needed
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('document-removed', handleDocumentRemoval);
    
    return () => {
      clearInterval(messageInterval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('document-removed', handleDocumentRemoval);
    };
  }, [user, messagesData, updateMessageCounts, loadLiveMeetRequests]);

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
  };

  if (!user) {
    return null; // This should be handled by ProtectedRoute, but adding as safety
  }

  return (
    <DashboardLayout userRole={user.role} onLogout={handleLogout}>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Communication Center</h1>
          <p className="text-muted-foreground">Messages, notes, and reminders for collaborative work</p>
        </div>

        <Tabs defaultValue="notes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="notes">Notes & Reminders</TabsTrigger>
            <TabsTrigger value="chat" className="relative">
              Department Chat
              {stats.unreadMessages > 0 && (
                <Badge variant="destructive" className="ml-2 px-1 py-0 text-xs">
                  {stats.unreadMessages}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="live-requests" className="relative">
              <div className="flex items-center space-x-2">
                <div className="relative w-4 h-4">
                  <div className="absolute inset-0 w-4 h-4 bg-green-400 rounded-full"></div>
                  <div className="absolute inset-1 w-2 h-2 bg-red-500 rounded-full"></div>
                </div>
                <span>LiveMeet+</span>
              </div>
              {stats.liveMeetingRequests > 0 && (
                <Badge variant="destructive" className="ml-2 px-1 py-0 text-xs animate-pulse">
                  {stats.liveMeetingRequests}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="notes" className="space-y-6">
            <NotesReminders userRole={user.role} isMessagesPage={true} />
          </TabsContent>

          <TabsContent value="live-requests" className="space-y-6">
            <LiveMeetingRequestManager />
          </TabsContent>
          


          <TabsContent value="chat" className="space-y-6">
            {/* Communication Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Messages</p>
                      <p className="text-2xl font-bold">{stats.unreadMessages}</p>
                    </div>
                    <MessageSquare className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Online</p>
                      <p className="text-2xl font-bold">{stats.onlineUsers}</p>
                    </div>
                    <Users className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Channels</p>
                      <p className="text-2xl font-bold">{stats.totalChannels}</p>
                    </div>
                    <Lock className="w-8 h-8 text-indigo-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Video Call</p>
                      <p className="text-2xl font-bold">{stats.pendingSignatures}</p>
                    </div>
                    <Video className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Polls</p>
                      <p className="text-2xl font-bold">{stats.activePolls}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">Live</span>
                      </div>
                    </div>
                    <Zap className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Chat Interface */}
            <Card className="min-h-[600px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Department Communication Hub
                </CardTitle>
                <CardDescription>
                  Real-time chat, document workflows, and collaboration tools
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[600px]">
                  <ChatInterface channelMessageCounts={channelMessageCounts} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Messages;