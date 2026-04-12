import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { getConversationApi, ApiGetUserByUserId } from '../ApiMessage'; 
import { openChatWindow } from '../../../redux/reducer/chatWindowReducer';

const MessengerPopup = ({ setIsDropdownOpen }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 1. Thêm state lưu từ khóa tìm kiếm
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const getConversations = async () => {
      if (!user.account.id) return;
      setLoading(true);
      try {
        let response = await getConversationApi();
        
        const enrichedConversations = await Promise.all(response.map(async (conv) => {
          const friendId = conv.members.find(m => m !== user.account.id);
          if (friendId) {
            const friendInfo = await ApiGetUserByUserId(friendId);
            return {
              ...conv,
              friendInfo: friendInfo, 
            };
          }
          return conv;
        }));

        setConversations(enrichedConversations);
      } catch (err) {
        console.error("Lỗi lấy danh sách chat:", err);
      } finally {
        setLoading(false);
      }
    };

    getConversations();
  }, [user.account.id]);

  const handleNavigate = (conversation) => {
    dispatch(openChatWindow(conversation));
    setIsDropdownOpen(false);
  };

  // 2. Logic lọc danh sách dựa trên tên hiển thị hoặc username
  const filteredConversations = conversations.filter((c) => {
    const friendName = c.friendInfo?.fullName || c.friendInfo?.username || "";
    return friendName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="w-[360px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 flex flex-col">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
        <h3 className="font-bold text-lg text-slate-800">{t('messenger.title')}</h3>
        <div className="flex gap-2">
           <span className="material-symbols-outlined text-slate-500 cursor-pointer hover:text-primary text-[20px]" onClick={() => navigate('/messenger')}>open_in_full</span>
        </div>
      </div>

      <div className="px-4 py-2 bg-slate-50">
        <div className="relative">
             <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-[18px]">search</span>
            <input 
                type="text" 
                placeholder={t('messenger.search_placeholder')} 
                // 3. Bind giá trị và sự kiện onChange
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-full pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
        </div>
      </div>

      <div className="overflow-y-auto max-h-[400px] min-h-[200px]">
        {loading ? (
            <div className="flex justify-center items-center h-32">
                 <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
         ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">
                {t('messenger.no_conversations')}
            </div>
        ) : filteredConversations.length === 0 ? (
            // Thêm trường hợp không tìm thấy kết quả khi search
            <div className="p-6 text-center text-slate-500 text-sm">
                {t('messenger.no_results')}
            </div>
        ) : (
            <div className="flex flex-col">
                {/* 4. Render danh sách đã lọc (filteredConversations) thay vì conversations gốc */}
                {filteredConversations.map((c) => (
                    <div 
                        key={c._id} 
                        onClick={() => handleNavigate(c)}
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                    >
                        <div className="relative w-12 h-12 flex-shrink-0">
                            {c.friendInfo?.avatar || c.friendInfo?.image ? (
                                <img 
                                    src={c.friendInfo?.avatar || c.friendInfo?.image} 
                                    alt="Avt" 
                                    className="w-full h-full rounded-full object-cover border border-slate-200"
                                />
                            ) : (
                                <div className="w-full h-full rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                    {c.friendInfo?.username?.charAt(0).toUpperCase() || "U"}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 text-sm truncate">
                                {/* Highlight từ khóa tìm kiếm (nếu muốn nâng cao), hiện tại hiển thị bình thường */}
                                {c.friendInfo?.fullName || c.friendInfo?.username || t('messenger.user')}
                            </h4>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                                {t('messenger.click_to_view')}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      <div 
        className="p-3 text-center border-t border-slate-100 text-primary font-semibold text-sm cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => {
            navigate('/messenger');
            setIsDropdownOpen(false);
        }}
      >
        {t('messenger.view_all')}
      </div>
    </div>
  );
};

export default MessengerPopup;