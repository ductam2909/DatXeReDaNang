
import React, { useState } from 'react';
import { loginWithGoogle, registerWithPhone, loginWithPhone } from '../firebaseService';
import { Navigation, Phone, Lock, User, LogIn, Chrome, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface LoginProps {
  onSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      onSuccess();
    } catch (err: any) {
      setError("Không thể đăng nhập bằng Google. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isRegister) {
        if (phone !== 'admin' && phone.length < 10) throw new Error("Số điện thoại không hợp lệ (ít nhất 10 số)");
        if (password.length < 6) throw new Error("Mật khẩu phải ít nhất 6 ký tự");
        
        try {
          await registerWithPhone(phone, password, name || "Người dùng");
        } catch (regErr: any) {
          if (regErr.code === 'auth/email-already-in-use') {
            console.warn("Account exists, switching to login flow...");
            await loginWithPhone(phone, password);
          } else {
            throw regErr;
          }
        }
      } else {
        await loginWithPhone(phone, password);
      }
      onSuccess();
    } catch (err: any) {
      console.error("Auth error:", err.code, err.message);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError("Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại số điện thoại và mật khẩu.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("Tài khoản này đã tồn tại. Hãy thử Đăng nhập.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Tài khoản bị tạm khóa do nhập sai quá nhiều lần. Vui lòng thử lại sau.");
      } else {
        setError(err.message || "Đã có lỗi xảy ra. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-900 p-6 relative overflow-hidden">
      {/* Hiệu ứng nền */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-white opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-400 opacity-10 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl"></div>

      <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 md:p-12 max-w-lg w-full relative z-10 border border-white/20">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200 rotate-3">
            <Navigation className="w-10 h-10 text-white -rotate-3" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter">RideShare Pro</h1>
          <p className="text-gray-500 font-bold mt-2">Dành cho tuyến Quảng Nam - Đà Nẵng</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        <form onSubmit={handleManualAuth} className="space-y-4">
          {isRegister && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                required 
                type="text" 
                placeholder="Họ và tên" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-bold text-gray-800 transition-all"
              />
            </div>
          )}

          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              required 
              type="text" 
              placeholder="Số điện thoại hoặc admin" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-bold text-gray-800 transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              required 
              type="password" 
              placeholder="Mật khẩu" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-bold text-gray-800 transition-all"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (isRegister ? 'TIẾP TỤC' : 'ĐĂNG NHẬP')}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>

        <div className="my-8 flex items-center gap-4">
          <div className="h-[1px] flex-1 bg-gray-100"></div>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hoặc</span>
          <div className="h-[1px] flex-1 bg-gray-100"></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white border-2 border-gray-100 hover:border-blue-500 text-gray-700 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95 shadow-sm"
        >
          <Chrome className="w-6 h-6 text-blue-600" />
          Đăng nhập Google
        </button>

        <p className="text-center mt-8 text-sm text-gray-500 font-bold">
          {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
          <button 
            onClick={() => setIsRegister(!isRegister)} 
            className="ml-2 text-blue-600 hover:underline"
          >
            {isRegister ? 'Đăng nhập' : 'Đăng ký ngay'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
