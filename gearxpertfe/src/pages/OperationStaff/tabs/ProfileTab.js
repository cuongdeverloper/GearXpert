import React from 'react';
import { History, LogOut, User } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { doLogout } from '../../../redux/action/userAction';
import { persistor } from '../../../redux/store';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';

export default function ProfileTab({ setActiveMenu }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const socketConnection = useSelector((state) => state.user.account.socketConnection);

  const handleLogout = async () => {
    try {
      if (socketConnection) {
        socketConnection.disconnect();
      }
      dispatch(doLogout());
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      await persistor.purge();
      toast.success('Đăng xuất thành công');
      navigate('/signin');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Có lỗi xảy ra khi đăng xuất');
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 flex items-start justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center mb-6">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-md">
            <User size={40} className="text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Vy Vận Hành</h2>
          <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 mt-2 bg-emerald-50 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> Đang làm việc
          </div>
          <div className="mt-6 w-full grid grid-cols-2 gap-4 text-center">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-xl font-bold text-slate-900">12</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Nhiệm vụ xong</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-xl font-bold text-slate-900">4.9</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Điểm đánh giá</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div
            onClick={() => setActiveMenu('history')}
            className="p-5 border-b border-slate-100 flex items-center gap-4 text-slate-700 hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-colors"
          >
            <div className="p-2 bg-slate-100 rounded-lg">
              <History size={20} className="text-slate-600" />
            </div>
            <span className="font-bold flex-1">Lịch sử hoạt động</span>
          </div>
          <div onClick={handleLogout} className="p-5 flex items-center gap-4 text-red-600 hover:bg-red-50 active:bg-red-100 cursor-pointer transition-colors">
            <div className="p-2 bg-red-100 rounded-lg">
              <LogOut size={20} className="text-red-600" />
            </div>
            <span className="font-bold flex-1">Đăng xuất</span>
          </div>
        </div>
      </div>
    </div>
  );
}
