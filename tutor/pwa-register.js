if ('serviceWorker' in navigator) {
  // Register on DOMContentLoaded instead of waiting for window 'load' (all images/assets)
  const registerSW = () => {
    navigator.serviceWorker.register('../tutor/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration);
        
        setInterval(() => {
          registration.update();
        }, 60000);

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
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerSW);
  } else {
    registerSW();
  }
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

// Prompt shows instantly when the browser fires beforeinstallprompt
window.addEventListener('beforeinstallprompt', e => {
  console.log('beforeinstallprompt fired');
  e.preventDefault();
  deferredPrompt = e;
  
  if (!installPromptShown) {
    showInstallBanner();
    installPromptShown = true;
  }
});

window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  installPromptShown = true;
  deferredPrompt = null;
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.remove();
});

class PWAWindowManager {
  constructor() {
    this.isStandalone = window.navigator.standalone === true || 
                       window.matchMedia('(display-mode: standalone)').matches;
    this.windowStack = [];
    this.currentWindowId = this.generateId();
    this.isNavigating = false;
    
    console.log('PWA Standalone Mode:', this.isStandalone);
    console.log('Display Mode:', window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser');
    
    if (this.isStandalone) {
      this.init();
    }
  }

  generateId() {
    return `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  init() {
    sessionStorage.setItem('pwa_window_id', this.currentWindowId);
    this.windowStack.push(this.currentWindowId);
    
    sessionStorage.setItem('pwa_window_stack', JSON.stringify(this.windowStack));
    
    console.log('PWA Window initialized:', this.currentWindowId);

    this.handleBackButton();
    
    this.handleLinkNavigation();
    
    this.monitorVisibility();
  }

  handleBackButton() {
    window.addEventListener('popstate', (event) => {
      console.log('Popstate event triggered');
      
      if (history.length > 1) {
        history.back();
      } else {
        window.location.href = '/tutor/splash.html';
      }
    });

    document.addEventListener('backbutton', (event) => {
      event.preventDefault();
      if (history.length > 1) {
        history.back();
      } else if (window.cordova) {
        navigator.app.exitApp();
      }
    });
  }

  handleLinkNavigation() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      
      if (!link) return;

      const href = link.getAttribute('href');
      const target = link.getAttribute('target');
      const dataPrevent = link.getAttribute('data-prevent-pwa');
      
      if (dataPrevent === 'true') {
        return;
      }

      if (this.isNavigating) {
        console.log('Navigation in progress, skipping');
        event.preventDefault();
        return;
      }

      if (href === '#' || (href && href.startsWith('#'))) {
        return;
      }

      if (href && (href.startsWith('mailto:') || href.startsWith('tel:'))) {
        return;
      }

      if (href && href.startsWith('http')) {
        if (target === '_blank') {
          event.preventDefault();
          window.open(href, '_self');
        }
        return;
      }

      if (href && !href.startsWith('http')) {
        event.preventDefault();
        
        const absolutePath = this.resolveAbsolutePath(href);
        
        if (absolutePath !== window.location.pathname) {
          this.navigateTo(absolutePath);
        }
        return;
      }

    }, true);
  }

  resolveAbsolutePath(url) {
    if (url.startsWith('/')) {
      return url;
    }

    const currentPath = window.location.pathname;
    const parts = currentPath.split('/').filter(p => p);
    parts.pop();

    const urlParts = url.split('/');
    for (const part of urlParts) {
      if (part === '..') {
        parts.pop();
      } else if (part !== '.' && part !== '') {
        parts.push(part);
      }
    }

    return '/' + parts.join('/');
  }

  monitorVisibility() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('PWA app hidden');
      } else {
        console.log('PWA app visible');
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

  navigateTo(url) {
    if (!url || this.isNavigating) {
      return;
    }

    console.log('PWA navigating to:', url);
    this.isNavigating = true;

    window.location.href = url;

    setTimeout(() => {
      this.isNavigating = false;
    }, 2000);
  }

  goBack() {
    if (history.length > 1) {
      history.back();
    } else {
      window.location.href = '/tutor/splash.html';
    }
  }

  closeApp() {
    if (confirm('Close OAU ExamCompass?')) {
      sessionStorage.removeItem('pwa_window_id');
      sessionStorage.removeItem('pwa_window_stack');
      
      if (window.cordova) {
        navigator.app.exitApp();
      } else {
        window.close();
      }
    }
  }
}

const pwaWindowManager = new PWAWindowManager();

window.PWAWindowManager = PWAWindowManager;
window.pwaWindowManager = pwaWindowManager;
