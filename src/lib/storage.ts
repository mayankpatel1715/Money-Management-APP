import type { Transaction, BudgetPercentages, SavingsGoal, SpendingAlert } from '../types';

interface StorageData {
  monthlyIncome: number;
  transactions: Transaction[];
  percentages: BudgetPercentages;
  savingsGoals: SavingsGoal[];
  alerts: SpendingAlert[];
}

const STORAGE_KEY = 'financial_dashboard_data';

export function saveData(data: StorageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('Data saved successfully:', data);
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

export function loadData(): StorageData | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      console.log('Data loaded successfully');
      return JSON.parse(data);
    }
    console.log('No saved data found');
    return null;
  } catch (error) {
    console.error('Error loading data:', error);
    return null;
  }
}

export function clearData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Data cleared successfully');
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}