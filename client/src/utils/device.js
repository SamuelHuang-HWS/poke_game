class DeviceManager {
  constructor() {
    this.deviceId = null;
    this.storageKey = 'poke_game_device_id';
  }

  getDeviceId() {
    if (this.deviceId) {
      return this.deviceId;
    }

    const storedId = localStorage.getItem(this.storageKey);
    if (storedId) {
      this.deviceId = storedId;
      return this.deviceId;
    }

    this.deviceId = this.generateDeviceId();
    localStorage.setItem(this.storageKey, this.deviceId);
    return this.deviceId;
  }

  generateDeviceId() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device Fingerprint', 2, 2);

    const canvasData = canvas.toDataURL();
    const userAgent = navigator.userAgent;
    const screenResolution = `${window.screen.width}x${window.screen.height}`;
    const language = navigator.language;
    const platform = navigator.platform;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const fingerprint = `${canvasData}|${userAgent}|${screenResolution}|${language}|${platform}|${timezone}`;
    
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(36) + Date.now().toString(36);
  }

  clearDeviceId() {
    this.deviceId = null;
    localStorage.removeItem(this.storageKey);
  }
}

export default new DeviceManager();
