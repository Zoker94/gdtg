import { useState, useEffect } from "react";

interface UsePageLoadingOptions {
  minDuration?: number; // Minimum loading duration in ms
  enabled?: boolean;
}

export const usePageLoading = (
  isDataLoading: boolean = false,
  options: UsePageLoadingOptions = {}
) => {
  const { minDuration = 2000, enabled = true } = options;
  const [showLoading, setShowLoading] = useState(enabled);
  const [loadingStartTime] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      setShowLoading(false);
      return;
    }

    // If data is still loading, keep showing loading screen
    if (isDataLoading) {
      return;
    }

    // Calculate remaining time to show loading
    const elapsed = Date.now() - loadingStartTime;
    const remaining = Math.max(0, minDuration - elapsed);

    if (remaining > 0) {
      const timer = setTimeout(() => {
        setShowLoading(false);
      }, remaining);
      return () => clearTimeout(timer);
    } else {
      setShowLoading(false);
    }
  }, [isDataLoading, minDuration, loadingStartTime, enabled]);

  return showLoading;
};
