document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initMobileMenu();
  initCanvasBackground();
  initStructureViewer();
  initPublicationsFilter();
  initContactForm();
  initCarousels();
  init3DTilt();
  initThemeToggle();
  initMascotPiku();
  initTeamModal();
  initAdminModeTrigger();
  syncHomeResearchThemes();
});

/* =========================================================================
   Tab Navigation
   ========================================================================= */
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const sections = document.querySelectorAll('.tab-section');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetSection = tab.getAttribute('data-target');
      if (!targetSection) return;

      // Update active nav buttons
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Toggle active sections
      sections.forEach(sec => {
        if (sec.id === targetSection) {
          sec.classList.add('active');
          
          // Load 3Dmol viewer if entering solved structures tab and not loaded yet
          if (targetSection === 'structures') {
            if (!window.activeViewer) {
              loadViewerScripts(() => {
                if (!sec.classList.contains('active') || window.activeViewer) return;
                const activeBtn = document.querySelector('.structure-btn.active');
                const pdbId = activeBtn ? activeBtn.getAttribute('data-pdb') : '6WKR';
                loadStructure(pdbId);
              });
            } else {
              window.activeViewer.resize();
            }
          }
        } else {
          sec.classList.remove('active');
          // Unload 3Dmol viewer when leaving solved structures tab to free WebGL resources
          if (sec.id === 'structures') {
            unloadStructureViewer();
          }
        }
      });

      // Close mobile menu on click
      const mobileNav = document.getElementById('main-nav');
      if (mobileNav) {
        mobileNav.classList.remove('open');
      }
    });
  });
}

/* =========================================================================
   Mobile Menu Toggle
   ========================================================================= */
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-toggle');
  const mobileNav = document.getElementById('main-nav');

  if (toggleBtn && mobileNav) {
    toggleBtn.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
    });
  }
}

/* =========================================================================
   Background Canvas Animation (Chromatin/Biomolecule Particle Network)
   ========================================================================= */
function initCanvasBackground() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const points = Array.from({ length: 45 }, (_, index) => ({
    x: Math.random(),
    y: Math.random(),
    radius: Math.random() * 3 + 1.5,
    useFirstColor: index % 2 === 0
  }));
  let drawFrame = null;

  function drawBackground() {
    drawFrame = null;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const firstColor = dark ? 'rgba(212, 175, 55, 0.55)' : 'rgba(138, 109, 59, 0.4)';
    const secondColor = dark ? 'rgba(255, 242, 178, 0.4)' : 'rgba(15, 23, 42, 0.35)';
    const lineColor = dark ? '212, 175, 55' : '138, 109, 59';
    const count = width <= 768 ? 24 : points.length;
    const connectionDistance = 140;

    ctx.lineWidth = 0.8;
    for (let i = 0; i < count; i++) {
      const point = points[i];
      const x = point.x * width;
      const y = point.y * height;
      for (let j = i + 1; j < count; j++) {
        const otherX = points[j].x * width;
        const otherY = points[j].y * height;
        const distance = Math.hypot(x - otherX, y - otherY);
        if (distance >= connectionDistance) continue;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(otherX, otherY);
        ctx.strokeStyle = 'rgba(' + lineColor + ', ' + ((1 - distance / connectionDistance) * 0.12) + ')';
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(x, y, point.radius, 0, Math.PI * 2);
      ctx.fillStyle = point.useFirstColor ? firstColor : secondColor;
      ctx.fill();
    }
  }

  function scheduleDraw() {
    if (drawFrame === null) drawFrame = requestAnimationFrame(drawBackground);
  }
  window.addEventListener('resize', scheduleDraw);
  new MutationObserver(scheduleDraw).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });
  scheduleDraw();
}

/* =========================================================================
   Interactive 3Dmol.js Viewer for solved structures
   ========================================================================= */
