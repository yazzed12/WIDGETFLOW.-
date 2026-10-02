import React, { useState, useRef } from 'react';
import { sanitizeParagraphHtml, isSafeUrl } from '../../shared/display-tools/paragraphSanitizer.js';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  Edit3,
} from 'lucide-react';

interface RichParagraphEditorProps {
  value: string;
  onChange: (sanitizedHtml: string) => void;
}

export const RichParagraphEditor: React.FC<RichParagraphEditorProps> = ({ value, onChange }) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkError, setLinkError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertTag = (openTag: string, closeTag: string) => {
    const el = textareaRef.current;
    if (!el) {
      const updated = (value || '') + `${openTag}sample text${closeTag}`;
      onChange(sanitizeParagraphHtml(updated));
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const currentText = el.value || '';
    const selectedText = currentText.substring(start, end) || 'text';

    const newContent =
      currentText.substring(0, start) +
      `${openTag}${selectedText}${closeTag}` +
      currentText.substring(end);

    const sanitized = sanitizeParagraphHtml(newContent);
    onChange(sanitized);

    // Restore focus
    setTimeout(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(start + openTag.length, end + openTag.length);
      }
    }, 0);
  };

  const handleAddLink = () => {
    if (!linkUrl || !isSafeUrl(linkUrl)) {
      setLinkError('Please enter a valid URL (https://, http://, or mailto:).');
      return;
    }

    const textToUse = linkText.trim() || linkUrl.trim();
    const tag = `<a href="${linkUrl.trim()}" target="_blank" rel="noopener noreferrer">${textToUse}</a>`;

    const currentText = value || '';
    const updated = currentText ? `${currentText} ${tag}` : tag;
    onChange(sanitizeParagraphHtml(updated));

    setShowLinkModal(false);
    setLinkText('');
    setLinkUrl('https://');
    setLinkError(null);
  };

  return (
    <div className="space-y-2 select-none">
      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
        <span className="text-[11px] font-bold text-slate-800">Rich Paragraph Content</span>
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-2 py-0.5 rounded cursor-pointer ${
              activeTab === 'edit' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600'
            }`}
          >
            <Edit3 className="w-3 h-3 inline mr-1" /> Edit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-2 py-0.5 rounded cursor-pointer ${
              activeTab === 'preview' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600'
            }`}
          >
            <Eye className="w-3 h-3 inline mr-1" /> Preview
          </button>
        </div>
      </div>

      {activeTab === 'edit' ? (
        <div className="space-y-2">
          {/* Formatting Toolbar */}
          <div className="p-1 bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-1 flex-wrap text-slate-700">
            <button
              type="button"
              aria-label="Format bold text"
              onClick={() => insertTag('<strong>', '</strong>')}
              title="Bold <strong>"
              className="p-1.5 hover:bg-white hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              aria-label="Format italic text"
              onClick={() => insertTag('<em>', '</em>')}
              title="Italic <em>"
              className="p-1.5 hover:bg-white hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              aria-label="Format underlined text"
              onClick={() => insertTag('<u>', '</u>')}
              title="Underline"
              className="p-1.5 hover:bg-white hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-slate-300 mx-0.5" />

            <button
              type="button"
              aria-label="Insert bullet list"
              onClick={() => insertTag('<ul><li>', '</li><li>Item 2</li></ul>')}
              title="Bulleted List"
              className="p-1.5 hover:bg-white hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
            >
              <List className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              aria-label="Insert numbered list"
              onClick={() => insertTag('<ol><li>', '</li><li>Item 2</li></ol>')}
              title="Numbered List"
              className="p-1.5 hover:bg-white hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-slate-300 mx-0.5" />

            <button
              type="button"
              aria-label="Insert hyperlink"
              onClick={() => setShowLinkModal(true)}
              title="Insert Safe Hyperlink"
              className="p-1.5 hover:bg-white hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
            >
              <LinkIcon className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-slate-300 mx-0.5" />

            <button
              type="button"
              aria-label="Align text left"
              onClick={() => insertTag('<div class="text-left">', '</div>')}
              title="Align Left"
              className="p-1.5 hover:bg-white hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              aria-label="Align text center"
              onClick={() => insertTag('<div class="text-center">', '</div>')}
              title="Align Center"
              className="p-1.5 hover:bg-white hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              aria-label="Align text right"
              onClick={() => insertTag('<div class="text-right">', '</div>')}
              title="Align Right"
              className="p-1.5 hover:bg-white hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Editor Area */}
          <textarea
            ref={textareaRef}
            rows={4}
            value={value || ''}
            onChange={(e) => onChange(sanitizeParagraphHtml(e.target.value))}
            placeholder="Type or format paragraph text disclaimers..."
            className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
          />
        </div>
      ) : (
        /* Preview Tab */
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl min-h-[100px] text-xs text-slate-700 leading-relaxed overflow-x-auto">
          {value ? (
            <div
              className="prose prose-xs max-w-none text-slate-800"
              dangerouslySetInnerHTML={{ __html: sanitizeParagraphHtml(value) }}
            />
          ) : (
            <span className="text-slate-400 italic">No paragraph text content defined.</span>
          )}
        </div>
      )}

      {/* Insert Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-4 w-full max-w-xs border border-slate-200 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-900">Insert Safe Hyperlink</h4>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-1">Display Text</label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="e.g. Corporate Travel Policy"
                className="w-full p-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-1">URL (https://, mailto:)</label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => {
                  setLinkUrl(e.target.value);
                  setLinkError(null);
                }}
                placeholder="https://firm.com/policy.pdf"
                className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>

            {linkError && <p className="text-[10px] text-rose-600 font-medium">{linkError}</p>}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddLink}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
