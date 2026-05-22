import { redirect } from "next/navigation";

export const metadata = {
  title: "API Documentation | PrimeStyle AI Virtual Try-On",
  description:
    "Complete API reference and SDK documentation for integrating PrimeStyle AI's virtual try-on into your e-commerce platform.",
};

export default function DocsPage() {
  redirect("/demo");
}
