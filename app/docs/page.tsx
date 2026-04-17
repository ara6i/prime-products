import { cookies } from "next/headers";
import { DocsContent } from "./components/DocsContent";

export const metadata = {
  title: "API Documentation | PrimeStyle AI Virtual Try-On",
  description:
    "Complete API reference and SDK documentation for integrating PrimeStyle AI's virtual try-on into your e-commerce platform.",
};

export default async function DocsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const isLoggedIn = !!accessToken;

  return <DocsContent isLoggedIn={isLoggedIn} />;
}
