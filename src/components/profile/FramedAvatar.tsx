import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ProfileFrame } from "@/data/profileThemes";
import iceTigerFrame from "@/assets/frame-ice-tiger.png";
import starCloudFrame from "@/assets/frame-star-cloud.png";
import pandaFrame from "@/assets/frame-panda.png";
import christmasFrame from "@/assets/frame-christmas.png";
import mysticLotusFrame from "@/assets/frame-mystic-lotus.png";

const frameImages: Record<string, string> = {
  "ice-tiger": iceTigerFrame,
  "star-cloud": starCloudFrame,
  "panda": pandaFrame,
  "christmas": christmasFrame,
  "mystic-lotus": mysticLotusFrame,
};

interface FramedAvatarProps {
  frame: ProfileFrame;
  avatarUrl?: string | null;
  fallbackText?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: { wrapper: "w-20 h-20", avatar: "w-16 h-16", frame: "w-24 h-24" },
  md: { wrapper: "w-24 h-24", avatar: "w-20 h-20", frame: "w-32 h-32" },
  lg: { wrapper: "w-28 h-28", avatar: "w-24 h-24", frame: "w-36 h-36" },
};

const FramedAvatar = ({ frame, avatarUrl, fallbackText = "U", size = "md" }: FramedAvatarProps) => {
  const s = sizeClasses[size];

  if (frame.imageFrame) {
    const frameSrc = frameImages[frame.imageFrame];
    return (
      <div className={`relative flex items-center justify-center ${s.frame}`}>
        <Avatar className={`${s.avatar} z-10`}>
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="text-2xl bg-primary/10">
            {fallbackText}
          </AvatarFallback>
        </Avatar>
        <img
          src={frameSrc}
          alt="Avatar frame"
          className="absolute inset-0 w-full h-full object-contain z-20 pointer-events-none mix-blend-screen"
          style={{ filter: "brightness(1.2)" }}
        />
      </div>
    );
  }

  return (
    <Avatar className={`${s.wrapper} shadow-lg ${frame.borderClass} ${frame.glowClass || ""}`}>
      <AvatarImage src={avatarUrl || undefined} />
      <AvatarFallback className="text-2xl bg-primary/10">
        {fallbackText}
      </AvatarFallback>
    </Avatar>
  );
};

export default FramedAvatar;
