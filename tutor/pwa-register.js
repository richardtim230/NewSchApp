// PWA Registration Script with Auto-Install
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/tutor/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is ready
              showUpdatePrompt(registration);
            }
          });
        });
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });

    // Handle service worker messages
    navigator.serviceWorker.addEventListener('message', event => {
      console.log('Message from service worker:', event.data);
    });
  });
}

// Show update prompt to user
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
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    updatePrompt.remove();
    
    // Reload the page after update
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}

// AUTO-INSTALL: Trigger install prompt automatically after 3 seconds
let deferredPrompt;
let installPromptShown = false;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Auto-show install prompt after 3 seconds
  if (!installPromptShown) {
    setTimeout(() => {
      triggerAutoInstall();
    }, 3000);
  }
});

function triggerAutoInstall() {
  if (deferredPrompt && !installPromptShown) {
    installPromptShown = true;
    deferredPrompt.prompt();
    
    deferredPrompt.userChoice.then(choiceResult => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      deferredPrompt = null;
    });
  }
}

window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  installPromptShown = true;
  deferredPrompt = null;
});
