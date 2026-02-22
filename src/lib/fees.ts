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

  // Platform fee calculation
  let platformFee: number;
  if (orderAmount <= 50) {
    platformFee = 1.50;
  } else {
    platformFee = roundTo2(orderAmount * 0.03);
  }

  // PG fee is 2% of total payable (order + platform fee)
  const totalPayable = roundTo2(orderAmount + platformFee);
  const pgFee = roundTo2(totalPayable * 0.02);

  // Net profit
  const netProfit = roundTo2(platformFee - pgFee);

  // Safety check: ensure net profit is always >= ₹0.50
  // If not, bump platform fee to cover it
  if (netProfit < 0.50) {
    // We need: platformFee - 0.02 * (orderAmount + platformFee) >= 0.50
    // platformFee - 0.02*orderAmount - 0.02*platformFee >= 0.50
    // 0.98*platformFee >= 0.50 + 0.02*orderAmount
    // platformFee >= (0.50 + 0.02*orderAmount) / 0.98
    const adjustedFee = roundTo2((0.50 + 0.02 * orderAmount) / 0.98);
    platformFee = Math.max(platformFee, adjustedFee);

    const newTotal = roundTo2(orderAmount + platformFee);
    const newPgFee = roundTo2(newTotal * 0.02);
    const newNetProfit = roundTo2(platformFee - newPgFee);

    return {
      orderAmount: roundTo2(orderAmount),
      platformFee,
      pgFee: newPgFee,
      netProfit: newNetProfit,
      totalPayable: newTotal,
    };
  }

  return {
    orderAmount: roundTo2(orderAmount),
    platformFee,
    pgFee,
    netProfit,
    totalPayable,
  };
}
