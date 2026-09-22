import React, { useState, useEffect } from 'react';
import { configurationService } from '../../features/configuration/services/configurationService';
import type { ContentLibraryItem } from '../../types';
import { AdminInfoTooltip } from './AdminInfoTooltip';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  X,
  Type,
  AlignLeft,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { matchesSearch } from '../../features/search/searchMatcher';

const CONTENT_TYPES: Array<ContentLibraryItem['contentType']> = [
  'Heading',
  'Text Block',
  'Disclaimer',
  'Instruction',
  'Label',
  'Section Intro',
];

const CATEGORIES = ['All', 'Finance', 'HR & Operations', 'Analytics & BI', 'Technology'];

export const AdminContentLibraryManagement: React.FC = () => {
  const [items, setItems] = useState<ContentLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'All' | 'Enabled' | 'Disabled'>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State: Add / Edit Item
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Finance');
  const [contentType, setContentType] = useState<ContentLibraryItem['contentType']>('Text Block');
  const [contentValue, setContentValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await configurationService.contentLibrary();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch admin content library:', err);
      setError(err.message || 'Unable to load content library items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setCategory('Finance');
    setContentType('Text Block');
    setContentValue('');
    setShowModal(true);
  };

  const handleOpenEditModal = (item: ContentLibraryItem) => {
    setEditingId(item.id);
    setName(item.name);
    setDescription(item.description || '');
    setCategory(item.category || 'Finance');
    setContentType(item.contentType || 'Text Block');
    setContentValue(item.contentValue || '');
    setShowModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Content name is required.');
      return;
    }
    if (!contentValue.trim()) {
      alert('Content value is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: name.trim(),
        description: description.trim(),
        category,
        contentType,
        contentValue: contentValue.trim(),
      };

      if (editingId) {
        await configurationService.updateContentItem(editingId, payload);
        setToastMessage(`Content "${name}" updated successfully.`);
      } else {
        await configurationService.createContentItem(payload);
        setToastMessage(`Content "${name}" added to organization library.`);
      }

      await fetchItems();
      setShowModal(false);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save content library item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: ContentLibraryItem) => {
    try {
      const nextEnabled = !item.enabled;
      await configurationService.setContentItemEnabled(item.id, nextEnabled);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, enabled: nextEnabled } : i)));
      setToastMessage(`Content "${item.name}" is now ${nextEnabled ? 'Enabled' : 'Disabled'}.`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update content status');
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Enabled' && item.enabled) ||
      (statusFilter === 'Disabled' && !item.enabled);
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesType = selectedType === 'All' || item.contentType === selectedType;
    const searchMatches = matchesSearch(searchTerm, [item.name, item.description, item.contentValue, item.category, item.contentType]);

    return matchesStatus && matchesCat && matchesType && searchMatches;
  });

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-3 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-black tracking-tight text-slate-900">Content Library Management</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium pt-1">
            Manage reusable organization-approved content available across Template Studio. Disabling an item removes it for new creators.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Content</span>
        </button>
      </div>

      {/* Toolbar: Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['All', 'Enabled', 'Disabled'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === s ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {s} ({s === 'All' ? items.length : items.filter((i) => (s === 'Enabled' ? i.enabled : !i.enabled)).length})
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>

          {/* Type Dropdown */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="p-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="All">Type: All</option>
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>
                Type: {t}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search content..."
            className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Grid / Content */}
      {error ? (
        <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <p className="text-sm font-bold text-rose-900">{error}</p>
          <button
            onClick={fetchItems}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
          >
            Retry Loading Content
          </button>
        </div>
      ) : loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading shared content library...</div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-2">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-600">No content items found.</p>
          <p className="text-[11px]">Click "+ Add Content" above to add shared disclaimers, headers, or text blocks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const isEnabled = item.enabled;

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                  isEnabled
                    ? 'bg-white border-slate-200 shadow-xs hover:border-indigo-300'
                    : 'bg-slate-50 border-slate-200 opacity-75'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                        {item.contentType === 'Heading' ? (
                          <Type className="w-4 h-4" />
                        ) : item.contentType === 'Disclaimer' ? (
                          <ShieldAlert className="w-4 h-4 text-amber-600" />
                        ) : item.contentType === 'Instruction' ? (
                          <HelpCircle className="w-4 h-4 text-blue-600" />
                        ) : (
                          <AlignLeft className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-extrabold text-slate-900">{item.name}</h3>
                          <AdminInfoTooltip
                            title={item.name}
                            description={`Approved reusable organizational wording (${item.contentType}).`}
                            whoItAffects="Operational template authors."
                            impact="Content Library items provide approved reusable organizational wording. Disabling an item prevents new operational insertion but does not remove content already inserted into existing templates."
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                          <span>{item.category}</span>
                          <span>·</span>
                          <span className="font-bold text-slate-600">{item.contentType}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isEnabled
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-500 font-medium italic">
                      {item.description}
                    </p>
                  )}

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 line-clamp-3 leading-relaxed">
                    "{item.contentValue}"
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
                  <span className="text-[10px] font-medium text-slate-400">
                    Created by {item.createdByName || 'Admin'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Edit Content"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      className={`px-2.5 py-1 font-bold rounded-lg text-[11px] transition-colors cursor-pointer ${
                        !isEnabled
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {!isEnabled ? 'Enable' : 'Disable'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Add / Edit Content Item */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingId ? 'Edit Shared Content Item' : 'Add Shared Content Item'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Content Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Confidentiality Notice"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Content Type *</label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  >
                    {CONTENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Description (Optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Standard legal disclosure statement for report footers"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Content Value / Text *</label>
                <textarea
                  rows={4}
                  required
                  value={contentValue}
                  onChange={(e) => setContentValue(e.target.value)}
                  placeholder="Enter the reusable text or disclosure body..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-sm"
                >
                  {editingId ? 'Update Content' : 'Save Content'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
