import React, { useState, useEffect } from 'react';
import { useSidebar } from '../../components/SidebarContext';
import {
  Target,
  TrendingUp,
  LineChart,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  X,
  CheckCircle,
  AlertCircle,
  Rocket,
  Globe,
  BarChart2,
  Calendar,
  Flag
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
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';

const API = `${import.meta.env.VITE_API_BASE_URL ?? ''}/services`;
const authHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
  'Content-Type': 'application/json',
});



const goalCategories = [
  { value: 'growth', label: 'Business Growth', icon: TrendingUp },
  { value: 'digital_transformation', label: 'Digital Transformation', icon: Globe },
  { value: 'market_expansion', label: 'Market Expansion', icon: Rocket },
  { value: 'operational_efficiency', label: 'Operational Efficiency', icon: BarChart2 },
  { value: 'innovation', label: 'Innovation', icon: Sparkles }
];

const GoalForm = ({ onSubmit, onClose, initialData, isDarkMode }) => {
  const [formData, setFormData] = useState(initialData || {
    title: '',
    category: 'growth',
    description: '',
    target_date: '',
    progress: 0,
    milestones: [],
    status: 'in_progress',
    priority: 'medium'
  });
  const [newMilestone, setNewMilestone] = useState({ title: '', target_date: '', completed: false });

  const addMilestone = () => {
    if (newMilestone.title.trim()) {
      setFormData({
        ...formData,
        milestones: [...formData.milestones, { ...newMilestone, id: Date.now() }]
      });
      setNewMilestone({ title: '', target_date: '', completed: false });
    }
  };

  const removeMilestone = (id) => {
    setFormData({
      ...formData,
      milestones: formData.milestones.filter(m => m.id !== id)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Goal Title</Label>
        <Input
          data-testid="goal-title-input"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Category</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
            <SelectTrigger data-testid="goal-category-select" className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {goalCategories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Priority</Label>
          <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
            <SelectTrigger data-testid="goal-priority-select" className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Description</Label>
        <Textarea
          data-testid="goal-description-input"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          rows={3}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Target Date</Label>
          <Input
            data-testid="goal-target-date-input"
            type="date"
            value={formData.target_date}
            onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            required
          />
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Progress (%)</Label>
          <Input
            data-testid="goal-progress-input"
            type="number"
            min="0"
            max="100"
            value={formData.progress}
            onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          />
        </div>
      </div>
      
      {/* Milestones */}
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Milestones</Label>
        <div className={`p-3 rounded-lg mt-1 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
          <div className="flex gap-2 mb-3">
            <Input
              value={newMilestone.title}
              onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
              className={`flex-1 ${isDarkMode ? 'bg-slate-700 border-slate-600' : ''}`}
              placeholder="Milestone title"
            />
            <Input
              type="date"
              value={newMilestone.target_date}
              onChange={(e) => setNewMilestone({ ...newMilestone, target_date: e.target.value })}
              className={isDarkMode ? 'bg-slate-700 border-slate-600' : ''}
            />
            <Button type="button" onClick={addMilestone} size="sm" variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {formData.milestones.length > 0 && (
            <div className="space-y-2">
              {formData.milestones.map((m) => (
                <div key={m.id} className={`flex items-center justify-between p-2 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
                  <div className="flex items-center gap-2">
                    <Flag className={`w-3 h-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                    <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{m.title}</span>
                    {m.target_date && (
                      <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        ({m.target_date})
                      </span>
                    )}
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeMilestone(m.id)} className="h-6 text-slate-500 hover:text-rose-500">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" data-testid="save-goal-btn" className="bg-purple-600 hover:bg-purple-700">
          Save Goal
        </Button>
      </div>
    </form>
  );
};

const MarketAnalysisForm = ({ onSubmit, onClose, isDarkMode }) => {
  const [formData, setFormData] = useState({
    title: '',
    market_segment: '',
    findings: '',
    opportunities: [''],
    threats: [''],
    recommendations: ['']
  });

  const updateListItem = (field, index, value) => {
    const newList = [...formData[field]];
    newList[index] = value;
    setFormData({ ...formData, [field]: newList });
  };

  const addListItem = (field) => {
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };

  const removeListItem = (field, index) => {
    const newList = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newList.length ? newList : [''] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedData = {
      ...formData,
      opportunities: formData.opportunities.filter(o => o.trim()),
      threats: formData.threats.filter(t => t.trim()),
      recommendations: formData.recommendations.filter(r => r.trim())
    };
    onSubmit(cleanedData);
  };

  const renderListSection = (field, label, placeholder) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{label}</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => addListItem(field)} className="gap-1 h-6">
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      <div className="space-y-2">
        {formData[field].map((item, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={item}
              onChange={(e) => updateListItem(field, index, e.target.value)}
              className={`flex-1 ${isDarkMode ? 'bg-slate-800 border-slate-700' : ''}`}
              placeholder={placeholder}
            />
            {formData[field].length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => removeListItem(field, index)} className="text-slate-500 hover:text-rose-500">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Analysis Title</Label>
        <Input
          data-testid="analysis-title-input"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          required
        />
      </div>
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Market Segment</Label>
        <Input
          data-testid="analysis-segment-input"
          value={formData.market_segment}
          onChange={(e) => setFormData({ ...formData, market_segment: e.target.value })}
          className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          placeholder="e.g., B2B SaaS, Healthcare, E-commerce"
          required
        />
      </div>
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Key Findings</Label>
        <Textarea
          data-testid="analysis-findings-input"
          value={formData.findings}
          onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
          className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          rows={3}
          required
        />
      </div>
      {renderListSection('opportunities', 'Opportunities', 'Add opportunity')}
      {renderListSection('threats', 'Threats', 'Add threat')}
      {renderListSection('recommendations', 'Recommendations', 'Add recommendation')}
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" data-testid="save-analysis-btn" className="bg-purple-600 hover:bg-purple-700">
          Save Analysis
        </Button>
      </div>
    </form>
  );
};

const AIStrategyAdvisor = ({ goals, isDarkMode, onClose }) => {
  const [query, setQuery] = useState('');
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);

  const getContext = () => {
    const goalsContext = goals.map(g => `${g.title} (${g.category}, ${g.progress}% complete, priority: ${g.priority})`).join('; ');
    return `Current strategic goals: ${goalsContext || 'No goals defined yet'}`;
  };

  const getInsight = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/ai/insights`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ context: getContext(), module: 'strategic', query }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInsight(data);
      toast.success('Strategic insight generated');
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
            AI Strategy Advisor
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Textarea
            data-testid="ai-strategy-query-input"
            placeholder="Ask about growth strategies, market opportunities, digital transformation approaches..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            rows={2}
          />
        </div>
        <Button 
          data-testid="get-strategy-insight-btn"
          onClick={getInsight} 
          disabled={loading || !query.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-700"
        >
          {loading ? 'Analyzing...' : 'Get Strategic Insight'}
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
                      <CheckCircle className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
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

export const StrategicPlanning = () => {
  const { theme } = useSidebar();
  const isDarkMode = theme === 'dark';
  const [goals, setGoals] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showAIAdvisor, setShowAIAdvisor] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [activeTab, setActiveTab] = useState('goals');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [goalsData, analysesData] = await Promise.all([
        fetch(`${API}/strategic/goals`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API}/strategic/market-analysis`, { headers: authHeaders() }).then(r => r.json()),
      ]);
      setGoals(goalsData);
      setAnalyses(analysesData);
    } catch (error) {
      console.error('Error fetching strategic data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (data) => {
    try {
      if (editingGoal) {
        await fetch(`${API}/strategic/goals/${editingGoal.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) });
        toast.success('Goal updated');
      } else {
        await fetch(`${API}/strategic/goals`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
        toast.success('Goal created');
      }
      setShowGoalModal(false);
      setEditingGoal(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to save goal');
    }
  };

  const handleDeleteGoal = async (id) => {
    try {
      await fetch(`${API}/strategic/goals/${id}`, { method: 'DELETE', headers: authHeaders() });
      toast.success('Goal deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete goal');
    }
  };

  const handleCreateAnalysis = async (data) => {
    try {
      await fetch(`${API}/strategic/market-analysis`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
      toast.success('Market analysis created');
      setShowAnalysisModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to create market analysis');
    }
  };

  const handleDeleteAnalysis = async (id) => {
    try {
      await fetch(`${API}/strategic/market-analysis/${id}`, { method: 'DELETE', headers: authHeaders() });
      toast.success('Market analysis deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete market analysis');
    }
  };

  const priorityColors = {
    low: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    medium: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    high: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    critical: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
  };

  const categoryIcons = {
    growth: TrendingUp,
    digital_transformation: Globe,
    market_expansion: Rocket,
    operational_efficiency: BarChart2,
    innovation: Sparkles
  };

  if (loading) {
    return (
      <div data-testid="strategic-loading" className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const avgProgress = goals.length > 0 ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length) : 0;

  return (
    <div data-testid="strategic-planning-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
            Strategic Planning
          </h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Growth strategies, digital transformation, and market analysis
          </p>
        </div>
        <Button 
          data-testid="ai-strategy-toggle-btn"
          onClick={() => setShowAIAdvisor(!showAIAdvisor)}
          variant="outline"
          className={`gap-2 ${isDarkMode ? 'border-slate-700 hover:bg-slate-800' : ''}`}
        >
          <Sparkles className="w-4 h-4 text-indigo-500" />
          AI Advisor
        </Button>
      </div>

      {/* AI Advisor Panel */}
      {showAIAdvisor && (
        <AIStrategyAdvisor 
          goals={goals}
          isDarkMode={isDarkMode}
          onClose={() => setShowAIAdvisor(false)}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-500/10">
                <Target className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Strategic Goals</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                  {goals.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Avg Progress</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                  {avgProgress}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-500/10">
                <LineChart className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Market Analyses</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                  {analyses.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className={`${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100'}`}>
          <TabsTrigger data-testid="tab-goals" value="goals" className="data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-500">
            Strategic Goals ({goals.length})
          </TabsTrigger>
          <TabsTrigger data-testid="tab-market-analysis" value="market-analysis" className="data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-500">
            Market Analysis ({analyses.length})
          </TabsTrigger>
        </TabsList>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
              Strategic Goals
            </h3>
            <Dialog open={showGoalModal} onOpenChange={(open) => {
              setShowGoalModal(open);
              if (!open) setEditingGoal(null);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="add-goal-btn" className="gap-2 bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4" /> Add Goal
                </Button>
              </DialogTrigger>
              <DialogContent className={`max-w-2xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : ''}`}>
                <DialogHeader>
                  <DialogTitle className={isDarkMode ? 'text-slate-50' : ''}>
                    {editingGoal ? 'Edit Goal' : 'New Strategic Goal'}
                  </DialogTitle>
                </DialogHeader>
                <GoalForm 
                  onSubmit={handleCreateGoal} 
                  onClose={() => {
                    setShowGoalModal(false);
                    setEditingGoal(null);
                  }}
                  initialData={editingGoal}
                  isDarkMode={isDarkMode}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {goals.length === 0 ? (
              <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                <CardContent className="p-8 text-center">
                  <Target className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                  <p className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>No strategic goals yet</p>
                </CardContent>
              </Card>
            ) : (
              goals.map((goal) => {
                const CategoryIcon = categoryIcons[goal.category] || Target;
                return (
                  <Card key={goal.id} className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-purple-500/10">
                            <CategoryIcon className="w-4 h-4 text-purple-500" />
                          </div>
                          <div>
                            <h4 className={`font-medium ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                              {goal.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={priorityColors[goal.priority]}>
                                {goal.priority}
                              </Badge>
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 capitalize">
                                {goal.category.replace('_', ' ')}
                              </Badge>
                              {goal.target_date && (
                                <span className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                  <Calendar className="w-3 h-3" />
                                  {goal.target_date}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setEditingGoal(goal);
                              setShowGoalModal(true);
                            }}
                            className="text-slate-500 hover:text-purple-500"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`delete-goal-${goal.id}`}
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="text-slate-500 hover:text-rose-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <p className={`text-sm mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {goal.description}
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Progress</span>
                          <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{goal.progress}%</span>
                        </div>
                        <Progress value={goal.progress} className="h-2" />
                      </div>
                      {goal.milestones?.length > 0 && (
                        <div className={`mt-3 p-3 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                          <p className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Milestones ({goal.milestones.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {goal.milestones.map((m, idx) => (
                              <Badge key={idx} variant="outline" className={`text-xs ${m.completed ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-white text-slate-600'}`}>
                                <Flag className="w-3 h-3 mr-1" />
                                {m.title}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Market Analysis Tab */}
        <TabsContent value="market-analysis" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
              Market Analysis
            </h3>
            <Dialog open={showAnalysisModal} onOpenChange={setShowAnalysisModal}>
              <DialogTrigger asChild>
                <Button data-testid="add-analysis-btn" className="gap-2 bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4" /> Add Analysis
                </Button>
              </DialogTrigger>
              <DialogContent className={`max-w-2xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : ''}`}>
                <DialogHeader>
                  <DialogTitle className={isDarkMode ? 'text-slate-50' : ''}>New Market Analysis</DialogTitle>
                </DialogHeader>
                <MarketAnalysisForm 
                  onSubmit={handleCreateAnalysis} 
                  onClose={() => setShowAnalysisModal(false)}
                  isDarkMode={isDarkMode}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {analyses.length === 0 ? (
              <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                <CardContent className="p-8 text-center">
                  <LineChart className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                  <p className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>No market analyses yet</p>
                </CardContent>
              </Card>
            ) : (
              analyses.map((analysis) => (
                <Card key={analysis.id} className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className={`font-medium ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                          {analysis.title}
                        </h4>
                        <Badge variant="outline" className="mt-1 bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
                          {analysis.market_segment}
                        </Badge>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        data-testid={`delete-analysis-${analysis.id}`}
                        onClick={() => handleDeleteAnalysis(analysis.id)}
                        className="text-slate-500 hover:text-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className={`text-sm mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {analysis.findings}
                    </p>
                    <div className="grid md:grid-cols-3 gap-3">
                      {analysis.opportunities?.length > 0 && (
                        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
                          <p className="text-xs font-medium text-emerald-500 mb-2">Opportunities</p>
                          <ul className="space-y-1">
                            {analysis.opportunities.map((o, idx) => (
                              <li key={idx} className={`text-xs flex items-start gap-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                                {o}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {analysis.threats?.length > 0 && (
                        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-rose-900/20' : 'bg-rose-50'}`}>
                          <p className="text-xs font-medium text-rose-500 mb-2">Threats</p>
                          <ul className="space-y-1">
                            {analysis.threats.map((t, idx) => (
                              <li key={idx} className={`text-xs flex items-start gap-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                <AlertCircle className="w-3 h-3 text-rose-500 mt-0.5 shrink-0" />
                                {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {analysis.recommendations?.length > 0 && (
                        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-indigo-900/20' : 'bg-indigo-50'}`}>
                          <p className="text-xs font-medium text-indigo-500 mb-2">Recommendations</p>
                          <ul className="space-y-1">
                            {analysis.recommendations.map((r, idx) => (
                              <li key={idx} className={`text-xs flex items-start gap-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                <Sparkles className="w-3 h-3 text-indigo-500 mt-0.5 shrink-0" />
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
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

export default StrategicPlanning;
