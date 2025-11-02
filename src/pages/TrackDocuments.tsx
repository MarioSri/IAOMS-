import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DocumentTracker } from "@/components/DocumentTracker";
import { FileViewer } from "@/components/FileViewer";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const TrackDocuments = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [viewingFile, setViewingFile] = useState<File | null>(null);
  const [viewingFiles, setViewingFiles] = useState<File[]>([]);
  const [showFileViewer, setShowFileViewer] = useState(false);

  const handleViewFile = (file: File) => {
    setViewingFile(file);
    setViewingFiles([]);
    setShowFileViewer(true);
  };

  const handleViewFiles = (files: File[]) => {
    setViewingFiles(files);
    setViewingFile(null);
    setShowFileViewer(true);
  };

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
          <h1 className="text-3xl font-bold text-foreground mb-2">Track Documents</h1>
          <p className="text-muted-foreground">Monitor the status and progress of your submitted documents</p>
        </div>

        <div className="space-y-6">
          <DocumentTracker 
            userRole={user.role} 
            onViewFile={handleViewFile}
            onViewFiles={handleViewFiles}
          />
        </div>
      </div>
      
      <FileViewer
        file={viewingFile}
        files={viewingFiles.length > 0 ? viewingFiles : undefined}
        open={showFileViewer}
        onOpenChange={setShowFileViewer}
      />
    </DashboardLayout>
  );
};

export default TrackDocuments;
