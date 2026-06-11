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
          
          // Re-render/adjust 3Dmol viewer if entering solved structures tab
          if (targetSection === 'structures' && window.activeViewer) {
            setTimeout(() => {
              window.activeViewer.zoomTo();
              window.activeViewer.render();
            }, 100);
          }
        } else {
          sec.classList.remove('active');
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
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = 45;
  const connectionDistance = 140;

  // Particle/line colors follow the active theme (read live so toggling updates instantly)
  function themePalette() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return dark
      ? { a: 'rgba(212, 175, 55, 0.55)', b: 'rgba(255, 242, 178, 0.4)', line: '212, 175, 55' }
      : { a: 'rgba(138, 109, 59, 0.4)', b: 'rgba(15, 23, 42, 0.35)', line: '138, 109, 59' };
  }

  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.radius = Math.random() * 3 + 1.5;
      this.speedX = (Math.random() - 0.5) * 0.45;
      this.speedY = (Math.random() - 0.5) * 0.45;
      // Theme decides the actual color at draw time (see themePalette)
      this.useFirst = Math.random() > 0.5;
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;

      // Bounce at boundary
      if (this.x < 0 || this.x > width) this.speedX *= -1;
      if (this.y < 0 || this.y > height) this.speedY *= -1;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    const pal = themePalette();

    // Draw connection lines representing biological nodes/complexes
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < connectionDistance) {
          const alpha = (1 - dist / connectionDistance) * 0.12;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(${pal.line}, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    // Update and draw particles
    particles.forEach(p => {
      p.update();
      p.color = p.useFirst ? pal.a : pal.b;
      p.draw();
    });

    requestAnimationFrame(animate);
  }

  animate();
}

/* =========================================================================
   Interactive 3Dmol.js Viewer for solved structures
   ========================================================================= */
const structuresData = {
  '6WKR': {
    name: 'PRC2-AEBP2-JARID2 Bound to Nucleosome',
    method: 'Single Particle Cryo-EM (3.5 Å)',
    description: 'Human Polycomb Repressive Complex 2 (PRC2) in complex with cofactor AEBP2 and JARID2, engaged on a dinucleosome substrate showing methylation state.'
  },
  '6C23': {
    name: 'Human PRC2-AEBP2 on Nucleosome',
    method: 'Single Particle Cryo-EM (4.2 Å)',
    description: 'Visualization of human PRC2 core with cofactor AEBP2 bound, elucidating how chromatin elements interface with PRC2.'
  },
  '6C24': {
    name: 'Human PRC2 with AEBP2 and JARID2',
    method: 'Single Particle Cryo-EM (3.9 Å)',
    description: 'Complex details containing both cofactors AEBP2 and JARID2, providing architectural clues into gene silencing regulation.'
  },
  'EMDB-7306': {
    name: 'PRC2 simultaneously engaged with two functionally distinct nucleosomes',
    method: 'Single Particle Cryo-EM (3.5 - 4.2 Å)',
    description: 'Cryo-EM density maps (EMD-7306, EMD-7310, EMD-7312) detailing how human PRC2 simultaneously bridges and interacts with H3K27me3-modified and unmodified nucleosome substrates.'
  }
};

let currentStyle = 'cartoon';
let isSpinning = true;

function initStructureViewer() {
  const viewerContainer = document.getElementById('viewer-viewport');
  const structureButtons = document.querySelectorAll('.structure-btn');
  const infoTitle = document.getElementById('struct-info-title');
  const infoMethod = document.getElementById('struct-info-method');
  const infoDesc = document.getElementById('struct-info-desc');

  if (!viewerContainer || structureButtons.length === 0) return;

  // Initialize viewer with the default PDB (6WKR)
  loadStructure('6WKR');

  structureButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      structureButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const pdbId = btn.getAttribute('data-pdb');
      
      // Update info box
      if (structuresData[pdbId]) {
        infoTitle.textContent = structuresData[pdbId].name;
        infoMethod.textContent = structuresData[pdbId].method;
        infoDesc.textContent = structuresData[pdbId].description;
      }
      
      loadStructure(pdbId);
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
}

