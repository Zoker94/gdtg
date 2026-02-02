import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Loader2, Sparkles, X, MessageSquare, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `https://ucfjjcccgoxnfjaqfmws.supabase.co/functions/v1/admin-ai-support`;

const suggestedQuestions = [
  "Tóm tắt tình hình giao dịch hôm nay",
  "Có rủi ro lừa đảo nào cần lưu ý không?",
  "Liệt kê các khiếu nại đang xử lý",
  "Phân tích doanh thu và phí thu được",
];

export const AIAssistantWidget = () => {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const parseGeminiStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onDelta: (text: string) => void,
    onDone: () => void
  ) => {
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              onDelta(text);
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }

    onDone();
  };

  const streamChat = async (userMessage: string) => {
    if (!session?.access_token) {
      toast.error("Bạn cần đăng nhập để sử dụng AI");
      return;
    }

    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || "Failed to connect to AI");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      let assistantContent = "";

      // Add empty assistant message
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      await parseGeminiStream(
        reader,
        (text) => {
          assistantContent += text;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: assistantContent };
            return updated;
          });
        },
        () => setIsLoading(false)
      );
    } catch (error) {
      console.error("AI chat error:", error);
      toast.error(error instanceof Error ? error.message : "Lỗi kết nối AI");
      setMessages(messages);
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    streamChat(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (question: string) => {
    if (isLoading) return;
    streamChat(question);
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
          "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
          isOpen && "rotate-90"
        )}
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </Button>

      {/* Sidebar Chat */}
      <div
        className={cn(
          "fixed top-0 right-0 z-40 h-full w-[400px] max-w-full",
          "bg-background/95 backdrop-blur-xl border-l shadow-2xl",
          "transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                AI Giám đốc Vận hành
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Gemini
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground">Hỗ trợ phân tích dữ liệu hệ thống</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearChat} className="text-muted-foreground">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="h-[calc(100%-180px)] p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Xin chào Admin!</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                Tôi có thể phân tích giao dịch, doanh thu, rủi ro lừa đảo và tóm tắt tình hình hệ thống.
              </p>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                {suggestedQuestions.map((q, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-xs justify-start h-auto py-2 px-3 whitespace-normal text-left"
                    onClick={() => handleSuggestion(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[90%] rounded-2xl px-4 py-3",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                        <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background/95 backdrop-blur-sm">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Hỏi về giao dịch, doanh thu, rủi ro..."
              className="min-h-[44px] max-h-[100px] resize-none text-sm"
              rows={1}
            />
            <Button 
              onClick={handleSend} 
              disabled={isLoading || !input.trim()} 
              size="icon" 
              className="shrink-0"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            AI chỉ có quyền đọc dữ liệu • Không thể chỉnh sửa database
          </p>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
