// backend/server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { sendSurveyEmail } = require("./mailer"); // tu archivo de mails

const app = express();

// ================== CONFIG ==================
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI; // define esto en Render con tu URI de Atlas

// ================== MIDDLEWARE ==================
app.use(cors());
app.use(express.json());

// ================== MEMORIA (FALLBACK) ==================
let participants = [];
let positions = [];
let candidates = [];
let votes = [];

// ================== MONGODB ==================
let dbConnected = false;

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("🟢 MongoDB conectado");
  dbConnected = true;
})
.catch((err) => {
  console.log("🟡 MongoDB NO conectado → usando memoria", err.message);
});

// ================== SCHEMAS ==================
const ParticipantSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  nombre: String,
  apellido: String,
  campo1: String,
  campo2: String,
  campo3: String,
  hasVoted: { type: Boolean, default: false },
});

const PositionSchema = new mongoose.Schema({
  id: String,
  nombre: String,
  descripcion: String,
});

const CandidateSchema = new mongoose.Schema({
  id: String,
  positionId: String,
  nombre: String,
});

const VoteSchema = new mongoose.Schema({
  email: String,
  selections: Array,
  date: String,
});

// ================== MODELS ==================
const ParticipantDB = mongoose.model("Participant", ParticipantSchema);
const PositionDB = mongoose.model("Position", PositionSchema);
const CandidateDB = mongoose.model("Candidate", CandidateSchema);
const VoteDB = mongoose.model("Vote", VoteSchema);

// ================== HELPERS ==================
const get = async (Model, mem) => (dbConnected ? await Model.find() : mem);
const create = async (Model, mem, obj) =>
  dbConnected ? await Model.create(obj) : mem.push(obj);
const remove = async (Model, mem, filter) => {
  if (dbConnected) return await Model.deleteMany(filter);
  for (let i = mem.length - 1; i >= 0; i--) {
    if (Object.keys(filter).every(k => mem[i][k] === filter[k])) {
      mem.splice(i, 1);
    }
  }
};

// ================== PARTICIPANTES ==================
app.get("/api/participants", async (req, res) => {
  res.json(await get(ParticipantDB, participants));
});

app.post("/api/participants", async (req, res) => {
  const { email, nombre, apellido, campo1, campo2, campo3 } = req.body;
  if (!email) return res.status(400).json({ error: "Correo requerido" });

  const emailLower = email.toLowerCase();
  const list = await get(ParticipantDB, participants);

  if (list.some(p => p.email === emailLower))
    return res.status(400).json({ error: "Correo ya registrado" });

  const participant = {
    email: emailLower,
    nombre: nombre || "",
    apellido: apellido || "",
    campo1: campo1 || "",
    campo2: campo2 || "",
    campo3: campo3 || "",
    hasVoted: false,
  };

  await create(ParticipantDB, participants, participant);

  try { await sendSurveyEmail(emailLower); } catch {}

  res.json(participant);
});

app.delete("/api/participants/:email", async (req, res) => {
  await remove(ParticipantDB, participants, { email: req.params.email });
  res.json({ ok: true });
});

// ================== POSITIONS ==================
app.get("/api/positions", async (req, res) => {
  res.json(await get(PositionDB, positions));
});

app.post("/api/positions", async (req, res) => {
  if (!req.body.nombre) return res.status(400).json({ error: "Nombre requerido" });

  const position = {
    id: "pos-" + Date.now(),
    nombre: req.body.nombre,
    descripcion: req.body.descripcion || "",
  };

  await create(PositionDB, positions, position);
  res.json(position);
});

app.delete("/api/positions/:id", async (req, res) => {
  await remove(PositionDB, positions, { id: req.params.id });
  await remove(CandidateDB, candidates, { positionId: req.params.id });
  res.json({ ok: true });
});

// ================== CANDIDATES ==================
app.get("/api/candidates", async (req, res) => {
  res.json(await get(CandidateDB, candidates));
});

app.post("/api/candidates", async (req, res) => {
  if (!req.body.positionId || !req.body.nombre)
    return res.status(400).json({ error: "Datos incompletos" });

  const candidate = {
    id: "cand-" + Date.now(),
    positionId: req.body.positionId,
    nombre: req.body.nombre,
  };

  await create(CandidateDB, candidates, candidate);
  res.json(candidate);
});

app.delete("/api/candidates/:id", async (req, res) => {
  await remove(CandidateDB, candidates, { id: req.params.id });
  res.json({ ok: true });
});

// ================== VOTING ==================
app.post("/api/vote", async (req, res) => {
  const { email, selections } = req.body;
  const list = await get(ParticipantDB, participants);
  const p = list.find(x => x.email === email?.toLowerCase());

  if (!p) return res.status(400).json({ error: "No válido" });
  if (p.hasVoted) return res.status(400).json({ error: "Ya votó" });

  p.hasVoted = true;

  await create(VoteDB, votes, {
    email,
    selections,
    date: new Date().toISOString(),
  });

  res.json({ ok: true });
});

// ================== RESULTS ==================
app.get("/api/results", async (req, res) => {
  res.json({
    participants: await get(ParticipantDB, participants),
    positions: await get(PositionDB, positions),
    candidates: await get(CandidateDB, candidates),
    votes: await get(VoteDB, votes),
  });
});

// ================== START SERVER ==================
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