const structuresData = {
  '6WKR': {
    name: 'PRC2-AEBP2-JARID2 Bound to Nucleosome',
    method: 'Single Particle Cryo-EM (3.5 Å)',
    description: 'Human Polycomb Repressive Complex 2 (PRC2) in complex with cofactors AEBP2 and JARID2, engaged on an H2AK119ub1-modified nucleosome substrate.'
  },
  '8FYH': {
    name: 'Human PRC2 Bound to G-quadruplex RNA',
    method: 'Single Particle Cryo-EM (3.4 Å)',
    description: 'Structure of human Polycomb Repressive Complex 2 (PRC2) dimerized by G-quadruplex (G4) RNA, showing how RNA inhibits PRC2 activity on chromatin by blocking DNA and histone H3 tail accessibility.'
  },
  '6C23': {
    name: 'Human PRC2-AEBP2 Complex',
    method: 'Single Particle Cryo-EM (4.2 Å)',
    description: 'Visualization of human PRC2 core with cofactor AEBP2 bound in the active state, elucidating cofactor-mediated regulation.'
  },
  '6C24': {
    name: 'Human PRC2 with AEBP2 and JARID2',
    method: 'Single Particle Cryo-EM (3.9 Å)',
    description: 'Active state assembly of human PRC2 containing both cofactors AEBP2 and JARID2, providing architectural clues into gene silencing regulation.'
  },
  '8VMJ': {
    name: 'PRC2 with an H3K4me3-modified nucleosome',
    method: 'Single Particle Cryo-EM (3.1 \u00c5)',
    description: '<a href="https://www.rcsb.org/structure/8VMJ" target="_blank" rel="noopener">View entry 8VMJ at RCSB PDB</a>.'
  },
  '8VOB': {
    name: 'PRC2 with an H3K36me3-modified nucleosome',
    method: 'Single Particle Cryo-EM (3.1 \u00c5)',
    description: '<a href="https://www.rcsb.org/structure/8VOB" target="_blank" rel="noopener">View entry 8VOB at RCSB PDB</a>.'
  },
  'prc2-cyclophe': {
    name: 'PRC2 with cycloPhe (compact)',
    method: 'Cryo-EM coordinate model',
    description: 'Viewer copy of the supplied mmCIF coordinates.',
    file: 'structures/PRC2_cycloPhe_compact_viewer.pdb',
    format: 'pdb'
  },
  'mecp2-hmlink': {
    name: 'MeCP2 hmLinker model',
    method: 'Model resolution: 3.05 \u00c5',
    description: 'View the supplied PDB coordinates.',
    file: 'structures/hmLinker_MeCP2.pdb',
    format: 'pdb'
  },
  'mecp2-nuc': {
    name: 'Two MeCP2 molecules with a nucleosome',
    method: 'Model resolution: 2.80 \u00c5',
    description: 'View the supplied PDB coordinates.',
    file: 'structures/2MeCP2_nuc.pdb',
    format: 'pdb'
  },
  'dnmt1-full-length': {
    name: 'Full-length DNMT1',
    method: 'Model resolution: 5.00 \u00c5',
    description: 'View the supplied PDB coordinates.',
    file: 'structures/FL_DNMT1_Model.pdb',
    format: 'pdb'
  },
  'dnmt1-delta-1-619': {
    name: 'DNMT1 lacking residues 1-619',
    method: 'Model resolution: 2.50 \u00c5',
    description: 'View the supplied PDB coordinates.',
    file: 'structures/DNMT1_delta1_619_Model.pdb',
    format: 'pdb'
  },
  '5HYN': {
    name: 'Human PRC2 Core (Fitted in EMD-7306/7310/7312)',
    method: 'X-Ray Crystallography (2.7 Å)',
    description: 'Since only the 3D EM density maps were deposited for the dual-nucleosome engaged state, this viewer displays the human PRC2 core structure (PDB 5HYN) that was used for rigid-body fitting into the cryo-EM envelopes. View maps on EMDB: <a href="https://www.ebi.ac.uk/emdb/EMD-7306" target="_blank" rel="noopener noreferrer" style="color: var(--color-primary); text-decoration: underline; font-weight: 600;">EMD-7306</a>, <a href="https://www.ebi.ac.uk/emdb/EMD-7310" target="_blank" rel="noopener noreferrer" style="color: var(--color-primary); text-decoration: underline; font-weight: 600;">EMD-7310</a>, and <a href="https://www.ebi.ac.uk/emdb/EMD-7312" target="_blank" rel="noopener noreferrer" style="color: var(--color-primary); text-decoration: underline; font-weight: 600;">EMD-7312</a>.'
  }
};

let currentStyle = 'cartoon';
let isSpinning = false;

