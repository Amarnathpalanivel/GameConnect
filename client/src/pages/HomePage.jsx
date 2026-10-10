import React, { useContext } from 'react'
import ChatContainer from '../components/ChatContainer'
import RightSidebar from '../components/RightSidebar'
import Sidebar from '../components/Sidebar'
import VoiceControlsBar from '../components/VoiceControlsBar'
import { ChatContext } from '../../context/ChatContext'

const HomePage = () => {
  const { selectedUser, selectedParty } = useContext(ChatContext);
  const hasSelection = selectedUser || selectedParty;

  return (
    <div className="w-full h-full p-2 sm:p-4 md:p-6 overflow-hidden flex flex-col relative">
      <div className={`
        glass-card shadow-2xl shadow-sky-950/90 rounded-2xl overflow-hidden
        w-full h-full min-h-0
        grid grid-cols-1 grid-rows-1 relative
        ${hasSelection
          ? 'md:grid-cols-[280px_1fr_260px] xl:grid-cols-[300px_1fr_280px]'
          : 'md:grid-cols-[300px_1fr]'
        }
        transition-all duration-300
      `}>
        <Sidebar />
        <ChatContainer />
        {hasSelection && <RightSidebar />}
      </div>
      <VoiceControlsBar />
    </div>
  );
};

export default HomePage;