import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Extract the file path from a Supabase storage URL
 * e.g., "https://xxx.supabase.co/storage/v1/object/public/kyc-documents/userId/file.jpg"
 * -> "userId/file.jpg"
 */
const extractFilePath = (url: string): string | null => {
  try {
    const match = url.match(/kyc-documents\/(.+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

/**
 * Hook to get a signed URL for a KYC document image
 * Works for private buckets where getPublicUrl doesn't work
 */
export const useKycImageUrl = (publicUrl: string | null | undefined) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicUrl) {
      setSignedUrl(null);
      return;
    }

    const fetchSignedUrl = async () => {
      setLoading(true);
      setError(null);

      const filePath = extractFilePath(publicUrl);
      if (!filePath) {
        setError("Invalid URL format");
        setLoading(false);
        return;
      }

      const { data, error: signError } = await supabase.storage
        .from("kyc-documents")
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (signError) {
        setError(signError.message);
        setSignedUrl(null);
      } else {
        setSignedUrl(data.signedUrl);
      }

      setLoading(false);
    };

    fetchSignedUrl();
  }, [publicUrl]);

  return { signedUrl, loading, error };
};

/**
 * Get multiple signed URLs at once
 */
export const getKycSignedUrls = async (
  frontUrl: string,
  backUrl: string
): Promise<{ frontSignedUrl: string | null; backSignedUrl: string | null }> => {
  const frontPath = extractFilePath(frontUrl);
  const backPath = extractFilePath(backUrl);

  const results = await Promise.all([
    frontPath
      ? supabase.storage.from("kyc-documents").createSignedUrl(frontPath, 3600)
      : Promise.resolve({ data: null, error: null }),
    backPath
      ? supabase.storage.from("kyc-documents").createSignedUrl(backPath, 3600)
      : Promise.resolve({ data: null, error: null }),
  ]);

  return {
    frontSignedUrl: results[0].data?.signedUrl || null,
    backSignedUrl: results[1].data?.signedUrl || null,
  };
};
