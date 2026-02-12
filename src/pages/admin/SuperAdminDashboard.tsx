import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { SearchModule } from '@/components/admin/SearchModule';
import { StudentDetailView } from '@/components/admin/StudentDetailView';
import { CanteenDetailView } from '@/components/admin/CanteenDetailView';
import { DailyCollectionReport } from '@/components/admin/DailyCollectionReport';
import { BannedEntitiesList } from '@/components/admin/BannedEntitiesList';
import { CollegeConfigManager } from '@/components/admin/CollegeConfigManager';
import { PendingShopApprovals } from '@/components/admin/PendingShopApprovals';
import { PendingCanteenApprovals } from '@/components/admin/PendingCanteenApprovals';
import { RejectedOrdersList } from '@/components/admin/RejectedOrdersList';
import { LogOut, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type ViewState = 
  | { type: 'search' }
  | { type: 'student'; id: string }
  | { type: 'canteen'; id: string };

export default function SuperAdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [viewState, setViewState] = useState<ViewState>({ type: 'search' });

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSelectStudent = (id: string) => {
    setViewState({ type: 'student', id });
  };

  const handleSelectCanteen = (id: string) => {
    setViewState({ type: 'canteen', id });
  };

  const handleBackToSearch = () => {
    setViewState({ type: 'search' });
  };

  return (
    <div className="min-h-screen bg-mcd-cream">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-mcd-border shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-3 py-1 rounded-full">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-semibold">Super Admin</span>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="text-muted-foreground">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {viewState.type === 'search' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Super Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage students, canteens, and view reports</p>
            </div>

            {/* Pending Approvals */}
            <PendingShopApprovals />
            <PendingCanteenApprovals />

            {/* Rejected Orders for Refunds */}
            <RejectedOrdersList />

            {/* Daily Report */}
            <DailyCollectionReport />

            {/* College Location Config */}
            <CollegeConfigManager />

            {/* Banned Entities List */}
            <BannedEntitiesList
              onSelectStudent={handleSelectStudent}
              onSelectCanteen={handleSelectCanteen}
            />

            {/* Search Module */}
            <SearchModule
              onSelectStudent={handleSelectStudent}
              onSelectCanteen={handleSelectCanteen}
            />
          </div>
        )}

        {viewState.type === 'student' && (
          <StudentDetailView
            studentId={viewState.id}
            onBack={handleBackToSearch}
          />
        )}

        {viewState.type === 'canteen' && (
          <CanteenDetailView
            canteenId={viewState.id}
            onBack={handleBackToSearch}
          />
        )}
      </main>
    </div>
  );
}
