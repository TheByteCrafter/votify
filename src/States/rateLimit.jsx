class RateLimiter {
  constructor() {
    this.STORAGE_KEY = 'votify_rate_limit';
    this.MAX_LOCAL_ATTEMPTS = 3;
    this.LOCAL_BAN_DURATION = 5 * 60 * 1000; 
  }


  storeRateLimit(data) {
    const storedData = {
      ...data,
      storedAt: Date.now(),
      ip: this.getClientFingerprint(),
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storedData));
  }
  getStoredRateLimit() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    
    if (Date.now() - data.storedAt > 7 * 24 * 60 * 60 * 1000) {
      this.clearRateLimit();
      return null;
    }
    
    return data;
  }

 
   clearRateLimit() {
    localStorage.removeItem(this.STORAGE_KEY);
  }


  trackFailedAttempt() {
    const key = 'failed_login_attempts';
    const attempts = parseInt(localStorage.getItem(key) || '0');
    localStorage.setItem(key, (attempts + 1).toString());
    

    localStorage.setItem('last_failed_attempt', Date.now().toString());
    
    return attempts + 1;
  }


  resetFailedAttempts() {
    localStorage.removeItem('failed_login_attempts');
    localStorage.removeItem('last_failed_attempt');
  }

  
  getFailedAttempts() {
    return parseInt(localStorage.getItem('failed_login_attempts') || '0');
  }

 
  isLocallyBanned() {
    const lastAttempt = localStorage.getItem('last_failed_attempt');
    if (!lastAttempt) return false;
    
    const timeSinceLastAttempt = Date.now() - parseInt(lastAttempt);
    const attempts = this.getFailedAttempts();
    
    
    const banDurations = [
      5 * 60 * 1000,    
      15 * 60 * 1000, 
      60 * 60 * 1000,   
      24 * 60 * 60 * 1000, 
    ];
    
    const banIndex = Math.min(attempts - 3, banDurations.length - 1);
    if (banIndex < 0) return false;
    
    const banDuration = banDurations[banIndex];
    return timeSinceLastAttempt < banDuration;
  }


  getLocalBanTimeRemaining() {
    const lastAttempt = localStorage.getItem('last_failed_attempt');
    if (!lastAttempt) return 0;
    
    const attempts = this.getFailedAttempts();
    const banDurations = [5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000, 24 * 60 * 60 * 1000];
    const banIndex = Math.min(attempts - 3, banDurations.length - 1);
    
    if (banIndex < 0) return 0;
    
    const banEndTime = parseInt(lastAttempt) + banDurations[banIndex];
    return Math.max(0, Math.ceil((banEndTime - Date.now()) / 1000));
  }


  getClientFingerprint() {
    const userAgent = navigator.userAgent;
    const language = navigator.language;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const screenResolution = `${window.screen.width}x${window.screen.height}`;
    
   
    const fingerprint = `${userAgent}:${language}:${timezone}:${screenResolution}`;
    return btoa(fingerprint).slice(0, 32);
  }
}

export const rateLimiter = new RateLimiter();