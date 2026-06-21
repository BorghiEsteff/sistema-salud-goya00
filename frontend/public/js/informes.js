let chartTurnos = null;
let chartPagos = null;

document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(sessionStorage.getItem('usuario'));
  if (!user || user.rol !== 'admin') return;

  const btnInformes = document.getElementById('nav-informes');
  if(btnInformes) {
    btnInformes.addEventListener('click', (e) => {
      switchTab(e, 'section-informes', cargarInformes);
    });
  }

  const btnFiltrar = document.getElementById('btn-filtrar-informes');
  if(btnFiltrar) {
    btnFiltrar.addEventListener('click', cargarInformes);
  }
});

async function cargarInformes() {
  const desde = document.getElementById('filtro-informes-desde').value;
  const hasta = document.getElementById('filtro-informes-hasta').value;
  
  if (desde && hasta && new Date(desde) > new Date(hasta)) {
    alert("La fecha 'Desde' no puede ser mayor que la fecha 'Hasta'.");
    return;
  }

  let qs = '';
  if (desde) qs += `desde=${desde}&`;
  if (hasta) qs += `hasta=${hasta}`;

  try {
    const [resumen, turnosEstado, pagosDia] = await Promise.all([
      api.get(`/admin/informes/resumen?${qs}`),
      api.get(`/admin/informes/turnos-por-estado?${qs}`),
      api.get(`/admin/informes/pagos?${qs}`)
    ]);

    // Update KPIs
    document.getElementById('kpi-turnos').innerText = resumen.turnos_totales;
    document.getElementById('kpi-recaudacion').innerText = '$' + resumen.recaudacion_total.toFixed(2);
    document.getElementById('kpi-pacientes').innerText = resumen.pacientes_activos;

    renderChartTurnos(turnosEstado);
    renderChartPagos(pagosDia);

  } catch(err) {
    alert('Error cargando informes: ' + err.message);
  }
}

function renderChartTurnos(data) {
  const ctx = document.getElementById('chart-turnos-estado').getContext('2d');
  
  if (chartTurnos) chartTurnos.destroy();

  const labels = data.map(d => d.estado.toUpperCase());
  const values = data.map(d => d.cantidad);

  const colors = labels.map(label => {
    switch(label.toLowerCase()) {
      case 'confirmado': return '#10b981';
      case 'solicitado': return '#eab308';
      case 'cancelado': return '#ef4444';
      case 'ausente': return '#f97316';
      case 'atendido': return '#3b82f6';
      default: return '#64748b';
    }
  });

  chartTurnos = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 1,
        borderColor: '#1e293b'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#f8fafc' } }
      }
    }
  });
}

function renderChartPagos(data) {
  const ctx = document.getElementById('chart-pagos').getContext('2d');
  
  if (chartPagos) chartPagos.destroy();

  const labels = data.map(d => {
    const date = new Date(d.fecha);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date.toLocaleDateString();
  });
  const values = data.map(d => d.total);

  chartPagos = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Recaudación ($)',
        data: values,
        backgroundColor: '#10b981',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}