function initStructureViewer() {
  const viewerContainer = document.getElementById('viewer-viewport');
  const structureButtons = document.querySelectorAll('.structure-btn');
  const infoTitle = document.getElementById('struct-info-title');
  const infoMethod = document.getElementById('struct-info-method');
  const infoDesc = document.getElementById('struct-info-desc');

  if (!viewerContainer || structureButtons.length === 0) return;

  structureButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      structureButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const pdbId = btn.getAttribute('data-pdb');
      
      // Update info box
      if (structuresData[pdbId]) {
        infoTitle.textContent = structuresData[pdbId].name;
        infoMethod.textContent = structuresData[pdbId].method;
        infoDesc.innerHTML = structuresData[pdbId].description;
      }
      
      if (window.jQuery && window.$3Dmol) {
        loadStructure(pdbId);
      }
    });
  });

  // UI View controls
  const spinBtn = document.getElementById('btn-spin');
  const styleBtn = document.getElementById('btn-style');
  const resetBtn = document.getElementById('btn-reset');

  if (spinBtn) {
    spinBtn.addEventListener('click', () => {
      isSpinning = !isSpinning;
      if (window.activeViewer) {
        if (isSpinning) {
          window.activeViewer.spin(true);
          spinBtn.textContent = 'Pause Rotation';
        } else {
          window.activeViewer.spin(false);
          spinBtn.textContent = 'Auto Rotate';
        }
      }
    });
  }

  if (styleBtn) {
    styleBtn.addEventListener('click', () => {
      if (window.activeViewer) {
        if (currentStyle === 'cartoon') {
          currentStyle = 'sphere';
          window.activeViewer.setStyle({}, { sphere: {} });
          styleBtn.textContent = 'Style: Sphere';
        } else if (currentStyle === 'sphere') {
          currentStyle = 'stick';
          window.activeViewer.setStyle({}, { stick: {} });
          styleBtn.textContent = 'Style: Stick';
        } else {
          currentStyle = 'cartoon';
          window.activeViewer.setStyle({}, { cartoon: { color: 'spectrum' } });
          styleBtn.textContent = 'Style: Cartoon';
        }
        window.activeViewer.render();
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (window.activeViewer) {
        window.activeViewer.zoomTo();
        window.activeViewer.render();
      }
    });
  }

  // Toggle info box functionality
  const infoBox = document.getElementById('viewer-info-box');
  const infoToggle = document.getElementById('btn-info-toggle');
  const infoClose = document.getElementById('btn-info-close');

  if (infoBox && infoToggle && infoClose) {
    infoToggle.addEventListener('click', () => {
      infoBox.classList.add('show');
      infoToggle.style.opacity = '0';
      infoToggle.style.pointerEvents = 'none';
    });

    infoClose.addEventListener('click', () => {
      infoBox.classList.remove('show');
      infoToggle.style.opacity = '1';
      infoToggle.style.pointerEvents = 'auto';
    });
  }
}

const structureAssetBase = new URL('.', document.currentScript.src);
let structureRequest;

function loadStructure(pdbId) {
  const container = document.getElementById('viewer-viewport');
  if (!container) return;

  unloadStructureViewer();
  const structure = structuresData[pdbId];

  // Set up loader indicator
  const loader = document.createElement('div');
  loader.className = 'loader-indicator';
  loader.innerHTML = `
    <img src="assets/piku_cutout.webp" class="piku-loader-img" alt="Piku loading molecular structure">
    <div class="piku-loader-text">Loading ${structure?.name || pdbId}...</div>
  `;
  container.appendChild(loader);

  try {
    // Initialize 3Dmol viewer inside jQuery selection as required by 3Dmol API
    const element = $(container);
    const config = { defaultcolors: $3Dmol.rasmolElementColors };
    const viewer = $3Dmol.createViewer(element, config);
    window.activeViewer = viewer;

    function renderModel() {
      if (window.activeViewer !== viewer) return;
      // Remove loader text
      const loadMsg = container.querySelector('.loader-indicator');
      if (loadMsg) loadMsg.remove();

      // Style representation
      if (currentStyle === 'cartoon') {
        viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
      } else if (currentStyle === 'sphere') {
        viewer.setStyle({}, { sphere: {} });
      } else {
        viewer.setStyle({}, { stick: {} });
      }

      viewer.zoomTo();
      viewer.render();
      
      // Keep spin setting
      if (isSpinning) {
        viewer.spin(true);
      }
    }

    if (structure?.file) {
      structureRequest = new AbortController();
      fetch(new URL(structure.file, structureAssetBase), { signal: structureRequest.signal })
        .then(response => {
          if (!response.ok) throw new Error('Coordinate request failed: ' + response.status);
          return response.text();
        })
        .then(data => {
          if (window.activeViewer !== viewer) return;
          const model = viewer.addModel(data, structure.format);
          if (!model.selectedAtoms({}).length) throw new Error('The model contains no atoms');
          renderModel();
        })
        .catch(error => {
          if (error.name === 'AbortError' || window.activeViewer !== viewer) return;
          console.error(error);
          loader.textContent = location.protocol === 'file:'
            ? 'Open the site through the local preview server to view this model.'
            : 'Unable to load these coordinates.';
        });
    } else {
      $3Dmol.download('pdb:' + pdbId, viewer, {}, renderModel);
    }
  } catch (error) {
    console.error("Failed to load 3Dmol viewer:", error);
    loader.textContent = "Error loading 3D molecular viewer. Check connection.";
  }
}

