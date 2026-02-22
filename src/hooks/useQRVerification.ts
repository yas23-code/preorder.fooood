import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface VerificationResult {
  success: boolean;
  error?: string;
  message?: string;
  orderId?: string;
}

export function useQRVerification() {
  const { user } = useAuth();

  const verifyCanteenOrder = useCallback(async (qrToken: string): Promise<VerificationResult> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error } = await supabase.rpc('verify_qr_and_complete_order', {
        p_qr_token: qrToken,
        p_vendor_id: user.id
      });

      if (error) {
        console.error('QR verification error:', error);
        return { success: false, error: 'Database error occurred' };
      }

      // The function returns JSON - safely cast through unknown
      const result = data as unknown as VerificationResult;
      return result;
    } catch (err) {
      console.error('QR verification exception:', err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [user]);

  const verifyShopOrder = useCallback(async (qrToken: string): Promise<VerificationResult> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error } = await supabase.rpc('verify_qr_and_complete_shop_order', {
        p_qr_token: qrToken,
        p_owner_id: user.id
      });

      if (error) {
        console.error('Shop QR verification error:', error);
        return { success: false, error: 'Database error occurred' };
      }

      // The function returns JSON - safely cast through unknown
      const result = data as unknown as VerificationResult;
      return result;
    } catch (err) {
      console.error('Shop QR verification exception:', err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [user]);

  return {
    verifyCanteenOrder,
    verifyShopOrder
  };
}
