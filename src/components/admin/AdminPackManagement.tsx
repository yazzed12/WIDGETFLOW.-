import React, { useEffect, useState } from 'react';
import { AlertTriangle, Archive, Edit3, Eye, Package, Plus, Search, X } from 'lucide-react';
import { adminService } from '../../features/admin/services/adminService';
import type { AdminPack, Category } from '../../types';
import { AdminInfoTooltip } from './AdminInfoTooltip';
import { TemplateBuilder } from '../template-builder/TemplateBuilder';
import type { builderTemplateToAdminPackPayload } from '../template-builder/adminPackCanvas';
import { matchesSearch } from '../../features/search/searchMatcher';

export const AdminPackManagement: React.FC = () => {
  const [packs, setPacks] = useState<AdminPack[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Draft' | 'Published' | 'Disabled' | 'Archived'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingPack, setViewingPack] = useState<AdminPack | null>(null);
  const [builderPack, setBuilderPack] = useState<AdminPack | null | undefined>(undefined);

  const fetchPacks = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, categoryData] = await Promise.all([adminService.packs(), adminService.categories()]);
      setPacks(Array.isArray(data) ? data : []);
      setCategories(Array.isArray(categoryData) ? categoryData.filter((category) => category.status !== 'Inactive') : []);
    } catch (err: any) {
      console.error('Failed to fetch admin packs:', err);
      setError(err.message || 'Unable to load Standard Packs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPacks();
  }, []);

  const filteredPacks = packs.filter((pack) => {
    const matchesStatus = statusFilter === 'All' || pack.status === statusFilter;
    return matchesStatus && matchesSearch(searchTerm, [pack.name, pack.categoryName, pack.description]);
  });

  type PackPayload = ReturnType<typeof builderTemplateToAdminPackPayload>;
  const saveDraft = async (payload: PackPayload, initialPack: AdminPack | null) => {
    if (initialPack?.id && initialPack.draftVersionId) {
      await adminService.savePackDraft(initialPack.id, payload);
    } else if (initialPack?.id) {
      throw new Error('Create a new draft version before editing this published Pack.');
    } else {
      await adminService.createPack(payload);
    }
    await fetchPacks();
  };
  const publishDraft = async (_payload: PackPayload, initialPack: AdminPack | null) => {
    if (!initialPack?.draftVersionId) throw new Error('Save a draft before publishing this Pack.');
    await adminService.publishPack(initialPack.id, initialPack.draftVersionId);
    await fetchPacks();
  };
  const runPackAction = async (action: () => Promise<unknown>) => {
    try { setError(null); await action(); await fetchPacks(); }
    catch (err: any) { setError(err.message || 'Pack operation failed.'); }
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-black tracking-tight text-slate-900">Pack Management</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium pt-1">Build and manage Standard Packs available to template creators across the organization.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {(['All', 'Draft', 'Published', 'Disabled', 'Archived'] as const).map((status) => (
            <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === status ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}>
              {status === 'Published' ? 'Published / Enabled' : status} ({status === 'All' ? packs.length : packs.filter((pack) => pack.status === status).length})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-56"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search packs..." className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none" /></div>
          <button type="button" onClick={() => setBuilderPack(null)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"><Plus className="w-4 h-4" />New Pack</button>
        </div>
      </div>

      {error ? (
        <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" /><p className="text-sm font-bold text-rose-900">{error}</p>
          <button onClick={() => void fetchPacks()} className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl cursor-pointer">Retry Loading Packs</button>
        </div>
      ) : loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading Standard Packs...</div>
      ) : filteredPacks.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-2"><Package className="w-8 h-8 text-slate-300 mx-auto" /><p className="text-xs font-bold text-slate-600">No Standard Packs found.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPacks.map((pack) => {
            const enabled = pack.status === 'Published';
            const componentCount = pack.structure?.reduce((count, section) => count + section.components.length, 0) ?? pack.items.length;
            return (
              <div key={pack.id} className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${enabled ? 'bg-white border-slate-200 shadow-xs hover:border-indigo-300' : 'bg-slate-50 border-slate-200 opacity-75'}`}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Package className="w-5 h-5" /></div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-extrabold text-slate-900">{pack.name}</h3>
                          <AdminInfoTooltip
                            title={pack.name}
                            description="Standard Pack containing reusable component sections."
                            whoItAffects="Operational template authors."
                            impact="Published packs are available to operational users. Disabled packs remain visible to Admin but cannot be inserted into new operational templates."
                            dependencies="Disabling or editing a Standard Pack does not modify templates where the pack was already inserted."
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">{componentCount} {componentCount === 1 ? 'component' : 'components'}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : pack.status === 'Archived' ? 'bg-slate-300 text-slate-700' : 'bg-slate-200 text-slate-600'}`}>{pack.status}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Last updated: {new Date(pack.updatedAt || pack.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
                  <button type="button" onClick={() => setViewingPack(pack)} className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-bold cursor-pointer"><Eye className="w-3.5 h-3.5" />{pack.draftVersionId ? 'View Draft' : 'View'}</button>
                  {pack.draftVersionId && <button type="button" onClick={() => setViewingPack({ ...pack, structure: pack.publishedStructure, items: pack.publishedItems || [], draftVersionId: undefined })} className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-bold cursor-pointer"><Eye className="w-3.5 h-3.5" />View Published</button>}
                  {pack.status !== 'Archived' && (pack.status === 'Draft' || pack.draftVersionId) && <button type="button" onClick={() => setBuilderPack(pack)} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"><Edit3 className="w-3.5 h-3.5" />Edit Draft</button>}
                  {pack.draftVersionId && <button type="button" onClick={() => void runPackAction(() => adminService.publishPack(pack.id, pack.draftVersionId!))} className="text-emerald-700 font-bold cursor-pointer">Publish Draft</button>}
                  {(pack.status === 'Published' || pack.status === 'Disabled') && !pack.draftVersionId && <button type="button" onClick={() => void runPackAction(() => adminService.createPackVersion(pack.id))} className="text-indigo-600 font-bold cursor-pointer">New Version</button>}
                  {pack.status === 'Published' && <button type="button" onClick={() => void runPackAction(() => adminService.disablePack(pack.id))} className="text-amber-700 font-bold cursor-pointer">Disable</button>}
                  {pack.status === 'Disabled' && <button type="button" onClick={() => void runPackAction(() => adminService.enablePack(pack.id))} className="text-emerald-700 font-bold cursor-pointer">Enable</button>}
                  {pack.status !== 'Archived' && <button type="button" onClick={() => void runPackAction(() => adminService.archivePack(pack.id))} className="flex items-center gap-1 text-rose-700 font-bold cursor-pointer"><Archive className="w-3.5 h-3.5" />Archive</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewingPack && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3"><div className="flex items-center gap-2"><Package className="w-5 h-5 text-indigo-600" /><h3 className="text-sm font-extrabold text-slate-900">{viewingPack.name}</h3></div><button type="button" onClick={() => setViewingPack(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5" /></button></div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(viewingPack.structure || []).length > 0 ? viewingPack.structure!.map((section) => (
                <div key={section.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl"><h4 className="text-xs font-extrabold text-slate-900">{section.title}</h4><p className="text-[11px] text-slate-500 mt-1">{section.components.map((component) => component.label || component.type).join(' • ')}</p></div>
              )) : viewingPack.items.map((item) => (
                <div key={item.id} className="p-2 bg-slate-50 rounded-lg flex items-center justify-between text-xs"><span className="font-bold text-slate-800">{item.label}</span><span className="text-[10px] uppercase text-slate-500">{item.sourceType}</span></div>
              ))}
            </div>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setViewingPack(null)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer">Close</button>{viewingPack.status !== 'Archived' && (viewingPack.status === 'Draft' || viewingPack.draftVersionId) && <button type="button" onClick={() => { setBuilderPack(viewingPack); setViewingPack(null); }} className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl cursor-pointer">Edit Draft</button>}</div>
          </div>
        </div>
      )}
      {builderPack !== undefined && <TemplateBuilder mode="admin-pack" initialPack={builderPack} categoriesOverride={categories} onClose={() => setBuilderPack(undefined)} onSaveAdminPack={saveDraft} onPublishAdminPack={publishDraft} />}
    </div>
  );
};
