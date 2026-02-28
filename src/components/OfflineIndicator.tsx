interface OfflineIndicatorProps {
  isOffline: boolean;
}

export function OfflineIndicator({ isOffline }: OfflineIndicatorProps) {
  if (!isOffline) {
    return null;
  }

  return (
    <div className="offline-indicator" role="status" aria-live="polite">
      Offline mode: using cached app + local word list.
    </div>
  );
}
