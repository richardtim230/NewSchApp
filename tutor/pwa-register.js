// PWA Registration with Auto-Install Banner & Fixed Updates
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../tutor/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdatePrompt(registration);
            }
          });
        });
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });

    navigator.serviceWorker.addEventListener('message', event => {
      console.log('Message from service worker:', event.data);
    });
  });
}

function showUpdatePrompt(registration) {
  const updatePrompt = document.createElement('div');
  updatePrompt.id = 'pwa-update-prompt';
  updatePrompt.innerHTML = `
    <div style="
      position: fixed;
      bottom: 80px;
      left: 16px;
      right: 16px;
      background: linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%);
      color: white;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      z-index: 999;
      font-family: 'Inter', sans-serif;
      animation: slideUp 0.3s ease-out;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
        <div style="flex: 1;">
          <p style="margin: 0; font-weight: 600; font-size: 14px;">App Update Available</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">A new version is ready to use</p>
        </div>
        <button id="pwa-update-btn" style="
          background: white;
          color: #2563eb;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
          Update
        </button>
      </div>
    </div>
    <style>
      @keyframes slideUp {
        from {
          transform: translateY(120%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    </style>
  `;

  document.body.appendChild(updatePrompt);

  document.getElementById('pwa-update-btn').addEventListener('click', () => {
    console.log('Update button clicked');
    
    if (registration.waiting) {
      console.log('Sending SKIP_WAITING message to service worker');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      const btn = document.getElementById('pwa-update-btn');
      btn.disabled = true;
      btn.innerText = 'Updating...';
      
      let controllerChanged = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!controllerChanged) {
          controllerChanged = true;
          console.log('Controller changed, reloading page...');
          updatePrompt.remove();
          window.location.reload();
        }
      });
      
      setTimeout(() => {
        if (!controllerChanged) {
          console.log('Fallback reload');
          window.location.reload();
        }
      }, 3000);
    } else {
      console.warn('No waiting service worker found');
      window.location.reload();
    }
  });
}

let deferredPrompt;
let installPromptShown = false;

function showInstallBanner() {
  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
      color: white;
      padding: 16px;
      z-index: 998;
      font-family: 'Inter', sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideDown 0.3s ease-out;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
        <div style="flex: 1;">
          <p style="margin: 0; font-weight: 600; font-size: 14px;">📱 Get OAU Community Hub</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.95;">Install our app for quick access</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="pwa-install-btn" style="
            background: white;
            color: #f59e0b;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 12px;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            Install
          </button>
          <button id="pwa-dismiss-btn" style="
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
          " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
            Later
          </button>
        </div>
      </div>
    </div>
    <style>
      @keyframes slideDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    </style>
  `;

  document.body.insertBefore(banner, document.body.firstChild);

  document.getElementById('pwa-install-btn').addEventListener('click', () => {
    console.log('Install button clicked');
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(choiceResult => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted installation');
        } else {
          console.log('User dismissed installation');
        }
        deferredPrompt = null;
        banner.remove();
      });
    }
  });

  document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
    console.log('Install banner dismissed');
    banner.remove();
    installPromptShown = true;
  });
}

window.addEventListener('beforeinstallprompt', e => {
  console.log('beforeinstallprompt fired');
  e.preventDefault();
  deferredPrompt = e;
  
  if (!installPromptShown) {
    setTimeout(() => {
      showInstallBanner();
      installPromptShown = true;
    }, 2000);
  }
});

window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  installPromptShown = true;
  deferredPrompt = null;
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.remove();
});

// ========== PWA WINDOW MANAGEMENT ==========

/**
 * Handle window navigation in PWA mode
 * Prevents closing the app when navigating between pages
 */
class PWAWindowManager {
  constructor() {
    this.isStandalone = window.navigator.standalone === true || 
                       window.matchMedia('(display-mode: standalone)').matches;
    this.windowStack = [];
    this.currentWindowId = this.generateId();
    
    console.log('PWA Standalone Mode:', this.isStandalone);
    
    if (this.isStandalone) {
      this.init();
    }
  }

  generateId() {
    return `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  init() {
    // Store current window in session
    sessionStorage.setItem('pwa_window_id', this.currentWindowId);
    this.windowStack.push(this.currentWindowId);
    
    // Update window stack
    sessionStorage.setItem('pwa_window_stack', JSON.stringify(this.windowStack));
    
    console.log('PWA Window initialized:', this.currentWindowId);

    // Handle back button behavior
    this.handleBackButton();
    
    // Handle external links
    this.handleExternalLinks();
    
    // Monitor page visibility
    this.monitorVisibility();
  }

  handleBackButton() {
    // Override default back button behavior in PWA
    window.addEventListener('popstate', (event) => {
      console.log('Popstate event triggered');
      
      // In standalone mode, use history.back() instead of closing
      if (history.length > 1) {
        history.back();
      } else {
        // If no history, go to home
        window.location.href = '/tutor/splash.html';
      }
    });

    // Handle Android back button via pause event
    document.addEventListener('backbutton', (event) => {
      event.preventDefault();
      if (history.length > 1) {
        history.back();
      } else {
        navigator.app.exitApp();
      }
    });
  }

  handleExternalLinks() {
    // Prevent opening links in new windows within PWA
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      
      if (!link) return;

      const href = link.getAttribute('href');
      const target = link.getAttribute('target');
      
      // Handle internal links
      if (href && href.startsWith('/')) {
        event.preventDefault();
        window.location.href = href;
        return;
      }

      // Handle target="_blank" - open in same window instead
      if (target === '_blank' && href) {
        event.preventDefault();
        window.location.href = href;
        return;
      }

      // Handle relative links
      if (href && !href.startsWith('http') && !href.startsWith('mailto')) {
        event.preventDefault();
        window.location.href = href;
        return;
      }
    }, true);
  }

  monitorVisibility() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('PWA app hidden');
      } else {
        console.log('PWA app visible');
        // Refresh data when app comes to foreground
        this.notifyServiceWorker('APP_VISIBLE');
      }
    });
  }

  notifyServiceWorker(action) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: action,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Navigate to URL while keeping PWA window alive
   */
  navigateTo(url) {
    // Push to history to enable back button
    history.pushState({ url }, '', url);
    window.location.href = url;
  }

  /**
   * Go back safely in PWA
   */
  goBack() {
    if (history.length > 1) {
      history.back();
    } else {
      // If no history, redirect to home
      window.location.href = '/tutor/splash.html';
    }
  }

  /**
   * Close PWA gracefully
   */
  closeApp() {
    if (confirm('Close OAU ExamCompass?')) {
      // Clear PWA data
      sessionStorage.removeItem('pwa_window_id');
      sessionStorage.removeItem('pwa_window_stack');
      
      // Attempt to close
      if (window.cordova) {
        navigator.app.exitApp();
      } else {
        window.close();
      }
    }
  }
}

// Initialize PWA Window Manager
const pwaWindowManager = new PWAWindowManager();

// Make available globally
window.PWAWindowManager = PWAWindowManager;
window.pwaWindowManager = pwaWindowManager;
