import { Tag, Box, Layers, Palette, Ruler, ShoppingBag, Package, Star, Heart, Sparkles } from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface AttributeIcon {
  value: string;
  label: string;
  icon: LucideIcon;
}

export const ATTRIBUTE_ICONS: AttributeIcon[] = [
  { value: "Tags", label: "Tags", icon: Tag },
  { value: "Box", label: "Box", icon: Box },
  { value: "Layers", label: "Layers", icon: Layers },
  { value: "Palette", label: "Palette", icon: Palette },
  { value: "Ruler", label: "Ruler", icon: Ruler },
  { value: "ShoppingBag", label: "Shopping Bag", icon: ShoppingBag },
  { value: "Package", label: "Package", icon: Package },
  { value: "Star", label: "Star", icon: Star },
  { value: "Heart", label: "Heart", icon: Heart },
  { value: "Sparkles", label: "Sparkles", icon: Sparkles },
];
