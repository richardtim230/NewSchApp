<!-- Trigger Modal (auto-open with JS) -->
<div id="welcome-modal" tabindex="-1" aria-hidden="true" class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 flex justify-center items-center w-full md:inset-0 h-[100vh] bg-black/70">
  <div class="relative p-4 w-full max-w-3xl">
    <div class="relative bg-white rounded-lg shadow-lg">

      <!-- Hero Section Inside Modal -->
      <div class="relative h-96 flex items-center justify-center rounded-lg overflow-hidden"
           style="background-image: url('https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1600&q=80'); background-size: cover; background-position: center;">
        <div class="absolute inset-0 bg-black/60"></div>

        <!-- Content -->
        <div class="relative z-10 text-center px-6">
          <h2 class="text-3xl md:text-4xl font-extrabold text-white mb-4">CLEO'S WELCOME MESSAGE</h2>
          <p class="text-gray-200 max-w-xl mx-auto text-lg mb-6">
            Hey there, brilliant minds! 🌟  
            Welcome to your campus marketplace where deals meet dreams.  
            Shop smarter, sell faster, and connect with your fellow students.  
            This is more than a marketplace — it’s your community hub.  
          </p>
          <a href="/categories" class="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg text-lg font-semibold shadow-md hover:bg-indigo-700 transition">
            CLICK HERE
          </a>
        </div>
      </div>

    </div>
  </div>
</div>

<!-- Flowbite Script -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/flowbite/2.5.1/flowbite.min.js"></script>

<!-- Auto Show Modal on Page Load -->
<script>
  window.addEventListener('load', () => {
    const modal = document.getElementById('welcome-modal');
    if(modal){
      modal.classList.remove('hidden');
    }
  });
</script>
