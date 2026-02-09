import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useCheckBannedIP = () => {
  const [isBanned, setIsBanned] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkIP = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-banned-ip");
        if (!error && data?.banned === true) {
          setIsBanned(true);
        }
      } catch {
        // Fail open - don't block if check fails
      } finally {
        setIsChecking(false);
      }
    };

    checkIP();
  }, []);

  return { isBanned, isChecking };
};
