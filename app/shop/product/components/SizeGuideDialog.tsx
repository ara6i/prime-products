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
  const guide = product.sizeGuide;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.sizeGuideDialog}>
        <DialogHeader>
          <DialogTitle className={styles.sizeGuideTitle}>
            {product.isMock ? "Mock size guide" : "Size guide"}
          </DialogTitle>
          <DialogDescription className={styles.sizeGuideDescription}>
            {product.isMock
              ? `Sample garment measurements for ${product.name}, in centimeters. Illustrative mock data, not supplier sizing or a fit recommendation.`
              : `Available sizes for ${product.name}. Use AI sizing for a personalized recommendation before checkout.`}
          </DialogDescription>
        </DialogHeader>
        {guide ? (
          <div
            className={styles.sizeGuideTableScroll}
            role="region"
            aria-label="Size measurements"
            tabIndex={0}
          >
            <table className={styles.sizeGuideTable}>
              <caption>{guide.title}</caption>
              <thead>
                <tr>
                  {guide.headers.map((header) => (
                    <th key={header} scope="col">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guide.rows.map(([size, ...measurements]) => (
                  <tr key={size}>
                    <th scope="row">{size}</th>
                    {measurements.map((value, index) => (
                      <td key={guide.headers[index + 1]}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.sizeGuideSizes}>
            {product.sizes.map((size) => (
              <span key={size}>{size}</span>
            ))}
          </div>
        )}
        {product.isMock ? (
          <p className={styles.sizeGuideDescription}>
            Chest, bust, waist, hip and hem are full garment circumferences.
            Length, shoulder, sleeve and inseam are point-to-point measurements.
            Compare with a garment laid flat; double flat widths for circumferences.
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
