import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/shared/components/ui/dialog";
import type { ProductDetailViewModel } from "../types/productDetail.types";
import styles from "./productDetail.module.css";

interface SizeGuideDialogProps {
  product: ProductDetailViewModel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SizeGuideDialog({
  product,
  open,
  onOpenChange,
}: SizeGuideDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.sizeGuideDialog}>
        <DialogHeader>
          <DialogTitle className={styles.sizeGuideTitle}>
            Size guide
          </DialogTitle>
          <DialogDescription className={styles.sizeGuideDescription}>
            Available sizes for {product.name}. Use AI sizing for a personalized
            recommendation before checkout.
          </DialogDescription>
        </DialogHeader>
        <div className={styles.sizeGuideSizes}>
          {product.sizes.map((size) => (
            <span key={size}>{size}</span>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
