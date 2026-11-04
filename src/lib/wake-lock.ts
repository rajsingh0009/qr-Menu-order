// ==============================================================================
// Screen Wake Lock API Utility
// Prevents mobile/tablet displays from dimming or locking during live orders.
// ==============================================================================

class WakeLockManager {
  private sentinel: any = null;
  private isRequested = false;

  public async requestLock(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!('wakeLock' in navigator)) {
      console.warn('Wake Lock API not supported in this browser.');
      return false;
    }

    try {
      this.isRequested = true;
      this.sentinel = await (navigator as any).wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => {
        // If release was unexpected (e.g. tab visibility changed), re-request when visible
        if (this.isRequested && document.visibilityState === 'visible') {
          this.requestLock();
        }
      });
      return true;
    } catch (err) {
      console.warn('Could not acquire wake lock:', err);
      return false;
    }
  }

  public releaseLock() {
    this.isRequested = false;
    if (this.sentinel) {
      try {
        this.sentinel.release();
      } catch (err) {
        console.warn('Error releasing wake lock:', err);
      }
      this.sentinel = null;
    }
  }

  public isActive(): boolean {
    return this.sentinel !== null && !this.sentinel.released;
  }
}

export const ScreenWakeLock = new WakeLockManager();
