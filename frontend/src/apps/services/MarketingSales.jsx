import React, { useState, useEffect } from 'react';
import { useSidebar } from '../../components/SidebarContext';
import {
  Megaphone,
  Users,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  X,
  CheckCircle,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  BarChart2,
  Target,
  TrendingUp,
  Share2
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


const campaignTypes = ['email', 'social', 'content', 'paid_ads', 'event', 'referral'];
const campaignStatuses = ['draft', 'scheduled', 'active', 'paused', 'completed'];

const CampaignForm = ({ onSubmit, onClose, initialData, isDarkMode }) => {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    type: 'email',
    status: 'draft',
    budget: '',
    spent: 0,
    start_date: '',
    end_date: '',
    target_audience: '',
    metrics: {}
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, budget: parseFloat(formData.budget), spent: parseFloat(formData.spent) || 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Campaign Name</Label>
        <Input
          data-testid="campaign-name-input"
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
            <SelectTrigger data-testid="campaign-type-select" className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {campaignTypes.map((type) => (
                <SelectItem key={type} value={type} className="capitalize">{type.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Status</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
            <SelectTrigger data-testid="campaign-status-select" className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {campaignStatuses.map((status) => (
                <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Budget ($)</Label>
          <Input
            data-testid="campaign-budget-input"
            type="number"
            step="0.01"
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            required
          />
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Spent ($)</Label>
          <Input
            data-testid="campaign-spent-input"
            type="number"
            step="0.01"
            value={formData.spent}
            onChange={(e) => setFormData({ ...formData, spent: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Start Date</Label>
          <Input
            data-testid="campaign-start-date-input"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            required
          />
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>End Date</Label>
          <Input
            data-testid="campaign-end-date-input"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            required
          />
        </div>
      </div>
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Target Audience</Label>
        <Textarea
          data-testid="campaign-audience-input"
          value={formData.target_audience}
          onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
          className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          rows={2}
          placeholder="Describe your target audience..."
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" data-testid="save-campaign-btn" className="bg-rose-600 hover:bg-rose-700">
          Save Campaign
        </Button>
      </div>
    </form>
  );
};

const ClientForm = ({ onSubmit, onClose, initialData, isDarkMode }) => {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    company: '',
    email: '',
    phone: '',
    status: 'active',
    value: '',
    last_contact: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, value: parseFloat(formData.value) || 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Contact Name</Label>
          <Input
            data-testid="client-name-input"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            required
          />
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Company</Label>
          <Input
            data-testid="client-company-input"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Email</Label>
          <Input
            data-testid="client-email-input"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            required
          />
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Phone</Label>
          <Input
            data-testid="client-phone-input"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Status</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
            <SelectTrigger data-testid="client-status-select" className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Client Value ($)</Label>
          <Input
            data-testid="client-value-input"
            type="number"
            step="0.01"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          />
        </div>
      </div>
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Last Contact</Label>
        <Input
          data-testid="client-last-contact-input"
          type="date"
          value={formData.last_contact}
          onChange={(e) => setFormData({ ...formData, last_contact: e.target.value })}
          className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
        />
      </div>
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Notes</Label>
        <Textarea
          data-testid="client-notes-input"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          rows={2}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" data-testid="save-client-btn" className="bg-rose-600 hover:bg-rose-700">
          Save Client
        </Button>
      </div>
    </form>
  );
};

const AIMarketingAdvisor = ({ campaigns, clients, isDarkMode, onClose }) => {
  const [query, setQuery] = useState('');
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);

  const getContext = () => {
    const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
    const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const totalClientValue = clients.reduce((sum, c) => sum + c.value, 0);
    return `Active Campaigns: ${activeCampaigns}, Total Budget: $${totalBudget.toLocaleString()}, Spent: $${totalSpent.toLocaleString()}, Active Clients: ${clients.filter(c => c.status === 'active').length}, Total Client Value: $${totalClientValue.toLocaleString()}`;
  };

  const getInsight = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/ai/insights`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ context: getContext(), module: 'marketing', query }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInsight(data);
      toast.success('Marketing insight generated');
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
            AI Marketing Advisor
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Textarea
            data-testid="ai-marketing-query-input"
            placeholder="Ask about campaign optimization, client engagement strategies, ROI improvement..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            rows={2}
          />
        </div>
        <Button 
          data-testid="get-marketing-insight-btn"
          onClick={getInsight} 
          disabled={loading || !query.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-700"
        >
          {loading ? 'Analyzing...' : 'Get Marketing Insight'}
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
                      <CheckCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
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

export const MarketingSales = () => {
  const { theme } = useSidebar();
  const isDarkMode = theme === 'dark';
  const [campaigns, setCampaigns] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showAIAdvisor, setShowAIAdvisor] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [activeTab, setActiveTab] = useState('campaigns');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [campaignsData, clientsData] = await Promise.all([
        fetch(`${API}/marketing/campaigns`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API}/marketing/clients`, { headers: authHeaders() }).then(r => r.json()),
      ]);
      setCampaigns(campaignsData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching marketing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (data) => {
    try {
      if (editingCampaign) {
        await fetch(`${API}/marketing/campaigns/${editingCampaign.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) });
        toast.success('Campaign updated');
      } else {
        await fetch(`${API}/marketing/campaigns`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
        toast.success('Campaign created');
      }
      setShowCampaignModal(false);
      setEditingCampaign(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to save campaign');
    }
  };

  const handleDeleteCampaign = async (id) => {
    try {
      await fetch(`${API}/marketing/campaigns/${id}`, { method: 'DELETE', headers: authHeaders() });
      toast.success('Campaign deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete campaign');
    }
  };

  const handleCreateClient = async (data) => {
    try {
      if (editingClient) {
        await fetch(`${API}/marketing/clients/${editingClient.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) });
        toast.success('Client updated');
      } else {
        await fetch(`${API}/marketing/clients`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
        toast.success('Client created');
      }
      setShowClientModal(false);
      setEditingClient(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to save client');
    }
  };

  const handleDeleteClient = async (id) => {
    try {
      await fetch(`${API}/marketing/clients/${id}`, { method: 'DELETE', headers: authHeaders() });
      toast.success('Client deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete client');
    }
  };

  const statusColors = {
    draft: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    scheduled: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    paused: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    completed: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
  };

  const clientStatusColors = {
    active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    inactive: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    prospect: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  };

  const typeIcons = {
    email: Mail,
    social: Share2,
    content: Megaphone,
    paid_ads: DollarSign,
    event: Calendar,
    referral: Users
  };

  if (loading) {
    return (
      <div data-testid="marketing-loading" className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
  const totalClientValue = clients.reduce((sum, c) => sum + c.value, 0);

  return (
    <div data-testid="marketing-sales-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
            Marketing & Sales
          </h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Campaign management and client relations
          </p>
        </div>
        <Button 
          data-testid="ai-marketing-toggle-btn"
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
        <AIMarketingAdvisor 
          campaigns={campaigns}
          clients={clients}
          isDarkMode={isDarkMode}
          onClose={() => setShowAIAdvisor(false)}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-rose-500/10">
                <Megaphone className="w-4 h-4 text-rose-500" />
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Campaigns</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                  {campaigns.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10">
                <Target className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Budget</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                  ${totalBudget.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-500/10">
                <Users className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Clients</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                  {clients.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10">
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Client Value</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                  ${totalClientValue.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className={`${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100'}`}>
          <TabsTrigger data-testid="tab-campaigns" value="campaigns" className="data-[state=active]:bg-rose-500/10 data-[state=active]:text-rose-500">
            Campaigns ({campaigns.length})
          </TabsTrigger>
          <TabsTrigger data-testid="tab-clients" value="clients" className="data-[state=active]:bg-rose-500/10 data-[state=active]:text-rose-500">
            Clients ({clients.length})
          </TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
              Marketing Campaigns
            </h3>
            <Dialog open={showCampaignModal} onOpenChange={(open) => {
              setShowCampaignModal(open);
              if (!open) setEditingCampaign(null);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="add-campaign-btn" className="gap-2 bg-rose-600 hover:bg-rose-700">
                  <Plus className="w-4 h-4" /> Add Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className={`max-w-lg ${isDarkMode ? 'bg-slate-900 border-slate-800' : ''}`}>
                <DialogHeader>
                  <DialogTitle className={isDarkMode ? 'text-slate-50' : ''}>
                    {editingCampaign ? 'Edit Campaign' : 'New Campaign'}
                  </DialogTitle>
                </DialogHeader>
                <CampaignForm 
                  onSubmit={handleCreateCampaign} 
                  onClose={() => {
                    setShowCampaignModal(false);
                    setEditingCampaign(null);
                  }}
                  initialData={editingCampaign}
                  isDarkMode={isDarkMode}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {campaigns.length === 0 ? (
              <Card className={`md:col-span-2 ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                <CardContent className="p-8 text-center">
                  <Megaphone className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                  <p className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>No campaigns yet</p>
                </CardContent>
              </Card>
            ) : (
              campaigns.map((campaign) => {
                const TypeIcon = typeIcons[campaign.type] || Megaphone;
                const budgetUsed = campaign.budget > 0 ? (campaign.spent / campaign.budget * 100) : 0;
                return (
                  <Card key={campaign.id} className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-rose-500/10">
                            <TypeIcon className="w-4 h-4 text-rose-500" />
                          </div>
                          <div>
                            <h4 className={`font-medium ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                              {campaign.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={statusColors[campaign.status]}>
                                {campaign.status}
                              </Badge>
                              <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/20 capitalize">
                                {campaign.type.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setEditingCampaign(campaign);
                              setShowCampaignModal(true);
                            }}
                            className="text-slate-500 hover:text-rose-500"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`delete-campaign-${campaign.id}`}
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            className="text-slate-500 hover:text-rose-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {campaign.target_audience && (
                        <p className={`text-xs mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Target: {campaign.target_audience}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className={`p-2 rounded-lg text-center ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Budget</p>
                          <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                            ${campaign.budget.toLocaleString()}
                          </p>
                        </div>
                        <div className={`p-2 rounded-lg text-center ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Spent</p>
                          <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                            ${campaign.spent.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Budget Used</span>
                          <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{budgetUsed.toFixed(0)}%</span>
                        </div>
                        <Progress value={budgetUsed} className="h-1.5" />
                      </div>
                      <div className={`mt-3 flex items-center gap-2 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        <Calendar className="w-3 h-3" />
                        {campaign.start_date} - {campaign.end_date}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
              Client Relations
            </h3>
            <Dialog open={showClientModal} onOpenChange={(open) => {
              setShowClientModal(open);
              if (!open) setEditingClient(null);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="add-client-btn" className="gap-2 bg-rose-600 hover:bg-rose-700">
                  <Plus className="w-4 h-4" /> Add Client
                </Button>
              </DialogTrigger>
              <DialogContent className={`max-w-lg ${isDarkMode ? 'bg-slate-900 border-slate-800' : ''}`}>
                <DialogHeader>
                  <DialogTitle className={isDarkMode ? 'text-slate-50' : ''}>
                    {editingClient ? 'Edit Client' : 'New Client'}
                  </DialogTitle>
                </DialogHeader>
                <ClientForm 
                  onSubmit={handleCreateClient} 
                  onClose={() => {
                    setShowClientModal(false);
                    setEditingClient(null);
                  }}
                  initialData={editingClient}
                  isDarkMode={isDarkMode}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.length === 0 ? (
              <Card className={`md:col-span-2 lg:col-span-3 ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                <CardContent className="p-8 text-center">
                  <Users className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                  <p className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>No clients yet</p>
                </CardContent>
              </Card>
            ) : (
              clients.map((client) => (
                <Card key={client.id} className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className={`font-medium ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                          {client.name}
                        </h4>
                        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {client.company}
                        </p>
                      </div>
                      <Badge variant="outline" className={clientStatusColors[client.status]}>
                        {client.status}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        {client.email}
                      </div>
                      {client.phone && (
                        <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          {client.phone}
                        </div>
                      )}
                      {client.value > 0 && (
                        <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                          ${client.value.toLocaleString()} value
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800">
                      {client.last_contact && (
                        <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          Last contact: {client.last_contact}
                        </span>
                      )}
                      <div className="flex gap-1 ml-auto">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingClient(client);
                            setShowClientModal(true);
                          }}
                          className="h-7 text-slate-500 hover:text-rose-500"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-testid={`delete-client-${client.id}`}
                          onClick={() => handleDeleteClient(client.id)}
                          className="h-7 text-slate-500 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
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

export default MarketingSales;
