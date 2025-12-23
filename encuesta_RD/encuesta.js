const API_BASE = "http://localhost:3000/api"; // URL de tu backend
let participants = [];
let positions = [];
let candidates = [];
let votes = [];
let currentEmail = null;

// ====== Cargar datos desde el backend ======
async function loadData() {
  participants = await fetch(`${API_BASE}/participants`).then(r => r.json()).catch(()=>[]);
  positions = await fetch(`${API_BASE}/positions`).then(r => r.json()).catch(()=>[]);
  candidates = await fetch(`${API_BASE}/candidates`).then(r => r.json()).catch(()=>[]);
  votes = await fetch(`${API_BASE}/results`).then(r => r.json()).then(d=>d.votes||[]).catch(()=>[]);
}

// ====== Utilidades ======
function buildExtendedCandidates(positionId) {
  const base = candidates.filter(c => c.positionId === positionId);
  return [...base, {id: "ninguno-"+positionId, nombre:"Ninguno"}, {id:"nose-"+positionId, nombre:"No sé"}];
}

// ====== Paso 1: validar correo ======
function initEmailStep() {
  const emailForm = document.getElementById("email-form");
  const emailInput = document.getElementById("email-input");
  const errorDiv = document.getElementById("email-error");

  // Revisar si la URL tiene correo
  const urlParams = new URLSearchParams(window.location.search);
  const urlEmail = urlParams.get("email");
  if(urlEmail) emailInput.value = urlEmail;

  emailForm.addEventListener("submit", (e)=>{
    e.preventDefault();
    const email = (emailInput.value||"").trim().toLowerCase();
    if(!email){
      errorDiv.textContent = "Debes ingresar un correo válido.";
      errorDiv.style.display = "block";
      return;
    }
    const participant = participants.find(p => p.email.toLowerCase() === email);
    if(!participant){
      errorDiv.textContent = "Este correo no está registrado.";
      errorDiv.style.display = "block";
      return;
    }
    if(participant.hasVoted){
      errorDiv.textContent = "Este correo ya ha votado.";
      errorDiv.style.display = "block";
      return;
    }

    errorDiv.style.display = "none";
    currentEmail = email;
    startVoteForParticipant(participant);
  });
}

// ====== Paso 2: mostrar votación ======
function startVoteForParticipant(participant){
  document.getElementById("step-email").style.display = "none";
  document.getElementById("step-vote").style.display = "block";
  document.getElementById("participant-label").textContent = participant.nombre || participant.email;

  const container = document.getElementById("questions-container");
  if(positions.length === 0){
    container.innerHTML = '<div class="alert">No hay preguntas configuradas.</div>';
    return;
  }

  container.innerHTML = positions.map(pos=>{
    const opts = buildExtendedCandidates(pos.id).map(opt=>`
      <label class="radio-option">
        <input type="radio" name="q-${pos.id}" value="${opt.id}" required> ${opt.nombre}
      </label>
    `).join("");
    return `<div class="vote-card">
      <h3>${pos.nombre}</h3>
      ${pos.descripcion?`<small>${pos.descripcion}</small>`:""}
      ${opts}
    </div>`;
  }).join("");
}

// ====== Paso 2: enviar voto ======
function initVoteStep(){
  const voteForm = document.getElementById("vote-form");
  voteForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    if(!currentEmail) return;

    const selections = [];
    let missing = false;
    positions.forEach(pos=>{
      const sel = document.querySelector(`input[name="q-${pos.id}"]:checked`);
      if(!sel) missing = true;
      else selections.push({positionId: pos.id, candidateId: sel.value});
    });

    if(missing){
      alert("Debes seleccionar una opción para cada pregunta.");
      return;
    }

    try{
      const res = await fetch(`${API_BASE}/vote`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email:currentEmail, selections})
      });
      if(!res.ok){
        const data = await res.json();
        alert(data.error || "Error enviando voto");
        return;
      }

      // Mostrar confirmación
      document.getElementById("step-vote").style.display = "none";
      document.getElementById("step-done").style.display = "block";
    }catch(err){
      console.error(err);
      alert("Error conectando con el servidor");
    }
  });
}

// ====== Inicialización ======
(async function init(){
  await loadData();
  initEmailStep();
  initVoteStep();
})();
