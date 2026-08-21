const STORAGE_KEY = "fm_farm_keepers_data";

function getData() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function createId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
    return escapeHTML(value);
}

function formatDate(dateString) {
    if (!dateString) return "-";
    const parts = String(dateString).split("-");
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateString;
}

function showAddForm() {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <button type="button" class="close-button" id="closeModal">×</button>
                <h2>TAMBAH TERNAKAN</h2>
                <p>Masukkan data ternakan</p>
            </div>
            <form id="livestockForm">
                <div class="form-group">
                    <label>No. Seri Ring *</label>
                    <input type="text" id="ringNumber" placeholder="Contoh: FM-026-001" required>
                </div>
                <div class="form-group">
                    <label>No. Seri Ring Pendamping</label>
                    <input type="text" id="companionRing" placeholder="Contoh: FM-026-002">
                </div>
                <div class="form-group">
                    <label>Tanggal Netas *</label>
                    <input type="date" id="hatchDate" required>
                </div>
                <div class="form-group">
                    <label>Induk Jantan / Silsilah *</label>
                    <textarea id="fatherLineage" placeholder="Tuliskan silsilah induk jantan..." required></textarea>
                </div>
                <div class="form-group">
                    <label>Induk Betina / Silsilah *</label>
                    <textarea id="motherLineage" placeholder="Tuliskan silsilah induk betina..." required></textarea>
                </div>
                <div class="form-group">
                    <label>Deskripsi</label>
                    <textarea id="description" placeholder="Catatan tambahan..."></textarea>
                </div>
                <button type="submit" class="save-button">💾 SIMPAN DATA</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById("closeModal").addEventListener("click", () => modal.remove());
    document.getElementById("livestockForm").addEventListener("submit", (event) => {
        event.preventDefault();
        addLivestock(modal);
    });
}

function addLivestock(modal) {
    const ringNumber = document.getElementById("ringNumber").value.trim();
    const companionRing = document.getElementById("companionRing").value.trim();
    const hatchDate = document.getElementById("hatchDate").value;
    const fatherLineage = document.getElementById("fatherLineage").value.trim();
    const motherLineage = document.getElementById("motherLineage").value.trim();
    const description = document.getElementById("description").value.trim();

    if (!ringNumber || !hatchDate || !fatherLineage || !motherLineage) {
        alert("Mohon lengkapi data yang wajib diisi.");
        return;
    }

    const data = getData();
    const existing = data.find(item =>
        String(item.ringNumber || "").toLowerCase() === ringNumber.toLowerCase()
    );

    if (existing) {
        alert("Nomor seri ring tersebut sudah terdaftar.");
        return;
    }

    data.push({
        id: createId(),
        ringNumber,
        companionRing,
        hatchDate,
        fatherLineage,
        motherLineage,
        description,
        createdAt: new Date().toISOString()
    });

    saveData(data);
    modal.remove();
    document.getElementById("searchRing").value = ringNumber;
    alert("Data ternakan berhasil disimpan.");
}

function searchLivestock() {
    const searchInput = document.getElementById("searchRing").value.trim().toLowerCase();

    if (!searchInput) {
        alert("Masukkan nomor seri ring terlebih dahulu.");
        return;
    }

    const data = getData();
    const result = data.find(item =>
        String(item.ringNumber || "").toLowerCase() === searchInput ||
        String(item.companionRing || "").toLowerCase() === searchInput
    );

    if (!result) {
        alert("Data ternakan dengan nomor ring tersebut tidak ditemukan.");
        return;
    }

    showDetail(result);
}

