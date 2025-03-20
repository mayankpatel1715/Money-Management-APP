import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart as PieChartIcon, 
  BarChart as BarChartIcon, 
  Wallet, 
  Target, 
  AlertTriangle,
  TrendingUp,
  Settings,
  Bell,
  Trash2,
  Save,
  RotateCcw,
  CreditCard,
  Banknote,
  PiggyBank,
  Plus,
  Filter,
  ArrowUpDown,
  Calendar,
  Edit,
  X,
  HelpCircle
} from 'lucide-react';
import { format, parseISO, isBefore, isAfter, subMonths } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  formatCurrency, 
  calculateBudget, 
  getDailySpendingLimit, 
  getSpendingStatus, 
  getTotalIncome,
  calculateMonthlySavings,
  getAccumulatedSavings,
  cn
} from '../lib/utils';
import { saveData, loadData, clearData } from '../lib/storage';
import type { Transaction, BudgetPercentages, SavingsGoal, SpendingAlert, MonthlySavings } from '../types';

const defaultPercentages: BudgetPercentages = {
  needs: 50,
  wants: 30,
  investments: 20,
};

const COLORS = {
  needs: '#10B981',
  wants: '#3B82F6',
  investments: '#8B5CF6',
  income: '#F59E0B',
  expense: '#EF4444'
};

// SavingsGoals Component
interface SavingsGoalsProps {
  savingsGoals: SavingsGoal[];
  addSavingsGoal: () => void;
  updateSavingsGoal: (id: string, amount: number) => void;
  deleteSavingsGoal: (id: string) => void;
  newGoal: Omit<SavingsGoal, 'id'>;
  setNewGoal: React.Dispatch<React.SetStateAction<Omit<SavingsGoal, 'id'>>>;
  showSavingsForm: boolean;
  setShowSavingsForm: React.Dispatch<React.SetStateAction<boolean>>;
}

