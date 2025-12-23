document.addEventListener("DOMContentLoaded", async function () {

  // ================= API =================
  // 🔥 PRODUCCIÓN (Render)
  const API_BASE = "https://encuesta-rd-1.onrender.com/api";

  // ================= DATA =================
  let participants = [];
  let positions = [];
  let candidates = [];
  let votes = [];
  let currentParticipantEmail = null;

  // ================= AUTOCOMPLETAR CORREO DESDE LINK =================
  const params = new URLSearchParams(window.location.search);
  const emailFromLink = params.get("email");

  if (emailFromLink) {
    const emailInput = document.getElementById("vote-email-input");
    if (emailInput) emailInput.value = emailFromLink;
  }

  // ================= VIEWS NAV =================
  const navButtons = document.querySelectorAll(".nav-btn");
  const views = document.querySelectorAll(".view-section");

  function showView(viewId) {
    views.forEach(v => v.style.display = v.id === viewId ? "block" : "none");
    navButtons.forEach(btn =>
      btn.classList.toggle("active", btn.dataset.view === viewId.replace("view-", ""))
    );
  }

  navButtons.forEach(btn =>
    btn.addEventListener("click", () =>
      showView("view-" + btn.dataset.view)
    )
  );

  // ================= LOAD DATA =================
  async function loadParticipants() {
    try {
      const res = await fetch(`${API_BASE}/participants`);
      participants = await res.json();
    } catch {
      participants = [];
    }
  }

  async function loadPositions() {
    try {
      const res = await fetch(`${API_BASE}/positions`);
      positions = await res.json();
    } catch {
      positions = [];
    }
  }

  async function loadCandidates() {
    try {
      const res = await fetch(`${API_BASE}/candidates`);
      candidates = await res.json();
    } catch {
      candidates = [];
    }
  }

  async function loadVotes() {
    try {
      const res = await fetch(`${API_BASE}/results`);
      const data = await res.json();
      votes = data.votes || [];
    } catch {
      votes = [];
    }
  }

  async function initData() {
    await Promise.all([
      loadParticipants(),
      loadPositions(),
      loadCandidates(),
      loadVotes()
    ]);
    renderParticipantsTable();
    renderPositionsTable();
    renderCandidatesTable();
    renderResults();
    updateSummaryCounts();
  }

  // ================= PARTICIPANTS =================
  function renderParticipantsTable() {
    const tbody = document.getElementById("participants-table-body");
    if (!tbody) return;

    if (participants.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7">No hay participantes registrados.</td></tr>`;
      return;
    }

    tbody.innerHTML = participants.map(p => `
      <tr>
        <td>${p.email}</td>
        <td>${p.nombre || ""}</td>
        <td>${p.apellido || ""}</td>
        <td>${p.campo1 || ""}</td>
        <td>${p.campo2 || ""}</td>
        <td>${p.campo3 || ""}</td>
        <td>${p.hasVoted ? "Sí" : "No"}</td>
      </tr>
    `).join("");
  }

  function updateSummaryCounts() {
    document.getElementById("summary-total-participants").textContent = participants.length;
    document.getElementById("summary-total-voted").textContent =
      participants.filter(p => p.hasVoted).length;
  }

  document.getElementById("participants-form")?.addEventListener("submit", async e => {
    e.preventDefault();

    const participant = {
      email: participantEmail.value.trim().toLowerCase(),
      nombre: participantNombre.value.trim(),
      apellido: participantApellido.value.trim(),
      campo1: participantCampo1.value.trim(),
      campo2: participantCampo2.value.trim(),
      campo3: participantCampo3.value.trim(),
      hasVoted: false
    };

    const res = await fetch(`${API_BASE}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(participant)
    });

    if (!res.ok) return alert("Error registrando participante");

    participants.push(await res.json());
    renderParticipantsTable();
    updateSummaryCounts();
    e.target.reset();
  });

  // ================= POSITIONS =================
  function renderPositionsTable() {
    const tbody = document.getElementById("questions-table-body");
    if (!tbody) return;

    if (positions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="2">No hay preguntas registradas.</td></tr>`;
      return;
    }

    tbody.innerHTML = positions.map(p => `
      <tr>
        <td>${p.nombre}</td>
        <td>${p.descripcion || ""}</td>
      </tr>
    `).join("");

    renderPositionsSelect();
  }

  function renderPositionsSelect() {
    const select = document.getElementById("option-question-select");
    if (!select) return;

    select.innerHTML = `<option value="">Seleccione una pregunta...</option>` +
      positions.map(p => `<option value="${p.id}">${p.nombre}</option>`).join("");
  }

  document.getElementById("questions-form")?.addEventListener("submit", async e => {
    e.preventDefault();

    const data = {
      nombre: questionText.value.trim(),
      descripcion: questionDescription.value.trim()
    };

    const res = await fetch(`${API_BASE}/positions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) return alert("Error creando pregunta");

    positions.push(await res.json());
    renderPositionsTable();
    renderResults();
    e.target.reset();
  });

  // ================= CANDIDATES =================
  function renderCandidatesTable() {
    const tbody = document.getElementById("options-table-body");
    if (!tbody) return;

    if (candidates.length === 0) {
      tbody.innerHTML = `<tr><td colspan="2">No hay opciones registradas.</td></tr>`;
      return;
    }

    tbody.innerHTML = candidates.map(c => {
      const pos = positions.find(p => p.id === c.positionId);
      return `<tr><td>${pos?.nombre || ""}</td><td>${c.nombre}</td></tr>`;
    }).join("");
  }

  document.getElementById("options-form")?.addEventListener("submit", async e => {
    e.preventDefault();

    const data = {
      positionId: optionQuestionSelect.value,
      nombre: optionText.value.trim()
    };

    const res = await fetch(`${API_BASE}/candidates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) return alert("Error creando opción");

    candidates.push(await res.json());
    renderCandidatesTable();
    renderResults();
    e.target.reset();
  });

  // ================= VOTING =================
  document.getElementById("vote-email-form")?.addEventListener("submit", e => {
    e.preventDefault();

    const email = voteEmailInput.value.trim().toLowerCase();
    const participant = participants.find(p => p.email === email);

    if (!participant) return showVoteError("Correo no registrado");
    if (participant.hasVoted) return showVoteError("Este correo ya votó");

    currentParticipantEmail = email;
    voteStepEmail.style.display = "none";
    voteStepForm.style.display = "block";
    voteParticipantLabel.textContent = email;
    renderVoteForm();
  });

  function renderVoteForm() {
    voteQuestionsContainer.innerHTML = positions.map(pos => {
      const opts = [
        ...candidates.filter(c => c.positionId === pos.id),
        { id: `none-${pos.id}`, nombre: "Ninguno" },
        { id: `ns-${pos.id}`, nombre: "No sé" }
      ];

      return `
        <div class="vote-card">
          <h3>${pos.nombre}</h3>
          ${opts.map(o => `
            <label>
              <input type="radio" name="q-${pos.id}" value="${o.id}">
              ${o.nombre}
            </label>
          `).join("")}
        </div>
      `;
    }).join("");
  }

  document.getElementById("vote-form")?.addEventListener("submit", async e => {
    e.preventDefault();

    const selections = positions.map(pos => {
      const sel = document.querySelector(`input[name="q-${pos.id}"]:checked`);
      return sel ? { positionId: pos.id, candidateId: sel.value } : null;
    });

    if (selections.includes(null)) return alert("Debes responder todo");

    await fetch(`${API_BASE}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: currentParticipantEmail, selections })
    });

    const p = participants.find(p => p.email === currentParticipantEmail);
    if (p) p.hasVoted = true;

    updateSummaryCounts();
    voteStepForm.style.display = "none";
    voteStepDone.style.display = "block";
  });

  // ================= RESULTS =================
  function renderResults() {
    const container = document.getElementById("results-container");
    if (!container) return;

    container.innerHTML = positions.map(pos => {
      const total = votes.filter(v =>
        v.selections?.some(s => s.positionId === pos.id)
      ).length;

      return `
        <div class="results-block">
          <h3>${pos.nombre}</h3>
          <p>Total respuestas: ${total}</p>
        </div>
      `;
    }).join("");
  }

  function showVoteError(msg) {
    voteEmailError.textContent = msg;
    voteEmailError.style.display = "block";
  }

  // ================= INIT =================
  await initData();
});