function unloadStructureViewer() {
  structureRequest?.abort();
  structureRequest = null;
  if (window.activeViewer) {
    try {
      window.activeViewer.spin(false);
      window.activeViewer.clear();
    } catch (e) {
      console.error("Error clearing activeViewer:", e);
    }
    window.activeViewer = null;
  }
  const container = document.getElementById('viewer-viewport');
  if (container) {
    container.innerHTML = '';
  }
}

let viewerScriptsPromise;

function loadViewerScripts(callback) {
  if (window.jQuery && window.$3Dmol) {
    callback();
    return;
  }

  if (!viewerScriptsPromise) {
    const loadScript = source => new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = source;
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        reject(new Error('Failed to load ' + source));
      };
      document.body.appendChild(script);
    });

    viewerScriptsPromise = (window.jQuery
      ? Promise.resolve()
      : loadScript('https://code.jquery.com/jquery-3.6.0.min.js')
    ).then(() => {
      if (!window.$3Dmol) return loadScript('https://3dmol.org/build/3Dmol-min.js');
    }).catch(error => {
      viewerScriptsPromise = null;
      throw error;
    });
  }

  const container = document.getElementById('viewer-viewport');
  if (container) container.textContent = 'Loading the 3D viewer...';

  viewerScriptsPromise.then(callback, error => {
    console.error(error);
    if (container && document.getElementById('structures').classList.contains('active')) {
      container.textContent = 'Unable to load the 3D viewer. Reopen Structures to retry.';
    }
  });
}

/* =========================================================================
   Contact Form Validation
   ========================================================================= */
function initContactForm() {
  const form = document.getElementById('lab-contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Sending Message...';
    btn.disabled = true;

    const name = document.getElementById('input-name').value;
    const email = document.getElementById('input-email').value;
    const message = document.getElementById('input-message').value;

    fetch("https://formsubmit.co/ajax/vignesh@colorado.edu", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        Name: name,
        Email: email,
        Message: message
      })
    })
    .then(response => {
      if (response.ok) {
        alert('Thank you! Your message has been sent. We will get back to you shortly.');
        form.reset();
      } else {
        alert('Oops! There was a problem sending your message. Please try again or email directly.');
      }
    })
    .catch(error => {
      console.error('Error sending message:', error);
      alert('Oops! There was a problem sending your message. Please check your connection and try again.');
    })
    .finally(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    });
  });
}

/* =========================================================================
   Publications Filter
   ========================================================================= */
