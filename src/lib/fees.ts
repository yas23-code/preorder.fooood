/**
 * Platform Fee Calculation System
 * 
 * Business Rules:
 * - PG charges 2% on every order
 * - Platform must earn minimum ₹0.50 net profit after PG fee
 * - Orders < ₹50: Platform Fee = ₹0
 * - Orders ₹50-₹69: Platform Fee = ₹3
 * - Orders ₹70-₹99: Platform Fee = ₹2.5
 * - Orders >= ₹100: Platform Fee = ₹4
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

  // Platform fee tiers based on order amount
  let platformFee = 0;
  if (orderAmount >= 50 && orderAmount <= 69) {
    platformFee = 3;
  } else if (orderAmount >= 70 && orderAmount < 100) {
    platformFee = 2.5;
  } else if (orderAmount >= 100) {
    platformFee = 4;
  }

  return {
    orderAmount: roundTo2(orderAmount),
    platformFee,
    pgFee: 0,
    netProfit: platformFee,
    totalPayable: roundTo2(orderAmount + platformFee),
  };
}
