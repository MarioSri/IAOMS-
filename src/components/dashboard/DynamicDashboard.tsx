import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsive } from '@/hooks/useResponsive';
import { getDashboardConfig } from '@/config/roleConfigs';
import { DashboardWidget } from '@/types/dashboard';
import { cn } from '@/lib/utils';

// Widget Components
import { QuickActionsWidget } from './widgets/QuickActionsWidget';
import { DocumentsWidget } from './widgets/DocumentsWidget';
import { CalendarWidget } from './widgets/CalendarWidget';
import { NotificationsWidget } from './widgets/NotificationsWidget';
import { AnalyticsWidget } from './widgets/AnalyticsWidget';



import {
  Settings,
  Layout,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  RotateCcw,
  Save
} from 'lucide-react';

interface DynamicDashboardProps {
  className?: string;
}

export const DynamicDashboard: React.FC<DynamicDashboardProps> = ({ className }) => {
  const { user } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const [dashboardConfig, setDashboardConfig] = useState<any>(null);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);

  // Supported widget types - only these will be rendered
  const supportedWidgetTypes = [
    'quickActions', 'documents', 'calendar', 'notifications', 
    'analytics'
  ];

  useEffect(() => {
    if (user) {
      const config = getDashboardConfig(user.role, user.department, user.branch);
      setDashboardConfig(config);
      
      // FORCE RESET for principal role to ensure Quick Actions appears
      if (user.role === 'principal') {
        localStorage.removeItem(`dashboard-widgets-${user.role}`);
        console.log('Principal dashboard reset - Quick Actions will appear');
      }
      
      // Define disallowed widgets for specific roles
      const disallowedWidgetsForRole = user.role && ['employee', 'registrar', 'program-head', 'hod', 'principal'].includes(user.role)
        ? ['analytics']
        : [];
      
      // Clean up any invalid widgets from localStorage
      const savedWidgets = localStorage.getItem(`dashboard-widgets-${user.role}`);
      if (savedWidgets) {
        try {
          const parsed = JSON.parse(savedWidgets);
          // Filter out unsupported widget types and disallowed widgets for role
          let validWidgets = parsed.filter((widget: DashboardWidget) => 
            supportedWidgetTypes.includes(widget.type) && 
            !disallowedWidgetsForRole.includes(widget.type)
          );
          
          // CRITICAL FIX: Ensure Quick Actions widget is always present for all roles
          const hasQuickActions = validWidgets.some((w: DashboardWidget) => w.type === 'quickActions');
          if (!hasQuickActions) {
            console.log('Quick Actions widget missing - adding it back');
            validWidgets.unshift({
              id: 'quickActions',
              type: 'quickActions',
              title: 'Quick Actions',
              position: { x: 0, y: 0, w: isMobile ? 12 : 6, h: 2 },
              visible: true,
              permissions: []
            });
          }
          
          // If we filtered out invalid widgets or added Quick Actions, save the cleaned version
          if (validWidgets.length !== parsed.length || !hasQuickActions) {
            localStorage.setItem(`dashboard-widgets-${user.role}`, JSON.stringify(validWidgets));
          }
          
          setWidgets(validWidgets.length > 0 ? validWidgets : getDefaultWidgets(config));
        } catch (error) {
          console.error('Error parsing saved widgets:', error);
          // Clear corrupted data and use defaults
          localStorage.removeItem(`dashboard-widgets-${user.role}`);
          setWidgets(getDefaultWidgets(config));
        }
      } else {
        setWidgets(getDefaultWidgets(config));
      }
    }
  }, [user]);

  const getDefaultWidgets = (config: any): DashboardWidget[] => {
    const defaultWidgets: DashboardWidget[] = [
      {
        id: 'quickActions',
        type: 'quickActions',
        title: 'Quick Actions',
        position: { x: 0, y: 0, w: isMobile ? 12 : 6, h: 2 },
        visible: true,
        permissions: []
      },
      {
        id: 'documents',
        type: 'documents',
        title: 'Recent Documents',
        position: { x: isMobile ? 0 : 6, y: 0, w: isMobile ? 12 : 6, h: 3 },
        visible: true,
        permissions: []
      },
      {
        id: 'calendar',
        type: 'calendar',
        title: 'Calendar & Meetings',
        position: { x: 0, y: 2, w: isMobile ? 12 : 6, h: 3 },
        visible: true,
        permissions: []
      },
      {
        id: 'notifications',
        type: 'notifications',
        title: 'Notifications',
        position: { x: isMobile ? 0 : 6, y: 2, w: isMobile ? 12 : 6, h: 2 },
        visible: true,
        permissions: []
      },
      {
        id: 'analytics',
        type: 'analytics',
        title: 'Analytics',
        position: { x: 0, y: 5, w: isMobile ? 12 : 6, h: 2 },
        visible: config.permissions.canViewAnalytics && 
                !['employee', 'registrar', 'program-head', 'hod', 'principal'].includes(user?.role || ''),
        permissions: ['canViewAnalytics']
      },


    ];

    const filteredWidgets = defaultWidgets.filter(widget => {
      // Always include Quick Actions widget regardless of permissions
      if (widget.type === 'quickActions') return true;
      
      if (widget.permissions.length === 0) return widget.visible;
      return widget.permissions.every(permission => 
        config.permissions[permission as keyof typeof config.permissions]
      );
    });
    
    // Final safeguard: Ensure Quick Actions is always first
    const quickActionsIndex = filteredWidgets.findIndex(w => w.type === 'quickActions');
    if (quickActionsIndex > 0) {
      const quickActions = filteredWidgets.splice(quickActionsIndex, 1)[0];
      filteredWidgets.unshift(quickActions);
    }
    
    return filteredWidgets;
  };

  const renderWidget = (widget: DashboardWidget) => {
    if (!widget.visible) return null;

    const widgetProps = {
      userRole: user?.role || '',
      permissions: dashboardConfig?.permissions,
      isCustomizing,
      onSelect: () => setSelectedWidget(widget.id),
      isSelected: selectedWidget === widget.id
    };

    const WidgetComponent = () => {
      switch (widget.type) {
        case 'quickActions':
          return <QuickActionsWidget {...widgetProps} />;
        case 'documents':
          return <DocumentsWidget {...widgetProps} />;
        case 'calendar':
          return <CalendarWidget {...widgetProps} />;
        case 'notifications':
          return <NotificationsWidget {...widgetProps} />;
        case 'analytics':
          return <AnalyticsWidget {...widgetProps} />;


        default:
          return <div>Unknown widget type: {widget.type}</div>;
      }
    };

    return (
      <div
        key={widget.id}
        className={cn(
          "relative transition-all duration-200",
          isCustomizing && "border-2 border-dashed border-primary/50 rounded-lg",
          selectedWidget === widget.id && "border-primary shadow-glow"
        )}
        style={{
          gridColumn: isMobile ? 'span 1' : `span ${widget.position.w}`,
          gridRow: `span ${widget.position.h}`
        }}
        onClick={() => isCustomizing && setSelectedWidget(widget.id)}
      >
        <WidgetComponent />
        
        {isCustomizing && (
          <div className="absolute top-2 right-2 flex gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                toggleWidgetVisibility(widget.id);
              }}
            >
              {widget.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    setWidgets(prev => prev.map(widget =>
      widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget
    ));
  };

  const saveLayout = () => {
    if (user) {
      localStorage.setItem(`dashboard-widgets-${user.role}`, JSON.stringify(widgets));
      setIsCustomizing(false);
      setSelectedWidget(null);
    }
  };

  const resetLayout = () => {
    if (dashboardConfig) {
      setWidgets(getDefaultWidgets(dashboardConfig));
    }
  };

  if (!user || !dashboardConfig) {
    return <div>Loading dashboard...</div>;
  }

  const layout = dashboardConfig.dashboardLayout;
  const currentLayout = isMobile ? layout.responsive.mobile : 
                       isTablet ? layout.responsive.tablet : 
                       layout.responsive.desktop;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Dashboard Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className={cn(
            "font-bold",
            isMobile ? "text-2xl" : "text-3xl"
          )}>
            {dashboardConfig.displayName} Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isCustomizing ? "default" : "outline"}
            onClick={() => setIsCustomizing(!isCustomizing)}
            className={cn(isMobile && "h-12")}
          >
            <Layout className="w-4 h-4 mr-2" />
            {isCustomizing ? "Exit Customize" : "Customize"}
          </Button>
          
          {isCustomizing && (
            <>
              <Button
                variant="outline"
                onClick={resetLayout}
                className={cn(isMobile && "h-12")}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button
                onClick={saveLayout}
                className={cn(isMobile && "h-12")}
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Customization Instructions */}
      {isCustomizing && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-primary">
              <Settings className="w-5 h-5" />
              <span className="font-medium">Customization Mode Active</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Click on widgets to select them. Use the eye icon to show/hide widgets. 
              Changes are saved automatically when you exit customization mode.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Grid */}
      <div 
        className={cn(
          "grid gap-4 auto-rows-min",
          isMobile ? "grid-cols-1" : 
          isTablet ? "grid-cols-2" : 
          "grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
        )}
        style={{
          gridTemplateColumns: isMobile ? '1fr' : 
                              isTablet ? 'repeat(2, 1fr)' :
                              `repeat(${currentLayout.columns}, 1fr)`
        }}
      >
        {widgets
          .filter(widget => widget.visible || isCustomizing)
          .map(widget => renderWidget(widget))}
      </div>

      {/* Widget Customization Panel */}
      {isCustomizing && selectedWidget && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-lg">
              Widget Settings: {widgets.find(w => w.id === selectedWidget)?.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="text-sm font-medium">Width</label>
                <select 
                  className="w-full mt-1 p-2 border rounded"
                  value={widgets.find(w => w.id === selectedWidget)?.position.w || 1}
                  onChange={(e) => {
                    const newWidth = parseInt(e.target.value);
                    setWidgets(prev => prev.map(widget =>
                      widget.id === selectedWidget 
                        ? { ...widget, position: { ...widget.position, w: newWidth } }
                        : widget
                    ));
                  }}
                >
                  {[1, 2, 3, 4, 6, 12].map(w => (
                    <option key={w} value={w}>{w} columns</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Height</label>
                <select 
                  className="w-full mt-1 p-2 border rounded"
                  value={widgets.find(w => w.id === selectedWidget)?.position.h || 1}
                  onChange={(e) => {
                    const newHeight = parseInt(e.target.value);
                    setWidgets(prev => prev.map(widget =>
                      widget.id === selectedWidget 
                        ? { ...widget, position: { ...widget.position, h: newHeight } }
                        : widget
                    ));
                  }}
                >
                  {[1, 2, 3, 4, 5, 6].map(h => (
                    <option key={h} value={h}>{h} rows</option>
                  ))}
                </select>
              </div>
              
              <Button
                variant="outline"
                onClick={() => toggleWidgetVisibility(selectedWidget)}
                className="mt-6"
              >
                {widgets.find(w => w.id === selectedWidget)?.visible ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Show
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setSelectedWidget(null)}
                className="mt-6"
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      )}


    </div>
  );
};