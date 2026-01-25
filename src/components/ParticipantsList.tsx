import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Shield, ShieldCheck, UserCheck, User, Store, ShoppingCart } from "lucide-react";

interface ParticipantProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  kyc_status: string;
}

interface ParticipantsListProps {
  buyerId: string | null;
  sellerId: string | null;
  moderatorId: string | null;
  arbiterId: string | null;
}

export const ParticipantsList = ({
  buyerId,
  sellerId,
  moderatorId,
  arbiterId,
}: ParticipantsListProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Record<string, ParticipantProfile>>({});
  const [loading, setLoading] = useState(true);

  const participantIds = [buyerId, sellerId, moderatorId, arbiterId].filter(Boolean) as string[];
  const currentUserId = user?.id;

  useEffect(() => {
    const fetchProfiles = async () => {
      if (participantIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, kyc_status")
        .in("user_id", participantIds);

      if (!error && data) {
        const profileMap: Record<string, ParticipantProfile> = {};
        data.forEach((p) => {
          profileMap[p.user_id] = p;
        });
        setProfiles(profileMap);
      }
      setLoading(false);
    };

    fetchProfiles();
  }, [buyerId, sellerId, moderatorId, arbiterId]);

  const participants = [
    {
      id: sellerId,
      role: "seller",
      label: "Người bán",
      icon: Store,
      bgColor: "bg-emerald-500/10",
      textColor: "text-emerald-600",
      letter: "S",
    },
    {
      id: buyerId,
      role: "buyer",
      label: "Người mua",
      icon: ShoppingCart,
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-600",
      letter: "B",
    },
    {
      id: moderatorId,
      role: "moderator",
      label: "Giao dịch viên",
      icon: UserCheck,
      bgColor: "bg-pink-500/10",
      textColor: "text-pink-600",
      letter: "M",
    },
    {
      id: arbiterId,
      role: "arbiter",
      label: "Admin phân xử",
      icon: Shield,
      bgColor: "bg-red-500/10",
      textColor: "text-red-600",
      letter: "A",
    },
  ];

  const filledCount = participantIds.length;

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Người tham gia</CardTitle>
          <Badge variant="outline" className="text-xs">
            {filledCount}/4
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {participants.map((participant) => {
          const profile = participant.id ? profiles[participant.id] : null;
          const isCurrentUser = participant.id === currentUserId;
          const Icon = participant.icon;

          return (
            <div
              key={participant.role}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                participant.id ? "bg-muted/50" : "bg-transparent opacity-50"
              }`}
            >
              <Avatar className="w-10 h-10">
                {loading && participant.id ? (
                  <Skeleton className="w-full h-full rounded-full" />
                ) : (
                  <>
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className={`${participant.bgColor} ${participant.textColor}`}>
                      {profile?.full_name?.[0]?.toUpperCase() || participant.letter}
                    </AvatarFallback>
                  </>
                )}
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${participant.textColor}`} />
                  <p className="text-sm font-medium">{participant.label}</p>
                </div>
                {participant.id ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-muted-foreground"
                      onClick={() => navigate(`/user/${participant.id}`)}
                    >
                      {profile?.full_name || "Xem hồ sơ"} →
                    </Button>
                    {profile?.kyc_status === "approved" && (
                      <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Chưa có</p>
                )}
              </div>

              {isCurrentUser && (
                <Badge variant="secondary" className="text-xs">
                  Bạn
                </Badge>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
