const byId = (id) => document.getElementById(id);
let pollTimer = null;
let currentJobId = null;
let toastTimer = null;
let jobsAutoTimer = null;
let jobStartTimeMs = null;
let cachedOutputs = [];

function syncThemeButtonText() {
  const isLight = document.body.classList.contains("light");
  const btn = byId("themeToggleBtn");
  if (btn) btn.textContent = isLight ? "Switch Dark" : "Switch Light";
}

function showToast(message) {
  const toast = byId("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function getStatusClass(status) {
  const normalized = String(status || "unknown").toLowerCase();
  if (normalized === "completed") return "status-completed";
  if (normalized === "processing" || normalized === "queued" || normalized === "loading") return "status-processing";
  if (normalized === "error") return "status-error";
  if (normalized === "cancelled") return "status-cancelled";
  return "status-queued";
}

function updateFileSummary() {
  const fileInput = byId("file");
  const files = Array.from(fileInput.files || []);
  if (!files.length) {
    byId("fileSummary").textContent = "No files selected.";
    return;
  }
  const totalMb = files.reduce((sum, f) => sum + f.size, 0) / 1048576;
  byId("fileSummary").textContent = `${files.length} file(s) selected - ${totalMb.toFixed(2)} MB total`;
}

function applyQuickPreset(type) {
  const presets = {
    cinematic: { fps: 30, splitLength: 45, zoomStart: 1.0, zoomEnd: 1.14, fontSize: 130 },
    fast: { fps: 24, splitLength: 30, zoomStart: 1.0, zoomEnd: 1.08, fontSize: 110 },
    ultra: { fps: 60, splitLength: 50, zoomStart: 1.0, zoomEnd: 1.1, fontSize: 140 },
  };
  const selected = presets[type];
  if (!selected) return;
  Object.entries(selected).forEach(([key, value]) => {
    const el = byId(key);
    if (el) el.value = value;
  });
  showToast(`Applied ${type} preset`);
}

function getConfig() {
  return {
    width: Number(byId("width").value),
    height: Number(byId("height").value),
    topText: byId("topText").value,
    bottomText: byId("bottomText").value,
    fontSize: Number(byId("fontSize").value),
    textColor: byId("textColor").value,
    strokeColor: byId("strokeColor").value,
    strokeWidth: Number(byId("strokeWidth").value),
    zoomStart: Number(byId("zoomStart").value),
    zoomEnd: Number(byId("zoomEnd").value),
    fps: Number(byId("fps").value),
    useGpu: byId("useGpu").checked,
    splitLength: Number(byId("splitLength").value),
  };
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function uploadAndProcess() {
  const fileInput = byId("file");
  if (!fileInput.files.length) {
    alert("Please choose a video file.");
    return;
  }
  const file = fileInput.files[0];

  const formData = new FormData();
  formData.append("file", file);
  const uploadRes = await fetch("/upload", { method: "POST", body: formData });
  const uploadData = await uploadRes.json();

  const processForm = new FormData();
  processForm.append("data", JSON.stringify({ job_id: uploadData.job_id, file_path: uploadData.file_path, config: getConfig() }));
  byId("jobInfo").textContent = `Job: ${uploadData.job_id} | starting...`;
  currentJobId = uploadData.job_id;

  fetch("/process-async", { method: "POST", body: processForm });
  jobStartTimeMs = Date.now();
  startPolling(uploadData.job_id);
  showToast("Single job started");
}

async function uploadAndProcessBatch() {
  const fileInput = byId("file");
  if (!fileInput.files.length) {
    alert("Please choose one or more video files.");
    return;
  }
  const formData = new FormData();
  Array.from(fileInput.files).forEach((file) => formData.append("files", file));
  const uploadRes = await fetch("/upload-batch", { method: "POST", body: formData });
  const uploadData = await uploadRes.json();
  if (!uploadData.items?.length) {
    alert("Batch upload failed.");
    return;
  }

  const processForm = new FormData();
  processForm.append("data", JSON.stringify({ items: uploadData.items, config: getConfig() }));
  const processRes = await fetch("/process-batch-async", { method: "POST", body: processForm });
  const processData = await processRes.json();
  currentJobId = processData.job_id;
  jobStartTimeMs = Date.now();
  byId("jobInfo").textContent = `Batch Job: ${processData.job_id} | queued`;
  startPolling(processData.job_id);
  showToast("Batch job queued");
}

function startPolling(jobId) {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    const res = await fetch(`/status/${jobId}`);
    const data = await res.json();
    const progress = Number(data.progress || 0);
    byId("progressBar").style.width = `${progress}%`;
    let etaText = "";
    if (jobStartTimeMs && progress > 0 && progress < 100) {
      const elapsedSec = (Date.now() - jobStartTimeMs) / 1000;
      const totalEstimate = elapsedSec / (progress / 100);
      const remain = Math.max(0, Math.round(totalEstimate - elapsedSec));
      etaText = ` | ETA ~ ${remain}s`;
    }
    byId("jobInfo").innerHTML = `Job: ${jobId} | ${progress}%${etaText} <span class="status-chip ${getStatusClass(data.status)}">${data.status || "unknown"}</span>`;
    if (Array.isArray(data.metadata_list) && data.metadata_list.length) {
      byId("metadataBox").textContent = data.metadata_list
        .map((m, i) => `${i + 1}. ${m.title}\n${m.description}`)
        .join("\n\n");
    }
    if (data.status === "completed" || data.status === "error" || data.status === "cancelled") {
      clearInterval(pollTimer);
      await loadOutputs();
      await loadJobs();
    }
  }, 2000);
}

async function loadOutputs() {
  const res = await fetch("/outputs");
  const data = await res.json();
  cachedOutputs = data.files || [];
  renderOutputs();
}

