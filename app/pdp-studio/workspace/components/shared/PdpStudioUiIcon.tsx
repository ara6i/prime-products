import Image from "next/image";
import {
  Aperture,
  Archive,
  Armchair,
  ArrowRight,
  ArrowsOut,
  Camera,
  CaretDown,
  Check,
  CircleHalf,
  Code,
  DotsThree,
  DownloadSimple,
  Eraser,
  Folder,
  Gauge,
  Gear,
  GridFour,
  House,
  ImageSquare,
  ImagesSquare,
  InstagramLogo,
  Layout,
  List,
  ListBullets,
  MagicWand,
  MagnifyingGlass,
  Package,
  PaintBrush,
  Palette,
  PencilSimple,
  PersonSimple,
  Play,
  Plus,
  Question,
  Resize,
  Scissors,
  Sparkle,
  SquaresFour,
  Stack,
  Swatches,
  TextT,
  Trademark,
  TShirt,
  UploadSimple,
  UserCircle,
  VideoCamera,
  Wrench,
  X,
  type Icon,
  type IconWeight,
} from "@phosphor-icons/react";
import type { PdpStudioUiIconName } from "../../types";

const ICONS: Record<PdpStudioUiIconName, Icon> = {
  ai: Sparkle,
  api: Code,
  archive: Archive,
  arrow: ArrowRight,
  batch: Stack,
  brand: Swatches,
  camera: Camera,
  check: Check,
  chevron: CaretDown,
  close: X,
  design: Layout,
  download: DownloadSimple,
  expand: ArrowsOut,
  folder: Folder,
  help: Question,
  home: House,
  image: ImageSquare,
  layers: Stack,
  menu: List,
  model: TShirt,
  more: DotsThree,
  palette: Palette,
  play: Play,
  plus: Plus,
  product: Package,
  profile: UserCircle,
  recolor: PaintBrush,
  resize: Resize,
  search: MagnifyingGlass,
  settings: Gear,
  shopify: Package,
  sparkles: Sparkle,
  template: SquaresFour,
  text: TextT,
  upload: UploadSimple,
  usage: Gauge,
  video: VideoCamera,
  wand: MagicWand,
  "video-generator": VideoCamera,
  "ai-fashion-models": TShirt,
  "product-staging": Armchair,
  "product-beautifier": Sparkle,
  "edit-with-ai": PencilSimple,
  "create-any-image": ImageSquare,
  "ghost-mannequin": PersonSimple,
  "flat-lay": GridFour,
  logo: Trademark,
  "product-photography": Camera,
  ironing: Sparkle,
  "product-packaging": Package,
  "instagram-story": InstagramLogo,
  "product-fixer": Wrench,
  "image-enhancer": Aperture,
  "ai-backgrounds": ImageSquare,
  "ai-expand": ArrowsOut,
  "ai-images": ImagesSquare,
  "ai-shadows": CircleHalf,
  "background-remover": Scissors,
  retouch: Eraser,
  "studio-shot": Camera,
  "ai-shot-list": ListBullets,
};

interface PdpStudioUiIconProps {
  name: PdpStudioUiIconName;
  size?: number;
  color?: string;
  className?: string;
  weight?: IconWeight;
}

export function PdpStudioUiIcon({
  name,
  size = 19,
  color = "currentColor",
  className,
  weight = "regular",
}: PdpStudioUiIconProps) {
  if (name === "shopify") {
    return (
      <Image
        src="/images/pdp-studio/brand/shopify-glyph.svg"
        alt=""
        width={size}
        height={size}
        className={className}
        aria-hidden
      />
    );
  }

  const IconComponent = ICONS[name];
  return (
    <IconComponent
      size={size}
      color={color}
      className={className}
      weight={weight}
      aria-hidden
    />
  );
}
