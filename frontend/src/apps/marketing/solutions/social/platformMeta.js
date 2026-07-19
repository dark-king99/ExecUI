import { Facebook, Instagram, Twitter, Linkedin, Youtube, MessageCircle, Music2, Share2 } from "lucide-react";

// Presentation for each social platform.
export const PLATFORM_META = {
  facebook:  { name: "Facebook",  Icon: Facebook,       color: "text-blue-600",   dot: "bg-blue-600" },
  instagram: { name: "Instagram", Icon: Instagram,      color: "text-pink-600",   dot: "bg-pink-600" },
  whatsapp:  { name: "WhatsApp",  Icon: MessageCircle,  color: "text-emerald-600", dot: "bg-emerald-600" },
  x:         { name: "X",         Icon: Twitter,        color: "text-slate-800 dark:text-slate-200", dot: "bg-slate-800 dark:bg-slate-200" },
  linkedin:  { name: "LinkedIn",  Icon: Linkedin,       color: "text-sky-700",    dot: "bg-sky-700" },
  tiktok:    { name: "TikTok",    Icon: Music2,         color: "text-slate-900 dark:text-white", dot: "bg-slate-900 dark:bg-white" },
  youtube:   { name: "YouTube",   Icon: Youtube,        color: "text-red-600",    dot: "bg-red-600" },
};

export const platformMeta = (id) => PLATFORM_META[id] ?? { name: id, Icon: Share2, color: "text-slate-500", dot: "bg-slate-400" };
