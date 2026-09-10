import React, { useState } from 'react';
import { HardDrive, Trash2, Search, CheckCircle2, File, Image } from 'lucide-react';
import { StatusPill } from '../common/StatusPill';
import { formatDate, formatFileSize, resolveUserName } from '../common/entityResolvers';
import { ReviewChangesDialog } from '../common/ReviewChangesDialog';
import { adminDataControlService } from '../../../../features/admin/services/adminDataControlService';
import { useApp } from '../../../../context/AppContext';

export interface AssetRecord {
  id: string;
  original_filename?: string;
  owner_user_id?: string;
  mime_type?: string;
  byte_size?: number | string;
  lifecycle_state?: string;
  linked_template_id?: string;
  linked_report_id?: string;
  created_at?: string;
  [key: string]: unknown;
}

interface AssetExplorerProps {
  assets: AssetRecord[];
  isLoading?: boolean;
  onRefresh?: () => void;
  page?: number; totalCount?: number; pageSize?: number; onPageChange?: (page: number) => void;
}

export const AssetExplorer: React.FC<AssetExplorerProps> = ({
  assets,
  onRefresh,
  page = 1, totalCount = assets.length, pageSize = 25, onPageChange,
}) => {
  const { users = [] } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const filtered = assets.filter((a) => {
    const term = searchTerm.toLowerCase().trim();
    const name = (a.original_filename || '').toLowerCase();
    const mime = (a.mime_type || '').toLowerCase();
    return !term || name.includes(term) || mime.includes(term);
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((a) => a.id));
    }
  };

  const handleExecuteCleanup = async () => {
    if (selectedIds.length === 0) return;
    setIsExecuting(true);
    setNotice(null);
    try {
      const res = await adminDataControlService.cleanupAssets(
        selectedIds,
        'DELETE ORPHAN ASSETS'
      );
      setNotice(`Orphan asset cleanup completed. Processed ${res.requestedCount} assets.`);
      setSelectedIds([]);
      setIsReviewOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Asset cleanup could not be completed.');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-purple-700" />
            <span>Asset Storage Explorer</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspect uploaded documents, template attachments, signatures, and safely clean orphan files.
          </p>
        </div>

        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={() => setIsReviewOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clean Orphan Assets ({selectedIds.length})</span>
          </button>
        )}
      </div>
      {onPageChange && <div className="flex items-center justify-between text-xs text-slate-500"><span>Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()} assets</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">Previous</button><button type="button" disabled={page * pageSize >= totalCount} onClick={() => onPageChange(page + 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">Next</button></div></div>}

      {notice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Search and Batch Actions */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); onPageChange?.(1); }}
            placeholder="Search assets by filename or MIME type…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-purple-500"
          />
        </div>
        <button
          type="button"
          onClick={selectAll}
          className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
        >
          {selectedIds.length === filtered.length ? 'Deselect All' : 'Select Visible'}
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-4 w-10 text-center">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.length === filtered.length}
                  onChange={selectAll}
                  className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  aria-label="Select all assets"
                />
              </th>
              <th className="py-3.5 px-4 font-bold">Filename</th>
              <th className="py-3.5 px-4 font-bold">Owner</th>
              <th className="py-3.5 px-4 font-bold">MIME Type</th>
              <th className="py-3.5 px-4 font-bold">File Size</th>
              <th className="py-3.5 px-4 font-bold">Lifecycle State</th>
              <th className="py-3.5 px-4 font-bold">Uploaded Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((asset) => {
              const filename = asset.original_filename || 'Asset File';
              const ownerName = resolveUserName(asset.owner_user_id, null, users);
              const isChecked = selectedIds.includes(asset.id);
              const isImage = (asset.mime_type || '').startsWith('image/');

              return (
                <tr key={asset.id} className="hover:bg-purple-50/40 transition-colors">
                  <td className="py-3.5 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(asset.id)}
                      className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                      aria-label={`Select asset ${filename}`}
                    />
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-100 text-slate-600 shrink-0">
                        {isImage ? <Image className="w-4 h-4" /> : <File className="w-4 h-4" />}
                      </div>
                      <span className="truncate max-w-xs">{filename}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">{ownerName}</td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                    {asset.mime_type || 'application/octet-stream'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-mono">
                    {formatFileSize(asset.byte_size)}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusPill status={asset.lifecycle_state || 'Active'} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-medium">
                    {formatDate(asset.created_at, true)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Review Changes Dialog */}
      <ReviewChangesDialog
        isOpen={isReviewOpen}
        title="Review Orphan Asset Removal"
        description="Permanently delete the selected unreferenced assets from storage. Linked attachments and system templates remain preserved."
        willRemove={[
          {
            label: 'Selected orphan file assets',
            count: selectedIds.length,
          },
        ]}
        willRemain={[
          { label: 'Active report attachments' },
          { label: 'Published template assets' },
          { label: 'User signature profiles' },
        ]}
        confirmationPhrase="DELETE ORPHAN ASSETS"
        isExecuting={isExecuting}
        onConfirm={handleExecuteCleanup}
        onClose={() => setIsReviewOpen(false)}
      />
    </div>
  );
};
