import React, { useState } from 'react';
import type { WorkflowDefinition, WorkflowStep } from '../../shared/workflow';
import type { TemplateComponent } from '../../types';
import { WorkflowStepModal } from './WorkflowStepModal';
import { WorkflowSimulatorModal } from './WorkflowSimulatorModal';
import { GitMerge, Plus, Trash2, Edit3, ShieldCheck, Play, ArrowDown, Users, HelpCircle } from 'lucide-react';

interface StudioWorkflowPanelProps {
  workflow: WorkflowDefinition | null;
  components: TemplateComponent[];
  onUpdateWorkflow: (workflow: WorkflowDefinition) => void;
  onOpenHelp?: (type: string) => void;
}

export const StudioWorkflowPanel: React.FC<StudioWorkflowPanelProps> = ({
  workflow,
  components,
  onUpdateWorkflow,
  onOpenHelp,
}) => {
  const defaultSteps: WorkflowStep[] = [
    {
      id: 'step-start',
      name: 'Start Submission',
      type: 'start',
      assignee: { strategy: 'specific_user', userId: 'user-employee', userName: 'Ahmed Hassan' },
      actions: [],
      transitions: [{ id: 'tr-1', targetStepId: 'step-mgr' }],
      order: 0,
    },
    {
      id: 'step-mgr',
      name: 'Manager Review',
      type: 'review',
      assignee: { strategy: 'role', role: 'Manager' },
      actions: ['Approve', 'Return for Changes', 'Reject', 'Comment'],
      transitions: [{ id: 'tr-2', targetStepId: 'step-end' }],
      order: 1,
    },
    {
      id: 'step-end',
      name: 'Workflow Completion',
      type: 'end',
      assignee: { strategy: 'role', role: 'Manager' },
      actions: [],
      transitions: [],
      order: 2,
    },
  ];

  const currentWf: WorkflowDefinition = workflow || {
    id: `wf-${Date.now()}`,
    name: 'Standard Approval Workflow',
    description: 'Dynamic approval sequence for filled business templates.',
    version: 'v1.0',
    status: 'Draft',
    steps: defaultSteps,
    createdBy: 'user-employee',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [showStepModal, setShowStepModal] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);

  const steps = currentWf.steps || defaultSteps;

  const handleSaveStep = (savedStep: WorkflowStep) => {
    const exists = steps.some((s) => s.id === savedStep.id);
    let updatedSteps: WorkflowStep[];

    if (exists) {
      updatedSteps = steps.map((s) => (s.id === savedStep.id ? savedStep : s));
    } else {
      // Insert before End step
      const endIdx = steps.findIndex((s) => s.type === 'end');
      if (endIdx !== -1) {
        updatedSteps = [...steps.slice(0, endIdx), savedStep, ...steps.slice(endIdx)];
      } else {
        updatedSteps = [...steps, savedStep];
      }
    }

    // Re-link transitions sequentially for default flow
    updatedSteps.forEach((step, idx) => {
      step.order = idx;
      if (idx < updatedSteps.length - 1 && step.type !== 'end') {
        step.transitions = [{ id: `tr-${step.id}`, targetStepId: updatedSteps[idx + 1].id }];
      }
    });

    onUpdateWorkflow({
      ...currentWf,
      steps: updatedSteps,
      updatedAt: new Date().toISOString(),
    });
    setShowStepModal(false);
  };

  const handleDeleteStep = (stepId: string) => {
    const updatedSteps = steps.filter((s) => s.id !== stepId);
    updatedSteps.forEach((step, idx) => {
      step.order = idx;
      if (idx < updatedSteps.length - 1 && step.type !== 'end') {
        step.transitions = [{ id: `tr-${step.id}`, targetStepId: updatedSteps[idx + 1].id }];
      }
    });

    onUpdateWorkflow({
      ...currentWf,
      steps: updatedSteps,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="w-full min-w-0 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden select-none animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitMerge className="w-4 h-4 text-indigo-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Instance Workflow</h2>
          {onOpenHelp && (
            <button
              type="button"
              aria-label="Learn about Instance Workflows"
              onClick={() => onOpenHelp('workflow')}
              title="Quick Guide / Help"
              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowSimModal(true)}
          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5" /> Test Flow
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Workflow Steps ({steps.length})</span>
          <button
            type="button"
            onClick={() => {
              setEditingStep(null);
              setShowStepModal(true);
            }}
            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Step
          </button>
        </div>

        {/* Visual Step Cards Sequence */}
        <div className="space-y-3 relative">
          {steps.map((step, idx) => {
            const isStart = step.type === 'start';
            const isEnd = step.type === 'end';

            return (
              <React.Fragment key={step.id}>
                <div
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isStart
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : isEnd
                      ? 'bg-emerald-950 text-emerald-100 border-emerald-900 shadow-md'
                      : 'bg-white text-slate-900 border-slate-200 shadow-2xs hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-extrabold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-xs truncate">{step.name}</span>
                    </div>

                    {!isStart && !isEnd && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStep(step);
                            setShowStepModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStep(step.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] opacity-80 space-y-1 mt-2">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Users className="w-3 h-3 text-indigo-400" />
                      <span>
                        {step.assignee?.strategy === 'specific_user'
                          ? `Assignee: ${step.assignee.userName || step.assignee.userId}`
                          : step.assignee?.strategy === 'role'
                          ? `Role: ${step.assignee.role}`
                          : step.assignee?.strategy === 'selected_by_sender'
                          ? 'Selected by Sender'
                          : "Creator's Manager"}
                      </span>
                    </div>

                    {step.requiresSignature && (
                      <div className="flex items-center gap-1 text-emerald-400 font-bold">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Requires Signature</span>
                      </div>
                    )}
                  </div>
                </div>

                {idx < steps.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <ArrowDown className="w-4 h-4 text-slate-300 animate-bounce" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {showStepModal && (
        <WorkflowStepModal
          step={editingStep}
          allSteps={steps}
          components={components}
          onSave={handleSaveStep}
          onClose={() => setShowStepModal(false)}
        />
      )}

      {showSimModal && (
        <WorkflowSimulatorModal
          workflow={currentWf}
          components={components}
          onClose={() => setShowSimModal(false)}
        />
      )}
    </div>
  );
};
