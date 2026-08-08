import Image from "next/image";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/shared/components/ui/accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/shared/components/ui/tabs";
import type { ProductInformationSection } from "../types/productDetail.types";
import styles from "./productDetail.module.css";

interface ProductInformationProps {
  sections: ProductInformationSection[];
  featureImage?: string;
  mobile?: boolean;
}

function InformationCopy({ section }: { section: ProductInformationSection }) {
  return (
    <div className={styles.informationCopy}>
      <p>{section.summary}</p>
      <ul>
        {section.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function ProductInformation({
  sections,
  featureImage,
  mobile = false,
}: ProductInformationProps) {
  if (mobile) {
    return (
      <section className={styles.mobileInformation}>
        <Accordion type="single" defaultValue="details" collapsible>
          {sections.map((section) => (
            <AccordionItem value={section.id} key={section.id}>
              <AccordionTrigger className={styles.informationTrigger}>
                {section.title}
              </AccordionTrigger>
              <AccordionContent className={styles.informationAccordionContent}>
                <InformationCopy section={section} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    );
  }

  return (
    <section className={styles.information}>
      <Tabs defaultValue="details">
        <TabsList
          className={styles.informationTabs}
          aria-label="Product information"
        >
          {sections.map((section) => (
            <TabsTrigger
              className={styles.informationTab}
              value={section.id}
              key={section.id}
            >
              {section.title}
            </TabsTrigger>
          ))}
        </TabsList>
        {sections.map((section) => (
          <TabsContent
            className={styles.informationPanel}
            value={section.id}
            key={section.id}
          >
            <div className={styles.informationPanelCopy}>
              <h2>{section.title}</h2>
              <InformationCopy section={section} />
            </div>
            {featureImage ? (
              <div className={styles.informationMedia}>
                <Image
                  src={featureImage}
                  alt={`${section.title} product context`}
                  fill
                  sizes="46vw"
                />
              </div>
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
