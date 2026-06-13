"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

export function PublicClarity({ projectId }: { projectId?: string | null }) {
  const pathname = usePathname();
  const id = projectId?.trim();

  if (!id || pathname?.startsWith("/admin")) return null;

  return (
    <Script id="public-clarity" strategy="lazyOnload">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", ${JSON.stringify(id)});
      `}
    </Script>
  );
}
