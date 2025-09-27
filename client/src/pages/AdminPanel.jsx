
import React, { useState } from 'react';
import {
  Users as UsersIcon, Home, MessageCircle, Music, BarChart3, Settings, Search, Bell, User, Eye, Trash2, Edit, Lock, Unlock, Play, Pause, Clock, Shield, AlertTriangle, TrendingUp, Download, Upload, FileText, DollarSign, Calendar, Activity, Globe, Mail, Database, Server, CheckCircle, XCircle, AlertCircle, Volume2, Copyright, Flag
} from 'lucide-react';
import Dashboard from './admin/Dashboard';
import Users from './admin/Users';
import Rooms from './admin/Rooms';
import Comments from './admin/Comments';
import Content from './admin/Content';
import Analytics from './admin/Analytics';
import SettingsTab from './admin/Settings';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data
  const stats = {
    totalUsers: 1247,
    activeRooms: 23,
    totalComments: 8934,
    copyrightReports: 5
  };
  const recentUsers = [
    { id: 1, name: 'Nguyễn Văn A', email: 'nva@gmail.com', role: 'Host', status: 'active', joinDate: '2024-01-15' },
    { id: 2, name: 'Trần Thị B', email: 'ttb@gmail.com', role: 'Listener', status: 'banned', joinDate: '2024-01-14' },
    { id: 3, name: 'Lê Văn C', email: 'lvc@gmail.com', role: 'Host', status: 'active', joinDate: '2024-01-13' }
  ];
  const activeRooms = [
    { id: 1, name: 'Chill Lofi Night', host: 'DJ Music', members: 45, status: 'active', created: '2h ago' },
    { id: 2, name: 'Pop Hits 2024', host: 'PopLover', members: 32, status: 'active', created: '1h ago' },
    { id: 3, name: 'Rap Battles', host: 'RapKing', members: 28, status: 'reported', created: '3h ago' }
  ];
  const recentComments = [
    { id: 1, user: 'User123', content: 'Bài này hay quá!', room: 'Chill Lofi', time: '5m ago', status: 'approved' },
    { id: 2, user: 'MusicFan', content: 'Spam content here...', room: 'Pop Hits', time: '10m ago', status: 'flagged' },
    { id: 3, user: 'Listener99', content: 'Có thể chơi bài khác không?', room: 'Rap Battles', time: '15m ago', status: 'pending' }
  ];
  const copyrightReports = [
    { id: 1, song: 'Shape of You - Ed Sheeran', reporter: 'Universal Music', room: 'Pop Hits 2024', status: 'pending', date: '2024-01-15', severity: 'high' },
    { id: 2, song: 'Blinding Lights - The Weeknd', reporter: 'Sony Music', room: 'Night Vibes', status: 'resolved', date: '2024-01-14', severity: 'medium' },
    { id: 3, song: 'Bad Guy - Billie Eilish', reporter: 'Interscope Records', room: 'Teen Hits', status: 'investigating', date: '2024-01-13', severity: 'high' }
  ];

  const Sidebar = () => (
    <div style={{width: 250, background: '#f5f3ff', borderRight: '1px solid #ede9fe', minHeight: '100vh'}}>
      <div style={{padding: 24}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <div style={{width: 40, height: 40, background: 'linear-gradient(135deg,#a78bfa,#7c3aed)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Music size={24} color="#fff" />
          </div>
          <div>
            <div style={{fontWeight: 700, fontSize: 20, color: '#1e293b'}}>SoundSpace</div>
            <div style={{fontSize: 13, color: '#7c3aed'}}>Admin Panel</div>
          </div>
        </div>
      </div>
      <nav style={{padding: '0 16px'}}>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'users', label: 'Quản lý User', icon: UsersIcon },
          { id: 'rooms', label: 'Quản lý Phòng', icon: Home },
          { id: 'comments', label: 'Quản lý Bình luận', icon: MessageCircle },
          { id: 'content', label: 'Nội dung & Bản quyền', icon: Shield },
          { id: 'analytics', label: 'Thống kê', icon: TrendingUp },
          { id: 'settings', label: 'Cài đặt', icon: Settings }
        ].map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 8, marginBottom: 8, border: 'none', background: activeTab === item.id ? '#ede9fe' : 'transparent', color: activeTab === item.id ? '#7c3aed' : '#334155', fontWeight: 500, borderLeft: activeTab === item.id ? '4px solid #a78bfa' : '4px solid transparent', cursor: 'pointer', transition: 'all .2s'
              }}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );

  const Header = () => (
    <div style={{background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
        <div style={{position: 'relative'}}>
          <Search size={18} style={{position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a3a3a3'}} />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{padding: '8px 12px 8px 36px', width: 240, border: '1px solid #d1d5db', borderRadius: 8, outline: 'none', fontSize: 15, background: '#fff', color: '#222', transition: 'border .2s'}}
          />
        </div>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
        <button style={{position: 'relative', padding: 8, background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer'}}>
          <Bell size={22} />
          <span style={{position: 'absolute', top: 2, right: 2, width: 18, height: 18, background: '#ef4444', color: '#fff', fontSize: 11, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>3</span>
        </button>
        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <div style={{width: 32, height: 32, background: '#a78bfa', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <User size={18} color="#fff" />
          </div>
          <div>
            <div style={{fontWeight: 500, fontSize: 15, color: '#222'}}>Admin User</div>
            <div style={{fontSize: 12, color: '#64748b'}}>Quản trị viên</div>
          </div>
        </div>
      </div>
    </div>
  );

  // Dashboard tab (ví dụ)
  const Dashboard = () => (
    <div style={{padding: 24}}>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, marginBottom: 32}}>
        <StatCard title="Tổng số Users" value={stats.totalUsers} icon={Users} color="#a78bfa" />
        <StatCard title="Phòng đang hoạt động" value={stats.activeRooms} icon={Home} color="#38bdf8" />
        <StatCard title="Tổng bình luận" value={stats.totalComments} icon={MessageCircle} color="#4ade80" />
        <StatCard title="Báo cáo bản quyền" value={stats.copyrightReports} icon={AlertTriangle} color="#f87171" />
      </div>
      <div style={{display: 'flex', gap: 24, flexWrap: 'wrap'}}>
        <div style={{flex: 1, minWidth: 320, background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px #0001', border: '1px solid #f3f4f6', padding: 24}}>
          <div style={{fontWeight: 600, fontSize: 17, marginBottom: 16}}>Phòng hoạt động gần đây</div>
          {activeRooms.slice(0, 3).map(room => (
            <div key={room.id} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: '#f9fafb', borderRadius: 10, marginBottom: 10}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <div style={{width: 36, height: 36, background: '#ede9fe', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <Music size={18} color="#7c3aed" />
                </div>
                <div>
                  <div style={{fontWeight: 500, color: '#222'}}>{room.name}</div>
                  <div style={{fontSize: 13, color: '#64748b'}}>{room.host} • {room.members} người</div>
                </div>
              </div>
              <span style={{padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500, background: room.status === 'active' ? '#dcfce7' : '#fee2e2', color: room.status === 'active' ? '#15803d' : '#b91c1c'}}>
                {room.status === 'active' ? 'Hoạt động' : 'Báo cáo'}
              </span>
            </div>
          ))}
        </div>
        <div style={{flex: 1, minWidth: 320, background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px #0001', border: '1px solid #f3f4f6', padding: 24}}>
          <div style={{fontWeight: 600, fontSize: 17, marginBottom: 16}}>Bình luận cần xử lý</div>
          {recentComments.filter(c => c.status !== 'approved').map(comment => (
            <div key={comment.id} style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: 12, background: '#f9fafb', borderRadius: 10, marginBottom: 10}}>
              <div style={{flex: 1}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                  <span style={{fontWeight: 500, color: '#222'}}>{comment.user}</span>
                  <span style={{fontSize: 13, color: '#64748b'}}>trong {comment.room}</span>
                </div>
                <div style={{fontSize: 14, color: '#374151', marginTop: 4}}>{comment.content}</div>
                <div style={{fontSize: 12, color: '#a3a3a3', marginTop: 6}}>{comment.time}</div>
              </div>
              <div style={{display: 'flex', gap: 8, marginLeft: 12}}>
                <button style={{padding: 4, color: '#16a34a', background: 'none', border: 'none', borderRadius: 6}}><Eye size={16} /></button>
                <button style={{padding: 4, color: '#dc2626', background: 'none', border: 'none', borderRadius: 6}}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div style={{background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px #0001', border: '1px solid #f3f4f6', padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
      <div>
        <div style={{fontSize: 14, color: '#64748b', fontWeight: 500}}>{title}</div>
        <div style={{fontSize: 28, fontWeight: 700, color: '#222', marginTop: 6}}>{value.toLocaleString()}</div>
      </div>
      <div style={{width: 48, height: 48, borderRadius: 12, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Icon size={26} color="#fff" />
      </div>
    </div>
  );


  // Render component tạm thời cho từng tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard stats={stats} activeRooms={activeRooms} recentComments={recentComments} />;
      case 'users':
        return <Users />;
      case 'rooms':
        return <Rooms />;
      case 'comments':
        return <Comments />;
      case 'content':
        return <Content />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <Dashboard stats={stats} activeRooms={activeRooms} recentComments={recentComments} />;
    }
  };

  return (
    <div style={{display: 'flex', minHeight: '100vh', background: '#f3f4f6'}}>
      <Sidebar />
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh'}}>
        <Header />
        <main style={{flex: 1, overflow: 'auto', background: '#f3f4f6'}}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}