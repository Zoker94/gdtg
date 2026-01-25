import { memo } from 'react';
import { Shield, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Message } from '@/stores/chatStore';

interface ChatMessageProps {
  message: Message;
  isOwn: boolean;
  senderName: string;
  role: 'admin' | 'moderator' | null;
  onImageClick: (url: string) => void;
}

export const ChatMessage = memo(({ 
  message, 
  isOwn, 
  senderName, 
  role,
  onImageClick 
}: ChatMessageProps) => {
  const renderContent = () => {
    const imageMatch = message.content.match(/\[IMAGE\](.*?)\[\/IMAGE\]/);
    if (imageMatch) {
      return (
        <img
          src={imageMatch[1]}
          alt="Ảnh"
          className="max-w-full rounded cursor-pointer hover:opacity-90 transition-opacity"
          style={{ maxHeight: '200px' }}
          onClick={() => onImageClick(imageMatch[1])}
          loading="lazy"
        />
      );
    }
    return <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>;
  };

  const getRoleStyle = () => {
    if (role === 'admin') return 'text-red-500 font-semibold';
    if (role === 'moderator') return 'text-pink-500 font-semibold';
    return 'text-muted-foreground';
  };

  const getRoleBadge = () => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
          <Shield className="w-3 h-3" />
          Admin
        </span>
      );
    }
    if (role === 'moderator') {
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded-full">
          <UserCheck className="w-3 h-3" />
          GDV
        </span>
      );
    }
    return null;
  };

  return (
    <div
      className={cn('flex flex-col max-w-[85%] animate-in fade-in-0 slide-in-from-bottom-2 duration-200', {
        'ml-auto items-end': isOwn,
        'mr-auto items-start': !isOwn,
      })}
    >
      {!isOwn && (
        <div className="flex items-center gap-1 mb-0.5">
          <span className={cn('text-xs', getRoleStyle())}>
            {senderName}
          </span>
          {getRoleBadge()}
        </div>
      )}
      <div
        className={cn('px-2.5 py-1.5 rounded-lg relative', {
          'bg-primary text-primary-foreground': isOwn,
          'bg-muted': !isOwn,
        })}
      >
        {renderContent()}
        {message.status === 'sending' && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse" />
        )}
      </div>
      <span className="text-xs text-muted-foreground mt-0.5">
        {format(new Date(message.created_at), 'HH:mm dd/MM', { locale: vi })}
      </span>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';
