/**
 * Feedback Panel
 * Real-time performance metrics display for demo presentations
 */

import { performanceMonitor } from './performanceMonitor.js';

class FeedbackPanel {
  constructor() {
    this.panel = null;
    this.isVisible = false;
    this.position = { x: 20, y: 20 };
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };

    this.createPanel();
    this.bindEvents();

    // Update display every 100ms
    this.updateInterval = null;
  }

  createPanel() {
    this.panel = document.createElement('div');
    this.panel.className = 'feedback-panel';
    this.panel.innerHTML = `
      <div class="feedback-header">
        <span class="feedback-title">Performance Monitor</span>
        <div class="feedback-controls">
          <button class="feedback-minimize" title="Minimize">−</button>
          <button class="feedback-close" title="Close">×</button>
        </div>
      </div>
      <div class="feedback-content">
        <div class="metric-group">
          <div class="metric-title">Rendering</div>
          <div class="metric-row">
            <span class="metric-label">FPS:</span>
            <span class="metric-value" id="fps-value">0</span>
            <div class="metric-bar">
              <div class="metric-fill" id="fps-fill"></div>
            </div>
          </div>
          <div class="metric-row">
            <span class="metric-label">Frame Time:</span>
            <span class="metric-value" id="frametime-value">0ms</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Performance:</span>
            <span class="metric-value performance-grade" id="performance-grade">A</span>
          </div>
        </div>

        <div class="metric-group">
          <div class="metric-title">Memory</div>
          <div class="metric-row">
            <span class="metric-label">Used:</span>
            <span class="metric-value" id="memory-used">0 MB</span>
            <div class="metric-bar">
              <div class="metric-fill" id="memory-fill"></div>
            </div>
          </div>
          <div class="metric-row">
            <span class="metric-label">Total:</span>
            <span class="metric-value" id="memory-total">0 MB</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Usage:</span>
            <span class="metric-value" id="memory-percentage">0%</span>
          </div>
        </div>

        <div class="metric-group">
          <div class="metric-title">CPU</div>
          <div class="metric-row">
            <span class="metric-label">Usage:</span>
            <span class="metric-value" id="cpu-usage">0%</span>
            <div class="metric-bar">
              <div class="metric-fill" id="cpu-fill"></div>
            </div>
          </div>
          <div class="metric-row">
            <span class="metric-label">Load Avg:</span>
            <span class="metric-value" id="cpu-load">0</span>
          </div>
        </div>

        <div class="metric-group">
          <div class="metric-title">Hand Tracking</div>
          <div class="metric-row">
            <span class="metric-label">FPS:</span>
            <span class="metric-value" id="tracking-fps">0</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Latency:</span>
            <span class="metric-value" id="tracking-latency">0ms</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Confidence:</span>
            <span class="metric-value" id="tracking-confidence">0%</span>
          </div>
        </div>

        <div class="metric-group">
          <div class="metric-title">Audio</div>
          <div class="metric-row">
            <span class="metric-label">Latency:</span>
            <span class="metric-value" id="audio-latency">0ms</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Sample Rate:</span>
            <span class="metric-value" id="audio-samplerate">0 Hz</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">State:</span>
            <span class="metric-value" id="audio-state">suspended</span>
          </div>
        </div>

        <div class="metric-group">
          <div class="metric-title">Network</div>
          <div class="metric-row">
            <span class="metric-label">Type:</span>
            <span class="metric-value" id="network-type">unknown</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Bandwidth:</span>
            <span class="metric-value" id="network-bandwidth">0 Mbps</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">RTT:</span>
            <span class="metric-value" id="network-rtt">0ms</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.panel);
    this.setPosition(this.position.x, this.position.y);
  }

  bindEvents() {
    // Close button
    this.panel.querySelector('.feedback-close').addEventListener('click', () => {
      this.hide();
    });

    // Minimize button
    this.panel.querySelector('.feedback-minimize').addEventListener('click', () => {
      this.panel.classList.toggle('minimized');
    });

    // Dragging functionality
    const header = this.panel.querySelector('.feedback-header');

    header.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      const rect = this.panel.getBoundingClientRect();
      this.dragOffset.x = e.clientX - rect.left;
      this.dragOffset.y = e.clientY - rect.top;
      document.addEventListener('mousemove', this.handleDrag);
      document.addEventListener('mouseup', this.handleDragEnd);
      e.preventDefault();
    });

    this.handleDrag = (e) => {
      if (!this.isDragging) return;
      const x = e.clientX - this.dragOffset.x;
      const y = e.clientY - this.dragOffset.y;
      this.setPosition(x, y);
    };

    this.handleDragEnd = () => {
      this.isDragging = false;
      document.removeEventListener('mousemove', this.handleDrag);
      document.removeEventListener('mouseup', this.handleDragEnd);
    };

    // Performance monitor callback
    this.updateMetrics = (metrics) => {
      this.displayMetrics(metrics);
    };
  }

  setPosition(x, y) {
    this.position.x = Math.max(0, Math.min(x, window.innerWidth - this.panel.offsetWidth));
    this.position.y = Math.max(0, Math.min(y, window.innerHeight - this.panel.offsetHeight));

    this.panel.style.left = this.position.x + 'px';
    this.panel.style.top = this.position.y + 'px';
  }

  show() {
    if (this.isVisible) return;

    this.isVisible = true;
    this.panel.style.display = 'block';

    // Start performance monitoring
    performanceMonitor.start();
    performanceMonitor.onUpdate(this.updateMetrics);

    // Update display
    this.updateInterval = setInterval(() => {
      // Additional real-time updates can go here
    }, 100);

    console.log('Feedback panel shown');
  }

  hide() {
    if (!this.isVisible) return;

    this.isVisible = false;
    this.panel.style.display = 'none';

    // Stop performance monitoring
    performanceMonitor.stop();
    performanceMonitor.offUpdate(this.updateMetrics);

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    console.log('Feedback panel hidden');
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  displayMetrics(metrics) {
    // FPS and rendering
    document.getElementById('fps-value').textContent = metrics.fps;
    document.getElementById('frametime-value').textContent = metrics.frameTime + 'ms';
    document.getElementById('performance-grade').textContent = performanceMonitor.getPerformanceGrade();

    // Update FPS bar (0-60 FPS)
    const fpsPercentage = Math.min(100, (metrics.fps / 60) * 100);
    document.getElementById('fps-fill').style.width = fpsPercentage + '%';
    document.getElementById('fps-fill').className = 'metric-fill ' + this.getPerformanceClass(fpsPercentage);

    // Memory
    document.getElementById('memory-used').textContent = metrics.memory.used + ' MB';
    document.getElementById('memory-total').textContent = metrics.memory.total + ' MB';
    document.getElementById('memory-percentage').textContent = metrics.memory.percentage + '%';

    // Update memory bar
    const memoryFill = document.getElementById('memory-fill');
    memoryFill.style.width = metrics.memory.percentage + '%';
    memoryFill.className = 'metric-fill ' + this.getMemoryClass(metrics.memory.percentage);

    // CPU
    document.getElementById('cpu-usage').textContent = metrics.cpu.usage + '%';
    document.getElementById('cpu-load').textContent = metrics.cpu.loadAverage;

    // Update CPU bar
    const cpuFill = document.getElementById('cpu-fill');
    cpuFill.style.width = metrics.cpu.usage + '%';
    cpuFill.className = 'metric-fill ' + this.getCPUClass(metrics.cpu.usage);

    // Hand tracking
    document.getElementById('tracking-fps').textContent = metrics.handTracking.fps;
    document.getElementById('tracking-latency').textContent = metrics.handTracking.latency + 'ms';
    document.getElementById('tracking-confidence').textContent = Math.round(metrics.handTracking.confidence * 100) + '%';

    // Audio
    document.getElementById('audio-latency').textContent = metrics.audio.latency + 'ms';
    document.getElementById('audio-samplerate').textContent = metrics.audio.sampleRate + ' Hz';
    document.getElementById('audio-state').textContent = metrics.audio.state;

    // Network
    document.getElementById('network-type').textContent = metrics.network.effectiveType || 'unknown';
    document.getElementById('network-bandwidth').textContent = metrics.network.bandwidth + ' Mbps';
    document.getElementById('network-rtt').textContent = metrics.network.rtt + 'ms';

    // Update performance grade styling
    const gradeElement = document.getElementById('performance-grade');
    gradeElement.className = 'metric-value performance-grade grade-' + performanceMonitor.getPerformanceGrade().toLowerCase();
  }

  getPerformanceClass(percentage) {
    if (percentage >= 90) return 'excellent';
    if (percentage >= 75) return 'good';
    if (percentage >= 50) return 'fair';
    return 'poor';
  }

  getMemoryClass(percentage) {
    if (percentage >= 90) return 'poor';
    if (percentage >= 75) return 'fair';
    if (percentage >= 50) return 'good';
    return 'excellent';
  }

  getCPUClass(percentage) {
    if (percentage >= 90) return 'poor';
    if (percentage >= 75) return 'fair';
    if (percentage >= 50) return 'good';
    return 'excellent';
  }

  // Export current metrics for presentation
  exportMetrics() {
    return performanceMonitor.exportMetrics();
  }

  // Take a screenshot of current metrics
  takeSnapshot() {
    const metrics = this.exportMetrics();
    const snapshot = {
      ...metrics,
      snapshot_time: new Date().toLocaleString(),
      url: window.location.href
    };

    console.log('Performance Snapshot:', snapshot);

    // Copy to clipboard if supported
    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2))
        .then(() => console.log('Snapshot copied to clipboard'))
        .catch(err => console.warn('Could not copy to clipboard:', err));
    }

    return snapshot;
  }
}

// Create and export global instance
export const feedbackPanel = new FeedbackPanel();

// Global keyboard shortcut (Ctrl/Cmd + Shift + P)
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
    e.preventDefault();
    feedbackPanel.toggle();
  }
});

// Export for debugging
window.feedbackPanel = feedbackPanel;