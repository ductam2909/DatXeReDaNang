
import React, { useState, useMemo, useEffect } from 'react';
import { Driver, Passenger, Location, UserProfile, TimeSlot, Direction } from '../types';
import { LOCATIONS } from '../constants';
import { MapPin, Search, Phone, History, Loader2, Navigation, LocateFixed, Car, Clock, ArrowRight, Map as MapIcon, Compass, UserCheck, PhoneCall, ShieldCheck } from 'lucide-react';
import MapView from './MapView';
import { cancelRide } from '../firebaseService';
import { geocodeLocation, reverseGeocode } from '../geminiService';

interface Props {
  drivers: Driver[];
  passengers: Passenger[];
  userProfile: UserProfile | null;
  onBook: (passenger: Passenger) => void;
  timeSlots: TimeSlot[];
}

const PassengerDashboard: React.FC<Props> = ({ drivers, passengers, userProfile, onBook, timeSlots }) => {
  const [name, setName] = useState(userProfile?.name || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [direction, setDirection] = useState<Direction>('QN-DN');
  const [pickup, setPickup] = useState<Location>(LOCATIONS.TAM_KY);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [notes, setNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const availableTimeSlots = useMemo(() => {
    return timeSlots.filter(slot => {
      return drivers.some(d => d.direction === direction && d.departureTime === slot.id);
    });
  }, [timeSlots, drivers, direction]);

  const myBookings = useMemo(() => passengers.filter(p => p.userId === userProfile?.uid), [passengers, userProfile]);
  const activeBooking = useMemo(() => myBookings.find(p => p.status === 'pending' || p.status === 'booked'), [myBookings]);

  // Lấy thông tin tài xế nếu đã được nhận
  const assignedDriver = useMemo(() => {
    if (activeBooking?.status === 'booked' && activeBooking.driverId) {
      return drivers.find(d => d.id === activeBooking.driverId);
    }
    return null;
  }, [activeBooking, drivers]);

  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    const result = await geocodeLocation(searchQuery);
    if (result) {
      setPickup(result);
    }
    setIsSearching(false);
  };

  const handleMapClick = async (loc: { lat: number, lng: number }) => {
    const addressName = await reverseGeocode(loc.lat, loc.lng);
    setPickup({ ...loc, name: addressName });
    setSearchQuery(addressName);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const addressName = await reverseGeocode(loc.lat, loc.lng);
      setPickup({ ...loc, name: addressName });
      setSearchQuery(addressName);
    }, (err) => {
      console.error("Geolocation error:", err);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !selectedSlotId) return;
    setIsBooking(true);
    const slot = timeSlots.find(s => s.id === selectedSlotId);
    const newPassenger: Passenger = {
      id: `p${Date.now()}`,
      userId: userProfile.uid,
      name,
      phone,
      pickupLocation: pickup,
      pickupTime: slot?.time || "00:00",
      timeSlotId: selectedSlotId,
      notes,
      status: 'pending',
      createdAt: Date.now(),
    };
    await onBook(newPassenger);
    setIsBooking(false);
  };

  if (activeBooking) {
    const isBooked = activeBooking.status === 'booked';
    
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-10 space-y-8 animate-in zoom-in-95 duration-500">
        <div className="bg-white p-8 md:p-12 rounded-[4rem] shadow-2xl border border-gray-100 text-center space-y-8 relative overflow-hidden">
           {/* Background Decoration */}
           <div className={`absolute top-0 left-0 w-full h-2 ${isBooked ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}></div>
           
           <div className="space-y-4">
             <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl ${isBooked ? 'bg-green-50 text-green-600 shadow-green-100' : 'bg-orange-50 text-orange-600 shadow-orange-100 animate-bounce'}`}>
               {isBooked ? <UserCheck className="w-12 h-12" /> : <Car className="w-12 h-12" />}
             </div>
             
             <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tighter">
                  {isBooked ? 'Đã tìm thấy tài xế!' : 'Đang tìm tài xế cho bạn...'}
                </h2>
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">
                  {isBooked ? 'Tài xế đang chuẩn bị đón bạn' : 'Yêu cầu của bạn đang được điều phối'}
                </p>
             </div>
           </div>

           {isBooked && assignedDriver ? (
             <div className="bg-gray-50 rounded-[3rem] p-8 border border-gray-100 text-left space-y-6 animate-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
                      <User className="w-7 h-7 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tài xế của bạn</p>
                      <h3 className="text-xl font-black text-gray-900">{assignedDriver.name}</h3>
                    </div>
                  </div>
                  <a href={`tel:${assignedDriver.phone}`} className="w-14 h-14 bg-green-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-100 hover:scale-110 active:scale-95 transition-all">
                    <PhoneCall className="w-6 h-6" />
                  </a>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phương tiện</p>
                    <p className="font-black text-gray-900 flex items-center gap-2">
                      <Car className="w-4 h-4 text-blue-500" /> {assignedDriver.carModel}
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Số điện thoại</p>
                    <p className="font-black text-gray-900 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-green-500" /> {assignedDriver.phone}
                    </p>
                  </div>
               </div>
               
               <div className="flex items-center gap-3 px-6 py-4 bg-blue-50/50 rounded-2xl text-blue-700 text-xs font-bold border border-blue-100">
                 <ShieldCheck className="w-5 h-5" />
                 Mã số chuyến đi an toàn: {activeBooking.id.slice(-6).toUpperCase()}
               </div>
             </div>
           ) : (
             <div className="p-8 bg-orange-50 rounded-[3rem] border border-orange-100 text-left space-y-4 max-w-md mx-auto">
               <div className="flex items-start gap-4">
                  <div className="bg-white p-2.5 rounded-xl shadow-sm">
                    <MapPin className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Điểm đón bạn đã chọn</p>
                    <p className="text-sm font-black text-orange-900 leading-tight mt-1">{activeBooking.pickupLocation.name}</p>
                  </div>
               </div>
               <div className="flex items-center gap-4 text-[10px] font-black text-orange-600 uppercase tracking-widest pt-2 border-t border-orange-100/50">
                  <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> {activeBooking.pickupTime}</div>
                  <div className="flex items-center gap-2"><History className="w-3.5 h-3.5" /> Đã gửi yêu cầu</div>
               </div>
             </div>
           )}

           <div className="pt-4">
             <button 
               onClick={() => {
                 if(window.confirm("Bạn có chắc chắn muốn hủy yêu cầu đặt xe này?")) {
                   cancelRide(activeBooking.id);
                 }
               }} 
               className="text-gray-300 hover:text-red-500 font-black uppercase text-[10px] tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto"
             >
               <X className="w-3.5 h-3.5" /> Hủy đặt xe này
             </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Đặt xe nhanh</h2>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Tuyến Quảng Nam - Đà Nẵng</p>
        </div>
        <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-gray-100 rounded-2xl font-black text-xs uppercase transition-all hover:bg-gray-50"><History className="w-4 h-4" /> Lịch sử</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tìm điểm đón của bạn</label>
              <form onSubmit={handleSearchLocation} className="relative group">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isSearching ? 'text-blue-500' : 'text-gray-400'}`} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nhập địa chỉ hoặc tên địa danh..."
                  className="w-full pl-12 pr-12 py-4 rounded-2xl bg-gray-50 font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all text-sm"
                />
                <button 
                  type="button"
                  onClick={handleGetCurrentLocation}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                  title="Vị trí hiện tại"
                >
                  <LocateFixed className="w-5 h-5" />
                </button>
              </form>
              <p className="text-[10px] text-blue-600 font-bold italic px-2">Hoặc chạm trực tiếp trên bản đồ để chọn vị trí</p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chọn hướng di chuyển</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setDirection('QN-DN')}
                    className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all flex items-center justify-center gap-2 ${direction === 'QN-DN' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-50 border-transparent text-gray-400 hover:border-blue-200'}`}
                  >
                    <Compass className="w-4 h-4" /> QN ➔ ĐÀ NẴNG
                  </button>
                  <button 
                    onClick={() => setDirection('DN-QN')}
                    className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all flex items-center justify-center gap-2 ${direction === 'DN-QN' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-50 border-transparent text-gray-400 hover:border-blue-200'}`}
                  >
                    <Compass className="w-4 h-4" /> ĐÀ NẴNG ➔ QN
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Khung giờ hiện có ({availableTimeSlots.length})</label>
                <div className="grid grid-cols-3 gap-2">
                  {availableTimeSlots.length > 0 ? availableTimeSlots.map(slot => (
                    <button 
                      key={slot.id}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`py-3 rounded-xl font-black text-xs border-2 transition-all ${selectedSlotId === slot.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-gray-50 border-transparent text-gray-600 hover:border-indigo-200'}`}
                    >
                      {slot.time}
                    </button>
                  )) : (
                    <div className="col-span-3 py-6 text-center text-[10px] font-black text-gray-400 bg-gray-50 rounded-2xl italic flex flex-col items-center gap-2">
                      <Clock className="w-4 h-4 opacity-50" />
                      Hiện chưa có tài xế chạy hướng này
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-gray-50">
                <div className="grid grid-cols-1 gap-4">
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên của bạn" className="w-full pl-11 pr-5 py-4 rounded-2xl bg-gray-50 font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all" />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Số điện thoại" className="w-full pl-11 pr-5 py-4 rounded-2xl bg-gray-50 font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all" />
                  </div>
                </div>
                <button type="submit" disabled={isBooking || !selectedSlotId} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-200 transition-all transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale">
                  {isBooking ? <Loader2 className="animate-spin" /> : (
                    <>
                      XÁC NHẬN ĐẶT XE
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
          
          <div className="bg-indigo-900 p-6 rounded-[2rem] text-white shadow-xl flex items-start gap-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <MapIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Vị trí đón đã chọn</p>
              <p className="text-sm font-black leading-tight">{pickup.name}</p>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-7">
          <div className="bg-white p-4 rounded-[3rem] shadow-2xl h-[700px] border border-gray-100 relative group overflow-hidden">
            <MapView 
              center={pickup} 
              drivers={drivers} 
              passengers={[]} 
              className="w-full h-full rounded-[2.5rem]" 
              onMapClick={handleMapClick}
              selectedPickup={pickup}
            />
            <div className="absolute top-10 left-10 z-[1000]">
              <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-xl flex items-center gap-3 text-xs font-black text-gray-700 border border-white">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                CHẠM BẢN ĐỒ ĐỂ ĐỔI VỊ TRÍ
              </div>
            </div>
          </div>
        </div>
      </div>

      {showHistory && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000] flex items-end justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-gray-900">Lịch sử đặt xe</h3>
              <button onClick={() => setShowHistory(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {myBookings.length > 0 ? myBookings.map(b => (
                <div key={b.id} className="p-6 bg-gray-50 rounded-[2rem] flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${b.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900">{b.pickupLocation.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{b.pickupTime} • {new Date(b.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    b.status === 'completed' ? 'bg-green-50 text-green-600' :
                    b.status === 'booked' ? 'bg-blue-50 text-blue-600' :
                    'bg-orange-50 text-orange-600'
                  }`}>
                    {b.status === 'completed' ? 'Xong' : b.status === 'booked' ? 'Đã nhận' : 'Đang chờ'}
                  </span>
                </div>
              )) : (
                <div className="text-center py-20 text-gray-400 font-bold">Bạn chưa có chuyến xe nào</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const X = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

const User = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

export default PassengerDashboard;