function showDetail(item) {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
        <div class="modal detail-modal">
            <div class="modal-header">
                <button type="button" class="close-button" id="closeDetail">×</button>
                <p>DATA TERNAKAN</p>
                <h2>${escapeHTML(item.ringNumber)}</h2>
            </div>
            <div class="detail-list">
                <div class="detail-item"><span>No. Seri Ring</span><strong>${escapeHTML(item.ringNumber)}</strong></div>
                <div class="detail-item"><span>No. Seri Ring Pendamping</span><strong>${escapeHTML(item.companionRing || "-")}</strong></div>
                <div class="detail-item"><span>Tanggal Netas</span><strong>${formatDate(item.hatchDate)}</strong></div>
                <div class="detail-item"><span>Induk Jantan / Silsilah</span><strong>${escapeHTML(item.fatherLineage)}</strong></div>
                <div class="detail-item"><span>Induk Betina / Silsilah</span><strong>${escapeHTML(item.motherLineage)}</strong></div>
                <div class="detail-item"><span>Deskripsi</span><strong>${escapeHTML(item.description || "-")}</strong></div>
            </div>
            <div class="detail-actions">
                <button type="button" class="edit-button" id="editData">✏️ EDIT</button>
                <button type="button" class="delete-button" id="deleteData">🗑️ HAPUS</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById("closeDetail").addEventListener("click", () => modal.remove());
    document.getElementById("deleteData").addEventListener("click", () => deleteLivestock(item.id, modal));
    document.getElementById("editData").addEventListener("click", () => {
        modal.remove();
        showEditForm(item);
    });
}

function deleteLivestock(id, modal) {
    if (!confirm("Yakin ingin menghapus data ternakan ini?")) return;
    saveData(getData().filter(item => item.id !== id));
    modal.remove();
    alert("Data berhasil dihapus.");
}

function showEditForm(item) {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <button type="button" class="close-button" id="closeEdit">×</button>
                <h2>EDIT TERNAKAN</h2>
                <p>${escapeHTML(item.ringNumber)}</p>
            </div>
            <form id="editForm">
                <div class="form-group">
                    <label>No. Seri Ring *</label>
                    <input type="text" id="editRing" value="${escapeAttribute(item.ringNumber)}" required>
                </div>
                <div class="form-group">
                    <label>No. Seri Ring Pendamping</label>
                    <input type="text" id="editCompanion" value="${escapeAttribute(item.companionRing || "")}">
                </div>
                <div class="form-group">
                    <label>Tanggal Netas *</label>
                    <input type="date" id="editDate" value="${escapeAttribute(item.hatchDate)}" required>
                </div>
                <div class="form-group">
                    <label>Induk Jantan / Silsilah *</label>
                    <textarea id="editFather" required>${escapeHTML(item.fatherLineage)}</textarea>
                </div>
                <div class="form-group">
                    <label>Induk Betina / Silsilah *</label>
                    <textarea id="editMother" required>${escapeHTML(item.motherLineage)}</textarea>
                </div>
                <div class="form-group">
                    <label>Deskripsi</label>
                    <textarea id="editDescription">${escapeHTML(item.description || "")}</textarea>
                </div>
                <button type="submit" class="save-button">💾 UPDATE DATA</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById("closeEdit").addEventListener("click", () => modal.remove());
    document.getElementById("editForm").addEventListener("submit", (event) => {
        event.preventDefault();
        updateLivestock(item.id, modal);
    });
}

function updateLivestock(id, modal) {
    const data = getData();
    const ringNumber = document.getElementById("editRing").value.trim();
    const companionRing = document.getElementById("editCompanion").value.trim();
    const hatchDate = document.getElementById("editDate").value;
    const fatherLineage = document.getElementById("editFather").value.trim();
    const motherLineage = document.getElementById("editMother").value.trim();
    const description = document.getElementById("editDescription").value.trim();

    if (!ringNumber || !hatchDate || !fatherLineage || !motherLineage) {
        alert("Mohon lengkapi data yang wajib diisi.");
        return;
    }

    const duplicate = data.find(item =>
        item.id !== id &&
        String(item.ringNumber || "").toLowerCase() === ringNumber.toLowerCase()
    );

    if (duplicate) {
        alert("Nomor seri ring tersebut sudah digunakan.");
        return;
    }

    const index = data.findIndex(item => item.id === id);
    if (index === -1) return;

    data[index] = {
        ...data[index],
        ringNumber,
        companionRing,
        hatchDate,
        fatherLineage,
        motherLineage,
        description
    };

    saveData(data);
    modal.remove();
    alert("Data berhasil diperbarui.");
}

