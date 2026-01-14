
import React, { useState, useMemo } from 'react';
import { Driver, Passenger, Role, Location, UserProfile, TimeSlot } from '../types';
import { LOCATIONS } from '../constants';
import { 
  Users, Car, Calendar, TrendingUp, Plus, Search, Edit2, Trash2, 
  CheckCircle, Clock, X, Phone, Navigation, History, User, Mail, Briefcase, Trash, MapPin, ArrowRight
} from 'lucide-react';
import { deleteDriver, updateDriverState, addTimeSlot, deleteTimeSlot, updatePassengerStatus } from '../firebaseService';

interface Props {
  drivers: Driver[];
  passengers: Passenger[];
  users: UserProfile[];
  timeSlots: TimeSlot[];
}

type AdminTab = 'stats' | 'drivers' | 'bookings' | 'users' | 'timeslots';

const AdminDashboard: React.FC<Props> = ({ drivers, passengers, users, timeSlots }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('stats');
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTime, setNewTime] = useState('');

  const onlyPassengers = useMemo(() => {
    return users.filter(u => u.role === 'passenger' || !u.role);
  }, [users]);

  const stats = useMemo(() => {
    const totalBookings = passengers.length;
    const completedBookings = passengers.filter(p => p.status === 'completed').length;
    const pendingBookings = passengers.filter(p => p.status === 'pending').length;
    const totalRegisteredUsers = onlyPassengers.length;
    const revenue = completedBookings * 150000;
    return { totalBookings, completedBookings, pendingBookings, revenue, totalRegisteredUsers };
  }, [passengers, onlyPassengers]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      d.phone.includes(searchQuery)
    );
  }, [drivers, searchQuery]);

  const filteredBookings = useMemo(() => {
    return passengers.filter(p => {
      if (!p.createdAt) return false;
      try {
        const dateObj = new Date(p.createdAt);
        if (isNaN(dateObj.getTime())) return false;
        const dateStr = dateObj.toISOString().split('T')[0];
        return dateStr === dateFilter;
      } catch (e) {
        return false;
      }
    }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [passengers, dateFilter]);

  const handleAddTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTime) return;
    await addTimeSlot(newTime);
    setNewTime('');
  };

  const handleDeleteDriver = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tài xế này?")) {
      await deleteDriver(id);
    }
  };

  const handleToggleStatus = async (p: Passenger) => {
    const nextStatus = p.status === 'pending' ? 'booked' : p.status === 'booked' ? 'completed' : 'pending';
    await updatePassengerStatus(p.id, nextStatus as any);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-3xl shadow-sm border border-gray-100 w-fit">
        {[
          { id: 'stats', label: 'Thống kê', icon: TrendingUp },
          { id: 'drivers', label: 'Tài xế', icon: Car },
          { id: 'bookings', label: 'Đơn đặt xe', icon: Calendar },
          { id: 'users', label: 'Khách hàng', icon: Users },
          { id: 'timeslots', label: 'Khung giờ', icon: Clock },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as AdminTab);
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
              : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Tổng chuyến" value={stats.totalBookings} icon={Briefcase} color="blue" />
          <StatCard title="Khách đặt xe" value={stats.totalRegisteredUsers} icon={Users} color="indigo" />
          <StatCard title="Đã hoàn thành" value={stats.completedBookings} icon={CheckCircle} color="green" />
          <StatCard title="Doanh thu" value={`${stats.revenue.toLocaleString()}đ`} icon={TrendingUp} color="orange" />
        </div>
      )}

      {activeTab === 'drivers' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Quản lý Tài xế</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Đang hoạt động: {drivers.length}</p>
            </div>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Tìm tên hoặc SĐT tài xế..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-6 py-3 bg-white border-2 border-gray-50 rounded-2xl font-bold text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDrivers.map(driver => {
              const slot = timeSlots.find(s => s.id === driver.departureTime);
              return (
                <div key={driver.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 space-y-6 hover:shadow-xl transition-all group">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-gray-900 text-lg">{driver.name}</h3>
                        <p className="text-xs font-bold text-gray-400">{driver.phone}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteDriver(driver.id)} className="p-3 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lộ trình</span>
                      <div className="flex items-center gap-2 text-xs font-black text-gray-700">
                        <Navigation className="w-3 h-3 text-blue-500" />
                        {driver.direction === 'QN-DN' ? 'QN ➔ ĐN' : 'ĐN ➔ QN'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Giờ chạy</span>
                      <div className="flex items-center gap-2 text-xs font-black text-gray-700">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        {slot ? slot.time : 'Chưa đăng ký'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Car className="w-4 h-4 text-gray-400" />
                       <span className="text-xs font-bold text-gray-600">{driver.carModel}</span>
                    </div>
                    <div className="bg-green-50 text-green-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                      {driver.seats.filter(s => !s.passenger).length} Ghế trống
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-gray-900">Danh sách Đặt xe</h2>
            <input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-6 py-3 bg-white border-2 border-gray-50 rounded-2xl font-black text-xs uppercase outline-none focus:border-blue-500"
            />
          </div>

          <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50">
                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                    <th className="px-8 py-6">Khách hàng</th>
                    <th className="px-8 py-6">Điểm đón</th>
                    <th className="px-8 py-6">Thời gian</th>
                    <th className="px-8 py-6">Trạng thái</th>
                    <th className="px-8 py-6">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredBookings.length > 0 ? filteredBookings.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="font-black text-gray-900">{p.name}</div>
                        <div className="text-[10px] font-bold text-gray-400">{p.phone}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                          <MapPin className="w-4 h-4 text-red-500" />
                          {p.pickupLocation.name}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase inline-block">
                          {p.pickupTime}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          p.status === 'completed' ? 'bg-green-50 text-green-600' :
                          p.status === 'booked' ? 'bg-blue-50 text-blue-600' :
                          'bg-orange-50 text-orange-600'
                        }`}>
                          {p.status === 'completed' ? 'Hoàn thành' : p.status === 'booked' ? 'Đã nhận khách' : 'Đang chờ'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <button onClick={() => handleToggleStatus(p)} className="p-2 bg-gray-100 hover:bg-blue-600 hover:text-white rounded-xl transition-all">
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <History className="w-12 h-12 text-gray-200" />
                          <p className="text-sm font-bold text-gray-400">Không có đơn đặt xe nào trong ngày này</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-gray-900">Khách hàng hệ thống ({onlyPassengers.length})</h2>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Tìm khách hàng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-6 py-3 bg-white border-2 border-gray-50 rounded-2xl font-bold text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {onlyPassengers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.phone.includes(searchQuery)).map(user => (
              <div key={user.uid} className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 flex items-center gap-6">
                <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 font-black text-xl">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-gray-900">{user.name}</h3>
                  <p className="text-xs font-bold text-gray-400 mb-2">{user.phone}</p>
                  <div className="flex items-center gap-1 text-[10px] text-gray-300 font-black uppercase">
                    <Clock className="w-3 h-3" />
                    Tham gia: {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'timeslots' && (
        <div className="space-y-6">
          <div className="bg-white p-10 rounded-[4rem] shadow-sm border border-gray-100">
            <h2 className="text-2xl font-black text-gray-900 mb-8">Cấu hình Khung giờ Hoạt động</h2>
            <form onSubmit={handleAddTime} className="flex flex-col sm:flex-row gap-4 mb-12 max-w-2xl">
              <div className="relative flex-1">
                 <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                 <input 
                    type="time" 
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-2xl font-black text-lg outline-none border-2 border-transparent focus:border-blue-500 transition-all"
                    required
                  />
              </div>
              <button type="submit" className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Thêm khung giờ
              </button>
            </form>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {timeSlots.map(slot => (
                <div key={slot.id} className="bg-gray-50/50 p-8 rounded-[2.5rem] border-2 border-transparent hover:border-blue-200 flex flex-col items-center gap-4 relative group transition-all cursor-default">
                  <span className="text-3xl font-black text-gray-900 tracking-tighter">{slot.time}</span>
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <button 
                    onClick={() => deleteTimeSlot(slot.id)}
                    className="absolute -top-2 -right-2 p-3 bg-white text-red-500 rounded-2xl shadow-lg hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string | number, icon: any, color: string }> = ({ title, value, icon: Icon, color }) => {
  const colors: any = { 
    blue: 'bg-blue-50 text-blue-600', 
    green: 'bg-green-50 text-green-600', 
    orange: 'bg-orange-50 text-orange-600', 
    indigo: 'bg-indigo-50 text-indigo-600' 
  };
  return (
    <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all">
      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-6 ${colors[color]}`}>
        <Icon className="w-8 h-8" />
      </div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 leading-none">{title}</p>
      <p className="text-4xl font-black text-gray-900 tracking-tighter leading-none">{value}</p>
    </div>
  );
};

export default AdminDashboard;
