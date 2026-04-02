import React, { useState, useEffect } from 'react';

import { 
  Users, 
  FolderKanban,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  X,
  CheckCircle,
  Clock,
  Calendar,
  UserPlus,
  CheckSquare,
  AlertCircle,
  User,
  Mail,
  Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/cards';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const departments = ['Operations', 'Finance', 'HR', 'IT', 'Sales', 'Marketing', 'Customer Service', 'Legal', 'Engineering', 'Executive'];
const projectStatuses = ['planning', 'in_progress', 'review', 'completed'];
const taskStatuses = ['todo', 'in_progress', 'review', 'done'];
const priorities = ['low', 'medium', 'high', 'urgent'];

const TeamMemberForm = ({ onSubmit, onClose, initialData, isDarkMode }) => {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    role: '',
    department: '',
    email: '',
    status: 'active',
    skills: [],
    avatar_url: ''
  });
  const [skillInput, setSkillInput] = useState('');

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Full Name</Label>
          <Input
            data-testid="member-name-input"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            required
          />
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Role</Label>
          <Input
            data-testid="member-role-input"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            placeholder="e.g., Project Manager"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Department</Label>
          <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
            <SelectTrigger data-testid="member-department-select" className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}>
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
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Status</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
            <SelectTrigger data-testid="member-status-select" className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Email</Label>
        <Input
          data-testid="member-email-input"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          required
        />
      </div>
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Skills</Label>
        <div className="flex gap-2 mt-1">
          <Input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            placeholder="Add a skill"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
          />
          <Button type="button" variant="outline" onClick={addSkill}>Add</Button>
        </div>
        {formData.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="gap-1">
                {skill}
                <button type="button" onClick={() => removeSkill(skill)} className="ml-1 hover:text-rose-500">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" data-testid="save-member-btn" className="bg-amber-600 hover:bg-amber-700">
          Save Member
        </Button>
      </div>
    </form>
  );
};

