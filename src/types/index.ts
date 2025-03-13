export interface Transaction {
  id: string;
  amount: number;
  category: 'needs' | 'wants' | 'investments';
  description: string;
  date: string;
  type: 'income' | 'expense';
  paymentMethod: 'cash' | 'online';
}

export interface BudgetPercentages {
  needs: number;
  wants: number;
  investments: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: 'short_term' | 'long_term';
}

export interface MonthlySavings {
  month: string; // Format: 'YYYY-MM'
  needs: number;
  wants: number;
  investments: number;
}

export interface User {
  id: string;
  monthlyIncome: number;
  budgetPercentages: BudgetPercentages;
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
}

export interface SpendingAlert {
  type: 'warning' | 'danger' | 'success';
  message: string;
  category: 'needs' | 'wants' | 'investments';
}