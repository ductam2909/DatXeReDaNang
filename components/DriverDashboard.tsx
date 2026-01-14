
import React, { useState, useMemo } from 'react';
import { Driver, Passenger, Seat, Location, TimeSlot } from '../types';
import { getOptimizedRoute, OptimizedItinerary } from '../geminiService';
import { 
  Car, User, MapPin, Sparkles, ChevronRight, Users, CheckCircle2, 
  Navigation, Loader2, ListOrdered, Zap, Clock, AlertTriangle, 
  UserPlus, UserCheck, ArrowRight, Trash2, Map as MapIcon, Flag,
  Wallet, TrendingUp, Calendar, ChevronLeft, LayoutDashboard, History, Phone,
  MessageSquare
} from 'lucide-react';
import MapView from './MapView';
import { updatePassengerStatus, updateDriverState } from '../firebaseService';

interface Props {
  drivers: Driver[];
  passengers: Passenger[];
  currentDriverId: string;
  onUpdateSeats: (driverId: string, seats: Seat[]) => void;
  timeSlots: TimeSlot[];
  isSynced: boolean;
}

type DriverTab = 'dispatch' | 'stats';

const DriverDashboard: React.FC<Props> = ({ drivers, passengers, currentDriverId, onUpdateSeats, timeSlots, isSynced }) => {
  const [activeTab, setActiveTab] = useState<DriverTab>('dispatch');
  const currentDriver = drivers.find(d => d.id === currentDriverId);
  
  // Lọc danh sách khách hàng
  const pendingPassengers = useMemo(() => 
    passengers.filter(p => p.status === 'pending')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  , [passengers]);

  const myBookedPassengers = useMemo(() => 
    passengers.filter(p => p.status === 'booked' && p.driverId === currentDriverId)
  , [passengers, currentDriverId]);
  
  // Khách đã hoàn thành
  const myCompletedPassengers = useMemo(() => 
    passengers.filter(p => p.status === 'completed' && p.driverId === currentDriverId)
    .sort((a, b) => {
      const timeA = Number(a.completedAt || a.createdAt || 0);
      const timeB = Number(b.completedAt || b.createdAt || 0);
      return timeB - timeA;
    })
  , [passengers, currentDriverId]);

  const availableSeatsCount = currentDriver?.seats.filter(s => !s.passenger).length || 0;
  
  const [itinerary, setItinerary] = useState<OptimizedItinerary | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Thống kê thu nhập
  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfToday - (7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const getTimestamp = (p: Passenger) => {
      const t = Number(p.completedAt || p.createdAt || 0);
      return isNaN(t) || t === 0 ? null : t;
    };

    const daily = myCompletedPassengers.filter(p => {
      const t = getTimestamp(p);
      return t ? t >= startOfToday : false;
    });
    
    const weekly = myCompletedPassengers.filter(p => {
      const t = getTimestamp(p);
      return t ? t >= startOfWeek : false;
    });
    
    const monthly = myCompletedPassengers.filter(p => {
      const t = getTimestamp(p);
      return t ? t >= startOfMonth : false;
    });

    const PRICE_PER_SEAT = 150000;

    return {
      today: { count: daily.length, revenue: daily.length * PRICE_PER_SEAT },
      week: { count: weekly.length, revenue: weekly.length * PRICE_PER_SEAT },
      month: { count: monthly.length, revenue: monthly.length * PRICE_PER_SEAT },
      total: { count: myCompletedPassengers.length, revenue: myCompletedPassengers.length * PRICE_PER_SEAT }
    };
  }, [myCompletedPassengers]);
  
  const activeRoute = useMemo(() => {
    if (!currentDriver) return [];
    const route: [number, number][] = [[currentDriver.currentLocation.lat, currentDriver.currentLocation.lng]];
    if (itinerary) {
      const sortedSteps = [...itinerary.steps].sort((a, b) => a.sequence - b.sequence);
      sortedSteps.forEach(step => {
        const p = passengers.find(pass => pass.id === step.passengerId);
        if (p) route.push([p.pickupLocation.lat, p.pickupLocation.lng]);
      });
    } else {
      myBookedPassengers.forEach(p => {
        route.push([p.pickupLocation.lat, p.pickupLocation.lng]);
      });
    }
    return route;
  }, [itinerary, currentDriver, myBookedPassengers, passengers]);

  if (!isSynced) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 text-center animate-pulse">
        <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center mb-6">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
        <h3 className="text-xl font-black text-gray-900 mb-2">Đang đồng bộ dữ liệu...</h3>
        <p className="text-gray-400 font-bold text-sm">Vui lòng chờ trong giây lát</p>
      </div>
    );
  }

  if (!currentDriver) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h3 className="text-xl font-black text-gray-900 mb-2">Không tìm thấy hồ sơ tài xế</h3>
        <p className="text-gray-400 font-bold text-sm mb-6 max-w-md mx-auto">Tài khoản của bạn chưa được cấp quyền tài xế hoặc đang gặp lỗi đồng bộ.</p>
        <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100">Tải lại trang</button>
      </div>
    );
  }

  const handleUpdateSchedule = async (slotId: string) => {
    await updateDriverState({ ...currentDriver, departureTime: slotId });
  };

  const handleUpdateDirection = async (dir: 'QN-DN' | 'DN-QN') => {
    await updateDriverState({ ...currentDriver, direction: dir });
  };

  const handleAcceptPassenger = async (passengerId: string) => {
    if (availableSeatsCount === 0) {
      alert("Xe đã hết chỗ trống!");
      return;
    }
    await updatePassengerStatus(passengerId, 'booked', currentDriverId);
    const newSeats = [...currentDriver.seats];
    const emptySeatIndex = newSeats.findIndex(s => !s.passenger);
    if (emptySeatIndex !== -1) {
      const p = passengers.find(pass => pass.id === passengerId);
      newSeats[emptySeatIndex] = { ...newSeats[emptySeatIndex], passenger: p };
      await updateDriverState({ ...currentDriver, seats: newSeats });
    }
  };

  const handleCompleteTrip = async (passengerId: string) => {
    await updatePassengerStatus(passengerId, 'completed', currentDriverId);
    const newSeats = currentDriver.seats.map(s => 
      s.passenger?.id === passengerId ? { id: s.id } : s
    );
    await updateDriverState({ ...currentDriver, seats: newSeats });
  };

  const handleAIAnalysis = async () => {
    if (pendingPassengers.length === 0 || availableSeatsCount === 0) {
      alert("Không có khách chờ hoặc xe đã đầy chỗ!");
      return;
    }
    setIsOptimizing(true);
    const result = await getOptimizedRoute(currentDriver, pendingPassengers);
    if (result) setItinerary(result);
    setIsOptimizing(false);
  };

  const applyAISuggestion = async () => {
    if (!itinerary) return;
    setIsOptimizing(true);
    for (const step of itinerary.steps) {
      if (step.action === 'pickup') {
        await handleAcceptPassenger(step.passengerId);
      }
    }
    setItinerary(null);
    setIsOptimizing(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Navigation Switcher */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-fit mx-auto lg:mx-0">
        <button 
          onClick={() => setActiveTab('dispatch')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'dispatch' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          <LayoutDashboard className="w-4 h-4" /> Điều hành
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'stats' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          <Wallet className="w-4 h-4" /> Thu nhập
        </button>
      </div>

      {activeTab === 'dispatch' ? (
        <>
          <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
                <Car className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tighter">Chào {currentDriver.name}!</h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{currentDriver.carModel} • {currentDriver.phone}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-1">Lộ trình chạy</span>
                <select 
                  value={currentDriver.direction} 
                  onChange={(e) => handleUpdateDirection(e.target.value as any)}
                  className="px-6 py-3 bg-gray-50 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-transparent focus:border-blue-500 outline-none transition-all"
                >
                  <option value="QN-DN">Quảng Nam ➔ Đà Nẵng</option>
                  <option value="DN-QN">Đà Nẵng ➔ Quảng Nam</option>
                </select>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-1">Giờ xuất phát</span>
                <select 
                  value={currentDriver.departureTime || ''} 
                  onChange={(e) => handleUpdateSchedule(e.target.value)}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 outline-none transition-all"
                >
                  <option value="">Chưa chọn giờ</option>
                  {timeSlots.map(slot => (
                    <option key={slot.id} value={slot.id}>{slot.time}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Ghế trống" value={availableSeatsCount} icon={Users} color="blue" />
            <StatCard title="Khách đang chờ" value={pendingPassengers.length} icon={Clock} color="orange" />
            <StatCard title="Khách đã nhận" value={myBookedPassengers.length} icon={UserCheck} color="green" />
            <div className="lg:col-span-1 bg-slate-900 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">AI Dispatch</span>
                  </div>
                  <p className="text-white font-black text-sm">Tự động chọn khách gần nhất</p>
                </div>
                <button 
                  onClick={handleAIAnalysis} 
                  disabled={isOptimizing || pendingPassengers.length === 0}
                  className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                  {isOptimizing ? <Loader2 className="animate-spin w-4 h-4" /> : <Zap className="w-4 h-4" />}
                  PHÂN TÍCH LỘ TRÌNH
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-8">
              {/* Khối AI Itinerary */}
              {itinerary && (
                <div className="bg-indigo-50 border-2 border-indigo-200 p-8 rounded-[3rem] space-y-6 animate-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-indigo-900 text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5" /> Đề xuất đón khách
                    </h3>
                    <span className="text-[10px] font-black bg-indigo-200 text-indigo-700 px-3 py-1 rounded-full">{itinerary.totalDistanceKm} km</span>
                  </div>
                  <div className="space-y-3">
                    {itinerary.steps.map((step) => (
                      <div key={step.passengerId} className="flex items-start gap-4 bg-white/60 p-4 rounded-2xl">
                        <div className="w-6 h-6 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-xs font-black">{step.sequence}</div>
                        <div>
                          <p className="text-sm font-black text-gray-900">{step.passengerName}</p>
                          <p className="text-[10px] font-bold text-gray-500 leading-tight">{step.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={applyAISuggestion} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100">CHẤP NHẬN</button>
                    <button onClick={() => setItinerary(null)} className="px-6 bg-white text-gray-400 border border-indigo-100 rounded-2xl font-black text-[10px] uppercase tracking-widest">HỦY</button>
                  </div>
                </div>
              )}

              {/* Danh sách Khách đang chờ (BỔ SUNG MỚI) */}
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-gray-900 text-lg flex items-center gap-3">
                    <Clock className="w-6 h-6 text-orange-500" /> Khách đang chờ
                  </h3>
                  <span className="text-[10px] font-black bg-orange-50 text-orange-600 px-3 py-1 rounded-full">{pendingPassengers.length}</span>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {pendingPassengers.map(p => (
                    <div key={p.id} className="p-5 bg-gray-50/50 rounded-[2rem] border border-transparent hover:border-orange-100 hover:bg-white transition-all group">
                       <div className="flex items-center justify-between mb-3">
                         <div>
                            <div className="font-black text-gray-900">{p.name}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase">{p.pickupTime}</div>
                         </div>
                         <button 
                           onClick={() => handleAcceptPassenger(p.id)}
                           className="bg-orange-600 text-white p-2.5 rounded-xl shadow-lg shadow-orange-100 hover:scale-110 transition-transform active:scale-95"
                           title="Nhận khách này"
                         >
                           <UserPlus className="w-4 h-4" />
                         </button>
                       </div>
                       <div className="flex items-start gap-2 text-xs font-bold text-gray-500 mb-2">
                         <MapPin className="w-3.5 h-3.5 mt-0.5 text-blue-500 shrink-0" /> 
                         <span className="line-clamp-2">{p.pickupLocation.name}</span>
                       </div>
                       {p.notes && (
                         <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 bg-white/50 p-2 rounded-lg">
                           <MessageSquare className="w-3 h-3" /> {p.notes}
                         </div>
                       )}
                    </div>
                  ))}
                  {pendingPassengers.length === 0 && (
                    <div className="py-10 text-center flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">Hiện không có khách chờ</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Danh sách Khách đã nhận */}
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 space-y-6">
                <h3 className="font-black text-gray-900 text-lg flex items-center gap-3">
                  <UserCheck className="w-6 h-6 text-green-500" /> Khách đã nhận
                </h3>
                <div className="space-y-4">
                  {myBookedPassengers.map(p => (
                    <div key={p.id} className="p-5 bg-gray-50 rounded-[2rem] border border-transparent hover:border-green-100 transition-all">
                       <div className="flex items-center justify-between mb-3">
                         <div className="font-black text-gray-900">{p.name}</div>
                         <div className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1 rounded-full uppercase">Đã nhận</div>
                       </div>
                       <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-4"><MapPin className="w-3.5 h-3.5" /> {p.pickupLocation.name}</div>
                       <div className="flex gap-2">
                         <a href={`tel:${p.phone}`} className="flex-1 bg-white border border-gray-100 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black text-gray-700 hover:bg-gray-100 transition-all"><Phone className="w-3 h-3" /> GỌI ĐIỆN</a>
                         <button onClick={() => handleCompleteTrip(p.id)} className="flex-1 bg-green-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black hover:bg-green-700 transition-all"><Flag className="w-3 h-3" /> HOÀN TẤT</button>
                       </div>
                    </div>
                  ))}
                  {myBookedPassengers.length === 0 && <div className="py-10 text-center text-gray-400 text-xs italic font-bold">Chưa có khách nào được nhận</div>}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="bg-white p-4 rounded-[4rem] shadow-sm border border-gray-100 h-[800px] relative overflow-hidden">
                <MapView center={currentDriver.currentLocation} drivers={drivers} passengers={passengers} currentDriverId={currentDriverId} activeRoute={activeRoute} className="w-full h-full rounded-[3.5rem]" />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Thống kê Thu nhập</h2>
              <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Dựa trên lịch sử chuyến đi đã hoàn thành</p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center gap-4 shadow-sm">
               <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center"><Wallet className="w-6 h-6" /></div>
               <div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tổng thu nhập</p>
                 <p className="text-xl font-black text-gray-900">{stats.total.revenue.toLocaleString()}đ</p>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsRevenueCard title="Hôm nay" revenue={stats.today.revenue} count={stats.today.count} icon={Calendar} color="blue" />
            <StatsRevenueCard title="7 ngày qua" revenue={stats.week.revenue} count={stats.week.count} icon={TrendingUp} color="indigo" />
            <StatsRevenueCard title="Tháng này" revenue={stats.month.revenue} count={stats.month.count} icon={Clock} color="green" />
          </div>

          <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                <h3 className="font-black text-gray-900 flex items-center gap-3">
                  <History className="w-6 h-6 text-blue-500" /> Lịch sử hành khách
                </h3>
                <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-4 py-2 rounded-full uppercase tracking-widest">Tất cả: {myCompletedPassengers.length}</span>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-gray-50/50">
                   <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                     <th className="px-10 py-6">Khách hàng</th>
                     <th className="px-10 py-6">Ngày đi</th>
                     <th className="px-10 py-6">Lộ trình đón</th>
                     <th className="px-10 py-6">Doanh thu</th>
                     <th className="px-10 py-6 text-right">Trạng thái</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                   {myCompletedPassengers.length > 0 ? myCompletedPassengers.map(p => {
                     const rawTimestamp = p.completedAt || p.createdAt || Date.now();
                     const dateObj = new Date(Number(rawTimestamp));
                     const isValid = !isNaN(dateObj.getTime());

                     return (
                       <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                         <td className="px-10 py-6">
                           <div className="font-black text-gray-900">{p.name}</div>
                           <div className="text-[10px] font-bold text-gray-400">{p.phone}</div>
                         </td>
                         <td className="px-10 py-6">
                           {isValid ? (
                             <>
                               <div className="text-xs font-black text-gray-600">{dateObj.toLocaleDateString('vi-VN')}</div>
                               <div className="text-[10px] font-bold text-gray-400">{dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                             </>
                           ) : (
                             <div className="text-xs font-black text-gray-400 italic">Chưa rõ ngày</div>
                           )}
                         </td>
                         <td className="px-10 py-6">
                           <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                             <MapPin className="w-3.5 h-3.5 text-blue-500" /> {p.pickupLocation?.name || 'Vị trí cũ'}
                           </div>
                         </td>
                         <td className="px-10 py-6 font-black text-gray-900">150.000đ</td>
                         <td className="px-10 py-6 text-right">
                           <span className="bg-green-50 text-green-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">Hoàn thành</span>
                         </td>
                       </tr>
                     );
                   }) : (
                     <tr>
                       <td colSpan={5} className="py-20 text-center">
                         <div className="flex flex-col items-center gap-4">
                           <History className="w-12 h-12 text-gray-100" />
                           <p className="text-sm font-bold text-gray-400">Bạn chưa có chuyến đi nào được ghi nhận</p>
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
    </div>
  );
};

const StatsRevenueCard: React.FC<{ title: string, revenue: number, count: number, icon: any, color: string }> = ({ title, revenue, count, icon: Icon, color }) => {
  const colors: any = { 
    blue: 'bg-blue-50 text-blue-600', 
    green: 'bg-green-50 text-green-600', 
    indigo: 'bg-indigo-50 text-indigo-600' 
  };
  return (
    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${colors[color]}`}>
        <Icon className="w-7 h-7" />
      </div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 leading-none">{title}</p>
      <div className="space-y-1">
        <p className="text-3xl font-black text-gray-900 tracking-tighter leading-none">{revenue.toLocaleString()}đ</p>
        <p className="text-xs font-bold text-green-600">+{count} lượt khách</p>
      </div>
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
    <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 hover:shadow-lg transition-all">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">{title}</p>
      <p className="text-3xl font-black text-gray-900 tracking-tighter leading-none">{value}</p>
    </div>
  );
};

export default DriverDashboard;
