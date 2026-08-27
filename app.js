/* FM FARM KEEPERS — Supabase version
   Isi hanya publishable key di bawah ini. Jangan pernah menaruh Secret key di file ini. */
const SUPABASE_URL = "https://jiemhfnmjqhmaqmjurtt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_2_9aMfcWqdp4sjbBVW5uGg_lGbByF2r";

const TABLE = "ternakan";
let db = null;

function setupSupabase() {
    if (!window.supabase?.createClient) {
        alert("Library Supabase belum dimuat. Pastikan index.html memuat Supabase sebelum app.js.");
        return false;
    }
    if (!SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY.includes("TEMPEL_")) {
        alert("Publishable key Supabase belum diisi di app.js.");
        return false;
    }
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    return true;
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}
function escapeAttribute(value) { return escapeHTML(value); }
function formatDate(value) {
    if (!value) return "-";
    const p = String(value).split("-");
    return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : value;
}
function toItem(row) {
    return {
        id: row.id,
        ringNumber: row.no_seri_ring || "",
        companionRing: row.no_seri_ring_pendamping || "",
        hatchDate: row.tanggal_netas || "",
        fatherLineage: row.induk_jantan_silsilah || "",
        motherLineage: row.induk_betina_silsilah || "",
        description: row.deskripsi || "",
        createdAt: row.created_at || ""
    };
}
function toRow(item) {
    return {
        no_seri_ring: item.ringNumber.trim(),
        no_seri_ring_pendamping: item.companionRing.trim() || null,
        tanggal_netas: item.hatchDate,
        induk_jantan_silsilah: item.fatherLineage.trim(),
        induk_betina_silsilah: item.motherLineage.trim(),
        deskripsi: item.description.trim()
    };
}
function explainError(error, fallback) {
    console.error(error);
    if (error?.code === "23505") return "Nomor seri ring tersebut sudah terdaftar.";
    return `${fallback}${error?.message ? `\n\n${error.message}` : ""}`;
}
async function getData() {
    const { data, error } = await db.from(TABLE).select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return data.map(toItem);
}

function closeModal(id) { document.getElementById(id)?.remove(); }

function showAddForm() {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.id = "addModal";
    modal.innerHTML = `
        <div class="modal"><div class="modal-header">
          <button type="button" class="close-button" id="closeModal">×</button>
          <h2>TAMBAH TERNAKAN</h2><p>Masukkan data ternakan</p>
        </div><form id="livestockForm">
          <div class="form-group"><label>No. Seri Ring *</label><input type="text" id="ringNumber" placeholder="Contoh: FM-026-001" required></div>
          <div class="form-group"><label>No. Seri Ring Pendamping</label><input type="text" id="companionRing" placeholder="Contoh: FM-026-002"></div>
          <div class="form-group"><label>Tanggal Netas *</label><input type="date" id="hatchDate" required></div>
          <div class="form-group"><label>Induk Jantan / Silsilah *</label><textarea id="fatherLineage" required></textarea></div>
          <div class="form-group"><label>Induk Betina / Silsilah *</label><textarea id="motherLineage" required></textarea></div>
          <div class="form-group"><label>Deskripsi</label><textarea id="description"></textarea></div>
          <button type="submit" class="save-button">💾 SIMPAN DATA</button>
        </form></div>`;
    document.body.appendChild(modal);
    document.getElementById("closeModal").addEventListener("click", () => modal.remove());
    document.getElementById("livestockForm").addEventListener("submit", event => {
        event.preventDefault(); addLivestock(modal);
    });
}
async function addLivestock(modal) {
    const item = {
        ringNumber: document.getElementById("ringNumber").value.trim(),
        companionRing: document.getElementById("companionRing").value.trim(),
        hatchDate: document.getElementById("hatchDate").value,
        fatherLineage: document.getElementById("fatherLineage").value.trim(),
        motherLineage: document.getElementById("motherLineage").value.trim(),
        description: document.getElementById("description").value.trim()
    };
    if (!item.ringNumber || !item.hatchDate || !item.fatherLineage || !item.motherLineage) return alert("Mohon lengkapi data yang wajib diisi.");
    const { error } = await db.from(TABLE).insert(toRow(item));
    if (error) return alert(explainError(error, "Data tidak dapat disimpan."));
    modal.remove();
    document.getElementById("searchRing").value = item.ringNumber;
    alert("Data ternakan berhasil disimpan online.");
}

