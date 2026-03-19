/**
 * Platform Fee Calculation System
 * 
 * Business Rules:
 * - PG charges 2% on every order
 * - Platform must earn minimum ₹0.50 net profit after PG fee
 * - Orders ≤ ₹50: Platform Fee = ₹1.50 (flat)
 * - Orders > ₹50: Platform Fee = 3% of order amount
 */

export interface FeeBreakdown {
  orderAmount: number;
  platformFee: number;
  pgFee: number;
  netProfit: number;
  totalPayable: number;
}

export function calculateFees(orderAmount: number): FeeBreakdown {
  const roundTo2 = (n: number) => Math.round(n * 100) / 100;

  return {
    orderAmount: roundTo2(orderAmount),
    platformFee: 0,
    pgFee: 0,
    netProfit: 0,
    totalPayable: roundTo2(orderAmount),
  };
}
