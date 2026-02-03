import { useState, useEffect } from "react";
import { usePopupAnnouncement } from "@/hooks/usePopupAnnouncement";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const POPUP_DISMISSED_KEY = "popup_dismissed_at";

const PopupAnnouncement = () => {
  const { data: popup, isLoading } = usePopupAnnouncement();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isLoading || !popup?.enabled || !popup?.content) return;

    // Check if user has dismissed this popup recently (within 24 hours)
    const dismissedAt = localStorage.getItem(POPUP_DISMISSED_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const now = Date.now();
      const hoursAgo = (now - dismissedTime) / (1000 * 60 * 60);
      
      // Only show again after 24 hours
      if (hoursAgo < 24) return;
    }

    // Show popup after a short delay
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [popup, isLoading]);

  const handleDismiss = () => {
    localStorage.setItem(POPUP_DISMISSED_KEY, Date.now().toString());
    setIsOpen(false);
  };

  if (!popup?.enabled || !popup?.content) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ repeat: Infinity, duration: 0.5, repeatDelay: 2 }}
            >
              <Bell className="w-5 h-5" />
            </motion.div>
            {popup.title}
          </DialogTitle>
        </DialogHeader>
        
        <DialogDescription className="text-base text-foreground whitespace-pre-wrap">
          {popup.content}
        </DialogDescription>

        <div className="flex justify-end mt-4">
          <Button onClick={handleDismiss} className="gap-2">
            <X className="w-4 h-4" />
            Đã hiểu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PopupAnnouncement;
