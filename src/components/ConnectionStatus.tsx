import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, RefreshCw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const ConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [supabaseConnected, setSupabaseConnected] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Monitor browser online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkSupabaseConnection();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSupabaseConnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Check Supabase connection on mount and periodically
  useEffect(() => {
    checkSupabaseConnection();

    // Check connection every 30 seconds
    const interval = setInterval(checkSupabaseConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkSupabaseConnection = async () => {
    if (!navigator.onLine) {
      setSupabaseConnected(false);
      return;
    }

    try {
      // Simple health check - fetch platform settings (lightweight query)
      const { error } = await supabase
        .from("platform_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned, which is fine
        console.warn("Supabase connection check failed:", error.message);
        setSupabaseConnected(false);
      } else {
        if (!supabaseConnected) {
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
        }
        setSupabaseConnected(true);
      }
    } catch (err) {
      console.warn("Supabase connection error:", err);
      setSupabaseConnected(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await checkSupabaseConnection();
    setIsRetrying(false);
  };

  // Don't show anything if everything is fine
  if (isOnline && supabaseConnected && !showSuccess) {
    return null;
  }

  return (
    <AnimatePresence>
      {/* Success notification */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Đã kết nối lại!</span>
          </div>
        </motion.div>
      )}

      {/* Offline / Connection error banner */}
      {(!isOnline || !supabaseConnected) && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-50"
        >
          <div className="bg-destructive/95 backdrop-blur-sm text-destructive-foreground px-4 py-3">
            <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <WifiOff className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {!isOnline 
                      ? "Mất kết nối mạng" 
                      : "Không thể kết nối đến máy chủ"
                    }
                  </p>
                  <p className="text-xs opacity-80">
                    {!isOnline 
                      ? "Vui lòng kiểm tra kết nối Internet của bạn" 
                      : "Hệ thống sẽ tự động thử kết nối lại"
                    }
                  </p>
                </div>
              </div>
              
              {isOnline && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="flex-shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? "animate-spin" : ""}`} />
                  {isRetrying ? "Đang thử..." : "Thử lại"}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConnectionStatus;
