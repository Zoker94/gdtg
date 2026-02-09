export interface ProfileGradient {
  id: string;
  name: string;
  preview: string;
  css: string;
  bgImage?: string; // import path key for image backgrounds
}

export interface ProfileFrame {
  id: string;
  name: string;
  preview: string;
  borderClass: string;
  glowClass?: string;
  imageFrame?: string; // path to an overlay image frame
}

export interface ProfileEffect {
  id: string;
  name: string;
  preview: string;
  description: string;
}

export const profileGradients: ProfileGradient[] = [
  { id: "default", name: "Mặc định", preview: "from-primary/20 to-primary/5", css: "bg-gradient-to-r from-primary/20 to-primary/5" },
  { id: "sunset", name: "🌅 Hoàng hôn", preview: "from-orange-500 via-pink-500 to-purple-600", css: "bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600" },
  { id: "ocean", name: "🌊 Đại dương", preview: "from-cyan-400 via-blue-500 to-indigo-600", css: "bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600" },
  { id: "aurora", name: "🌌 Cực quang", preview: "from-green-400 via-cyan-500 to-purple-600", css: "bg-gradient-to-r from-green-400 via-cyan-500 to-purple-600" },
  { id: "galaxy", name: "✨ Thiên hà", preview: "from-indigo-900 via-purple-800 to-pink-700", css: "bg-gradient-to-r from-indigo-900 via-purple-800 to-pink-700" },
  { id: "cherry", name: "🌸 Hoa anh đào", preview: "from-pink-300 via-rose-400 to-pink-500", css: "bg-gradient-to-r from-pink-300 via-rose-400 to-pink-500" },
  { id: "forest", name: "🌿 Rừng xanh", preview: "from-emerald-500 via-green-600 to-teal-700", css: "bg-gradient-to-r from-emerald-500 via-green-600 to-teal-700" },
  { id: "lava", name: "🔥 Dung nham", preview: "from-red-600 via-orange-500 to-yellow-400", css: "bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400" },
  { id: "midnight", name: "🌙 Nửa đêm", preview: "from-slate-900 via-blue-900 to-indigo-800", css: "bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-800" },
  { id: "rainbow", name: "🌈 Cầu vồng", preview: "from-red-500 via-yellow-400 via-green-500 via-blue-500 to-purple-500", css: "bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500" },
  { id: "gold_luxury", name: "👑 Vàng sang trọng", preview: "from-yellow-600 via-amber-500 to-yellow-300", css: "bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-300" },
  { id: "neon_cyber", name: "💜 Neon Cyber", preview: "from-fuchsia-600 via-violet-600 to-cyan-400", css: "bg-gradient-to-r from-fuchsia-600 via-violet-600 to-cyan-400" },
  { id: "vice_city", name: "🌴 Vice City", preview: "from-orange-500 to-purple-700", css: "", bgImage: "vice-city" },
  { id: "retro_room", name: "🎮 Retro Room", preview: "from-indigo-800 to-purple-900", css: "", bgImage: "retro-room" },
  { id: "anime_city", name: "🏙️ Anime City", preview: "from-sky-400 to-orange-300", css: "", bgImage: "anime-city" },
  { id: "lunar_new_year", name: "🧧 Tết Nguyên Đán", preview: "from-red-700 to-yellow-500", css: "", bgImage: "lunar-new-year" },
];

