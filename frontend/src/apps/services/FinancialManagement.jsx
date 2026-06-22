import React, { useState, useEffect } from 'react';
import { useDataSync } from "../../hooks/useApi";
import { useSidebar } from '../../components/SidebarContext';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Calculator,
  BarChart3,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  X,
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/cards';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { toast } from '../../components/ui/sonner';

const API = `${import.meta.env.VITE_API_BASE_URL ?? ''}/services`;
const authHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
  'Content-Type': 'application/json',
});


const transactionCategories = [
  'Revenue', 'Sales', 'Services', 'Investments', 
  'Payroll', 'Operations', 'Marketing', 'Equipment', 'Office', 'Taxes', 'Other'
];

const TransactionForm = ({ onSubmit, onClose, initialData, isDarkMode }) => {
  const [formData, setFormData] = useState(initialData || {
    type: 'income',
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    status: 'completed'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, amount: parseFloat(formData.amount) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Type</Label>
          <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
            <SelectTrigger data-testid="transaction-type-select" className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Category</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
            <SelectTrigger data-testid="transaction-category-select" className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {transactionCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Amount ($)</Label>
          <Input
            data-testid="transaction-amount-input"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            required
          />
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Date</Label>
          <Input
            data-testid="transaction-date-input"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            required
          />
        </div>
      </div>
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Description</Label>
        <Textarea
          data-testid="transaction-description-input"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          rows={2}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" data-testid="save-transaction-btn" className="bg-emerald-600 hover:bg-emerald-700">
          Save Transaction
        </Button>
      </div>
    </form>
  );
};

const TaxPlanForm = ({ onSubmit, onClose, isDarkMode }) => {
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    strategy: '',
    estimated_savings: '',
    status: 'active',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, estimated_savings: parseFloat(formData.estimated_savings) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Year</Label>
          <Input
            data-testid="tax-year-input"
            type="number"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            required
          />
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Estimated Savings ($)</Label>
          <Input
            data-testid="tax-savings-input"
            type="number"
            step="0.01"
            value={formData.estimated_savings}
            onChange={(e) => setFormData({ ...formData, estimated_savings: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            required
          />
        </div>
      </div>
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Strategy</Label>
        <Textarea
          data-testid="tax-strategy-input"
          value={formData.strategy}
          onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
          className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          rows={3}
          required
        />
      </div>
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Notes</Label>
        <Textarea
          data-testid="tax-notes-input"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          rows={2}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" data-testid="save-tax-plan-btn" className="bg-emerald-600 hover:bg-emerald-700">
          Save Tax Plan
        </Button>
      </div>
    </form>
  );
};

const InvestmentForm = ({ onSubmit, onClose, isDarkMode }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'stocks',
    initial_value: '',
    current_value: '',
    roi_percentage: 0,
    risk_level: 'medium',
    status: 'active'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const initial = parseFloat(formData.initial_value);
    const current = parseFloat(formData.current_value);
    const roi = initial > 0 ? ((current - initial) / initial * 100).toFixed(2) : 0;
    onSubmit({ 
      ...formData, 
      initial_value: initial,
      current_value: current,
      roi_percentage: parseFloat(roi)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Investment Name</Label>
        <Input
          data-testid="investment-name-input"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Type</Label>
          <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
            <SelectTrigger data-testid="investment-type-select" className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stocks">Stocks</SelectItem>
              <SelectItem value="bonds">Bonds</SelectItem>
              <SelectItem value="real_estate">Real Estate</SelectItem>
              <SelectItem value="mutual_funds">Mutual Funds</SelectItem>
              <SelectItem value="crypto">Cryptocurrency</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Risk Level</Label>
          <Select value={formData.risk_level} onValueChange={(v) => setFormData({ ...formData, risk_level: v })}>
            <SelectTrigger data-testid="investment-risk-select" className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Initial Value ($)</Label>
          <Input
            data-testid="investment-initial-input"
            type="number"
            step="0.01"
            value={formData.initial_value}
            onChange={(e) => setFormData({ ...formData, initial_value: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            required
          />
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Current Value ($)</Label>
          <Input
            data-testid="investment-current-input"
            type="number"
            step="0.01"
            value={formData.current_value}
            onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            required
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" data-testid="save-investment-btn" className="bg-emerald-600 hover:bg-emerald-700">
          Save Investment
        </Button>
      </div>
    </form>
  );
};

const AIInsightPanel = ({ context, module, isDarkMode, onClose }) => {
  const [query, setQuery] = useState('');
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);

  const getInsight = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/ai/insights`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ context, module, query }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInsight(data);
      toast.success('AI insight generated');
    } catch (error) {
      console.error('Error getting AI insight:', error);
      toast.error('Failed to generate insight');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={`text-sm font-medium flex items-center gap-2 ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
            <Sparkles className="w-4 h-4 text-indigo-500" />
            AI Financial Advisor
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Textarea
            data-testid="ai-query-input"
            placeholder="Ask about your financial data, tax strategies, or investment recommendations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            rows={2}
          />
        </div>
        <Button 
          data-testid="get-ai-insight-btn"
          onClick={getInsight} 
          disabled={loading || !query.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-700"
        >
          {loading ? 'Analyzing...' : 'Get AI Insight'}
        </Button>
        {insight && (
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'} space-y-3`}>
            <div>
              <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Analysis
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {insight.insight}
              </p>
            </div>
            {insight.recommendations?.length > 0 && (
              <div>
                <p className={`text-xs font-medium uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Recommendations
                </p>
                <ul className="space-y-1">
                  {insight.recommendations.map((rec, idx) => (
                    <li key={idx} className={`text-sm flex items-start gap-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const FinancialManagement = () => {
  const { theme } = useSidebar();
  const isDarkMode = theme === 'dark';
  const [transactions, setTransactions] = useState([]);
  const [taxPlans, setTaxPlans] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('bookkeeping');

  useEffect(() => {
    fetchData();
  }, []);

  // Keep this page in sync app-wide (focus + cross-page mutations).
  useDataSync(fetchData);

  const fetchData = async () => {
    try {
      const [txData, taxData, invData] = await Promise.all([
        fetch(`${API}/financial/transactions`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API}/financial/tax-plans`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API}/financial/investments`, { headers: authHeaders() }).then(r => r.json()),
      ]);
      setTransactions(txData);
      setTaxPlans(taxData);
      setInvestments(invData);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async (data) => {
    try {
      await fetch(`${API}/financial/transactions`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
      toast.success('Transaction created');
      setShowTransactionModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to create transaction');
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      await fetch(`${API}/financial/transactions/${id}`, { method: 'DELETE', headers: authHeaders() });
      toast.success('Transaction deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  const handleCreateTaxPlan = async (data) => {
    try {
      await fetch(`${API}/financial/tax-plans`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
      toast.success('Tax plan created');
      setShowTaxModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to create tax plan');
    }
  };

  const handleDeleteTaxPlan = async (id) => {
    try {
      await fetch(`${API}/financial/tax-plans/${id}`, { method: 'DELETE', headers: authHeaders() });
      toast.success('Tax plan deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete tax plan');
    }
  };

  const handleCreateInvestment = async (data) => {
    try {
      await fetch(`${API}/financial/investments`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
      toast.success('Investment created');
      setShowInvestmentModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to create investment');
    }
  };

  const handleDeleteInvestment = async (id) => {
    try {
      await fetch(`${API}/financial/investments/${id}`, { method: 'DELETE', headers: authHeaders() });
      toast.success('Investment deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete investment');
    }
  };

  // Calculate summary stats
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalInvestmentValue = investments.reduce((sum, i) => sum + i.current_value, 0);
  const totalEstimatedSavings = taxPlans.filter(t => t.status === 'active').reduce((sum, t) => sum + t.estimated_savings, 0);

  const getFinancialContext = () => {
    return `Total Income: $${totalIncome.toLocaleString()}, Total Expenses: $${totalExpenses.toLocaleString()}, Net: $${(totalIncome - totalExpenses).toLocaleString()}, Investment Portfolio Value: $${totalInvestmentValue.toLocaleString()}, Estimated Tax Savings: $${totalEstimatedSavings.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div data-testid="financial-loading" className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div data-testid="financial-management-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
            Financial Management
          </h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Bookkeeping, tax planning, and investment analysis
          </p>
        </div>
        <Button 
          data-testid="ai-advisor-toggle-btn"
          onClick={() => setShowAIPanel(!showAIPanel)}
          variant="outline"
          className={`gap-2 ${isDarkMode ? 'border-slate-700 hover:bg-slate-800' : ''}`}
        >
          <Sparkles className="w-4 h-4 text-indigo-500" />
          AI Advisor
        </Button>
      </div>

      {/* AI Panel */}
      {showAIPanel && (
        <AIInsightPanel 
          context={getFinancialContext()} 
          module="financial" 
          isDarkMode={isDarkMode}
          onClose={() => setShowAIPanel(false)}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Income</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                  ${totalIncome.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-rose-500/10">
                <TrendingDown className="w-4 h-4 text-rose-500" />
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Expenses</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                  ${totalExpenses.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-500/10">
                <PiggyBank className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Investment Value</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                  ${totalInvestmentValue.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10">
                <Calculator className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tax Savings</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                  ${totalEstimatedSavings.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className={`${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100'}`}>
          <TabsTrigger data-testid="tab-bookkeeping" value="bookkeeping" className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500">
            Bookkeeping
          </TabsTrigger>
          <TabsTrigger data-testid="tab-tax" value="tax" className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500">
            Tax Planning
          </TabsTrigger>
          <TabsTrigger data-testid="tab-investments" value="investments" className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500">
            Investments
          </TabsTrigger>
        </TabsList>

        {/* Bookkeeping Tab */}
        <TabsContent value="bookkeeping" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
              Transactions
            </h3>
            <Dialog open={showTransactionModal} onOpenChange={setShowTransactionModal}>
              <DialogTrigger asChild>
                <Button data-testid="add-transaction-btn" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4" /> Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className={isDarkMode ? 'bg-slate-900 border-slate-800' : ''}>
                <DialogHeader>
                  <DialogTitle className={isDarkMode ? 'text-slate-50' : ''}>New Transaction</DialogTitle>
                </DialogHeader>
                <TransactionForm 
                  onSubmit={handleCreateTransaction} 
                  onClose={() => setShowTransactionModal(false)}
                  isDarkMode={isDarkMode}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <div className="p-8 text-center">
                  <DollarSign className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                  <p className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>No transactions yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {tx.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className={`font-medium ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                            {tx.description || tx.category}
                          </p>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {tx.category} • {tx.date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-semibold ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-testid={`delete-transaction-${tx.id}`}
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="text-slate-500 hover:text-rose-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Planning Tab */}
        <TabsContent value="tax" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
              Tax Plans
            </h3>
            <Dialog open={showTaxModal} onOpenChange={setShowTaxModal}>
              <DialogTrigger asChild>
                <Button data-testid="add-tax-plan-btn" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4" /> Add Tax Plan
                </Button>
              </DialogTrigger>
              <DialogContent className={isDarkMode ? 'bg-slate-900 border-slate-800' : ''}>
                <DialogHeader>
                  <DialogTitle className={isDarkMode ? 'text-slate-50' : ''}>New Tax Plan</DialogTitle>
                </DialogHeader>
                <TaxPlanForm 
                  onSubmit={handleCreateTaxPlan} 
                  onClose={() => setShowTaxModal(false)}
                  isDarkMode={isDarkMode}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {taxPlans.length === 0 ? (
              <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                <CardContent className="p-8 text-center">
                  <Calculator className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                  <p className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>No tax plans yet</p>
                </CardContent>
              </Card>
            ) : (
              taxPlans.map((plan) => (
                <Card key={plan.id} className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                            {plan.year}
                          </Badge>
                          <Badge variant="outline" className={`${plan.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                            {plan.status}
                          </Badge>
                        </div>
                        <p className={`font-medium ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                          {plan.strategy}
                        </p>
                        {plan.notes && (
                          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {plan.notes}
                          </p>
                        )}
                        <p className="text-emerald-500 font-semibold">
                          Est. Savings: ${plan.estimated_savings.toLocaleString()}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        data-testid={`delete-tax-plan-${plan.id}`}
                        onClick={() => handleDeleteTaxPlan(plan.id)}
                        className="text-slate-500 hover:text-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Investments Tab */}
        <TabsContent value="investments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
              Investment Portfolio
            </h3>
            <Dialog open={showInvestmentModal} onOpenChange={setShowInvestmentModal}>
              <DialogTrigger asChild>
                <Button data-testid="add-investment-btn" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4" /> Add Investment
                </Button>
              </DialogTrigger>
              <DialogContent className={isDarkMode ? 'bg-slate-900 border-slate-800' : ''}>
                <DialogHeader>
                  <DialogTitle className={isDarkMode ? 'text-slate-50' : ''}>New Investment</DialogTitle>
                </DialogHeader>
                <InvestmentForm 
                  onSubmit={handleCreateInvestment} 
                  onClose={() => setShowInvestmentModal(false)}
                  isDarkMode={isDarkMode}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {investments.length === 0 ? (
              <Card className={`md:col-span-2 ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                <CardContent className="p-8 text-center">
                  <BarChart3 className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                  <p className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>No investments yet</p>
                </CardContent>
              </Card>
            ) : (
              investments.map((inv) => (
                <Card key={inv.id} className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className={`font-medium ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                          {inv.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 capitalize">
                            {inv.type.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className={`capitalize ${
                            inv.risk_level === 'low' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            inv.risk_level === 'medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          }`}>
                            {inv.risk_level} risk
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        data-testid={`delete-investment-${inv.id}`}
                        onClick={() => handleDeleteInvestment(inv.id)}
                        className="text-slate-500 hover:text-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Initial</p>
                        <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                          ${inv.initial_value.toLocaleString()}
                        </p>
                      </div>
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Current</p>
                        <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                          ${inv.current_value.toLocaleString()}
                        </p>
                      </div>
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>ROI</p>
                        <p className={`text-sm font-semibold ${inv.roi_percentage >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {inv.roi_percentage >= 0 ? '+' : ''}{inv.roi_percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialManagement;
