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
  const isGeneratedShowcase = product.badge === "Generated showcase";
  const guideTitle = isGeneratedShowcase
    ? "Showcase size guide"
    : product.isMock
      ? "Mock size guide"
      : "Size guide";
  const measurementNote =
    product.fitType === "shoe"
      ? "Foot length is the recommended foot range. Insole length, outsole width, and heel or sole height are finished-product measurements."
      : product.fitType === "bag" || product.fitType === "accessory"
        ? "The table describes the finished one-size item; it is not a body-size recommendation."
        : "Chest, bust, waist, and hip values are body-fit ranges. Shoulder, sleeve, rise, inseam, length, and hem values are finished-garment point measurements.";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.sizeGuideDialog}>
        <DialogHeader>
          <DialogTitle className={styles.sizeGuideTitle}>
            {guideTitle}
          </DialogTitle>
          <DialogDescription className={styles.sizeGuideDescription}>
            {isGeneratedShowcase
              ? `Structured sample measurements for ${product.name}. They power this local SDK demonstration and are illustrative, not supplier-verified or a personalized fit guarantee.`
              : product.isMock
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
                    <th key={header} scope="col">
                      {header}
                    </th>
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
            {isGeneratedShowcase
              ? measurementNote
              : "Chest, bust, waist, hip and hem are full garment circumferences. Length, shoulder, sleeve and inseam are point-to-point measurements. Compare with a garment laid flat; double flat widths for circumferences."}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
