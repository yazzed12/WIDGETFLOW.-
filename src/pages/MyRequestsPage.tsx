import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Shield,
  Edit3,
  Send,
  Eye,
} from 'lucide-react';
import type { TemplateStatus } from '../types';

export const MyRequestsPage: React.FC = () => {
  const {
    getMyRequestsForUser,
    categories,
    openAddTemplateModal,
    openRequestDetail,
    submitTemplateForApproval,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'All' | TemplateStatus>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const requests = getMyRequestsForUser();

  const filteredRequests = requests.filter((req) => {
    const matchesStatus = statusFilter === 'All' || req.status === statusFilter;
    const matchesSearch =
      !searchTerm ||
      req.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getCategoryName = (catId: string) => {
    return categories.find((c) => c.id === catId)?.name || 'General';
  };

  const statusOptions: Array<{ label: string; value: 'All' | TemplateStatus }> = [
    { label: 'All Requests', value: 'All' },
    { label: 'Pending Approval', value: 'Pending Approval' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Rejected', value: 'Rejected' },
    { label: 'Drafts', value: 'Draft' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            My Template Requests ({requests.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track report template creation requests submitted for approval, drafts, and publication status.
          </p>
        </div>

        <button
          onClick={() => openAddTemplateModal()}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Report Template</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto text-xs">
          {statusOptions.map((opt) => {
            const count =
              opt.value === 'All'
                ? requests.length
                : requests.filter((r) => r.status === opt.value).length;
            const isSelected = statusFilter === opt.value;

            return (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3.5 py-2 rounded-lg font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-2 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{opt.label}</span>
                <span
                  className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search my requests..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Requests List Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <Filter className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">
              {statusFilter === 'Draft'
                ? 'No template drafts saved'
                : statusFilter === 'Pending Approval'
                ? 'No pending template approval requests'
                : 'No template requests found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click "+ Create Report Template" when your team needs a new standardized firm format.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                onClick={() => openRequestDetail(req)}
                className="p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                      {req.name}{req.templateDisplayId && <span className="block text-[10px] font-mono text-slate-400">{req.templateDisplayId}</span>}
                    </h3>
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {getCategoryName(req.categoryId)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-1">{req.description}</p>

                  {req.status === 'Draft' && req.returnedAt && (
                    <p className="text-xs text-amber-700 line-clamp-2">
                      <span className="font-semibold">Reason:</span> {req.returnReason || 'Please update this template before resubmitting it for approval.'}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-2">
                    <span>Created: {new Date(req.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-slate-400" />
                      Approver: {req.requestedApprovalFromName || (req.status === 'Approved' ? 'Published' : 'Manager / Director')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <div>
                    <StatusBadge
                      status={req.status === 'Draft' && req.returnedAt ? 'Returned' : req.status}
                      type="template"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    {req.status === 'Draft' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddTemplateModal(req);
                          }}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        {!req.returnedAt && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              submitTemplateForApproval(
                                {
                                  name: req.name,
                                  categoryId: req.categoryId,
                                  description: req.description,
                                  tags: req.tags,
                                  layoutType: req.layoutType,
                                },
                                req.id
                              );
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Submit</span>
                          </button>
                        )}
                      </>
                    )}

                    {req.status === 'Rejected' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddTemplateModal(req);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit & Resubmit</span>
                      </button>
                    )}

                    {(req.status === 'Pending Approval' || req.status === 'Approved') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openRequestDetail(req);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
