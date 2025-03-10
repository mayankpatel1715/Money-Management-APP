import React, { useState, useEffect } from 'react';
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
  Banknote
} from 'lucide-react';
import { format } from 'date-fns';
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
  ResponsiveContainer
} from 'recharts';
import { formatCurrency, calculateBudget, getDailySpendingLimit, getSpendingStatus } from '../lib/utils';
import { saveData, loadData, clearData } from '../lib/storage';
import type { Transaction, BudgetPercentages, SavingsGoal, SpendingAlert } from '../types';

const defaultPercentages: BudgetPercentages = {
  needs: 40,
  wants: 30,
  investments: 30,
};

const COLORS = {
  needs: '#10B981',
  wants: '#3B82F6',
  investments: '#8B5CF6',
};

export default function Dashboard() {
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [percentages, setPercentages] = useState(defaultPercentages);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [alerts, setAlerts] = useState<SpendingAlert[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [tempIncome, setTempIncome] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'online'>('online');

  const budget = calculateBudget(monthlyIncome, percentages);
  const dailyLimit = getDailySpendingLimit(budget.needs);

  useEffect(() => {
    const savedData = loadData();
    if (savedData) {
      setMonthlyIncome(savedData.monthlyIncome);
      setTransactions(savedData.transactions);
      setPercentages(savedData.percentages);
      setSavingsGoals(savedData.savingsGoals);
      setAlerts(savedData.alerts);
    }

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    saveData({
      monthlyIncome,
      transactions,
      percentages,
      savingsGoals,
      alerts,
    });
  }, [monthlyIncome, transactions, percentages, savingsGoals, alerts]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const incomeValue = parseFloat(tempIncome);
    if (!isNaN(incomeValue) && incomeValue > 0) {
      setMonthlyIncome(incomeValue);
      addTransaction({
        amount: incomeValue,
        category: 'needs',
        description: `Monthly Income (${selectedPaymentMethod})`,
        type: 'income',
        paymentMethod: selectedPaymentMethod
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
    setTransactions([newTransaction, ...transactions]);

    if (transaction.type === 'expense') {
      const categoryTransactions = transactions
        .filter(t => t.category === transaction.category)
        .reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : 0), 0);

      const categoryBudget = budget[transaction.category];
      const status = getSpendingStatus(categoryTransactions + transaction.amount, categoryBudget);

      if (status !== 'normal') {
        setAlerts(prev => [...prev, {
          type: status,
          message: `You're ${status === 'warning' ? 'close to' : 'exceeding'} your ${transaction.category} budget!`,
          category: transaction.category
        }]);
      }
    }
  };

  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
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

  const addSavingsGoal = (goal: Omit<SavingsGoal, 'id' | 'currentAmount'>) => {
    const newGoal = {
      ...goal,
      id: crypto.randomUUID(),
      currentAmount: 0,
    };
    setSavingsGoals([...savingsGoals, newGoal]);
  };

  const pieChartData = [
    { name: 'Needs', value: budget.needs },
    { name: 'Wants', value: budget.wants },
    { name: 'Investments', value: budget.investments },
  ];

  const spendingData = [
    { name: 'Needs', budget: budget.needs, spent: transactions
      .filter(t => t.category === 'needs' && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0) },
    { name: 'Wants', budget: budget.wants, spent: transactions
      .filter(t => t.category === 'wants' && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0) },
    { name: 'Investments', budget: budget.investments, spent: transactions
      .filter(t => t.category === 'investments' && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0) },
  ];

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Financial Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={resetData}
              className="p-2 rounded-lg bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
              title="Reset all data"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              {isDarkMode ? '🌞' : '🌙'}
            </button>
            <button className="relative">
              <Bell className="w-6 h-6 text-gray-700 dark:text-gray-200" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {alerts.length}
                </span>
              )}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Income Input */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-semibold dark:text-white">Monthly Income</h2>
            </div>
            <form onSubmit={handleIncomeSubmit} className="mb-4 space-y-4">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={tempIncome}
                  onChange={(e) => setTempIncome(e.target.value)}
                  className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter monthly income"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Save
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('cash')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded ${
                    selectedPaymentMethod === 'cash'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('online')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded ${
                    selectedPaymentMethod === 'online'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Online
                </button>
              </div>
            </form>
            <div className="mt-4 space-y-2 dark:text-gray-200">
              <p className="flex justify-between">
                <span>Needs ({percentages.needs}%):</span>
                <span>{formatCurrency(budget.needs)}</span>
              </p>
              <p className="flex justify-between">
                <span>Wants ({percentages.wants}%):</span>
                <span>{formatCurrency(budget.wants)}</span>
              </p>
              <p className="flex justify-between">
                <span>Investments ({percentages.investments}%):</span>
                <span>{formatCurrency(budget.investments)}</span>
              </p>
            </div>
          </div>

          {/* Daily Spending */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-semibold dark:text-white">Daily Spending Limit</h2>
            </div>
            <div className="text-3xl font-bold text-center my-4 dark:text-white">
              {formatCurrency(dailyLimit)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Recommended daily budget based on your needs allocation
            </p>
          </div>

          {/* Quick Add Expense */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-semibold dark:text-white">Quick Add Expense</h2>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                addTransaction({
                  amount: Number(formData.get('amount')),
                  category: formData.get('category') as 'needs' | 'wants' | 'investments',
                  description: formData.get('description') as string,
                  type: 'expense',
                  paymentMethod: selectedPaymentMethod
                });
                form.reset();
              }}
              className="space-y-4"
            >
              <input
                type="number"
                name="amount"
                placeholder="Amount"
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
              <input
                type="text"
                name="description"
                placeholder="Description"
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
              <select
                name="category"
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                <option value="needs">Needs</option>
                <option value="wants">Wants</option>
                <option value="investments">Investments</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('cash')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded ${
                    selectedPaymentMethod === 'cash'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('online')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded ${
                    selectedPaymentMethod === 'online'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Online
                </button>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
              >
                Add Expense
              </button>
            </form>
          </div>

          {/* Charts */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md col-span-full">
            <div className="flex items-center gap-2 mb-4">
              <PieChartIcon className="w-5 h-5 text-purple-500" />
              <h2 className="text-xl font-semibold dark:text-white">Budget Distribution</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={spendingData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `₹${value}`} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="budget" name="Budget" fill="#8884d8" />
                    <Bar dataKey="spent" name="Spent" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md md:col-span-2 lg:col-span-3">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <h2 className="text-xl font-semibold dark:text-white">Recent Transactions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left p-2 dark:text-gray-200">Date</th>
                    <th className="text-left p-2 dark:text-gray-200">Description</th>
                    <th className="text-left p-2 dark:text-gray-200">Category</th>
                    <th className="text-left p-2 dark:text-gray-200">Payment Method</th>
                    <th className="text-left p-2 dark:text-gray-200">Amount</th>
                    <th className="text-left p-2 dark:text-gray-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b dark:border-gray-700">
                      <td className="p-2 dark:text-gray-200">
                        {format(new Date(transaction.date), 'dd MMM yyyy')}
                      </td>
                      <td className="p-2 dark:text-gray-200">{transaction.description}</td>
                      <td className="p-2 capitalize dark:text-gray-200">{transaction.category}</td>
                      <td className="p-2 capitalize dark:text-gray-200">
                        <span className="flex items-center gap-2">
                          {transaction.paymentMethod === 'cash' ? (
                            <Banknote className="w-4 h-4" />
                          ) : (
                            <CreditCard className="w-4 h-4" />
                          )}
                          {transaction.paymentMethod}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className={
                          transaction.type === 'income' 
                            ? 'text-green-500' 
                            : 'text-red-500'
                        }>
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td className="p-2">
                        <button
                          onClick={() => deleteTransaction(transaction.id)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                          title="Delete transaction"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}