function showAllLivestock() {
    const data = getData();
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
        <div class="modal all-modal">
            <div class="modal-header">
                <button type="button" class="close-button" id="closeAll">×</button>
                <p>FM FARM KEEPERS</p>
                <h2>SEMUA TERNAKAN</h2>
            </div>
            <div class="all-summary">
                <strong id="allCount">${data.length}</strong>
                <span>Total Data Ternakan</span>
            </div>
            <div class="list-search">
                <input type="text" id="listSearch" placeholder="Cari nomor ring..." autocomplete="off">
            </div>
            <div id="livestockList"></div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById("closeAll").addEventListener("click", () => modal.remove());

    const render = (keyword = "") => {
        const q = keyword.trim().toLowerCase();
        const filtered = data.filter(item =>
            String(item.ringNumber || "").toLowerCase().includes(q) ||
            String(item.companionRing || "").toLowerCase().includes(q)
        );
        document.getElementById("allCount").textContent = filtered.length;
        renderLivestockList(filtered, modal);
    };

    render();
    document.getElementById("listSearch").addEventListener("input", event => render(event.target.value));
}

function renderLivestockList(data, parentModal) {
    const list = parentModal.querySelector("#livestockList");
    if (!data.length) {
        list.innerHTML = `
            <div class="empty-list">
                <div>🕊️</div>
                <strong>Data tidak ditemukan</strong>
                <span>Coba gunakan nomor ring lain.</span>
            </div>`;
        return;
    }

    list.innerHTML = [...data].reverse().map(item => `
        <button type="button" class="livestock-card" data-id="${escapeAttribute(item.id)}">
            <div class="livestock-main">
                <strong>${escapeHTML(item.ringNumber)}</strong>
                <span>${formatDate(item.hatchDate)}</span>
            </div>
            <div class="livestock-lineage">${escapeHTML(item.fatherLineage || "-")}</div>
            <div class="livestock-arrow">›</div>
        </button>
    `).join("");

    list.querySelectorAll(".livestock-card").forEach(card => {
        card.addEventListener("click", () => {
            const selected = getData().find(item => item.id === card.dataset.id);
            if (selected) {
                parentModal.remove();
                showDetail(selected);
            }
        });
    });
}

function backupData() {
    const data = getData();
    if (!data.length) {
        alert("Belum ada data ternakan untuk dibackup.");
        return;
    }

    const backup = {
        app: "FM FARM KEEPERS",
        version: 1,
        backupDate: new Date().toISOString(),
        totalData: data.length,
        data
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `FM-FARM-KEEPERS-BACKUP-${today}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    alert(`Backup berhasil dibuat.\n\n${data.length} data ternakan tersimpan.`);
}

function selectRestoreFile() {
    document.getElementById("restoreFile").click();
}

function restoreData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
        try {
            const backup = JSON.parse(reader.result);

            if (!backup || backup.app !== "FM FARM KEEPERS" || !Array.isArray(backup.data)) {
                alert("File backup tidak valid.");
                return;
            }

            const currentData = getData();
            const merged = [...currentData];
            let added = 0;

            backup.data.forEach(item => {
                if (!item || !item.ringNumber) return;

                const duplicate = merged.some(existing =>
                    String(existing.ringNumber || "").toLowerCase() === String(item.ringNumber).toLowerCase()
                );

                if (!duplicate) {
                    merged.push({
                        id: item.id || createId(),
                        ringNumber: String(item.ringNumber).trim(),
                        companionRing: String(item.companionRing || "").trim(),
                        hatchDate: item.hatchDate || "",
                        fatherLineage: String(item.fatherLineage || "").trim(),
                        motherLineage: String(item.motherLineage || "").trim(),
                        description: String(item.description || ""),
                        createdAt: item.createdAt || new Date().toISOString()
                    });
                    added++;
                }
            });

            saveData(merged);

            alert(
                `Restore selesai.\n\n` +
                `Data dalam backup: ${backup.data.length}\n` +
                `Data baru ditambahkan: ${added}\n` +
                `Total sekarang: ${merged.length}`
            );
        } catch {
            alert("File tidak dapat dibaca. Gunakan file backup FM FARM KEEPERS.");
        } finally {
            event.target.value = "";
        }
    };

    reader.readAsText(file);
}

document.getElementById("addButton").addEventListener("click", showAddForm);
document.getElementById("searchButton").addEventListener("click", searchLivestock);
document.getElementById("allButton").addEventListener("click", showAllLivestock);
document.getElementById("backupButton").addEventListener("click", backupData);
document.getElementById("restoreButton").addEventListener("click", selectRestoreFile);
document.getElementById("restoreFile").addEventListener("change", restoreData);

document.getElementById("searchRing").addEventListener("keydown", event => {
    if (event.key === "Enter") searchLivestock();
});
