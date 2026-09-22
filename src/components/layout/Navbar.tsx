import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Bell,
  MessageSquare,
  ChevronDown,
  User as UserIcon,
  Menu,
  Library,
  FileSpreadsheet,
  X,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { UserSignatureSettingsModal } from '../user/UserSignatureSettingsModal';
import { useAuth } from '../../features/auth/useAuth';
import { toAuthError } from '../../features/auth/authErrors';
import { navigateTo } from '../../features/auth/authRouting';
import { matchesSearch } from '../../features/search/searchMatcher';

export const Navbar: React.FC = () => {
  const { logout } = useAuth();
  const {
    currentUser,
    notifications,
    templates,
    reports,
    searchTerm,
    setSearchTerm,
    setSidebarOpen,
    toggleChatDrawer,
    openTemplateDetail,
    openReportViewModal,
    openProfileModal,
    hasPermission,
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showSigModal, setShowSigModal] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadNotifCount = notifications.filter(
    (n) => n.userId === currentUser.id && !n.read
  ).length;

  const unreadCommentCount = notifications.filter(
    (n) => n.userId === currentUser.id && !n.read && n.type === 'comment_added'
  ).length;

  // Search results calculation
  const approvedTemplates = templates.filter((t) => t.status === 'Approved');
  const userAccessibleReports = reports.filter(
    (r) => r.createdById === currentUser.id || r.assignments?.some((a) => a.recipientUserId === currentUser.id) || r.sentToId === currentUser.id || hasPermission('reports.view_organization')
  );

  const matchingTemplates = searchTerm.trim()
    ? approvedTemplates.filter((t) => matchesSearch(searchTerm, [
        t.templateDisplayId, t.name, t.description, t.createdByName, ...t.tags,
      ])).slice(0, 3)
    : [];

  const matchingReports = searchTerm.trim()
    ? userAccessibleReports.filter((r) => matchesSearch(searchTerm, [
        r.displayId, r.title, r.templateName, r.createdByName, r.sentToName, r.status,
      ])).slice(0, 3)
    : [];

  const hasSearchResults = matchingTemplates.length > 0 || matchingReports.length > 0;

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowUserMenu(false);
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleChatClick = () => {
    toggleChatDrawer(true);
  };

  const handleLogout = async () => {
    if (logoutPending) return;
    setLogoutPending(true);
    setLogoutError(null);
    try {
      await logout();
      navigateTo('/login', true);
    } catch (error) {
      setLogoutError(toAuthError(error).message);
    } finally {
      setLogoutPending(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Mobile sidebar toggle + Global Search input */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          onClick={() => setSidebarOpen((prev) => !prev)}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer md:hidden"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {hasPermission('search.use') && <div className="relative w-full" ref={searchRef}>
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSearchResults(e.target.value.trim().length > 0);
            }}
            onFocus={() => {
              if (searchTerm.trim()) setShowSearchResults(true);
            }}
            placeholder="Search templates & reports by name or Display ID…"
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setShowSearchResults(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Grouped Search Results Popover */}
          {showSearchResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 text-xs animate-scale-up divide-y divide-slate-100">
              {hasSearchResults ? (
                <>
                  {matchingTemplates.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Library className="w-3 h-3 text-indigo-600" />
                        Report Templates ({matchingTemplates.length})
                      </div>
                      {matchingTemplates.map((tpl) => (
                        <div
                          key={tpl.id}
                          onClick={() => {
                            setShowSearchResults(false);
                            setSearchTerm('');
                            openTemplateDetail(tpl);
                          }}
                          className="px-2.5 py-2 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-slate-900">{tpl.name}</div>
                            <div className="text-[10px] text-slate-500 line-clamp-1">{tpl.description}</div>
                          </div>
                          <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.2 rounded shrink-0">
                            {tpl.version || 'v1.0'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {matchingReports.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3 h-3 text-indigo-600" />
                        Generated Reports ({matchingReports.length})
                      </div>
                      {matchingReports.map((rep) => (
                        <div
                          key={rep.id}
                          onClick={() => {
                            setShowSearchResults(false);
                            setSearchTerm('');
                            openReportViewModal(rep);
                          }}
                          className="px-2.5 py-2 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-slate-900">{rep.title}</div>
                            <div className="text-[10px] text-slate-500">By {rep.createdByName}</div>
                          </div>
                          <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-2 py-0.2 rounded border border-indigo-200 shrink-0">
                            {rep.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 text-center text-slate-400 text-xs">
                  No matching templates or reports found for "{searchTerm}".
                </div>
              )}
            </div>
          )}
        </div>}
      </div>

      {/* Right: Actions & Profile Dropdown */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Request Chat Icon */}
        {hasPermission('template_approvals.comment') && <button
          onClick={handleChatClick}
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Template Request Discussions"
        >
          <MessageSquare className="w-5 h-5" />
          {unreadCommentCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 bg-indigo-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">
              {unreadCommentCount}
            </span>
          ) : (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full ring-2 ring-white" />
          )}
        </button>}

        {/* Notifications Bell Dropdown */}
        {hasPermission('notifications.view') && <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications((prev) => !prev)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <NotificationDropdown onClose={() => setShowNotifications(false)} />
          )}
        </div>}

        {/* User Profile Menu Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu((prev) => !prev)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className={`w-8 h-8 rounded-full ${currentUser.avatarBg} text-white font-bold flex items-center justify-center text-xs shadow-xs`}>
              {currentUser.avatarInitials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-800 leading-tight">{currentUser.name}</div>
              <div className="text-[10px] font-semibold text-slate-500">{currentUser.role}</div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 text-xs animate-scale-up">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <p className="font-bold text-slate-900">{currentUser.name}</p>
                {currentUser.profileCode && (
                  <p className="mt-0.5 font-mono text-[10px] font-bold text-indigo-600">{currentUser.profileCode}</p>
                )}
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">{currentUser.email}</p>
                <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                  {currentUser.role}
                </span>
              </div>

              <div className="py-1">
                {hasPermission('signature_profile.use') && <button
                  onClick={() => {
                    setShowUserMenu(false);
                    openProfileModal();
                  }}
                  className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span>View Profile & Metrics</span>
                </button>}

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowSigModal(true);
                  }}
                  className="w-full px-4 py-2 text-left text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 font-semibold cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>My Saved Signature</span>
                </button>

                <button
                  onClick={handleLogout}
                  disabled={logoutPending}
                  className="w-full px-4 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>{logoutPending ? 'Signing out…' : 'Sign Out'}</span>
                </button>
                {logoutError && <p role="alert" className="px-4 pb-2 text-[11px] leading-4 text-rose-700">{logoutError}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {showSigModal && hasPermission('signature_profile.use') && (
        <UserSignatureSettingsModal
          currentUser={currentUser}
          onClose={() => setShowSigModal(false)}
        />
      )}
    </header>
  );
};
