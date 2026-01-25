import { useKycImageUrl } from "@/hooks/useKycImageUrl";
import { Loader2, ImageOff } from "lucide-react";

interface KycImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

const KycImage = ({ src, alt, className = "", onClick }: KycImageProps) => {
  const { signedUrl, loading, error } = useKycImageUrl(src);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className={`flex flex-col items-center justify-center bg-muted gap-2 ${className}`}>
        <ImageOff className="w-6 h-6 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Không thể tải ảnh</span>
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
      onClick={onClick ? () => onClick() : undefined}
      style={onClick ? { cursor: "pointer" } : undefined}
    />
  );
};

export default KycImage;