function initPublicationsFilter() {
  const filterBtns = document.querySelectorAll('.pub-filter-btn');
  const pubItems = document.querySelectorAll('.publication-item');

  if (filterBtns.length === 0 || pubItems.length === 0) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Toggle active states on buttons
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterVal = btn.id.replace('filter-', ''); // 'all', 'recent', or 'prc'

      pubItems.forEach(item => {
        const categories = item.getAttribute('data-category').split(' ');
        if (filterVal === 'all' || categories.includes(filterVal)) {
          item.style.display = 'grid'; // matches default display style
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
}

/* =========================================================================
   Carousels (Hero and News)
   ========================================================================= */
function rotateWhenVisible(element, advance, delay) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let timer;

  function reset() {
    clearInterval(timer);
    if (visible && !document.hidden && !reducedMotion.matches) {
      timer = setInterval(advance, delay);
    }
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    reset();
  }).observe(element);
  document.addEventListener('visibilitychange', reset);
  reducedMotion.addEventListener('change', reset);
  return reset;
}

function initCarousels() {
  // Hero Carousel Setup
  const heroSlides = document.querySelectorAll('#hero-media .carousel-slide');
  if (heroSlides.length > 0) {
    let currentHeroIndex = 0;
    rotateWhenVisible(heroSlides[0].parentElement, () => {
      heroSlides[currentHeroIndex].classList.remove('active');
      currentHeroIndex = (currentHeroIndex + 1) % heroSlides.length;
      heroSlides[currentHeroIndex].classList.add('active');
    }, 5000); // 5 seconds per slide
  }

  // News Carousel Setup
  const newsCarousel = document.querySelector('.news-carousel');
  const newsCards = document.querySelectorAll('.news-carousel .news-card');
  const newsDotsContainer = document.querySelector('.news-dots');
  
  if (newsCarousel && newsCards.length > 0 && newsDotsContainer) {
    let currentNewsIndex = 0;
    
    // Create dots
    newsCards.forEach((card, index) => {
      const dot = document.createElement('div');
      dot.className = 'carousel-dot';
      if (index === 0) dot.classList.add('active');
      dot.addEventListener('click', () => {
        goToNewsSlide(index);
        // Reset interval on manual click
        resetNewsRotation();
      });
      newsDotsContainer.appendChild(dot);
    });

    const dots = document.querySelectorAll('.news-dots .carousel-dot');

    function goToNewsSlide(index) {
      newsCards[currentNewsIndex].classList.remove('active');
      dots[currentNewsIndex].classList.remove('active');
      
      currentNewsIndex = index;
      
      newsCards[currentNewsIndex].classList.add('active');
      dots[currentNewsIndex].classList.add('active');
    }

    function nextNewsSlide() {
      const nextIndex = (currentNewsIndex + 1) % newsCards.length;
      goToNewsSlide(nextIndex);
    }

    const resetNewsRotation = rotateWhenVisible(newsCarousel, nextNewsSlide, 6000);
  }

  // Lab Gallery Carousels (Lab Photos, Shenanigans, Life Outside)
  const galleryCarousels = document.querySelectorAll('.carousel-container');
  galleryCarousels.forEach(container => {
    // Ignore the hero media container if styled similarly
    if (container.id === 'hero-media') return;

    const track = container.querySelector('.carousel-track');
    const prevBtn = container.querySelector('.carousel-control.prev');
    const nextBtn = container.querySelector('.carousel-control.next');

    if (!track || !prevBtn || !nextBtn) return;

    const getScrollAmount = () => {
      const firstItem = track.querySelector('.carousel-item');
      if (firstItem) {
        return firstItem.getBoundingClientRect().width + 20; // width + gap
      }
      return 340;
    };

    nextBtn.addEventListener('click', () => {
      track.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
    });

    prevBtn.addEventListener('click', () => {
      track.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
    });

    // Hide control arrows at scroll boundaries
    const toggleControls = () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      prevBtn.style.opacity = track.scrollLeft <= 5 ? '0.2' : '1';
      prevBtn.style.pointerEvents = track.scrollLeft <= 5 ? 'none' : 'auto';
      nextBtn.style.opacity = track.scrollLeft >= maxScroll - 5 ? '0.2' : '1';
      nextBtn.style.pointerEvents = track.scrollLeft >= maxScroll - 5 ? 'none' : 'auto';
    };

    track.addEventListener('scroll', toggleControls);
    // Run initial check after rendering
    setTimeout(toggleControls, 200);
    // Also run on resize since width changes
    window.addEventListener('resize', toggleControls);
  });
}

/* =========================================================================
   3D Mouse Tilt Parallax Effect
   ========================================================================= */