async function searchLivestock() {
    const input = document.getElementById("searchRing").value.trim().toLowerCase();
    if (!input) return alert("Masukkan nomor seri ring terlebih dahulu.");
    try {
        const data = await getData();
        const item = data.find(x => x.ringNumber.toLowerCase() === input || x.companionRing.toLowerCase() === input);
        if (!item) return alert("Data ternakan dengan nomor ring tersebut tidak ditemukan.");
        showDetail(item);
    } catch (error) { alert(explainError(error, "Gagal mengambil data dari Supabase.")); }
}
function showDetail(item) {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.id = "detailModal";
    modal.innerHTML = `
      <div class="modal detail-modal"><div class="modal-header">
        <button type="button" class="close-button" id="closeDetail">×</button><p>DATA TERNAKAN</p><h2>${escapeHTML(item.ringNumber)}</h2>
      </div><div class="detail-list">
        <div class="detail-item"><span>No. Seri Ring</span><strong>${escapeHTML(item.ringNumber)}</strong></div>
        <div class="detail-item"><span>No. Seri Ring Pendamping</span><strong>${escapeHTML(item.companionRing || "-")}</strong></div>
        <div class="detail-item"><span>Tanggal Netas</span><strong>${formatDate(item.hatchDate)}</strong></div>
        <div class="detail-item"><span>Induk Jantan / Silsilah</span><strong>${escapeHTML(item.fatherLineage)}</strong></div>
        <div class="detail-item"><span>Induk Betina / Silsilah</span><strong>${escapeHTML(item.motherLineage)}</strong></div>
        <div class="detail-item"><span>Deskripsi</span><strong>${escapeHTML(item.description || "-")}</strong></div>
      </div><div class="detail-actions"><button type="button" class="edit-button" id="editData">✏️ EDIT</button><button type="button" class="delete-button" id="deleteData">🗑️ HAPUS</button></div></div>`;
    document.body.appendChild(modal);
    document.getElementById("closeDetail").addEventListener("click", () => modal.remove());
    document.getElementById("deleteData").addEventListener("click", () => deleteLivestock(item.id, modal));
    document.getElementById("editData").addEventListener("click", () => { modal.remove(); showEditForm(item); });
}
async function deleteLivestock(id, modal) {
    if (!confirm("Yakin ingin menghapus data ternakan ini?")) return;
    const { error } = await db.from(TABLE).delete().eq("id", id);
    if (error) return alert(explainError(error, "Data tidak dapat dihapus."));
    modal.remove(); alert("Data berhasil dihapus.");
}

