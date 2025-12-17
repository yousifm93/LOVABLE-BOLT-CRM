import { useState } from 'react';

const ChatbaseBoltBot = () => {
  const [iframeKey] = useState(() => Date.now());
  const chatbaseUrl = `https://www.chatbase.co/chatbot-iframe/vFzcDBWWvspZHs4DsgAxZ?v=${iframeKey}`;
  
  return (
    <div className="h-[calc(100vh-4rem)] w-full p-8">
      <div className="h-full w-full bg-background rounded-lg overflow-hidden shadow-lg">
        <iframe
          key={iframeKey}
          src={chatbaseUrl}
          className="w-full h-full border-0 rounded-lg"
          title="Bolt Bot - Lender Guidelines"
          allow="microphone"
        />
      </div>
    </div>
  );
};

export default ChatbaseBoltBot;
