import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Ban, User, Store, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface BannedEntity {
  id: string;
  target_id: string;
  target_type: 'student' | 'canteen';
  reason: string;
  ban_type: string;
  expires_at: string | null;
  created_at: string;
  name: string;
  email?: string;
}

interface BannedEntitiesListProps {
  onSelectStudent: (id: string) => void;
  onSelectCanteen: (id: string) => void;
}

export function BannedEntitiesList({ onSelectStudent, onSelectCanteen }: BannedEntitiesListProps) {
  const [bannedEntities, setBannedEntities] = useState<BannedEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBannedEntities = async () => {
    setIsLoading(true);
    try {
      // Fetch all active bans
      const { data: bans, error: bansError } = await supabase
        .from('bans')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (bansError) throw bansError;

      if (!bans || bans.length === 0) {
        setBannedEntities([]);
        setIsLoading(false);
        return;
      }

      // Separate student and canteen IDs
      const studentIds = bans.filter(b => b.target_type === 'student').map(b => b.target_id);
      const canteenIds = bans.filter(b => b.target_type === 'canteen').map(b => b.target_id);

      // Fetch student names
      let studentMap: Record<string, { name: string; email: string }> = {};
      if (studentIds.length > 0) {
        const { data: students } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', studentIds);
        
        if (students) {
          studentMap = students.reduce((acc, s) => {
            acc[s.id] = { name: s.name, email: s.email };
            return acc;
          }, {} as Record<string, { name: string; email: string }>);
        }
      }

      // Fetch canteen names
      let canteenMap: Record<string, string> = {};
      if (canteenIds.length > 0) {
        const { data: canteens } = await supabase
          .from('canteens')
          .select('id, name')
          .in('id', canteenIds);
        
        if (canteens) {
          canteenMap = canteens.reduce((acc, c) => {
            acc[c.id] = c.name;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Combine data
      const entities: BannedEntity[] = bans.map(ban => ({
        id: ban.id,
        target_id: ban.target_id,
        target_type: ban.target_type as 'student' | 'canteen',
        reason: ban.reason,
        ban_type: ban.ban_type,
        expires_at: ban.expires_at,
        created_at: ban.created_at,
        name: ban.target_type === 'student' 
          ? studentMap[ban.target_id]?.name || 'Unknown Student'
          : canteenMap[ban.target_id] || 'Unknown Canteen',
        email: ban.target_type === 'student' ? studentMap[ban.target_id]?.email : undefined,
      }));

      setBannedEntities(entities);
    } catch (error) {
      console.error('Error fetching banned entities:', error);
      toast.error('Failed to load banned entities');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBannedEntities();
  }, []);

  const handleUnban = async (banId: string, name: string) => {
    try {
      const { error } = await supabase
        .from('bans')
        .update({ is_active: false })
        .eq('id', banId);

      if (error) throw error;

      toast.success(`${name} has been unbanned`);
      fetchBannedEntities();
    } catch (error) {
      console.error('Error unbanning:', error);
      toast.error('Failed to unban');
    }
  };

  const handleViewDetails = (entity: BannedEntity) => {
    if (entity.target_type === 'student') {
      onSelectStudent(entity.target_id);
    } else {
      onSelectCanteen(entity.target_id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            Banned Students & Canteens
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ban className="h-5 w-5 text-destructive" />
          Banned Students & Canteens
          {bannedEntities.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {bannedEntities.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bannedEntities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-10 w-10 mx-auto mb-2 text-primary" />
            <p>No active bans</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {bannedEntities.map(entity => (
              <div 
                key={entity.id} 
                className="border border-destructive/20 bg-destructive/5 rounded-lg p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {entity.target_type === 'student' ? (
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <Store className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="font-medium truncate">{entity.name}</span>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {entity.target_type}
                      </Badge>
                    </div>
                    {entity.email && (
                      <p className="text-xs text-muted-foreground truncate mb-1">
                        {entity.email}
                      </p>
                    )}
                    <p className="text-sm text-destructive/80 line-clamp-1">
                      Reason: {entity.reason}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(entity.created_at), 'MMM d, yyyy')}
                      </span>
                      <Badge variant={entity.ban_type === 'permanent' ? 'destructive' : 'secondary'} className="text-xs">
                        {entity.ban_type}
                      </Badge>
                      {entity.expires_at && (
                        <span className="text-primary">
                          Expires: {format(new Date(entity.expires_at), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={() => handleViewDetails(entity)}
                    >
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs text-primary hover:text-primary/80 hover:bg-primary/10"
                      onClick={() => handleUnban(entity.id, entity.name)}
                    >
                      Unban
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