function showEditForm(item) {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal"><div class="modal-header"><button type="button" class="close-button" id="closeEdit">×</button><h2>EDIT TERNAKAN</h2><p>${escapeHTML(item.ringNumber)}</p></div>
      <form id="editForm">
        <div class="form-group"><label>No. Seri Ring *</label><input type="text" id="editRing" value="${escapeAttribute(item.ringNumber)}" required></div>
        <div class="form-group"><label>No. Seri Ring Pendamping</label><input type="text" id="editCompanion" value="${escapeAttribute(item.companionRing)}"></div>
        <div class="form-group"><label>Tanggal Netas *</label><input type="date" id="editDate" value="${escapeAttribute(item.hatchDate)}" required></div>
        <div class="form-group"><label>Induk Jantan / Silsilah *</label><textarea id="editFather" required>${escapeHTML(item.fatherLineage)}</textarea></div>
        <div class="form-group"><label>Induk Betina / Silsilah *</label><textarea id="editMother" required>${escapeHTML(item.motherLineage)}</textarea></div>
        <div class="form-group"><label>Deskripsi</label><textarea id="editDescription">${escapeHTML(item.description)}</textarea></div>
        <button type="submit" class="save-button">💾 UPDATE DATA</button>
      </form></div>`;
    document.body.appendChild(modal);
    document.getElementById("closeEdit").addEventListener("click", () => modal.remove());
    document.getElementById("editForm").addEventListener("submit", event => { event.preventDefault(); updateLivestock(item.id, modal); });
}
async function updateLivestock(id, modal) {
    const item = {
        ringNumber: document.getElementById("editRing").value.trim(), companionRing: document.getElementById("editCompanion").value.trim(),
        hatchDate: document.getElementById("editDate").value, fatherLineage: document.getElementById("editFather").value.trim(),
        motherLineage: document.getElementById("editMother").value.trim(), description: document.getElementById("editDescription").value.trim()
    };
    if (!item.ringNumber || !item.hatchDate || !item.fatherLineage || !item.motherLineage) return alert("Mohon lengkapi data yang wajib diisi.");
    const { error } = await db.from(TABLE).update(toRow(item)).eq("id", id);
    if (error) return alert(explainError(error, "Data tidak dapat diperbarui."));
    modal.remove(); alert("Data berhasil diperbarui.");
}

async function showAllLivestock() {
    try {
        const data = await getData();
        const modal = document.createElement("div"); modal.className = "modal-overlay"; modal.id = "allModal";
        modal.innerHTML = `<div class="modal all-modal"><div class="modal-header"><button type="button" class="close-button" id="closeAll">×</button><p>FM FARM KEEPERS</p><h2>SEMUA TERNAKAN</h2></div><div class="all-summary"><strong id="allCount">${data.length}</strong><span>Total Data Ternakan</span></div><div class="list-search"><input type="text" id="listSearch" placeholder="Cari nomor ring..." autocomplete="off"></div><div id="livestockList"></div></div>`;
        document.body.appendChild(modal);
        document.getElementById("closeAll").addEventListener("click", () => modal.remove());
        const render = keyword => {
            const q = keyword.trim().toLowerCase();
            const filtered = data.filter(x => x.ringNumber.toLowerCase().includes(q) || x.companionRing.toLowerCase().includes(q));
            document.getElementById("allCount").textContent = filtered.length; renderLivestockList(filtered, modal);
        };
        render(""); document.getElementById("listSearch").addEventListener("input", e => render(e.target.value));
    } catch (error) { alert(explainError(error, "Gagal mengambil daftar ternakan.")); }
}
function renderLivestockList(data, parent) {
    const list = parent.querySelector("#livestockList");
    if (!data.length) { list.innerHTML = `<div class="empty-list"><div>🕊️</div><strong>Data tidak ditemukan</strong><span>Coba gunakan nomor ring lain.</span></div>`; return; }
    list.innerHTML = [...data].reverse().map(item => `<button type="button" class="livestock-card" data-id="${escapeAttribute(item.id)}"><div class="livestock-main"><strong>${escapeHTML(item.ringNumber)}</strong><span>${formatDate(item.hatchDate)}</span></div><div class="livestock-lineage">${escapeHTML(item.fatherLineage || "-")}</div><div class="livestock-arrow">›</div></button>`).join("");
    list.querySelectorAll(".livestock-card").forEach(card => card.addEventListener("click", () => {
        const item = data.find(x => String(x.id) === card.dataset.id); if (item) { parent.remove(); showDetail(item); }
    }));
}

async function backupData() {
    try {
        const data = await getData();
        if (!data.length) return alert("Belum ada data ternakan untuk dibackup.");
        const backup = { app: "FM FARM KEEPERS", version: 2, backupDate: new Date().toISOString(), totalData: data.length, data };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob), link = document.createElement("a");
        link.href = url; link.download = `FM-FARM-KEEPERS-BACKUP-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
        alert(`Backup berhasil dibuat.\n\n${data.length} data ternakan tersimpan.`);
    } catch (error) { alert(explainError(error, "Backup gagal dibuat.")); }
}
function selectRestoreFile() { document.getElementById("restoreFile").click(); }
function restoreData(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const backup = JSON.parse(reader.result);
            if (!backup || backup.app !== "FM FARM KEEPERS" || !Array.isArray(backup.data)) throw new Error("Format backup tidak valid.");
            const rows = backup.data.filter(x => x?.ringNumber).map(toRow);
            if (!rows.length) return alert("Tidak ada data valid di file backup.");
            const { error } = await db.from(TABLE).upsert(rows, { onConflict: "no_seri_ring", ignoreDuplicates: true });
            if (error) throw error;
            alert(`Restore selesai.\n\nData dalam backup: ${backup.data.length}\nData diproses: ${rows.length}`);
        } catch (error) { alert(explainError(error, "File tidak dapat direstore.")); }
        finally { event.target.value = ""; }
    };
    reader.readAsText(file);
}

function init() {
    if (!setupSupabase()) return;
    document.getElementById("addButton")?.addEventListener("click", showAddForm);
    document.getElementById("searchButton")?.addEventListener("click", searchLivestock);
    document.getElementById("allButton")?.addEventListener("click", showAllLivestock);
    document.getElementById("backupButton")?.addEventListener("click", backupData);
    document.getElementById("restoreButton")?.addEventListener("click", selectRestoreFile);
    document.getElementById("restoreFile")?.addEventListener("change", restoreData);
    document.getElementById("searchRing")?.addEventListener("keydown", event => { if (event.key === "Enter") searchLivestock(); });
    document.getElementById("closeModal")?.addEventListener("click", () => {
    document.querySelector(".modal-overlay")?.remove();
});
}
document.addEventListener("DOMContentLoaded", init);
