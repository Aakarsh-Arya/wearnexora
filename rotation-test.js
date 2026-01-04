// NEXORA - Fixed Product Rotation
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Product Rotation - Starting...');
  
  // Device detection
  const isMobile = window.innerWidth < 768;
  console.log(`📱 Device: ${isMobile ? 'Mobile' : 'Desktop'} (${window.innerWidth}px)`);
  
  if (isMobile) {
    console.log('📱 Mobile detected - Setting up modal functionality');
    setupMobileModal();
    return;
  }
  
  // Find product cards
  const productCards = document.querySelectorAll('.product-card');
  console.log(`🎯 Found ${productCards.length} product cards`);
  
  if (productCards.length === 0) {
    console.warn('❌ No product cards found');
    return;
  }
  
  // Setup rotation for each card
  productCards.forEach((card, index) => {
    const frames = card.querySelectorAll('img[data-frame]');
    const productId = card.getAttribute('data-product-id') || `card-${index}`;
    
    if (frames.length < 2) {
      console.log(`⏭️ ${productId}: Only ${frames.length} frame(s) - no rotation`);
      return;
    }
    
    console.log(`✅ ${productId}: Setting up rotation for ${frames.length} frames`);
    
    // Setup frame container
    const container = frames[0].parentElement;
    if (container) {
      container.style.position = 'relative';
      container.style.overflow = 'hidden';
    }
    
    // Position all frames
    frames.forEach((frame, i) => {
      frame.style.position = 'absolute';
      frame.style.top = '0';
      frame.style.left = '0';
      frame.style.width = '100%';
      frame.style.height = '100%';
      frame.style.objectFit = 'cover';
      frame.style.transition = 'opacity 0.4s ease-in-out';
      frame.style.background = 'white';
      
      // Show only first frame initially
      if (i === 0) {
        frame.style.opacity = '1';
        frame.style.zIndex = '2';
      } else {
        frame.style.opacity = '0';
        frame.style.zIndex = '1';
      }
    });
    
    let currentFrame = 0;
    let rotationTimer = null;
    
    // Function to show specific frame
    const showFrame = (frameIndex) => {
      frames.forEach((frame, i) => {
        if (i === frameIndex) {
          frame.style.opacity = '1';
          frame.style.zIndex = '2';
        } else {
          frame.style.opacity = '0';
          frame.style.zIndex = '1';
        }
      });
    };
    
    // Mouse enter - start rotation
    card.addEventListener('mouseenter', () => {
      console.log(`🎬 ${productId}: Starting rotation`);
      
      // Clear any existing timer
      if (rotationTimer) {
        clearInterval(rotationTimer);
        rotationTimer = null;
      }
      
      // Start with second frame
      currentFrame = 1;
      showFrame(currentFrame);
      
      // Set up rotation timer
      rotationTimer = setInterval(() => {
        currentFrame = (currentFrame + 1) % frames.length;
        showFrame(currentFrame);
        console.log(`🖼️ ${productId}: Frame ${currentFrame}/${frames.length-1}`);
      }, 1200); // Slower rotation for smoother experience
    });
    
    // Mouse leave - stop rotation and return to first frame
    card.addEventListener('mouseleave', () => {
      console.log(`⏹️ ${productId}: Stopping rotation`);
      
      // Clear timer
      if (rotationTimer) {
        clearInterval(rotationTimer);
        rotationTimer = null;
      }
      
      // Return to first frame
      currentFrame = 0;
      showFrame(0);
    });
    
    console.log(`🎉 ${productId}: Rotation ready!`);
  });
  
  console.log('✅ Product rotation setup complete!');
});

// Mobile Modal Functionality
function setupMobileModal() {
  console.log('📱 Setting up mobile modal...');
  
  // Find the modal elements
  const modal = document.getElementById('imgModal');
  const rail = modal?.querySelector('[data-track]');
  const dotsWrap = document.getElementById('imgModalDots');
  const closeBtn = document.getElementById('imgModalClose');
  
  if (!modal || !rail) {
    console.warn('❌ Modal elements not found');
    return;
  }
  
  let currentIndex = 0;
  let images = [];
  let productId = '';
  
  // Modal control functions
  const showModal = (productImages, pid) => {
    images = productImages;
    productId = pid;
    currentIndex = 0;
    
    console.log(`📱 Opening modal for ${pid} with ${images.length} images`);
    
    // Populate rail with images
    rail.innerHTML = images.map(src => 
      `<div class="flex-none w-full h-full flex items-center justify-center">
         <img src="${src}" alt="${pid}" class="max-w-full max-h-full object-contain" loading="lazy" />
       </div>`
    ).join('');
    
    // Setup dots
    if (dotsWrap && images.length > 1) {
      dotsWrap.innerHTML = images.map((_, i) => 
        `<span class="dot ${i === 0 ? 'active' : ''}"></span>`
      ).join('');
    }
    
    // Show modal
    modal.classList.add('open');
    updateModalView();
  };
  
  const hideModal = () => {
    console.log('📱 Closing modal');
    modal.classList.remove('open');
    setTimeout(() => {
      rail.innerHTML = '';
      if (dotsWrap) dotsWrap.innerHTML = '';
    }, 300);
  };
  
  const updateModalView = () => {
    // Update rail position
    rail.style.transform = `translateX(-${currentIndex * 100}%)`;
    rail.style.transition = 'transform 0.3s ease';
    
    // Update dots
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
  
  // Close modal events
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
    const threshold = 50; // Minimum swipe distance
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && currentIndex > 0) {
        goToImage(currentIndex - 1); // Swipe right = previous
      } else if (deltaX < 0 && currentIndex < images.length - 1) {
        goToImage(currentIndex + 1); // Swipe left = next
      } else {
        updateModalView(); // Snap back
      }
    } else {
      updateModalView(); // Snap back
    }
  }, { passive: true });
  
  // Setup tap events on product cards
  const productCards = document.querySelectorAll('.product-card');
  console.log(`📱 Setting up tap events for ${productCards.length} cards`);
  
  productCards.forEach((card, index) => {
    const frames = card.querySelectorAll('img[data-frame]');
    const pid = card.getAttribute('data-product-id') || `card-${index}`;
    
    if (frames.length < 2) {
      console.log(`⏭️ ${pid}: Single image - no modal needed`);
      return;
    }
    
    const imageSources = Array.from(frames).map(img => img.src);
    console.log(`✅ ${pid}: Modal ready for ${imageSources.length} images`);
    
    card.addEventListener('click', (e) => {
      // Don't open modal if clicking on quote button
      if (e.target.closest('.quote-btn')) return;
      
      e.preventDefault();
      e.stopPropagation();
      showModal(imageSources, pid);
    });
  });
  
  console.log('✅ Mobile modal setup complete!');
}

// Quote System - Essential functionality
document.addEventListener('DOMContentLoaded', function() {
  // Quote buttons functionality
  const quoteButtons = document.querySelectorAll('.quote-btn');
  console.log(`💼 Found ${quoteButtons.length} quote buttons`);
  
  quoteButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const productName = this.getAttribute('data-name') || 'Product';
      const productPrice = this.getAttribute('data-price') || 'Price TBD';
      
      console.log(`💼 Quote requested for: ${productName} - ${productPrice}`);
      
      // Simple alert for now - you can enhance this later
      alert(`Quote added: ${productName}\nPrice: ${productPrice}\n\nScroll down to the quote form to submit your request!`);
      
      // Scroll to quote form if it exists
      const quoteForm = document.getElementById('quoteForm');
      if (quoteForm) {
        setTimeout(() => {
          quoteForm.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    });
  });
});
