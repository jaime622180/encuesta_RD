document.addEventListener("DOMContentLoaded", async function () {
  // ====== API ======
  const API_BASE = "http://localhost:3000/api";

  // ====== DATA ======
  let participants = [];
  let positions = [];
  let candidates = [];
  let votes = [];
  let currentParticipantEmail = null;

// Autocompletar correo desde el link
const params = new URLSearchParams(window.location.search);
const emailFromLink = params.get("email");

if (emailFromLink) {
  document.getElementById("email").value = emailFromLink;
}


  // ====== VIEWS NAVIGATION ======
  const navButtons = document.querySelectorAll(".nav-btn");
  const views = document.querySelectorAll(".view-section");

  function showView(viewId) {
    views.forEach((v) => (v.style.display = v.id === viewId ? "block" : "none"));
    navButtons.forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.view === viewId.replace("view-", ""))
    );
  }

  navButtons.forEach((btn) =>
    btn.addEventListener("click", () => showView("view-" + btn.dataset.view))
  );

  // ====== SERVER LOAD ======
  async function loadParticipants() {
    try {
      const res = await fetch(`${API_BASE}/participants`);
      const data = await res.json();
      participants = (data || []).map((p) => ({
        email: p.email || "",
        nombre: p.nombre || "",
        apellido: p.apellido || "",
        campo1: p.campo1 || "",
        campo2: p.campo2 || "",
        campo3: p.campo3 || "",
        hasVoted: p.hasVoted || false,
      }));
    } catch (e) {
      console.error("Error cargando participantes", e);
      participants = [];
    }
  }

  async function loadPositions() {
    try {
      const res = await fetch(`${API_BASE}/positions`);
      positions = (await res.json()) || [];
    } catch (e) {
      console.error("Error cargando posiciones", e);
      positions = [];
    }
  }

  async function loadCandidates() {
    try {
      const res = await fetch(`${API_BASE}/candidates`);
      candidates = (await res.json()) || [];
    } catch (e) {
      console.error("Error cargando candidatos", e);
      candidates = [];
    }
  }

  async function loadVotes() {
    try {
      const res = await fetch(`${API_BASE}/results`);
      const data = await res.json();
      votes = data.votes || [];
    } catch (e) {
      console.error("Error cargando votos", e);
      votes = [];
    }
  }

  async function initData() {
    await Promise.all([loadParticipants(), loadPositions(), loadCandidates(), loadVotes()]);
    renderParticipantsTable();
    renderPositionsTable();
    renderCandidatesTable();
    renderResults();
    updateSummaryCounts();
  }

  // ====== PARTICIPANTS ======
  function renderParticipantsTable() {
    const tbody = document.getElementById("participants-table-body");
    if (!tbody) return;
    if (participants.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7">No hay participantes registrados.</td></tr>';
      return;
    }
    tbody.innerHTML = participants
      .map(
        (p) => `<tr>
        <td>${p.email}</td>
        <td>${p.nombre || ""}</td>
        <td>${p.apellido || ""}</td>
        <td>${p.campo1 || ""}</td>
        <td>${p.campo2 || ""}</td>
        <td>${p.campo3 || ""}</td>
        <td><span class="badge">${p.hasVoted ? "Sí" : "No"}</span></td>
      </tr>`
      )
      .join("");
  }

  function updateSummaryCounts() {
    const totalSpan = document.getElementById("summary-total-participants");
    const votedSpan = document.getElementById("summary-total-voted");
    if (totalSpan) totalSpan.textContent = participants.length.toString();
    if (votedSpan) votedSpan.textContent = participants.filter((p) => p.hasVoted).length;
  }

  function initParticipantsForm() {
    const form = document.getElementById("participants-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById("participant-email");
      const email = emailInput.value.trim().toLowerCase();
      if (!email) return alert("El correo electrónico es obligatorio.");

      const newParticipant = {
        email,
        nombre: document.getElementById("participant-nombre").value.trim(),
        apellido: document.getElementById("participant-apellido").value.trim(),
        campo1: document.getElementById("participant-campo1").value.trim(),
        campo2: document.getElementById("participant-campo2").value.trim(),
        campo3: document.getElementById("participant-campo3").value.trim(),
        hasVoted: false,
      };

      try {
        const res = await fetch(`${API_BASE}/participants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newParticipant),
        });
        if (!res.ok) {
          const data = await res.json();
          return alert(data.error || "Error registrando participante");
        }

        const savedParticipant = await res.json();
        participants.push({
          email: savedParticipant.email,
          nombre: savedParticipant.nombre,
          apellido: savedParticipant.apellido,
          campo1: savedParticipant.campo1,
          campo2: savedParticipant.campo2,
          campo3: savedParticipant.campo3,
          hasVoted: savedParticipant.hasVoted,
        });

        renderParticipantsTable();
        updateSummaryCounts();
        form.reset();
      } catch (err) {
        console.error(err);
        alert("Error conectando con el servidor.");
      }
    });
  }

  // ====== POSITIONS ======
  function renderPositionsOptionsSelect() {
    const select = document.getElementById("option-question-select");
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML =
      '<option value="">Seleccione una pregunta...</option>' +
      positions.map((p) => `<option value="${p.id}">${p.nombre.slice(0, 80)}</option>`).join("");
    if (positions.some((p) => p.id === currentValue)) select.value = currentValue;
  }

  function renderPositionsTable() {
    const tbody = document.getElementById("questions-table-body");
    if (!tbody) return;
    if (positions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2">No hay preguntas registradas.</td></tr>';
      return;
    }
    tbody.innerHTML = positions
      .map(
        (p) => `<tr>
        <td>${p.nombre}</td>
        <td>${p.descripcion || ""}</td>
      </tr>`
      )
      .join("");
    renderPositionsOptionsSelect();
  }

  function initPositionsForm() {
    const form = document.getElementById("questions-form");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nombre = document.getElementById("question-text").value.trim();
      if (!nombre) return alert("El texto de la pregunta es obligatorio.");
      const newPosition = { nombre, descripcion: document.getElementById("question-description").value.trim() };
      try {
        const res = await fetch(`${API_BASE}/positions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newPosition),
        });
        if (!res.ok) return alert("Error creando pregunta");
        positions.push(await res.json());
        renderPositionsTable();
        renderResults();
        form.reset();
      } catch (err) {
        console.error(err);
        alert("Error conectando con el servidor.");
      }
    });
  }

  // ====== CANDIDATES ======
  function renderCandidatesTable() {
    const tbody = document.getElementById("options-table-body");
    if (!tbody) return;
    if (candidates.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2">No hay opciones registradas.</td></tr>';
      return;
    }
    tbody.innerHTML = candidates
      .map((c) => {
        const pos = positions.find((p) => p.id === c.positionId);
        return `<tr><td>${pos ? pos.nombre : "—"}</td><td>${c.nombre}</td></tr>`;
      })
      .join("");
  }

  function initCandidatesForm() {
    const form = document.getElementById("options-form");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const select = document.getElementById("option-question-select");
      const textInput = document.getElementById("option-text");
      if (!select.value) return alert("Selecciona la pregunta.");
      if (!textInput.value.trim()) return alert("El texto de la opción es obligatorio.");
      const newCandidate = { positionId: select.value, nombre: textInput.value.trim() };
      try {
        const res = await fetch(`${API_BASE}/candidates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCandidate),
        });
        if (!res.ok) return alert("Error creando opción");
        candidates.push(await res.json());
        renderCandidatesTable();
        renderResults();
        form.reset();
      } catch (err) {
        console.error(err);
        alert("Error conectando con el servidor.");
      }
    });
  }

  // ====== SHARE LINK ======
  function initShareLinkPanel() {
    const linkInput = document.getElementById("survey-link-input");
    const copyBtn = document.getElementById("copy-link-btn");
    const baseUrl = window.location.origin + window.location.pathname;
    const surveyUrl = baseUrl + "#/votar";
    if (linkInput) linkInput.value = surveyUrl;
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(surveyUrl);
          copyBtn.textContent = "Copiado ✅";
          setTimeout(() => (copyBtn.textContent = "Copiar enlace"), 2000);
        } catch {
          alert("No se pudo copiar. Hazlo manualmente.");
        }
      });
    }
  }

  // ====== CLEAR ALL ======
  function initClearAll() {
    const btn = document.getElementById("clear-all-btn");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      if (!confirm("¿Seguro que quieres borrar TODOS los datos?")) return;

      try {
        await fetch(`${API_BASE}/reset`, { method: "POST" });
        participants = [];
        positions = [];
        candidates = [];
        votes = [];
        renderParticipantsTable();
        renderPositionsTable();
        renderCandidatesTable();
        renderResults();
        updateSummaryCounts();
      } catch (err) {
        console.error(err);
        alert("No se pudo borrar todo");
      }
    });
  }

  // ====== VOTING ======
  function buildExtendedCandidates(positionId) {
    const base = candidates.filter((c) => c.positionId === positionId);
    return [
      ...base,
      { id: "ninguno-" + positionId, positionId, nombre: "Ninguno" },
      { id: "nose-" + positionId, positionId, nombre: "No sé" },
    ];
  }

  function getCandidateName(candidateId, candidatesArr, positionId) {
    const found = candidatesArr.find((c) => c.id === candidateId);
    if (found) return found.nombre;
    if (candidateId === "ninguno-" + positionId) return "Ninguno";
    if (candidateId === "nose-" + positionId) return "No sé";
    return "Desconocido";
  }

  function initVoteView() {
    const emailForm = document.getElementById("vote-email-form");
    const voteForm = document.getElementById("vote-form");

    if (emailForm) {
      emailForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById("vote-email-input");
        const errorDiv = document.getElementById("vote-email-error");
        const email = emailInput.value.trim().toLowerCase();
        const participant = participants.find((p) => p.email === email);
        if (!email) return showEmailError("Debes colocar tu correo electrónico.");
        if (!participant) return showEmailError("Correo no registrado.");
        if (participant.hasVoted) return showEmailError("Ya registró su respuesta.");
        errorDiv.style.display = "none";
        startVoteForParticipant(participant);
      });
    }

    if (voteForm) {
      voteForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        await submitVote();
      });
    }
  }

  function showEmailError(msg) {
    const errorDiv = document.getElementById("vote-email-error");
    if (errorDiv) {
      errorDiv.textContent = msg;
      errorDiv.style.display = "block";
    }
  }

  function startVoteForParticipant(participant) {
    currentParticipantEmail = participant.email;
    document.getElementById("vote-step-email").style.display = "none";
    document.getElementById("vote-step-form").style.display = "block";
    const participantLabel = document.getElementById("vote-participant-label");
    if (participantLabel) {
      const namePart = participant.nombre && participant.apellido ? `${participant.nombre} ${participant.apellido}` : participant.nombre || "";
      participantLabel.textContent = namePart ? `${participant.email} — ${namePart}` : participant.email;
    }
    const questionsContainer = document.getElementById("vote-questions-container");
    if (!questionsContainer) return;
    if (positions.length === 0) {
      questionsContainer.innerHTML = '<div class="alert error">No hay preguntas configuradas.</div>';
      return;
    }
    questionsContainer.innerHTML = positions
      .map((pos) => {
        const options = buildExtendedCandidates(pos.id)
          .map((opt) => `<label class="radio-option"><input type="radio" name="q-${pos.id}" value="${opt.id}" />${opt.nombre}</label>`)
          .join("");
        return `<div class="vote-card"><h3>${pos.nombre}</h3>${pos.descripcion ? `<small>${pos.descripcion}</small>` : ""}<div class="radio-group">${options}</div></div>`;
      })
      .join("");
  }

  async function submitVote() {
    if (!currentParticipantEmail) return;
    const participant = participants.find((p) => p.email === currentParticipantEmail);
    if (!participant) return;
    const selections = [];
    let missing = false;
    positions.forEach((pos) => {
      const selected = document.querySelector(`input[name="q-${pos.id}"]:checked`);
      if (!selected) missing = true;
      else selections.push({ positionId: pos.id, candidateId: selected.value });
    });
    if (missing) return alert("Debes seleccionar una opción para todas las preguntas.");
    try {
      const res = await fetch(`${API_BASE}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: participant.email, selections }),
      });
      if (!res.ok) return alert("Error registrando voto");
      votes.push({ email: participant.email, selections, date: new Date().toISOString() });
      participant.hasVoted = true;
      renderParticipantsTable();
      updateSummaryCounts();
      document.getElementById("vote-step-form").style.display = "none";
      document.getElementById("vote-step-done").style.display = "block";
    } catch (err) {
      console.error(err);
      alert("Error conectando con el servidor.");
    }
  }

  // ====== RESULTS ======
  function renderResults() {
    const container = document.getElementById("results-container");
    if (!container) return;
    if (positions.length === 0) {
      container.innerHTML = '<div class="alert info">No hay preguntas configuradas. Usa la sección de Administración para crear la encuesta.</div>';
      return;
    }
    container.innerHTML = positions
      .map((pos) => {
        let total = 0;
        const counts = {};
        votes.forEach((vote) => {
          (vote.selections || []).forEach((sel) => {
            if (sel.positionId === pos.id) {
              total++;
              counts[sel.candidateId] = (counts[sel.candidateId] || 0) + 1;
            }
          });
        });
        const rows = Object.entries(counts)
          .map(([candidateId, count]) => ({
            candidateId,
            name: getCandidateName(candidateId, candidates, pos.id),
            count,
            porcentaje: total > 0 ? ((count / total) * 100).toFixed(1) : "0.0",
          }))
          .sort((a, b) => b.count - a.count);
        return `<div class="results-block">
          <h3>${pos.nombre}</h3>
          ${pos.descripcion ? `<div class="results-summary">${pos.descripcion}</div>` : ""}
          <div class="results-summary">Total de respuestas: <strong>${total}</strong></div>
          ${
            total === 0
              ? `<div class="alert">Aún no hay respuestas registradas.</div>`
              : `<div class="table-wrapper"><table><thead><tr><th>Opción</th><th>Respuestas</th><th>%</th></tr></thead><tbody>${rows
                  .map((row) => `<tr><td>${row.name}</td><td>${row.count}</td><td>${row.porcentaje}%</td></tr>`)
                  .join("")}</tbody></table></div>`
          }
        </div>`;
      })
      .join("");
  }

  // ====== INIT ======
  await initData();
  initParticipantsForm();
  initPositionsForm();
  initCandidatesForm();
  initShareLinkPanel();
  initClearAll();
  initVoteView();
});
