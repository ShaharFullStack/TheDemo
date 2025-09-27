/**
 * Performance Monitor
 * Tracks FPS, memory usage, CPU metrics, and other performance data
 * for demo presentation feedback
 */

class PerformanceMonitor {
  constructor() {
    this.isMonitoring = false;
    this.metrics = {
      fps: 0,
      frameTime: 0,
      memory: { used: 0, total: 0, percentage: 0 },
      cpu: { usage: 0, loadAverage: 0 },
      handTracking: { fps: 0, latency: 0, confidence: 0 },
      audio: { latency: 0, bufferSize: 0, sampleRate: 0 },
      network: { bandwidth: 0, latency: 0 },
      timestamp: Date.now()
    };

    this.frameCount = 0;
    this.lastFrameTime = performance.now();
    this.lastSecond = performance.now();
    this.frameTimes = [];
    this.maxFrameTimeHistory = 60;

    this.updateCallbacks = [];
    this.updateInterval = null;
  }

  start() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.lastFrameTime = performance.now();
    this.lastSecond = performance.now();
    this.frameCount = 0;

    // Update metrics every 100ms for smooth display
    this.updateInterval = setInterval(() => {
      this.updateMetrics();
      this.notifyCallbacks();
    }, 100);

    console.log('Performance monitoring started');
  }

  stop() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    console.log('Performance monitoring stopped');
  }

  // Call this from your main animation loop
  recordFrame() {
    if (!this.isMonitoring) return;

    const now = performance.now();
    const frameTime = now - this.lastFrameTime;

    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.maxFrameTimeHistory) {
      this.frameTimes.shift();
    }

    this.frameCount++;
    this.lastFrameTime = now;

    // Calculate FPS every second
    if (now - this.lastSecond >= 1000) {
      this.metrics.fps = Math.round((this.frameCount * 1000) / (now - this.lastSecond));
      this.frameCount = 0;
      this.lastSecond = now;
    }

    // Update frame time (average of last few frames)
    if (this.frameTimes.length > 0) {
      const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      this.metrics.frameTime = Math.round(avgFrameTime * 100) / 100;
    }
  }

  updateMetrics() {
    if (!this.isMonitoring) return;

    // Update memory metrics
    this.updateMemoryMetrics();

    // Update CPU metrics (approximation)
    this.updateCPUMetrics();

    // Update audio metrics
    this.updateAudioMetrics();

    // Update network metrics (if available)
    this.updateNetworkMetrics();

    this.metrics.timestamp = Date.now();
  }

  updateMemoryMetrics() {
    if (performance.memory) {
      const memory = performance.memory;
      this.metrics.memory = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024 * 100) / 100,
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100,
        percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
      };
    } else {
      // Fallback for browsers without performance.memory
      this.metrics.memory = { used: 0, total: 0, percentage: 0, limit: 0 };
    }
  }

  updateCPUMetrics() {
    // CPU usage approximation based on frame timing
    if (this.frameTimes.length > 10) {
      const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      const targetFrameTime = 16.67; // 60fps target
      const cpuUsage = Math.min(100, Math.max(0, (avgFrameTime / targetFrameTime) * 100));
      this.metrics.cpu.usage = Math.round(cpuUsage);
    }

    // Load average approximation
    if (this.frameTimes.length > 0) {
      const variance = this.calculateVariance(this.frameTimes);
      this.metrics.cpu.loadAverage = Math.round(variance * 10) / 10;
    }
  }

  updateAudioMetrics() {
    if (window.Tone && window.Tone.context) {
      const audioContext = window.Tone.context;
      this.metrics.audio = {
        latency: Math.round(audioContext.baseLatency * 1000 * 100) / 100,
        bufferSize: audioContext.bufferSize || 0,
        sampleRate: audioContext.sampleRate || 0,
        state: audioContext.state
      };
    }
  }

  updateNetworkMetrics() {
    // Network timing approximation using connection API
    if (navigator.connection) {
      const connection = navigator.connection;
      this.metrics.network = {
        bandwidth: connection.downlink || 0,
        effectiveType: connection.effectiveType || 'unknown',
        rtt: connection.rtt || 0
      };
    }
  }

  updateHandTrackingMetrics(fps, latency, confidence) {
    this.metrics.handTracking = {
      fps: fps || 0,
      latency: latency || 0,
      confidence: confidence || 0
    };
  }

  calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }

  getMetrics() {
    return { ...this.metrics };
  }

  onUpdate(callback) {
    this.updateCallbacks.push(callback);
  }

  offUpdate(callback) {
    const index = this.updateCallbacks.indexOf(callback);
    if (index > -1) {
      this.updateCallbacks.splice(index, 1);
    }
  }

  notifyCallbacks() {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(this.getMetrics());
      } catch (error) {
        console.warn('Performance monitor callback error:', error);
      }
    });
  }

  // Get performance grade based on metrics
  getPerformanceGrade() {
    const fps = this.metrics.fps;
    const memoryUsage = this.metrics.memory.percentage;
    const cpuUsage = this.metrics.cpu.usage;

    if (fps >= 55 && memoryUsage < 70 && cpuUsage < 70) return 'A';
    if (fps >= 45 && memoryUsage < 80 && cpuUsage < 80) return 'B';
    if (fps >= 30 && memoryUsage < 90 && cpuUsage < 90) return 'C';
    if (fps >= 20) return 'D';
    return 'F';
  }

  // Export metrics for analysis
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      session_duration: Date.now() - this.metrics.timestamp,
      metrics: this.getMetrics(),
      performance_grade: this.getPerformanceGrade(),
      browser: navigator.userAgent,
      platform: navigator.platform
    };
  }
}

// Create global instance
export const performanceMonitor = new PerformanceMonitor();

// Export for debugging
window.performanceMonitor = performanceMonitor;