import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileCode,
  LayoutTemplate,
  UploadCloud,
  X,
  ArrowRight,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type { WidgetTemplate, Category, ImportProposal, TemplateComponent, TemplateSection } from '../../types';
import { analyzeTemplateImportInBrowser } from '../../services/templateImportBrowser';
import { renderPdfPageToCanvas } from '../../services/pdfImportBrowser';
import { apiService } from '../../services/apiService';
import { isCanonicalTemplateUuid } from '../../features/templates/templateAssetUpload';

interface StudioWelcomeModalProps {
  templates: WidgetTemplate[];
  categories: Category[];
  onStartBlank: () => void;
  onSelectExistingTemplate: (template: WidgetTemplate) => void;
  onImportProposalReady: (proposal: ImportProposal) => void;
  onEnsureTemplateDraft?: () => Promise<string>;
  templateId?: string;
  onClose: () => void;
}

interface PdfMappingPreviewProps {
  file: File;
  components: TemplateComponent[];
  selectedComponentId: string | null;
  pageNumber: number;
  pageCount: number;
  zoom: number;
  onPageChange: (page: number) => void;
  onSelectComponent: (component: TemplateComponent) => void;
  onManualRegion: (region: { page: number; x: number; y: number; width: number; height: number; sourceId?: string }) => void;
  unmapped: Array<{ sourceId: string; page: number; text: string; status?: 'mapped' | 'needs_review' | 'unmapped' | 'ignored'; normalized?: { x: number; y: number; width: number; height: number } }>;
  onSelectUnmapped: (entry: PdfMappingPreviewProps['unmapped'][number]) => void;
}

const PdfMappingPreview: React.FC<PdfMappingPreviewProps> = ({ file, components, selectedComponentId, pageNumber, pageCount, zoom, onPageChange, onSelectComponent, onManualRegion, unmapped, onSelectUnmapped }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageSize, setPageSize] = useState({ width: 1, height: 1 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragRegion, setDragRegion] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  useEffect(() => { let cancelled = false; if (!canvasRef.current) return; renderPdfPageToCanvas(file, pageNumber, canvasRef.current, zoom).then((size) => { if (!cancelled) setPageSize(size); }).catch(() => undefined); return () => { cancelled = true; }; }, [file, pageNumber, zoom]);
  const pageComponents = components.filter((component) => (component as any).source?.page === pageNumber && (component as any).source?.normalized);
  const pageUnmapped = unmapped.filter((entry) => entry.page === pageNumber && entry.normalized);
  const pointerPosition = (event: React.PointerEvent<HTMLDivElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) }; };
  return <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 space-y-3">
    <div className="flex items-center justify-between text-xs"><b>Original PDF · Page {pageNumber} of {pageCount}</b><div className="flex items-center gap-1"><button type="button" disabled={pageNumber <= 1} onClick={() => onPageChange(pageNumber - 1)} className="px-2 py-1 rounded-lg border border-slate-200 disabled:opacity-40">Previous</button><button type="button" disabled={pageNumber >= pageCount} onClick={() => onPageChange(pageNumber + 1)} className="px-2 py-1 rounded-lg border border-slate-200 disabled:opacity-40">Next</button></div></div>
    <div className="overflow-auto max-h-[48vh] flex justify-center"><div className="relative shadow-lg bg-white" style={{ width: pageSize.width, height: pageSize.height }} onPointerDown={(event) => { const point = pointerPosition(event); setDragStart(point); setDragRegion({ ...point, width: 0, height: 0 }); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (!dragStart) return; const point = pointerPosition(event); setDragRegion({ x: Math.min(dragStart.x, point.x), y: Math.min(dragStart.y, point.y), width: Math.abs(point.x - dragStart.x), height: Math.abs(point.y - dragStart.y) }); }} onPointerUp={(event) => { if (dragStart && dragRegion && dragRegion.width > 0.01 && dragRegion.height > 0.01) onManualRegion({ page: pageNumber, ...dragRegion }); setDragStart(null); setDragRegion(null); event.currentTarget.releasePointerCapture(event.pointerId); }}><canvas ref={canvasRef} className="block" />{pageUnmapped.map((entry) => { const box = entry.normalized!; return <button type="button" key={entry.sourceId} aria-label={`Select unmapped source ${entry.text}`} onClick={(event) => { event.stopPropagation(); onSelectUnmapped(entry); }} className="absolute border-2 border-rose-400 bg-rose-100/20" style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${Math.max(box.height, 0.015) * 100}%` }} />; })}{pageComponents.map((component) => { const box = (component as any).source.normalized; return <button type="button" key={component.id} aria-label={`Select ${component.label || component.key}`} onClick={(event) => { event.stopPropagation(); onSelectComponent(component); }} className={`absolute border-2 ${selectedComponentId === component.id ? 'border-indigo-600 bg-indigo-200/30' : 'border-amber-400 bg-amber-100/10'} ${(component as any).ignored ? 'opacity-30' : ''}`} style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${Math.max(box.height, 0.015) * 100}%` }} />; })}{dragRegion && <div className="absolute border-2 border-indigo-600 bg-indigo-200/30 pointer-events-none" style={{ left: `${dragRegion.x * 100}%`, top: `${dragRegion.y * 100}%`, width: `${dragRegion.width * 100}%`, height: `${Math.max(dragRegion.height, 0.015) * 100}%` }} />}</div></div>
    <div className="text-[10px] text-slate-500">Click a detected region to review it, or drag a box around content WidgetFlow missed. The final template remains responsive and does not preserve PDF coordinates.</div>
  </div>;
};

