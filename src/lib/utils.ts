import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

type BudgetPercentages = {
  needs: number;
  wants: number;
  investments: number;
};

export function calculateBudget(income: number, percentages: BudgetPercentages) {
  return {
    needs: (income * percentages.needs) / 100,
    wants: (income * percentages.wants) / 100,
    investments: (income * percentages.investments) / 100,
  };
}

export function getDailySpendingLimit(needsBudget: number): number {
  const daysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate();
  return needsBudget / daysInMonth;
}

export function calculateProgress(current: number, target: number): number {
  return Math.min((current / target) * 100, 100);
}

export function getSpendingStatus(spent: number, budget: number): 'normal' | 'warning' | 'danger' {
  const percentage = (spent / budget) * 100;
  if (percentage < 80) return 'normal';
  if (percentage < 100) return 'warning';
  return 'danger';
}