function loadStructure(pdbId) {
  const container = document.getElementById('viewer-viewport');
  if (!container) return;

  // Clear previous element content
  container.innerHTML = '';
  
  const controls = document.getElementById('viewer-controls');

  if (pdbId === 'EMDB-7306') {
    // Hide controls for map-only entry
    if (controls) controls.style.display = 'none';

    // Render EMDB placeholder panel
    const panel = document.createElement('div');
    panel.className = 'emdb-placeholder-panel';
    panel.innerHTML = `
      <div class="emdb-placeholder-content">
        <div class="emdb-icon-box">
          <i class="fa-solid fa-circle-info"></i>
        </div>
        <h3>Cryo-EM Density Maps Only</h3>
        <p>No single coordinate atomic model (PDB file) was deposited for this entry. Instead, the authors performed <strong>rigid-body fitting</strong> of existing coordinate models (such as human PRC2 PDB <strong>5HYN</strong> and nucleosome PDB <strong>1AOI</strong>) into 3D density maps.</p>
        <p class="emdb-subtext">View and download the primary density maps directly on the EMDB database:</p>
        <div class="emdb-links">
          <a href="https://www.ebi.ac.uk/emdb/EMD-7306" target="_blank" rel="noopener noreferrer" class="emdb-link-btn">
            <span>EMD-7306</span> <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </a>
          <a href="https://www.ebi.ac.uk/emdb/EMD-7310" target="_blank" rel="noopener noreferrer" class="emdb-link-btn">
            <span>EMD-7310</span> <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </a>
          <a href="https://www.ebi.ac.uk/emdb/EMD-7312" target="_blank" rel="noopener noreferrer" class="emdb-link-btn">
            <span>EMD-7312</span> <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </a>
        </div>
      </div>
    `;
    container.appendChild(panel);
    return;
  }

  // Show controls for normal structures
  if (controls) controls.style.display = 'flex';
  
  // Set up loader indicator
  const loader = document.createElement('div');
  loader.className = 'loader-indicator';
  loader.style.position = 'absolute';
  loader.style.top = '50%';
  loader.style.left = '50%';
  loader.style.transform = 'translate(-50%, -50%)';
  loader.style.color = 'var(--color-primary)';
  loader.style.fontFamily = 'Outfit, sans-serif';
  loader.style.fontSize = '0.9rem';
  loader.textContent = `Fetching Structure ${pdbId} from PDB...`;
  container.appendChild(loader);

  try {
    // Initialize 3Dmol viewer inside jQuery selection as required by 3Dmol API
    const element = $(container);
    const config = { defaultcolors: $3Dmol.rasmolElementColors };
    const viewer = $3Dmol.createViewer(element, config);
    window.activeViewer = viewer;

    $3Dmol.download("pdb:" + pdbId, viewer, {}, function() {
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
    });
  } catch (error) {
    console.error("Failed to load 3Dmol viewer:", error);
    loader.textContent = "Error loading 3D molecular viewer. Check connection.";
  }
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

    // Simulate network delay
    setTimeout(() => {
      alert('Thank you! Your message has been sent. We will get back to you shortly.');
      form.reset();
      btn.textContent = originalText;
      btn.disabled = false;
    }, 1200);
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
function initCarousels() {
  // Hero Carousel Setup
  const heroSlides = document.querySelectorAll('#hero-media .carousel-slide');
  if (heroSlides.length > 0) {
    let currentHeroIndex = 0;
    setInterval(() => {
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
        clearInterval(newsInterval);
        newsInterval = setInterval(nextNewsSlide, 6000);
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

    let newsInterval = setInterval(nextNewsSlide, 6000); // 6 seconds per slide
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
}

