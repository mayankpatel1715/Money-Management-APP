import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Transaction, BudgetPercentages, MonthlySavings } from '../types';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

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

export function getTotalIncome(transactions: Transaction[]): number {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  return transactions
    .filter(t => {
      const transactionDate = new Date(t.date);
      return (
        t.type === 'income' &&
        transactionDate.getMonth() === currentMonth &&
        transactionDate.getFullYear() === currentYear
      );
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getMonthKey(date: Date): string {
  return format(date, 'yyyy-MM');
}

export function calculateMonthlySavings(transactions: Transaction[]): MonthlySavings[] {
  const savingsByMonth = new Map<string, MonthlySavings>();

  // Sort transactions by date
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  sortedTransactions.forEach(transaction => {
    const date = new Date(transaction.date);
    const monthKey = getMonthKey(date);

    if (!savingsByMonth.has(monthKey)) {
      savingsByMonth.set(monthKey, {
        month: monthKey,
        needs: 0,
        wants: 0,
        investments: 0
      });
    }

    const monthSavings = savingsByMonth.get(monthKey)!;
    const amount = transaction.type === 'expense' ? -transaction.amount : transaction.amount;

    switch (transaction.category) {
      case 'needs':
        monthSavings.needs += amount;
        break;
      case 'wants':
        monthSavings.wants += amount;
        break;
      case 'investments':
        monthSavings.investments += amount;
        break;
    }
  });

  // Convert to array and sort by month
  return Array.from(savingsByMonth.values())
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function getAccumulatedSavings(monthlySavings: MonthlySavings[]): MonthlySavings {
  return monthlySavings.reduce(
    (acc, curr) => ({
      month: 'Total',
      needs: acc.needs + curr.needs,
      wants: acc.wants + curr.wants,
      investments: acc.investments + curr.investments
    }),
    { month: 'Total', needs: 0, wants: 0, investments: 0 }
  );
}