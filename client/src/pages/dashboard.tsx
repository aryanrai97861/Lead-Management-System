import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Plus, LogOut, BarChart, Settings, Download } from "lucide-react";
import LeadsGrid from "@/components/leads-grid";
import LeadModal from "@/components/lead-modal";
import { Lead } from "@shared/schema";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const handleLogout = () => {
    // call the logout helper from the auth provider
    logout();
  };

  const handleCreateLead = () => {
    setIsCreateModalOpen(true);
    setEditingLead(null);
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingLead(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex items-center justify-center h-16 px-4 bg-primary">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-6 w-6 text-white" />
            <span className="text-xl font-bold text-white">LeadManager</span>
          </div>
        </div>
        
        <nav className="mt-8">
          <div className="px-4 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start bg-primary/10 text-primary border-r-4 border-primary"
              data-testid="nav-leads"
            >
              <Users className="mr-3 h-4 w-4" />
              Leads
            </Button>
            <Button variant="ghost" className="w-full justify-start" data-testid="nav-analytics">
              <BarChart className="mr-3 h-4 w-4" />
              Analytics
            </Button>
            <Button variant="ghost" className="w-full justify-start" data-testid="nav-settings">
              <Settings className="mr-3 h-4 w-4" />
              Settings
            </Button>
          </div>
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 px-4 py-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-white text-sm">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate" data-testid="text-username">
                {user?.username}
              </p>
              <p className="text-xs text-gray-500">Manager</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 flex-1">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
                <p className="text-sm text-gray-600 mt-1">Manage and track your sales leads</p>
              </div>
              <div className="flex items-center space-x-4">
                <Button onClick={handleCreateLead} data-testid="button-create-lead">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lead
                </Button>
                <Button variant="outline" size="sm" data-testid="button-export">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Leads Grid */}
        <div className="p-6">
          <Card>
            <CardContent className="p-0">
              <LeadsGrid onEditLead={handleEditLead} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lead Modal */}
      <LeadModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        lead={editingLead}
        onClose={handleCloseModal}
      />
    </div>
  );
}
