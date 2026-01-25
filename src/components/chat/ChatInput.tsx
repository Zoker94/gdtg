import { useState, useRef, memo, useCallback } from 'react';
import { Send, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSendChatMessage } from '@/hooks/useChatRealtime';

interface ChatInputProps {
  transactionId: string;
}

export const ChatInput = memo(({ transactionId }: ChatInputProps) => {
  const { user } = useAuth();
  const { sendMessage } = useSendChatMessage();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(async () => {
    if (!message.trim() || isSending) return;

    const content = message.trim();
    setMessage(''); // Clear immediately for instant feedback
    setIsSending(true);

    try {
      await sendMessage(transactionId, content);
    } catch {
      setMessage(content); // Restore on error
      toast({
        title: 'Lỗi',
        description: 'Không thể gửi tin nhắn',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  }, [message, transactionId, sendMessage, isSending]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Lỗi', description: 'Vui lòng chọn file ảnh', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Lỗi', description: 'File ảnh phải nhỏ hơn 5MB', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${transactionId}/${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      await sendMessage(transactionId, `[IMAGE]${urlData.publicUrl}[/IMAGE]`);
      toast({ title: 'Đã gửi ảnh' });
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể tải ảnh lên', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [transactionId, user?.id, sendMessage]);

  return (
    <div className="p-3 border-t border-border">
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <span className="animate-spin text-xs">⏳</span>
          ) : (
            <ImagePlus className="w-4 h-4" />
          )}
        </Button>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn..."
          className="flex-1 text-sm"
          disabled={isSending}
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          size="icon"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';
