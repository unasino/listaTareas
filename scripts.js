document.addEventListener('DOMContentLoaded', () => {
  const endpoint = 'https://sheetdb.io/api/v1/yggxt7by6e4dv';
  const imgbbApiKey = '372dd6dc556299357a3f928d1c8b053f';

  const taskForm = document.getElementById('task-form');
  const taskList = document.getElementById('task-list');
  const modal = document.getElementById('taskModal');
  const detailModal = document.getElementById('taskDetailModal');
  const openModalBtn = document.getElementById('open-modal-btn');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const closeDetailModalBtn = document.getElementById('close-detail-modal-btn');
  const loading = document.getElementById('loading');
  const alertContainer = document.getElementById('alert-container');
  const detailTitle = document.getElementById('detail-title');
  const detailDate = document.getElementById('detail-date');
  const detailStatus = document.getElementById('detail-status');
  const detailImage = document.getElementById('detail-image');
  const detailDescription = document.getElementById('detail-description');
  const imageErrorDetail = document.getElementById('image-error-detail');

  let tasks = [];
  let isEditing = false;
  let currentTaskId = null;

  // Función para abrir/cerrar modal
  const toggleModal = (modalElement, show) => {
    modalElement.style.display = show ? 'block' : 'none';
    modalElement.setAttribute('aria-hidden', !show);
  };

  const toggleLoading = (show) => (loading.style.display = show ? 'flex' : 'none');

  const showAlert = (message, type) => {
    alertContainer.innerHTML = `
      <div class="alert alert-${type}">
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i> ${message}
      </div>
    `;
    setTimeout(() => (alertContainer.innerHTML = ''), 5000);
  };

  const calcularDiasRestantes = (fechaFin) => {
    const hoy = new Date().setHours(0, 0, 0, 0);
    const fechaFinDate = new Date(fechaFin).setHours(0, 0, 0, 0);
    return Math.ceil((fechaFinDate - hoy) / (1000 * 60 * 60 * 24));
  };

  // Función para formatear la descripción
  const formatDescription = (text) => {
      // Convertir enlaces en HTML
      text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
  
      // Convertir líneas que comiencen con "- " o "* " en listas
      text = text.replace(/^- (.+)/gm, '<li>$1</li>');
      text = text.replace(/^\* (.+)/gm, '<li>$1</li>');
      text = text.replace(/(<li>.*<\/li>)/gms, '<ul>$1</ul>');
  
      // Convertir texto en negrita (**texto**)
      text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
      // Convertir texto en cursiva (*texto*)
      text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
      return text;
  };
  

  const renderTasks = () => {
    taskList.innerHTML = '';
    tasks.sort((a, b) => calcularDiasRestantes(a.fecha_fin) - calcularDiasRestantes(b.fecha_fin));

    tasks.forEach((task) => {
      const diasRestantes = calcularDiasRestantes(task.fecha_fin);
      const statusText =
        diasRestantes > 1 ? `Faltan ${diasRestantes} días` :
        diasRestantes === 1 ? 'Vence mañana' :
        diasRestantes === 0 ? 'Vence hoy' : 'Vencida';

      const li = document.createElement('li');
      li.dataset.id = task.id;
      li.tabIndex = 0;
      li.innerHTML = `
        <div>
          <strong>${task.tarea}</strong><br>
          <small>${new Date(task.fecha_fin).toLocaleString()}</small>
        </div>
        <div>
          <span class="status-text ${diasRestantes < 5 ? 'status-danger' : ''}">${statusText}</span>
          <button class="btn btn-primary edit-btn">Editar</button>
          <button class="btn btn-danger delete-btn">Eliminar</button>
        </div>
      `;
      taskList.appendChild(li);
    });
  };

  const loadTasks = async () => {
    try {
      toggleLoading(true);
      const response = await fetch(endpoint);
      tasks = await response.json();
      renderTasks();
    } catch {
      showAlert('Error al cargar tareas', 'error');
    } finally {
      toggleLoading(false);
    }
  };

  const deleteTask = async (taskId) => {
    if (!confirm('¿Eliminar esta tarea?')) return;
    try {
      toggleLoading(true);
      await fetch(`${endpoint}/id/${taskId}`, { method: 'DELETE' });
      showAlert('Tarea eliminada', 'success');
      await loadTasks();
    } catch {
      showAlert('Error al eliminar tarea', 'error');
    } finally {
      toggleLoading(false);
    }
  };

  const showTaskDetails = (taskId) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
  
    detailTitle.textContent = task.tarea;
    detailDate.textContent = `Fecha de vencimiento: ${new Date(task.fecha_fin).toLocaleString()}`;
    detailStatus.textContent = `Estado: ${calcularDiasRestantes(task.fecha_fin) < 0 ? 'Vencida' : 'Pendiente'}`;
  
    // Añadir un contenedor para la descripción con un delimitador
    detailDescription.innerHTML = `
      <div class="description-container">
        <h3>Descripción</h3>
        <div class="description-content">
          ${formatDescription(task.descripcion || 'No hay descripción disponible.')}
        </div>
      </div>
    `;
  
    detailImage.src = task.imagen_url || '';
    detailImage.style.display = task.imagen_url ? 'block' : 'none';
  
    toggleModal(detailModal, true);
  };
  

  const uploadImage = async (imageFile) => {
    if (!imageFile) return '';
    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      return data.success ? data.data.url : '';
    } catch {
      showAlert('Error al subir imagen', 'error');
      return '';
    }
  };

  // Abrir el modal de agregar tarea
  openModalBtn.addEventListener('click', () => {
    isEditing = false;
    toggleModal(modal, true);
  });

  // Cerrar modales al hacer clic en el botón de cerrar
  closeModalBtn.addEventListener('click', () => toggleModal(modal, false));
  closeDetailModalBtn.addEventListener('click', () => toggleModal(detailModal, false));

  // Cerrar modales al hacer clic fuera del contenido o presionar "Escape"
  window.addEventListener('click', (event) => {
    if (event.target === modal) toggleModal(modal, false);
    if (event.target === detailModal) toggleModal(detailModal, false);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      toggleModal(modal, false);
      toggleModal(detailModal, false);
    }
  });

  // Manejo del formulario para agregar y editar tareas
  taskForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const tareaValue = taskForm.tarea.value.trim();
    const fechaFinValue = taskForm.fechaFin.value;
    const descripcionValue = taskForm.descripcion.value.trim();
    const imagenFile = document.getElementById('imagenFile').files[0];

    if (!tareaValue || !fechaFinValue) {
      showAlert('Completa todos los campos', 'error');
      return;
    }

    try {
      toggleLoading(true);
      const imagenUrl = await uploadImage(imagenFile);
      const taskData = {
        tarea: tareaValue,
        fecha_fin: fechaFinValue,
        descripcion: descripcionValue,
        imagen_url: imagenUrl,
      };

      if (isEditing) {
        await fetch(`${endpoint}/id/${currentTaskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData),
        });
        showAlert('Tarea actualizada', 'success');
      } else {
        taskData.id = (tasks.length + 1).toString();
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData),
        });
        showAlert('Tarea agregada', 'success');
      }

      taskForm.reset();
      toggleModal(modal, false);
      await loadTasks();
    } catch {
      showAlert('Error al guardar tarea', 'error');
    } finally {
      toggleLoading(false);
      isEditing = false;
      currentTaskId = null;
    }
  });

  // Delegación de eventos para editar/eliminar tareas y abrir detalles
  taskList.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const taskId = li.dataset.id;

    if (e.target.classList.contains('edit-btn')) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        isEditing = true;
        currentTaskId = taskId;
        taskForm.tarea.value = task.tarea;
        taskForm.fechaFin.value = task.fecha_fin;
        taskForm.descripcion.value = task.descripcion || '';
        toggleModal(modal, true);
      }
    } else if (e.target.classList.contains('delete-btn')) {
      deleteTask(taskId);
    } else {
      showTaskDetails(taskId);
    }
  });

  loadTasks();
});