export const profileFrames: ProfileFrame[] = [
  { id: "default", name: "Mặc định", preview: "border-background", borderClass: "border-4 border-background" },
  { id: "gold", name: "👑 Vàng hoàng gia", preview: "border-yellow-400", borderClass: "border-4 border-yellow-400 ring-2 ring-yellow-300/50", glowClass: "shadow-[0_0_15px_rgba(250,204,21,0.4)]" },
  { id: "diamond", name: "💎 Kim cương", preview: "border-cyan-300", borderClass: "border-4 border-cyan-300 ring-2 ring-cyan-200/50", glowClass: "shadow-[0_0_20px_rgba(103,232,249,0.5)]" },
  { id: "neon_green", name: "💚 Neon xanh", preview: "border-green-400", borderClass: "border-4 border-green-400 ring-2 ring-green-300/50", glowClass: "shadow-[0_0_15px_rgba(74,222,128,0.5)]" },
  { id: "fire", name: "🔥 Lửa cháy", preview: "border-orange-500", borderClass: "border-4 border-orange-500 ring-2 ring-red-400/50", glowClass: "shadow-[0_0_20px_rgba(249,115,22,0.5)]" },
  { id: "rainbow", name: "🌈 Cầu vồng", preview: "border-purple-500", borderClass: "border-4 border-transparent bg-clip-border", glowClass: "shadow-[0_0_15px_rgba(168,85,247,0.4)] ring-2 ring-purple-400/30" },
  { id: "ice", name: "❄️ Băng giá", preview: "border-sky-300", borderClass: "border-4 border-sky-300 ring-2 ring-sky-200/50", glowClass: "shadow-[0_0_15px_rgba(125,211,252,0.5)]" },
  { id: "rose", name: "🌹 Hoa hồng", preview: "border-rose-400", borderClass: "border-4 border-rose-400 ring-2 ring-rose-300/50", glowClass: "shadow-[0_0_15px_rgba(251,113,133,0.4)]" },
  { id: "ice_tiger", name: "🐯 Hổ Băng", preview: "border-cyan-400", borderClass: "border-0", glowClass: "shadow-[0_0_25px_rgba(56,189,248,0.6)]", imageFrame: "ice-tiger" },
  { id: "star_cloud", name: "⭐ Sao & Mây", preview: "border-sky-400", borderClass: "border-0", glowClass: "shadow-[0_0_20px_rgba(56,189,248,0.4)]", imageFrame: "star-cloud" },
  { id: "panda", name: "🐼 Gấu Trúc", preview: "border-green-500", borderClass: "border-0", glowClass: "shadow-[0_0_20px_rgba(34,197,94,0.4)]", imageFrame: "panda" },
  { id: "christmas", name: "🎄 Giáng Sinh", preview: "border-red-500", borderClass: "border-0", glowClass: "shadow-[0_0_20px_rgba(239,68,68,0.4)]", imageFrame: "christmas" },
  { id: "mystic_lotus", name: "🪷 Sen Huyền Bí", preview: "border-purple-500", borderClass: "border-0", glowClass: "shadow-[0_0_25px_rgba(168,85,247,0.5)]", imageFrame: "mystic-lotus" },
];

export const profileEffects: ProfileEffect[] = [
  { id: "default", name: "Không có", preview: "none", description: "Không hiệu ứng" },
  { id: "sparkle", name: "✨ Lấp lánh", preview: "sparkle", description: "Các hạt sáng lấp lánh bay xung quanh" },
  { id: "hearts", name: "💖 Trái tim", preview: "hearts", description: "Trái tim bay lên nhẹ nhàng" },
  { id: "stars", name: "⭐ Ngôi sao", preview: "stars", description: "Ngôi sao sáng rơi nhẹ" },
  { id: "confetti", name: "🎊 Confetti", preview: "confetti", description: "Hạt confetti đầy màu sắc" },
  { id: "snow", name: "❄️ Tuyết rơi", preview: "snow", description: "Bông tuyết rơi dịu dàng" },
  { id: "fireflies", name: "🌟 Đom đóm", preview: "fireflies", description: "Ánh sáng đom đóm lập lòe" },
];

export function getGradientById(id: string) {
  return profileGradients.find(g => g.id === id) || profileGradients[0];
}

export function getFrameById(id: string) {
  return profileFrames.find(f => f.id === id) || profileFrames[0];
}

export function getEffectById(id: string) {
  return profileEffects.find(e => e.id === id) || profileEffects[0];
}
