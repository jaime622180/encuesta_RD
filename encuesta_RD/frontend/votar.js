const params = new URLSearchParams(window.location.search);
const email = params.get("email");

const titulo = document.getElementById("titulo");
const form = document.getElementById("form");
const mensaje = document.getElementById("mensaje");

if (!email) {
  titulo.textContent = "Link inválido";
} else {
  fetch("http://localhost:3001/api/validar-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  })
  .then(res => res.json())
  .then(data => {
    if (!data.ok) {
      titulo.textContent = data.mensaje;
    } else {
      titulo.textContent = "Encuesta";
      form.style.display = "block";
    }
  });
}

form.addEventListener("submit", e => {
  e.preventDefault();

  const data = new FormData(form);

  fetch("http://localhost:3001/api/votar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      campo1: data.get("campo1"),
      campo2: data.get("campo2"),
      campo3: data.get("campo3")
    })
  })
  .then(res => res.json())
  .then(r => {
    if (r.ok) {
      titulo.textContent = "Gracias por responder";
      form.style.display = "none";
    } else {
      mensaje.textContent = r.mensaje;
    }
  });
});
