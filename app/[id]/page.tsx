import { Suspense } from "react";
import LiveStreamExhibition from "../live-stream-video/page";

export default function Home() {
  return (
    <>
      {/* <HomePage /> */}
      <Suspense fallback={<p>loading</p>}>
        <LiveStreamExhibition />
      </Suspense>
    </>
  );
}
