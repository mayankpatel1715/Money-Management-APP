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
      {showWelcomeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4 dark:text-white">Welcome to Your Financial Dashboard!</h2>
            <p className="mb-4 dark:text-gray-300">This app helps you manage your finances using the 50/30/20 rule:</p>
            <ul className="mb-6 space-y-2 dark:text-gray-300">
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span><strong>50% for Needs:</strong> Essential expenses like rent, utilities, groceries</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span><strong>30% for Wants:</strong> Non-essential spending like eating out, entertainment</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                <span><strong>20% for Investments:</strong> Savings, debt repayment, investments</span>
              </li>
            </ul>
            <p className="mb-4 dark:text-gray-300">Start by adding your income in the dashboard!</p>
            <button 
              onClick={() => setShowWelcomeModal(false)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
      
      {showAlertModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold dark:text-white flex items-center">
                <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
                Budget Alert
              </h2>
              <button 
                onClick={() => setShowAlertModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {alerts.map((alert, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-md ${
                    alert.type === 'warning' 
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200' 
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                  }`}
                >
                  <div className="flex justify-between">
                    <p>{alert.message}</p>
                    <button 
                      onClick={() => dismissAlert(index)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm mt-1 capitalize">Category: {alert.category}</p>
                </div>
              ))}
            </div>
            <button 
              onClick={() => {
                setShowAlertModal(false);
                setActiveTab('budget');
              }}
              className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded transition-colors"
            >
              Review Budget
            </button>
          </div>
        </div>
      )}
    
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
              title="Toggle dark mode"
            >
              {isDarkMode ? '🌞' : '🌙'}
            </button>
            <button
              onClick={resetData}
              className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
              title="Reset all data"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center px-4 py-3 font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <PieChartIcon className="w-5 h-5 mr-2" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center px-4 py-3 font-medium transition-colors ${
              activeTab === 'transactions'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <TrendingUp className="w-5 h-5 mr-2" />
            <span>Transactions</span>
          </button>
          <button
            onClick={() => setActiveTab('budget')}
            className={`flex items-center px-4 py-3 font-medium transition-colors ${
              activeTab === 'budget'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Target className="w-5 h-5 mr-2" />
            <span>Budget</span>
          </button>
          <button
            onClick={() => setActiveTab('savings')}
            className={`flex items-center px-4 py-3 font-medium transition-colors ${
              activeTab === 'savings'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <PiggyBank className="w-5 h-5 mr-2" />
            <span>Savings</span>
          </button>
        </div>

        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* Monthly Income Card */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                      <Wallet className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                    </div>
                    <h2 className="text-lg font-semibold dark:text-white">Monthly Income</h2>
                  </div>
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" title="Your total income for the current month" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {formatCurrency(totalMonthlyIncome)}
                </p>
                <div className="mt-2">
                  <button
                    onClick={() => document.getElementById('income-form')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-sm text-blue-500 dark:text-blue-400 hover:underline"
                  >
                    + Add new income
                  </button>
                </div>
              </div>

              {/* Monthly Expenses Card */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                      <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
                    </div>
                    <h2 className="text-lg font-semibold dark:text-white">Monthly Expenses</h2>
                  </div>
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" title="Your total expenses for the current month" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {formatCurrency(totalExpenses)}
                </p>
                <div className="mt-2">
                  <button
                    onClick={() => document.getElementById('expense-form')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-sm text-blue-500 dark:text-blue-400 hover:underline"
                  >
                    + Add new expense
                  </button>
                </div>
              </div>

              {/* Daily Spending Limit */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <Target className="w-5 h-5 text-green-500 dark:text-green-400" />
                    </div>
                    <h2 className="text-lg font-semibold dark:text-white">Daily Limit</h2>
                  </div>
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" title="Recommended daily spending limit based on your budget" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {formatCurrency(dailyLimit)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Based on your needs allocation
                </p>
              </div>

              {/* Savings */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center