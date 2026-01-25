import { useState, memo } from 'react';
import { X, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import { useChatStore } from '@/stores/chatStore';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';

interface TransactionChatV2Props {
  transactionId: string;
  className?: string;
}

export const TransactionChatV2 = memo(({ transactionId, className }: TransactionChatV2Props) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const isConnected = useChatStore((state) => state.isConnected);

  // Initialize realtime connection
  useChatRealtime(transactionId);

  return (
    <>
      <div className={cn('flex flex-col h-[450px] rounded-lg border border-border bg-card', className)}>
        {/* Header with connection status */}
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm">Chat giao dịch</h3>
          <div className="flex items-center gap-1">
            {isConnected ? (
              <Wifi className="w-3 h-3 text-green-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-yellow-500 animate-pulse" />
            )}
            <span className={cn('text-xs', isConnected ? 'text-green-500' : 'text-yellow-500')}>
              {isConnected ? 'Trực tuyến' : 'Đang kết nối...'}
            </span>
          </div>
        </div>

        {/* Evidence Warning */}
        <div className="mx-3 mt-2 p-2 bg-destructive/10 border border-destructive/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive font-bold leading-relaxed">
              ⚠️ LƯU Ý: Người mua hoặc bán PHẢI có hình ảnh hoặc video bằng chứng trong quá trình giao dịch. Khi có tranh chấp, Giao dịch viên sẽ xử lý dựa trên bằng chứng. Nếu KHÔNG có bằng chứng, bên đó phải TỰ CHỊU TOÀN BỘ TRÁCH NHIỆM.
            </p>
          </div>
        </div>

        {/* Messages */}
        <ChatMessages 
          transactionId={transactionId} 
          onImageClick={setPreviewImage}
        />

        {/* Input */}
        <ChatInput transactionId={transactionId} />
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setPreviewImage(null)}
          >
            <X className="w-6 h-6" />
          </Button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
});

TransactionChatV2.displayName = 'TransactionChatV2';
