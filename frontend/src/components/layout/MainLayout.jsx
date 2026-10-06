import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Activity, LayoutDashboard, Users, FileText, 
  BrainCircuit, History, Settings, LogOut, Bell, Sun, Moon, User
} from 'lucide-react';

export default function MainLayout({ role }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const userName = user?.name || (role === 'patient' ? 'Patient' : 'Doctor');
  const initials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
          const res = await fetch('http://localhost:8000/api/notifications/', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          const data = await res.json();
          setNotifications(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const markAllRead = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      await fetch('http://localhost:8000/api/notifications/mark_all_read/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setNotifications(notifications.map(n => ({...n, is_read: true})));
    } catch(err) {}
  };

  const markRead = async (id) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      await fetch(`http://localhost:8000/api/notifications/${id}/mark_read/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setNotifications(notifications.map(n => n.id === id ? {...n, is_read: true} : n));
    } catch(err) {}
  };

  const [pendingConsents, setPendingConsents] = useState([]);
  useEffect(() => {
    if (role === 'patient' && showNotifications) {
      const fetchConsents = async () => {
        try {
          const accessToken = localStorage.getItem('accessToken');
          const res = await fetch('http://localhost:8000/api/consents/', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          const data = await res.json();
          setPendingConsents(data.filter(c => c.status === 'pending'));
        } catch (err) {}
      };
      fetchConsents();
    }
  }, [role, showNotifications]);

  const handleAction = async (consentId, action, notificationId) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      await fetch(`http://localhost:8000/api/consents/${consentId}/${action}/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      // Mark notification as read
      markRead(notificationId);
      // Remove from pending
      setPendingConsents(pendingConsents.filter(c => c.id !== consentId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    const refreshToken = localStorage.getItem('refreshToken');
    const accessToken = localStorage.getItem('accessToken');
    if (refreshToken && accessToken) {
      try {
        await fetch('http://localhost:8000/api/logout/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ refresh: refreshToken })
        });
      } catch (err) {
        console.error('Logout failed:', err);
      }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const doctorNav = [
    { name: 'Dashboard', path: '/doctor/dashboard', icon: LayoutDashboard },
    { name: 'Patients', path: '/doctor/patients', icon: Users },
    { name: 'Consents', path: '/doctor/consents', icon: FileText },
    { name: 'AI Insights', path: '/doctor/insights', icon: BrainCircuit },
    { name: 'My Profile', path: '/doctor/profile', icon: User },
  ];

  const patientNav = [
    { name: 'My Portal', path: '/patient', icon: LayoutDashboard },
    { name: 'My Profile', path: '/patient/profile', icon: User },
  ];

  const navItems = role === 'patient' ? patientNav : doctorNav;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      {/* Background decorations for depth */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-200/30 rounded-full mix-blend-multiply filter blur-[100px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-200/30 rounded-full mix-blend-multiply filter blur-[100px]"></div>
      </div>

      {/* Sidebar */}
      <aside className="w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 shadow-soft flex flex-col hidden md:flex z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <Activity className="h-6 w-6 text-primary-600 mr-2" />
          <span className="text-xl font-bold text-slate-800 tracking-tight">MediLink</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </div>
        
        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="mr-3 h-5 w-5 text-red-500" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        {/* Top Navbar */}
        <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-sm flex items-center justify-between px-6 z-20">
          <div className="flex items-center md:hidden">
            <Activity className="h-6 w-6 text-primary-600" />
          </div>
          
          <div className="flex-1" />
          
          <div className="flex items-center space-x-4 relative">
            <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-slate-400 hover:text-slate-600 relative transition-colors">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 h-3 w-3 bg-red-500 rounded-full border-2 border-white text-[8px] flex items-center justify-center text-white font-bold">{unreadCount}</span>}
            </button>
            
            {showNotifications && (
              <div className="absolute top-12 right-12 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-primary-600 hover:text-primary-800">Mark all read</button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">No notifications</div>
                  ) : (
                    notifications.map(n => {
                      // Attempt to match a pending consent to this notification
                      const matchingConsent = pendingConsents.find(c => n.type === 'CONSENT_REQUESTED' && n.message.includes(c.doctor_name));
                      
                      return (
                        <div key={n.id} onClick={() => markRead(n.id)} className={`p-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-primary-50/30' : ''}`}>
                          <div className="flex justify-between items-start mb-1">
                            <span className={`text-xs font-bold ${!n.is_read ? 'text-primary-700' : 'text-slate-600'}`}>{n.type.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <p className={`text-xs ${!n.is_read ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>{n.message}</p>
                          
                          {matchingConsent && !n.is_read && (
                            <div className="flex space-x-2 mt-2" onClick={e => e.stopPropagation()}>
                              <button onClick={() => handleAction(matchingConsent.id, 'approve', n.id)} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white text-[10px] font-bold py-1.5 rounded transition-colors">
                                Approve
                              </button>
                              <button onClick={() => handleAction(matchingConsent.id, 'revoke', n.id)} className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-[10px] font-bold py-1.5 rounded transition-colors">
                                Deny
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
            
            <Link 
              to={role === 'patient' ? '/patient/profile' : '/doctor/profile'}
              className="flex items-center space-x-3 border-l pl-4 border-slate-200 hover:opacity-80 transition-opacity cursor-pointer group"
              title="View & Edit Profile"
            >
              <div className="h-8 w-8 rounded-full bg-primary-100 group-hover:ring-2 group-hover:ring-primary-400 flex items-center justify-center text-primary-700 font-bold text-sm transition-all shadow-sm">
                {initials}
              </div>
              <span className="text-sm font-semibold text-slate-700 group-hover:text-primary-700 hidden sm:block transition-colors">{userName}</span>
            </Link>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors md:hidden" title="Sign Out">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 relative z-0">
          <div className="max-w-7xl mx-auto animate-slide-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
