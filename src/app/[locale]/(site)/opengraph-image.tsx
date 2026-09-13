import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { routing } from "@/i18n/routing";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontsDir = join(process.cwd(), "src/assets/fonts");
const markPath = join(process.cwd(), "public/brand/wjeen-mark-white.png");

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const COPY = {
  en: {
    name: "Wjeen International Co., Ltd.",
    tagline: "Together, We Build Excellence",
  },
  ar: {
    name: "شركة وجين العالمية المحدودة",
    tagline: "معًا نبني التميّز",
  },
} as const;

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const direction = locale === "ar" ? "rtl" : "ltr";

  const [cairoRegular, cairoExtraBold, mark] = await Promise.all([
    readFile(join(fontsDir, "Cairo-Regular.ttf")),
    readFile(join(fontsDir, "Cairo-ExtraBold.ttf")),
    readFile(markPath),
  ]);

  // Satori has no filesystem: the mark has to arrive inline. It is 5 KB, and
  // this runs once per locale at build time.
  const markSrc = `data:image/png;base64,${mark.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0F155F",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -140,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: "rgba(255,255,255,0.06)",
            display: "flex",
          }}
        />
        {/* The real mark, reversed out — not a rotated square standing in for
            it. Same file the header and the footer draw. */}
        <img
          src={markSrc}
          width={131}
          height={100}
          alt=""
          style={{ marginBottom: 44 }}
        />
        <div
          style={{
            direction,
            fontSize: 56,
            fontWeight: 800,
            fontFamily: "Cairo",
            color: "#ffffff",
            textAlign: "center",
            maxWidth: 900,
            display: "flex",
          }}
        >
          {copy.name}
        </div>
        <div
          style={{
            direction,
            marginTop: 20,
            fontSize: 30,
            fontWeight: 400,
            fontFamily: "Cairo",
            color: "rgba(255,255,255,0.65)",
            display: "flex",
          }}
        >
          {copy.tagline}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Cairo", data: cairoRegular, weight: 400, style: "normal" },
        { name: "Cairo", data: cairoExtraBold, weight: 800, style: "normal" },
      ],
    }
  );
}
