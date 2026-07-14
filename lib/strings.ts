// ALL user-facing copy lives here so switching to Hindi/Gujarati
// (or bilingual labels) later is a 10-minute job.

export const STR = {
  appName: "PalletTrack",

  // PIN screen
  pinTitle: "Enter Team PIN",
  pinWrong: "Wrong PIN. Try again.",
  pinClear: "CLEAR",
  pinBackspace: "Delete last digit",

  // Header / board
  pending: "PENDING",
  noPending: "✓ No pending orders",
  noPendingSub: "All caught up. Great work!",
  recentlyDispatched: "Recently dispatched",
  undo: "UNDO",
  undoConfirmTitle: (n: number) => `Bring order #${n} back to pending?`,
  yesUndo: "YES, BRING BACK",
  noGoBack: "NO, GO BACK",

  // Order card
  dispatched: "DISPATCHED ✓",
  dispatchConfirmTitle: (n: number) => `Mark order #${n} dispatched?`,
  yesDispatched: "YES, DISPATCHED",
  play: "PLAY",
  pause: "PAUSE",
  voiceNote: "Voice note",
  close: "✕ CLOSE",

  // Add order
  newOrder: "+ NEW ORDER",
  addTitle: "New Order",
  photoRequired: "Photo of the order (required)",
  addPhoto: "🖼️ ADD PHOTO",
  takePhoto: "📷 TAKE PHOTO",
  changePhoto: "CHANGE PHOTO",
  pastePhoto: "📋 PASTE PHOTO",
  pasteHint: "Tip: copy a photo, then press Ctrl+V (or Cmd+V) to paste it here.",
  pasteNoImage: "No photo in clipboard. Copy a photo first, then paste.",
  customerName: "Customer name (optional)",
  customerPlaceholder: "e.g. Ramesh Traders",
  recordVoice: "🎤 RECORD VOICE NOTE",
  stopRecording: "⏹ STOP RECORDING",
  deleteRerecord: "DELETE & RE-RECORD",
  saveOrder: "SAVE ORDER",
  saving: "SAVING…",
  saved: "Order saved ✓",
  cancel: "← BACK",
  uploadError: "Could not save. Check internet and try again.",
  micError: "Could not use microphone. Check permission and try again.",

  // Install app
  installBanner: "📲 DOWNLOAD APP",
  installIosHelp:
    "On iPhone: tap the Share button in Safari, then \"Add to Home Screen\". Open the app from the new icon.",
  installHelp:
    "In your browser menu (⋮), tap \"Install app\" or \"Add to Home screen\". Open the app from the new icon.",

  // Notifications
  notifyBanner: "🔔 TURN ON NOTIFICATIONS",
  notifyDeniedHelp:
    "Notifications are blocked on this phone. Open your phone Settings → find this app → allow Notifications, then try again.",
  notifyOn: "🔔 Notifications ON",
  notifyUnsupported:
    "On iPhone: first add this app to your Home Screen (Share → Add to Home Screen), then open it from the icon to turn on notifications.",

  // Push messages (sent from server)
  pushNewOrder: (n: number, customer?: string | null) =>
    customer ? `🪵 New order #${n} — ${customer}` : `🪵 New order #${n}`,
  pushPendingSummary: (count: number) =>
    count === 1 ? `1 order pending` : `${count} orders pending`,

  // Misc
  offline: "You're offline. Showing last known orders.",
  loading: "Loading…",
} as const;