const ProjectForm = ({ onSubmit, onClose, initialData, teamMembers, isDarkMode }) => {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    start_date: '',
    end_date: '',
    progress: 0,
    team_members: [],
    tasks: [],
    budget: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, budget: parseFloat(formData.budget) || 0 });
  };

  const toggleTeamMember = (memberId) => {
    const members = formData.team_members.includes(memberId)
      ? formData.team_members.filter(id => id !== memberId)
      : [...formData.team_members, memberId];
    setFormData({ ...formData, team_members: members });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Project Name</Label>
        <Input
          data-testid="project-name-input"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          required
        />
      </div>
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Description</Label>
        <Textarea
          data-testid="project-description-input"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          rows={2}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Status</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
            <SelectTrigger data-testid="project-status-select" className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projectStatuses.map((status) => (
                <SelectItem key={status} value={status} className="capitalize">{status.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Priority</Label>
          <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
            <SelectTrigger data-testid="project-priority-select" className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorities.map((priority) => (
                <SelectItem key={priority} value={priority} className="capitalize">{priority}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Start Date</Label>
          <Input
            data-testid="project-start-date-input"
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
            data-testid="project-end-date-input"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Progress (%)</Label>
          <Input
            data-testid="project-progress-input"
            type="number"
            min="0"
            max="100"
            value={formData.progress}
            onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          />
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Budget ($)</Label>
          <Input
            data-testid="project-budget-input"
            type="number"
            step="0.01"
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          />
        </div>
      </div>
      {teamMembers.length > 0 && (
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Team Members</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {teamMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => toggleTeamMember(member.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  formData.team_members.includes(member.id)
                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                    : isDarkMode
                      ? 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                      : 'bg-slate-100 text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {member.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" data-testid="save-project-btn" className="bg-amber-600 hover:bg-amber-700">
          Save Project
        </Button>
      </div>
    </form>
  );
};

const TaskForm = ({ onSubmit, onClose, projectId, teamMembers, isDarkMode }) => {
  const [formData, setFormData] = useState({
    project_id: projectId,
    title: '',
    description: '',
    assigned_to: '',
    status: 'todo',
    priority: 'medium',
    due_date: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Task Title</Label>
        <Input
          data-testid="task-title-input"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          required
        />
      </div>
      <div>
        <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Description</Label>
        <Textarea
          data-testid="task-description-input"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Status</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
            <SelectTrigger data-testid="task-status-select" className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {taskStatuses.map((status) => (
                <SelectItem key={status} value={status} className="capitalize">{status.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Priority</Label>
          <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
            <SelectTrigger data-testid="task-priority-select" className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorities.map((priority) => (
                <SelectItem key={priority} value={priority} className="capitalize">{priority}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Assign To</Label>
          <Select value={formData.assigned_to} onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}>
            <SelectTrigger data-testid="task-assignee-select" className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <SelectValue placeholder="Select member" />
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Due Date</Label>
          <Input
            data-testid="task-due-date-input"
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            required
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" data-testid="save-task-btn" className="bg-amber-600 hover:bg-amber-700">
          Save Task
        </Button>
      </div>
    </form>
  );
};

const AITeamAdvisor = ({ projects, teamMembers, isDarkMode, onClose }) => {
  const [query, setQuery] = useState('');
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);

  const getContext = () => {
    const activeProjects = projects.filter(p => p.status !== 'completed').length;
    const avgProgress = projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length) : 0;
    return `Team Size: ${teamMembers.length}, Active Projects: ${activeProjects}, Completed: ${projects.filter(p => p.status === 'completed').length}, Average Progress: ${avgProgress}%`;
  };

  const getInsight = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await axios.post(`${API}/ai/insights`, {
        context: getContext(),
        module: 'team',
        query
      });
      setInsight(response.data);
      toast.success('Team insight generated');
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
            AI Team Advisor
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Textarea
            data-testid="ai-team-query-input"
            placeholder="Ask about team optimization, resource allocation, project prioritization..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={isDarkMode ? 'bg-slate-800 border-slate-700' : ''}
            rows={2}
          />
        </div>
        <Button 
          data-testid="get-team-insight-btn"
          onClick={getInsight} 
          disabled={loading || !query.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-700"
        >
          {loading ? 'Analyzing...' : 'Get Team Insight'}
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
                      <CheckCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
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

export const TeamProjectCoordination = ({ isDarkMode }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAIAdvisor, setShowAIAdvisor] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState('projects');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [membersRes, projectsRes, tasksRes] = await Promise.all([
        axios.get(`${API}/team/members`),
        axios.get(`${API}/team/projects`),
        axios.get(`${API}/team/tasks`)
      ]);
      setTeamMembers(membersRes.data);
      setProjects(projectsRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMember = async (data) => {
    try {
      if (editingMember) {
        await axios.put(`${API}/team/members/${editingMember.id}`, data);
        toast.success('Team member updated');
      } else {
        await axios.post(`${API}/team/members`, data);
        toast.success('Team member added');
      }
      setShowMemberModal(false);
      setEditingMember(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to save team member');
    }
  };

  const handleDeleteMember = async (id) => {
    try {
      await axios.delete(`${API}/team/members/${id}`);
      toast.success('Team member removed');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove team member');
    }
  };

  const handleCreateProject = async (data) => {
    try {
      if (editingProject) {
        await axios.put(`${API}/team/projects/${editingProject.id}`, data);
        toast.success('Project updated');
      } else {
        await axios.post(`${API}/team/projects`, data);
        toast.success('Project created');
      }
      setShowProjectModal(false);
      setEditingProject(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to save project');
    }
  };

  const handleDeleteProject = async (id) => {
    try {
      await axios.delete(`${API}/team/projects/${id}`);
      toast.success('Project deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const handleCreateTask = async (data) => {
    try {
      await axios.post(`${API}/team/tasks`, data);
      toast.success('Task created');
      setShowTaskModal(false);
      setSelectedProject(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        await axios.put(`${API}/team/tasks/${taskId}`, { ...task, status: newStatus });
        toast.success('Task updated');
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await axios.delete(`${API}/team/tasks/${id}`);
      toast.success('Task deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const statusColors = {
    planning: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    in_progress: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    review: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    todo: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    done: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
  };

  const priorityColors = {
    low: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    medium: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    high: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    urgent: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div data-testid="team-loading" className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const activeProjects = projects.filter(p => p.status !== 'completed').length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;

  return (
    <div data-testid="team-project-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
            Team & Projects
          </h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Team coordination and project management
          </p>
        </div>
        <Button 
          data-testid="ai-team-toggle-btn"
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
        <AITeamAdvisor 
          projects={projects}
          teamMembers={teamMembers}
          isDarkMode={isDarkMode}
          onClose={() => setShowAIAdvisor(false)}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10">
                <Users className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Team Size</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                  {teamMembers.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-500/10">
                <FolderKanban className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Active Projects</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                  {activeProjects}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10">
                <CheckSquare className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Tasks</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                  {tasks.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Completed</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                  {completedTasks}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className={`${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100'}`}>
          <TabsTrigger data-testid="tab-projects" value="projects" className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-500">
            Projects ({projects.length})
          </TabsTrigger>
          <TabsTrigger data-testid="tab-team" value="team" className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-500">
            Team ({teamMembers.length})
          </TabsTrigger>
          <TabsTrigger data-testid="tab-tasks" value="tasks" className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-500">
            Tasks ({tasks.length})
          </TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
              Projects
            </h3>
            <Dialog open={showProjectModal} onOpenChange={(open) => {
              setShowProjectModal(open);
              if (!open) setEditingProject(null);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="add-project-btn" className="gap-2 bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-4 h-4" /> Add Project
                </Button>
              </DialogTrigger>
              <DialogContent className={`max-w-2xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : ''}`}>
                <DialogHeader>
                  <DialogTitle className={isDarkMode ? 'text-slate-50' : ''}>
                    {editingProject ? 'Edit Project' : 'New Project'}
                  </DialogTitle>
                </DialogHeader>
                <ProjectForm 
                  onSubmit={handleCreateProject} 
                  onClose={() => {
                    setShowProjectModal(false);
                    setEditingProject(null);
                  }}
                  initialData={editingProject}
                  teamMembers={teamMembers}
                  isDarkMode={isDarkMode}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {projects.length === 0 ? (
              <Card className={`md:col-span-2 ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                <CardContent className="p-8 text-center">
                  <FolderKanban className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                  <p className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>No projects yet</p>
                </CardContent>
              </Card>
            ) : (
              projects.map((project) => {
                const projectTasks = tasks.filter(t => t.project_id === project.id);
                const completedProjectTasks = projectTasks.filter(t => t.status === 'done').length;
                return (
                  <Card key={project.id} className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className={`font-medium ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                            {project.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={statusColors[project.status]}>
                              {project.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline" className={priorityColors[project.priority]}>
                              {project.priority}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedProject(project);
                              setShowTaskModal(true);
                            }}
                            className="text-slate-500 hover:text-amber-500"
                            title="Add Task"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setEditingProject(project);
                              setShowProjectModal(true);
                            }}
                            className="text-slate-500 hover:text-amber-500"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`delete-project-${project.id}`}
                            onClick={() => handleDeleteProject(project.id)}
                            className="text-slate-500 hover:text-rose-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <p className={`text-sm mb-3 line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {project.description}
                      </p>
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-xs">
                          <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Progress</span>
                          <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-1.5" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-2 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          <Calendar className="w-3 h-3" />
                          {project.start_date} - {project.end_date}
                        </div>
                        {projectTasks.length > 0 && (
                          <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {completedProjectTasks}/{projectTasks.length} tasks
                          </span>
                        )}
                      </div>
                      {project.team_members?.length > 0 && (
                        <div className="flex -space-x-2 mt-3">
                          {project.team_members.slice(0, 4).map((memberId) => {
                            const member = teamMembers.find(m => m.id === memberId);
                            return member ? (
                              <Avatar key={memberId} className="w-7 h-7 border-2 border-slate-900">
                                <AvatarFallback className="text-xs bg-amber-500/20 text-amber-500">
                                  {getInitials(member.name)}
                                </AvatarFallback>
                              </Avatar>
                            ) : null;
                          })}
                          {project.team_members.length > 4 && (
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 border-slate-900 ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                              +{project.team_members.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
              Team Members
            </h3>
            <Dialog open={showMemberModal} onOpenChange={(open) => {
              setShowMemberModal(open);
              if (!open) setEditingMember(null);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="add-member-btn" className="gap-2 bg-amber-600 hover:bg-amber-700">
                  <UserPlus className="w-4 h-4" /> Add Member
                </Button>
              </DialogTrigger>
              <DialogContent className={`max-w-lg ${isDarkMode ? 'bg-slate-900 border-slate-800' : ''}`}>
                <DialogHeader>
                  <DialogTitle className={isDarkMode ? 'text-slate-50' : ''}>
                    {editingMember ? 'Edit Team Member' : 'Add Team Member'}
                  </DialogTitle>
                </DialogHeader>
                <TeamMemberForm 
                  onSubmit={handleCreateMember} 
                  onClose={() => {
                    setShowMemberModal(false);
                    setEditingMember(null);
                  }}
                  initialData={editingMember}
                  isDarkMode={isDarkMode}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teamMembers.length === 0 ? (
              <Card className={`md:col-span-2 lg:col-span-3 ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                <CardContent className="p-8 text-center">
                  <Users className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                  <p className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>No team members yet</p>
                </CardContent>
              </Card>
            ) : (
              teamMembers.map((member) => (
                <Card key={member.id} className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="text-sm bg-amber-500/20 text-amber-500">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className={`font-medium ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                              {member.name}
                            </h4>
                            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {member.role}
                            </p>
                          </div>
                          <Badge variant="outline" className={`${member.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                            {member.status}
                          </Badge>
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className={`flex items-center gap-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Building2 className="w-3 h-3" />
                            {member.department}
                          </div>
                          <div className={`flex items-center gap-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Mail className="w-3 h-3" />
                            {member.email}
                          </div>
                        </div>
                        {member.skills?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {member.skills.slice(0, 3).map((skill) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {member.skills.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{member.skills.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 justify-end mt-3 pt-3 border-t border-slate-800">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setEditingMember(member);
                          setShowMemberModal(true);
                        }}
                        className="h-7 text-slate-500 hover:text-amber-500"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        data-testid={`delete-member-${member.id}`}
                        onClick={() => handleDeleteMember(member.id)}
                        className="h-7 text-slate-500 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
              All Tasks
            </h3>
          </div>

          <div className="grid gap-3">
            {tasks.length === 0 ? (
              <Card className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                <CardContent className="p-8 text-center">
                  <CheckSquare className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                  <p className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>No tasks yet. Create a project and add tasks to it.</p>
                </CardContent>
              </Card>
            ) : (
              tasks.map((task) => {
                const project = projects.find(p => p.id === task.project_id);
                const assignee = teamMembers.find(m => m.id === task.assigned_to);
                return (
                  <Card key={task.id} className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleUpdateTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
                            className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                              task.status === 'done'
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : isDarkMode
                                  ? 'border-slate-600 hover:border-emerald-500'
                                  : 'border-slate-300 hover:border-emerald-500'
                            }`}
                          >
                            {task.status === 'done' && <CheckCircle className="w-3 h-3" />}
                          </button>
                          <div>
                            <p className={`font-medium ${task.status === 'done' ? 'line-through text-slate-500' : isDarkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className={statusColors[task.status]}>
                                {task.status.replace('_', ' ')}
                              </Badge>
                              <Badge variant="outline" className={priorityColors[task.priority]}>
                                {task.priority}
                              </Badge>
                              {project && (
                                <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {project.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {assignee && (
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs bg-amber-500/20 text-amber-500">
                                {getInitials(assignee.name)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`flex items-center gap-1 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            <Clock className="w-3 h-3" />
                            {task.due_date}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`delete-task-${task.id}`}
                            onClick={() => handleDeleteTask(task.id)}
                            className="h-7 text-slate-500 hover:text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Task Modal */}
      <Dialog open={showTaskModal} onOpenChange={(open) => {
        setShowTaskModal(open);
        if (!open) setSelectedProject(null);
      }}>
        <DialogContent className={`max-w-lg ${isDarkMode ? 'bg-slate-900 border-slate-800' : ''}`}>
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-slate-50' : ''}>
              Add Task {selectedProject ? `to ${selectedProject.name}` : ''}
            </DialogTitle>
          </DialogHeader>
          {selectedProject && (
            <TaskForm 
              onSubmit={handleCreateTask} 
              onClose={() => {
                setShowTaskModal(false);
                setSelectedProject(null);
              }}
              projectId={selectedProject.id}
              teamMembers={teamMembers}
              isDarkMode={isDarkMode}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamProjectCoordination;
