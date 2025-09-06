class FloppyProtection {
  constructor(options = {}) {
    this.config = {
      difficulty: options.difficulty || 15,
      timeout: options.timeout || 500,
      displayTime: options.displayTime || 1500,
      fadeTime: options.fadeTime || 600,
      maxTime: options.maxTime || 30000,
      ...options
    };
    
    this.overlay = null;
    this.isRunning = false;
  }

  async sha256(str) {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  randomString(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => chars[byte % chars.length]).join('');
  }

  countLeadingZeros(hex) {
    let zeros = 0;
    for (const char of hex) {
      const nibble = parseInt(char, 16);
      if (nibble === 0) {
        zeros += 4;
      } else {
        zeros += Math.clz32(nibble) - 28;
        break;
      }
    }
    return zeros;
  }

  async mine(difficulty = this.config.difficulty, message = 'floppy') {
    const timestamp = Date.now();
    const startTime = Date.now();
    let nonce = 0;

    while (true) {
      if (Date.now() - startTime > this.config.maxTime) {
        throw new Error(`Verification timeout after ${this.config.maxTime}ms`);
      }

      const content = `floppy:${message}:${nonce}:${timestamp}`;
      const hash = await this.sha256(content);
      
      if (this.countLeadingZeros(hash) >= difficulty) {
        return { difficulty, timestamp, nonce, message, hash };
      }
      
      nonce++;
      if (nonce % this.config.timeout === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }

  // UI creation
  createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'floppy-overlay';
    overlay.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');
        
        #floppy-overlay {
          position: fixed;
          inset: 0;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999999;
          transition: opacity 0.4s ease;
          font-family: 'JetBrains Mono', monospace;
        }
        
        #floppy-overlay.floppy-done { opacity: 0; pointer-events: none; }
        
        .floppy-card {
          background: #1a1a1a;
          border: 1px solid #2d2d2d;
          border-radius: 8px;
          padding: 48px 40px;
          max-width: 420px;
          width: calc(100% - 32px);
          text-align: center;
          box-shadow: 0 4px 24px rgba(0,0,0,0.4);
          animation: slideUp 0.2s ease-out;
        }
        
        .floppy-spinner {
          width: 32px;
          height: 32px;
          border: 2px solid #2d2d2d;
          border-top: 2px solid #4a9eff;
          border-radius: 50%;
          animation: spin 1.2s linear infinite;
          margin: 0 auto 32px;
        }
        
        .floppy-card h2 {
          font-size: 18px;
          font-weight: 400;
          color: #e8e8e8;
          margin: 0 0 20px;
          line-height: 1.5;
          letter-spacing: -0.025em;
        }
        
        .floppy-card p {
          font-size: 14px;
          color: #9ca3af;
          margin: 0 0 12px;
          line-height: 1.6;
        }
        
        #floppy-status {
          color: #4a9eff;
          font-weight: 400;
        }
        
        .floppy-card small {
          font-size: 12px;
          color: #6b7280;
          display: block;
          margin-top: 20px;
        }
        
        .floppy-footer {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 6px;
          color: #6b7280;
          font-size: 11px;
        }
        
        .floppy-icon { font-size: 12px; }
        
        .floppy-link {
          color: #4a9eff;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        
        .floppy-link:hover {
          color: #3b82f6;
          text-decoration: underline;
        }
        
        .floppy-success { color: #10b981 !important; }
        
        @keyframes spin { to { transform: rotate(360deg); } }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        @media (max-width: 500px) {
          .floppy-card { padding: 32px 24px; margin: 16px; }
        }
      </style>
      <div class="floppy-card">
        <div class="floppy-spinner"></div>
        <h2>Checking your browser before accessing the website</h2>
        <p id="floppy-status">Performing security verification...</p>
        <small>This process is automatic and may take a few seconds.</small>
      </div>
      <div class="floppy-footer">
        <div class="floppy-icon">💾</div>
        <span>This website is protected by <a href="https://github.com/alessandromrc/Floppy" target="_blank" class="floppy-link">Floppy</a></span>
      </div>
    `;
    
    document.body.appendChild(overlay);
    return overlay;
  }

  async run() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.overlay = this.createOverlay();
    const statusEl = this.overlay.querySelector('#floppy-status');
    const spinnerEl = this.overlay.querySelector('.floppy-spinner');

    try {
      const startTime = performance.now();
      const result = await this.mine(this.config.difficulty, this.randomString());
      const elapsed = Math.round(performance.now() - startTime);

      statusEl.textContent = '✅ Verification successful';
      statusEl.classList.add('floppy-success');
      spinnerEl.style.display = 'none';

      setTimeout(() => {
        this.overlay.classList.add('floppy-done');
        setTimeout(() => {
          this.overlay?.remove();
          this.overlay = null;
          this.isRunning = false;
        }, this.config.fadeTime);
      }, this.config.displayTime);

    } catch (error) {
      console.error('[Floppy] Verification failed:', error);
      
      statusEl.textContent = '❌ Verification failed - Access denied';
      statusEl.style.color = '#ef4444';
      spinnerEl.style.display = 'none';
      
      const card = this.overlay.querySelector('.floppy-card');
      card.innerHTML += `
        <button onclick="location.reload()" style="
          background: #ef4444;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          margin-top: 20px;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
        ">Retry</button>
      `;
          }
  }

  cleanup() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.isRunning = false;
  }
}

const floppy = new FloppyProtection({ difficulty: 18 });
document.addEventListener('DOMContentLoaded', () => floppy.run());

window.Floppy = FloppyProtection;