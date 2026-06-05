document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initMobileMenu();
  initCanvasBackground();
  initStructureViewer();
  initPublicationsFilter();
  initContactForm();
  initCarousels();
  init3DTilt();
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

  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.radius = Math.random() * 3 + 1.5;
      this.speedX = (Math.random() - 0.5) * 0.45;
      this.speedY = (Math.random() - 0.5) * 0.45;
      // Bioluminescent colors (cyan, magenta, slate)
      this.color = Math.random() > 0.5 ? 'rgba(0, 229, 255, 0.4)' : 'rgba(189, 0, 255, 0.3)';
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
          ctx.strokeStyle = `rgba(156, 154, 174, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    // Update and draw particles
    particles.forEach(p => {
      p.update();
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
  
  // Set up loader indicator
  const loader = document.createElement('div');
  loader.className = 'loader-indicator';
  loader.style.position = 'absolute';
  loader.style.top = '50%';
  loader.style.left = '50%';
  loader.style.transform = 'translate(-50%, -50%)';
  loader.style.color = '#00e5ff';
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
      card.style.boxShadow = `0 20px 40px rgba(0, 0, 0, 0.45), 0 0 30px rgba(0, 229, 255, 0.15)`;
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

