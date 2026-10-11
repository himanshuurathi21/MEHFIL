import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import path from "path";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

function logoSrc(): string {
  const file = readFileSync(path.join(process.cwd(), "public", "mehfil-logo.png"));
  return `data:image/png;base64,${file.toString("base64")}`;
}

export default function Icon() {
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
          src={logoSrc()}
          alt=""
          width={512}
          height={512}
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "22%" }}
        />
      </div>
    ),
    { ...size }
  );
}
