import Image from "next/image";

/** Hub hero student decorations — non-interactive, never blocks CTAs. */
export function HubDecor() {
  return (
    <div className="hub-decor" aria-hidden="true">
      <Image
        src="/brand/student-girl.png"
        alt=""
        width={240}
        height={480}
        className="hub-student hub-student-girl"
        priority
      />
      <Image
        src="/brand/student-boy.png"
        alt=""
        width={257}
        height={480}
        className="hub-student hub-student-boy"
        priority
      />
    </div>
  );
}
