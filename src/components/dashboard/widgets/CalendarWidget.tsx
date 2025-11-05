import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';
import { filterMeetingsByRecipient, loadMeetingsFromStorage } from '@/utils/meetingFilters';
import { Meeting, MeetingAttendee } from '@/types/meeting';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  MapPin,
  Video,
  Plus,
  Bell,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface CalendarWidgetProps {
  userRole: string;
  permissions: any;
  isCustomizing?: boolean;
  onSelect?: () => void;
  isSelected?: boolean;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  userRole,
  permissions,
  isCustomizing,
  onSelect,
  isSelected
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile } = useResponsive();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Meeting platforms configuration
  const meetingPlatforms = [
    { value: 'google-meet', label: 'Google Meet' },
    { value: 'zoom', label: 'Zoom' },
    { value: 'teams', label: 'Microsoft Teams' },
    { value: 'webex', label: 'Webex' }
  ];

  // Helper function to format time (matching MeetingScheduler.tsx)
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Helper function to get meeting type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'online':
        return <Video className="w-3 h-3" />;
      case 'hybrid':
        return <Video className="w-3 h-3" />;
      case 'in-person':
        return <MapPin className="w-3 h-3" />;
      default:
        return <MapPin className="w-3 h-3" />;
    }
  };

  // Helper function to handle joining a meeting
  const handleJoinMeeting = (meeting: Meeting) => {
    if (meeting.meetingLinks?.googleMeet?.joinUrl) {
      window.open(meeting.meetingLinks.googleMeet.joinUrl, '_blank');
    } else if (meeting.meetingLinks?.zoom?.joinUrl) {
      window.open(meeting.meetingLinks.zoom.joinUrl, '_blank');
    } else if (meeting.meetingLinks?.teams?.joinUrl) {
      window.open(meeting.meetingLinks.teams.joinUrl, '_blank');
    } else {
      console.warn('No meeting link available for:', meeting.title);
    }
  };

  useEffect(() => {
    // Don't fetch if user is not loaded yet
    if (!user) {
      console.log('[Calendar Widget] ⏳ Waiting for user to load before fetching meetings');
      return;
    }

    // Simulate API call to fetch meetings
    const fetchMeetings = async () => {
      setLoading(true);
      console.log('[Calendar Widget] 🔄 Fetching meetings for user:', user.name);
      
      const mockMeetings = [
        {
          id: '1',
          title: 'Faculty Recruitment Review',
          description: 'Review applications for new CSE faculty positions',
          date: '2024-01-18',
          time: '10:00 AM',
          duration: 90,
          attendees: [
            { id: 'principal-001', name: 'Dr. Principal', email: 'principal@iaoms.edu', role: 'Principal', status: 'accepted', isRequired: true, canEdit: false },
            { id: 'registrar-001', name: 'Prof. Registrar', email: 'registrar@iaoms.edu', role: 'Registrar', status: 'accepted', isRequired: true, canEdit: false },
            { id: 'hod-cse-001', name: 'Dr. HOD-CSE', email: 'hod.cse@iaoms.edu', role: 'HOD', department: 'Computer Science', status: 'invited', isRequired: true, canEdit: false },
            { id: 'hr-head-001', name: 'Ms. HR Head', email: 'hr@iaoms.edu', role: 'HR Head', status: 'accepted', isRequired: true, canEdit: false }
          ],
          location: 'Conference Room A',
          type: 'online',
          status: 'confirmed',
          priority: 'high',
          createdBy: 'principal-001',
          category: 'recruitment',
          isRecurring: false,
          tags: [],
          department: 'Administration',
          documents: [],
          createdAt: new Date('2024-01-15T09:00:00Z'),
          updatedAt: new Date('2024-01-16T14:30:00Z')
        },
        {
          id: '2',
          title: 'Emergency Infrastructure Meeting',
          description: 'Urgent discussion about Block A electrical issues',
          date: '2024-01-17',
          time: '2:00 PM',
          duration: 60,
          attendees: [
            { id: 'principal-001', name: 'Dr. Principal', email: 'principal@iaoms.edu', role: 'Principal', status: 'accepted', isRequired: true, canEdit: false },
            { id: 'registrar-001', name: 'Prof. Registrar', email: 'registrar@iaoms.edu', role: 'Registrar', status: 'accepted', isRequired: true, canEdit: false },
            { id: 'maintenance-001', name: 'Mr. Maintenance Head', email: 'maintenance@iaoms.edu', role: 'Maintenance Head', status: 'accepted', isRequired: true, canEdit: false },
            { id: 'finance-001', name: 'Mr. Finance Head', email: 'finance@iaoms.edu', role: 'Finance Head', status: 'accepted', isRequired: true, canEdit: false }
          ],
          location: 'Principal Office',
          type: 'online',
          status: 'confirmed',
          priority: 'urgent',
          createdBy: 'principal-001',
          category: 'emergency',
          isRecurring: false,
          tags: [],
          department: 'Administration',
          documents: [],
          createdAt: new Date('2024-01-16T08:00:00Z'),
          updatedAt: new Date('2024-01-16T08:00:00Z')
        },
        {
          id: '3',
          title: 'Monthly Academic Review - EEE',
          description: 'Review academic performance and curriculum updates',
          date: '2024-01-19',
          time: '11:00 AM',
          duration: 120,
          attendees: [
            { id: 'hod-eee-001', name: 'Dr. HOD-EEE', email: 'hod.eee@iaoms.edu', role: 'HOD', department: 'Electrical Engineering', status: 'accepted', isRequired: true, canEdit: false },
            { id: 'program-head-eee-001', name: 'Dr. Program Head EEE', email: 'program.eee@iaoms.edu', role: 'Program Head', department: 'Electrical Engineering', status: 'invited', isRequired: true, canEdit: false },
            { id: 'academic-cell-001', name: 'Prof. Academic Cell', email: 'academic@iaoms.edu', role: 'Academic Coordinator', status: 'invited', isRequired: true, canEdit: false }
          ],
          location: 'google-meet',
          type: 'online',
          status: 'scheduled',
          priority: 'medium',
          createdBy: 'hod-eee-001',
          category: 'academic',
          isRecurring: true,
          tags: [],
          department: 'Electrical Engineering',
          documents: [],
          createdAt: new Date('2024-01-14T10:00:00Z'),
          updatedAt: new Date('2024-01-14T10:00:00Z')
        },
        {
          id: '4',
          title: 'Budget Planning Session',
          description: 'Q2 budget allocation and planning',
          date: '2024-01-20',
          time: '9:00 AM',
          duration: 180,
          attendees: [
            { id: 'principal-001', name: 'Dr. Principal', email: 'principal@iaoms.edu', role: 'Principal', status: 'accepted', isRequired: true, canEdit: false },
            { id: 'registrar-001', name: 'Prof. Registrar', email: 'registrar@iaoms.edu', role: 'Registrar', status: 'accepted', isRequired: true, canEdit: false },
            { id: 'hod-cse-001', name: 'Dr. HOD-CSE', email: 'hod.cse@iaoms.edu', role: 'HOD', department: 'Computer Science', status: 'invited', isRequired: true, canEdit: false },
            { id: 'hod-eee-001', name: 'Dr. HOD-EEE', email: 'hod.eee@iaoms.edu', role: 'HOD', department: 'Electrical Engineering', status: 'invited', isRequired: true, canEdit: false },
            { id: 'finance-001', name: 'Mr. Finance Head', email: 'finance@iaoms.edu', role: 'Finance Head', status: 'accepted', isRequired: true, canEdit: false }
          ],
          location: 'Auditorium',
          type: 'online',
          status: 'confirmed',
          priority: 'high',
          createdBy: 'registrar-001',
          category: 'financial',
          isRecurring: false,
          tags: [],
          department: 'Administration',
          documents: [],
          createdAt: new Date('2024-01-12T11:00:00Z'),
          updatedAt: new Date('2024-01-17T16:45:00Z')
        }
      ] as Meeting[];

      try {
        // Load meetings from localStorage with error handling
        const storedMeetings = loadMeetingsFromStorage();
        console.log(`[Calendar Widget] Loaded ${storedMeetings.length} meetings from localStorage`);
        
        // Combine stored meetings with mock meetings
        const allMeetings = [...storedMeetings, ...mockMeetings];
        
        // Remove duplicates based on ID
        const uniqueMeetings = allMeetings.filter((meeting, index, self) =>
          index === self.findIndex((m) => m.id === meeting.id)
        );
        
        // Apply recipient-based filtering
        const filteredMeetings = filterMeetingsByRecipient(uniqueMeetings, user);
        
        console.log(`[Calendar Widget] ✅ Total meetings: ${uniqueMeetings.length}, Filtered for user: ${filteredMeetings.length}`);

        setTimeout(() => {
          setMeetings(filteredMeetings);
          setLoading(false);
        }, 600);
      } catch (error) {
        console.error('[Calendar Widget] ❌ Error loading meetings:', error);
        // If error, still show mock meetings
        const filteredMockMeetings = filterMeetingsByRecipient(mockMeetings, user);
        setMeetings(filteredMockMeetings);
        setLoading(false);
      }
    };

    fetchMeetings();
    
    // Listen for storage events (from MeetingScheduler)
    const handleStorageChange = () => {
      console.log('[Calendar Widget] Storage event detected - reloading meetings');
      fetchMeetings();
    };
    
    window.addEventListener('meetings-updated', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('meetings-updated', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user]);

  const getUpcomingMeetings = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to midnight for accurate date comparison
    
    return meetings
      .filter(meeting => {
        const meetingDate = new Date(meeting.date);
        meetingDate.setHours(0, 0, 0, 0); // Reset to midnight
        
        // Include today and future dates
        return meetingDate >= today;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, isMobile ? 3 : 5);
  };

  const getTodaysMeetings = () => {
    const today = new Date().toISOString().split('T')[0];
    return meetings.filter(meeting => meeting.date === today);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      confirmed: { 
        variant: "success" as const, 
        text: "Confirmed",
        icon: <CheckCircle2 className="w-3 h-3 mr-1" />
      },
      pending: { 
        variant: "warning" as const, 
        text: "Pending Approval",
        icon: <Clock className="w-3 h-3 mr-1" />
      },
      cancelled: { 
        variant: "destructive" as const, 
        text: "Cancelled",
        icon: <XCircle className="w-3 h-3 mr-1" />
      },
      scheduled: { 
        variant: "default" as const, 
        text: "Scheduled",
        icon: <CalendarIcon className="w-3 h-3 mr-1" />
      }
    };
    return variants[status as keyof typeof variants] || { 
      variant: "default" as const, 
      text: status,
      icon: null
    };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'text-red-600 animate-pulse';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-muted-foreground';
    }
  };

  const upcomingMeetings = getUpcomingMeetings();
  const todaysMeetings = getTodaysMeetings();
  const pendingApprovals = meetings.filter(m => m.status === 'scheduled').length;

  if (loading) {
    return (
      <Card className={cn(
        "shadow-elegant",
        isSelected && "border-primary",
        isCustomizing && "cursor-pointer"
      )} onClick={onSelect}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Calendar & Meetings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "shadow-elegant hover:shadow-glow transition-all duration-300",
      isSelected && "border-primary",
      isCustomizing && "cursor-pointer"
    )} onClick={onSelect}>
      <CardHeader className={cn(isMobile && "pb-3")}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn(
            "flex items-center gap-2",
            isMobile ? "text-lg" : "text-xl"
          )}>
            <CalendarIcon className="w-5 h-5 text-primary" />
            Calendar & Meetings
            {pendingApprovals > 0 && (
              <Badge variant="warning" className="animate-pulse">
                {pendingApprovals} pending
              </Badge>
            )}
          </CardTitle>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate("/calendar")}
            className={cn(isMobile && "text-xs")}
          >
            <Plus className="w-4 h-4 mr-1" />
            Schedule
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Today's Meetings */}
        {todaysMeetings.length > 0 && (
          <div>
            <h4 className={cn(
              "font-semibold mb-2 flex items-center gap-2",
              isMobile ? "text-sm" : "text-base"
            )}>
              <Clock className="w-4 h-4 text-primary" />
              Today's Meetings ({todaysMeetings.length})
            </h4>
            <div className="space-y-2">
              {todaysMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className={cn(
                    "p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer",
                    meeting.priority === 'urgent' && "border-destructive bg-red-50"
                  )}
                  onClick={() => navigate(`/calendar/${meeting.id}`)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h5 className={cn(
                      "font-medium",
                      isMobile ? "text-sm" : "text-base"
                    )}>
                      {meeting.title}
                    </h5>
                    <Badge variant={getStatusBadge(meeting.status).variant} className="text-xs">
                      {getStatusBadge(meeting.status).text}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {meeting.time}
                    </div>
                    <div className="flex items-center gap-1">
                      {meeting.type === 'online' || meeting.type === 'hybrid' ? (
                        <Video className="w-3 h-3" />
                      ) : (
                        <MapPin className="w-3 h-3" />
                      )}
                      {meeting.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className={cn("w-3 h-3", getPriorityColor(meeting.priority))} />
                      <span className={getPriorityColor(meeting.priority)}>
                        {meeting.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Meetings */}
        <div>
          <h4 className={cn(
            "font-semibold mb-2 flex items-center gap-2",
            isMobile ? "text-sm" : "text-base"
          )}>
            <CalendarIcon className="w-4 h-4 text-primary" />
            Upcoming Meetings
          </h4>
          
          <div className="space-y-3">
            {upcomingMeetings.slice(0, isMobile ? 2 : 3).map((meeting) => (
              <div 
                key={meeting.id} 
                className="p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer" 
                onClick={() => navigate(`/calendar/${meeting.id}`)}
              >
                {/* Match Calendar page design exactly */}
                <div className="flex items-start justify-between mb-2">
                  <h4 className={cn(
                    "font-medium line-clamp-2",
                    isMobile ? "text-sm" : "text-sm"
                  )}>
                    {meeting.title}
                  </h4>
                  <Badge 
                    variant={getStatusBadge(meeting.status).variant} 
                    className="text-xs shrink-0 ml-2"
                  >
                    {getStatusBadge(meeting.status).icon}
                    {getStatusBadge(meeting.status).text}
                  </Badge>
                </div>
                
                {/* Vertical layout matching Calendar page */}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    {meeting.date} at {formatTime(meeting.time)}
                  </div>
                  <div className="flex items-center gap-1">
                    {getTypeIcon(meeting.type)}
                    {meeting.type === 'online' ? 
                      meetingPlatforms.find(p => p.value === meeting.meetingLinks?.primary)?.label || 'Online' 
                      : meeting.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {meeting.attendees.length} attendees
                  </div>
                </div>
                
                {/* Join Meeting Button - matching Calendar page */}
                {(meeting.type === 'online' || meeting.type === 'hybrid') && meeting.meetingLinks && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJoinMeeting(meeting);
                    }}
                  >
                    <Video className="w-3 h-3 mr-1" />
                    Join Meeting
                  </Button>
                )}
              </div>
            ))}
            
            {upcomingMeetings.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className={cn(isMobile ? "text-sm" : "text-base")}>
                  No upcoming meetings
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Calendar View */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <div key={index} className="text-center text-xs font-medium text-muted-foreground p-1">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 14 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() + i - 7);
              const dateStr = date.toISOString().split('T')[0];
              const dayMeetings = meetings.filter(m => m.date === dateStr);
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              
              return (
                <div
                  key={i}
                  className={cn(
                    "p-1 text-center cursor-pointer rounded transition-colors",
                    isToday ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                    dayMeetings.length > 0 && "border border-primary/50"
                  )}
                  onClick={() => setSelectedDate(date)}
                >
                  <div className={cn(
                    "text-xs font-medium",
                    isMobile && "text-xs"
                  )}>
                    {date.getDate()}
                  </div>
                  {dayMeetings.length > 0 && (
                    <div className="flex justify-center">
                      <div className={cn(
                        "w-1 h-1 rounded-full",
                        dayMeetings.some(m => m.priority === 'urgent') ? "bg-red-500" :
                        dayMeetings.some(m => m.priority === 'high') ? "bg-orange-500" : "bg-blue-500"
                      )} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Widget Footer */}
        <div className="flex items-center justify-center pt-4 border-t">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{meetings.length} meetings</span>
            {pendingApprovals > 0 && (
              <span className="text-warning font-medium">
                {pendingApprovals} need approval
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};