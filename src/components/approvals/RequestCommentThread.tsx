import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Send, MessageSquare } from 'lucide-react';

interface RequestCommentThreadProps {
  templateId: string;
}

export const RequestCommentThread: React.FC<RequestCommentThreadProps> = ({ templateId }) => {
  const { requestComments, addRequestComment, currentUser, hasTemplateApprovalPermission } = useApp();
  const [newMessage, setNewMessage] = useState('');

  const comments = requestComments
    .filter((c) => c.templateId === templateId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    addRequestComment(templateId, newMessage.trim());
    setNewMessage('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          Request Conversation ({comments.length})
        </h4>
        <span className="text-[10px] text-slate-400">Scoped to this template</span>
      </div>

      {/* Messages Feed */}
      <div className="space-y-3 max-h-64 overflow-y-auto p-3 bg-slate-50/70 rounded-xl border border-slate-200 divide-y divide-slate-100">
        {comments.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-xs italic">
            No comments yet. Start the conversation below.
          </div>
        ) : (
          comments.map((comment) => {
            const isMe = comment.userId === currentUser.id;
            return (
              <div key={comment.id} className="pt-2 first:pt-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-5 h-5 rounded-full ${
                        isMe ? 'bg-indigo-600' : 'bg-slate-700'
                      } text-white flex items-center justify-center text-[9px] font-bold`}
                    >
                      {comment.userAvatar || comment.userName.charAt(0)}
                    </div>
                    <span className="text-xs font-bold text-slate-900">{comment.userName}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-slate-200 text-slate-700">
                      {comment.userRole}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {comment.delegatedByName && comment.authorityRoleName && <p className="ml-6 text-[10px] font-semibold text-indigo-700">Acting as {comment.authorityRoleName} for {comment.delegatedByName}</p>}
                <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs leading-relaxed">
                  {comment.message}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Input Box */}
      {hasTemplateApprovalPermission('template_approvals.comment') && <form onSubmit={handleSend} className="flex items-center gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Write a comment or request update..."
          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>}
    </div>
  );
};
