'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Image as ImageIcon, Calculator, FileText, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import StepContent from './step-content';

type Project = {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  project_name: string;
  project_type: string;
  status: string;
  budget_range: string;
  room_type: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

const WORKFLOW_STEPS = [
  { id: 'lead', label: 'Lead', order: 1 },
  { id: 'scheduled', label: 'Scheduled', order: 2 },
  { id: 'site_visit', label: 'Site Visit', order: 3 },
  { id: 'design', label: 'Design', order: 4 },
  { id: 'client_review_1', label: 'Client Review 1', order: 5 },
  { id: 'design_revision_1', label: 'Design Revision 1', order: 6 },
  { id: 'client_review_2', label: 'Client Review 2', order: 7 },
  { id: 'design_revision_2', label: 'Design Revision 2', order: 8 },
  { id: 'client_review_3', label: 'Client Review 3', order: 9 },
  { id: 'quotation', label: 'Quotation', order: 10 },
  { id: 'technical_drawings', label: 'Technical Drawings', order: 11 },
  { id: 'manufacturing', label: 'Manufacturing', order: 12 },
  { id: 'installation', label: 'Installation', order: 13 },
  { id: 'completed', label: 'Completed', order: 14 },
];

const STATUS_LABELS: Record<string, string> = {
  lead: 'Lead',
  scheduled: 'Scheduled',
  site_visit: 'Site Visit',
  design: 'Design',
  client_review_1: 'Client Review 1',
  design_revision_1: 'Design Revision 1',
  client_review_2: 'Client Review 2',
  design_revision_2: 'Design Revision 2',
  client_review_3: 'Client Review 3',
  quotation: 'Quotation',
  technical_drawings: 'Technical Drawings',
  manufacturing: 'Manufacturing',
  installation: 'Installation',
  completed: 'Completed',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'workflow'>('overview');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();
      setProject(data.project);
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        fetchProject();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <p className="text-gray-500">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <p className="text-gray-500">Project not found</p>
      </div>
    );
  }

  const currentStepIndex = WORKFLOW_STEPS.findIndex((step) => step.id === project.status);
  const currentStep = WORKFLOW_STEPS[currentStepIndex] || WORKFLOW_STEPS[0];

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-light text-gray-900 mb-2">{project.project_name}</h1>
              <p className="text-sm text-gray-500">{project.client_name}</p>
            </div>
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">
              {STATUS_LABELS[project.status] || project.status}
            </span>
          </div>
        </div>

        {/* Workflow Progress */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-light text-gray-900 mb-4">Workflow Progress</h2>
          <div className="flex items-center gap-2 overflow-x-auto pb-4">
            {WORKFLOW_STEPS.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              return (
                <div key={step.id} className="flex items-center flex-shrink-0">
                  <button
                    onClick={() => updateStatus(step.id)}
                    className={`px-4 py-2 rounded-md text-sm transition-colors ${
                      isCurrent
                        ? 'bg-gray-900 text-white'
                        : isCompleted
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {step.label}
                  </button>
                  {index < WORKFLOW_STEPS.length - 1 && (
                    <div
                      className={`w-8 h-0.5 mx-1 ${
                        isCompleted ? 'bg-gray-400' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-6">
            {[
              { id: 'overview', label: 'Overview', icon: FileText },
              { id: 'workflow', label: 'Workflow', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Client Information</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>Email: {project.client_email || '—'}</p>
                  <p>Phone: {project.client_phone || '—'}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Project Details</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>Type: {project.project_type.replace('_', ' ')}</p>
                  <p>Room Type: {project.room_type || '—'}</p>
                  <p>Budget Range: {project.budget_range || '—'}</p>
                </div>
              </div>
              {project.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{project.notes}</p>
                </div>
              )}
              <div className="pt-4 border-t border-gray-200">
                <Link
                  href={`/projects/${projectId}/images`}
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
                >
                  <ImageIcon className="w-4 h-4" />
                  View Image Comparison
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-500 mb-6">
                Add notes and upload photos/files for each workflow step
              </p>
              {WORKFLOW_STEPS.map((step) => {
                const isExpanded = expandedSteps.has(step.id);
                return (
                  <div key={step.id} className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedSteps);
                        if (isExpanded) {
                          newExpanded.delete(step.id);
                        } else {
                          newExpanded.add(step.id);
                        }
                        setExpandedSteps(newExpanded);
                      }}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-900">{step.label}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-4 py-4 border-t border-gray-200">
                        <StepContent
                          projectId={projectId}
                          workflowStep={step.id}
                          stepLabel={step.label}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

