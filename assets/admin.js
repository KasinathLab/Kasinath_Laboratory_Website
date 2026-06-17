/* =========================================================================
   KASINATH LAB CMS — ADMIN PORTAL ENGINE
   ========================================================================= */

(function() {
  // Passcode protection state
  const CMS_PASSCODE = "kasinath2026";
  let cmsVirtualDoc = null;
  let activeTab = "tab-general";

  // Initialize Admin CMS
  function init() {
    // Check if user is already authenticated in this session
    if (sessionStorage.getItem("kaslab_cms_auth") === "true") {
      setupCMS();
    } else {
      showLoginScreen();
    }
  }

  // 1. Login Authentication
  function showLoginScreen() {
    const backdrop = document.createElement("div");
    backdrop.className = "cms-login-backdrop";
    backdrop.id = "cms-login-screen";
    backdrop.innerHTML = `
      <div class="cms-login-card">
        <div class="cms-login-logo">KASINATH LAB</div>
        <div class="cms-login-title">Content Management System</div>
        <form id="cms-login-form">
          <div class="cms-form-group">
            <label for="cms-passcode">Enter Admin Passcode</label>
            <input type="password" id="cms-passcode" class="cms-input" placeholder="••••••••" required autocomplete="current-password">
          </div>
          <button type="submit" class="cms-login-btn">
            <i class="fa-solid fa-unlock-keyhole"></i> Access Portal
          </button>
          <div class="cms-login-error" id="cms-login-error">Incorrect passcode. Please try again.</div>
        </form>
      </div>
    `;

    document.body.appendChild(backdrop);
    
    // Focus passcode input
    setTimeout(() => {
      document.getElementById("cms-passcode").focus();
    }, 100);

    const form = document.getElementById("cms-login-form");
    const errorDiv = document.getElementById("cms-login-error");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const pwd = document.getElementById("cms-passcode").value;

      if (pwd === CMS_PASSCODE) {
        sessionStorage.setItem("kaslab_cms_auth", "true");
        backdrop.style.opacity = "0";
        setTimeout(() => {
          backdrop.remove();
          setupCMS();
        }, 300);
      } else {
        errorDiv.style.display = "block";
        // Shake animation reset
        errorDiv.style.animation = 'none';
        errorDiv.offsetHeight; /* trigger reflow */
        errorDiv.style.animation = null; 
      }
    });
  }

  // 2. Main CMS Setup
  async function setupCMS() {
    console.log("CMS Unlocked. Loading templates...");
    
    // Load original source HTML
    try {
      const response = await fetch("index.html");
      if (!response.ok) throw new Error("Failed to load index.html template");
      const htmlText = await response.text();
      
      const parser = new DOMParser();
      cmsVirtualDoc = parser.parseFromString(htmlText, "text/html");
      console.log("Virtual DOM initialized.");
    } catch (err) {
      console.error(err);
      alert("Error loading website template. Local file preview might have restrictions in some browsers. Please serve the folder locally.");
      return;
    }

    // Build Portal overlay elements
    createDashboardUI();
    registerEvents();
    loadTabContent();
    highlightEditableElements(true);
  }

  // 3. Create Dashboard UI
  function createDashboardUI() {
    // Delete any existing cms portal wrapper
    const existing = document.getElementById("cms-portal-wrapper");
    if (existing) existing.remove();

    const portalWrapper = document.createElement("div");
    portalWrapper.className = "cms-portal-wrapper";
    portalWrapper.id = "cms-portal-wrapper";
    portalWrapper.innerHTML = `
      <!-- Collapsible trigger button -->
      <div class="cms-toggle-trigger" id="cms-dashboard-trigger" title="Toggle CMS Dashboard">
        <i class="fa-solid fa-sliders"></i>
      </div>
      
      <!-- CMS Dashboard sidebar panel -->
      <div class="cms-dashboard collapsed" id="cms-dashboard">
        <div class="cms-header">
          <div class="cms-header-title">
            <i class="fa-solid fa-flask-vial" style="color: var(--admin-gold);"></i>
            <h2>Lab CMS Portal</h2>
            <span>Editor</span>
          </div>
          <button class="cms-close-btn" id="cms-dashboard-close" title="Minimize Panel">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
        
        <div class="cms-nav">
          <button class="cms-nav-item active" data-tab="tab-general"><i class="fa-solid fa-paragraph"></i>Text</button>
          <button class="cms-nav-item" data-tab="tab-news"><i class="fa-solid fa-bullhorn"></i>News</button>
          <button class="cms-nav-item" data-tab="tab-team"><i class="fa-solid fa-user-gear"></i>Team</button>
          <button class="cms-nav-item" data-tab="tab-alumni"><i class="fa-solid fa-graduation-cap"></i>Alumni</button>
          <button class="cms-nav-item" data-tab="tab-gallery"><i class="fa-solid fa-images"></i>Galleries</button>
          <button class="cms-nav-item" data-tab="tab-export"><i class="fa-solid fa-cloud-arrow-down"></i>Export</button>
        </div>
        
        <div class="cms-content" id="cms-tab-content">
          <!-- Populated dynamically -->
        </div>
        
        <div class="cms-footer">
          <div class="cms-status">
            <i class="fa-solid fa-circle-check"></i>
            <span id="cms-status-text">Visual Editing Active</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(portalWrapper);

    // Expand the dashboard after a short delay
    setTimeout(() => {
      const db = document.getElementById("cms-dashboard");
      if (db) db.classList.remove("collapsed");
    }, 150);
  }

  // 4. Navigation and Core Events
  function registerEvents() {
    const triggerBtn = document.getElementById("cms-dashboard-trigger");
    const closeBtn = document.getElementById("cms-dashboard-close");
    const db = document.getElementById("cms-dashboard");

    triggerBtn.addEventListener("click", () => {
      db.classList.toggle("collapsed");
    });

    closeBtn.addEventListener("click", () => {
      db.classList.add("collapsed");
    });

    // Delegate tab switches
    document.querySelector(".cms-nav").addEventListener("click", (e) => {
      const tabBtn = e.target.closest(".cms-nav-item");
      if (!tabBtn) return;

      document.querySelectorAll(".cms-nav-item").forEach(btn => btn.classList.remove("active"));
      tabBtn.classList.add("active");

      activeTab = tabBtn.getAttribute("data-tab");
      loadTabContent();
    });
  }

  // Highlight editable sections visually with dashes on the live page
  function highlightEditableElements(enable) {
    const selectors = [
      '#home .hero-content h1',
      '#home .hero-description',
      '.outreach-intro p',
      '#news-carousel .news-card',
      '#team-members .team-card',
      '#team-pi',
      '.alumni-card',
      '.carousel-container .carousel-item'
    ];
    
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (enable) {
          el.classList.add("cms-editable-highlight-preview");
        } else {
          el.classList.remove("cms-editable-highlight-preview");
        }
      });
    });
  }

  // Helper: update text content in both live page DOM and clean virtual source DOM
  function updateElementText(selector, value, isHTML = false) {
    // 1. Update live DOM
    const liveEl = document.querySelector(selector);
    if (liveEl) {
      if (isHTML) liveEl.innerHTML = value;
      else liveEl.textContent = value;
    }
    
    // 2. Update virtual clean source DOM
    const virtEl = cmsVirtualDoc.querySelector(selector);
    if (virtEl) {
      if (isHTML) virtEl.innerHTML = value;
      else virtEl.textContent = value;
    }
    
    saveToSession();
  }

  // 5. Load Tab Contents Dynamically
  function loadTabContent() {
    const contentArea = document.getElementById("cms-tab-content");
    contentArea.innerHTML = ""; // Clear

    if (activeTab === "tab-general") {
      renderGeneralTab(contentArea);
    } else if (activeTab === "tab-news") {
      renderNewsTab(contentArea);
    } else if (activeTab === "tab-team") {
      renderTeamTab(contentArea);
    } else if (activeTab === "tab-alumni") {
      renderAlumniTab(contentArea);
    } else if (activeTab === "tab-gallery") {
      renderGalleryTab(contentArea);
    } else if (activeTab === "tab-export") {
      renderExportTab(contentArea);
    }
  }

  // ==========================================
  // TAB 1: GENERAL TEXT EDITING
  // ==========================================
  function renderGeneralTab(container) {
    container.innerHTML = `<h3 class="cms-section-title">Hero Section Headline</h3>`;
    
    // Parse h1 content
    const virtH1 = cmsVirtualDoc.querySelector("#home .hero-content h1");
    let prefixText = "";
    let highlightText = "";

    if (virtH1) {
      const gradSpan = virtH1.querySelector(".gradient-text");
      if (gradSpan) {
        highlightText = gradSpan.textContent;
        // Strip the span to get the rest of text
        const temp = virtH1.cloneNode(true);
        const s = temp.querySelector(".gradient-text");
        if (s) s.remove();
        prefixText = temp.textContent.trim();
      } else {
        prefixText = virtH1.textContent;
      }
    }

    container.innerHTML += `
      <div class="cms-field">
        <label>Heading Prefix (Normal Text)</label>
        <input type="text" id="cms-hero-prefix" class="cms-input" value="${escapeHtml(prefixText)}">
      </div>
      <div class="cms-field">
        <label>Heading Highlight (Gold Gradient)</label>
        <input type="text" id="cms-hero-highlight" class="cms-input" value="${escapeHtml(highlightText)}">
      </div>
      
      <h3 class="cms-section-title" style="margin-top: 35px;">Hero Body Paragraphs</h3>
      <div id="cms-hero-paragraphs-container"></div>
      <button class="cms-btn cms-btn-secondary cms-btn-sm" id="cms-hero-add-p" style="margin-bottom: 30px;">
        <i class="fa-solid fa-plus"></i> Add Paragraph
      </button>

      <h3 class="cms-section-title" style="margin-top: 15px;">Outreach Introduction</h3>
      <div id="cms-outreach-paragraphs-container"></div>
      <button class="cms-btn cms-btn-secondary cms-btn-sm" id="cms-outreach-add-p" style="margin-bottom: 20px;">
        <i class="fa-solid fa-plus"></i> Add Outreach Paragraph
      </button>
    `;

    // 1. Wire Hero Headline Inputs
    const updateHeadline = () => {
      const prefVal = document.getElementById("cms-hero-prefix").value;
      const highVal = document.getElementById("cms-hero-highlight").value;
      
      let fullHtml = prefVal;
      if (highVal) {
        fullHtml += ` <span class="gradient-text">${highVal}</span>`;
      }
      
      updateElementText("#home .hero-content h1", fullHtml, true);
    };

    document.getElementById("cms-hero-prefix").addEventListener("input", updateHeadline);
    document.getElementById("cms-hero-highlight").addEventListener("input", updateHeadline);

    // 2. Wire Hero Paragraph Textareas
    const pContainer = document.getElementById("cms-hero-paragraphs-container");
    const virtParagraphs = cmsVirtualDoc.querySelectorAll("#home .hero-description");
    
    function refreshHeroParagraphsUI() {
      pContainer.innerHTML = "";
      const currentVirtParagraphs = cmsVirtualDoc.querySelectorAll("#home .hero-description");
      
      currentVirtParagraphs.forEach((p, idx) => {
        const text = p.textContent.trim();
        const pId = `hero-p-${idx}`;
        const row = document.createElement("div");
        row.className = "cms-field";
        row.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
            <label style="margin-bottom:0;">Paragraph ${idx + 1}</label>
            <button class="cms-btn-action delete cms-p-del-btn" data-index="${idx}" title="Delete Paragraph"><i class="fa-solid fa-trash-can"></i></button>
          </div>
          <textarea id="${pId}" class="cms-textarea" rows="4">${escapeHtml(text)}</textarea>
        `;
        pContainer.appendChild(row);

        document.getElementById(pId).addEventListener("input", (e) => {
          // Update virtual
          const currentVirt = cmsVirtualDoc.querySelectorAll("#home .hero-description");
          if (currentVirt[idx]) currentVirt[idx].textContent = e.target.value;
          
          // Update live
          const currentLive = document.querySelectorAll("#home .hero-description");
          if (currentLive[idx]) currentLive[idx].textContent = e.target.value;
          
          saveToSession();
        });
      });
    }

    refreshHeroParagraphsUI();

    // Add Hero Paragraph
    document.getElementById("cms-hero-add-p").addEventListener("click", () => {
      // 1. Add to virtual
      const heroSec = cmsVirtualDoc.querySelector("#home .hero-content");
      const refBtnGroup = heroSec.querySelector(".button-group");
      
      const newP = cmsVirtualDoc.createElement("p");
      newP.className = "hero-description";
      newP.textContent = "New paragraph content here.";
      
      heroSec.insertBefore(newP, refBtnGroup);

      // 2. Add to live
      const liveHeroSec = document.querySelector("#home .hero-content");
      const liveRefBtnGroup = liveHeroSec.querySelector(".button-group");
      const liveNewP = document.createElement("p");
      liveNewP.className = "hero-description";
      liveNewP.textContent = "New paragraph content here.";
      liveHeroSec.insertBefore(liveNewP, liveRefBtnGroup);

      refreshHeroParagraphsUI();
      saveToSession();
    });

    // Delete Hero Paragraph
    pContainer.addEventListener("click", (e) => {
      const delBtn = e.target.closest(".cms-p-del-btn");
      if (!delBtn) return;
      const idx = parseInt(delBtn.getAttribute("data-index"), 10);

      // Remove from virtual
      const currentVirt = cmsVirtualDoc.querySelectorAll("#home .hero-description");
      if (currentVirt[idx]) currentVirt[idx].remove();

      // Remove from live
      const currentLive = document.querySelectorAll("#home .hero-description");
      if (currentLive[idx]) currentLive[idx].remove();

      refreshHeroParagraphsUI();
      saveToSession();
    });

    // 3. Wire Outreach Paragraphs
    const outContainer = document.getElementById("cms-outreach-paragraphs-container");
    
    function refreshOutreachUI() {
      outContainer.innerHTML = "";
      const currentVirtOutP = cmsVirtualDoc.querySelectorAll(".outreach-intro p");

      currentVirtOutP.forEach((p, idx) => {
        const text = p.textContent.trim();
        const pId = `outreach-p-${idx}`;
        const row = document.createElement("div");
        row.className = "cms-field";
        row.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
            <label style="margin-bottom:0;">Paragraph ${idx + 1}</label>
            <button class="cms-btn-action delete cms-out-del-btn" data-index="${idx}" title="Delete Paragraph"><i class="fa-solid fa-trash-can"></i></button>
          </div>
          <textarea id="${pId}" class="cms-textarea" rows="4">${escapeHtml(text)}</textarea>
        `;
        outContainer.appendChild(row);

        document.getElementById(pId).addEventListener("input", (e) => {
          // Update virtual
          const currentVirt = cmsVirtualDoc.querySelectorAll(".outreach-intro p");
          if (currentVirt[idx]) currentVirt[idx].textContent = e.target.value;
          
          // Update live
          const currentLive = document.querySelectorAll(".outreach-intro p");
          if (currentLive[idx]) currentLive[idx].textContent = e.target.value;
          
          saveToSession();
        });
      });
    }

    refreshOutreachUI();

    // Add Outreach Paragraph
    document.getElementById("cms-outreach-add-p").addEventListener("click", () => {
      // 1. Add to virtual
      const sec = cmsVirtualDoc.querySelector(".outreach-intro");
      const newP = cmsVirtualDoc.createElement("p");
      newP.textContent = "New outreach detail text.";
      sec.appendChild(newP);

      // 2. Add to live
      const liveSec = document.querySelector(".outreach-intro");
      const liveNewP = document.createElement("p");
      liveNewP.textContent = "New outreach detail text.";
      liveSec.appendChild(liveNewP);

      refreshOutreachUI();
      saveToSession();
    });

    // Delete Outreach Paragraph
    outContainer.addEventListener("click", (e) => {
      const delBtn = e.target.closest(".cms-out-del-btn");
      if (!delBtn) return;
      const idx = parseInt(delBtn.getAttribute("data-index"), 10);

      // Remove from virtual
      const currentVirt = cmsVirtualDoc.querySelectorAll(".outreach-intro p");
      if (currentVirt[idx]) currentVirt[idx].remove();

      // Remove from live
      const currentLive = document.querySelectorAll(".outreach-intro p");
      if (currentLive[idx]) currentLive[idx].remove();

      refreshOutreachUI();
      saveToSession();
    });
  }

  // ==========================================
  // TAB 2: ANNOUNCEMENTS (NEWS)
  // ==========================================
  function renderNewsTab(container) {
    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h3 class="cms-section-title" style="margin-bottom:0;">Announcements</h3>
        <button class="cms-btn cms-btn-primary cms-btn-sm" id="cms-news-add-btn">
          <i class="fa-solid fa-plus"></i> Add New
        </button>
      </div>
      
      <!-- List View -->
      <div class="cms-items-list" id="cms-news-list"></div>

      <!-- Add/Edit Inline Form Panel -->
      <div class="cms-editor-pane" id="cms-news-form-pane">
        <div class="cms-editor-pane-header">
          <h4 id="cms-news-form-title">Edit Announcement</h4>
          <button class="cms-close-btn" id="cms-news-form-cancel">&times;</button>
        </div>
        <input type="hidden" id="cms-news-edit-id">
        <div class="cms-field">
          <label>Date (e.g. June 2025)</label>
          <input type="text" id="cms-news-date" class="cms-input">
        </div>
        <div class="cms-field">
          <label>Headline Title</label>
          <input type="text" id="cms-news-headline" class="cms-input">
        </div>
        <div class="cms-field">
          <label>Excerpt / Description</label>
          <textarea id="cms-news-excerpt" class="cms-textarea" rows="3"></textarea>
        </div>
        <div class="cms-field">
          <label>Image Resource Path</label>
          <input type="text" id="cms-news-img" class="cms-input" placeholder="assets/news_file.png">
        </div>
        <div class="cms-button-row">
          <button class="cms-btn cms-btn-primary cms-btn-sm" id="cms-news-save-btn">Save</button>
          <button class="cms-btn cms-btn-secondary cms-btn-sm" id="cms-news-cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    const newsListDiv = document.getElementById("cms-news-list");
    const formPane = document.getElementById("cms-news-form-pane");
    
    function refreshNewsList() {
      newsListDiv.innerHTML = "";
      const cards = cmsVirtualDoc.querySelectorAll(".news-carousel .news-card");
      
      cards.forEach((card, idx) => {
        const id = card.id || `news-card-${idx}`;
        const headline = card.querySelector(".news-headline") ? card.querySelector(".news-headline").textContent : "No Headline";
        const date = card.querySelector(".news-date") ? card.querySelector(".news-date").textContent : "";
        const isActive = card.classList.contains("active");

        const row = document.createElement("div");
        row.className = "cms-item-row";
        row.innerHTML = `
          <div class="cms-item-info">
            <div class="cms-item-title">${escapeHtml(headline)} ${isActive ? '<span style="font-size:0.65rem; color:var(--admin-gold); margin-left:5px;">● Staged</span>' : ''}</div>
            <div class="cms-item-subtitle">${escapeHtml(date)} (ID: ${id})</div>
          </div>
          <div class="cms-item-actions">
            <button class="cms-btn-action edit cms-news-edit-btn" data-index="${idx}" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="cms-btn-action cms-news-moveup-btn" data-index="${idx}" title="Move Up"><i class="fa-solid fa-chevron-up"></i></button>
            <button class="cms-btn-action cms-news-movedown-btn" data-index="${idx}" title="Move Down"><i class="fa-solid fa-chevron-down"></i></button>
            <button class="cms-btn-action delete cms-news-del-btn" data-index="${idx}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        `;
        newsListDiv.appendChild(row);
      });
    }

    refreshNewsList();

    // 1. Edit Announcement trigger
    newsListDiv.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".cms-news-edit-btn");
      if (!editBtn) return;
      const idx = parseInt(editBtn.getAttribute("data-index"), 10);
      const cards = cmsVirtualDoc.querySelectorAll(".news-carousel .news-card");
      const card = cards[idx];
      if (!card) return;

      document.getElementById("cms-news-edit-id").value = idx;
      document.getElementById("cms-news-date").value = card.querySelector(".news-date") ? card.querySelector(".news-date").textContent.trim() : "";
      document.getElementById("cms-news-headline").value = card.querySelector(".news-headline") ? card.querySelector(".news-headline").textContent.trim() : "";
      document.getElementById("cms-news-excerpt").value = card.querySelector(".news-excerpt") ? card.querySelector(".news-excerpt").textContent.trim() : "";
      
      const imgEl = card.querySelector("img");
      document.getElementById("cms-news-img").value = imgEl ? imgEl.getAttribute("src").replace("/assets/", "assets/") : "";

      document.getElementById("cms-news-form-title").textContent = "Edit Announcement";
      formPane.style.display = "block";
      formPane.scrollIntoView({ behavior: "smooth" });
    });

    // 2. Add Announcement trigger
    document.getElementById("cms-news-add-btn").addEventListener("click", () => {
      document.getElementById("cms-news-edit-id").value = "-1"; // indicates new
      document.getElementById("cms-news-date").value = "New Date 2026";
      document.getElementById("cms-news-headline").value = "New Announcement Title";
      document.getElementById("cms-news-excerpt").value = "Write new details here...";
      document.getElementById("cms-news-img").value = "assets/news_students.png";

      document.getElementById("cms-news-form-title").textContent = "Add New Announcement";
      formPane.style.display = "block";
      formPane.scrollIntoView({ behavior: "smooth" });
    });

    // 3. Save Announcement
    document.getElementById("cms-news-save-btn").addEventListener("click", () => {
      const idx = parseInt(document.getElementById("cms-news-edit-id").value, 10);
      const dateVal = document.getElementById("cms-news-date").value;
      const headlineVal = document.getElementById("cms-news-headline").value;
      const excerptVal = document.getElementById("cms-news-excerpt").value;
      const imgVal = document.getElementById("cms-news-img").value;

      if (idx === -1) {
        // Create new news card in virtual doc
        const newCard = cmsVirtualDoc.createElement("div");
        newCard.className = "glass-card news-card";
        newCard.id = "news-custom-" + Date.now();
        
        newCard.innerHTML = `
          <img src="${imgVal}" alt="Announcement Image" class="news-img">
          <div class="news-date">${dateVal}</div>
          <div class="news-headline">${headlineVal}</div>
          <div class="news-excerpt">${excerptVal}</div>
        `;

        const carouselTrack = cmsVirtualDoc.querySelector(".news-carousel");
        if (carouselTrack) {
          // If track is empty or cards don't exist, append. Otherwise place it
          const firstCard = carouselTrack.querySelector(".news-card");
          if (!firstCard) {
            newCard.classList.add("active");
          }
          carouselTrack.appendChild(newCard);
        }
      } else {
        // Edit existing card in virtual doc
        const cards = cmsVirtualDoc.querySelectorAll(".news-carousel .news-card");
        const card = cards[idx];
        if (card) {
          if (card.querySelector(".news-date")) card.querySelector(".news-date").textContent = dateVal;
          if (card.querySelector(".news-headline")) card.querySelector(".news-headline").textContent = headlineVal;
          if (card.querySelector(".news-excerpt")) card.querySelector(".news-excerpt").textContent = excerptVal;
          const imgEl = card.querySelector("img");
          if (imgEl) {
            imgEl.setAttribute("src", imgVal);
          }
        }
      }

      // Sync live page DOM
      syncAnnouncementsDOM();
      
      formPane.style.display = "none";
      refreshNewsList();
      saveToSession();
    });

    // Cancel / Close Form
    const closeForm = () => { formPane.style.display = "none"; };
    document.getElementById("cms-news-form-cancel").addEventListener("click", closeForm);
    document.getElementById("cms-news-cancel-btn").addEventListener("click", closeForm);

    // 4. Delete Announcement
    newsListDiv.addEventListener("click", (e) => {
      const delBtn = e.target.closest(".cms-news-del-btn");
      if (!delBtn) return;
      
      if (!confirm("Are you sure you want to delete this announcement?")) return;
      
      const idx = parseInt(delBtn.getAttribute("data-index"), 10);
      const cards = cmsVirtualDoc.querySelectorAll(".news-carousel .news-card");
      if (cards[idx]) {
        // If the card being deleted is active, mark the next or previous card active
        if (cards[idx].classList.contains("active") && cards.length > 1) {
          const fallbackIdx = (idx === 0) ? 1 : idx - 1;
          cards[fallbackIdx].classList.add("active");
        }
        cards[idx].remove();
      }

      syncAnnouncementsDOM();
      refreshNewsList();
      saveToSession();
    });

    // 5. Reordering News (Move Up / Down)
    newsListDiv.addEventListener("click", (e) => {
      const moveUpBtn = e.target.closest(".cms-news-moveup-btn");
      const moveDownBtn = e.target.closest(".cms-news-movedown-btn");
      if (!moveUpBtn && !moveDownBtn) return;

      const btn = moveUpBtn || moveDownBtn;
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      const isUp = !!moveUpBtn;

      const track = cmsVirtualDoc.querySelector(".news-carousel");
      const cards = Array.from(track.querySelectorAll(".news-card"));
      
      if (isUp && idx > 0) {
        // Swap with previous node
        track.insertBefore(cards[idx], cards[idx - 1]);
      } else if (!isUp && idx < cards.length - 1) {
        // Swap with next node
        track.insertBefore(cards[idx + 1], cards[idx]);
      }

      syncAnnouncementsDOM();
      refreshNewsList();
      saveToSession();
    });
  }

  // Helper: Synchronizes virtual doc announcements back to active live DOM and restarts carousel
  function syncAnnouncementsDOM() {
    const liveCarousel = document.querySelector(".news-carousel");
    if (!liveCarousel) return;

    // Clone parent section containing news-carousel to strip previous interval & event listeners
    const parentSection = liveCarousel.closest(".news-section");
    const refTitle = parentSection.querySelector(".section-title");

    // Rebuild track html in virtual
    const virtCarouselHTML = cmsVirtualDoc.querySelector(".news-carousel").outerHTML;
    
    // Replace carousel track DOM
    liveCarousel.outerHTML = virtCarouselHTML;

    // Re-initialize carousel trigger on the page
    if (typeof window.initCarousels === "function") {
      // Re-trigger global carousel binder by cloning to clear intervals
      const clonedParent = parentSection.cloneNode(true);
      parentSection.parentNode.replaceChild(clonedParent, parentSection);
      
      // Let it bind fresh listeners
      setTimeout(() => {
        window.initCarousels();
      }, 50);
    }
  }

  // ==========================================
  // TAB 3: TEAM MEMBERS
  // ==========================================
  function renderTeamTab(container) {
    // 1. Gather PI Details
    const virtPi = cmsVirtualDoc.querySelector("#team-pi");
    let piName = "Vignesh Kasinath", piRole = "Principal Investigator", piTitle = "Assistant Professor of Biochemistry", piEmail = "vignesh@colorado.edu", piTwitter = "@vignesh_k757", piPhoto = "assets/team_vignesh.jpg";

    if (virtPi) {
      if (virtPi.querySelector("h3")) piName = virtPi.querySelector("h3").textContent;
      if (virtPi.querySelector(".team-role")) piRole = virtPi.querySelector(".team-role").textContent;
      if (virtPi.querySelector(".pi-title")) piTitle = virtPi.querySelector(".pi-title").textContent;
      
      const emailEl = virtPi.querySelector('a[href^="mailto:"]');
      if (emailEl) piEmail = emailEl.textContent.trim();
      
      const twitEl = virtPi.querySelector('a[href*="twitter.com"], a[href*="x.com"]');
      if (twitEl) piTwitter = twitEl.textContent.trim();

      const imgEl = virtPi.querySelector("img");
      if (imgEl) piPhoto = imgEl.getAttribute("src").replace("/assets/", "assets/");
    }

    container.innerHTML = `
      <h3 class="cms-section-title">Principal Investigator</h3>
      <div class="cms-field">
        <label>PI Name</label>
        <input type="text" id="cms-pi-name" class="cms-input" value="${escapeHtml(piName)}">
      </div>
      <div class="cms-field">
        <label>Role / Position</label>
        <input type="text" id="cms-pi-role" class="cms-input" value="${escapeHtml(piRole)}">
      </div>
      <div class="cms-field">
        <label>Academic Title</label>
        <input type="text" id="cms-pi-title" class="cms-input" value="${escapeHtml(piTitle)}">
      </div>
      <div class="cms-field">
        <label>Email Contact</label>
        <input type="text" id="cms-pi-email" class="cms-input" value="${escapeHtml(piEmail)}">
      </div>
      <div class="cms-field">
        <label>Twitter/X Handle</label>
        <input type="text" id="cms-pi-twitter" class="cms-input" value="${escapeHtml(piTwitter)}">
      </div>
      <div class="cms-field">
        <label>Photo path</label>
        <input type="text" id="cms-pi-photo" class="cms-input" value="${escapeHtml(piPhoto)}">
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:40px; margin-bottom:20px; border-top:1px solid rgba(255,255,255,0.08); padding-top:20px;">
        <h3 class="cms-section-title" style="margin-bottom:0;">Lab Members</h3>
        <button class="cms-btn cms-btn-primary cms-btn-sm" id="cms-team-add-btn">
          <i class="fa-solid fa-plus"></i> Add Member
        </button>
      </div>

      <!-- Team Members List -->
      <div class="cms-items-list" id="cms-team-list"></div>

      <!-- Add/Edit Member Form Panel -->
      <div class="cms-editor-pane" id="cms-team-form-pane">
        <div class="cms-editor-pane-header">
          <h4 id="cms-team-form-title">Edit Member</h4>
          <button class="cms-close-btn" id="cms-team-form-cancel">&times;</button>
        </div>
        <input type="hidden" id="cms-team-edit-id">
        <div class="cms-field">
          <label>Member Name</label>
          <input type="text" id="cms-team-name" class="cms-input">
        </div>
        <div class="cms-field">
          <label>Role / Subtitle</label>
          <input type="text" id="cms-team-role" class="cms-input">
        </div>
        <div class="cms-field">
          <label>Image Resource Path</label>
          <input type="text" id="cms-team-img" class="cms-input" placeholder="assets/team_file.jpg">
        </div>
        <div class="cms-field">
          <label>Biography Details</label>
          <textarea id="cms-team-bio" class="cms-textarea" rows="5" placeholder="Write full custom biography paragraphs..."></textarea>
        </div>
        <div class="cms-button-row">
          <button class="cms-btn cms-btn-primary cms-btn-sm" id="cms-team-save-btn">Save</button>
          <button class="cms-btn cms-btn-secondary cms-btn-sm" id="cms-team-cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    // 1. Wire PI Inputs
    const updatePI = () => {
      const name = document.getElementById("cms-pi-name").value;
      const role = document.getElementById("cms-pi-role").value;
      const title = document.getElementById("cms-pi-title").value;
      const email = document.getElementById("cms-pi-email").value;
      const twitter = document.getElementById("cms-pi-twitter").value;
      const photo = document.getElementById("cms-pi-photo").value;

      // Update in virtual
      const piEl = cmsVirtualDoc.querySelector("#team-pi");
      if (piEl) {
        if (piEl.querySelector("h3")) piEl.querySelector("h3").textContent = name;
        if (piEl.querySelector(".team-role")) piEl.querySelector(".team-role").textContent = role;
        if (piEl.querySelector(".pi-title")) piEl.querySelector(".pi-title").textContent = title;
        if (piEl.querySelector("img")) piEl.querySelector("img").setAttribute("src", photo);
        
        const mailLink = piEl.querySelector('a[href^="mailto:"]');
        if (mailLink) {
          mailLink.setAttribute("href", `mailto:${email}`);
          mailLink.innerHTML = `<i class="fa-solid fa-envelope"></i> ${email}`;
        }
        
        const twitLink = piEl.querySelector('a[href*="twitter.com"], a[href*="x.com"]');
        if (twitLink) {
          const cleanTwitHandle = twitter.startsWith("@") ? twitter : "@" + twitter;
          const cleanLink = twitter.replace("@", "");
          twitLink.setAttribute("href", `https://twitter.com/${cleanLink}`);
          twitLink.innerHTML = `<i class="fa-brands fa-x-twitter"></i> ${cleanTwitHandle}`;
        }
      }

      // Update in live
      const livePiEl = document.querySelector("#team-pi");
      if (livePiEl) {
        if (livePiEl.querySelector("h3")) livePiEl.querySelector("h3").textContent = name;
        if (livePiEl.querySelector(".team-role")) livePiEl.querySelector(".team-role").textContent = role;
        if (livePiEl.querySelector(".pi-title")) livePiEl.querySelector(".pi-title").textContent = title;
        if (livePiEl.querySelector("img")) livePiEl.querySelector("img").setAttribute("src", photo);
        
        const mailLink = livePiEl.querySelector('a[href^="mailto:"]');
        if (mailLink) {
          mailLink.setAttribute("href", `mailto:${email}`);
          mailLink.innerHTML = `<i class="fa-solid fa-envelope"></i> ${email}`;
        }
        
        const twitLink = livePiEl.querySelector('a[href*="twitter.com"], a[href*="x.com"]');
        if (twitLink) {
          const cleanTwitHandle = twitter.startsWith("@") ? twitter : "@" + twitter;
          const cleanLink = twitter.replace("@", "");
          twitLink.setAttribute("href", `https://twitter.com/${cleanLink}`);
          twitLink.innerHTML = `<i class="fa-brands fa-x-twitter"></i> ${cleanTwitHandle}`;
        }
      }

      saveToSession();
    };

    const piFields = ["cms-pi-name", "cms-pi-role", "cms-pi-title", "cms-pi-email", "cms-pi-twitter", "cms-pi-photo"];
    piFields.forEach(fid => {
      document.getElementById(fid).addEventListener("input", updatePI);
    });

    // 2. Load members list
    const membersListDiv = document.getElementById("cms-team-list");
    const formPane = document.getElementById("cms-team-form-pane");

    function refreshMembersList() {
      membersListDiv.innerHTML = "";
      const cards = cmsVirtualDoc.querySelectorAll("#team-members .team-card");
      
      cards.forEach((card, idx) => {
        const id = card.id || `team-member-custom-${idx}`;
        const name = card.querySelector("h3") ? card.querySelector("h3").textContent : "No Name";
        const role = card.querySelector(".team-role") ? card.querySelector(".team-role").textContent : "";

        const row = document.createElement("div");
        row.className = "cms-item-row";
        row.innerHTML = `
          <div class="cms-item-info">
            <div class="cms-item-title">${escapeHtml(name)}</div>
            <div class="cms-item-subtitle">${escapeHtml(role)}</div>
          </div>
          <div class="cms-item-actions">
            <button class="cms-btn-action edit cms-team-edit-btn" data-index="${idx}" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="cms-btn-action cms-team-moveup-btn" data-index="${idx}" title="Move Up"><i class="fa-solid fa-chevron-up"></i></button>
            <button class="cms-btn-action cms-team-movedown-btn" data-index="${idx}" title="Move Down"><i class="fa-solid fa-chevron-down"></i></button>
            <button class="cms-btn-action delete cms-team-del-btn" data-index="${idx}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        `;
        membersListDiv.appendChild(row);
      });
    }

    refreshMembersList();

    // Edit Member trigger
    membersListDiv.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".cms-team-edit-btn");
      if (!editBtn) return;
      const idx = parseInt(editBtn.getAttribute("data-index"), 10);
      const cards = cmsVirtualDoc.querySelectorAll("#team-members .team-card");
      const card = cards[idx];
      if (!card) return;

      document.getElementById("cms-team-edit-id").value = idx;
      document.getElementById("cms-team-name").value = card.querySelector("h3") ? card.querySelector("h3").textContent.trim() : "";
      document.getElementById("cms-team-role").value = card.querySelector(".team-role") ? card.querySelector(".team-role").textContent.trim() : "";
      document.getElementById("cms-team-bio").value = card.getAttribute("data-bio") || "";
      
      const imgEl = card.querySelector("img");
      document.getElementById("cms-team-img").value = imgEl ? imgEl.getAttribute("src").replace("/assets/", "assets/") : "";

      document.getElementById("cms-team-form-title").textContent = "Edit Lab Member";
      formPane.style.display = "block";
      formPane.scrollIntoView({ behavior: "smooth" });
    });

    // Add Member trigger
    document.getElementById("cms-team-add-btn").addEventListener("click", () => {
      document.getElementById("cms-team-edit-id").value = "-1"; // indicates new
      document.getElementById("cms-team-name").value = "New Researcher Name";
      document.getElementById("cms-team-role").value = "PhD Student";
      document.getElementById("cms-team-bio").value = "Write custom bio here...";
      document.getElementById("cms-team-img").value = "assets/team_noah.jpg";

      document.getElementById("cms-team-form-title").textContent = "Add Lab Member";
      formPane.style.display = "block";
      formPane.scrollIntoView({ behavior: "smooth" });
    });

    // Save Member details
    document.getElementById("cms-team-save-btn").addEventListener("click", () => {
      const idx = parseInt(document.getElementById("cms-team-edit-id").value, 10);
      const nameVal = document.getElementById("cms-team-name").value;
      const roleVal = document.getElementById("cms-team-role").value;
      const imgVal = document.getElementById("cms-team-img").value;
      const bioVal = document.getElementById("cms-team-bio").value;

      if (idx === -1) {
        // Create new team card in virtual doc
        const newCard = cmsVirtualDoc.createElement("div");
        newCard.className = "glass-card team-card";
        newCard.id = "team-member-custom-" + Date.now();
        newCard.setAttribute("data-bio", bioVal);
        
        newCard.innerHTML = `
          <div class="team-photo-container">
            <img class="team-photo" src="${imgVal}" alt="${nameVal}">
          </div>
          <div class="team-info">
            <h3>${nameVal}</h3>
            <div class="team-role">${roleVal}</div>
          </div>
        `;

        const teamGrid = cmsVirtualDoc.querySelector("#team-members");
        if (teamGrid) teamGrid.appendChild(newCard);
      } else {
        // Edit existing card in virtual doc
        const cards = cmsVirtualDoc.querySelectorAll("#team-members .team-card");
        const card = cards[idx];
        if (card) {
          if (card.querySelector("h3")) card.querySelector("h3").textContent = nameVal;
          if (card.querySelector(".team-role")) card.querySelector(".team-role").textContent = roleVal;
          if (card.querySelector("img")) card.querySelector("img").setAttribute("src", imgVal);
          card.setAttribute("data-bio", bioVal);
        }
      }

      // Sync active page DOM
      syncTeamDOM();
      
      formPane.style.display = "none";
      refreshMembersList();
      saveToSession();
    });

    // Cancel / Close Form
    const closeForm = () => { formPane.style.display = "none"; };
    document.getElementById("cms-team-form-cancel").addEventListener("click", closeForm);
    document.getElementById("cms-team-cancel-btn").addEventListener("click", closeForm);

    // Delete Member
    membersListDiv.addEventListener("click", (e) => {
      const delBtn = e.target.closest(".cms-team-del-btn");
      if (!delBtn) return;
      
      if (!confirm("Are you sure you want to remove this member?")) return;
      
      const idx = parseInt(delBtn.getAttribute("data-index"), 10);
      const cards = cmsVirtualDoc.querySelectorAll("#team-members .team-card");
      if (cards[idx]) cards[idx].remove();

      syncTeamDOM();
      refreshMembersList();
      saveToSession();
    });

    // Move Up/Down Reorder Member
    membersListDiv.addEventListener("click", (e) => {
      const moveUpBtn = e.target.closest(".cms-team-moveup-btn");
      const moveDownBtn = e.target.closest(".cms-team-movedown-btn");
      if (!moveUpBtn && !moveDownBtn) return;

      const btn = moveUpBtn || moveDownBtn;
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      const isUp = !!moveUpBtn;

      const grid = cmsVirtualDoc.querySelector("#team-members");
      const cards = Array.from(grid.querySelectorAll(".team-card"));
      
      if (isUp && idx > 0) {
        grid.insertBefore(cards[idx], cards[idx - 1]);
      } else if (!isUp && idx < cards.length - 1) {
        grid.insertBefore(cards[idx + 1], cards[idx]);
      }

      syncTeamDOM();
      refreshMembersList();
      saveToSession();
    });
  }

  // Helper: Synchronizes virtual doc team members back to active live DOM
  function syncTeamDOM() {
    const liveGrid = document.getElementById("team-members");
    if (!liveGrid) return;
    
    const virtGrid = cmsVirtualDoc.querySelector("#team-members");
    liveGrid.innerHTML = virtGrid.innerHTML;
  }

  // ==========================================
  // TAB 4: ALUMNI
  // ==========================================
  function renderAlumniTab(container) {
    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h3 class="cms-section-title" style="margin-bottom:0;">Alumni Categories</h3>
        <button class="cms-btn cms-btn-primary cms-btn-sm" id="cms-alumni-add-cat-btn">
          <i class="fa-solid fa-plus"></i> Add Category
        </button>
      </div>

      <div class="cms-items-list" id="cms-alumni-categories-list"></div>

      <!-- Add/Edit Category Modal-Pane -->
      <div class="cms-editor-pane" id="cms-alumni-cat-form-pane">
        <div class="cms-editor-pane-header">
          <h4 id="cms-alumni-cat-title">Edit Category</h4>
          <button class="cms-close-btn" id="cms-alumni-cat-cancel">&times;</button>
        </div>
        <input type="hidden" id="cms-alumni-cat-edit-id">
        <div class="cms-field">
          <label>Category Title</label>
          <input type="text" id="cms-alumni-cat-name" class="cms-input" placeholder="e.g. High School or Bridges to Bioscience (B2B)">
        </div>
        <div class="cms-button-row">
          <button class="cms-btn cms-btn-primary cms-btn-sm" id="cms-alumni-cat-save-btn">Save</button>
          <button class="cms-btn cms-btn-secondary cms-btn-sm" id="cms-alumni-cat-cancel-btn">Cancel</button>
        </div>
      </div>

      <!-- Category Participants List Panel -->
      <div class="cms-editor-pane" id="cms-alumni-list-pane" style="display:none; margin-top:20px;">
        <div class="cms-editor-pane-header">
          <h4 id="cms-alumni-list-title">Manage Members</h4>
          <button class="cms-close-btn" id="cms-alumni-list-close">&times;</button>
        </div>
        <input type="hidden" id="cms-alumni-list-cat-idx">
        
        <div style="display:flex; gap:10px; margin-bottom:15px;">
          <input type="text" id="cms-alumni-new-name" class="cms-input" style="flex:1;" placeholder="Name (e.g. Carson McKenna)">
          <input type="text" id="cms-alumni-new-details" class="cms-input" style="flex:1;" placeholder="Details/Year (e.g. Summer 2022)">
          <button class="cms-btn cms-btn-primary cms-btn-sm" id="cms-alumni-add-item-btn"><i class="fa-solid fa-plus"></i> Add</button>
        </div>

        <div class="cms-items-list" id="cms-alumni-members-list"></div>
      </div>
    `;

    const catListDiv = document.getElementById("cms-alumni-categories-list");
    const catFormPane = document.getElementById("cms-alumni-cat-form-pane");
    const listPane = document.getElementById("cms-alumni-list-pane");
    const membersListDiv = document.getElementById("cms-alumni-members-list");

    function refreshAlumniCategories() {
      catListDiv.innerHTML = "";
      const cards = cmsVirtualDoc.querySelectorAll(".alumni-grid .alumni-card");

      cards.forEach((card, idx) => {
        const title = card.querySelector("h4") ? card.querySelector("h4").textContent.trim() : "Category";
        const membersCount = card.querySelectorAll("li").length;

        const row = document.createElement("div");
        row.className = "cms-item-row";
        row.innerHTML = `
          <div class="cms-item-info">
            <div class="cms-item-title">${escapeHtml(title)}</div>
            <div class="cms-item-subtitle">${membersCount} participants listed</div>
          </div>
          <div class="cms-item-actions">
            <button class="cms-btn-action cms-alumni-view-btn" data-index="${idx}" title="Manage Members"><i class="fa-solid fa-list-ul"></i></button>
            <button class="cms-btn-action edit cms-alumni-cat-edit-btn" data-index="${idx}" title="Rename"><i class="fa-solid fa-pen"></i></button>
            <button class="cms-btn-action delete cms-alumni-cat-del-btn" data-index="${idx}" title="Delete Category"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        `;
        catListDiv.appendChild(row);
      });
    }

    refreshAlumniCategories();

    // 1. Rename Category trigger
    catListDiv.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".cms-alumni-cat-edit-btn");
      if (!editBtn) return;
      const idx = parseInt(editBtn.getAttribute("data-index"), 10);
      const card = cmsVirtualDoc.querySelectorAll(".alumni-grid .alumni-card")[idx];
      if (!card) return;

      document.getElementById("cms-alumni-cat-edit-id").value = idx;
      document.getElementById("cms-alumni-cat-name").value = card.querySelector("h4") ? card.querySelector("h4").textContent.trim() : "";
      
      document.getElementById("cms-alumni-cat-title").textContent = "Rename Category";
      catFormPane.style.display = "block";
    });

    // 2. Add Category trigger
    document.getElementById("cms-alumni-add-cat-btn").addEventListener("click", () => {
      document.getElementById("cms-alumni-cat-edit-id").value = "-1";
      document.getElementById("cms-alumni-cat-name").value = "New Program Group";
      
      document.getElementById("cms-alumni-cat-title").textContent = "Add Category Group";
      catFormPane.style.display = "block";
    });

    // 3. Save Category Group
    document.getElementById("cms-alumni-cat-save-btn").addEventListener("click", () => {
      const idx = parseInt(document.getElementById("cms-alumni-cat-edit-id").value, 10);
      const titleVal = document.getElementById("cms-alumni-cat-name").value;

      if (idx === -1) {
        const newCard = cmsVirtualDoc.createElement("div");
        newCard.className = "glass-card alumni-card";
        newCard.innerHTML = `
          <h4>${titleVal}</h4>
          <ul></ul>
        `;
        const grid = cmsVirtualDoc.querySelector(".alumni-grid");
        if (grid) grid.appendChild(newCard);
      } else {
        const cards = cmsVirtualDoc.querySelectorAll(".alumni-grid .alumni-card");
        if (cards[idx] && cards[idx].querySelector("h4")) {
          cards[idx].querySelector("h4").textContent = titleVal;
        }
      }

      syncAlumniDOM();
      catFormPane.style.display = "none";
      refreshAlumniCategories();
      saveToSession();
    });

    const closeCatForm = () => { catFormPane.style.display = "none"; };
    document.getElementById("cms-alumni-cat-cancel").addEventListener("click", closeCatForm);
    document.getElementById("cms-alumni-cat-cancel-btn").addEventListener("click", closeCatForm);

    // Delete Category
    catListDiv.addEventListener("click", (e) => {
      const delBtn = e.target.closest(".cms-alumni-cat-del-btn");
      if (!delBtn) return;
      if (!confirm("Are you sure you want to delete this category and all its members?")) return;

      const idx = parseInt(delBtn.getAttribute("data-index"), 10);
      const cards = cmsVirtualDoc.querySelectorAll(".alumni-grid .alumni-card");
      if (cards[idx]) cards[idx].remove();

      syncAlumniDOM();
      listPane.style.display = "none";
      refreshAlumniCategories();
      saveToSession();
    });

    // 4. View and Manage Members trigger
    catListDiv.addEventListener("click", (e) => {
      const viewBtn = e.target.closest(".cms-alumni-view-btn");
      if (!viewBtn) return;
      const idx = parseInt(viewBtn.getAttribute("data-index"), 10);
      
      openAlumniMembersList(idx);
    });

    function openAlumniMembersList(catIdx) {
      const card = cmsVirtualDoc.querySelectorAll(".alumni-grid .alumni-card")[catIdx];
      if (!card) return;

      const title = card.querySelector("h4") ? card.querySelector("h4").textContent.trim() : "Members";
      document.getElementById("cms-alumni-list-title").textContent = `Group: ${title}`;
      document.getElementById("cms-alumni-list-cat-idx").value = catIdx;
      
      refreshAlumniMembers(catIdx);
      listPane.style.display = "block";
      listPane.scrollIntoView({ behavior: "smooth" });
    }

    function refreshAlumniMembers(catIdx) {
      membersListDiv.innerHTML = "";
      const card = cmsVirtualDoc.querySelectorAll(".alumni-grid .alumni-card")[catIdx];
      if (!card) return;

      const items = card.querySelectorAll("ul li");
      items.forEach((li, idx) => {
        // extract name and description
        const rawText = li.textContent.trim();
        let name = rawText;
        let details = "";
        
        // typical format: "Name (Detail)"
        const braceIdx = rawText.indexOf("(");
        if (braceIdx !== -1) {
          name = rawText.substring(0, braceIdx).trim();
          details = rawText.substring(braceIdx + 1, rawText.length - 1).trim();
        }

        const row = document.createElement("div");
        row.className = "cms-item-row";
        row.style.padding = "8px 12px";
        row.innerHTML = `
          <div class="cms-item-info">
            <div class="cms-item-title" style="font-size:0.85rem;">${escapeHtml(name)}</div>
            <div class="cms-item-subtitle" style="font-size:0.75rem;">${escapeHtml(details)}</div>
          </div>
          <div class="cms-item-actions">
            <button class="cms-btn-action delete cms-alumni-member-del-btn" data-member-idx="${idx}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        `;
        membersListDiv.appendChild(row);
      });
    }

    // Add member item to category
    document.getElementById("cms-alumni-add-item-btn").addEventListener("click", () => {
      const catIdx = parseInt(document.getElementById("cms-alumni-list-cat-idx").value, 10);
      const name = document.getElementById("cms-alumni-new-name").value.trim();
      const details = document.getElementById("cms-alumni-new-details").value.trim();

      if (!name) return;

      const card = cmsVirtualDoc.querySelectorAll(".alumni-grid .alumni-card")[catIdx];
      if (card) {
        let ul = card.querySelector("ul");
        if (!ul) {
          ul = cmsVirtualDoc.createElement("ul");
          card.appendChild(ul);
        }

        const li = cmsVirtualDoc.createElement("li");
        const fullText = details ? `${name} (${details})` : name;
        li.innerHTML = `<i class="fa-solid fa-circle-notch"></i> ${fullText}`;
        ul.appendChild(li);

        syncAlumniDOM();
        refreshAlumniMembers(catIdx);
        refreshAlumniCategories();
        
        // Reset fields
        document.getElementById("cms-alumni-new-name").value = "";
        document.getElementById("cms-alumni-new-details").value = "";
        saveToSession();
      }
    });

    // Delete member item from category
    membersListDiv.addEventListener("click", (e) => {
      const delBtn = e.target.closest(".cms-alumni-member-del-btn");
      if (!delBtn) return;
      const catIdx = parseInt(document.getElementById("cms-alumni-list-cat-idx").value, 10);
      const mIdx = parseInt(delBtn.getAttribute("data-member-idx"), 10);

      const card = cmsVirtualDoc.querySelectorAll(".alumni-grid .alumni-card")[catIdx];
      if (card) {
        const lis = card.querySelectorAll("ul li");
        if (lis[mIdx]) lis[mIdx].remove();

        syncAlumniDOM();
        refreshAlumniMembers(catIdx);
        refreshAlumniCategories();
        saveToSession();
      }
    });

    document.getElementById("cms-alumni-list-close").addEventListener("click", () => {
      listPane.style.display = "none";
    });
  }

  // Helper: Synchronizes virtual doc alumni categories back to active live DOM
  function syncAlumniDOM() {
    const liveGrid = document.querySelector(".alumni-grid");
    if (!liveGrid) return;
    
    const virtGrid = cmsVirtualDoc.querySelector(".alumni-grid");
    liveGrid.innerHTML = virtGrid.innerHTML;
  }

  // ==========================================
  // TAB 5: GALLERIES (PHOTOS/SHENANIGANS)
  // ==========================================
  function renderGalleryTab(container) {
    container.innerHTML = `
      <div class="cms-field">
        <label>Select Lab Gallery</label>
        <select id="cms-gallery-select" class="cms-input" style="font-weight:600;">
          <option value="carousel-lab-photos">Lab Photos / Gatherings</option>
          <option value="carousel-lab-shenanigans">Lab Shenanigans</option>
          <option value="carousel-life-outside-the-lab">Life Outside the Lab</option>
        </select>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:25px; margin-bottom:20px;">
        <h3 class="cms-section-title" style="margin-bottom:0;">Gallery Images</h3>
        <button class="cms-btn cms-btn-primary cms-btn-sm" id="cms-gallery-add-btn">
          <i class="fa-solid fa-plus"></i> Add Image
        </button>
      </div>

      <!-- Gallery Items List -->
      <div class="cms-items-list" id="cms-gallery-list"></div>

      <!-- Add/Edit Gallery Image Form -->
      <div class="cms-editor-pane" id="cms-gallery-form-pane">
        <div class="cms-editor-pane-header">
          <h4 id="cms-gallery-form-title">Edit Image Card</h4>
          <button class="cms-close-btn" id="cms-gallery-form-cancel">&times;</button>
        </div>
        <input type="hidden" id="cms-gallery-edit-id">
        <div class="cms-field">
          <label>Caption / Title</label>
          <input type="text" id="cms-gallery-caption" class="cms-input">
        </div>
        <div class="cms-field">
          <label>Image Source URL / Relative Path</label>
          <input type="text" id="cms-gallery-url" class="cms-input" placeholder="https://... or assets/...">
        </div>
        <div class="cms-button-row">
          <button class="cms-btn cms-btn-primary cms-btn-sm" id="cms-gallery-save-btn">Save</button>
          <button class="cms-btn cms-btn-secondary cms-btn-sm" id="cms-gallery-cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    const selectEl = document.getElementById("cms-gallery-select");
    const galleryListDiv = document.getElementById("cms-gallery-list");
    const formPane = document.getElementById("cms-gallery-form-pane");

    function refreshGalleryList() {
      galleryListDiv.innerHTML = "";
      const galleryId = selectEl.value;
      const items = cmsVirtualDoc.querySelectorAll(`#${galleryId} .carousel-item`);

      items.forEach((item, idx) => {
        const caption = item.querySelector("h4") ? item.querySelector("h4").textContent.trim() : "Image " + idx;
        const imgEl = item.querySelector("img");
        const url = imgEl ? imgEl.getAttribute("src") : "";

        const row = document.createElement("div");
        row.className = "cms-item-row";
        row.innerHTML = `
          <div class="cms-img-preview" style="background-image: url('${url}');"></div>
          <div class="cms-item-info">
            <div class="cms-item-title">${escapeHtml(caption)}</div>
            <div class="cms-item-subtitle" style="font-family:monospace; font-size:0.7rem;">${escapeHtml(url)}</div>
          </div>
          <div class="cms-item-actions">
            <button class="cms-btn-action edit cms-gallery-edit-btn" data-index="${idx}" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="cms-btn-action cms-gallery-moveup-btn" data-index="${idx}" title="Move Up"><i class="fa-solid fa-chevron-up"></i></button>
            <button class="cms-btn-action cms-gallery-movedown-btn" data-index="${idx}" title="Move Down"><i class="fa-solid fa-chevron-down"></i></button>
            <button class="cms-btn-action delete cms-gallery-del-btn" data-index="${idx}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        `;
        galleryListDiv.appendChild(row);
      });
    }

    refreshGalleryList();

    // Re-list when changing gallery selection
    selectEl.addEventListener("change", refreshGalleryList);

    // Edit Gallery Item trigger
    galleryListDiv.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".cms-gallery-edit-btn");
      if (!editBtn) return;
      const idx = parseInt(editBtn.getAttribute("data-index"), 10);
      const galleryId = selectEl.value;
      const items = cmsVirtualDoc.querySelectorAll(`#${galleryId} .carousel-item`);
      const item = items[idx];
      if (!item) return;

      document.getElementById("cms-gallery-edit-id").value = idx;
      document.getElementById("cms-gallery-caption").value = item.querySelector("h4") ? item.querySelector("h4").textContent.trim() : "";
      
      const imgEl = item.querySelector("img");
      document.getElementById("cms-gallery-url").value = imgEl ? imgEl.getAttribute("src") : "";

      document.getElementById("cms-gallery-form-title").textContent = "Edit Gallery Image";
      formPane.style.display = "block";
      formPane.scrollIntoView({ behavior: "smooth" });
    });

    // Add Gallery Item trigger
    document.getElementById("cms-gallery-add-btn").addEventListener("click", () => {
      document.getElementById("cms-gallery-edit-id").value = "-1";
      document.getElementById("cms-gallery-caption").value = "New Gallery Caption";
      document.getElementById("cms-gallery-url").value = "https://images.squarespace-cdn.com/...";

      document.getElementById("cms-gallery-form-title").textContent = "Add Gallery Image";
      formPane.style.display = "block";
      formPane.scrollIntoView({ behavior: "smooth" });
    });

    // Save Gallery Item
    document.getElementById("cms-gallery-save-btn").addEventListener("click", () => {
      const idx = parseInt(document.getElementById("cms-gallery-edit-id").value, 10);
      const captionVal = document.getElementById("cms-gallery-caption").value;
      const urlVal = document.getElementById("cms-gallery-url").value;
      const galleryId = selectEl.value;

      // Extract raw type name for data-gallery mapping (e.g. lab-photos)
      const galleryTag = galleryId.replace("carousel-", "");

      if (idx === -1) {
        // Add to virtual
        const newItem = cmsVirtualDoc.createElement("div");
        newItem.className = "carousel-item glass-card";
        newItem.setAttribute("data-gallery", galleryTag);
        newItem.setAttribute("onclick", "openLightbox(this)");
        newItem.innerHTML = `
          <img src="${urlVal}" alt="${captionVal}" loading="lazy">
          <div class="carousel-item-caption">
            <h4>${captionVal}</h4>
          </div>
        `;

        const track = cmsVirtualDoc.querySelector(`#${galleryId} .carousel-track`);
        if (track) track.appendChild(newItem);
      } else {
        // Edit existing in virtual
        const items = cmsVirtualDoc.querySelectorAll(`#${galleryId} .carousel-item`);
        const item = items[idx];
        if (item) {
          if (item.querySelector("h4")) item.querySelector("h4").textContent = captionVal;
          const imgEl = item.querySelector("img");
          if (imgEl) {
            imgEl.setAttribute("src", urlVal);
            imgEl.setAttribute("alt", captionVal);
          }
        }
      }

      // Re-index virtual elements
      reindexGalleryItems(galleryId);

      // Sync active page DOM
      syncGalleryDOM(galleryId);
      
      formPane.style.display = "none";
      refreshGalleryList();
      saveToSession();
    });

    const closeForm = () => { formPane.style.display = "none"; };
    document.getElementById("cms-gallery-form-cancel").addEventListener("click", closeForm);
    document.getElementById("cms-gallery-cancel-btn").addEventListener("click", closeForm);

    // Delete Gallery Item
    galleryListDiv.addEventListener("click", (e) => {
      const delBtn = e.target.closest(".cms-gallery-del-btn");
      if (!delBtn) return;
      if (!confirm("Are you sure you want to delete this gallery image?")) return;

      const idx = parseInt(delBtn.getAttribute("data-index"), 10);
      const galleryId = selectEl.value;
      const items = cmsVirtualDoc.querySelectorAll(`#${galleryId} .carousel-item`);
      if (items[idx]) items[idx].remove();

      reindexGalleryItems(galleryId);
      syncGalleryDOM(galleryId);
      refreshGalleryList();
      saveToSession();
    });

    // Move Up / Down Reorder Gallery Item
    galleryListDiv.addEventListener("click", (e) => {
      const moveUpBtn = e.target.closest(".cms-gallery-moveup-btn");
      const moveDownBtn = e.target.closest(".cms-gallery-movedown-btn");
      if (!moveUpBtn && !moveDownBtn) return;

      const btn = moveUpBtn || moveDownBtn;
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      const isUp = !!moveUpBtn;

      const galleryId = selectEl.value;
      const track = cmsVirtualDoc.querySelector(`#${galleryId} .carousel-track`);
      const items = Array.from(track.querySelectorAll(".carousel-item"));
      
      if (isUp && idx > 0) {
        track.insertBefore(items[idx], items[idx - 1]);
      } else if (!isUp && idx < items.length - 1) {
        track.insertBefore(items[idx + 1], items[idx]);
      }

      reindexGalleryItems(galleryId);
      syncGalleryDOM(galleryId);
      refreshGalleryList();
      saveToSession();
    });
  }

  // Re-indexes data-index attributes so lightbox doesn't break
  function reindexGalleryItems(galleryId) {
    const items = cmsVirtualDoc.querySelectorAll(`#${galleryId} .carousel-item`);
    items.forEach((item, idx) => {
      item.setAttribute("data-index", idx);
    });
  }

  // Helper: Synchronizes virtual doc gallery back to active live DOM
  function syncGalleryDOM(galleryId) {
    const liveCarousel = document.getElementById(galleryId);
    if (!liveCarousel) return;

    // Clone parent to strip previous event listeners and prevent scroll arrow duplicates
    const parentContainer = liveCarousel.closest(".gallery-section");
    
    // Replace track HTML
    const liveTrack = liveCarousel.querySelector(".carousel-track");
    const virtTrack = cmsVirtualDoc.querySelector(`#${galleryId} .carousel-track`);
    if (liveTrack && virtTrack) {
      liveTrack.innerHTML = virtTrack.innerHTML;
    }

    // Re-initialize carousel trigger on the page
    if (typeof window.initCarousels === "function") {
      const clonedParent = parentContainer.cloneNode(true);
      parentContainer.parentNode.replaceChild(clonedParent, parentContainer);
      
      setTimeout(() => {
        window.initCarousels();
      }, 50);
    }
  }

  // ==========================================
  // TAB 6: EXPORT & SYNC (PUBLISH)
  // ==========================================
  function renderExportTab(container) {
    container.innerHTML = `
      <h3 class="cms-section-title">Save & Export Code</h3>
      
      <div class="cms-instructions">
        <h4><i class="fa-solid fa-lightbulb"></i> How to apply changes:</h4>
        <ol>
          <li>Click **Download index.html** to get the updated source file.</li>
          <li>Click **Download site.region** to get the Squarespace template file.</li>
          <li>Over-write the original ` + "`index.html`" + ` and ` + "`site.region`" + ` in your local workspace folder.</li>
          <li>Commit the files and push to your **preview** branch to review staging, then merge to **master** to go live!</li>
        </ol>
      </div>

      <button class="cms-btn cms-btn-primary cms-btn-full" id="cms-export-html" style="padding:14px; margin-bottom:15px; font-size:0.95rem;">
        <i class="fa-solid fa-download"></i> Download index.html
      </button>

      <button class="cms-btn cms-btn-primary cms-btn-full" id="cms-export-region" style="padding:14px; margin-bottom:20px; font-size:0.95rem; background:linear-gradient(135deg, #10b981 0%, #059669 100%);">
        <i class="fa-solid fa-server"></i> Download site.region
      </button>

      <button class="cms-btn cms-btn-danger cms-btn-full cms-btn-sm" id="cms-reset-session" style="margin-top:20px; opacity:0.8;">
        <i class="fa-solid fa-arrow-rotate-left"></i> Discard Session Edits
      </button>
    `;

    // 1. Export index.html
    document.getElementById("cms-export-html").addEventListener("click", () => {
      // Build index.html string from clean virtual doc
      // Ensure we remove any visual highlight classes in the virtual doc before serializing
      const docClone = cmsVirtualDoc.cloneNode(true);
      
      // Clean highlights just in case
      docClone.querySelectorAll('.cms-editable-highlight-preview').forEach(el => {
        el.classList.remove('cms-editable-highlight-preview');
      });

      const serialized = "<!DOCTYPE html>\n" + docClone.documentElement.outerHTML;
      triggerFileDownload("index.html", serialized);
    });

    // 2. Export site.region
    document.getElementById("cms-export-region").addEventListener("click", () => {
      // Build site.region from clean virtual doc clone
      const docClone = cmsVirtualDoc.cloneNode(true);
      
      // Clean highlights
      docClone.querySelectorAll('.cms-editable-highlight-preview').forEach(el => {
        el.classList.remove('cms-editable-highlight-preview');
      });

      let html = docClone.documentElement.outerHTML;

      // Run Squarespace transformations equivalent to dev/build-region.sh:
      
      // 1. make all relative asset refs absolute
      html = html.replace(/"assets\//g, '"/assets/');
      
      // 2. og:image absolute URL
      html = html.replace(
        /<meta property="og:image" content="\/assets\//g,
        '<meta property="og:image" content="https://vignesh-kasinath.squarespace.com/assets/'
      );
      
      // 3. body gets Squarespace per-page hooks
      html = html.replace(/<body>/g, '<body id="{squarespace.page-id}" class="{squarespace.page-classes}">');
      
      // 4. headers tag before </head>
      html = html.replace(/<\/head>/g, '  {squarespace-headers}\n</head>');
      
      // 5. main-content + footers before </body>
      html = html.replace(
        /<\/body>/g,
        '  <div class="sqs-main-content" data-content-field="main-content" aria-hidden="true" style="display:none">{squarespace.main-content}</div>\n  {squarespace-footers}\n</body>'
      );

      // Prepend generated warning banner
      const siteRegionContent = `<!-- GENERATED from index.html by dev/build-region.sh — DO NOT EDIT BY HAND. Edit index.html, then re-run. -->\n<!DOCTYPE html>\n` + html;
      triggerFileDownload("site.region", siteRegionContent);
    });

    // 3. Reset Session
    document.getElementById("cms-reset-session").addEventListener("click", () => {
      if (!confirm("Are you sure you want to discard all changes made in this session and reload the page?")) return;
      sessionStorage.removeItem("kaslab_cms_edits");
      window.location.hash = "";
      window.location.reload();
    });
  }

  // Trigger file download in browser
  function triggerFileDownload(filename, text) {
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
    element.setAttribute("download", filename);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  // ==========================================
  // LOCAL STORAGE / SESSION PERSISTENCE
  // ==========================================
  
  // Save edited virtual DOM state into sessionStorage (or localStorage if preferred)
  // so refreshing does not wipe changes before downloading
  function saveToSession() {
    if (!cmsVirtualDoc) return;
    try {
      const serialized = cmsVirtualDoc.documentElement.outerHTML;
      sessionStorage.setItem("kaslab_cms_edits", serialized);
      console.log("Edits autosaved to session storage.");
    } catch (e) {
      console.warn("Failed to write to session storage", e);
    }
  }

  // Reload edits from session storage if they exist
  function loadFromSession() {
    const saved = sessionStorage.getItem("kaslab_cms_edits");
    if (saved && cmsVirtualDoc) {
      const parser = new DOMParser();
      cmsVirtualDoc = parser.parseFromString(saved, "text/html");
      console.log("Restored session edits.");
      
      // Sync all main elements to live DOM on load
      syncAnnouncementsDOM();
      syncTeamDOM();
      syncAlumniDOM();
      
      // Sync text fields
      const heroH1 = cmsVirtualDoc.querySelector("#home .hero-content h1");
      if (heroH1) {
        const liveH1 = document.querySelector("#home .hero-content h1");
        if (liveH1) liveH1.innerHTML = heroH1.innerHTML;
      }
      
      const virtP = cmsVirtualDoc.querySelectorAll("#home .hero-description");
      const liveP = document.querySelectorAll("#home .hero-description");
      // Remove any excess live paragraphs
      if (liveP.length > virtP.length) {
        for (let i = virtP.length; i < liveP.length; i++) {
          liveP[i].remove();
        }
      }
      // Update or append
      virtP.forEach((p, idx) => {
        const liveSec = document.querySelector("#home .hero-content");
        const liveParagraphs = document.querySelectorAll("#home .hero-description");
        if (liveParagraphs[idx]) {
          liveParagraphs[idx].textContent = p.textContent;
        } else {
          const newP = document.createElement("p");
          newP.className = "hero-description";
          newP.textContent = p.textContent;
          liveSec.insertBefore(newP, liveSec.querySelector(".button-group"));
        }
      });

      // Sync outreach text
      const virtOutP = cmsVirtualDoc.querySelectorAll(".outreach-intro p");
      const liveOutP = document.querySelectorAll(".outreach-intro p");
      if (liveOutP.length > virtOutP.length) {
        for (let i = virtOutP.length; i < liveOutP.length; i++) {
          liveOutP[i].remove();
        }
      }
      virtOutP.forEach((p, idx) => {
        const liveSec = document.querySelector(".outreach-intro");
        const liveParagraphs = document.querySelectorAll(".outreach-intro p");
        if (liveParagraphs[idx]) {
          liveParagraphs[idx].textContent = p.textContent;
        } else {
          const newP = document.createElement("p");
          newP.textContent = p.textContent;
          liveSec.appendChild(newP);
        }
      });

      // Sync galleries
      ["carousel-lab-photos", "carousel-lab-shenanigans", "carousel-life-outside-the-lab"].forEach(gid => {
        syncGalleryDOM(gid);
      });
    }
  }

  // Run loadFromSession after templates finish setup
  const originalSetup = setupCMS;
  setupCMS = async function() {
    await originalSetup();
    loadFromSession();
  };

  // Helper to escape HTML characters in input values
  function escapeHtml(text) {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Run initialization
  init();
})();
