import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, CheckCheck, Clock, FileCheck, FileX, MessageSquare, AlertCircle } from 'lucide-react';

interface NotificationDropdownProps {
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const { currentUser, notifications, markNotificationRead, markAllNotificationsRead, setActiveView } = useApp();

  const userNotifications = notifications
    .filter((n) => n.userId === currentUser.id)
    .slice(0, 5);

  const unreadCount = userNotifications.filter((n) => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'template_approved':
        return <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'template_rejected':
        return <FileX className="w-4 h-4 text-rose-600 shrink-0" />;
      case 'comment_added':
        return <MessageSquare className="w-4 h-4 text-blue-600 shrink-0" />;
      case 'approval_required':
      case 'template_review_requested':
        return <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'template_returned':
        return <Clock className="w-4 h-4 text-amber-600 shrink-0" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-600 shrink-0" />;
    }
  };

  const handleNotificationClick = (notifId: string) => {
    markNotificationRead(notifId);
    setActiveView('notifications');
    onClose();
  };

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-fade-in">
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 text-sm">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllNotificationsRead}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
        {userNotifications.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            No notifications for {currentUser.name}
          </div>
        ) : (
          userNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n.id)}
              className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${
                !n.read ? 'bg-indigo-50/40' : ''
              }`}
            >
              <div className="mt-0.5">{getIcon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <h4 className={`text-xs font-semibold truncate ${!n.read ? 'text-slate-900' : 'text-slate-700'}`}>
                    {n.title}
                  </h4>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />}
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{n.message}</p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
        <button
          onClick={() => {
            setActiveView('notifications');
            onClose();
          }}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
        >
          View all notifications →
        </button>
      </div>
    </div>
  );
};
