
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
    
    // Find the waiting service worker
    if (registration.waiting) {
      console.log('Sending SKIP_WAITING message to service worker');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Show loading state
      const btn = document.getElementById('pwa-update-btn');
      btn.disabled = true;
      btn.innerText = 'Updating...';
      
      // Wait for controller change and reload
      let controllerChanged = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!controllerChanged) {
          controllerChanged = true;
          console.log('Controller changed, reloading page...');
          updatePrompt.remove();
          window.location.reload();
        }
      });
      
      // Fallback reload after 3 seconds if no controller change
      setTimeout(() => {
        if (!controllerChanged) {
          console.log('Fallback reload');
          window.location.reload();
        }
      }, 3000);
    } else {
      console.warn('No waiting service worker found');
      // Just reload if no waiting worker
      window.location.reload();
    }
  });
}

let deferredPrompt;
let installPromptShown = false;

// Show install banner
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
    // Don't show banner again this session
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
