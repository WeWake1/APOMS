import PinPad from "@/components/PinPad";

export const dynamic = "force-dynamic";

export default function PinPage() {
  // The pad auto-submits the moment this many digits are entered.
  // Exposing the PIN's length is an accepted trade-off for a shared
  // team PIN — it removes the ENTER step for non-tech users.
  const pinLength = (process.env.APP_PIN ?? "").length || 4;
  return <PinPad pinLength={pinLength} />;
}
