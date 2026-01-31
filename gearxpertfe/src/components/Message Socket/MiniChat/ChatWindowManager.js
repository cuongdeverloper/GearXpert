import { useSelector } from 'react-redux';
import MiniChatWindow from './MiniChatWindow';

const ChatWindowManager = () => {
    const activeChats = useSelector(state => state.chatWindow.activeChats);


    if (!activeChats || activeChats.length === 0) return null;

    return (
        <div className="fixed bottom-0 right-16 z-[9999] flex flex-row-reverse items-end gap-4 px-4 pointer-events-none">
            {activeChats.map((chat, index) => (
                <MiniChatWindow 
                    key={chat._id || chat.id || index} 
                    conversation={chat} 
                    index={index}
                />
            ))}
        </div>
    );
};

export default ChatWindowManager;