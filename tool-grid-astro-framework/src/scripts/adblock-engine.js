import JSZip from 'jszip';

export function setupUI() {
  const btnGenerate = document.getElementById('btn-generate');
  const levelSelect = document.getElementById('level-select');
  const nameInput = document.getElementById('name-input');
  
  btnGenerate?.addEventListener('click', async () => {
    btnGenerate.disabled = true;
    btnGenerate.textContent = "Compiling Extension...";

    const level = levelSelect?.value || 'standard';
    const extName = (nameInput?.value || 'Custom Ad-Blocker').trim();

    try {
      const zip = new JSZip();

      // 1. Generate Manifest V3
      const manifest = {
        "manifest_version": 3,
        "name": extName,
        "version": "1.0.0",
        "description": "Locally generated zero-trust ad blocker.",
        "permissions": [
          "declarativeNetRequest"
        ],
        "declarative_net_request": {
          "rule_resources": [
            {
              "id": "ruleset_1",
              "enabled": true,
              "path": "rules.json"
            }
          ]
        },
        "host_permissions": [
          "<all_urls>"
        ],
        "content_scripts": [
          {
            "matches": ["*://*.youtube.com/*"],
            "js": ["youtube-skipper.js"],
            "run_at": "document_end"
          }
        ]
      };

      // 2. Generate Rules
      const rules = [];
      let ruleId = 1;

      const addDomain = (domain) => {
        rules.push({
          "id": ruleId++,
          "priority": 1,
          "action": { "type": "block" },
          "condition": { "urlFilter": `||${domain}^`, "resourceTypes": ["main_frame", "sub_frame", "script", "image", "xmlhttprequest"] }
        });
      };

      // Standard ad domains
      const standardDomains = ['doubleclick.net', 'googleadservices.com', 'googlesyndication.com', 'amazon-adsystem.com', 'adnxs.com', 'criteo.com', 'taboola.com', 'outbrain.com', 'adsrvr.org'];
      // Aggressive domains (trackers)
      const aggressiveDomains = ['google-analytics.com', 'hotjar.com', 'facebook.net', 'pixel.facebook.com'];
      
      standardDomains.forEach(addDomain);
      if (level === 'aggressive' || level === 'paranoid') {
        aggressiveDomains.forEach(addDomain);
      }
      if (level === 'paranoid') {
        // block social widgets, etc
        addDomain('platform.twitter.com');
        addDomain('connect.facebook.net');
      }

      zip.file('manifest.json', JSON.stringify(manifest, null, 2));
      zip.file('rules.json', JSON.stringify(rules, null, 2));

      // 3. Generate YouTube Skipper
      const youtubeSkipperJS = `// youtube-skipper.js

const removeYouTubeAds = () => {
  // 1. Target the video player
  const video = document.querySelector('video');
  const adOverlay = document.querySelector('.ad-showing');

  if (video && adOverlay) {
    // Mute the ad to prevent audio spikes
    video.muted = true;
    
    // Jump to the end of the ad instantly
    if (video.duration) {
      video.currentTime = video.duration;
    }
    
    // Click the skip button if it exists in the DOM
    const skipButton = document.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button');
    if (skipButton) {
      skipButton.click();
    }
  }

  // 2. Remove static companion banners next to the video
  const companionAds = document.querySelectorAll('#companion, #panels, .ytd-companion-slot-renderer');
  companionAds.forEach(ad => ad.remove());
};

// Set up a high-performance observer to watch for DOM changes
const observer = new MutationObserver(removeYouTubeAds);

// Start observing the entire YouTube body for changes
observer.observe(document.body, { childList: true, subtree: true });
`;
      zip.file('youtube-skipper.js', youtubeSkipperJS);

      // 3. Generate extension icon via Canvas
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ef4444'; // red
      ctx.beginPath();
      ctx.arc(64, 64, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(34, 56, 60, 16);
      
      const iconData = canvas.toDataURL('image/png').split(',')[1];
      zip.file('icon.png', iconData, {base64: true});

      manifest.icons = {
        "128": "icon.png"
      };
      // rewrite manifest with icon
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));

      // 4. Generate Zip
      const content = await zip.generateAsync({type: 'blob'});
      const url = URL.createObjectURL(content);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${extName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`;
      link.click();

    } catch (e) {
      console.error(e);
      alert("Error generating extension.");
    } finally {
      btnGenerate.disabled = false;
      btnGenerate.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Extension .ZIP`;
    }
  });
}