export const StudioWelcomeModal: React.FC<StudioWelcomeModalProps> = ({
  templates,
  onStartBlank,
  onSelectExistingTemplate,
  onImportProposalReady,
  onEnsureTemplateDraft,
  templateId,
  onClose,
}) => {
  const [activeMode, setActiveMode] = useState<'hub' | 'import' | 'analysis' | 'template_picker'>('hub');

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importProposal, setImportProposal] = useState<ImportProposal | null>(null);
  const [selectedPdfComponentId, setSelectedPdfComponentId] = useState<string | null>(null);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [pdfZoom, setPdfZoom] = useState(1);
  const [manualPdfRegion, setManualPdfRegion] = useState<{ page: number; x: number; y: number; width: number; height: number; sourceId?: string } | null>(null);
  const [manualPdfLabel, setManualPdfLabel] = useState('Imported PDF field');
  const [manualPdfType, setManualPdfType] = useState<TemplateComponent['type']>('text');
  const [coverageAcknowledged, setCoverageAcknowledged] = useState(false);
  const [isUploadingImportImages, setIsUploadingImportImages] = useState(false);
  const [importImageError, setImportImageError] = useState<string | null>(null);
  const [uploadedImportImages, setUploadedImportImages] = useState<Record<string, { id: string; url: string }>>({});
  const [resolvedImportTemplateId, setResolvedImportTemplateId] = useState(templateId);

  // Handle File Upload Submit
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setIsUploading(true);
    setImportError(null);
    setImportImageError(null);
    setUploadedImportImages({});
    setResolvedImportTemplateId(templateId);

    try {
      const data = await analyzeTemplateImportInBrowser(importFile);
      setImportProposal(data);
      setCoverageAcknowledged(false);
      setSelectedPdfComponentId(null);
      setPdfPageNumber(1);
      setManualPdfRegion(null);
      setActiveMode('analysis');
    } catch (err: any) {
      const message = typeof err?.message === 'string' && /Unsupported file type|10 MiB|could not validate|password-protected|scanned PDF|too complex|could not read this PDF/i.test(err.message)
        ? err.message
        : 'We could not analyze this file safely. Please try a valid digital PDF, DOCX, XLSX, XLS, or WidgetFlow JSON file.';
      setImportError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const analysisSections = useMemo(() => (importProposal?.template.dynamicSections || []) as TemplateSection[], [importProposal]);
  const pdfCoverage = importProposal?.sourceMetadata?.pdfCoverage;
  const unmappedPdfEntries = (pdfCoverage?.ledger || []).filter((entry) => entry.status === 'unmapped');
  const updatePdfCoverage = (sourceId: string, status: 'mapped' | 'needs_review' | 'unmapped' | 'ignored') => {
    setImportProposal((current) => {
      const coverage = current?.sourceMetadata?.pdfCoverage;
      if (!current || !coverage) return current;
      const ledger = coverage.ledger.map((entry) => entry.sourceId === sourceId ? { ...entry, status } : entry);
      const pages = coverage.pages.map((page) => {
        const entries = ledger.filter((entry) => entry.page === page.page);
        return { ...page, mapped: entries.filter((entry) => entry.status === 'mapped').length, needsReview: entries.filter((entry) => entry.status === 'needs_review').length, unmapped: entries.filter((entry) => entry.status === 'unmapped').length, ignored: entries.filter((entry) => entry.status === 'ignored').length };
      });
      return { ...current, sourceMetadata: { ...current.sourceMetadata, pdfCoverage: { ...coverage, ledger, pages, mappedBlockCount: ledger.filter((entry) => entry.status === 'mapped').length, needsReviewCount: ledger.filter((entry) => entry.status === 'needs_review').length, unmappedBlockCount: ledger.filter((entry) => entry.status === 'unmapped').length } } };
    });
  };
  const updateImportedComponent = (componentId: string, patch: Partial<TemplateComponent>) => {
    setImportProposal((current) => {
      if (!current) return current;
      const sections = ((current.template.dynamicSections || []) as TemplateSection[]).map((section) => ({
        ...section,
        components: section.components.map((component) => component.id === componentId ? { ...component, ...patch } : component),
      }));
      const components = sections.flatMap((section) => section.components);
      return { ...current, template: { ...current.template, dynamicSections: sections, components, fields: components as any, sections: sections.map((section) => section.title) } };
    });
  };
  const moveImportedComponent = (componentId: string, sectionTitle: string) => {
    setImportProposal((current) => {
      if (!current) return current;
      const allSections = ((current.template.dynamicSections || []) as TemplateSection[]).map((section) => ({ ...section, components: section.components.filter((component) => component.id !== componentId) }));
      const component = ((current.template.components || []) as TemplateComponent[]).find((item) => item.id === componentId);
      if (!component) return current;
      const target = allSections.find((section) => section.title === sectionTitle) || allSections[0];
      if (!target) return current;
      const moved = { ...component, section: target.title, order: target.components.length };
      target.components = [...target.components, moved];
      const components = allSections.flatMap((section) => section.components.map((item, index) => ({ ...item, order: index })));
      return { ...current, template: { ...current.template, dynamicSections: allSections, components, fields: components as any } };
    });
  };
  const confirmImport = () => {
    if (!importProposal) return;
    if (importProposal.sourceType === 'pdf' && (importProposal.sourceMetadata?.pdfCoverage?.unmappedBlockCount || 0) > 0 && !coverageAcknowledged) {
      setCoverageAcknowledged(true);
      return;
    }
    void finalizeImport();
  };
  const finalizeImport = async () => {
    if (!importProposal || isUploadingImportImages) return;
    const proposal = importProposal;
    setImportImageError(null);
    setIsUploadingImportImages(true);
    const contentImages = ((proposal.template.components || []) as Array<TemplateComponent & { sampleImage?: boolean; sourceImage?: { classification?: string; sourceId?: string }; sourceImageDataUrl?: string }>).filter((component) => component.sampleImage && component.sourceImage?.classification === 'DOCUMENT_CONTENT_IMAGE' && !(component as any).ignored);
    let effectiveTemplateId = resolvedImportTemplateId || templateId;
    try {
      if (contentImages.length > 0 && !isCanonicalTemplateUuid(effectiveTemplateId)) {
        if (!onEnsureTemplateDraft) {
          throw new Error('TEMPLATE_DRAFT_REQUIRED');
        }
        effectiveTemplateId = await onEnsureTemplateDraft();
        if (!isCanonicalTemplateUuid(effectiveTemplateId)) {
          throw new Error('TEMPLATE_DRAFT_ID_UNAVAILABLE');
        }
        setResolvedImportTemplateId(effectiveTemplateId);
      }
      const uploaded: Record<string, { id: string; url: string }> = { ...uploadedImportImages };
      for (const component of contentImages) {
        const sourceId = component.sourceImage?.sourceId || component.id;
        if (uploaded[sourceId]) continue;
        const dataUrl = component.sourceImageDataUrl || (component.imageConfig as any)?.assetUrl;
        if (!dataUrl) throw new Error('MISSING_IMPORT_IMAGE_DATA');
        if (!isCanonicalTemplateUuid(effectiveTemplateId)) throw new Error('TEMPLATE_DRAFT_ID_UNAVAILABLE');
        const mimeType = dataUrl.match(/^data:([^;]+);/i)?.[1] || 'image/jpeg';
        const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
        const result = await apiService.uploadTemplateAsset({ filename: `docx-import-${sourceId}.${extension}`, mimeType, base64Data: dataUrl, linkedTemplateId: effectiveTemplateId });
        uploaded[sourceId] = { id: result.id, url: result.url };
        setUploadedImportImages({ ...uploaded });
      }
      const sections = ((proposal.template.dynamicSections || []) as TemplateSection[]).map((section) => ({
        ...section,
        components: section.components
          .filter((component) => !(component as any).ignored)
          .map((component, index) => {
            const sourceId = (component as any).sourceImage?.sourceId;
            const uploadedAsset = sourceId ? uploaded[sourceId] : undefined;
            const {
              source: _source,
              ignored: _ignored,
              sampleValue: _sampleValue,
              sampleRows: _sampleRows,
              sampleImage: _sampleImage,
              sourceImage: _sourceImage,
              sourceImageDataUrl: _sourceImageDataUrl,
              ...componentData
            } = component as TemplateComponent & Record<string, unknown>;
            return {
              ...componentData,
              ...(uploadedAsset
                ? { imageConfig: { ...(component.imageConfig || {}), assetId: uploadedAsset.id, assetUrl: uploadedAsset.url } }
                : {}),
              order: index,
            } as TemplateComponent;
          }),
      }));
      const components = sections.flatMap((section) => section.components);
      const finalizedProposal = { ...proposal, template: { ...proposal.template, ...(effectiveTemplateId ? { id: effectiveTemplateId } : {}), dynamicSections: sections, components, fields: components as any, sections: sections.map((section) => section.title) } };
      onImportProposalReady(finalizedProposal);
      setImportProposal(null);
      setActiveMode('hub');
    } catch (error) {
      setImportImageError(error instanceof Error && error.message === 'TEMPLATE_DRAFT_REQUIRED'
        ? 'This imported document image needs a saved template draft before it can be stored safely. Please retry after the draft is created.'
        : contentImages.length > 0
          ? 'WidgetFlow could not save one of the imported document images. Please retry before creating the template.'
          : 'WidgetFlow could not create the imported template. Please try again.');
    } finally {
      setIsUploadingImportImages(false);
    }
  };
  const addManualPdfComponent = () => {
    if (!importProposal || !manualPdfRegion) return;
    const sections = ((importProposal.template.dynamicSections || []) as TemplateSection[]).map((section) => ({ ...section, components: [...section.components] }));
    const target = sections[0] || { id: `sec-import-${Date.now()}`, title: 'Imported Document', order: 0, components: [] };
    if (!sections.length) sections.push(target);
    const component: TemplateComponent = { id: `pdf-manual-${Date.now()}`, type: manualPdfType, key: `pdf_manual_${Date.now()}`, label: manualPdfLabel.trim() || 'Imported PDF field', required: false, section: target.title, order: target.components.length, layoutWidth: manualPdfType === 'textarea' || manualPdfType === 'paragraph' ? 'full' : 'half', layout: { width: manualPdfType === 'textarea' || manualPdfType === 'paragraph' ? 'full' : 'half' } };
    (component as any).source = { ...manualPdfRegion, normalized: { x: manualPdfRegion.x, y: manualPdfRegion.y, width: manualPdfRegion.width, height: manualPdfRegion.height } };
    target.components.push(component);
    const components = sections.flatMap((section) => section.components);
    setImportProposal({ ...importProposal, template: { ...importProposal.template, dynamicSections: sections, components, fields: components as any, sections: sections.map((section) => section.title) } });
    setSelectedPdfComponentId(component.id);
    setManualPdfRegion(null);
    const sourceId = (component as any).source?.sourceId || manualPdfRegion.sourceId;
    if (sourceId) updatePdfCoverage(sourceId, 'mapped');
  };
  const addUnmappedParagraph = (entry: PdfMappingPreviewProps['unmapped'][number]) => {
    if (!importProposal) return;
    const sections = ((importProposal.template.dynamicSections || []) as TemplateSection[]).map((section) => ({ ...section, components: [...section.components] }));
    const target = sections[0];
    if (!target) return;
    const component: TemplateComponent = { id: `pdf-unmapped-${Date.now()}`, type: 'paragraph', key: `pdf_unmapped_${Date.now()}`, label: entry.text, section: target.title, order: target.components.length, layoutWidth: 'full', layout: { width: 'full' }, paragraphConfig: { contentHtml: `<p>${entry.text.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character))}</p>` } };
    (component as any).source = { ...entry, sourceType: 'PDF_UNMAPPED' };
    target.components.push(component);
    const components = sections.flatMap((section) => section.components);
    setImportProposal({ ...importProposal, template: { ...importProposal.template, dynamicSections: sections, components, fields: components as any } });
    updatePdfCoverage(entry.sourceId, 'mapped');
  };
  const selectUnmapped = (entry: PdfMappingPreviewProps['unmapped'][number]) => {
    setPdfPageNumber(entry.page);
    setManualPdfRegion(entry.normalized ? { page: entry.page, sourceId: entry.sourceId, ...entry.normalized } : null);
    setManualPdfLabel(entry.text.slice(0, 120));
    setManualPdfType('text');
  };
  const cancelImport = () => { setImportProposal(null); setImportFile(null); setImportError(null); setImportImageError(null); setUploadedImportImages({}); setResolvedImportTemplateId(templateId); setSelectedPdfComponentId(null); setManualPdfRegion(null); setCoverageAcknowledged(false); setActiveMode('hub'); };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">WidgetFlow Studio</h2>
            <p className="text-xs text-slate-500 font-medium">Smart Template Intake Hub</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeMode === 'hub' && (
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-extrabold text-slate-900">What would you like to create?</h3>
                <p className="text-xs text-slate-500">Choose an intake path to build your dynamic business template</p>
              </div>

              {/* 3 Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Start Blank */}
                <button
                  type="button"
                  onClick={onStartBlank}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/40 text-left transition-all group cursor-pointer shadow-2xs hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-700 flex items-center justify-center mb-3 transition-colors">
                      <FileCode className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-sm text-slate-900 group-hover:text-indigo-900">Start Blank</div>
                    <div className="text-xs text-slate-500 mt-1">Build a clean workspace from scratch using the universal toolbox.</div>
                  </div>
                </button>

                {/* 2. Use Existing Template */}
                <button
                  type="button"
                  onClick={() => setActiveMode('template_picker')}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/40 text-left transition-all group cursor-pointer shadow-2xs hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-700 flex items-center justify-center mb-3 transition-colors">
                      <LayoutTemplate className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-sm text-slate-900 group-hover:text-indigo-900">Use a Template</div>
                    <div className="text-xs text-slate-500 mt-1">Start from an existing firm-wide approved business template.</div>
                  </div>
                </button>

                {/* 3. Import File */}
                <button
                  type="button"
                  onClick={() => setActiveMode('import')}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/40 text-left transition-all group cursor-pointer shadow-2xs hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white text-slate-700 flex items-center justify-center mb-3 transition-colors">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-sm text-slate-900 group-hover:text-emerald-900">Import Existing File</div>
                    <div className="text-xs text-slate-500 mt-1">Convert digital PDF, Word (DOCX), Excel (XLSX), or JSON files into dynamic templates.</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Import File Mode */}
          {activeMode === 'import' && (
            <form onSubmit={handleFileUpload} className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-emerald-600" /> Import Existing Document
                </h3>
                <button type="button" onClick={() => setActiveMode('hub')} className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer">
                  ← Back to Hub
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 text-center bg-slate-50 hover:bg-emerald-50/30 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  accept=".pdf,.docx,.xlsx,.xls,.json,application/pdf"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="file-upload" className="cursor-pointer space-y-2 block">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="font-bold text-xs text-slate-900">
                    {importFile ? importFile.name : 'Click to select or drag and drop document'}
                  </div>
                  <div className="text-[11px] text-slate-500">Supports digital PDF, Word (.docx), Excel (.xlsx), and WidgetFlow (.json)</div>
                </label>
              </div>

              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setActiveMode('hub')} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!importFile || isUploading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-2"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} Analyze & Review Import
                </button>
              </div>
            </form>
          )}

          {activeMode === 'analysis' && importProposal && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Import Analysis</h3>
                  <p className="text-xs text-slate-500 mt-1">Review detected structure and confirm before it changes the Canvas.</p>
                </div>
                <button type="button" onClick={cancelImport} disabled={isUploadingImportImages} className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><b>File</b><div className="truncate mt-1">{importProposal.sourceFilename}</div></div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><b>Sections</b><div className="mt-1">{importProposal.summary.sectionCount}</div></div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><b>Fields</b><div className="mt-1">{importProposal.summary.fieldCount}</div></div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><b>Confidence</b><div className="mt-1">{importProposal.summary.confidence}</div></div>
              </div>
              {importProposal.sourceType === 'pdf' && <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900"><b>Digital PDF</b><div className="mt-1">{importProposal.sourceMetadata?.pageCount || 0} page(s) inspected. PDF geometry remains source evidence only; the created template stays responsive and structured.</div></div>}
              {importProposal.sourceType === 'pdf' && pdfCoverage && <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 text-xs"><div className="flex items-center justify-between"><b>PDF Coverage</b><span className="text-slate-500">{pdfCoverage.mappedBlockCount} / {pdfCoverage.extractedBlockCount} source blocks represented</span></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-2"><span className="rounded-lg bg-slate-50 p-2">Extracted <b>{pdfCoverage.extractedBlockCount}</b></span><span className="rounded-lg bg-emerald-50 text-emerald-800 p-2">Mapped <b>{pdfCoverage.mappedBlockCount}</b></span><span className="rounded-lg bg-amber-50 text-amber-800 p-2">Needs review <b>{pdfCoverage.needsReviewCount}</b></span><span className="rounded-lg bg-rose-50 text-rose-800 p-2">Unmapped <b>{pdfCoverage.unmappedBlockCount}</b></span></div><div className="flex flex-wrap gap-2">{pdfCoverage.pages.map((page) => <button type="button" key={page.page} onClick={() => setPdfPageNumber(page.page)} className={`rounded-lg border px-2 py-1 ${page.unmapped ? 'border-rose-300 text-rose-700' : 'border-slate-200 text-slate-600'}`}>Page {page.page}: {page.mapped} mapped{page.unmapped ? ` · ${page.unmapped} unmapped` : ''}</button>)}</div></div>}
              {importProposal.sourceType === 'docx' && importProposal.sourceMetadata?.docxCoverage && <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs"><div className="flex items-center justify-between"><b>DOCX Source Coverage</b><span className="text-slate-500">{importProposal.sourceMetadata.docxCoverage.mappedCellCount} mapped · {importProposal.sourceMetadata.docxCoverage.sourceSampleCount} source samples · {importProposal.sourceMetadata.docxCoverage.unresolvedCount} needs review</span></div><div className="mt-2 text-slate-500">Filled values and sample table rows are shown for review only and are not persisted as template defaults.</div></div>}
              {importImageError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{importImageError}</div>}
              {importProposal.sourceType === 'pdf' && importFile && <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4"><PdfMappingPreview file={importFile} components={(importProposal.template.components || []) as TemplateComponent[]} selectedComponentId={selectedPdfComponentId} pageNumber={pdfPageNumber} pageCount={importProposal.sourceMetadata?.pageCount || 1} zoom={pdfZoom} unmapped={unmappedPdfEntries} onPageChange={setPdfPageNumber} onSelectComponent={(component) => { setSelectedPdfComponentId(component.id); const source = (component as any).source; if (source?.page) setPdfPageNumber(source.page); }} onSelectUnmapped={selectUnmapped} onManualRegion={setManualPdfRegion} /><div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3"><div className="text-xs font-bold text-slate-800">Mapping Inspector</div><div className="flex items-center gap-2"><button type="button" onClick={() => setPdfZoom((zoom) => Math.max(0.75, zoom - 0.25))} className="px-2 py-1 rounded-lg border border-slate-200 text-xs">−</button><span className="text-xs text-slate-500">{Math.round(pdfZoom * 100)}%</span><button type="button" onClick={() => setPdfZoom((zoom) => Math.min(2, zoom + 0.25))} className="px-2 py-1 rounded-lg border border-slate-200 text-xs">+</button></div>{unmappedPdfEntries.length > 0 && <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 space-y-2"><b className="text-rose-800">Unmapped source content</b>{unmappedPdfEntries.slice(0, 20).map((entry) => <div key={entry.sourceId} className="rounded-lg bg-white/80 p-2"><div className="text-[10px] text-rose-700">Page {entry.page}</div><div className="mt-1 text-slate-700">“{entry.text}”</div><div className="mt-2 flex flex-wrap gap-1"><button type="button" onClick={() => selectUnmapped(entry)} className="rounded-md bg-indigo-600 px-2 py-1 text-[10px] font-bold text-white">Map as component</button><button type="button" onClick={() => addUnmappedParagraph(entry)} className="rounded-md border border-slate-200 px-2 py-1 text-[10px]">Add as Paragraph</button><button type="button" onClick={() => updatePdfCoverage(entry.sourceId, 'ignored')} className="rounded-md border border-slate-200 px-2 py-1 text-[10px]">Ignore</button></div></div>)}</div>}{manualPdfRegion ? <div className="space-y-2 rounded-xl bg-indigo-50 p-3"><div className="text-xs font-bold text-indigo-900">Create field from selected region</div><input value={manualPdfLabel} onChange={(event) => setManualPdfLabel(event.target.value)} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs" aria-label="Manual PDF mapping label" /><select value={manualPdfType} onChange={(event) => setManualPdfType(event.target.value as TemplateComponent['type'])} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs" aria-label="Manual PDF mapping type">{['text','textarea','number','currency','percentage','date','datetime','select','radio','checkbox','heading','paragraph','signature'].map((type) => <option key={type} value={type}>{type}</option>)}</select><button type="button" onClick={addManualPdfComponent} className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold">Add to proposal</button></div> : <div className="text-xs text-slate-500">Click a detected area to review it, or draw a box to create a missing mapping.</div>}</div></div>}
              {importProposal.issues.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1"><b>Review notes</b>{importProposal.issues.map((issue, index) => <div key={`${issue.message}-${index}`}>• {issue.message}</div>)}</div>}
              <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-1">
                {analysisSections.map((section) => (
                  <div key={section.id} className="rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-800">{section.title}</div>
                    <div className="divide-y divide-slate-100">
                      {section.components.map((component) => (
                        <div key={component.id} onClick={() => { setSelectedPdfComponentId(component.id); const source = (component as any).source; if (source?.page) setPdfPageNumber(source.page); }} className={`p-3 grid grid-cols-1 sm:grid-cols-[1fr_130px_160px_auto] gap-2 items-center text-xs cursor-pointer ${selectedPdfComponentId === component.id ? 'bg-indigo-50' : ''}`}>
                          <div>
                            <input value={component.label || ''} onChange={(event) => updateImportedComponent(component.id, { label: event.target.value })} aria-label={`Label for ${component.key}`} className="border border-slate-200 rounded-lg px-2 py-1.5 w-full" />
                            <div className="text-[10px] text-slate-400 mt-1">{(component as any).sampleValue ? `Source value detected: ${(component as any).sampleValue} · Template default: None` : Array.isArray((component as any).sampleRows) ? `Source contains ${(component as any).sampleRows.length} populated sample row(s) · Template rows: None` : (component as any).sampleImage ? 'Embedded document image · text is not editable · configure a reusable asset after import' : importProposal.detections?.flatMap((detection) => detection.components).find((detection) => detection.id === component.id)?.confidenceReason || 'Review before creating.'}</div>
                          </div>
                          <select value={component.type} onChange={(event) => updateImportedComponent(component.id, { type: event.target.value as TemplateComponent['type'] })} aria-label={`Type for ${component.key}`} className="border border-slate-200 rounded-lg px-2 py-1.5">
                            {['text','textarea','number','currency','percentage','date','datetime','select','radio','checkbox','heading','paragraph','table','image','signature'].map((type) => <option key={type} value={type}>{type}</option>)}
                          </select>
                          <select value={section.title} onChange={(event) => moveImportedComponent(component.id, event.target.value)} aria-label={`Section for ${component.key}`} className="border border-slate-200 rounded-lg px-2 py-1.5">
                            {analysisSections.map((candidate) => <option key={candidate.id} value={candidate.title}>{candidate.title}</option>)}
                          </select>
                          <div className="flex items-center gap-2 text-slate-600">
                            <label className="inline-flex items-center gap-1"><input type="checkbox" checked={Boolean(component.required)} onChange={(event) => updateImportedComponent(component.id, { required: event.target.checked })} /> Required</label>
                            <label className="inline-flex items-center gap-1"><input type="checkbox" checked={Boolean((component as any).ignored)} onChange={(event) => { updateImportedComponent(component.id, { ...(event.target.checked ? { ignored: true } : { ignored: false } as any) } as any); const sourceId = (component as any).source?.sourceId; if (sourceId) updatePdfCoverage(sourceId, event.target.checked ? 'ignored' : (['heading', 'paragraph'].includes(component.type) ? 'mapped' : 'needs_review')); }} /> Ignore</label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={cancelImport} disabled={isUploadingImportImages} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
                {coverageAcknowledged && unmappedPdfEntries.length > 0 && <div className="mr-auto rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">WidgetFlow found source content that has not been mapped. You can still create the template knowingly.</div>}
                <button type="button" onClick={confirmImport} disabled={isUploadingImportImages} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-wait">{isUploadingImportImages ? 'Saving imported images…' : coverageAcknowledged && unmappedPdfEntries.length > 0 ? 'Create Template Anyway' : 'Create Template'}</button>
              </div>
            </div>
          )}

          {/* Template Picker Mode */}
          {activeMode === 'template_picker' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Select Existing Template to Clone</h3>
                <button type="button" onClick={() => setActiveMode('hub')} className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer">
                  ← Back to Hub
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => onSelectExistingTemplate(tpl)}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-500 bg-white text-left transition-all cursor-pointer shadow-2xs hover:shadow-sm"
                  >
                    <div className="font-bold text-xs text-slate-900">{tpl.name}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-2 mt-1">{tpl.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
