
import React, { useState, useEffect } from 'react';
import { Role, Driver, Passenger, UserProfile, TimeSlot } from './types';
import { MOCK_DRIVERS, LOCATIONS } from './constants';
import DriverDashboard from './components/DriverDashboard';
import PassengerDashboard from './components/PassengerDashboard';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import { Users, Car, Navigation, LogOut, Loader2, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { 
  auth, 
  listenToDrivers, 
  listenToPassengers, 
  listenToUsers,
  listenToTimeSlots,
  bookRide, 
  updateDriverState, 
  getUserProfile, 
  saveUserProfile,
  logout 
} from './firebaseService';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isSynced, setIsSynced] = useState(false);
  const [adminView, setAdminView] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        let profile = await getUserProfile(firebaseUser.uid);
        const isAdminAccount = firebaseUser.email === 'admin@rideshare.pro';

        if (!profile) {
          profile = {
            uid: firebaseUser.uid,
            name: isAdminAccount ? 'Tổng quản trị' : (firebaseUser.displayName || 'Khách hàng'),
            phone: isAdminAccount ? 'admin' : '',
            email: firebaseUser.email || undefined,
            photoURL: firebaseUser.photoURL || undefined,
            role: isAdminAccount ? 'admin' : undefined,
            createdAt: Date.now()
          };
          await saveUserProfile(profile);
        } else if (isAdminAccount && profile.role !== 'admin') {
          profile.role = 'admin';
          await saveUserProfile(profile);
        }

        setUserProfile(profile);
        if (profile.role) {
          setRole(profile.role);
          if (profile.role === 'admin') setAdminView(true);
        }
      } else {
        setUserProfile(null);
        setRole(null);
        setAdminView(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubDrivers = listenToDrivers((data) => {
      setDrivers(data);
      setIsSynced(true);
    });
    const unsubPassengers = listenToPassengers((data) => {
      setPassengers(data);
    });
    const unsubSlots = listenToTimeSlots((data) => {
      setTimeSlots(data);
    });

    let unsubUsers = () => {};
    if (userProfile?.role === 'admin') {
      unsubUsers = listenToUsers((data) => {
        setAllUsers(data);
      });
    }

    return () => {
      unsubDrivers();
      unsubPassengers();
      unsubSlots();
      unsubUsers();
    };
  }, [user, userProfile?.role]);

  const handleRoleSelection = async (selectedRole: Role) => {
    if (!userProfile) return;
    
    setRole(selectedRole);
    const updatedProfile: UserProfile = { ...userProfile, role: selectedRole };
    setUserProfile(updatedProfile);
    await saveUserProfile(updatedProfile);

    // Nếu chọn làm tài xế, khởi tạo hồ sơ tài xế nếu chưa có
    if (selectedRole === 'driver') {
      const existingDriver = drivers.find(d => d.id === userProfile.uid);
      if (!existingDriver) {
        const newDriver: Driver = {
          id: userProfile.uid,
          name: userProfile.name,
          phone: userProfile.phone || "",
          carModel: "Chưa cập nhật",
          totalSeats: 4,
          direction: "QN-DN",
          currentLocation: LOCATIONS.TAM_KY,
          seats: Array(4).fill(null).map((_, i) => ({ id: i + 1 }))
        };
        await updateDriverState(newDriver);
      }
    }
    
    if (selectedRole === 'admin') setAdminView(true);
  };

  const handleBooking = async (passenger: Passenger) => {
    await bookRide(passenger);
  };

  const handleUpdateDriverSeats = async (driverId: string, updatedSeats: any[]) => {
    const driver = drivers.find(d => d.id === driverId);
    if (driver) {
      await updateDriverState({ ...driver, seats: updatedSeats });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-600">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white font-black text-xs uppercase tracking-widest">Đang khởi động hệ thống...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onSuccess={() => {}} />;
  }

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800 p-6 relative overflow-hidden">
        <div className="bg-white rounded-[3rem] shadow-2xl p-10 max-w-lg w-full text-center relative z-10">
          <h2 className="text-sm font-black text-blue-600 uppercase mb-2 tracking-widest">Xin chào, {userProfile?.name}</h2>
          <h1 className="text-3xl font-black text-gray-900 mb-8 tracking-tighter">Bạn tham gia với tư cách nào?</h1>
          <div className="grid gap-4">
            <RoleButton title="Tài xế" desc="Vận hành xe & đón khách" icon={Car} color="blue" onClick={() => handleRoleSelection('driver')} />
            <RoleButton title="Hành khách" desc="Đặt xe & theo dõi lộ trình" icon={Users} color="green" onClick={() => handleRoleSelection('passenger')} />
            <RoleButton title="Quản trị viên" desc="Báo cáo & quản lý hệ thống" icon={ShieldCheck} color="indigo" onClick={() => handleRoleSelection('admin')} />
          </div>
          <button onClick={() => logout()} className="mt-8 text-gray-400 hover:text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 mx-auto transition-all">
             <LogOut className="w-3 h-3" /> Đăng xuất khỏi hệ thống
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 font-extrabold text-2xl text-blue-600 tracking-tighter">
          <div className="bg-blue-600 p-1.5 rounded-lg text-white">
            <Navigation className="w-5 h-5" />
          </div>
          <span className="hidden sm:inline">RideShare<span className="text-gray-900 font-light">Pro</span></span>
        </div>
        
        <div className="flex items-center gap-2">
          {role === 'admin' && (
            <button 
              onClick={() => setAdminView(!adminView)}
              className={`flex items-center gap-2 px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${
                adminView ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <LayoutDashboard className="w-3 h-3" />
              {adminView ? 'Thoát Quản trị' : 'Dashboard Quản trị'}
            </button>
          )}

          <div className="flex items-center gap-4 ml-4">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-gray-100">
              <div className={`w-2 h-2 rounded-full ${isSynced ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-[10px] font-black text-gray-600 uppercase">
                {role === 'driver' ? 'Tài xế' : role === 'admin' ? 'Quản trị viên' : 'Hành khách'}
              </span>
            </div>
            <button onClick={() => logout()} className="p-2.5 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden">
        {adminView ? (
          <AdminDashboard drivers={drivers} passengers={passengers} users={allUsers} timeSlots={timeSlots} />
        ) : role === 'driver' ? (
          <DriverDashboard drivers={drivers} passengers={passengers} currentDriverId={user?.uid || ""} onUpdateSeats={handleUpdateDriverSeats} timeSlots={timeSlots} isSynced={isSynced} />
        ) : (
          <PassengerDashboard drivers={drivers} passengers={passengers} userProfile={userProfile} onBook={handleBooking} timeSlots={timeSlots} />
        )}
      </main>
    </div>
  );
};

const RoleButton: React.FC<{ title: string, desc: string, icon: any, color: string, onClick: () => void }> = ({ title, desc, icon: Icon, color, onClick }) => {
  const colors: any = {
    blue: 'border-blue-50 hover:border-blue-500 hover:bg-blue-50 text-blue-600',
    green: 'border-green-50 hover:border-green-500 hover:bg-green-50 text-green-600',
    indigo: 'border-indigo-50 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-600'
  };

  return (
    <button onClick={onClick} className={`group flex items-center justify-between p-6 border-2 rounded-[2.5rem] transition-all transform active:scale-95 ${colors[color]}`}>
      <div className="text-left">
        <span className="block font-black text-xl text-gray-900 leading-none">{title}</span>
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{desc}</span>
      </div>
      <Icon className="w-8 h-8" />
    </button>
  );
};

export default App;