const SavingsGoals: React.FC<SavingsGoalsProps> = ({
  savingsGoals,
  addSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  newGoal,
  setNewGoal,
  showSavingsForm,
  setShowSavingsForm
}) => {
  const [contributionAmount, setContributionAmount] = useState<{ [key: string]: string }>({});

  const handleContribution = (id: string) => {
    const amount = parseFloat(contributionAmount[id]);
    if (!isNaN(amount) && amount > 0) {
      updateSavingsGoal(id, amount);
      setContributionAmount(prev => ({ ...prev, [id]: '' }));
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Savings Goals</h3>
        <button
          onClick={() => setShowSavingsForm(prev => !prev)}
          className="text-xs text-blue-500 hover:underline"
        >
          {showSavingsForm ? 'Cancel' : '+ Add goal'}
        </button>
      </div>

      {showSavingsForm && (
        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md mb-3">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Goal name"
              value={newGoal.name}
              onChange={e => setNewGoal(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Target amount"
                value={newGoal.targetAmount || ''}
                onChange={e => setNewGoal(prev => ({ ...prev, targetAmount: parseFloat(e.target.value) || 0 }))}
                className="flex-1 p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
              <input
                type="date"
                value={newGoal.deadline}
                onChange={e => setNewGoal(prev => ({ ...prev, deadline: e.target.value }))}
                className="flex-1 p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>
            <select
              value={newGoal.category}
              onChange={e => setNewGoal(prev => ({ ...prev, category: e.target.value as 'short_term' | 'long_term' }))}
              className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="short_term">Short Term</option>
              <option value="long_term">Long Term</option>
            </select>
            <button
              onClick={addSavingsGoal}
              disabled={!newGoal.name || newGoal.targetAmount <= 0}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white p-2 rounded text-sm disabled:opacity-50"
            >
              Add Goal
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {savingsGoals.map(goal => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100;
          const isComplete = progress >= 100;
          const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          
          return (
            <div 
              key={goal.id} 
              className={`p-2 border rounded-md text-sm ${
                isComplete 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900' 
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium dark:text-white">{goal.name}</span>
                <button
                  onClick={() => deleteSavingsGoal(goal.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>{formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</span>
                <span className={daysLeft < 0 ? 'text-red-500' : ''}>
                  {daysLeft < 0 ? 'Overdue' : `${daysLeft} days left`}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mb-2">
                <div 
                  className={`h-1.5 rounded-full ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`} 
                  style={{ width: `${Math.min(progress, 100)}%` }}
                ></div>
              </div>
              
              {!isComplete && (
                <div className="flex gap-1 mt-1">
                  <input
                    type="number"
                    placeholder="Amount"
                    value={contributionAmount[goal.id] || ''}
                    onChange={e => setContributionAmount(prev => ({ ...prev, [goal.id]: e.target.value }))}
                    className="flex-1 p-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <button
                    onClick={() => handleContribution(goal.id)}
                    className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          );
        })}
        
        {savingsGoals.length === 0 && !showSavingsForm && (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">No savings goals yet. Add one to track your progress.</p>
        )}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [percentages, setPercentages] = useState<BudgetPercentages>(defaultPercentages);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [alerts, setAlerts] = useState<SpendingAlert[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [tempIncome, setTempIncome] = useState('');
  const [incomePaymentMethod, setIncomePaymentMethod] = useState<'cash' | 'online'>('online');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'cash' | 'online'>('online');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'budget' | 'savings'>('dashboard');
  const [showSavingsForm, setShowSavingsForm] = useState(false);
  const [isEditingPercentages, setIsEditingPercentages] = useState(false);
  const [editPercentages, setEditPercentages] = useState({ ...defaultPercentages });
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{key: keyof Transaction, direction: 'asc' | 'desc'}>({
    key: 'date',
    direction: 'desc'
  });
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [newGoal, setNewGoal] = useState<Omit<SavingsGoal, 'id'>>({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    deadline: new Date().toISOString().split('T')[0],
    category: 'short_term'
  });
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Omit<Transaction, 'id' | 'date'>>({
    amount: 0,
    category: 'needs',
    description: '',
    type: 'expense',
    paymentMethod: 'online'
  });

  // Derived state
  const totalMonthlyIncome = useMemo(() => getTotalIncome(transactions), [transactions]);
  const budget = useMemo(() => calculateBudget(totalMonthlyIncome, percentages), [totalMonthlyIncome, percentages]);
  const dailyLimit = useMemo(() => getDailySpendingLimit(budget.needs), [budget.needs]);
  const monthlySavings = useMemo(() => calculateMonthlySavings(transactions), [transactions]);
  const accumulatedSavings = useMemo(() => getAccumulatedSavings(monthlySavings), [monthlySavings]);

  // Filter transactions based on time range
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    
    // Filter by time range
    const now = new Date();
    if (selectedTimeRange !== 'all') {
      let daysToSubtract = 30;
      if (selectedTimeRange === '7days') daysToSubtract = 7;
      if (selectedTimeRange === '90days') daysToSubtract = 90;
      
      const startDate = subMonths(now, daysToSubtract / 30);
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date);
        return isAfter(transactionDate, startDate);
      });
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(query) || 
        t.category.toLowerCase().includes(query) ||
        t.paymentMethod.toLowerCase().includes(query)
      );
    }
    
    // Sort transactions
    filtered.sort((a, b) => {
      const valueA = a[sortConfig.key];
      const valueB = b[sortConfig.key];
      
      if (valueA < valueB) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    return filtered;
  }, [transactions, selectedTimeRange, searchQuery, sortConfig]);

  // Total income and expenses
  const totalIncome = useMemo(() => 
    filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  );

  const totalExpenses = useMemo(() => 
    filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  );

  // Expenses by category
  const expensesByCategory = useMemo(() => {
    const result = {
      needs: 0,
      wants: 0,
      investments: 0
    };
    
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        result[t.category] += t.amount;
      });
      
    return result;
  }, [filteredTransactions]);

  // Progress towards budget
  const budgetProgress = useMemo(() => [
    { 
      name: 'Needs', 
      budget: budget.needs, 
      spent: expensesByCategory.needs, 
      percentage: Math.min(100, (expensesByCategory.needs / budget.needs) * 100)
    },
    { 
      name: 'Wants', 
      budget: budget.wants, 
      spent: expensesByCategory.wants,
      percentage: Math.min(100, (expensesByCategory.wants / budget.wants) * 100)
    },
    { 
      name: 'Investments', 
      budget: budget.investments, 
      spent: expensesByCategory.investments,
      percentage: Math.min(100, (expensesByCategory.investments / budget.investments) * 100)
    },
  ], [budget, expensesByCategory]);

  // Trend data for line chart
  const trendData = useMemo(() => {
    const data = monthlySavings.map(ms => ({
      name: ms.month,
      income: ms.needs + ms.wants + ms.investments,
      expenses: 0
    }));
    
    // Calculate expenses for each month
    transactions.forEach(t => {
      const date = new Date(t.date);
      const monthKey = format(date, 'yyyy-MM');
      
      const monthData = data.find(d => d.name === monthKey);
      if (monthData && t.type === 'expense') {
        monthData.expenses += t.amount;
      }
    });
    
    return data;
  }, [monthlySavings, transactions]);

  // Payment method distribution
  const paymentMethodData = useMemo(() => {
    const cash = filteredTransactions
      .filter(t => t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : 0), 0);
      
    const online = filteredTransactions
      .filter(t => t.paymentMethod === 'online')
      .reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : 0), 0);
      
    return [
      { name: 'Cash', value: cash },
      { name: 'Online', value: online }
    ];
  }, [filteredTransactions]);

  useEffect(() => {
    const savedData = loadData();
    if (savedData) {
      setMonthlyIncome(savedData.monthlyIncome);
      setTransactions(savedData.transactions);
      setPercentages(savedData.percentages);
      setSavingsGoals(savedData.savingsGoals || []);
      setAlerts(savedData.alerts);
    } else {
      // First time user
      setShowWelcomeModal(true);
    }

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    saveData({
      monthlyIncome: totalMonthlyIncome,
      transactions,
      percentages,
      savingsGoals,
      alerts,
    });
  }, [totalMonthlyIncome, transactions, percentages, savingsGoals, alerts]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const incomeValue = parseFloat(tempIncome);
    if (!isNaN(incomeValue) && incomeValue > 0) {
      // Add income transactions for each category based on percentages
      const needsAmount = (incomeValue * percentages.needs) / 100;
      const wantsAmount = (incomeValue * percentages.wants) / 100;
      const investmentsAmount = (incomeValue * percentages.investments) / 100;

      // Add three separate transactions for each category
      addTransaction({
        amount: needsAmount,
        category: 'needs',
        description: `Income - Needs (${incomePaymentMethod})`,
        type: 'income',
        paymentMethod: incomePaymentMethod
      });

      addTransaction({
        amount: wantsAmount,
        category: 'wants',
        description: `Income - Wants (${incomePaymentMethod})`,
        type: 'income',
        paymentMethod: incomePaymentMethod
      });

      addTransaction({
        amount: investmentsAmount,
        category: 'investments',
        description: `Income - Investments (${incomePaymentMethod})`,
        type: 'income',
        paymentMethod: incomePaymentMethod
      });

      setTempIncome('');
    }
  };

  const addTransaction = (transaction: Omit<Transaction, 'id' | 'date'>) => {
    const newTransaction = {
      ...transaction,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
    };

    setTransactions(prevTransactions => {
      const updatedTransactions = [newTransaction, ...prevTransactions];
      
      // If it's an expense, check budget status
      if (transaction.type === 'expense') {
        const categoryTransactions = updatedTransactions
          .filter(t => t.category === transaction.category)
          .reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : 0), 0);

        const categoryBudget = budget[transaction.category];
        const status = getSpendingStatus(categoryTransactions, categoryBudget);

        if (status !== 'normal') {
          setAlerts(prev => [...prev, {
            type: status,
            message: `You're ${status === 'warning' ? 'approaching' : 'exceeding'} your ${transaction.category} budget!`,
            category: transaction.category
          }]);
          setShowAlertModal(true);
        }
      }

      return updatedTransactions;
    });
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prevTransactions => prevTransactions.filter(t => t.id !== id));
  };

  const startEditingTransaction = (transaction: Transaction) => {
    setEditingTransactionId(transaction.id);
    const { id, date, ...rest } = transaction;
    setEditingTransaction(rest);
  };

  const updateTransaction = () => {
    if (!editingTransactionId) return;

    setTransactions(prev => prev.map(t => 
      t.id === editingTransactionId 
        ? { ...editingTransaction, id: t.id, date: t.date }
        : t
    ));

    setEditingTransactionId(null);
    setEditingTransaction({
      amount: 0,
      category: 'needs',
      description: '',
      type: 'expense',
      paymentMethod: 'online'
    });
  };

  const resetData = () => {
    if (window.confirm('Are you sure you want to reset all data? This cannot be undone.')) {
      clearData();
      setMonthlyIncome(0);
      setTransactions([]);
      setPercentages(defaultPercentages);
      setSavingsGoals([]);
      setAlerts([]);
      setTempIncome('');
    }
  };

  const saveBudgetPercentages = () => {
    // Validate the percentages add up to 100
    const total = editPercentages.needs + editPercentages.wants + editPercentages.investments;
    if (total !== 100) {
      alert('Your budget percentages must add up to 100%');
      return;
    }

    setPercentages(editPercentages);
    setIsEditingPercentages(false);
  };

  const addSavingsGoal = () => {
    const goal: SavingsGoal = {
      ...newGoal,
      id: crypto.randomUUID()
    };

    setSavingsGoals(prev => [goal, ...prev]);
    setShowSavingsForm(false);
    setNewGoal({
      name: '',
      targetAmount: 0,
      currentAmount: 0,
      deadline: new Date().toISOString().split('T')[0],
      category: 'short_term'
    });
  };

  const updateSavingsGoal = (id: string, amount: number) => {
    setSavingsGoals(prev => prev.map(goal => 
      goal.id === id 
        ? { ...goal, currentAmount: goal.currentAmount + amount }
        : goal
    ));
  };

  const deleteSavingsGoal = (id: string) => {
    setSavingsGoals(prev => prev.filter(goal => goal.id !== id));
  };

  const dismissAlert = (index: number) => {
    setAlerts(prev => prev.filter((_, i) => i !== index));
  };

  const requestSort = (key: keyof Transaction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border dark:border-gray-700 rounded shadow-md">
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200`}>
      {/* Welcome modal and alert modal code remains as is */}
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Financial Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track, manage, and optimize your finances
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAlertModal(alerts.length > 0)}
              className={`relative p-2 rounded-lg ${
                alerts.length > 0 
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-200' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
              }`}
              title="Alerts"
            >
              <Bell className="w-6 h-6" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {alerts.length}
                </span>
              )}
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <button
              onClick={resetData}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              title="Reset Data"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'transactions'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('budget')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'budget'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Budget
          </button>
          <button
            onClick={() => setActiveTab('savings')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'savings'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Savings
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Monthly Income</h3>
                  <Wallet className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalMonthlyIncome)}</p>
                <div className="mt-2">
                  <form onSubmit={handleIncomeSubmit} className="flex gap-2">
                    <input
                      type="number"
                      value={tempIncome}
                      onChange={(e) => setTempIncome(e.target.value)}
                      placeholder="Add income"
                      className="flex-1 p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <select
                      value={incomePaymentMethod}
                      onChange={(e) => setIncomePaymentMethod(e.target.value as 'cash' | 'online')}
                      className="p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="cash">Cash</option>
                      <option value="online">Online</option>
                    </select>
                    <button
                      type="submit"
                      className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Daily Limit</h3>
                  <Target className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(dailyLimit)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Based on your needs budget ({formatCurrency(budget.needs)}/month)
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Monthly Savings</h3>
                  <PiggyBank className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(totalIncome - totalExpenses)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {totalIncome > 0 
                    ? `${Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)}% of income saved` 
                    : 'Add income to track savings rate'}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Expenses</h3>
                  <CreditCard className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalExpenses)}</p>
                <div className="flex items-center mt-2 text-xs">
                  <span 
                    className={`px-2 py-1 rounded ${
                      totalExpenses < totalIncome 
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                        : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                    }`}
                  >
                    {totalExpenses < totalIncome ? 'Under budget' : 'Over budget'}
                  </span>
                </div>
              </div>
            </div>

            {/* Budget Usage Chart */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Budget Usage</h3>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {budgetProgress.map(item => (
                    <span key={item.name} className="ml-4 first:ml-0">
                      {item.name}: {Math.round(item.percentage)}%
                    </span>
                  ))}
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={budgetProgress}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `${formatCurrency(value)}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar name="Budget" dataKey="budget" fill="#8884d8" />
                    <Bar name="Spent" dataKey="spent" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Transactions</h3>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="text-sm text-blue-500 hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Category</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.slice(0, 5).map((transaction) => (
                      <tr key={transaction.id} className="border-b dark:border-gray-700">
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-300">
                          {format(parseISO(transaction.date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-300">{transaction.description}</td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            transaction.category === 'needs' 
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                              : transaction.category === 'wants'
                                ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                                : 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200'
                          }`}>
                            {transaction.category}
                          </span>
                        </td>
                        <td className={`px-4 py-2 text-sm text-right ${
                          transaction.type === 'income' 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </td>
                      </tr>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                          No transactions yet. Add some to get started!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Income vs Expenses Chart */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Income vs Expenses</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `${formatCurrency(value)}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="income" stroke="#82ca9d" name="Income" />
                    <Line type="monotone" dataKey="expenses" stroke="#ff7300" name="Expenses" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Add Transaction</h3>
                <div className="flex">
                  <select
                    value={selectedTimeRange}
                    onChange={e => setSelectedTimeRange(e.target.value as '7days' | '30days' | '90days' | 'all')}
                    className="p-2 text-sm border rounded-l dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="7days">Last 7 days</option>
                    <option value="30days">Last 30 days</option>
                    <option value="90days">Last 90 days</option>
                    <option value="all">All time</option>
                  </select>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="p-2 text-sm border-y border-r rounded-r dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editingTransactionId) {
                    updateTransaction();
                  } else {
                    addTransaction(editingTransaction);
                    setEditingTransaction({
                      amount: 0,
                      category: 'needs',
                      description: '',
                      type: 'expense',
                      paymentMethod: 'online'
                    });
                  }
                }} 
                className="grid grid-cols-1 sm:grid-cols-6 gap-3 mb-4"
              >
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Description"
                    value={editingTransaction.description}
                    onChange={e => setEditingTransaction(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={editingTransaction.amount || ''}
                    onChange={e => setEditingTransaction(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <select
                    value={editingTransaction.category}
                    onChange={e => setEditingTransaction(prev => ({ ...prev, category: e.target.value as 'needs' | 'wants' | 'investments' }))}
                    className="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="needs">Needs</option>
                    <option value="wants">Wants</option>
                    <option value="investments">Investments</option>
                  </select>
                </div>
                <div>
                  <select
                    value={editingTransaction.type}
                    onChange={e => setEditingTransaction(prev => ({ ...prev, type: e.target.value as 'income' | 'expense' }))}
                    className="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div>
                  <select
                    value={editingTransaction.paymentMethod}
                    onChange={e => setEditingTransaction(prev => ({ ...prev, paymentMethod: e.target.value as 'cash' | 'online' }))}
                    className="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div>
                  <button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
                  >
                    {editingTransactionId ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                        <button 
                          onClick={() => requestSort('date')}
                          className="flex items-center"
                        >
                          Date <ArrowUpDown className="w-3 h-3 ml-1" />
                        </button>
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                        <button 
                          onClick={() => requestSort('description')}
                          className="flex items-center"
                        >
                          Description <ArrowUpDown className="w-3 h-3 ml-1" />
                        </button>
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Category</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Method</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                        <button 
                          onClick={() => requestSort('amount')}
                          className="flex items-center ml-auto"
                        >
                          Amount <ArrowUpDown className="w-3 h-3 ml-1" />
                        </button>
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b dark:border-gray-700">
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-300">
                          {format(parseISO(transaction.date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-300">
                          {transaction.description}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            transaction.category === 'needs' 
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                              : transaction.category === 'wants'
                                ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                                : 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200'
                          }`}>
                            {transaction.category}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            transaction.type === 'income' 
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                              : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                          }`}>
                            {transaction.type}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-300">
                          {transaction.paymentMethod}
                        </td>
                        <td className={`px-4 py-2 text-sm text-right ${
                          transaction.type === 'income' 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </td>
                        <td className="px-4 py-2 text-sm text-center">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => startEditingTransaction(transaction)}
                              className="text-blue-500 hover:text-blue-700"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteTransaction(transaction.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                          No transactions found. Add some or adjust your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Methods Chart */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Payment Methods</h3>
              <div className="h-64 flex items-center justify-center">
                {paymentMethodData.some(item => item.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {paymentMethodData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.needs : COLORS.wants} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center">
                    No expense data to display. Add some transactions first.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Budget Tab */}
        {activeTab === 'budget' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Budget Allocation</h3>
                <button
                  onClick={() => {
                    if (isEditingPercentages) {
                      saveBudgetPercentages();
                    } else {
                      setEditPercentages({ ...percentages });
                      setIsEditingPercentages(true);
                    }
                  }}
                  className="text-sm text-blue-500 hover:underline flex items-center"
                >
                  {isEditingPercentages ? (
                    <>
                      <Save className="w-4 h-4 mr-1" /> Save
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-1" /> Edit
                    </>
                  )}
                </button>
              </div>

              {isEditingPercentages ? (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <span className="w-24 text-sm text-gray-700 dark:text-gray-300">Needs:</span>
                    <input
                      type="number"
                      value={editPercent