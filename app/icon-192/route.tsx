import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import path from "path";

export const dynamic = "force-static";
export const contentType = "image/png";

export async function GET() {
  const file = readFileSync(path.join(process.cwd(), "public", "mehfil-logo.png"));
  const src = `data:image/png;base64,${file.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse/satori cannot use next/image */}
        <img
          src={src}
          alt=""
          width={192}
          height={192}
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "22%" }}
        />
      </div>
    ),
    { width: 192, height: 192 }
  );
}
