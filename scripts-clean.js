// NEXORA - Clean Working Scripts
(() => {
  // Helpers
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const track = (eventName, props = {}) => {
    if (window.NEXORA_DEBUG) console.debug('[analytics]', eventName, props);
  };

  // DEBUG helpers
  const DBG_ON = (localStorage.NEXORA_DEBUG === '1') || !!window.NEXORA_DEBUG;
  const dbg = (...a) => { if (DBG_ON) console.debug('[NEXORA]', ...a); };
  window.addEventListener('error', (e) => console.error('[NEXORA] Uncaught error:', e.message, e.filename+':'+e.lineno));
  window.addEventListener('unhandledrejection', (e) => console.error('[NEXORA] Unhandled promise rejection:', e.reason));
  dbg('scripts.js loaded');

  // Mobile nav
  const menuBtn = $('#menuBtn');
  const mobileNav = $('#mobileNav');
  menuBtn?.addEventListener('click', () => {
    mobileNav?.classList.toggle('hidden');
  });

  // Footer year
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Product rows: Arrow navigation
  $$('.row-prev').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = document.querySelector(`[data-row="${btn.dataset.target}"]`);
      if (!row) return;
      const dx = Math.max(320, row.clientWidth * 0.8);
      row.scrollBy({ left: -dx, behavior: 'smooth' });
    });
  });
  
  $$('.row-next').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = document.querySelector(`[data-row="${btn.dataset.target}"]`);
      if (!row) return;
      const dx = Math.max(320, row.clientWidth * 0.8);
      row.scrollBy({ left: dx, behavior: 'smooth' });
    });
  });

  // Quote form
  const form = document.getElementById('quoteForm');
  const submitBtn = form?.querySelector('button[type="submit"]');
  const status = document.getElementById('quoteStatus');
  const originalBtnText = submitBtn?.textContent || 'Get Quote';

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!submitBtn || !status) return;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    status.textContent = '';
    
    try {
      const fd = new FormData(form);
      if (!fd.get('form-name')) fd.set('form-name', 'quote');
      
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(fd).toString()
      });
      
      if (res.ok) {
        status.innerHTML = '<div class="text-green-600 font-medium">✅ Quote request sent! We\'ll respond within 2 hours.</div>';
        form.reset();
        if (typeof track === 'function') track('quote_submitted');
      } else {
        throw new Error('Network response was not ok');
      }
    } catch (err) {
      console.error('Quote submission error:', err);
      status.innerHTML = '<div class="text-red-600">❌ Error sending quote. Please try WhatsApp instead.</div>';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });

  // Use-case quote buttons
  const ucButtons = document.querySelectorAll('.get-quote-uc');
  ucButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const useCase = btn.getAttribute('data-use-case') || 'Custom';
      
      // Fill form if it exists
      const useCaseInput = document.querySelector('input[name="use_case"], textarea[name="message"]');
      if (useCaseInput) {
        if (useCaseInput.tagName === 'TEXTAREA') {
          useCaseInput.value = `Use case: ${useCase}\n\n`;
        } else {
          useCaseInput.value = useCase;
        }
      }
      
      // Scroll to quote form
      const quoteForm = document.getElementById('quoteForm');
      if (quoteForm) {
        const rect = quoteForm.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
          quoteForm.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  // QUOTE SYSTEM - Product selection with add/remove toggle
  const selectedProducts = new Map();
  
  function updateQuoteButton(btn, isSelected) {
    if (isSelected) {
      btn.textContent = 'Remove from Quote';
      btn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
      btn.classList.add('bg-red-600', 'hover:bg-red-700');
      btn.setAttribute('data-action', 'remove');
    } else {
      btn.textContent = 'Add to Quote';
      btn.classList.remove('bg-red-600', 'hover:bg-red-700');
      btn.classList.add('bg-blue-600', 'hover:bg-blue-700');
      btn.setAttribute('data-action', 'add');
    }
  }

  function updateUI() {
    // Update all quote buttons based on selection state
    $$('.quote-btn').forEach(btn => {
      const productId = btn.getAttribute('data-product');
      const isSelected = selectedProducts.has(productId);
      updateQuoteButton(btn, isSelected);
    });

    // Update quote form with selected products
    const quoteTextarea = $('textarea[name="message"]');
    if (quoteTextarea && selectedProducts.size > 0) {
      const productList = Array.from(selectedProducts.values())
        .map(p => `• ${p.name} - ${p.price}`)
        .join('\n');
      
      quoteTextarea.value = `Selected Products:\n${productList}\n\nAdditional requirements:\n`;
    }
  }

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
    } else {
      selectedProducts.delete(productId);
      dbg('Removed from quote:', productName);
    }

    updateUI();
    
    // Show quote reminder if products selected
    if (selectedProducts.size > 0) {
      const reminder = $('#quoteReminder');
      if (reminder) {
        reminder.style.display = 'block';
        reminder.style.opacity = '1';
        setTimeout(() => {
          reminder.style.opacity = '0';
          setTimeout(() => reminder.style.display = 'none', 300);
        }, 3000);
      }
    }
  });

  // Product Image Rotation
  document.addEventListener('DOMContentLoaded', function() {
    const isMobile = () => window.innerWidth <= 768;
    
    // Desktop hover rotation
    if (!isMobile()) {
      const productCards = document.querySelectorAll('.product-card');
      
      productCards.forEach((card, index) => {
        const frames = card.querySelectorAll('img[data-frame]');
        const pid = card.getAttribute('data-product-id') || `card-${index}`;
        
        if (frames.length < 2) return;
        
        // Setup frame positioning
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
    }
    
    // Mobile modal functionality
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
      
      // Close events
      closeBtn?.addEventListener('click', hideModal);
      modal?.querySelector('[data-close]')?.addEventListener('click', hideModal);
      
      // Keyboard navigation
      document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('open')) return;
        if (e.key === 'Escape') hideModal();
        if (e.key === 'ArrowLeft') goToImage(currentIndex - 1);
        if (e.key === 'ArrowRight') goToImage(currentIndex + 1);
      });
      
      // Touch/swipe handling
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
      
      // Setup tap events on product cards
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
    }
  });

})();
