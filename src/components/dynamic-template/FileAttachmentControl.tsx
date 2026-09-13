import React, { useState, useRef, useEffect } from 'react';
import type { TemplateComponent } from '../../types/index.js';
import { UploadCloud, Trash2, ExternalLink, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { getReportBusinessFieldKey } from '../../shared/signatureResolver';
import { apiService } from '../../services/apiService';
import { authenticatedBinaryRequest } from '../../services/httpClient';

interface FileAttachmentControlProps {
  component: TemplateComponent;
  value: any;
  mode: 'edit' | 'readOnly';
  onChange?: (key: string, val: any) => void;
  disabled?: boolean;
  error?: string;
  reportId?: string;
}

export const FileAttachmentControl: React.FC<FileAttachmentControlProps> = ({
  component,
  value,
  mode,
  onChange,
  disabled,
  error,
  reportId,
}) => {
  const fieldKey = getReportBusinessFieldKey(component) || '';
  const fileConfig = component.fileConfig || {};
  const allowedTypes = (fileConfig.allowedFileTypes || ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'])
    .map((type: string) => String(type).toLowerCase().replace(/^\./, ''));
  const maxMb = fileConfig.maxFileSizeMb || 10;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize attachment object
  const attachment =
    typeof value === 'object' && value !== null
      ? value
      : typeof value === 'string' && value.trim()
      ? { fileName: value, url: value.startsWith('/api/') ? value : `/api/assets/${value}` }
      : null;

  const attachmentUrl = attachment?.url || (attachment?.attachmentId ? `/api/assets/${attachment.attachmentId}` : null);
  const attachmentIsImage = Boolean(attachment && (attachment.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(attachment.fileName || '')));

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;
    setPreviewUrl(null);
    setDownloadError(null);
    if (mode !== 'readOnly' || !attachmentIsImage || !attachmentUrl) return () => undefined;
    setPreviewLoading(true);
    void authenticatedBinaryRequest(attachmentUrl)
      .then(({ blob }) => {
        if (disposed) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch((error: any) => {
        if (!disposed) setDownloadError(error?.message || 'Unable to load attachment preview.');
      })
      .finally(() => { if (!disposed) setPreviewLoading(false); });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mode, attachmentIsImage, attachmentUrl]);

  const handleDownload = async () => {
    if (!attachmentUrl) return;
    setDownloadError(null);
    try {
      const { blob } = await authenticatedBinaryRequest(attachmentUrl);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = attachment?.fileName || 'attachment';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error: any) {
      setDownloadError(error?.message || 'Unable to download attachment.');
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelected = async (file: File) => {
    setUploadError(null);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    const mime = (file.type || '').toLowerCase() === 'image/jpg' ? 'image/jpeg' : (file.type || '').toLowerCase();
    const mimeByExtension: Record<string, string[]> = {
      pdf: ['application/pdf'],
      doc: ['application/msword'],
      docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      png: ['image/png'],
      jpg: ['image/jpeg'],
      jpeg: ['image/jpeg'],
    };
    const allowedMimeTypes = allowedTypes.flatMap((type: string) => mimeByExtension[type] || []);

    // Validate both the declared MIME and the extension. JPG/JPEG share image/jpeg.
    if (allowedTypes.length > 0 && !allowedTypes.includes(ext) && !allowedTypes.includes('*')) {
      setUploadError(`File extension .${ext} is not allowed. Supported: ${allowedTypes.join(', ')}.`);
      return;
    }
    if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(mime)) {
      setUploadError('Unsupported file type. Please upload PDF, DOC, DOCX, PNG, JPG, or JPEG.');
      return;
    }

    // Size Check
    if (file.size > maxMb * 1024 * 1024) {
      setUploadError(`File size exceeds maximum allowed limit of ${maxMb}MB.`);
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const json = await apiService.uploadAsset({
            filename: file.name,
            mimeType: mime || 'application/octet-stream',
            base64Data,
            ...(reportId ? { linkedReportId: reportId, purpose: 'report_attachment' } : { purpose: 'report_attachment' }),
          });
          if (json) {
            const payload = {
              attachmentId: json.id,
              fileName: file.name,
              mimeType: json.mimeType || mime,
              size: file.size,
              url: json.url,
            };
            if (onChange) onChange(fieldKey, payload);
          } else {
            setUploadError('Upload failed');
          }
        } catch (err: any) {
          setUploadError(err.message || 'Upload failed');
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        setIsUploading(false);
        setUploadError('Failed to read selected file');
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploading(false);
      setUploadError(err.message || 'Network error during upload');
    }
  };

  const handleRemove = () => {
    if (disabled || mode === 'readOnly') return;
    if (onChange) onChange(fieldKey, null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (mode === 'readOnly') {
    if (!attachment) {
      return <span className="text-slate-400 italic text-xs">No attachment uploaded</span>;
    }

    const isImage = attachmentIsImage;

    return (
      <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-2 max-w-md shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs text-slate-900 truncate block">
                {attachment.fileName || 'Attachment Document'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block">
                {formatSize(attachment.size)} {attachment.mimeType ? `• ${attachment.mimeType}` : ''}
              </span>
            </div>
          </div>

          {attachmentUrl && (
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={previewLoading}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Download
            </button>
          )}
        </div>

        {downloadError && <p className="text-[11px] text-rose-600">{downloadError}</p>}

        {isImage && attachmentUrl && (
          <div className="pt-2 border-t border-slate-100">
            {previewLoading ? <span className="text-xs text-slate-400">Loading preview…</span> : previewUrl ? (
              <img src={previewUrl} alt={attachment.fileName || 'Attachment preview'} className="max-h-48 rounded-xl border border-slate-200 object-contain bg-slate-50" />
            ) : null}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        type="file"
        ref={fileInputRef}
        accept={allowedTypes.includes('*') ? '.pdf,.doc,.docx,.png,.jpg,.jpeg' : allowedTypes.map((type: string) => `.${type}`).join(',')}
        disabled={disabled || isUploading}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelected(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {attachment ? (
        <div className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs text-slate-900 truncate block">
                {attachment.fileName || 'Attached File'}
              </span>
              <span className="text-[10px] font-mono text-slate-400 block">
                {formatSize(attachment.size)} {attachment.mimeType ? `• ${attachment.mimeType}` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 text-indigo-600 hover:bg-indigo-50 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Replace
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={handleRemove}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (disabled || isUploading) return;
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileSelected(e.dataTransfer.files[0]);
            }
          }}
          className={`p-6 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer ${
            disabled
              ? 'bg-slate-100 border-slate-300 cursor-not-allowed'
              : isUploading
              ? 'bg-indigo-50/50 border-indigo-300'
              : error || uploadError
              ? 'bg-rose-50/50 border-rose-300'
              : 'bg-slate-50/70 border-slate-300 hover:bg-indigo-50/30 hover:border-indigo-400'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs text-indigo-600">
              <UploadCloud className="w-6 h-6" />
            </div>
            {isUploading ? (
              <span className="text-xs font-bold text-indigo-700">Uploading file...</span>
            ) : (
              <>
                <div className="text-xs font-bold text-slate-800">
                  Drag a file here or <span className="text-indigo-600 underline">Choose File</span>
                </div>
                <span className="text-[10px] font-medium text-slate-400">
                  Allowed: {allowedTypes.join(', ').toUpperCase()} (Max {maxMb} MB)
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {(uploadError || error) && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium pt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{uploadError || error}</span>
        </div>
      )}
    </div>
  );
};
