// NEXORA - Enhanced Scripts with Form Fallback System
(() => {
  // Helpers
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const track = (eventName, props = {}) => {
    if (window.NEXORA_DEBUG) console.debug('[analytics]', eventName, props);
  };

  // Enhanced GA4 tracking function
  function trackEvent(eventName, parameters = {}) {
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, parameters);
    }
    track(eventName, parameters);
  }

  // DEBUG helpers
  const DBG_ON = (localStorage.NEXORA_DEBUG === '1') || !!window.NEXORA_DEBUG;
  const dbg = (...a) => { if (DBG_ON) console.debug('[NEXORA]', ...a); };
  
  // BUG FIX #1: Prevent duplicate error handlers
  if (!window.NEXORA_ERROR_HANDLERS_INITIALIZED) {
    window.NEXORA_ERROR_HANDLERS_INITIALIZED = true;
    
    window.addEventListener('error', (e) => {
      console.error('[NEXORA] Uncaught error:', e.message, e.filename+':'+e.lineno);
      
      trackEvent('exception', {
        description: e.message,
        filename: e.filename,
        lineno: e.lineno,
        fatal: false
      });
    });
    
    window.addEventListener('unhandledrejection', (e) => {
      console.error('[NEXORA] Unhandled promise rejection:', e.reason);
      
      trackEvent('exception', {
        description: e.reason?.toString() || 'Unhandled promise rejection',
        fatal: false
      });
    });
  }
  
  dbg('scripts.js loaded');

  // BUG FIX #2: Move isMobile to global scope within IIFE
  const isMobile = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isMobileScreen = window.innerWidth <= 768;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return isMobileUserAgent || (isMobileScreen && isTouchDevice);
  };

  const isDesktop = () => {
    return !isMobile() && window.innerWidth > 768;
  };

  // Mobile nav
  const menuBtn = $('#menuBtn');
  const mobileNav = $('#mobileNav');
  menuBtn?.addEventListener('click', () => {
    mobileNav?.classList.toggle('hidden');
  });

  // Footer year
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Product rows: Arrow navigation with auto-rotation pause
  $$('.row-prev').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = document.querySelector(`[data-row="${btn.dataset.target}"]`);
      if (!row) return;
      
      pauseProductRowRotation(btn.dataset.target);
      
      const dx = Math.max(320, row.clientWidth * 0.8);
      row.scrollBy({ left: -dx, behavior: 'smooth' });
      
      setTimeout(() => resumeProductRowRotation(btn.dataset.target), 5000);
    });
  });
  
  $$('.row-next').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = document.querySelector(`[data-row="${btn.dataset.target}"]`);
      if (!row) return;
      
      pauseProductRowRotation(btn.dataset.target);
      
      const dx = Math.max(320, row.clientWidth * 0.8);
      row.scrollBy({ left: dx, behavior: 'smooth' });
      
      setTimeout(() => resumeProductRowRotation(btn.dataset.target), 5000);
    });
  });

  // ============================================
  // ENHANCED FORM SUBMISSION WITH FALLBACK SYSTEM
  // ============================================

  // Configuration - Replace 'your-form-id-here' with your actual Formspree form ID
  const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xjkeznwz';
  
  // Form elements
  const form = document.getElementById('quoteForm');
  const submitBtn = form?.querySelector('button[type="submit"]');
  const status = document.getElementById('quoteStatus');
  const originalBtnText = submitBtn?.textContent || 'Get Quote';

  // Netlify submission function
  async function submitToNetlify(form) {
    try {
      const fd = new FormData(form);
      if (!fd.get('form-name')) fd.set('form-name', 'quote');
      
      // Update submission service tracker
      const serviceInput = document.getElementById('submissionService');
      if (serviceInput) serviceInput.value = 'netlify';
      
      const res = await fetch('/', {
        method: 'POST',
        body: fd
      });
      
      if (res.ok) {
        dbg('Netlify submission successful');
        return { success: true, service: 'netlify' };
      } else if (res.status === 429) {
        // Netlify rate limit exceeded
        console.warn('Netlify rate limit exceeded (429), switching to fallback');
        dbg('Netlify rate limit hit, triggering Formspree fallback');
        return { success: false, reason: 'rate_limit', service: 'netlify' };
      } else {
        console.error('Netlify submission failed:', res.status, res.statusText);
        dbg(`Netlify failed: ${res.status} ${res.statusText}`);
        return { success: false, reason: 'http_error', service: 'netlify', status: res.status };
      }
    } catch (err) {
      console.error('Netlify submission error:', err);
      dbg('Netlify network/connection error:', err.message);
      return { success: false, reason: 'network_error', service: 'netlify', error: err.message };
    }
  }

  // Formspree submission function
  async function submitToFormspree(form) {
    try {
      const fd = new FormData(form);
      
      // Convert FormData to JSON for Formspree
      const formData = {};
      for (let [key, value] of fd.entries()) {
        if (key === 'form-name') continue; // Skip Netlify-specific field
        if (key === 'submission_service') continue; // Skip our tracking field
        
        // Handle file uploads
        if (value instanceof File) {
          formData[key] = value;
        } else {
          formData[key] = value;
        }
      }
      
      // Update submission service tracker
      const serviceInput = document.getElementById('submissionService');
      if (serviceInput) serviceInput.value = 'formspree';
      
      // For Formspree, we need to handle files differently
      const formspreeData = new FormData();
      for (let [key, value] of Object.entries(formData)) {
        formspreeData.append(key, value);
      }
      
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        body: formspreeData,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (res.ok) {
        dbg('Formspree submission successful');
        return { success: true, service: 'formspree' };
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Formspree submission failed:', res.status, res.statusText, errorData);
        dbg(`Formspree failed: ${res.status} ${res.statusText}`);
        return { success: false, reason: 'http_error', service: 'formspree', status: res.status };
      }
    } catch (err) {
      console.error('Formspree submission error:', err);
      dbg('Formspree network/connection error:', err.message);
      return { success: false, reason: 'network_error', service: 'formspree', error: err.message };
    }
  }

  // Enhanced form submission with fallback
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!submitBtn || !status) return;
    
    // VALIDATION: Check required fields
    const nameField = form.querySelector('input[name="name"]');
    const phoneField = form.querySelector('input[name="phone"]');
    
    // Clear previous error styles
    [nameField, phoneField].forEach(field => {
      if (field) {
        field.classList.remove('border-red-500', 'ring-red-500');
        field.classList.add('border-slate-300');
      }
    });
    
    let hasErrors = false;
    
    // Validate name field
    if (!nameField?.value.trim()) {
      if (nameField) {
        nameField.classList.remove('border-slate-300');
        nameField.classList.add('border-red-500', 'ring-red-500');
        nameField.focus();
      }
      hasErrors = true;
    }
    
    // Validate phone field
    if (!phoneField?.value.trim()) {
      if (phoneField) {
        phoneField.classList.remove('border-slate-300');
        phoneField.classList.add('border-red-500', 'ring-red-500');
        if (!hasErrors) phoneField.focus();
      }
      hasErrors = true;
    }
    
    if (hasErrors) {
      status.className = '';
      status.innerHTML = '<div class="text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">❌ Please fill in all required fields (Name and Phone).</div>';
      return;
    }
    
    status.textContent = '';
    status.className = 'hidden';
    
    updateSelectedProductsInForm();
    
    const originalBtnClasses = submitBtn.className;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    submitBtn.className = submitBtn.className.replace('bg-slate-900', 'bg-gray-600');
    
    // Track form submission start
    const submissionStartTime = Date.now();
    
    try {
      dbg('Starting form submission process...');
      
      // STEP 1: Try Netlify first
      dbg('Attempting Netlify submission...');
      const netlifyResult = await submitToNetlify(form);
      
      if (netlifyResult.success) {
        // SUCCESS: Netlify worked
        dbg('Form submitted successfully via Netlify');
        
        submitBtn.className = originalBtnClasses.replace('bg-slate-900', 'bg-green-600 hover:bg-green-700');
        submitBtn.textContent = '✓ Submitted!';
        submitBtn.disabled = true;
        
        status.className = '';
        status.innerHTML = '<div class="text-green-600 font-medium bg-green-50 border border-green-200 rounded-lg p-3">✅ Quote request sent successfully! We\'ll respond within 2 hours.</div>';
        
        // Clear form
        clearFormAfterSuccess(form);
        
        // Track successful submission
        trackSubmissionSuccess('netlify', submissionStartTime);
        
      } else {
        // Netlify failed, try Formspree fallback
        dbg(`Netlify failed (${netlifyResult.reason}), attempting Formspree fallback...`);
        
        const formspreeResult = await submitToFormspree(form);
        
        if (formspreeResult.success) {
          // SUCCESS: Formspree worked as fallback
          dbg('Form submitted successfully via Formspree fallback');
          
          submitBtn.className = originalBtnClasses.replace('bg-slate-900', 'bg-green-600 hover:bg-green-700');
          submitBtn.textContent = '✓ Submitted!';
          submitBtn.disabled = true;
          
          status.className = '';
          status.innerHTML = '<div class="text-green-600 font-medium bg-green-50 border border-green-200 rounded-lg p-3">✅ Quote request sent successfully! We\'ll respond within 2 hours.</div>';
          
          // Clear form
          clearFormAfterSuccess(form);
          
          // Track successful fallback submission
          trackSubmissionSuccess('formspree', submissionStartTime, netlifyResult.reason);
          
        } else {
          // Both services failed
          throw new Error(`Both services failed - Netlify: ${netlifyResult.reason}, Formspree: ${formspreeResult.reason}`);
        }
      }
      
    } catch (err) {
      console.error('Complete form submission failure:', err);
      dbg('Both submission methods failed:', err.message);
      
      submitBtn.className = originalBtnClasses.replace('bg-slate-900', 'bg-red-600 hover:bg-red-700');
      submitBtn.textContent = '✗ Error - Try Again';
      submitBtn.disabled = false;
      
      status.className = '';
      status.innerHTML = '<div class="text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">❌ Error sending quote. Please try WhatsApp instead or refresh and try again.</div>';
      
      // Track submission failure
      trackEvent('quote_form_error', {
        error_type: 'complete_failure',
        error_message: err.message,
        submission_time: Date.now() - submissionStartTime,
        device_type: isMobile() ? 'mobile' : 'desktop'
      });
      
      setTimeout(() => {
        submitBtn.className = originalBtnClasses;
        submitBtn.textContent = originalBtnText;
      }, 3000);
    }
  });

  // Helper function to clear form after successful submission
  function clearFormAfterSuccess(form) {
    const formElements = form.querySelectorAll('input:not([type="submit"]), textarea, select');
    formElements.forEach(element => {
      if (element.type !== 'hidden' && element.name !== 'form-name' && element.name !== 'submission_service') {
        element.value = '';
        element.classList.remove('border-red-500', 'ring-red-500');
        element.classList.add('border-slate-300');
      }
    });
    
    const fileInput = document.getElementById('designUpload');
    const fileList = document.getElementById('fileList');
    if (fileInput) fileInput.value = '';
    if (fileList) fileList.innerHTML = '';
    
    selectedProducts.clear();
    updateUI();
    
    dbg('Form cleared after successful submission');
  }

  // Helper function to track successful submissions
  function trackSubmissionSuccess(service, startTime, fallbackReason = null) {
    const hasDesignUpload = document.getElementById('designUpload')?.files?.length > 0;
    
    const eventData = {
      products_selected: selectedProducts.size,
      has_design_upload: hasDesignUpload || false,
      form_completion_time: Date.now() - (window.formStartTime || Date.now()),
      submission_method: service,
      submission_time: Date.now() - startTime,
      device_type: isMobile() ? 'mobile' : 'desktop'
    };
    
    // Add fallback context if this was a fallback submission
    if (fallbackReason) {
      eventData.is_fallback = true;
      eventData.primary_failure_reason = fallbackReason;
      eventData.fallback_service = service;
    }
    
    trackEvent('quote_form_submit', eventData);
    
    if (typeof track === 'function') track('quote_submitted');
    
    dbg(`Submission tracked: ${service}${fallbackReason ? ` (fallback due to ${fallbackReason})` : ''}`);
  }

  // ============================================
  // REST OF EXISTING FUNCTIONALITY (unchanged)
  // ============================================

  // BUG FIX #4: Initialize formStartTime properly
  const nameField = $('#quoteName');
  if (nameField) {
    nameField.addEventListener('input', () => {
      if (!window.formStartTime) {
        window.formStartTime = Date.now();
        trackEvent('form_start', {
          form_name: 'quote_form',
          trigger_field: 'name',
          device_type: isMobile() ? 'mobile' : 'desktop'
        });
      }
      updateWhatsAppLink();
    });
  }

  const phoneField = $('#quotePhone');
  if (phoneField) {
    phoneField.addEventListener('input', () => {
      if (!window.formStartTime) {
        window.formStartTime = Date.now();
        trackEvent('form_start', {
          form_name: 'quote_form',
          trigger_field: 'phone',
          device_type: isMobile() ? 'mobile' : 'desktop'
        });
      }
    });
  }

  // WhatsApp click tracking
  document.addEventListener('click', (e) => {
    const whatsappLink = e.target.closest('a[href*="wa.me"]');
    if (whatsappLink) {
      // BUG FIX #5: Check if designUpload exists
      const hasDesignUpload = document.getElementById('designUpload')?.files?.length > 0;
      
      trackEvent('contact_whatsapp', {
        method: 'whatsapp',
        source: whatsappLink.closest('#hero') ? 'hero_button' : 
                whatsappLink.closest('#quote') ? 'quote_form' : 'unknown',
        products_selected: selectedProducts.size,
        has_design_upload: hasDesignUpload || false,
        user_provided_name: !!$('#quoteName')?.value.trim()
      });
    }
  });

  // Use-case quote buttons
  const ucButtons = document.querySelectorAll('.get-quote-uc');
  ucButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const useCase = btn.getAttribute('data-use-case') || 'Custom';
      
      trackEvent('use_case_selected', {
        use_case: useCase,
        source: 'perfect_for_section',
        device_type: isMobile() ? 'mobile' : 'desktop'
      });
      
      const useCaseInput = document.querySelector('input[name="use_case"], textarea[name="message"]');
      if (useCaseInput) {
        if (useCaseInput.tagName === 'TEXTAREA') {
          useCaseInput.value = `Use case: ${useCase}\n\n`;
        } else {
          useCaseInput.value = useCase;
        }
      }
      
      const quoteForm = document.getElementById('quoteForm');
      if (quoteForm) {
        const rect = quoteForm.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
          quoteForm.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  function showDevelopmentMessage() {
    let messageEl = document.getElementById('devMessage');
    
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = 'devMessage';
      messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #1f2937;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(messageEl);
    }
    
    messageEl.textContent = '🚧 Product page is under development. Browse products below!';
    messageEl.style.opacity = '1';
    
    setTimeout(() => {
      messageEl.style.opacity = '0';
    }, 4000);
    
    dbg('Development message shown');
  }

  // QUOTE SYSTEM - Product selection with add/remove toggle
  const selectedProducts = new Map();
  
  function updateQuoteButton(btn, isSelected) {
    if (isSelected) {
      btn.textContent = 'Added ✓';
      btn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
      btn.classList.add('bg-green-600', 'hover:bg-green-700');
      btn.setAttribute('data-action', 'remove');
    } else {
      btn.textContent = 'Add to Quote';
      btn.classList.remove('bg-green-600', 'hover:bg-green-700');
      btn.classList.add('bg-blue-600', 'hover:bg-blue-700');
      btn.setAttribute('data-action', 'add');
    }
  }

  function updateUI() {
    $$('.quote-btn').forEach(btn => {
      const productId = btn.getAttribute('data-product');
      const isSelected = selectedProducts.has(productId);
      updateQuoteButton(btn, isSelected);
    });

    const quoteTextarea = $('textarea[name="message"]');
    if (quoteTextarea) {
      if (selectedProducts.size > 0) {
        const productList = Array.from(selectedProducts.values())
          .map(p => `• ${p.name} - ${p.price}`)
          .join('\n');
        
        quoteTextarea.value = `Selected Products:\n${productList}\n\nAdditional requirements:\n`;
      } else {
        quoteTextarea.value = '';
        quoteTextarea.placeholder = 'Select products above to add them here, or describe your custom requirements...';
      }
    }

    updateQuoteFormIndicator();
    updateWhatsAppLink();
  }

  function updateQuoteFormIndicator() {
    let indicator = $('#selectedProductsList');
    const container = $('#selectedProductsContainer');
    const quoteForm = $('#quoteForm');
    
    if (!quoteForm) return;

    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'selectedProductsList';
      indicator.className = 'selected-products';
      
      if (container) {
        container.appendChild(indicator);
      } else {
        const textarea = quoteForm.querySelector('textarea[name="message"]');
        if (textarea) {
          textarea.parentNode.insertBefore(indicator, textarea);
        }
      }
    }

    if (selectedProducts.size > 0) {
      const productCount = selectedProducts.size;
      const productList = Array.from(selectedProducts.entries())
        .map(([productId, p]) => `<div class="flex justify-between items-center py-2 px-3 bg-blue-50 rounded-lg border border-blue-200 mb-2">
                     <div class="flex-1">
                       <span class="font-medium text-gray-800">${p.name}</span>
                       <span class="text-blue-600 ml-2 font-semibold">${p.price}</span>
                     </div>
                     <button onclick="removeProductFromQuote('${productId}')" 
                             class="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-full transition-colors ml-2" 
                             title="Remove ${p.name}">
                       <span class="text-lg font-bold">✕</span>
                     </button>
                   </div>`)
        .join('');

      indicator.innerHTML = `
        <div class="flex items-center justify-between mb-3 p-2 bg-blue-50 rounded-md border border-blue-200">
          <span class="text-blue-700 font-medium text-sm">📋 ${productCount} Product${productCount > 1 ? 's' : ''} in Quote</span>
          <button onclick="clearAllProducts()" class="text-xs text-red-500 hover:text-red-700 underline">Clear All</button>
        </div>
        <div class="space-y-2 mb-3 max-h-48 overflow-y-auto">
          ${productList}
        </div>
        <div class="text-xs text-gray-500 border-t pt-2 mt-3">
          💡 Add more products above or describe additional requirements below
        </div>
      `;
      
      indicator.style.display = 'block';
      indicator.style.visibility = 'visible';
      indicator.style.opacity = '1';
      
      if (container) {
        container.style.display = 'block';
        container.style.visibility = 'visible';
      }
      
      const quoteSection = $('#quote');
      if (quoteSection) {
        quoteSection.style.display = 'block';
        quoteSection.style.visibility = 'visible';
      }
      
    } else {
      indicator.innerHTML = `
        <div class="flex items-center text-gray-500 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <span>📋 No products selected yet</span>
        </div>
        <div class="text-sm text-gray-400 mt-2 px-3">
          Click "Add to Quote" on products above to build your quote
        </div>
      `;
      
      indicator.style.display = 'block';
      indicator.style.visibility = 'visible';
      indicator.style.opacity = '1';
      
      if (container) {
        container.style.display = 'block';
        container.style.visibility = 'visible';
      }
    }

    const quoteTextarea = quoteForm.querySelector('textarea[name="message"]');
    if (quoteTextarea && selectedProducts.size > 0) {
      const productList = Array.from(selectedProducts.values())
        .map(p => `• ${p.name} - ${p.price}`)
        .join('\n');
      
      const currentValue = quoteTextarea.value;
      
      if (!currentValue.includes('Selected Products:')) {
        quoteTextarea.value = `Selected Products:\n${productList}\n\nAdditional requirements:\n${currentValue}`;
      } else {
        const additionalText = currentValue.split('Additional requirements:\n')[1] || '';
        quoteTextarea.value = `Selected Products:\n${productList}\n\nAdditional requirements:\n${additionalText}`;
      }
    }
    
    dbg(`Quote form indicator updated: ${selectedProducts.size} products visible in form`);
  }

  function updateWhatsAppLink() {
    const whatsappLink = $('#quoteForm a[href*="wa.me"]');
    
    if (!whatsappLink) return;

    const nameField = $('#quoteName');
    const userName = nameField ? nameField.value.trim() : '';

    let message = "Hi NEXORA team";
    
    if (selectedProducts.size > 0) {
      const productList = Array.from(selectedProducts.values())
        .map(p => `• ${p.name} - ${p.price}`)
        .join('\n');
      
      const greeting = userName ? `Hello, I am ${userName} and I'm looking for quotes for:` : `Hi NEXORA team, I'm looking for quotes for:`;
      
      message = `${greeting}

${productList}

Please provide me with a quote and more details.

Thank you!`;
    } else {
      if (userName) {
        message = `Hello, I am ${userName} and I'm looking for quotes/custom apparel.`;
      } else {
        message = "Hi NEXORA team, I'm looking for quotes/custom apparel.";
      }
    }

    const phoneNumber = "918360833126";
    const encodedMessage = encodeURIComponent(message);
    whatsappLink.href = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    dbg('WhatsApp link updated with name and selected products');
  }

  function updateSelectedProductsInForm() {
    const selectedProductsInput = $('#selectedProductsInput');
    if (selectedProductsInput && selectedProducts.size > 0) {
      const productList = Array.from(selectedProducts.values())
        .map(p => `${p.name} - ${p.price}`)
        .join(', ');
      selectedProductsInput.value = productList;
      dbg('Form updated with selected products for submission');
    }
  }

  // File upload handler
  window.handleFileUpload = function(input) {
    const fileList = document.getElementById('fileList');
    const files = Array.from(input.files);
    
    fileList.innerHTML = '';
    
    files.forEach((file, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'flex items-center justify-between bg-slate-50 px-3 py-2 rounded-md text-sm';
      fileItem.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-slate-600">📎</span>
          <span class="font-medium">${file.name}</span>
          <span class="text-slate-500">(${(file.size / 1024).toFixed(1)} KB)</span>
        </div>
        <button type="button" onclick="removeFile(${index})" class="text-red-500 hover:text-red-700 text-xs">Remove</button>
      `;
      fileList.appendChild(fileItem);
    });
    
    trackEvent('file_upload', {
      file_count: files.length,
      file_types: files.map(f => f.name.split('.').pop().toLowerCase()),
      total_size: files.reduce((sum, f) => sum + f.size, 0),
      average_file_size: files.length > 0 ? files.reduce((sum, f) => sum + f.size, 0) / files.length : 0
    });
    
    dbg('Files selected:', files.length);
  };

  window.removeFile = function(index) {
    const input = document.getElementById('designUpload');
    const dt = new DataTransfer();
    const files = Array.from(input.files);
    
    files.forEach((file, i) => {
      if (i !== index) dt.items.add(file);
    });
    
    input.files = dt.files;
    handleFileUpload(input);
  };

  window.removeProductFromQuote = function(productId) {
    if (selectedProducts.has(productId)) {
      const product = selectedProducts.get(productId);
      selectedProducts.delete(productId);
      
      updateUI();
      
      dbg('Removed from quote via form:', product.name);
    }
  };

  window.clearAllProducts = function() {
    const count = selectedProducts.size;
    selectedProducts.clear();
    
    updateUI();
    
    dbg('Cleared all products from quote');
  };

  // Handle quote button clicks
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.quote-btn');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const productId = btn.getAttribute('data-product');
    const productName = btn.getAttribute('data-name');
    const productPrice = btn.getAttribute('data-price');
    const action = btn.getAttribute('data-action');

    if (!productId || !productName || !productPrice) {
      console.warn('Missing product data on quote button');
      return;
    }

    if (action === 'add') {
      selectedProducts.set(productId, {
        name: productName,
        price: productPrice
      });
      dbg('Added to quote:', productName);
      
      trackEvent('add_to_quote', {
        product_id: productId,
        product_name: productName,
        product_price: productPrice,
        category: btn.closest('#tshirts') ? 't-shirts' : btn.closest('#hoodies') ? 'hoodies' : 'varsity',
        total_products_in_quote: selectedProducts.size
      });
      
    } else {
      selectedProducts.delete(productId);
      dbg('Removed from quote:', productName);
      
      trackEvent('remove_from_quote', {
        product_id: productId,
        product_name: productName,
        remaining_products_in_quote: selectedProducts.size
      });
    }

    setTimeout(() => {
      updateUI();
    }, 100);
    
    if (selectedProducts.size > 0) {
      const reminder = $('#quoteReminder');
      if (reminder) {
        reminder.textContent = `📋 ${selectedProducts.size} product${selectedProducts.size > 1 ? 's' : ''} in your quote!`;
        reminder.style.display = 'block';
        reminder.style.opacity = '1';
        setTimeout(() => {
          reminder.style.opacity = '0';
          setTimeout(() => reminder.style.display = 'none', 300);
        }, 3000);
      }
    }
  });

  function updateHeroDots(slideIndex) {
    const dots = document.querySelectorAll('[data-dot]');
    dots.forEach((dot, index) => {
      if (index === slideIndex) {
        dot.className = 'dot bg-white/80';
      } else {
        dot.className = 'dot bg-white/40';
      }
    });
  }

  // AUTO-ROTATION: Hero carousel and product rows
  let heroCarouselInterval = null;
  let comingSoonInterval = null;
  let productRowsIntervals = new Map();

  function setupHeroAutoRotation() {
    const carouselTrack = $('#carouselTrack');
    
    if (heroCarouselInterval) {
      clearInterval(heroCarouselInterval);
      heroCarouselInterval = null;
    }
    
    if (carouselTrack) {
      const slides = carouselTrack.children;
      if (slides.length > 1) {
        // BUG FIX #6: Define totalSlides
        const totalSlides = slides.length;
        let currentSlide = 0;
        let isTransitioning = false;
        
        const prevBtn = $('#prevBtn');
        const nextBtn = $('#nextBtn');
        const dots = $$('[data-dot]');
        
        const deviceInfo = {
          isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
          isAndroid: /Android/.test(navigator.userAgent),
          isDesktop: !isMobile(),
          isMobile: isMobile(),
          supportsTouch: 'ontouchstart' in window,
          userAgent: navigator.userAgent
        };
        
        const heroCarouselState = {
          currentSlide: 0,
          isTransitioning: false,
          isPaused: false,
          pauseTimeout: null,
          isUserInteracting: false,
          lastInteractionTime: 0,
          touchStartX: 0,
          touchStartY: 0,
          isHorizontalSwipe: false,
          scrollSyncEnabled: false
        };
        
        function pauseAutoRotation(duration = 8000) {
          heroCarouselState.isPaused = true;
          if (heroCarouselInterval) {
            clearInterval(heroCarouselInterval);
            heroCarouselInterval = null;
          }
          
          if (heroCarouselState.pauseTimeout) {
            clearTimeout(heroCarouselState.pauseTimeout);
            heroCarouselState.pauseTimeout = null;
          }
          
          if (duration === 0) {
            resumeAutoRotation();
            return;
          }
          
          heroCarouselState.pauseTimeout = setTimeout(() => {
            resumeAutoRotation();
          }, duration);
          
          dbg(`Hero auto-rotation paused for ${duration}ms`);
        }
        
        function resumeAutoRotation() {
          if (heroCarouselState.isPaused) {
            heroCarouselState.isPaused = false;
            if (heroCarouselState.pauseTimeout) {
              clearTimeout(heroCarouselState.pauseTimeout);
              heroCarouselState.pauseTimeout = null;
            }
            
            heroCarouselInterval = setInterval(rotateHero, 3000);
            dbg('Hero auto-rotation resumed');
          }
        }
        
        function handlePlatformInteraction(type, navigationCallback, platform = 'desktop') {
          if (heroCarouselState.isTransitioning) {
            dbg(`${type} navigation blocked - transition in progress (${platform})`);
            return;
          }
          
          const now = Date.now();
          heroCarouselState.lastInteractionTime = now;
          heroCarouselState.isUserInteracting = true;
          heroCarouselState.isTransitioning = true;
          
          const pauseDurations = {
            desktop: 8000,
            ios: 4000,
            android: 5000,
            mobile: 4000
          };
          
          const pauseDuration = pauseDurations[platform] || pauseDurations.desktop;
          
          if (heroCarouselInterval) {
            clearInterval(heroCarouselInterval);
            heroCarouselInterval = null;
          }
          
          navigationCallback();
          
          const transitionDuration = deviceInfo.isIOS ? 600 : 500;
          setTimeout(() => {
            heroCarouselState.isTransitioning = false;
          }, transitionDuration);
          
          if (heroCarouselState.pauseTimeout) {
            clearTimeout(heroCarouselState.pauseTimeout);
          }
          
          heroCarouselState.pauseTimeout = setTimeout(() => {
            if (Date.now() - heroCarouselState.lastInteractionTime >= pauseDuration) {
              heroCarouselState.isUserInteracting = false;
              resumeAutoRotation();
            }
          }, pauseDuration);
          
          dbg(`${type} navigation executed (${platform}) - auto-rotation paused for ${pauseDuration}ms`);
        }
        
        function goToSlide(slideIndex, userTriggered = false) {
          heroCarouselState.currentSlide = slideIndex;
          
          if (deviceInfo.isMobile) {
            const slideWidth = carouselTrack.offsetWidth;
            
            const scrollOptions = {
              left: heroCarouselState.currentSlide * slideWidth,
              behavior: 'smooth'
            };
            
            if (deviceInfo.isIOS) {
              carouselTrack.style.webkitOverflowScrolling = 'touch';
            }
            
            carouselTrack.scrollTo(scrollOptions);
            
            if (deviceInfo.isAndroid) {
              setTimeout(() => {
                const actualScrollLeft = carouselTrack.scrollLeft;
                const expectedScrollLeft = heroCarouselState.currentSlide * slideWidth;
                if (Math.abs(actualScrollLeft - expectedScrollLeft) > 10) {
                  carouselTrack.scrollLeft = expectedScrollLeft;
                  dbg('Android scroll position corrected');
                }
              }, 100);
            }
          } else {
            const offset = -heroCarouselState.currentSlide * 100;
            carouselTrack.style.transform = `translateX(${offset}%)`;
          }
          
          updateHeroDots(heroCarouselState.currentSlide);
          
          if (userTriggered) {
            dbg(`Manual navigation to slide ${heroCarouselState.currentSlide + 1} on ${deviceInfo.isIOS ? 'iOS' : deviceInfo.isAndroid ? 'Android' : 'Desktop'}`);
          } else {
            dbg(`Auto-rotation to slide ${heroCarouselState.currentSlide + 1} on ${deviceInfo.isIOS ? 'iOS' : deviceInfo.isAndroid ? 'Android' : 'Desktop'}`);
          }
        }
        
        // BUG FIX #7: Properly re-get elements after potential cloning
        const newPrevBtn = prevBtn || $('#prevBtn');
        const newNextBtn = nextBtn || $('#nextBtn');
        const newDots = dots.length > 0 ? dots : $$('[data-dot]');
        
        newPrevBtn?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          handlePlatformInteraction('Previous', () => {
            const newSlide = heroCarouselState.currentSlide > 0 
              ? heroCarouselState.currentSlide - 1 
              : slides.length - 1;
            goToSlide(newSlide, true);
            
            trackEvent('carousel_slide_view', {
              carousel_name: 'hero',
              slide_index: newSlide,
              slide_name: `slide_${newSlide + 1}`,
              interaction_type: 'previous_button',
              device_type: isMobile() ? 'mobile' : 'desktop'
            });
          }, 'desktop');
        });
        
        newNextBtn?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          handlePlatformInteraction('Next', () => {
            const newSlide = heroCarouselState.currentSlide < slides.length - 1 
              ? heroCarouselState.currentSlide + 1 
              : 0;
            goToSlide(newSlide, true);
            
            trackEvent('carousel_slide_view', {
              carousel_name: 'hero',
              slide_index: newSlide,
              slide_name: `slide_${newSlide + 1}`,
              interaction_type: 'next_button',
              device_type: isMobile() ? 'mobile' : 'desktop'
            });
          }, 'desktop');
        });
        
        newDots.forEach((dot, index) => {
          dot.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            handlePlatformInteraction(`Dot-${index}`, () => {
              goToSlide(index, true);
              
              trackEvent('carousel_slide_view', {
                carousel_name: 'hero',
                slide_index: index,
                slide_name: `slide_${index + 1}`,
                interaction_type: 'dot_navigation',
                device_type: isMobile() ? 'mobile' : 'desktop'
              });
            }, 'desktop');
          });
        });
        
        function rotateHero() {
          if (!heroCarouselState.isPaused && !heroCarouselState.isUserInteracting && heroCarouselInterval) {
            const newSlide = (heroCarouselState.currentSlide + 1) % slides.length;
            goToSlide(newSlide, false);
          } else {
            dbg('Auto-rotation skipped - paused, user interacting, or interval cleared');
          }
        }
        
        heroCarouselInterval = setInterval(rotateHero, 3000);
        dbg('Hero carousel auto-rotation started');
        
        if (isMobile() && carouselTrack) {
          let touchDebounceTimer = null;
          let touchStartX = 0;
          let touchStartY = 0;
          let touchStartTime = 0;
          
          carouselTrack.addEventListener('touchstart', (e) => {
            if (touchDebounceTimer) {
              clearTimeout(touchDebounceTimer);
              touchDebounceTimer = null;
            }
            
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchStartTime = Date.now();
            
            const platform = deviceInfo.isIOS ? 'ios' : 'android';
            handlePlatformInteraction('TouchStart', () => {}, platform);
          }, { passive: true });
          
          carouselTrack.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            const deltaX = Math.abs(touch.clientX - touchStartX);
            const deltaY = Math.abs(touch.clientY - touchStartY);
            
            if (deltaX > deltaY && deltaX > 10) {
              const platform = deviceInfo.isIOS ? 'ios' : 'android';
              handlePlatformInteraction('TouchSwipe', () => {}, platform);
            }
          }, { passive: true });
          
          carouselTrack.addEventListener('touchend', () => {
            const platform = deviceInfo.isIOS ? 'ios' : 'android';
            const resumeDelay = platform === 'ios' ? 3500 : 3000;
            
            touchDebounceTimer = setTimeout(() => {
              if (Date.now() - heroCarouselState.lastInteractionTime >= resumeDelay) {
                heroCarouselState.isUserInteracting = false;
                pauseAutoRotation(0);
                dbg(`Touch interaction ended - auto-rotation resumed via ${platform} platform`);
              }
            }, resumeDelay);
          }, { passive: true });
          
          carouselTrack.addEventListener('touchcancel', () => {
            const platform = deviceInfo.isIOS ? 'ios' : 'android';
            dbg(`Touch cancelled on ${platform} platform`);
            
            heroCarouselState.isUserInteracting = false;
            if (touchDebounceTimer) {
              clearTimeout(touchDebounceTimer);
              touchDebounceTimer = null;
            }
          }, { passive: true });
          
          let scrollSyncTimeout;
          
          carouselTrack.addEventListener('scroll', function() {
            clearTimeout(scrollSyncTimeout);
            
            if (heroCarouselState.isUserInteracting || heroCarouselState.isTransitioning) {
              return;
            }
            
            scrollSyncTimeout = setTimeout(() => {
              const slideWidth = carouselTrack.offsetWidth;
              const scrollLeft = carouselTrack.scrollLeft;
              const calculatedSlide = Math.round(scrollLeft / slideWidth);
              
              // BUG FIX #8: Use totalSlides instead of undefined variable
              if (calculatedSlide !== heroCarouselState.currentSlide && calculatedSlide >= 0 && calculatedSlide < totalSlides) {
                heroCarouselState.currentSlide = calculatedSlide;
                updateHeroDots(heroCarouselState.currentSlide);
                dbg(`Mobile scroll sync: Updated to slide ${heroCarouselState.currentSlide + 1}`);
              }
            }, 100);
          }, { passive: true });
        }
      }
    }
  }

  function setupComingSoonAutoRotation() {
    const comingTrack = $('#comingTrack');
    
    if (comingSoonInterval) {
      clearInterval(comingSoonInterval);
      comingSoonInterval = null;
    }

    if (comingTrack) {
      const slides = comingTrack.children;
      const dots = $$('[data-cdot]');
      
      if (slides.length > 1) {
        let currentSlide = 0;
        
        function showSlide(index) {
          currentSlide = index;
          
          if (isMobile()) {
            const slideWidth = comingTrack.offsetWidth;
            comingTrack.scrollTo({
              left: currentSlide * slideWidth,
              behavior: 'smooth'
            });
          } else {
            const offset = -currentSlide * 100;
            comingTrack.style.transform = `translateX(${offset}%)`;
          }
          
          dots.forEach((dot, index) => {
            if (index === currentSlide) {
              dot.className = 'dot bg-white/80';
            } else {
              dot.className = 'dot bg-white/40';
            }
          });
          
          dbg(`Coming Soon carousel moved to slide ${currentSlide + 1}`);
        }
        
        function rotateComingSoon() {
          dbg('rotateComingSoon called - current slide:', currentSlide);
          const nextSlide = (currentSlide + 1) % slides.length;
          showSlide(nextSlide);
        }

        dots.forEach((dot, index) => {
          dot.addEventListener('click', () => {
            if (comingSoonInterval) {
              clearInterval(comingSoonInterval);
              comingSoonInterval = null;
            }
            
            showSlide(index);
            
            setTimeout(() => {
              comingSoonInterval = setInterval(rotateComingSoon, 3000);
            }, 5000);
          });
        });

        comingSoonInterval = setInterval(rotateComingSoon, 3000);
        dbg('Coming Soon carousel auto-rotation started with', slides.length, 'slides');
        dbg('Coming Soon interval ID:', comingSoonInterval);
        
        // iOS touch support for blog carousel links
        setupBlogCarouselTouchSupport();
      } else {
        dbg('Coming Soon carousel: Not enough slides for auto-rotation');
      }
    } else {
      dbg('Coming Soon carousel: comingTrack not found');
    }
  }
  
  // iOS touch support for blog carousel - ensures links work properly on iOS
  function setupBlogCarouselTouchSupport() {
    const blogLinks = document.querySelectorAll('.coming-soon-carousel a[href="blog.html"]');
    
    if (!blogLinks.length) {
      dbg('Blog carousel: No blog links found');
      return;
    }
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    blogLinks.forEach((link, index) => {
      // Add touch class on touchstart for iOS hover effect
      link.addEventListener('touchstart', function(e) {
        this.classList.add('touch-active');
        dbg(`Blog link ${index + 1}: touchstart`);
      }, { passive: true });
      
      link.addEventListener('touchend', function(e) {
        const wasActive = this.classList.contains('touch-active');
        this.classList.remove('touch-active');
        
        // On iOS, ensure the click goes through
        if (isIOS && wasActive) {
          dbg(`Blog link ${index + 1}: touchend on iOS, navigating to blog.html`);
          // Small delay to show the hover effect before navigation
          setTimeout(() => {
            window.location.href = this.getAttribute('href');
          }, 100);
        }
      }, { passive: true });
      
      link.addEventListener('touchcancel', function() {
        this.classList.remove('touch-active');
      }, { passive: true });
      
      // Ensure click works on all devices
      link.addEventListener('click', function(e) {
        dbg(`Blog link ${index + 1}: click event`);
        // Don't prevent default - let the link work naturally
      });
    });
    
    dbg(`Blog carousel: Touch support enabled for ${blogLinks.length} links, iOS=${isIOS}`);
  }

  function pauseProductRowRotation(rowId) {
    dbg(`Product row "${rowId}" manual scroll only - no auto-rotation to pause`);
  }

  function resumeProductRowRotation(rowId) {
    dbg(`Product row "${rowId}" manual scroll only - no auto-rotation to resume`);
  }

  $$('[data-row]').forEach(row => {
    dbg(`Product row "${row.getAttribute('data-row')}" set to manual scroll only`);
  });

  // Product Image Rotation
  document.addEventListener('DOMContentLoaded', function() {
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      const domReadyTime = timing.domContentLoadedEventEnd - timing.navigationStart;
      
      trackEvent('page_load_time', {
        load_time: loadTime,
        dom_ready_time: domReadyTime,
        device_type: isMobile() ? 'mobile' : 'desktop',
        connection_type: navigator.connection?.effectiveType || 'unknown'
      });
    }
    
    dbg(`Device detection: Mobile=${isMobile()}, Desktop=${isDesktop()}, Screen=${window.innerWidth}px`);
    
    updateQuoteFormIndicator();

    const faqButtons = document.querySelectorAll('.faq-q');
    
    faqButtons.forEach(button => {
      button.addEventListener('click', function() {
        const questionId = this.getAttribute('data-id');
        const answerId = `faq-a-${questionId}`;
        const answerElement = document.getElementById(answerId);
        const arrow = this.querySelector('span:last-child');
        
        if (!answerElement) return;
        
        const isExpanded = this.getAttribute('aria-expanded') === 'true';
        
        if (isExpanded) {
          answerElement.classList.remove('expanded');
          this.setAttribute('aria-expanded', 'false');
          
          setTimeout(() => {
            answerElement.classList.add('hidden');
          }, 400);
          
          trackEvent('faq_collapse', {
            question_id: questionId,
            question_text: this.querySelector('span:first-child')?.textContent?.trim()
          });
          
        } else {
          answerElement.classList.remove('hidden');
          this.setAttribute('aria-expanded', 'true');
          
          answerElement.offsetHeight;
          answerElement.classList.add('expanded');
          
          trackEvent('faq_expand', {
            question_id: questionId,
            question_text: this.querySelector('span:first-child')?.textContent?.trim()
          });
        }
        
        dbg(`FAQ ${questionId} ${isExpanded ? 'collapsed' : 'expanded'}`);
      });
    });
    
    dbg('FAQ functionality initialized for', faqButtons.length, 'questions');

    document.addEventListener('click', function(e) {
      if (e.target.closest('.btn-see-products')) {
        e.preventDefault();
        
        trackEvent('navigation_click', {
          link_text: 'See Products',
          source: 'hero_carousel',
          destination: 'products_section',
          device_type: isMobile() ? 'mobile' : 'desktop'
        });
        
        const tshirtsSection = document.getElementById('tshirts');
        if (tshirtsSection) {
          tshirtsSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        showDevelopmentMessage();
      }
      
      if (e.target.closest('.nav-products-link')) {
        e.preventDefault();
        
        trackEvent('navigation_click', {
          link_text: 'Products',
          source: 'header_navigation',
          destination: 'products_section',
          device_type: isMobile() ? 'mobile' : 'desktop'
        });
        
        const tshirtsSection = document.getElementById('tshirts');
        if (tshirtsSection) {
          tshirtsSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        showDevelopmentMessage();
      }
    });
    
    setupHeroAutoRotation();
    setupComingSoonAutoRotation();
    
    if (isDesktop()) {
      const productCards = document.querySelectorAll('.product-card');
      
      productCards.forEach((card, index) => {
        const frames = card.querySelectorAll('img[data-frame]');
        const pid = card.getAttribute('data-product-id') || `card-${index}`;
        
        if (frames.length < 2) return;
        
        const container = frames[0].parentElement;
        if (container) {
          container.style.position = 'relative';
        }
        
        frames.forEach((frame, i) => {
          frame.style.position = 'absolute';
          frame.style.top = '0';
          frame.style.left = '0';
          frame.style.width = '100%';
          frame.style.height = '100%';
          frame.style.objectFit = 'cover';
          frame.style.transition = 'opacity 0.4s ease-in-out';
          frame.style.opacity = i === 0 ? '1' : '0';
          frame.style.zIndex = i === 0 ? '2' : '1';
        });
        
        let currentFrame = 0;
        let rotationTimer = null;
        
        const showFrame = (frameIndex) => {
          frames.forEach((frame, i) => {
            frame.style.opacity = i === frameIndex ? '1' : '0';
            frame.style.zIndex = i === frameIndex ? '2' : '1';
          });
        };
        
        card.addEventListener('mouseenter', () => {
          if (rotationTimer) clearInterval(rotationTimer);
          
          currentFrame = 1;
          showFrame(currentFrame);
          
          rotationTimer = setInterval(() => {
            currentFrame = (currentFrame + 1) % frames.length;
            showFrame(currentFrame);
          }, 1200);
        });
        
        card.addEventListener('mouseleave', () => {
          if (rotationTimer) {
            clearInterval(rotationTimer);
            rotationTimer = null;
          }
          currentFrame = 0;
          showFrame(0);
        });
      });
      
      dbg('Desktop hover rotation initialized for', productCards.length, 'cards');
    }
    
    if (isMobile()) {
      const modal = document.getElementById('imgModal');
      const rail = modal?.querySelector('[data-track]');
      const dotsWrap = document.getElementById('imgModalDots');
      const closeBtn = document.getElementById('imgModalClose');
      
      if (!modal || !rail) return;
      
      let currentIndex = 0;
      let images = [];
      
      const showModal = (productImages, pid) => {
        images = productImages;
        currentIndex = 0;
        
        rail.innerHTML = images.map(src => 
          `<div class="flex-none w-full h-full flex items-center justify-center">
             <img src="${src}" alt="${pid}" class="max-w-full max-h-full object-contain" loading="lazy" />
           </div>`
        ).join('');
        
        if (dotsWrap && images.length > 1) {
          dotsWrap.innerHTML = images.map((_, i) => 
            `<span class="dot ${i === 0 ? 'active' : ''}"></span>`
          ).join('');
        }
        
        modal.classList.remove('hidden');
        modal.classList.add('open');
        updateModalView();
      };
      
      const hideModal = () => {
        modal.classList.remove('open');
        modal.classList.add('hidden');
        setTimeout(() => {
          rail.innerHTML = '';
          if (dotsWrap) dotsWrap.innerHTML = '';
        }, 300);
      };
      
      const updateModalView = () => {
        rail.style.transform = `translateX(-${currentIndex * 100}%)`;
        rail.style.transition = 'transform 0.3s ease';
        
        if (dotsWrap) {
          const dots = dotsWrap.querySelectorAll('.dot');
          dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentIndex);
          });
        }
      };
      
      const goToImage = (index) => {
        if (index >= 0 && index < images.length) {
          currentIndex = index;
          updateModalView();
        }
      };
      
      closeBtn?.addEventListener('click', hideModal);
      modal?.querySelector('[data-close]')?.addEventListener('click', hideModal);
      
      document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('open')) return;
        if (e.key === 'Escape') hideModal();
        if (e.key === 'ArrowLeft') goToImage(currentIndex - 1);
        if (e.key === 'ArrowRight') goToImage(currentIndex + 1);
      });
      
      let startX = 0;
      let currentX = 0;
      let isDragging = false;
      
      rail.addEventListener('touchstart', (e) => {
        if (images.length <= 1) return;
        startX = e.touches[0].clientX;
        currentX = startX;
        isDragging = true;
        rail.style.transition = 'none';
      }, { passive: true });
      
      rail.addEventListener('touchmove', (e) => {
        if (!isDragging || images.length <= 1) return;
        
        currentX = e.touches[0].clientX;
        const deltaX = currentX - startX;
        const offset = -currentIndex * 100 + (deltaX / rail.offsetWidth) * 100;
        rail.style.transform = `translateX(${offset}%)`;
      }, { passive: true });
      
      rail.addEventListener('touchend', () => {
        if (!isDragging || images.length <= 1) return;
        
        isDragging = false;
        const deltaX = currentX - startX;
        const threshold = 50;
        
        if (Math.abs(deltaX) > threshold) {
          if (deltaX > 0 && currentIndex > 0) {
            goToImage(currentIndex - 1);
          } else if (deltaX < 0 && currentIndex < images.length - 1) {
            goToImage(currentIndex + 1);
          } else {
            updateModalView();
          }
        } else {
          updateModalView();
        }
      }, { passive: true });
      
      const productCards = document.querySelectorAll('.product-card');
      
      productCards.forEach((card, index) => {
        const frames = card.querySelectorAll('img[data-frame]');
        const pid = card.getAttribute('data-product-id') || `card-${index}`;
        
        if (frames.length < 2) return;
        
        const imageSources = Array.from(frames).map(img => img.src);
        
        card.addEventListener('click', (e) => {
          if (e.target.closest('.quote-btn')) return;
          
          e.preventDefault();
          e.stopPropagation();
          showModal(imageSources, pid);
        });
      });
      
      dbg('Mobile modal initialized for', productCards.length, 'cards');
    }
  });

  // BUG FIX #9: Cleanup on window resize
  let resizeTimeout = null;
  window.addEventListener('resize', () => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    
    resizeTimeout = setTimeout(() => {
      if (heroCarouselInterval) {
        clearInterval(heroCarouselInterval);
        heroCarouselInterval = null;
      }
      
      if (comingSoonInterval) {
        clearInterval(comingSoonInterval);
        comingSoonInterval = null;
      }
      
      productRowsIntervals.forEach((interval, rowId) => {
        clearInterval(interval);
      });
      productRowsIntervals.clear();
      
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isMobileScreen = window.innerWidth <= 768;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const currentIsMobile = isMobileUserAgent || (isMobileScreen && isTouchDevice);
      
      dbg(`Device detection after resize: Mobile=${currentIsMobile}, Screen=${window.innerWidth}px`);
      
      setupHeroAutoRotation();
      setupComingSoonAutoRotation();
    }, 250);
  });

  let maxScrollDepth = 0;
  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollPercent = Math.round((scrollTop / (documentHeight - windowHeight)) * 100);
    
    const milestones = [25, 50, 75, 90, 100];
    milestones.forEach(milestone => {
      if (scrollPercent >= milestone && maxScrollDepth < milestone) {
        maxScrollDepth = milestone;
        trackEvent('scroll_depth', {
          percent_scrolled: milestone,
          device_type: isMobile() ? 'mobile' : 'desktop'
        });
      }
    });
  });

  window.showCatalogMessage = function() {
    const message = "🚀 Full catalogue coming soon! Our product page will be available shortly with complete details. For now, use the quote form to get pricing for any design you have in mind!";
    
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md text-center';
    toast.style.animation = 'slideInFromTop 0.3s ease-out';
    toast.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-sm">${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">✕</button>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = 'slideOutToTop 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
      }
    }, 6000);
  };

})();