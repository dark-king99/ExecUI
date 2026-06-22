import React, { useState, useEffect } from 'react';
import { useDataSync } from "../../hooks/useApi";
import { useSidebar } from '../../components/SidebarContext';
import {
  Settings2,
  FileText,
  Workflow as WorkflowIcon,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  X,
  CheckCircle,
  Zap,
  Clock,
  GitBranch,
  Play,
  AlertCircle
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
import { Switch } from '../../components/ui/switch';
import { toast } from '../../components/ui/sonner';

const API = `${import.meta.env.VITE_API_BASE_URL ?? ''}/services`;
const authHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
  'Content-Type': 'application/json',
});



const departments = ['Operations', 'Finance', 'HR', 'IT', 'Sales', 'Marketing', 'Customer Service', 'Legal', 'Engineering'];

const SOPForm = ({ onSubmit, onClose, initialData, isDarkMode }) => {
  const [formData, setFormData] = useState(initialData || {
    title: '',
    department: '',
    description: '',
    steps: [''],
    status: 'active',
    version: '1.0'
  });

  const addStep = () => {
    setFormData({ ...formData, steps: [...formData.steps, ''] });
  };

  const updateStep = (index, value) => {
    const newSteps = [...formData.steps];
    newSteps[index] = value;
    setFormData({ ...formData, steps: newSteps });
  };

  const removeStep = (index) => {
    const newSteps = formData.steps.filter((_, i) => i !== index);
    setFormData({ ...formData, steps: newSteps.length ? newSteps : [''] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const filteredSteps = formData.steps.filter(s => s.trim());
    onSubmit({ ...formData, steps: filteredSteps });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Title</Label>
        <Input
          data-testid="sop-title-input"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Department</Label>
          <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
            <SelectTrigger data-testid="sop-department-select" className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Version</Label>
          <Input
            data-testid="sop-version-input"
            value={formData.version}
            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          />
        </div>
      </div>
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Description</Label>
        <Textarea
          data-testid="sop-description-input"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          rows={2}
          required
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Steps</Label>
          <Button type="button" variant="outline" size="sm" onClick={addStep} className="gap-1">
            <Plus className="w-3 h-3" /> Add Step
          </Button>
        </div>
        <div className="space-y-2">
          {formData.steps.map((step, index) => (
            <div key={index} className="flex gap-2">
              <span className={`flex items-center justify-center w-6 h-8 text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {index + 1}.
              </span>
              <Input
                data-testid={`sop-step-${index}`}
                value={step}
                onChange={(e) => updateStep(index, e.target.value)}
                className={`flex-1 ${isDarkMode ? 'bg-slate-800 border-slate-700' : ''}`}
                placeholder={`Step ${index + 1}`}
              />
              {formData.steps.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeStep(index)} className="text-slate-500 hover:text-rose-500">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" data-testid="save-sop-btn" className="bg-blue-600 hover:bg-blue-700">
          Save SOP
        </Button>
      </div>
    </form>
  );
};

const WorkflowForm = ({ onSubmit, onClose, isDarkMode }) => {
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    trigger: '',
    steps: [{ action: '', assignee: '', duration: '' }],
    is_automated: false,
    status: 'active'
  });

  const addStep = () => {
    setFormData({ ...formData, steps: [...formData.steps, { action: '', assignee: '', duration: '' }] });
  };

  const updateStep = (index, field, value) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormData({ ...formData, steps: newSteps });
  };

  const removeStep = (index) => {
    const newSteps = formData.steps.filter((_, i) => i !== index);
    setFormData({ ...formData, steps: newSteps.length ? newSteps : [{ action: '', assignee: '', duration: '' }] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const filteredSteps = formData.steps.filter(s => s.action.trim());
    onSubmit({ ...formData, steps: filteredSteps });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Workflow Name</Label>
        <Input
          data-testid="workflow-name-input"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Department</Label>
          <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
            <SelectTrigger data-testid="workflow-department-select" className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Trigger</Label>
          <Input
            data-testid="workflow-trigger-input"
            value={formData.trigger}
            onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            placeholder="e.g., New client onboarding"
            required
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="automated"
          checked={formData.is_automated}
          onCheckedChange={(checked) => setFormData({ ...formData, is_automated: checked })}
        />
        <Label htmlFor="automated" className={`cursor-pointer ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          Automated Workflow
        </Label>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Workflow Steps</Label>
          <Button type="button" variant="outline" size="sm" onClick={addStep} className="gap-1">
            <Plus className="w-3 h-3" /> Add Step
          </Button>
        </div>
        <div className="space-y-3">
          {formData.steps.map((step, index) => (
            <div key={index} className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Step {index + 1}
                </span>
                {formData.steps.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeStep(index)} className="h-6 text-slate-500 hover:text-rose-500">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  data-testid={`workflow-step-action-${index}`}
                  value={step.action}
                  onChange={(e) => updateStep(index, 'action', e.target.value)}
                  className={`col-span-3 sm:col-span-1 ${isDarkMode ? 'bg-slate-700 border-slate-600' : ''}`}
                  placeholder="Action"
                />
                <Input
                  value={step.assignee}
                  onChange={(e) => updateStep(index, 'assignee', e.target.value)}
                  className={isDarkMode ? 'bg-slate-700 border-slate-600' : ''}
                  placeholder="Assignee"
                />
                <Input
                  value={step.duration}
                  onChange={(e) => updateStep(index, 'duration', e.target.value)}
                  className={isDarkMode ? 'bg-slate-700 border-slate-600' : ''}
                  placeholder="Duration"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" data-testid="save-workflow-btn" className="bg-blue-600 hover:bg-blue-700">
          Save Workflow
        </Button>
      </div>
    </form>
  );
};

const AISOPGenerator = ({ onGenerate, isDarkMode, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!formData.title || !formData.department || !formData.description) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/ai/generate-sop`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(formData) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      onGenerate(data);
      toast.success('SOP generated successfully');
    } catch (error) {
      console.error('Error generating SOP:', error);
      toast.error('Failed to generate SOP');
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
            AI SOP Generator
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>SOP Title</Label>
          <Input
            data-testid="ai-sop-title-input"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            placeholder="e.g., Employee Onboarding Process"
          />
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Department</Label>
          <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
            <SelectTrigger data-testid="ai-sop-department-select" className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Description</Label>
          <Textarea
            data-testid="ai-sop-description-input"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            placeholder="Describe the process you want to create an SOP for..."
            rows={3}
          />
        </div>
        <Button 
          data-testid="generate-sop-btn"
          onClick={handleGenerate} 
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700"
        >
          {loading ? 'Generating...' : 'Generate SOP with AI'}
        </Button>
      </CardContent>
    </Card>
  );
};

export const OperationsSystems = () => {
  const { theme } = useSidebar();
  const isDarkMode = theme === 'dark';
  const [sops, setSOPs] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSOPModal, setShowSOPModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [editingSOP, setEditingSOP] = useState(null);
  const [activeTab, setActiveTab] = useState('sops');

  useEffect(() => {
    fetchData();
  }, []);

  // Keep this page in sync app-wide (focus + cross-page mutations).
  useDataSync(() => fetchData());

  const fetchData = async () => {
    try {
      const [sopsData, workflowsData] = await Promise.all([
        fetch(`${API}/operations/sops`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API}/operations/workflows`, { headers: authHeaders() }).then(r => r.json()),
      ]);
      setSOPs(sopsData);
      setWorkflows(workflowsData);
    } catch (error) {
      console.error('Error fetching operations data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSOP = async (data) => {
    try {
      if (editingSOP) {
        await fetch(`${API}/operations/sops/${editingSOP.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) });
        toast.success('SOP updated');
      } else {
        await fetch(`${API}/operations/sops`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
        toast.success('SOP created');
      }
      setShowSOPModal(false);
      setEditingSOP(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to save SOP');
    }
  };

  const handleDeleteSOP = async (id) => {
    try {
      await fetch(`${API}/operations/sops/${id}`, { method: 'DELETE', headers: authHeaders() });
      toast.success('SOP deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete SOP');
    }
  };

  const handleCreateWorkflow = async (data) => {
    try {
      await fetch(`${API}/operations/workflows`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
      toast.success('Workflow created');
      setShowWorkflowModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to create workflow');
    }
  };

  const handleDeleteWorkflow = async (id) => {
    try {
      await fetch(`${API}/operations/workflows/${id}`, { method: 'DELETE', headers: authHeaders() });
      toast.success('Workflow deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete workflow');
    }
  };

  const handleAIGeneratedSOP = (data) => {
    setEditingSOP(data);
    setShowAIGenerator(false);
    setShowSOPModal(true);
  };

  if (loading) {
    return (
      <div data-testid="operations-loading" className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div data-testid="operations-systems-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
            Operations & Systems
          </h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Workflows, automation, and standard operating procedures
          </p>
        </div>
        <Button 
          data-testid="ai-sop-generator-toggle-btn"
          onClick={() => setShowAIGenerator(!showAIGenerator)}
          variant="outline"
          className={`gap-2 ${isDarkMode ? 'border-slate-700 hover:bg-slate-800' : ''}`}
        >
          <Sparkles className="w-4 h-4 text-indigo-500" />
          AI SOP Generator
        </Button>
      </div>

      {/* AI Generator Panel */}
      {showAIGenerator && (
        <AISOPGenerator 
          onGenerate={handleAIGeneratedSOP}
          isDarkMode={isDarkMode}
          onClose={() => setShowAIGenerator(false)}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10">
                <FileText className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total SOPs</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                  {sops.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10">
                <GitBranch className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Active Workflows</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                  {workflows.filter(w => w.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10">
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Automated</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                  {workflows.filter(w => w.is_automated).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className={`${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100'}`}>
          <TabsTrigger data-testid="tab-sops" value="sops" className="data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-500">
            SOPs ({sops.length})
          </TabsTrigger>
          <TabsTrigger data-testid="tab-workflows" value="workflows" className="data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-500">
            Workflows ({workflows.length})
          </TabsTrigger>
        </TabsList>

        {/* SOPs Tab */}
        <TabsContent value="sops" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
              Standard Operating Procedures
            </h3>
            <Dialog open={showSOPModal} onOpenChange={(open) => {
              setShowSOPModal(open);
              if (!open) setEditingSOP(null);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="add-sop-btn" className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Add SOP
                </Button>
              </DialogTrigger>
              <DialogContent className={`max-w-2xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : ''}`}>
                <DialogHeader>
                  <DialogTitle className={isDarkMode ? 'text-slate-50' : ''}>
                    {editingSOP ? 'Edit SOP' : 'New SOP'}
                  </DialogTitle>
                </DialogHeader>
                <SOPForm 
                  onSubmit={handleCreateSOP} 
                  onClose={() => {
                    setShowSOPModal(false);
                    setEditingSOP(null);
                  }}
                  initialData={editingSOP}
                  isDarkMode={isDarkMode}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {sops.length === 0 ? (
              <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                <CardContent className="p-8 text-center">
                  <FileText className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                  <p className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>No SOPs yet. Create one manually or use AI.</p>
                </CardContent>
              </Card>
            ) : (
              sops.map((sop) => (
                <Card key={sop.id} className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-medium ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                            {sop.title}
                          </h4>
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                            v{sop.version}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}>
                            {sop.department}
                          </Badge>
                          <Badge variant="outline" className={`${sop.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                            {sop.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingSOP(sop);
                            setShowSOPModal(true);
                          }}
                          className="text-slate-500 hover:text-blue-500"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-testid={`delete-sop-${sop.id}`}
                          onClick={() => handleDeleteSOP(sop.id)}
                          className="text-slate-500 hover:text-rose-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className={`text-sm mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {sop.description}
                    </p>
                    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                      <p className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Steps ({sop.steps.length})
                      </p>
                      <ol className="space-y-1">
                        {sop.steps.slice(0, 3).map((step, idx) => (
                          <li key={idx} className={`text-sm flex items-start gap-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                              {idx + 1}
                            </span>
                            <span className="flex-1">{step}</span>
                          </li>
                        ))}
                        {sop.steps.length > 3 && (
                          <li className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            +{sop.steps.length - 3} more steps
                          </li>
                        )}
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
              Workflows
            </h3>
            <Dialog open={showWorkflowModal} onOpenChange={setShowWorkflowModal}>
              <DialogTrigger asChild>
                <Button data-testid="add-workflow-btn" className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Add Workflow
                </Button>
              </DialogTrigger>
              <DialogContent className={`max-w-2xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : ''}`}>
                <DialogHeader>
                  <DialogTitle className={isDarkMode ? 'text-slate-50' : ''}>New Workflow</DialogTitle>
                </DialogHeader>
                <WorkflowForm 
                  onSubmit={handleCreateWorkflow} 
                  onClose={() => setShowWorkflowModal(false)}
                  isDarkMode={isDarkMode}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {workflows.length === 0 ? (
              <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                <CardContent className="p-8 text-center">
                  <GitBranch className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                  <p className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>No workflows yet</p>
                </CardContent>
              </Card>
            ) : (
              workflows.map((workflow) => (
                <Card key={workflow.id} className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-medium ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                            {workflow.name}
                          </h4>
                          {workflow.is_automated && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                              <Zap className="w-3 h-3 mr-1" /> Automated
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}>
                            {workflow.department}
                          </Badge>
                          <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            Trigger: {workflow.trigger}
                          </span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        data-testid={`delete-workflow-${workflow.id}`}
                        onClick={() => handleDeleteWorkflow(workflow.id)}
                        className="text-slate-500 hover:text-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {workflow.steps.map((step, idx) => (
                        <div key={idx} className="flex items-center">
                          <div className={`px-3 py-1.5 rounded-lg text-xs ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                            {typeof step === 'string' ? step : step.action}
                            {typeof step !== 'string' && step.assignee && (
                              <span className={`ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                ({step.assignee})
                              </span>
                            )}
                          </div>
                          {idx < workflow.steps.length - 1 && (
                            <ChevronIcon className={`w-4 h-4 mx-1 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} />
                          )}
                        </div>
                      ))}
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

const ChevronIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default OperationsSystems;
