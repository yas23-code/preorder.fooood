import { useAuth } from '@/context/AuthContext';

export function useSuperAdmin() {
  const { isSuperAdmin, isLoading } = useAuth();

  return { isSuperAdmin, isLoading };
}
