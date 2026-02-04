import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Home, Users, Settings, LogOut } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import DashboardPage from './DashboardPage';
import UsersPage from './UsersPage';
import SettingsPage from './SettingsPage';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  const navLinkClassName = ({ isActive }) => 
    `flex items-center px-4 py-2 hover:bg-gray-700 ${isActive ? 'bg-gray-700' : ''}`;

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 text-2xl font-bold">Admin</div>
        <nav className="mt-10 flex-1">
          <NavLink to="/" className={navLinkClassName} end>
            <Home className="w-5 h-5 mr-3" />
            看板
          </NavLink>
          <NavLink to="/users" className={navLinkClassName}>
            <Users className="w-5 h-5 mr-3" />
            管理员
          </NavLink>
          <NavLink to="/settings" className={navLinkClassName}>
            <Settings className="w-5 h-5 mr-3" />
            设置
          </NavLink>
        </nav>
        <div className="p-4">
          <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 hover:bg-gray-700">
            <LogOut className="w-5 h-5 mr-3" />
            安全退出
          </button>
        </div>
      </aside>
      <main className="flex-1 p-10 overflow-y-auto">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default Dashboard;
