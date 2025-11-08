class FloppyProtection {
  constructor(options = {}) {
    this.config = {
      difficulty: options.difficulty || 15,
      timeout: options.timeout || 500,
      displayTime: options.displayTime || 1500,
      fadeTime: options.fadeTime || 600,
      maxTime: options.maxTime || 30000,
      ...options,
    };

    this.overlay = null;
    this.isRunning = false;
    this.fetchBadUserAgents();
  }

  async fetchBadUserAgents() {
    const url =
      "https://raw.githubusercontent.com/mitchellkrogza/apache-ultimate-bad-bot-blocker/refs/heads/master/_generator_lists/bad-user-agents.list";

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch bad user-agents list: ${response.status}`,
        );
      }

      const text = await response.text();
      this.badUserAgents = text
        .split("\n")
        .filter(Boolean)
        .map((agent) => agent.replace(/\\/g, ""))
        .filter((agent) => agent !== "archive.org_bot"); // remove unwanted blockage of Archive.org bot
    } catch (error) {
      console.error(error.message);
    }
  }

  isHeadless() {
    if (navigator) return navigator.webdriver;
  }

  hasNoPlugins() {
    const pluginCount = navigator?.plugins?.length ?? 0;
    return pluginCount === 0;
  }

  hasSuspiciousResolution() {
    return screen.width < 100 || screen.height < 100;
  }

  sha256(str) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }

    const h = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
      0x1f83d9ab, 0x5be0cd19,
    ];

    const k = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
      0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
      0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
      0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
      0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
      0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
      0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
      0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
      0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];

    const bytes = new TextEncoder().encode(str);
    const bitLength = bytes.length * 8;

    const paddedBytes = new Uint8Array(bytes.length + 1);
    paddedBytes.set(bytes);
    paddedBytes[bytes.length] = 0x80;

    let totalLength = paddedBytes.length;
    while (totalLength % 64 !== 56) {
      totalLength++;
    }

    const finalBytes = new Uint8Array(totalLength + 8);
    finalBytes.set(paddedBytes);

    const bitLengthArray = new DataView(finalBytes.buffer, totalLength);
    bitLengthArray.setUint32(4, bitLength, false);

    for (let i = 0; i < finalBytes.length; i += 64) {
      const w = new Array(64);

      for (let j = 0; j < 16; j++) {
        w[j] =
          (finalBytes[i + j * 4] << 24) |
          (finalBytes[i + j * 4 + 1] << 16) |
          (finalBytes[i + j * 4 + 2] << 8) |
          finalBytes[i + j * 4 + 3];
      }

      for (let j = 16; j < 64; j++) {
        const s0 =
          rightRotate(w[j - 15], 7) ^
          rightRotate(w[j - 15], 18) ^
          (w[j - 15] >>> 3);
        const s1 =
          rightRotate(w[j - 2], 17) ^
          rightRotate(w[j - 2], 19) ^
          (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
      }

      // Initialize working variables
      let [a, b, c, d, e, f, g, h0] = h;

      for (let j = 0; j < 64; j++) {
        const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h0 + S1 + ch + k[j] + w[j]) >>> 0;
        const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) >>> 0;

        h0 = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }

      h[0] = (h[0] + a) >>> 0;
      h[1] = (h[1] + b) >>> 0;
      h[2] = (h[2] + c) >>> 0;
      h[3] = (h[3] + d) >>> 0;
      h[4] = (h[4] + e) >>> 0;
      h[5] = (h[5] + f) >>> 0;
      h[6] = (h[6] + g) >>> 0;
      h[7] = (h[7] + h0) >>> 0;
    }

    return h.map((value) => value.toString(16).padStart(8, "0")).join("");
  }

  randomString(length = 32) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
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

  async mine(difficulty = this.config.difficulty, message = "floppy") {
    const timestamp = Date.now();
    const startTime = Date.now();
    let nonce = 0;

    while (true) {
      if (Date.now() - startTime > this.config.maxTime) {
        throw new Error(`Verification timeout after ${this.config.maxTime}ms`);
      }

      const content = `floppy:${message}:${nonce}:${timestamp}`;
      const hash = this.sha256(content);

      if (this.countLeadingZeros(hash) >= difficulty) {
        return { difficulty, timestamp, nonce, message, hash };
      }

      nonce++;

      // Yielding to prevent browser freeze
      if (nonce % 1000 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  createOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "floppy-overlay";
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
    const statusEl = this.overlay.querySelector("#floppy-status");
    const spinnerEl = this.overlay.querySelector(".floppy-spinner");

    if (!this.badUserAgents) {
      await this.fetchBadUserAgents();
    }

    const userAgent = navigator.userAgent.toLowerCase();

    for (let badUA of this.badUserAgents) {
      if (userAgent.includes(badUA.toLowerCase())) {
        this.badUAdetected = true;
      }
    }

    if (this.isHeadless()) this.headlessBrowserDetected = true;
    if (this.hasNoPlugins()) this.noPluginsDetected = true;
    if (this.hasSuspiciousResolution()) this.susResDetected = true;

    setTimeout(async () => {
      try {
        if (this.badUAdetected) throw "Bad User Agent";
        if (this.headlessBrowserDetected) throw "Headless Browser";
        if (this.noPluginsDetected) throw "No Plugins Detected";
        if (this.susResDetected) throw "Suspicious Resolution Detected";

        const startTime = performance.now();
        const result = await this.mine(
          this.config.difficulty,
          this.randomString(),
        );
        const elapsed = Math.round(performance.now() - startTime);

        statusEl.textContent = "✅ Verification successful";
        statusEl.classList.add("floppy-success");
        spinnerEl.style.display = "none";

        setTimeout(() => {
          this.overlay.classList.add("floppy-done");
          setTimeout(() => {
            this.overlay?.remove();
            this.overlay = null;
            this.isRunning = false;
          }, this.config.fadeTime);
        }, this.config.displayTime);
      } catch (error) {
        console.error("[Floppy] Verification failed:", error);

        if (
          this.badUAdetected ||
          this.headlessBrowserDetected ||
          this.noPluginsDetected ||
          this.susResDetected
        ) {
          statusEl.textContent = "❌ Verification failed - " + error;
        } else {
          statusEl.textContent = "❌ Verification failed - Access denied";
        }

        statusEl.style.color = "#ef4444";
        spinnerEl.style.display = "none";

        const card = this.overlay.querySelector(".floppy-card");
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
    }, 150);
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
document.addEventListener("DOMContentLoaded", () => floppy.run());

window.Floppy = FloppyProtection;
