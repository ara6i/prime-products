import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  getShowcaseProduct,
  type ShowcaseGender,
} from "../../../../data/showcaseCatalog.data";
import {
  SHOWCASE_DEMO_RESULT_VIEWS,
  showcasePreparedResultFile,
} from "../../../../product/data/productSdkDemo.data";

export const runtime = "nodejs";

type PreparedResultRouteContext = {
  params: Promise<{
    gender: string;
    productId: string;
    fileName: string;
  }>;
};

function notFound() {
  return new Response("Prepared result not found", { status: 404 });
}

async function readOptionalImage(filePath: string) {
  try {
    return await readFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function GET(
  _request: Request,
  { params }: PreparedResultRouteContext,
) {
  const { gender, productId, fileName } = await params;
  const match = /^look-(0[1-5])\.png$/.exec(fileName);
  const product = getShowcaseProduct(productId);

  if (
    !match ||
    !product ||
    product.gender !== gender ||
    (gender !== "women" && gender !== "men")
  ) {
    return notFound();
  }

  const lookIndex = Number(match[1]) - 1;
  const publicRoot = path.join(process.cwd(), "public");
  const preparedPath = path.join(
    publicRoot,
    showcasePreparedResultFile(product, lookIndex),
  );
  const preparedImage = await readOptionalImage(preparedPath);
  const source = preparedImage ? "prepared" : "fallback";
  const image =
    preparedImage ??
    (await readFile(
      path.join(
        publicRoot,
        "media",
        "global-shop",
        "showcase-v5",
        gender as ShowcaseGender,
        product.id,
        `${SHOWCASE_DEMO_RESULT_VIEWS[lookIndex]}.png`,
      ),
    ));

  return new Response(new Uint8Array(image), {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "Content-Type": "image/png",
      "X-PrimeStyle-Prepared-Asset": source,
    },
  });
}
