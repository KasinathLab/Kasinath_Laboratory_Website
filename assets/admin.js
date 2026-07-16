/* =========================================================================
   KASINATH LAB CMS — ADMIN PORTAL ENGINE
   ========================================================================= */

(function() {
  // Passcode protection state
  const CMS_PASSCODE = "kasinath2026";
  let cmsVirtualDoc = null;
  let activeTab = "tab-general";
  const pendingUploads = {}; // Maps assets/filename -> base64 string

  function bindUploadZone(dropZoneId, fileInputId, textInputId, updateCallback) {
    const dropZone = document.getElementById(dropZoneId);
    const fileInput = document.getElementById(fileInputId);
    const textInput = document.getElementById(textInputId);

    if (!dropZone || !fileInput || !textInput) return;

    // Open file dialog on click
    dropZone.addEventListener("click", () => fileInput.click());

    // Highlight on hover
    ["dragenter", "dragover"].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add("hover");
      }, false);
    });

    ["dragleave", "drop"].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove("hover");
      }, false);
    });

    // Handle dropped files
    dropZone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    });

    // Handle selected files
    fileInput.addEventListener("change", (e) => {
      if (fileInput.files.length > 0) {
        handleFile(fileInput.files[0]);
      }
    });

    function handleFile(file) {
      if (!file.type.startsWith("image/")) {
        alert("Only image files are allowed.");
        return;
      }

      const cleanName = file.name.toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_.-]/g, "");
      
      const targetPath = "assets/" + cleanName;

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        const base64Data = dataUrl.split(",")[1];

        pendingUploads[targetPath] = base64Data;
        textInput.value = targetPath;

        if (typeof updateCallback === "function") {
          updateCallback(dataUrl, targetPath);
        }
      };
      reader.readAsDataURL(file);
    }
  }

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
          <button class="cms-nav-item" data-tab="tab-research"><i class="fa-solid fa-flask-vial"></i>Research</button>
          <button class="cms-nav-item" data-tab="tab-pubs"><i class="fa-solid fa-book"></i>Pubs</button>
          <button class="cms-nav-item" data-tab="tab-news"><i class="fa-solid fa-bullhorn"></i>News</button>
          <button class="cms-nav-item" data-tab="tab-team"><i class="fa-solid fa-user-gear"></i>Team</button>
          <button class="cms-nav-item" data-tab="tab-alumni"><i class="fa-solid fa-graduation-cap"></i>Alumni</button>
          <button class="cms-nav-item" data-tab="tab-openings"><i class="fa-solid fa-briefcase"></i>Openings</button>
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
      '.carousel-container .carousel-item',
      '#research > p',
      '#research-pillars .research-card, #research-pillars-apps .research-card',
      '#research-methodology h3',
      '#research-methodology p',
      '#research-methodology ul li',
      '#publications-content .publication-item',
      '#openings > p',
      '#opportunities-list .position-card',
      '#contact .section-title',
      '#contact > p',
      '#contact-details .contact-item-box p'
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
    } else if (activeTab === "tab-research") {
      renderResearchTab(contentArea);
    } else if (activeTab === "tab-pubs") {
      renderPubsTab(contentArea);
    } else if (activeTab === "tab-news") {
      renderNewsTab(contentArea);
    } else if (activeTab === "tab-team") {
      renderTeamTab(contentArea);
    } else if (activeTab === "tab-alumni") {
      renderAlumniTab(contentArea);
    } else if (activeTab === "tab-openings") {
      renderOpeningsTab(contentArea);
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
    // Parse Logo & Branding
    const virtLogoImg = cmsVirtualDoc.querySelector("#brand-logo img");
    let logoImgSrc = "assets/lab_logo.png";
    if (virtLogoImg) {
      logoImgSrc = virtLogoImg.getAttribute("src").replace("/assets/", "assets/");
    }

    const virtLogoText = cmsVirtualDoc.querySelector("#brand-logo .logo-text");
    let logoText = "KASINATH LAB";
    if (virtLogoText) {
      logoText = virtLogoText.textContent.trim();
    }

    const virtFooterLogo = cmsVirtualDoc.querySelector("footer .footer-logo");
    let footerLogoText = "VIGNESH KASINATH LAB";
    if (virtFooterLogo) {
      footerLogoText = virtFooterLogo.textContent.trim();
    }

    container.innerHTML = `
      <h3 class="cms-section-title">Logo & Branding</h3>
      <div class="cms-field">
        <label>Logo Image Path</label>
        <input type="text" id="cms-logo-img" class="cms-input" value="${escapeHtml(logoImgSrc)}">
        <div class="cms-drop-zone" id="cms-logo-dropzone">
          <i class="fa-solid fa-cloud-arrow-up"></i>
          <span>Drag & drop logo here or click to browse</span>
          <input type="file" id="cms-logo-file" style="display:none;" accept="image/*">
        </div>
      </div>
      <div class="cms-field">
        <label>Header Logo Text</label>
        <input type="text" id="cms-logo-text" class="cms-input" value="${escapeHtml(logoText)}">
      </div>
      <div class="cms-field">
        <label>Footer Logo Text</label>
        <input type="text" id="cms-footer-logo-text" class="cms-input" value="${escapeHtml(footerLogoText)}">
      </div>
      
      <h3 class="cms-section-title" style="margin-top: 35px;">Hero Section Headline</h3>
    `;
    
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

    // Parse Contact details
    const virtContact = cmsVirtualDoc.querySelector("#contact");
    let contactTitle = "Contact & Location";
    let contactDesc = "Our laboratory is located within the Department of Biochemistry...";
    let contactAddress = "Jennie Smoly Caruthers Biotechnology Building (JSCBB)\nUniversity of Colorado Boulder\n3415 Colorado Ave, Boulder, CO 80303";
    let contactEmail = "vignesh.kasinath@colorado.edu";

    if (virtContact) {
      if (virtContact.querySelector(".section-title")) {
        contactTitle = virtContact.querySelector(".section-title").textContent.trim();
      }
      if (virtContact.querySelector("p")) {
        contactDesc = virtContact.querySelector("p").textContent.trim();
      }
    }

    const virtAddressEl = cmsVirtualDoc.querySelector("#contact-details .contact-item-box:nth-child(1) p");
    if (virtAddressEl) {
      contactAddress = virtAddressEl.innerHTML
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/&amp;/g, "&")
        .trim();
    }

    const virtEmailEl = cmsVirtualDoc.querySelector("#contact-details .contact-item-box:nth-child(2) a");
    if (virtEmailEl) {
      contactEmail = virtEmailEl.textContent.trim();
    }

    // Parse Confluence URL
    const virtConfluenceEl = cmsVirtualDoc.querySelector("#tab-btn-confluence");
    let confluenceUrl = "https://kasinath-aydin-lab.atlassian.net/wiki/spaces/KAL/overview";
    if (virtConfluenceEl) {
      confluenceUrl = virtConfluenceEl.getAttribute("href") || confluenceUrl;
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
      <button class="cms-btn cms-btn-secondary cms-btn-sm" id="cms-outreach-add-p" style="margin-bottom: 30px;">
        <i class="fa-solid fa-plus"></i> Add Outreach Paragraph
      </button>

      <h3 class="cms-section-title" style="margin-top: 35px; border-top:1px solid rgba(255,255,255,0.08); padding-top:20px;">Contact & Location</h3>
      <div class="cms-field">
        <label>Contact Section Title</label>
        <input type="text" id="cms-contact-title" class="cms-input" value="${escapeHtml(contactTitle)}">
      </div>
      <div class="cms-field">
        <label>Contact Section Description</label>
        <textarea id="cms-contact-desc" class="cms-textarea" rows="3">${escapeHtml(contactDesc)}</textarea>
      </div>
      <div class="cms-field">
        <label>Mailing & Lab Address (Use newlines)</label>
        <textarea id="cms-contact-address" class="cms-textarea" rows="4">${escapeHtml(contactAddress)}</textarea>
      </div>
      <div class="cms-field">
        <label>Contact Email Address</label>
        <input type="text" id="cms-contact-email" class="cms-input" value="${escapeHtml(contactEmail)}">
      </div>

      <h3 class="cms-section-title" style="margin-top: 35px; border-top:1px solid rgba(255,255,255,0.08); padding-top:20px;">Wiki Link (Confluence)</h3>
      <div class="cms-field">
        <label>Lab Intranet Confluence URL</label>
        <input type="text" id="cms-confluence-url" class="cms-input" value="${escapeHtml(confluenceUrl)}">
      </div>
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
          const currentVirt = cmsVirtualDoc.querySelectorAll("#home .hero-description");
          if (currentVirt[idx]) currentVirt[idx].textContent = e.target.value;
          
          const currentLive = document.querySelectorAll("#home .hero-description");
          if (currentLive[idx]) currentLive[idx].textContent = e.target.value;
          
          saveToSession();
        });
      });
    }

    refreshHeroParagraphsUI();

    // Add Hero Paragraph
    document.getElementById("cms-hero-add-p").addEventListener("click", () => {
      const heroSec = cmsVirtualDoc.querySelector("#home .hero-content");
      const refBtnGroup = heroSec.querySelector(".button-group");
      
      const newP = cmsVirtualDoc.createElement("p");
      newP.className = "hero-description";
      newP.textContent = "New paragraph content here.";
      heroSec.insertBefore(newP, refBtnGroup);

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

      const currentVirt = cmsVirtualDoc.querySelectorAll("#home .hero-description");
      if (currentVirt[idx]) currentVirt[idx].remove();

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
          const currentVirt = cmsVirtualDoc.querySelectorAll(".outreach-intro p");
          if (currentVirt[idx]) currentVirt[idx].textContent = e.target.value;
          
          const currentLive = document.querySelectorAll(".outreach-intro p");
          if (currentLive[idx]) currentLive[idx].textContent = e.target.value;
          
          saveToSession();
        });
      });
    }

    refreshOutreachUI();

    // Add Outreach Paragraph
    document.getElementById("cms-outreach-add-p").addEventListener("click", () => {
      const sec = cmsVirtualDoc.querySelector(".outreach-intro");
      const newP = cmsVirtualDoc.createElement("p");
      newP.textContent = "New outreach detail text.";
      sec.appendChild(newP);

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

      const currentVirt = cmsVirtualDoc.querySelectorAll(".outreach-intro p");
      if (currentVirt[idx]) currentVirt[idx].remove();

      const currentLive = document.querySelectorAll(".outreach-intro p");
      if (currentLive[idx]) currentLive[idx].remove();

      refreshOutreachUI();
      saveToSession();
    });

    // 4. Wire Contact Inputs
    document.getElementById("cms-contact-title").addEventListener("input", (e) => {
      updateElementText("#contact .section-title", e.target.value);
    });

    document.getElementById("cms-contact-desc").addEventListener("input", (e) => {
      updateElementText("#contact > p", e.target.value);
    });

    document.getElementById("cms-contact-address").addEventListener("input", (e) => {
      const formatted = e.target.value.replace(/\n/g, "<br>");
      
      const vAddress = cmsVirtualDoc.querySelector("#contact-details .contact-item-box:nth-child(1) p");
      const lAddress = document.querySelector("#contact-details .contact-item-box:nth-child(1) p");
      
      [vAddress, lAddress].forEach(el => {
        if (el) el.innerHTML = formatted;
      });
      saveToSession();
    });

    document.getElementById("cms-contact-email").addEventListener("input", (e) => {
      const email = e.target.value;
      const vMail = cmsVirtualDoc.querySelector("#contact-details .contact-item-box:nth-child(2) a");
      const lMail = document.querySelector("#contact-details .contact-item-box:nth-child(2) a");
      
      [vMail, lMail].forEach(el => {
        if (el) {
          el.setAttribute("href", `mailto:${email}`);
          el.textContent = email;
        }
      });
      saveToSession();
    });

    // 5. Wire Confluence Link
    document.getElementById("cms-confluence-url").addEventListener("input", (e) => {
      const url = e.target.value;
      
      const vHeaderLink = cmsVirtualDoc.querySelector("#tab-btn-confluence");
      const lHeaderLink = document.querySelector("#tab-btn-confluence");
      
      const vContactLink = cmsVirtualDoc.querySelector("#contact-details .contact-item-box:nth-child(3) a");
      const lContactLink = document.querySelector("#contact-details .contact-item-box:nth-child(3) a");

      [vHeaderLink, lHeaderLink, vContactLink, lContactLink].forEach(el => {
        if (el) el.setAttribute("href", url);
      });
      saveToSession();
    });

    // 6. Wire Logo & Branding Inputs
    document.getElementById("cms-logo-img").addEventListener("input", (e) => {
      const src = e.target.value;
      const vImg = cmsVirtualDoc.querySelector("#brand-logo img");
      const lImg = document.querySelector("#brand-logo img");
      [vImg, lImg].forEach(el => {
        if (el) el.setAttribute("src", src);
      });
      saveToSession();
    });

    bindUploadZone("cms-logo-dropzone", "cms-logo-file", "cms-logo-img", (dataUrl, targetPath) => {
      const vImg = cmsVirtualDoc.querySelector("#brand-logo img");
      const lImg = document.querySelector("#brand-logo img");
      if (vImg) vImg.setAttribute("src", targetPath);
      if (lImg) lImg.setAttribute("src", dataUrl);
      saveToSession();
    });

    document.getElementById("cms-logo-text").addEventListener("input", (e) => {
      const text = e.target.value;
      const vText = cmsVirtualDoc.querySelector("#brand-logo .logo-text");
      const lText = document.querySelector("#brand-logo .logo-text");
      [vText, lText].forEach(el => {
        if (el) el.textContent = text;
      });
      saveToSession();
    });

    document.getElementById("cms-footer-logo-text").addEventListener("input", (e) => {
      const text = e.target.value;
      const vText = cmsVirtualDoc.querySelector("footer .footer-logo");
      const lText = document.querySelector("footer .footer-logo");
      [vText, lText].forEach(el => {
        if (el) el.textContent = text;
      });
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
          <div class="cms-drop-zone" id="cms-news-dropzone">
            <i class="fa-solid fa-cloud-arrow-up"></i>
            <span>Drag & drop image here or click to browse</span>
            <input type="file" id="cms-news-file" style="display:none;" accept="image/*">
          </div>
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

    bindUploadZone("cms-news-dropzone", "cms-news-file", "cms-news-img", (dataUrl, targetPath) => {
      // Updates the input field path; actual preview is updated upon saving the card
    });

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
        <div class="cms-drop-zone" id="cms-pi-photo-dropzone">
          <i class="fa-solid fa-cloud-arrow-up"></i>
          <span>Drag & drop photo here or click to browse</span>
          <input type="file" id="cms-pi-photo-file" style="display:none;" accept="image/*">
        </div>
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
          <div class="cms-drop-zone" id="cms-team-img-dropzone">
            <i class="fa-solid fa-cloud-arrow-up"></i>
            <span>Drag & drop photo here or click to browse</span>
            <input type="file" id="cms-team-img-file" style="display:none;" accept="image/*">
          </div>
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

    bindUploadZone("cms-pi-photo-dropzone", "cms-pi-photo-file", "cms-pi-photo", (dataUrl, targetPath) => {
      const piEl = cmsVirtualDoc.querySelector("#team-pi");
      if (piEl && piEl.querySelector("img")) piEl.querySelector("img").setAttribute("src", targetPath);
      
      const livePiEl = document.querySelector("#team-pi");
      if (livePiEl && livePiEl.querySelector("img")) livePiEl.querySelector("img").setAttribute("src", dataUrl);

      saveToSession();
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

    bindUploadZone("cms-team-img-dropzone", "cms-team-img-file", "cms-team-img", (dataUrl, targetPath) => {
      // Updates input field; preview is loaded upon member save
    });

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
    if (virtGrid) {
      const cards = Array.from(virtGrid.querySelectorAll(".team-card"));
      const mascot = cards.find(c => c.id === "team-member-mascot");
      const others = cards.filter(c => c.id !== "team-member-mascot");
      
      others.sort((a, b) => {
        const nameA = (a.querySelector("h3")?.textContent || "").trim().toLowerCase();
        const nameB = (b.querySelector("h3")?.textContent || "").trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      virtGrid.innerHTML = "";
      others.forEach(c => virtGrid.appendChild(c));
      if (mascot) virtGrid.appendChild(mascot);
    }
    
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
        
        const strongEl = li.querySelector("strong");
        if (strongEl) {
          name = strongEl.textContent.trim();
          let rest = rawText.replace(name, "").trim();
          // Remove leading non-word characters like spaces, dashes, parens
          rest = rest.replace(/^[\s\(\)\—\-\–\&]+/g, "").trim();
          details = rest;
        } else {
          // typical format: "Name (Detail)"
          const braceIdx = rawText.indexOf("(");
          if (braceIdx !== -1) {
            name = rawText.substring(0, braceIdx).trim();
            details = rawText.substring(braceIdx + 1).trim();
            if (details.endsWith(")")) {
              details = details.substring(0, details.length - 1).trim();
            }
          }
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
        let innerHTML = `<span>`;
        if (name) {
          innerHTML += `<strong>${name}</strong>`;
        }
        if (details) {
          // Format "Now at/Current" inside <em> and use em-dash
          const dashRegex = /\s*(—|--|-|&mdash;|–)\s*(Now at|Current Position|Current|now at|now|Preparing|preparing)\s*(.*)/i;
          const match = details.match(dashRegex);
          if (match) {
            const beforeDash = details.substring(0, details.indexOf(match[1])).trim();
            innerHTML += ` ${beforeDash} &mdash; <em>${match[2]} ${match[3]}</em>`;
          } else if (details.startsWith("(") || details.startsWith("&mdash;") || details.startsWith("—")) {
            innerHTML += ` ${details}`;
          } else {
            innerHTML += ` (${details})`;
          }
        }
        innerHTML += `</span>`;
        li.innerHTML = `<i class="fa-solid fa-circle-notch"></i> ${innerHTML}`;
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
  // TAB 4B: RESEARCH PRIORITIES
  // ==========================================
  function renderResearchTab(container) {
    const virtIntro = cmsVirtualDoc.querySelector("#research > p");
    const introText = virtIntro ? virtIntro.textContent.trim() : "";

    // Parse Methodology details
    const virtMethod = cmsVirtualDoc.querySelector("#research-methodology");
    let methodTitle = "Visualizing Biological Architectures";
    let methodDesc = "";
    let methodImg = "assets/cryo_em_microscope.png";
    if (virtMethod) {
      const h3 = virtMethod.querySelector("h3");
      if (h3) methodTitle = h3.textContent.trim();
      const p = virtMethod.querySelector("p");
      if (p) methodDesc = p.textContent.trim();
      const img = virtMethod.querySelector("img");
      if (img) methodImg = img.getAttribute("src").replace("/assets/", "assets/");
    }

    container.innerHTML = `
      <h3 class="cms-section-title">Research Priorities Intro</h3>
      <div class="cms-field">
        <label>Section Description</label>
        <textarea id="cms-research-intro" class="cms-textarea" rows="4">${escapeHtml(introText)}</textarea>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:40px; margin-bottom:20px; border-top:1px solid rgba(255,255,255,0.08); padding-top:20px;">
        <h3 class="cms-section-title" style="margin-bottom:0;">Research Pillars</h3>
        <button class="cms-btn cms-btn-primary cms-btn-sm" id="cms-pillar-add-btn">
          <i class="fa-solid fa-plus"></i> Add Pillar
        </button>
      </div>

      <!-- Pillars List -->
      <div class="cms-items-list" id="cms-pillars-list"></div>

      <!-- Add/Edit Pillar Form Panel -->
      <div class="cms-editor-pane" id="cms-pillar-form-pane">
        <div class="cms-editor-pane-header">
          <h4 id="cms-pillar-form-title">Edit Pillar</h4>
          <button class="cms-close-btn" id="cms-pillar-form-cancel">&times;</button>
        </div>
        <input type="hidden" id="cms-pillar-edit-id">
        <div class="cms-field">
          <label>Pillar Group</label>
          <select id="cms-pillar-group" class="cms-input">
            <option value="mechanisms">Mechanisms (Top Grid)</option>
            <option value="apps">From Mechanism to Application (Bottom Grid)</option>
          </select>
        </div>
        <div class="cms-field">
          <label>Pillar Title</label>
          <input type="text" id="cms-pillar-title" class="cms-input">
        </div>
        <div class="cms-field">
          <label>Icon Class (FontAwesome)</label>
          <input type="text" id="cms-pillar-icon" class="cms-input" placeholder="fa-solid fa-dna">
        </div>
        <div class="cms-field">
          <label>Description</label>
          <textarea id="cms-pillar-desc" class="cms-textarea" rows="4"></textarea>
        </div>
        <div class="cms-button-row">
          <button class="cms-btn cms-btn-primary cms-btn-sm" id="cms-pillar-save-btn">Save</button>
          <button class="cms-btn cms-btn-secondary cms-btn-sm" id="cms-pillar-cancel-btn">Cancel</button>
        </div>
      </div>

      <h3 class="cms-section-title" style="margin-top:40px; border-top:1px solid rgba(255,255,255,0.08); padding-top:20px;">Methodology Detail Card</h3>
      <div class="cms-field">
        <label>Detail Card Title</label>
        <input type="text" id="cms-method-title" class="cms-input" value="${escapeHtml(methodTitle)}">
      </div>
      <div class="cms-field">
        <label>Detail Card Description</label>
        <textarea id="cms-method-desc" class="cms-textarea" rows="3">${escapeHtml(methodDesc)}</textarea>
      </div>
      <div class="cms-field">
        <label>Detail Card Image Path</label>
        <input type="text" id="cms-method-img" class="cms-input" value="${escapeHtml(methodImg)}">
        <div class="cms-drop-zone" id="cms-method-dropzone">
          <i class="fa-solid fa-cloud-arrow-up"></i>
          <span>Drag & drop card image here or click to browse</span>
          <input type="file" id="cms-method-file" style="display:none;" accept="image/*">
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:25px; margin-bottom:15px;">
        <h4 style="margin-bottom:0; font-size:0.9rem; color:var(--admin-gold);">Methodology Highlights</h4>
        <button class="cms-btn cms-btn-secondary cms-btn-sm" id="cms-method-add-bullet-btn">
          <i class="fa-solid fa-plus"></i> Add Highlight
        </button>
      </div>
      <div class="cms-items-list" id="cms-method-bullets-list" style="margin-bottom: 30px;"></div>
    `;

    // 1. Wire Intro Textarea
    document.getElementById("cms-research-intro").addEventListener("input", (e) => {
      updateElementText("#research > p", e.target.value);
    });

    // 2. Wire Methodology Card inputs
    document.getElementById("cms-method-title").addEventListener("input", (e) => {
      updateElementText("#research-methodology h3", e.target.value);
    });
    document.getElementById("cms-method-desc").addEventListener("input", (e) => {
      updateElementText("#research-methodology p", e.target.value);
    });
    document.getElementById("cms-method-img").addEventListener("input", (e) => {
      const url = e.target.value;
      const vImg = cmsVirtualDoc.querySelector("#research-methodology img");
      const lImg = document.querySelector("#research-methodology img");
      [vImg, lImg].forEach(el => {
        if (el) el.setAttribute("src", url);
      });
      saveToSession();
    });

    bindUploadZone("cms-method-dropzone", "cms-method-file", "cms-method-img", (dataUrl, targetPath) => {
      const vImg = cmsVirtualDoc.querySelector("#research-methodology img");
      const lImg = document.querySelector("#research-methodology img");
      if (vImg) vImg.setAttribute("src", targetPath);
      if (lImg) lImg.setAttribute("src", dataUrl);
      saveToSession();
    });

    // 3. Pillars management
    const pillarsListDiv = document.getElementById("cms-pillars-list");
    const pillarFormPane = document.getElementById("cms-pillar-form-pane");

    function refreshPillarsList() {
      pillarsListDiv.innerHTML = "";
      const cards = cmsVirtualDoc.querySelectorAll("#research-pillars .research-card, #research-pillars-apps .research-card");
      cards.forEach((card, idx) => {
        const title = card.querySelector("h3") ? card.querySelector("h3").textContent.trim() : "Pillar " + idx;
        const iconEl = card.querySelector(".research-icon i");
        const iconClass = iconEl ? iconEl.className : "";
        const isApp = card.closest("#research-pillars-apps") !== null;
        const groupText = isApp ? "Application" : "Mechanism";
        const row = document.createElement("div");
        row.className = "cms-item-row";
        row.innerHTML = `
          <div class="cms-item-info">
            <div class="cms-item-title">${escapeHtml(title)} <span style="font-size:0.65rem; color:var(--admin-gold); margin-left:5px;">[${groupText}]</span></div>
            <div class="cms-item-subtitle" style="font-family:monospace; font-size:0.75rem;"><i class="${iconClass}" style="margin-right:5px;"></i>${iconClass}</div>
          </div>
          <div class="cms-item-actions">
            <button class="cms-btn-action edit cms-pillar-edit-btn" data-index="${idx}" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="cms-btn-action cms-pillar-moveup-btn" data-index="${idx}" title="Move Up"><i class="fa-solid fa-chevron-up"></i></button>
            <button class="cms-btn-action cms-pillar-movedown-btn" data-index="${idx}" title="Move Down"><i class="fa-solid fa-chevron-down"></i></button>
            <button class="cms-btn-action delete cms-pillar-del-btn" data-index="${idx}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        `;
        pillarsListDiv.appendChild(row);
      });
    }

    refreshPillarsList();

    // Edit pillar
    pillarsListDiv.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".cms-pillar-edit-btn");
      if (!editBtn) return;
      const idx = parseInt(editBtn.getAttribute("data-index"), 10);
      const cards = cmsVirtualDoc.querySelectorAll("#research-pillars .research-card, #research-pillars-apps .research-card");
      const card = cards[idx];
      if (!card) return;

      document.getElementById("cms-pillar-edit-id").value = idx;
      document.getElementById("cms-pillar-title").value = card.querySelector("h3") ? card.querySelector("h3").textContent.trim() : "";
      document.getElementById("cms-pillar-desc").value = card.querySelector("p") ? card.querySelector("p").textContent.trim() : "";
      const iconEl = card.querySelector(".research-icon i");
      document.getElementById("cms-pillar-icon").value = iconEl ? iconEl.className : "fa-solid fa-dna";
      
      const isApp = card.closest("#research-pillars-apps") !== null;
      document.getElementById("cms-pillar-group").value = isApp ? "apps" : "mechanisms";

      document.getElementById("cms-pillar-form-title").textContent = "Edit Research Pillar";
      pillarFormPane.style.display = "block";
      pillarFormPane.scrollIntoView({ behavior: "smooth" });
    });

    // Add pillar
    document.getElementById("cms-pillar-add-btn").addEventListener("click", () => {
      document.getElementById("cms-pillar-edit-id").value = "-1";
      document.getElementById("cms-pillar-title").value = "New Research Focus";
      document.getElementById("cms-pillar-icon").value = "fa-solid fa-dna";
      document.getElementById("cms-pillar-desc").value = "Describe this research area in detail...";
      document.getElementById("cms-pillar-group").value = "mechanisms";

      document.getElementById("cms-pillar-form-title").textContent = "Add Research Pillar";
      pillarFormPane.style.display = "block";
      pillarFormPane.scrollIntoView({ behavior: "smooth" });
    });

    // Save pillar
    document.getElementById("cms-pillar-save-btn").addEventListener("click", () => {
      const idx = parseInt(document.getElementById("cms-pillar-edit-id").value, 10);
      const titleVal = document.getElementById("cms-pillar-title").value;
      const iconVal = document.getElementById("cms-pillar-icon").value;
      const descVal = document.getElementById("cms-pillar-desc").value;
      const groupVal = document.getElementById("cms-pillar-group").value;

      if (idx === -1) {
        // Add new
        const newCard = cmsVirtualDoc.createElement("div");
        newCard.className = "glass-card research-card";
        newCard.innerHTML = `
          <div class="research-icon"><i class="${iconVal}"></i></div>
          <h3>${titleVal}</h3>
          <p>${descVal}</p>
        `;
        const targetGridId = groupVal === "apps" ? "#research-pillars-apps" : "#research-pillars";
        const pillarsGrid = cmsVirtualDoc.querySelector(targetGridId);
        if (pillarsGrid) pillarsGrid.appendChild(newCard);
      } else {
        // Edit existing
        const cards = cmsVirtualDoc.querySelectorAll("#research-pillars .research-card, #research-pillars-apps .research-card");
        const card = cards[idx];
        if (card) {
          const h3 = card.querySelector("h3");
          if (h3) h3.textContent = titleVal;
          const p = card.querySelector("p");
          if (p) p.textContent = descVal;
          const i = card.querySelector(".research-icon i");
          if (i) i.className = iconVal;

          const isCurrentlyApp = card.closest("#research-pillars-apps") !== null;
          const targetIsApp = groupVal === "apps";
          if (isCurrentlyApp !== targetIsApp) {
            card.remove();
            const targetGridId = targetIsApp ? "#research-pillars-apps" : "#research-pillars";
            const pillarsGrid = cmsVirtualDoc.querySelector(targetGridId);
            if (pillarsGrid) pillarsGrid.appendChild(card);
          }
        }
      }

      // Re-apply alternating alt class
      ["#research-pillars", "#research-pillars-apps"].forEach(gridId => {
        const grid = cmsVirtualDoc.querySelector(gridId);
        if (grid) {
          const cards = grid.querySelectorAll(".research-card");
          cards.forEach((card, cIdx) => {
            if (cIdx % 2 === 1) {
              card.classList.add("alt");
            } else {
              card.classList.remove("alt");
            }
          });
        }
      });

      syncResearchPillarsDOM();
      pillarFormPane.style.display = "none";
      refreshPillarsList();
      saveToSession();
    });

    const closePillarForm = () => { pillarFormPane.style.display = "none"; };
    document.getElementById("cms-pillar-form-cancel").addEventListener("click", closePillarForm);
    document.getElementById("cms-pillar-cancel-btn").addEventListener("click", closePillarForm);

    // Delete pillar
    pillarsListDiv.addEventListener("click", (e) => {
      const delBtn = e.target.closest(".cms-pillar-del-btn");
      if (!delBtn) return;
      if (!confirm("Are you sure you want to delete this research pillar?")) return;

      const idx = parseInt(delBtn.getAttribute("data-index"), 10);
      const cards = cmsVirtualDoc.querySelectorAll("#research-pillars .research-card, #research-pillars-apps .research-card");
      if (cards[idx]) cards[idx].remove();

      ["#research-pillars", "#research-pillars-apps"].forEach(gridId => {
        const grid = cmsVirtualDoc.querySelector(gridId);
        if (grid) {
          const cards = grid.querySelectorAll(".research-card");
          cards.forEach((card, cIdx) => {
            if (cIdx % 2 === 1) {
              card.classList.add("alt");
            } else {
              card.classList.remove("alt");
            }
          });
        }
      });

      syncResearchPillarsDOM();
      refreshPillarsList();
      saveToSession();
    });

    // Reorder pillars
    pillarsListDiv.addEventListener("click", (e) => {
      const moveUpBtn = e.target.closest(".cms-pillar-moveup-btn");
      const moveDownBtn = e.target.closest(".cms-pillar-movedown-btn");
      if (!moveUpBtn && !moveDownBtn) return;

      const btn = moveUpBtn || moveDownBtn;
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      const isUp = !!moveUpBtn;

      const cards = cmsVirtualDoc.querySelectorAll("#research-pillars .research-card, #research-pillars-apps .research-card");
      const card = cards[idx];
      if (!card) return;

      const grid = card.parentNode;
      const siblingCards = Array.from(grid.querySelectorAll(".research-card"));
      const siblingIdx = siblingCards.indexOf(card);

      if (isUp && siblingIdx > 0) {
        grid.insertBefore(card, siblingCards[siblingIdx - 1]);
      } else if (!isUp && siblingIdx < siblingCards.length - 1) {
        grid.insertBefore(siblingCards[siblingIdx + 1], card);
      }

      ["#research-pillars", "#research-pillars-apps"].forEach(gridId => {
        const g = cmsVirtualDoc.querySelector(gridId);
        if (g) {
          const cards = g.querySelectorAll(".research-card");
          cards.forEach((card, cIdx) => {
            if (cIdx % 2 === 1) {
              card.classList.add("alt");
            } else {
              card.classList.remove("alt");
            }
          });
        }
      });

      syncResearchPillarsDOM();
      refreshPillarsList();
      saveToSession();
    });

    // 4. Bullet Points management
    const bulletsListDiv = document.getElementById("cms-method-bullets-list");

    function refreshBulletsList() {
      bulletsListDiv.innerHTML = "";
      const items = cmsVirtualDoc.querySelectorAll("#research-methodology ul li");
      items.forEach((item, idx) => {
        // Extract text excluding the FontAwesome check icon
        const tempLi = item.cloneNode(true);
        const icon = tempLi.querySelector("i");
        if (icon) icon.remove();
        const text = tempLi.textContent.trim();

        const row = document.createElement("div");
        row.className = "cms-item-row";
        row.style.padding = "8px 12px";
        row.innerHTML = `
          <div class="cms-item-info" style="flex:1;">
            <input type="text" class="cms-input cms-bullet-input" value="${escapeHtml(text)}" data-index="${idx}" style="font-size:0.8rem; padding:4px 8px;">
          </div>
          <div class="cms-item-actions">
            <button class="cms-btn-action delete cms-bullet-del-btn" data-index="${idx}" title="Delete Highlight"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        `;
        bulletsListDiv.appendChild(row);
      });

      // Wire inputs
      bulletsListDiv.querySelectorAll(".cms-bullet-input").forEach(input => {
        input.addEventListener("change", (e) => {
          const idx = parseInt(e.target.getAttribute("data-index"), 10);
          const vList = cmsVirtualDoc.querySelectorAll("#research-methodology ul li");
          const lList = document.querySelectorAll("#research-methodology ul li");
          const text = e.target.value;
          const html = `<i class="fa-solid fa-circle-check" style="color: var(--color-primary); margin-right: 8px;"></i> ${text}`;

          [vList[idx], lList[idx]].forEach(el => {
            if (el) el.innerHTML = html;
          });
          saveToSession();
        });
      });
    }

    refreshBulletsList();

    // Add bullet
    document.getElementById("cms-method-add-bullet-btn").addEventListener("click", () => {
      const vUl = cmsVirtualDoc.querySelector("#research-methodology ul");
      const lUl = document.querySelector("#research-methodology ul");
      if (vUl && lUl) {
        const text = "New methodology focus area";
        const html = `<i class="fa-solid fa-circle-check" style="color: var(--color-primary); margin-right: 8px;"></i> ${text}`;
        
        const newVLi = cmsVirtualDoc.createElement("li");
        newVLi.innerHTML = html;
        vUl.appendChild(newVLi);

        const newLLi = document.createElement("li");
        newLLi.innerHTML = html;
        lUl.appendChild(newLLi);

        highlightEditableElements(true);
        refreshBulletsList();
        saveToSession();
      }
    });

    // Delete bullet
    bulletsListDiv.addEventListener("click", (e) => {
      const delBtn = e.target.closest(".cms-bullet-del-btn");
      if (!delBtn) return;
      const idx = parseInt(delBtn.getAttribute("data-index"), 10);

      const vLis = cmsVirtualDoc.querySelectorAll("#research-methodology ul li");
      const lLis = document.querySelectorAll("#research-methodology ul li");

      if (vLis[idx]) vLis[idx].remove();
      if (lLis[idx]) lLis[idx].remove();

      refreshBulletsList();
      saveToSession();
    });
  }

  function syncResearchPillarsDOM() {
    const liveGrid1 = document.getElementById("research-pillars");
    const virtGrid1 = cmsVirtualDoc.querySelector("#research-pillars");
    if (liveGrid1 && virtGrid1) {
      liveGrid1.innerHTML = virtGrid1.innerHTML;
    }

    const liveGrid2 = document.getElementById("research-pillars-apps");
    const virtGrid2 = cmsVirtualDoc.querySelector("#research-pillars-apps");
    if (liveGrid2 && virtGrid2) {
      liveGrid2.innerHTML = virtGrid2.innerHTML;
    }
    highlightEditableElements(true);

    // Sync virtual document's Core Research Themes
    const virtQuestionsSection = cmsVirtualDoc.querySelector(".questions-section");
    if (virtQuestionsSection) {
      const virtResearchCards = cmsVirtualDoc.querySelectorAll("#research-pillars .research-card, #research-pillars-apps .research-card");
      const existingVirtCards = virtQuestionsSection.querySelectorAll(".question-card");
      existingVirtCards.forEach(card => card.remove());
      
      virtResearchCards.forEach((card, idx) => {
        const h3 = card.querySelector("h3");
        const p = card.querySelector("p");
        if (!h3 || !p) return;
        
        const themeCard = cmsVirtualDoc.createElement("div");
        themeCard.className = `glass-card question-card${idx % 2 === 1 ? " alt" : ""}`;
        themeCard.id = `question-${idx + 1}`;
        themeCard.innerHTML = `
          <div class="question-title">${h3.innerHTML}</div>
          <p class="news-excerpt">${p.innerHTML}</p>
        `;
        virtQuestionsSection.appendChild(themeCard);
      });
    }

    // Sync live document's Core Research Themes
    if (typeof window.syncHomeResearchThemes === "function") {
      window.syncHomeResearchThemes();
    }
  }

  // ==========================================
  // TAB 4C: SELECTED PUBLICATIONS
  // ==========================================
  function renderPubsTab(container) {
    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h3 class="cms-section-title" style="margin-bottom:0;">Selected Publications</h3>
        <button class="cms-btn cms-btn-primary cms-btn-sm" id="cms-pub-add-btn">
          <i class="fa-solid fa-plus"></i> Add Publication
        </button>
      </div>

      <!-- Publications List -->
      <div class="cms-items-list" id="cms-pubs-list"></div>

      <!-- Add/Edit Publication Form Panel -->
      <div class="cms-editor-pane" id="cms-pub-form-pane">
        <div class="cms-editor-pane-header">
          <h4 id="cms-pub-form-title">Edit Publication</h4>
          <button class="cms-close-btn" id="cms-pub-form-cancel">&times;</button>
        </div>
        <input type="hidden" id="cms-pub-edit-id">
        
        <div class="cms-field">
          <label>Year (e.g. 2025)</label>
          <input type="text" id="cms-pub-year" class="cms-input">
        </div>
        <div class="cms-field">
          <label>Publication Title</label>
          <textarea id="cms-pub-title" class="cms-textarea" rows="2"></textarea>
        </div>
        <div class="cms-field">
          <label>Authors (HTML allowed, e.g. <strong>Kasinath V.</strong>)</label>
          <input type="text" id="cms-pub-authors" class="cms-input">
        </div>
        <div class="cms-field">
          <label>Journal, Volume & DOI Citation Details</label>
          <input type="text" id="cms-pub-journal" class="cms-input">
        </div>
        <div class="cms-field">
          <label>Category Tags (Space separated, e.g. "recent prc")</label>
          <input type="text" id="cms-pub-category" class="cms-input" placeholder="recent prc">
        </div>
        
        <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08);">
          <h5 style="color:var(--admin-gold); font-size:0.8rem; margin-bottom:10px;">Publisher Link</h5>
          <div class="cms-field">
            <label>Link Text (e.g. Publisher Link, Science Link)</label>
            <input type="text" id="cms-pub-link1-text" class="cms-input" value="Publisher Link">
          </div>
          <div class="cms-field">
            <label>Link URL</label>
            <input type="text" id="cms-pub-link1-url" class="cms-input">
          </div>
        </div>

        <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08); margin-bottom: 20px;">
          <h5 style="color:var(--admin-gold); font-size:0.8rem; margin-bottom:10px;">PubMed Link</h5>
          <div class="cms-field">
            <label>Link Text (e.g. PubMed, PubMed (33446524))</label>
            <input type="text" id="cms-pub-link2-text" class="cms-input" value="PubMed">
          </div>
          <div class="cms-field">
            <label>Link URL</label>
            <input type="text" id="cms-pub-link2-url" class="cms-input">
          </div>
        </div>

        <div class="cms-button-row">
          <button class="cms-btn cms-btn-primary cms-btn-sm" id="cms-pub-save-btn">Save</button>
          <button class="cms-btn cms-btn-secondary cms-btn-sm" id="cms-pub-cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    const pubsListDiv = document.getElementById("cms-pubs-list");
    const pubFormPane = document.getElementById("cms-pub-form-pane");

    function refreshPubsList() {
      pubsListDiv.innerHTML = "";
      const items = cmsVirtualDoc.querySelectorAll("#publications-content .publication-item");

      items.forEach((item, idx) => {
        const title = item.querySelector(".pub-title") ? item.querySelector(".pub-title").textContent.trim() : "Publication " + idx;
        const year = item.querySelector(".pub-year") ? item.querySelector(".pub-year").textContent.trim() : "";
        const categories = item.getAttribute("data-category") || "";

        const row = document.createElement("div");
        row.className = "cms-item-row";
        row.innerHTML = `
          <div class="cms-item-info">
            <div class="cms-item-title">${escapeHtml(title)}</div>
            <div class="cms-item-subtitle" style="font-size:0.75rem;">Year: ${year} | Tags: <span style="color:var(--admin-gold);">${categories}</span></div>
          </div>
          <div class="cms-item-actions">
            <button class="cms-btn-action edit cms-pub-edit-btn" data-index="${idx}" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="cms-btn-action cms-pub-moveup-btn" data-index="${idx}" title="Move Up"><i class="fa-solid fa-chevron-up"></i></button>
            <button class="cms-btn-action cms-pub-movedown-btn" data-index="${idx}" title="Move Down"><i class="fa-solid fa-chevron-down"></i></button>
            <button class="cms-btn-action delete cms-pub-del-btn" data-index="${idx}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        `;
        pubsListDiv.appendChild(row);
      });
    }

    refreshPubsList();

    // Edit publication trigger
    pubsListDiv.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".cms-pub-edit-btn");
      if (!editBtn) return;
      const idx = parseInt(editBtn.getAttribute("data-index"), 10);
      const items = cmsVirtualDoc.querySelectorAll("#publications-content .publication-item");
      const item = items[idx];
      if (!item) return;

      document.getElementById("cms-pub-edit-id").value = idx;
      document.getElementById("cms-pub-year").value = item.querySelector(".pub-year") ? item.querySelector(".pub-year").textContent.trim() : "";
      document.getElementById("cms-pub-title").value = item.querySelector(".pub-title") ? item.querySelector(".pub-title").textContent.trim() : "";
      document.getElementById("cms-pub-authors").value = item.querySelector(".pub-authors") ? item.querySelector(".pub-authors").innerHTML.trim() : "";
      document.getElementById("cms-pub-journal").value = item.querySelector(".pub-journal") ? item.querySelector(".pub-journal").textContent.trim() : "";
      document.getElementById("cms-pub-category").value = item.getAttribute("data-category") || "";

      // Parse links
      const links = item.querySelectorAll(".pub-links a");
      
      // Default reset
      document.getElementById("cms-pub-link1-text").value = "Publisher Link";
      document.getElementById("cms-pub-link1-url").value = "";
      document.getElementById("cms-pub-link2-text").value = "PubMed";
      document.getElementById("cms-pub-link2-url").value = "";

      if (links[0]) {
        document.getElementById("cms-pub-link1-url").value = links[0].getAttribute("href") || "";
        const temp = links[0].cloneNode(true);
        const icon = temp.querySelector("i");
        if (icon) icon.remove();
        document.getElementById("cms-pub-link1-text").value = temp.textContent.trim();
      }

      if (links[1]) {
        document.getElementById("cms-pub-link2-url").value = links[1].getAttribute("href") || "";
        const temp = links[1].cloneNode(true);
        const icon = temp.querySelector("i");
        if (icon) icon.remove();
        document.getElementById("cms-pub-link2-text").value = temp.textContent.trim();
      }

      document.getElementById("cms-pub-form-title").textContent = "Edit Publication";
      pubFormPane.style.display = "block";
      pubFormPane.scrollIntoView({ behavior: "smooth" });
    });

    // Add publication trigger
    document.getElementById("cms-pub-add-btn").addEventListener("click", () => {
      document.getElementById("cms-pub-edit-id").value = "-1";
      document.getElementById("cms-pub-year").value = new Date().getFullYear();
      document.getElementById("cms-pub-title").value = "New Publication Title";
      document.getElementById("cms-pub-authors").value = "<strong>Kasinath V.</strong>, et al.";
      document.getElementById("cms-pub-journal").value = "Journal Name. (2026). doi:10.1038/...";
      document.getElementById("cms-pub-category").value = "recent prc";
      
      document.getElementById("cms-pub-link1-text").value = "Publisher Link";
      document.getElementById("cms-pub-link1-url").value = "https://doi.org/...";
      document.getElementById("cms-pub-link2-text").value = "PubMed";
      document.getElementById("cms-pub-link2-url").value = "https://pubmed.ncbi.nlm.nih.gov/...";

      document.getElementById("cms-pub-form-title").textContent = "Add Publication";
      pubFormPane.style.display = "block";
      pubFormPane.scrollIntoView({ behavior: "smooth" });
    });

    // Save publication details
    document.getElementById("cms-pub-save-btn").addEventListener("click", () => {
      const idx = parseInt(document.getElementById("cms-pub-edit-id").value, 10);
      const yearVal = document.getElementById("cms-pub-year").value;
      const titleVal = document.getElementById("cms-pub-title").value;
      const authorsVal = document.getElementById("cms-pub-authors").value;
      const journalVal = document.getElementById("cms-pub-journal").value;
      const catVal = document.getElementById("cms-pub-category").value;

      const link1Text = document.getElementById("cms-pub-link1-text").value;
      const link1Url = document.getElementById("cms-pub-link1-url").value;
      const link2Text = document.getElementById("cms-pub-link2-text").value;
      const link2Url = document.getElementById("cms-pub-link2-url").value;

      let linksHtml = "";
      if (link1Url) {
        linksHtml += `<a href="${link1Url}" target="_blank" rel="noopener" class="pub-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${link1Text}</a>`;
      }
      if (link2Url) {
        linksHtml += `<a href="${link2Url}" target="_blank" rel="noopener" class="pub-link"><i class="fa-solid fa-book-open"></i> ${link2Text}</a>`;
      }

      const idVal = "pub-" + yearVal + "-" + titleVal.split(" ").slice(0, 2).join("-").replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();

      if (idx === -1) {
        // Create new
        const newItem = cmsVirtualDoc.createElement("div");
        newItem.className = "glass-card publication-item";
        newItem.setAttribute("data-category", catVal);
        newItem.id = idVal;
        newItem.innerHTML = `
          <div class="pub-year">${yearVal}</div>
          <div class="pub-details">
            <h3 class="pub-title">${titleVal}</h3>
            <p class="pub-authors">${authorsVal}</p>
            <p class="pub-journal">${journalVal}</p>
            <div class="pub-links">
              ${linksHtml}
            </div>
          </div>
        `;
        const containerGrid = cmsVirtualDoc.querySelector("#publications-content");
        if (containerGrid) containerGrid.appendChild(newItem);
      } else {
        // Edit existing
        const items = cmsVirtualDoc.querySelectorAll("#publications-content .publication-item");
        const item = items[idx];
        if (item) {
          item.setAttribute("data-category", catVal);
          const yEl = item.querySelector(".pub-year");
          if (yEl) yEl.textContent = yearVal;
          const tEl = item.querySelector(".pub-title");
          if (tEl) tEl.textContent = titleVal;
          const aEl = item.querySelector(".pub-authors");
          if (aEl) aEl.innerHTML = authorsVal;
          const jEl = item.querySelector(".pub-journal");
          if (jEl) jEl.textContent = journalVal;
          
          const linksContainer = item.querySelector(".pub-links");
          if (linksContainer) linksContainer.innerHTML = linksHtml;
        }
      }

      syncPublicationsDOM();
      pubFormPane.style.display = "none";
      refreshPubsList();
      saveToSession();
    });

    const closeForm = () => { pubFormPane.style.display = "none"; };
    document.getElementById("cms-pub-form-cancel").addEventListener("click", closeForm);
    document.getElementById("cms-pub-cancel-btn").addEventListener("click", closeForm);

    // Delete publication
    pubsListDiv.addEventListener("click", (e) => {
      const delBtn = e.target.closest(".cms-pub-del-btn");
      if (!delBtn) return;
      if (!confirm("Are you sure you want to delete this publication?")) return;

      const idx = parseInt(delBtn.getAttribute("data-index"), 10);
      const items = cmsVirtualDoc.querySelectorAll("#publications-content .publication-item");
      if (items[idx]) items[idx].remove();

      syncPublicationsDOM();
      refreshPubsList();
      saveToSession();
    });

    // Reorder publications
    pubsListDiv.addEventListener("click", (e) => {
      const moveUpBtn = e.target.closest(".cms-pub-moveup-btn");
      const moveDownBtn = e.target.closest(".cms-pub-movedown-btn");
      if (!moveUpBtn && !moveDownBtn) return;

      const btn = moveUpBtn || moveDownBtn;
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      const isUp = !!moveUpBtn;

      const grid = cmsVirtualDoc.querySelector("#publications-content");
      const items = Array.from(grid.querySelectorAll(".publication-item"));

      if (isUp && idx > 0) {
        grid.insertBefore(items[idx], items[idx - 1]);
      } else if (!isUp && idx < items.length - 1) {
        grid.insertBefore(items[idx + 1], items[idx]);
      }

      syncPublicationsDOM();
      refreshPubsList();
      saveToSession();
    });
  }

  function syncPublicationsDOM() {
    const liveList = document.getElementById("publications-content");
    if (!liveList) return;
    const virtList = cmsVirtualDoc.querySelector("#publications-content");
    if (virtList) {
      liveList.innerHTML = virtList.innerHTML;
    }

    // Re-bind click event listeners to filter buttons
    const filtersContainer = document.getElementById("publications-filters");
    if (filtersContainer) {
      const clonedFilters = filtersContainer.cloneNode(true);
      filtersContainer.parentNode.replaceChild(clonedFilters, filtersContainer);
    }

    if (typeof window.initPublicationsFilter === "function") {
      window.initPublicationsFilter();
    }
    highlightEditableElements(true);
  }

  // ==========================================
  // TAB 4D: JOIN US (OPENINGS)
  // ==========================================
  function renderOpeningsTab(container) {
    const virtIntro = cmsVirtualDoc.querySelector("#openings > p");
    const introText = virtIntro ? virtIntro.textContent.trim() : "";

    container.innerHTML = `
      <h3 class="cms-section-title">Join Us Intro</h3>
      <div class="cms-field">
        <label>Section Description</label>
        <textarea id="cms-openings-intro" class="cms-textarea" rows="4">${escapeHtml(introText)}</textarea>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:40px; margin-bottom:20px; border-top:1px solid rgba(255,255,255,0.08); padding-top:20px;">
        <h3 class="cms-section-title" style="margin-bottom:0;">Job Positions</h3>
        <button class="cms-btn cms-btn-primary cms-btn-sm" id="cms-opening-add-btn">
          <i class="fa-solid fa-plus"></i> Add Position
        </button>
      </div>

      <!-- Opportunities List -->
      <div class="cms-items-list" id="cms-openings-list"></div>

      <!-- Add/Edit Position Form Panel -->
      <div class="cms-editor-pane" id="cms-opening-form-pane">
        <div class="cms-editor-pane-header">
          <h4 id="cms-opening-form-title">Edit Position</h4>
          <button class="cms-close-btn" id="cms-opening-form-cancel">&times;</button>
        </div>
        <input type="hidden" id="cms-opening-edit-id">
        
        <div class="cms-field">
          <label>Position Tag (e.g. Postdoctoral Scholar)</label>
          <input type="text" id="cms-opening-tag" class="cms-input" placeholder="Postdoctoral Scholar">
        </div>
        <div class="cms-field">
          <label>Position Title</label>
          <input type="text" id="cms-opening-title" class="cms-input" placeholder="Postdoctoral Fellow in Cryo-EM">
        </div>
        <div class="cms-field">
          <label>Position Description</label>
          <textarea id="cms-opening-desc" class="cms-textarea" rows="5"></textarea>
        </div>
        <div class="cms-field">
          <label>Inquiry Button Text</label>
          <input type="text" id="cms-opening-btn-text" class="cms-input" value="Inquire About Role">
        </div>
        <div class="cms-field">
          <label>Special Styling Class</label>
          <select id="cms-opening-style" class="cms-input">
            <option value="default">Default Styling</option>
            <option value="postdoc">Postdoc Highlight Styling (Purple Accent)</option>
          </select>
        </div>

        <div class="cms-button-row">
          <button class="cms-btn cms-btn-primary cms-btn-sm" id="cms-opening-save-btn">Save</button>
          <button class="cms-btn cms-btn-secondary cms-btn-sm" id="cms-opening-cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    // 1. Wire Intro Textarea
    document.getElementById("cms-openings-intro").addEventListener("input", (e) => {
      updateElementText("#openings > p", e.target.value);
    });

    // 2. Opportunities management
    const openingsListDiv = document.getElementById("cms-openings-list");
    const formPane = document.getElementById("cms-opening-form-pane");

    function refreshOpeningsList() {
      openingsListDiv.innerHTML = "";
      const cards = cmsVirtualDoc.querySelectorAll("#opportunities-list .position-card");

      cards.forEach((card, idx) => {
        const title = card.querySelector("h3") ? card.querySelector("h3").textContent.trim() : "Position " + idx;
        const tag = card.querySelector(".position-tag") ? card.querySelector(".position-tag").textContent.trim() : "";
        const isPostdoc = card.classList.contains("postdoc");

        const row = document.createElement("div");
        row.className = "cms-item-row";
        row.innerHTML = `
          <div class="cms-item-info">
            <div class="cms-item-title">${escapeHtml(title)}</div>
            <div class="cms-item-subtitle" style="font-size:0.75rem;">Tag: ${tag} ${isPostdoc ? '<span style="color:var(--admin-gold);">[Postdoc Highlight]</span>' : ''}</div>
          </div>
          <div class="cms-item-actions">
            <button class="cms-btn-action edit cms-opening-edit-btn" data-index="${idx}" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="cms-btn-action cms-opening-moveup-btn" data-index="${idx}" title="Move Up"><i class="fa-solid fa-chevron-up"></i></button>
            <button class="cms-btn-action cms-opening-movedown-btn" data-index="${idx}" title="Move Down"><i class="fa-solid fa-chevron-down"></i></button>
            <button class="cms-btn-action delete cms-opening-del-btn" data-index="${idx}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        `;
        openingsListDiv.appendChild(row);
      });
    }

    refreshOpeningsList();

    // Edit trigger
    openingsListDiv.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".cms-opening-edit-btn");
      if (!editBtn) return;
      const idx = parseInt(editBtn.getAttribute("data-index"), 10);
      const cards = cmsVirtualDoc.querySelectorAll("#opportunities-list .position-card");
      const card = cards[idx];
      if (!card) return;

      document.getElementById("cms-opening-edit-id").value = idx;
      document.getElementById("cms-opening-tag").value = card.querySelector(".position-tag") ? card.querySelector(".position-tag").textContent.trim() : "";
      document.getElementById("cms-opening-title").value = card.querySelector("h3") ? card.querySelector("h3").textContent.trim() : "";
      document.getElementById("cms-opening-desc").value = card.querySelector("p") ? card.querySelector("p").textContent.trim() : "";
      document.getElementById("cms-opening-btn-text").value = card.querySelector("button") ? card.querySelector("button").textContent.trim() : "Inquire About Role";
      document.getElementById("cms-opening-style").value = card.classList.contains("postdoc") ? "postdoc" : "default";

      document.getElementById("cms-opening-form-title").textContent = "Edit Job Position";
      formPane.style.display = "block";
      formPane.scrollIntoView({ behavior: "smooth" });
    });

    // Add trigger
    document.getElementById("cms-opening-add-btn").addEventListener("click", () => {
      document.getElementById("cms-opening-edit-id").value = "-1";
      document.getElementById("cms-opening-tag").value = "Graduate Student Rotations";
      document.getElementById("cms-opening-title").value = "PhD Rotation Projects";
      document.getElementById("cms-opening-desc").value = "We welcome rotations for biochemistry, molecular biology, and biophysics PhD candidates...";
      document.getElementById("cms-opening-btn-text").value = "Inquire About Rotation";
      document.getElementById("cms-opening-style").value = "default";

      document.getElementById("cms-opening-form-title").textContent = "Add Job Position";
      formPane.style.display = "block";
      formPane.scrollIntoView({ behavior: "smooth" });
    });

    // Save details
    document.getElementById("cms-opening-save-btn").addEventListener("click", () => {
      const idx = parseInt(document.getElementById("cms-opening-edit-id").value, 10);
      const tagVal = document.getElementById("cms-opening-tag").value;
      const titleVal = document.getElementById("cms-opening-title").value;
      const descVal = document.getElementById("cms-opening-desc").value;
      const btnText = document.getElementById("cms-opening-btn-text").value;
      const styleClass = document.getElementById("cms-opening-style").value;

      const cardId = "position-" + titleVal.split(" ").slice(0, 2).join("-").replace(/[^a-zA-Z0-9-]/g, "").toLowerCase() + "-" + Date.now();
      const cardClass = styleClass === "postdoc" ? "glass-card position-card postdoc" : "glass-card position-card";

      if (idx === -1) {
        // Create new
        const newCard = cmsVirtualDoc.createElement("div");
        newCard.className = cardClass;
        newCard.id = cardId;
        newCard.innerHTML = `
          <span class="position-tag">${tagVal}</span>
          <h3>${titleVal}</h3>
          <p>${descVal}</p>
          <button class="btn btn-secondary" onclick="document.querySelector('[data-target=contact]').click();">${btnText}</button>
        `;
        const listGrid = cmsVirtualDoc.querySelector("#opportunities-list");
        if (listGrid) listGrid.appendChild(newCard);
      } else {
        // Edit existing
        const cards = cmsVirtualDoc.querySelectorAll("#opportunities-list .position-card");
        const card = cards[idx];
        if (card) {
          card.className = cardClass;
          const tagEl = card.querySelector(".position-tag");
          if (tagEl) tagEl.textContent = tagVal;
          const h3 = card.querySelector("h3");
          if (h3) h3.textContent = titleVal;
          const p = card.querySelector("p");
          if (p) p.textContent = descVal;
          const btn = card.querySelector("button");
          if (btn) btn.textContent = btnText;
        }
      }

      syncOpeningsDOM();
      formPane.style.display = "none";
      refreshOpeningsList();
      saveToSession();
    });

    const closeForm = () => { formPane.style.display = "none"; };
    document.getElementById("cms-opening-form-cancel").addEventListener("click", closeForm);
    document.getElementById("cms-opening-cancel-btn").addEventListener("click", closeForm);

    // Delete position
    openingsListDiv.addEventListener("click", (e) => {
      const delBtn = e.target.closest(".cms-opening-del-btn");
      if (!delBtn) return;
      if (!confirm("Are you sure you want to delete this job opening?")) return;

      const idx = parseInt(delBtn.getAttribute("data-index"), 10);
      const cards = cmsVirtualDoc.querySelectorAll("#opportunities-list .position-card");
      if (cards[idx]) cards[idx].remove();

      syncOpeningsDOM();
      refreshOpeningsList();
      saveToSession();
    });

    // Reorder positions
    openingsListDiv.addEventListener("click", (e) => {
      const moveUpBtn = e.target.closest(".cms-opening-moveup-btn");
      const moveDownBtn = e.target.closest(".cms-opening-movedown-btn");
      if (!moveUpBtn && !moveDownBtn) return;

      const btn = moveUpBtn || moveDownBtn;
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      const isUp = !!moveUpBtn;

      const grid = cmsVirtualDoc.querySelector("#opportunities-list");
      const cards = Array.from(grid.querySelectorAll(".position-card"));

      if (isUp && idx > 0) {
        grid.insertBefore(cards[idx], cards[idx - 1]);
      } else if (!isUp && idx < cards.length - 1) {
        grid.insertBefore(cards[idx + 1], cards[idx]);
      }

      syncOpeningsDOM();
      refreshOpeningsList();
      saveToSession();
    });
  }

  function syncOpeningsDOM() {
    const liveGrid = document.getElementById("opportunities-list");
    if (!liveGrid) return;
    const virtGrid = cmsVirtualDoc.querySelector("#opportunities-list");
    if (virtGrid) {
      liveGrid.innerHTML = virtGrid.innerHTML;
    }
    highlightEditableElements(true);
  }


  // ==========================================
  // TAB 6: EXPORT & SYNC (PUBLISH)
  // ==========================================
  function renderExportTab(container) {
    const savedToken = localStorage.getItem("kaslab_cms_git_token") || "";

    container.innerHTML = `
      <h3 class="cms-section-title">Save & Export Code</h3>
      
      <div class="cms-instructions" style="margin-bottom: 20px;">
        <h4><i class="fa-solid fa-lightbulb"></i> Local Download (Manual)</h4>
        <ol>
          <li>Click **Download index.html** to get the updated source file.</li>
          <li>Click **Download site.region** to get the Squarespace template file.</li>
          <li>Replace the files in your local workspace folder.</li>
        </ol>
      </div>

      <div style="display: flex; gap: 10px; margin-bottom: 25px;">
        <button class="cms-btn cms-btn-primary cms-btn-sm" id="cms-export-html" style="flex: 1;">
          <i class="fa-solid fa-download"></i> index.html
        </button>
        <button class="cms-btn cms-btn-primary cms-btn-sm" id="cms-export-region" style="flex: 1; background: #10b981;">
          <i class="fa-solid fa-server"></i> site.region
        </button>
      </div>

      <h3 class="cms-section-title">Direct GitHub Sync (Automatic)</h3>
      <div class="cms-field" style="margin-bottom: 15px;">
        <label>GitHub Personal Access Token</label>
        <input type="password" id="cms-github-token" class="cms-input" placeholder="ghp_..." value="${escapeHtml(savedToken)}" autocomplete="off">
        <small style="color: var(--admin-text-muted); font-size:0.75rem; display:block; margin-top:5px; line-height: 1.4;">
          Your token will be saved securely in your browser's local storage. This enables publishing in one click.
        </small>
      </div>

      <div class="cms-button-row" style="flex-direction: column; gap: 10px; margin-bottom: 20px;">
        <button class="cms-btn cms-btn-primary cms-btn-full" id="cms-git-push-preview" style="background: #4f46e5; padding: 12px;">
          <i class="fa-solid fa-cloud-arrow-up"></i> Push to Staging (preview)
        </button>
        <button class="cms-btn cms-btn-primary cms-btn-full" id="cms-git-push-master" style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 12px;">
          <i class="fa-solid fa-circle-check"></i> Push to Production (master)
        </button>
      </div>

      <div id="cms-git-status" style="margin-top: 15px; font-size: 0.8rem; padding: 12px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); display: none; line-height: 1.5;"></div>

      <button class="cms-btn cms-btn-danger cms-btn-full cms-btn-sm" id="cms-reset-session" style="margin-top: 25px; opacity: 0.7;">
        <i class="fa-solid fa-arrow-rotate-left"></i> Discard Session Edits
      </button>
    `;

    // 1. Export index.html (manual)
    document.getElementById("cms-export-html").addEventListener("click", () => {
      const docClone = cmsVirtualDoc.cloneNode(true);
      docClone.querySelectorAll('.cms-editable-highlight-preview').forEach(el => {
        el.classList.remove('cms-editable-highlight-preview');
      });
      const serialized = "<!DOCTYPE html>\n" + docClone.documentElement.outerHTML;
      triggerFileDownload("index.html", serialized);
    });

    // 2. Export site.region (manual)
    document.getElementById("cms-export-region").addEventListener("click", () => {
      const docClone = cmsVirtualDoc.cloneNode(true);
      docClone.querySelectorAll('.cms-editable-highlight-preview').forEach(el => {
        el.classList.remove('cms-editable-highlight-preview');
      });

      let html = docClone.documentElement.outerHTML;
      html = html.replace(/"assets\//g, '"/assets/');
      html = html.replace(
        /<meta property="og:image" content="\/assets\//g,
        '<meta property="og:image" content="https://vignesh-kasinath.squarespace.com/assets/'
      );
      html = html.replace(/<body>/g, '<body id="{squarespace.page-id}" class="{squarespace.page-classes}">');
      html = html.replace(/<\/head>/g, '  {squarespace-headers}\n</head>');
      html = html.replace(
        /<\/body>/g,
        '  <div class="sqs-main-content" data-content-field="main-content" aria-hidden="true" style="display:none">{squarespace.main-content}</div>\n  {squarespace-footers}\n</body>'
      );

      const siteRegionContent = `<!-- GENERATED from index.html by dev/build-region.sh — DO NOT EDIT BY HAND. Edit index.html, then re-run. -->\n<!DOCTYPE html>\n` + html;
      triggerFileDownload("site.region", siteRegionContent);
    });

    // 3. GitHub Direct Push
    const publishToGit = async (branch) => {
      const token = document.getElementById("cms-github-token").value.trim();
      const statusDiv = document.getElementById("cms-git-status");

      if (!token) {
        alert("Please enter a GitHub Personal Access Token first.");
        return;
      }

      // Save token locally
      localStorage.setItem("kaslab_cms_git_token", token);

      statusDiv.style.display = "block";
      statusDiv.style.color = "var(--admin-gold)";
      statusDiv.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Preparing files...`;

      const owner = "KasinathLab";
      const repo = "Kasinath_Laboratory_Website";

      try {
        // Prepare index.html contents
        const docClone = cmsVirtualDoc.cloneNode(true);
        docClone.querySelectorAll('.cms-editable-highlight-preview').forEach(el => {
          el.classList.remove('cms-editable-highlight-preview');
        });
        const indexHTMLContent = "<!DOCTYPE html>\n" + docClone.documentElement.outerHTML;

        // Prepare site.region contents
        let html = docClone.documentElement.outerHTML;
        html = html.replace(/"assets\//g, '"/assets/');
        html = html.replace(
          /<meta property="og:image" content="\/assets\//g,
          '<meta property="og:image" content="https://vignesh-kasinath.squarespace.com/assets/'
        );
        html = html.replace(/<body>/g, '<body id="{squarespace.page-id}" class="{squarespace.page-classes}">');
        html = html.replace(/<\/head>/g, '  {squarespace-headers}\n</head>');
        html = html.replace(
          /<\/body>/g,
          '  <div class="sqs-main-content" data-content-field="main-content" aria-hidden="true" style="display:none">{squarespace.main-content}</div>\n  {squarespace-footers}\n</body>'
        );
        const siteRegionContent = `<!-- GENERATED from index.html by dev/build-region.sh — DO NOT EDIT BY HAND. Edit index.html, then re-run. -->\n<!DOCTYPE html>\n` + html;

        const filesToPush = [
          { path: "index.html", content: indexHTMLContent, isBinary: false },
          { path: "site.region", content: siteRegionContent, isBinary: false }
        ];

        for (const [imgPath, base64Data] of Object.entries(pendingUploads)) {
          filesToPush.push({
            path: imgPath,
            content: base64Data,
            isBinary: true
          });
        }

        for (const file of filesToPush) {
          statusDiv.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Fetching SHA of ${file.path}...`;

          // Get file SHA
          const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${branch}`;
          const getRes = await fetch(getUrl, {
            headers: {
              "Authorization": `token ${token}`,
              "Accept": "application/vnd.github.v3+json"
            }
          });

          let sha = null;
          if (getRes.ok) {
            const fileData = await getRes.json();
            sha = fileData.sha;
          } else if (getRes.status !== 404) {
            throw new Error(`Failed to fetch metadata for ${file.path} (Status ${getRes.status})`);
          }

          statusDiv.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Committing ${file.path} to branch ${branch}...`;

          let base64Content;
          if (file.isBinary) {
            base64Content = file.content;
          } else {
            // Base64 encode UTF-8 safely for text files
            base64Content = btoa(unescape(encodeURIComponent(file.content)));
          }

          const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`;
          const putRes = await fetch(putUrl, {
            method: "PUT",
            headers: {
              "Authorization": `token ${token}`,
              "Accept": "application/vnd.github.v3+json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              message: `Update ${file.path} via Lab CMS Portal`,
              content: base64Content,
              sha: sha,
              branch: branch
            })
          });

          if (!putRes.ok) {
            const errData = await putRes.json();
            throw new Error(`Failed to commit ${file.path}: ${errData.message}`);
          }
        }

        // Clear queue on success
        for (const key of Object.keys(pendingUploads)) {
          delete pendingUploads[key];
        }

        statusDiv.style.color = "#10b981";
        if (branch === "master") {
          statusDiv.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#10b981;"></i> **Published directly to Production (master)!** <br>Your changes will deploy to the public Squarespace site in approximately 1 minute.`;
        } else {
          statusDiv.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#10b981;"></i> **Published to Staging (preview)!** <br>Staging site rebuild has been triggered. The changes will be visible in 1–2 minutes.`;
        }
      } catch (err) {
        console.error(err);
        statusDiv.style.color = "#f87171";
        statusDiv.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="color:#f87171;"></i> **Sync Error:** ${err.message}`;
      }
    };

    document.getElementById("cms-git-push-preview").addEventListener("click", () => publishToGit("preview"));
    document.getElementById("cms-git-push-master").addEventListener("click", () => publishToGit("master"));

    // 4. Reset Session
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

      // Sync Research priorities
      const virtResearchIntro = cmsVirtualDoc.querySelector("#research > p");
      const liveResearchIntro = document.querySelector("#research > p");
      if (virtResearchIntro && liveResearchIntro) {
        liveResearchIntro.textContent = virtResearchIntro.textContent;
      }
      syncResearchPillarsDOM();

      const virtMethod = cmsVirtualDoc.querySelector("#research-methodology");
      const liveMethod = document.querySelector("#research-methodology");
      if (virtMethod && liveMethod) {
        liveMethod.innerHTML = virtMethod.innerHTML;
      }

      // Sync Publications
      syncPublicationsDOM();

      // Sync Openings
      const virtOpeningsIntro = cmsVirtualDoc.querySelector("#openings > p");
      const liveOpeningsIntro = document.querySelector("#openings > p");
      if (virtOpeningsIntro && liveOpeningsIntro) {
        liveOpeningsIntro.textContent = virtOpeningsIntro.textContent;
      }
      syncOpeningsDOM();

      // Sync Contact section title & description
      const virtContactTitle = cmsVirtualDoc.querySelector("#contact .section-title");
      const liveContactTitle = document.querySelector("#contact .section-title");
      if (virtContactTitle && liveContactTitle) {
        liveContactTitle.textContent = virtContactTitle.textContent;
      }
      
      const virtContactDesc = cmsVirtualDoc.querySelector("#contact > p");
      const liveContactDesc = document.querySelector("#contact > p");
      if (virtContactDesc && liveContactDesc) {
        liveContactDesc.textContent = virtContactDesc.textContent;
      }

      // Sync Contact details
      const virtAddress = cmsVirtualDoc.querySelector("#contact-details .contact-item-box:nth-child(1) p");
      const liveAddress = document.querySelector("#contact-details .contact-item-box:nth-child(1) p");
      if (virtAddress && liveAddress) liveAddress.innerHTML = virtAddress.innerHTML;

      const virtEmail = cmsVirtualDoc.querySelector("#contact-details .contact-item-box:nth-child(2) a");
      const liveEmail = document.querySelector("#contact-details .contact-item-box:nth-child(2) a");
      if (virtEmail && liveEmail) {
        liveEmail.setAttribute("href", virtEmail.getAttribute("href"));
        liveEmail.textContent = virtEmail.textContent;
      }

      // Sync Confluence links
      const virtHeaderLink = cmsVirtualDoc.querySelector("#tab-btn-confluence");
      const liveHeaderLink = document.querySelector("#tab-btn-confluence");
      if (virtHeaderLink && liveHeaderLink) {
        liveHeaderLink.setAttribute("href", virtHeaderLink.getAttribute("href"));
      }

      const virtContactLink = cmsVirtualDoc.querySelector("#contact-details .contact-item-box:nth-child(3) a");
      const liveContactLink = document.querySelector("#contact-details .contact-item-box:nth-child(3) a");
      if (virtContactLink && liveContactLink) {
        liveContactLink.setAttribute("href", virtContactLink.getAttribute("href"));
      }

      // Sync Logo & Branding
      const virtLogoImg = cmsVirtualDoc.querySelector("#brand-logo img");
      const liveLogoImg = document.querySelector("#brand-logo img");
      if (virtLogoImg && liveLogoImg) {
        liveLogoImg.setAttribute("src", virtLogoImg.getAttribute("src"));
      }

      const virtLogoText = cmsVirtualDoc.querySelector("#brand-logo .logo-text");
      const liveLogoText = document.querySelector("#brand-logo .logo-text");
      if (virtLogoText && liveLogoText) {
        liveLogoText.textContent = virtLogoText.textContent;
      }

      const virtFooterLogo = cmsVirtualDoc.querySelector("footer .footer-logo");
      const liveFooterLogo = document.querySelector("footer .footer-logo");
      if (virtFooterLogo && liveFooterLogo) {
        liveFooterLogo.textContent = virtFooterLogo.textContent;
      }
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