function renderOutputs() {
  const term = (byId("outputSearch")?.value || "").toLowerCase().trim();
  const list = byId("outputList");
  list.innerHTML = "";
  cachedOutputs
    .filter((f) => !term || f.name.toLowerCase().includes(term))
    .forEach((f) => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="${f.download_url}" target="_blank">${f.name}</a> (${(f.size_bytes / 1048576).toFixed(2)} MB)
      <span class="row-actions"><button data-file="${encodeURIComponent(f.name)}" class="deleteOutputBtn btn danger">Delete</button></span>`;
    list.appendChild(li);
  });

  document.querySelectorAll(".deleteOutputBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const filename = decodeURIComponent(btn.dataset.file);
      const ok = confirm(`Delete ${filename}?`);
      if (!ok) return;
      await fetch(`/outputs/${encodeURIComponent(filename)}`, { method: "DELETE" });
      showToast("Output deleted");
      await loadOutputs();
      await loadJobs();
    });
  });
}

async function savePreset() {
  const name = prompt("Preset name:");
  if (!name) return;
  await fetch("/presets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, config: getConfig() }),
  });
  await loadPresets();
}

async function exportPresets() {
  const res = await fetch("/presets/export");
  const data = await res.json();
  downloadJson(`video-editor-presets-${Date.now()}.json`, data);
  showToast("Presets exported");
}

async function importPresetsFromFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  await fetch("/presets/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  });
  await loadPresets();
  showToast("Presets imported");
}

async function cancelCurrentJob() {
  if (!currentJobId) {
    alert("No active job to cancel.");
    return;
  }
  await fetch(`/jobs/${currentJobId}/cancel`, { method: "POST" });
  byId("jobInfo").textContent = `Job: ${currentJobId} | cancellation requested`;
  showToast("Cancellation requested");
}

async function loadJobs() {
  const [jobsRes, analyticsRes] = await Promise.all([fetch("/jobs"), fetch("/analytics")]);
  const jobsData = await jobsRes.json();
  const analytics = await analyticsRes.json();

  byId("analyticsBox").textContent =
    `Total Jobs: ${analytics.jobs_total} | Outputs: ${analytics.output_videos} videos (${analytics.output_size_mb} MB)`;

  const jobsList = byId("jobsList");
  jobsList.innerHTML = "";
  jobsData.jobs.slice(0, 20).forEach((job) => {
    const li = document.createElement("li");
    li.innerHTML = `${job.job_id} - ${job.progress || 0}% <span class="status-chip ${getStatusClass(job.status)}">${job.status}</span> <button data-job="${job.job_id}" class="watchBtn btn">Watch</button>`;
    jobsList.appendChild(li);
  });

  document.querySelectorAll(".watchBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentJobId = btn.dataset.job;
      startPolling(btn.dataset.job);
    });
  });
}

function setJobsAutoRefresh(enabled) {
  if (jobsAutoTimer) {
    clearInterval(jobsAutoTimer);
    jobsAutoTimer = null;
  }
  if (enabled) {
    jobsAutoTimer = setInterval(loadJobs, 4000);
  }
}

async function loadPresets() {
  const res = await fetch("/presets");
  const data = await res.json();
  const select = byId("presetSelect");
  select.innerHTML = '<option value="">Load preset</option>';
  Object.keys(data).forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

function applyPreset(name, presets) {
  const c = presets[name];
  if (!c) return;
  Object.entries(c).forEach(([key, value]) => {
    const el = byId(key);
    if (!el) return;
    if (el.type === "checkbox") el.checked = Boolean(value);
    else el.value = value;
  });
}

async function init() {
  byId("startBtn").addEventListener("click", uploadAndProcess);
  byId("startBatchBtn").addEventListener("click", uploadAndProcessBatch);
  byId("cancelBtn").addEventListener("click", cancelCurrentJob);
  byId("savePresetBtn").addEventListener("click", savePreset);
  byId("exportPresetsBtn").addEventListener("click", exportPresets);
  byId("refreshOutputsBtn").addEventListener("click", loadOutputs);
  byId("refreshJobsBtn").addEventListener("click", loadJobs);
  byId("outputSearch").addEventListener("input", renderOutputs);
  byId("autoRefreshJobs").addEventListener("change", (e) => setJobsAutoRefresh(e.target.checked));
  byId("importPresetsFile").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importPresetsFromFile(file);
    } catch {
      showToast("Invalid preset JSON");
    } finally {
      e.target.value = "";
    }
  });
  byId("file").addEventListener("change", updateFileSummary);
  byId("themeToggleBtn").addEventListener("click", () => {
    document.body.classList.toggle("light");
    localStorage.setItem("video_editor_theme", document.body.classList.contains("light") ? "light" : "dark");
    syncThemeButtonText();
  });

  const dropZone = byId("dropZone");
  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add("dragging");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragging");
    });
  });
  dropZone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    if (!dt?.files?.length) return;
    byId("file").files = dt.files;
    updateFileSummary();
    showToast(`${dt.files.length} file(s) dropped`);
  });

  document.querySelectorAll(".chip-btn").forEach((btn) => {
    btn.addEventListener("click", () => applyQuickPreset(btn.dataset.preset));
  });
  byId("presetSelect").addEventListener("change", async (e) => {
    const res = await fetch("/presets");
    const presets = await res.json();
    applyPreset(e.target.value, presets);
  });
  await loadOutputs();
  await loadPresets();
  await loadJobs();
  setJobsAutoRefresh(true);
  updateFileSummary();
  if (localStorage.getItem("video_editor_theme") === "light") {
    document.body.classList.add("light");
  }
  syncThemeButtonText();
}

init();