function init3DTilt() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return;
  const cards = document.querySelectorAll('.glass-card, .research-card, .team-card, .position-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Maximum tilt in degrees
      const maxRotate = 8;
      
      const rotateX = ((centerY - y) / centerY) * maxRotate;
      const rotateY = ((x - centerX) / centerX) * maxRotate;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(12px) translateY(-5px)`;
      card.style.boxShadow = `0 20px 40px rgba(0, 0, 0, 0.45), 0 0 30px rgba(212, 175, 55, 0.25)`;
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0) translateY(0)';
      card.style.boxShadow = '';
      card.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.5s ease';
    });
    
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.1s ease, box-shadow 0.1s ease';
    });
  });
}

/* =========================================================================
   Light / Dark Theme Toggle
   Default theme is light. Toggling sets data-theme="dark" on <html> and saves
   the choice. The canvas background follows automatically (see themePalette).
   ========================================================================= */
function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  const syncIcon = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    btn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  };
  syncIcon();

  btn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('kaslab-theme', next); } catch (e) {}
    syncIcon();
  });
}

/* =========================================================================
   Interactive Lightbox Modal for Gallery Images
   ========================================================================= */
let activeGalleryItems = [];
let currentLightboxIndex = -1;

window.openLightbox = function(itemElement) {
  const galleryType = itemElement.getAttribute('data-gallery');
  const index = parseInt(itemElement.getAttribute('data-index'), 10);
  
  // Find all items in this gallery to enable next/prev navigation
  activeGalleryItems = Array.from(document.querySelectorAll(`.carousel-item[data-gallery="${galleryType}"]`));
  currentLightboxIndex = index;
  
  updateLightbox();
  
  const lightbox = document.getElementById('gallery-lightbox');
  if (lightbox) {
    lightbox.setAttribute('aria-hidden', 'false');
  }
};

window.closeLightbox = function() {
  const lightbox = document.getElementById('gallery-lightbox');
  if (lightbox) {
    lightbox.setAttribute('aria-hidden', 'true');
  }
};

window.changeLightboxImage = function(direction) {
  if (activeGalleryItems.length === 0) return;
  
  currentLightboxIndex = (currentLightboxIndex + direction + activeGalleryItems.length) % activeGalleryItems.length;
  updateLightbox();
};

function updateLightbox() {
  if (currentLightboxIndex < 0 || currentLightboxIndex >= activeGalleryItems.length) return;
  
  const item = activeGalleryItems[currentLightboxIndex];
  const img = item.querySelector('img');
  const title = item.querySelector('h4');
  const desc = item.querySelector('p');
  
  const lbImg = document.getElementById('lightbox-img');
  const lbTitle = document.getElementById('lightbox-title');
  const lbDesc = document.getElementById('lightbox-desc');
  
  if (lbImg && img) {
    lbImg.src = img.src;
    lbImg.alt = img.alt || 'Lab image';
  }
  
  if (lbTitle) {
    if (title && title.textContent.trim()) {
      lbTitle.textContent = title.textContent.trim();
      lbTitle.style.display = 'block';
    } else {
      lbTitle.textContent = '';
      lbTitle.style.display = 'none';
    }
  }
  
  if (lbDesc) {
    if (desc && desc.textContent.trim()) {
      lbDesc.textContent = desc.textContent.trim();
      lbDesc.style.display = 'block';
    } else {
      lbDesc.textContent = '';
      lbDesc.style.display = 'none';
    }
  }
}

// Add Keyboard Support for Lightbox
document.addEventListener('keydown', (e) => {
  const lightbox = document.getElementById('gallery-lightbox');
  if (lightbox && lightbox.getAttribute('aria-hidden') === 'false') {
    if (e.key === 'ArrowLeft') {
      window.changeLightboxImage(-1);
    } else if (e.key === 'ArrowRight') {
      window.changeLightboxImage(1);
    } else if (e.key === 'Escape') {
      window.closeLightbox();
    }
  }
});

// Close lightbox when clicking outside the image container
document.addEventListener('click', (e) => {
  const lightbox = document.getElementById('gallery-lightbox');
  if (lightbox && lightbox.getAttribute('aria-hidden') === 'false') {
    if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
      window.closeLightbox();
    }
  }
});

/* =========================================================================
   Mascot Piku cardboard cutout popup (Stopmotion)
   ========================================================================= */
function initMascotPiku() {
  const container = document.getElementById('piku-mascot-container');
  const bubbleText = document.getElementById('piku-bubble-text');
  if (!container || !bubbleText) return;

  const barks = [
    "Bark!",
    "Woof woof!",
    "Arf arf!",
    "Awooooo!",
    "Piku is here! 🐾",
    "Time to split cells? 🧫",
    "Did someone say treats? 🦴",
    "Cryo-EM grid check! 🔍",
    "Keep up the great research!",
    "Sniff... sniff... 🐶",
    "Bark! 🐾"
  ];

  let pikuActive = false;
  let nextTimeout = null;

  const showPiku = () => {
    if (pikuActive) return;
    pikuActive = true;

    // Reset classes
    container.className = '';
    
    // Choose random side: bottom-right or bottom-left
    const side = Math.random() > 0.5 ? 'piku-bottom-right' : 'piku-bottom-left';
    container.classList.add(side, 'enter');

    // Trigger random bark
    const randomBark = barks[Math.floor(Math.random() * barks.length)];
    bubbleText.textContent = randomBark;

    // After entry animation is done, show bubble and start wiggling
    setTimeout(() => {
      container.classList.remove('enter');
      container.classList.add('wiggling', 'show-bubble');
    }, 800);

    // Keep active for 5 seconds, then hide
    setTimeout(() => {
      hidePiku();
    }, 5000);
  };

  const hidePiku = () => {
    if (!pikuActive) return;
    
    container.classList.remove('show-bubble', 'wiggling');
    container.classList.add('leave');

    setTimeout(() => {
      container.classList.remove('leave');
      // Hide completely
      container.className = 'piku-hidden';
      pikuActive = false;
      
      // Schedule next random pop in (between 30 to 75 seconds)
      scheduleNextPiku();
    }, 600);
  };

  const scheduleNextPiku = () => {
    if (nextTimeout) clearTimeout(nextTimeout);
    // Easter egg frequency: between 8 to 18 minutes (480s to 1080s)
    const randomDelay = (Math.random() * 600 + 480) * 1000;
    nextTimeout = setTimeout(showPiku, randomDelay);
  };

  // Allow clicking Piku to trigger a spin and a bark!
  window.triggerPikuInteractive = function() {
    if (!pikuActive) return;
    
    // Play a quick wiggle effect and update the speech bubble
    container.classList.remove('show-bubble');
    
    setTimeout(() => {
      const activeBarks = [
        "Bark bark! 🎉",
        "Piku spin! 🌀",
        "Awooo! 🐕",
        "Back to the lab! 🧪",
        "Happy pipetting!"
      ];
      bubbleText.textContent = activeBarks[Math.floor(Math.random() * activeBarks.length)];
      container.classList.add('show-bubble');
      
      // Jitter spin effect
      const img = container.querySelector('.piku-cutout-img');
      if (img) {
        img.style.transition = 'transform 0.5s steps(10)';
        img.style.transform = 'rotate(360deg)';
        setTimeout(() => {
          img.style.transition = 'none';
          img.style.transform = '';
        }, 500);
      }
    }, 150);
  };

  // Start the schedule (first pop-in after 2 to 5 minutes as an easter egg)
  const initialDelay = (Math.random() * 180 + 120) * 1000;
  nextTimeout = setTimeout(showPiku, initialDelay);

  // Expose showPiku globally so other modules can trigger the easter egg
  window.triggerPikuMascotPopup = showPiku;
}

/* =========================================================================
   Interactive Modal for Team Members
   ========================================================================= */
function initTeamModal() {
  const modal = document.getElementById('team-details-modal');
  const modalImg = document.getElementById('team-modal-img');
  const modalName = document.getElementById('team-modal-name');
  const modalRole = document.getElementById('team-modal-role');
  const modalBio = document.getElementById('team-modal-bio');
  const closeBtn = document.getElementById('btn-team-modal-close');

  if (!modal || !modalImg || !modalName || !modalRole || !modalBio) return;

  const teamCards = document.querySelectorAll('.team-card, .pi-feature');

  teamCards.forEach(card => {
    // Add pointer cursor to PI card to indicate it is clickable
    if (card.classList.contains('pi-feature')) {
      card.style.cursor = 'pointer';
    }

    card.addEventListener('click', (e) => {
      // Don't trigger modal if clicking contact links inside the PI card
      if (e.target.closest('a') || e.target.closest('.pi-contact')) {
        return;
      }

      const imgEl = card.querySelector('.team-photo');
      const nameEl = card.querySelector('h3');
      const roleEl = card.querySelector('.team-role');

      if (!imgEl || !nameEl || !roleEl) return;

      const name = nameEl.textContent.trim();
      const role = roleEl.textContent.trim();

      // Clear any previous initials avatar in the modal left container
      const modalLeft = modalImg.parentElement;
      const existingInitials = modalLeft.querySelector('.team-modal-initials');
      if (existingInitials) {
        existingInitials.remove();
      }

      if (imgEl.tagName === 'IMG') {
        modalImg.src = imgEl.src;
        modalImg.alt = name;
        modalImg.style.display = 'block';
      } else {
        modalImg.style.display = 'none';
        const initials = imgEl.textContent.trim();
        const initialsDiv = document.createElement('div');
        initialsDiv.className = 'team-modal-initials';
        initialsDiv.textContent = initials;
        modalLeft.appendChild(initialsDiv);
      }

      modalName.textContent = name;
      modalRole.textContent = role;

      // Populate bio
      const customBio = card.getAttribute('data-bio');
      if (customBio !== null) {
        if (customBio.trim().startsWith('<p>')) {
          modalBio.innerHTML = customBio;
        } else {
          modalBio.innerHTML = customBio.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('');
        }
      } else if (name.toLowerCase() === 'piku') {
        modalBio.innerHTML = `
          <p>Piku is the official laboratory mascot and moral officer at the Kasinath Lab. With a background in sniff-testing, tail-wagging, and crumb-detection, Piku provides essential support to the research team during long cryo-EM data collection sessions.</p>
          <p>Piku's primary duties include supervising laboratory breaks, reminding researchers to stay hydrated, and requesting belly rubs. In his free time, he enjoys chasing squirrels outside the JSCBB building, checking if the Vitrobot has left any tasty treats, and barking at the cardboard cutout version of himself.</p>
          <p><strong>Favorite molecule:</strong> Bone-like collagen. &nbsp; <strong>Favorite method:</strong> Sit-and-stay crystallography.</p>
        `;
        // Trigger Mascot Easter Egg!
        if (typeof window.triggerPikuMascotPopup === 'function') {
          window.triggerPikuMascotPopup();
        }
      } else if (name.toLowerCase().includes('vignesh')) {
        modalBio.innerHTML = `
          <p>Dr. Kasinath completed his postdoctoral training at UC Berkeley / LBNL, where he determined pioneering cryo-EM structures of PRC2 and PRC2 engaging with nucleosomes. He established his independent research group at CU Boulder in August 2021 to continue pushing the boundaries of structural molecular biology.</p>
        `;
      } else if (name.toLowerCase().includes('george')) {
        modalBio.innerHTML = `
          <p>George S. Stephenson is a Computer Science PhD student and an IQ Biology Fellow at the University of Colorado Boulder. His research interests lie at the intersection of RNA structural molecular biology, bioinformatics, and transcriptomics.</p>
          <p>Before joining the Kasinath Laboratory, George served as an RNA structural and transcriptomic bioinformatician and system administrator at the Laederach Laboratory at the University of North Carolina at Chapel Hill (UNC). There, he analyzed RNA-seq and structural datasets and managed the laboratory’s server infrastructure.</p>
          <p>George earned his undergraduate degree in Quantitative Biology from UNC Chapel Hill, where he also conducted research in the Burch Lab. Prior to UNC, he began his scientific journey with Lehigh University's SEA-PHAGES program. At the Kasinath Lab, George is excited to leverage computational and experimental tools to decipher epigenetic and chromatin regulation.</p>
        `;
      } else {
        modalBio.innerHTML = `
          <p>${name} is a key member of the Kasinath Laboratory, serving as a ${role}. Their research is focused on unraveling the molecular mechanisms of chromatin regulation and gene silencing using structural biology approaches.</p>
          <p>At the Kasinath Lab, we leverage state-of-the-art single-particle cryo-EM and cryo-ET techniques to visualize large macromolecular complexes in native and reconstituted environments. ${name} contributes to our collaborative efforts by investigating how cofactors and chromatin substrates interface with epigenetic regulators like PRC2.</p>
          <p>Prior to joining the laboratory, ${name} pursued academic training in molecular biophysics, biochemistry, or related computational disciplines, developing a passion for understanding the physical principles of molecular machinery at the atomic scale.</p>
        `;
      }

      // Show modal
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    });
  });

  const closeModal = () => {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; // Restore background scrolling
  };

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  // Close when clicking outside container
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('team-modal')) {
      closeModal();
    }
  });

  // Keyboard close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      closeModal();
    }
  });
}

/* =========================================================================
   Admin Portal Trigger
   ========================================================================= */
function initAdminModeTrigger() {
  let adminLoaded = false;

  function checkHash() {
    if (window.location.hash === '#admin') {
      loadAdminPortal();
    }
  }

  function loadAdminPortal() {
    if (adminLoaded) return;
    adminLoaded = true;

    console.log('Loading Lab Admin Portal...');

    // Load admin.css
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'assets/admin.css';
    document.head.appendChild(link);

    // Load admin.js
    const script = document.createElement('script');
    script.src = 'assets/admin.js';
    document.body.appendChild(script);
  }

  // Check on initial load
  checkHash();

  // Listen for hash changes
  window.addEventListener('hashchange', checkHash);
}

// Expose filter & carousel rebinding globally for CMS use
window.initPublicationsFilter = initPublicationsFilter;
window.initCarousels = initCarousels;

function syncHomeResearchThemes() {
  const questionsSection = document.querySelector('.questions-section');
  if (!questionsSection) return;

  const researchCards = document.querySelectorAll('#research-pillars .research-card, #research-pillars-apps .research-card');
  if (researchCards.length === 0) return;

  const existingCards = questionsSection.querySelectorAll('.question-card');
  existingCards.forEach(card => card.remove());

  researchCards.forEach((card, idx) => {
    const h3 = card.querySelector('h3');
    const p = card.querySelector('p');
    if (!h3 || !p) return;

    const themeCard = document.createElement('div');
    themeCard.className = `glass-card question-card${idx % 2 === 1 ? ' alt' : ''}`;
    themeCard.id = `question-${idx + 1}`;

    themeCard.innerHTML = `
      <div class="question-title">${h3.innerHTML}</div>
      <p class="news-excerpt">${p.innerHTML}</p>
    `;

    themeCard.addEventListener('click', () => {
      const researchTab = document.querySelector('.nav-tab[data-target="research"]');
      if (researchTab) researchTab.click();

      setTimeout(() => {
        const allResearchCards = document.querySelectorAll('#research-pillars .research-card, #research-pillars-apps .research-card');
        const matchCard = allResearchCards[idx];
        if (matchCard) {
          matchCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          matchCard.classList.add('cms-highlight-glow');
          setTimeout(() => {
            matchCard.classList.remove('cms-highlight-glow');
          }, 2000);
        }
      }, 300);
    });

    questionsSection.appendChild(themeCard);
  });
}

window.syncHomeResearchThemes = syncHomeResearchThemes;



