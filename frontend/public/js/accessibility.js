document.addEventListener('DOMContentLoaded', () => {
  const sliders = document.querySelectorAll('.font-slider-input');
  
  // Cargar preferencia guardada
  const savedSize = localStorage.getItem('saludGoyaFontSize');
  if (savedSize) {
    document.documentElement.style.fontSize = savedSize + 'px';
    sliders.forEach(slider => slider.value = savedSize);
  }

  sliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
      const size = e.target.value;
      document.documentElement.style.fontSize = size + 'px';
      localStorage.setItem('saludGoyaFontSize', size);
      
      // Sincronizar otros sliders si hubiera más de uno
      sliders.forEach(s => {
        if (s !== slider) s.value = size;
      });
    });
  });
});
