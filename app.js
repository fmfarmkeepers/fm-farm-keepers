/* =========================================================
   FM FARM KEEPERS
   APP.JS — SUPABASE + FOTO MERPATI
   ========================================================= */

const SUPABASE_URL =
    "https://jiemhfnmjqhmaqmjurtt.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_2_9aMfcWqdp4sjbBVW5uGg_lGbByF2r";

const TABLE = "ternakan";
const PHOTO_BUCKET = "pigeon-photos";

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

const ALLOWED_PHOTO_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
];

let db = null;


/* =========================================================
   SUPABASE
   ========================================================= */

function setupSupabase() {

    if (!window.supabase?.createClient) {

        alert(
            "Library Supabase belum dimuat.\n\n" +
            "Pastikan index.html memuat Supabase sebelum app.js."
        );

        return false;
    }

    db = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

    return true;
}


/* =========================================================
   HELPER
   ========================================================= */

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


function formatDate(value) {

    if (!value) return "-";

    const parts = String(value).split("-");

    if (parts.length === 3) {

        return (
            parts[2] +
            "-" +
            parts[1] +
            "-" +
            parts[0]
        );
    }

    return value;
}


function explainError(error, fallback) {

    if (!error) return fallback;

    console.error(error);

    if (error.message) {

        return fallback +
            "\n\nDetail:\n" +
            error.message;
    }

    return fallback;
}


/* =========================================================
   KONVERSI DATABASE
   ========================================================= */

function toItem(row) {

    return {

        id: row.id,

        ringNumber:
            row.no_seri_ring || "",

        companionRing:
            row.no_seri_ring_pendamping || "",

        hatchDate:
            row.tanggal_netas || "",

        fatherLineage:
            row.induk_jantan_silsilah || "",

        motherLineage:
            row.induk_betina_silsilah || "",

        description:
            row.deskripsi || "",

        photoUrl:
            row.photo_url || "",

        createdAt:
            row.created_at || ""
    };
}


function toRow(item) {

    return {

        no_seri_ring:
            String(item.ringNumber || "").trim(),

        no_seri_ring_pendamping:
            String(item.companionRing || "").trim(),

        tanggal_netas:
            item.hatchDate || null,

        induk_jantan_silsilah:
            String(item.fatherLineage || "").trim(),

        induk_betina_silsilah:
            String(item.motherLineage || "").trim(),

        deskripsi:
            String(item.description || "").trim(),

        photo_url:
            item.photoUrl || null
    };
}


/* =========================================================
   FOTO
   ========================================================= */

function validatePhoto(file) {

    if (!file) return;

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {

        throw new Error(
            "Format foto tidak didukung.\n\n" +
            "Gunakan JPG, PNG, atau WEBP."
        );
    }

    if (file.size > MAX_PHOTO_SIZE) {

        throw new Error(
            "Ukuran foto terlalu besar.\n\n" +
            "Maksimal ukuran foto adalah 5 MB."
        );
    }
}


function createSafeFileName(ringNumber) {

    const cleanRing =
        String(ringNumber || "merpati")
            .replace(/[^a-zA-Z0-9_-]/g, "_")
            .toLowerCase();

    const random =
        Date.now() +
        "-" +
        Math.random()
            .toString(36)
            .substring(2, 8);

    return (
        cleanRing +
        "-" +
        random +
        ".jpg"
    );
}


async function uploadPigeonPhoto(file, ringNumber) {

    validatePhoto(file);

    const fileName =
        createSafeFileName(ringNumber);

    const filePath =
        "ternakan/" + fileName;

    const { error } =
        await db.storage
            .from(PHOTO_BUCKET)
            .upload(
                filePath,
                file,
                {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type
                }
            );

    if (error) {

        throw new Error(
            "Foto gagal diupload.\n\n" +
            error.message
        );
    }

    const { data } =
        db.storage
            .from(PHOTO_BUCKET)
            .getPublicUrl(filePath);

    if (!data?.publicUrl) {

        throw new Error(
            "URL foto tidak berhasil dibuat."
        );
    }

    return data.publicUrl;
}


function getStoragePathFromUrl(photoUrl) {

    if (!photoUrl) return null;

    try {

        const marker =
            `/storage/v1/object/public/${PHOTO_BUCKET}/`;

        const index =
            photoUrl.indexOf(marker);

        if (index === -1) return null;

        return decodeURIComponent(
            photoUrl.substring(
                index + marker.length
            )
        );

    } catch (error) {

        console.error(
            "Gagal membaca storage path:",
            error
        );

        return null;
    }
}


async function deletePigeonPhotoByUrl(photoUrl) {

    const path =
        getStoragePathFromUrl(photoUrl);

    if (!path) return;

    const { error } =
        await db.storage
            .from(PHOTO_BUCKET)
            .remove([path]);

    if (error) {

        console.warn(
            "Foto tidak berhasil dihapus:",
            error
        );
    }
}


/* =========================================================
   GET DATA
   ========================================================= */

async function getData() {

    const {
        data,
        error
    } = await db
        .from(TABLE)
        .select("*")
        .order(
            "created_at",
            {
                ascending: false
            }
        );

    if (error) throw error;

    return (data || []).map(toItem);
}


/* =========================================================
   MODAL
   ========================================================= */

function closeModal(id) {

    document
        .getElementById(id)
        ?.remove();
}


/* =========================================================
   TAMBAH TERNAKAN
   ========================================================= */

function showAddForm() {

    const modal =
        document.createElement("div");

    modal.className =
        "modal-overlay";

    modal.id =
        "addModal";

    modal.innerHTML = `

        <div class="modal">

            <div class="modal-header">

                <button
                    type="button"
                    class="close-button"
                    id="closeAdd"
                >×</button>

                <h2>TAMBAH TERNAKAN</h2>

                <p>
                    Masukkan data ternakan
                </p>

            </div>


            <form id="livestockForm">


                <div class="form-group">

                    <label>
                        No. Seri Ring *
                    </label>

                    <input
                        type="text"
                        id="ringNumber"
                        required
                        autocomplete="off"
                        placeholder="Contoh: FM-0156"
                    >

                </div>


                <div class="form-group">

                    <label>
                        No. Seri Ring Pendamping
                    </label>

                    <input
                        type="text"
                        id="companionRing"
                        autocomplete="off"
                        placeholder="Opsional"
                    >

                </div>


                <div class="form-group">

                    <label>
                        Tanggal Netas *
                    </label>

                    <input
                        type="date"
                        id="hatchDate"
                        required
                    >

                </div>


                <div class="form-group">

                    <label>
                        Induk Jantan / Silsilah *
                    </label>

                    <textarea
                        id="fatherLineage"
                        required
                        placeholder="Contoh: PANCASONA"
                    ></textarea>

                </div>


                <div class="form-group">

                    <label>
                        Induk Betina / Silsilah *
                    </label>

                    <textarea
                        id="motherLineage"
                        required
                        placeholder="Contoh: ANAK MERAPI"
                    ></textarea>

                </div>


                <div class="form-group">

                    <label>
                        Deskripsi
                    </label>

                    <textarea
                        id="description"
                        placeholder="Keterangan ternakan..."
                    ></textarea>

                </div>


                <div class="form-group">

                    <label>
                        Foto Merpati
                    </label>

                    <input
                        type="file"
                        id="pigeonPhoto"
                        accept="image/jpeg,image/png,image/webp"
                    >

                    <small>
                        JPG / PNG / WEBP — Maksimal 5 MB
                    </small>

                    <div
                        id="photoPreview"
                        style="margin-top:10px;"
                    ></div>

                </div>


                <button
                    type="submit"
                    class="save-button"
                >
                    💾 SIMPAN DATA
                </button>

            </form>

        </div>
    `;


    document.body.appendChild(modal);


    document
        .getElementById("closeAdd")
        .addEventListener(
            "click",
            () => modal.remove()
        );


    const photoInput =
        document.getElementById(
            "pigeonPhoto"
        );


    photoInput.addEventListener(
        "change",
        () => {

            const file =
                photoInput.files?.[0];

            const preview =
                document.getElementById(
                    "photoPreview"
                );


            if (!file) {

                preview.innerHTML = "";

                return;
            }


            try {

                validatePhoto(file);


                const objectUrl =
                    URL.createObjectURL(file);


                preview.innerHTML = `

                    <small>
                        Preview foto:
                    </small>

                    <img
                        src="${escapeAttribute(objectUrl)}"
                        alt="Preview"
                        style="
                            display:block;
                            width:100%;
                            max-width:240px;
                            height:180px;
                            object-fit:cover;
                            border-radius:12px;
                            margin-top:8px;
                        "
                    >

                `;

            } catch (error) {

                photoInput.value = "";

                preview.innerHTML = "";

                alert(error.message);
            }
        }
    );


    document
        .getElementById("livestockForm")
        .addEventListener(
            "submit",
            event => {

                event.preventDefault();

                addLivestock(modal);
            }
        );
}


/* =========================================================
   SIMPAN TERNAKAN
   ========================================================= */

async function addLivestock(modal) {

    const button =
        modal.querySelector(
            'button[type="submit"]'
        );


    const item = {

        ringNumber:
            document
                .getElementById("ringNumber")
                .value
                .trim(),

        companionRing:
            document
                .getElementById("companionRing")
                .value
                .trim(),

        hatchDate:
            document
                .getElementById("hatchDate")
                .value,

        fatherLineage:
            document
                .getElementById("fatherLineage")
                .value
                .trim(),

        motherLineage:
            document
                .getElementById("motherLineage")
                .value
                .trim(),

        description:
            document
                .getElementById("description")
                .value
                .trim(),

        photoUrl:
            ""
    };


    const photo =
        document
            .getElementById("pigeonPhoto")
            ?.files?.[0];


    if (
        !item.ringNumber ||
        !item.hatchDate ||
        !item.fatherLineage ||
        !item.motherLineage
    ) {

        alert(
            "Mohon lengkapi semua data yang wajib diisi."
        );

        return;
    }


    try {

        if (photo) {

            validatePhoto(photo);
        }


        if (button) {

            button.disabled = true;

            button.textContent =
                "⏳ MENYIMPAN...";
        }


        /*
         * Upload foto terlebih dahulu
         */
        if (photo) {

            item.photoUrl =
                await uploadPigeonPhoto(
                    photo,
                    item.ringNumber
                );
        }


        /*
         * Simpan ke database
         */
        const {
            error
        } = await db
            .from(TABLE)
            .insert(
                toRow(item)
            );


        if (error) {

            /*
             * Kalau database gagal,
             * hapus foto yang baru diupload.
             */
            if (item.photoUrl) {

                await deletePigeonPhotoByUrl(
                    item.photoUrl
                );
            }


            if (
                error.code ===
                "23505"
            ) {

                throw new Error(
                    "Nomor seri ring tersebut sudah terdaftar."
                );
            }


            throw error;
        }


        modal.remove();


        alert(
            "Data ternakan berhasil disimpan."
        );


    } catch (error) {

        alert(
            explainError(
                error,
                "Data ternakan gagal disimpan."
            )
        );


        if (button) {

            button.disabled = false;

            button.textContent =
                "💾 SIMPAN DATA";
        }
    }
}


/* =========================================================
   CARI TERNAKAN
   ========================================================= */

async function searchLivestock() {

    const input =
        document.getElementById(
            "searchRing"
        );

    const ring =
        input?.value.trim();


    if (!ring) {

        alert(
            "Masukkan nomor seri ring terlebih dahulu."
        );

        return;
    }


    try {

        const {
            data,
            error
        } = await db
            .from(TABLE)
            .select("*")
            .eq(
                "no_seri_ring",
                ring
            )
            .maybeSingle();


        if (error) {

            throw error;
        }


        if (!data) {

            alert(
                "Data ternakan dengan nomor ring:\n\n" +
                ring +
                "\n\nTidak ditemukan."
            );

            return;
        }


        showDetail(
            toItem(data)
        );


    } catch (error) {

        alert(
            explainError(
                error,
                "Gagal mencari data ternakan."
            )
        );
    }
}


/* =========================================================
   DETAIL TERNAKAN
   ========================================================= */

function showDetail(item) {

    const modal =
        document.createElement("div");

    modal.className =
        "modal-overlay";

    modal.id =
        "detailModal";


    const photoHTML =
        item.photoUrl
            ? `

                <div
                    style="
                        margin:15px 0;
                        text-align:center;
                    "
                >

                    <img
                        src="${escapeAttribute(item.photoUrl)}"
                        alt="Foto ${escapeAttribute(item.ringNumber)}"
                        style="
                            width:100%;
                            max-width:420px;
                            height:280px;
                            object-fit:cover;
                            border-radius:16px;
                            display:block;
                            margin:auto;
                        "
                        onerror="
                            this.style.display='none'
                        "
                    >

                </div>

            `
            : `

                <div
                    style="
                        padding:25px;
                        text-align:center;
                        opacity:.6;
                    "
                >
                    🕊️
                    <br>
                    Belum ada foto
                </div>

            `;


    modal.innerHTML = `

        <div class="modal">


            <div class="modal-header">

                <button
                    type="button"
                    class="close-button"
                    id="closeDetail"
                >×</button>

                <p>
                    DATA TERNAKAN
                </p>

                <h2>
                    ${escapeHTML(item.ringNumber)}
                </h2>

            </div>


            ${photoHTML}


            <div class="detail-list">


                <div class="detail-item">

                    <span>
                        No. Seri Ring
                    </span>

                    <strong>
                        ${escapeHTML(
                            item.ringNumber
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        No. Seri Ring Pendamping
                    </span>

                    <strong>
                        ${escapeHTML(
                            item.companionRing || "-"
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Tanggal Netas
                    </span>

                    <strong>
                        ${formatDate(
                            item.hatchDate
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Induk Jantan / Silsilah
                    </span>

                    <strong>
                        ${escapeHTML(
                            item.fatherLineage
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Induk Betina / Silsilah
                    </span>

                    <strong>
                        ${escapeHTML(
                            item.motherLineage
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Deskripsi
                    </span>

                    <strong>
                        ${escapeHTML(
                            item.description || "-"
                        )}
                    </strong>

                </div>


            </div>


            <div class="detail-actions">

                <button
                    type="button"
                    class="edit-button"
                    id="editData"
                >
                    ✏️ EDIT
                </button>


                <button
                    type="button"
                    class="delete-button"
                    id="deleteData"
                >
                    🗑️ HAPUS
                </button>

            </div>


        </div>
    `;


    document.body.appendChild(modal);


    document
        .getElementById("closeDetail")
        .addEventListener(
            "click",
            () => modal.remove()
        );


    document
        .getElementById("deleteData")
        .addEventListener(
            "click",
            () =>
                deleteLivestock(
                    item.id,
                    item.photoUrl,
                    modal
                )
        );


    document
        .getElementById("editData")
        .addEventListener(
            "click",
            () => {

                modal.remove();

                showEditForm(item);
            }
        );
}


/* =========================================================
   HAPUS
   ========================================================= */

async function deleteLivestock(
    id,
    photoUrl,
    modal
) {

    if (
        !confirm(
            "Yakin ingin menghapus data ternakan ini?"
        )
    ) {

        return;
    }


    try {

        const {
            error
        } = await db
            .from(TABLE)
            .delete()
            .eq(
                "id",
                id
            );


        if (error) {

            throw error;
        }


        /*
         * Hapus foto dari Storage.
         * Jika policy DELETE belum ada,
         * database tetap sudah berhasil dihapus.
         */
        if (photoUrl) {

            await deletePigeonPhotoByUrl(
                photoUrl
            );
        }


        modal.remove();


        alert(
            "Data ternakan berhasil dihapus."
        );


    } catch (error) {

        alert(
            explainError(
                error,
                "Data ternakan tidak dapat dihapus."
            )
        );
    }
}


/* =========================================================
   EDIT
   ========================================================= */

function showEditForm(item) {

    const modal =
        document.createElement("div");

    modal.className =
        "modal-overlay";

    modal.id =
        "editModal";


    const currentPhoto =
        item.photoUrl
            ? `

                <div
                    id="currentPhotoBox"
                    style="margin-top:10px;"
                >

                    <small>
                        Foto saat ini:
                    </small>

                    <img
                        src="${escapeAttribute(item.photoUrl)}"
                        alt="Foto saat ini"
                        style="
                            display:block;
                            width:100%;
                            max-width:240px;
                            height:180px;
                            object-fit:cover;
                            border-radius:12px;
                            margin-top:8px;
                        "
                        onerror="
                            this.style.display='none'
                        "
                    >

                </div>

            `
            : "";


    modal.innerHTML = `

        <div class="modal">


            <div class="modal-header">

                <button
                    type="button"
                    class="close-button"
                    id="closeEdit"
                >×</button>

                <h2>
                    EDIT TERNAKAN
                </h2>

                <p>
                    ${escapeHTML(
                        item.ringNumber
                    )}
                </p>

            </div>


            <form id="editForm">


                <div class="form-group">

                    <label>
                        No. Seri Ring *
                    </label>

                    <input
                        type="text"
                        id="editRing"
                        value="${escapeAttribute(
                            item.ringNumber
                        )}"
                        required
                    >

                </div>


                <div class="form-group">

                    <label>
                        No. Seri Ring Pendamping
                    </label>

                    <input
                        type="text"
                        id="editCompanion"
                        value="${escapeAttribute(
                            item.companionRing
                        )}"
                    >

                </div>


                <div class="form-group">

                    <label>
                        Tanggal Netas *
                    </label>

                    <input
                        type="date"
                        id="editDate"
                        value="${escapeAttribute(
                            item.hatchDate
                        )}"
                        required
                    >

                </div>


                <div class="form-group">

                    <label>
                        Induk Jantan / Silsilah *
                    </label>

                    <textarea
                        id="editFather"
                        required
                    >${escapeHTML(
                        item.fatherLineage
                    )}</textarea>

                </div>


                <div class="form-group">

                    <label>
                        Induk Betina / Silsilah *
                    </label>

                    <textarea
                        id="editMother"
                        required
                    >${escapeHTML(
                        item.motherLineage
                    )}</textarea>

                </div>


                <div class="form-group">

                    <label>
                        Deskripsi
                    </label>

                    <textarea
                        id="editDescription"
                    >${escapeHTML(
                        item.description
                    )}</textarea>

                </div>


                <div class="form-group">

                    <label>
                        Ganti Foto Merpati
                    </label>

                    <input
                        type="file"
                        id="editPigeonPhoto"
                        accept="image/jpeg,image/png,image/webp"
                    >

                    <small>
                        Kosongkan jika tidak ingin
                        mengganti foto.
                        Maksimal 5 MB.
                    </small>


                    ${currentPhoto}


                    <div
                        id="editPhotoPreview"
                        style="margin-top:10px;"
                    ></div>

                </div>


                <button
                    type="submit"
                    class="save-button"
                >
                    💾 UPDATE DATA
                </button>


            </form>


        </div>
    `;


    document.body.appendChild(modal);


    document
        .getElementById("closeEdit")
        .addEventListener(
            "click",
            () => modal.remove()
        );


    const photoInput =
        document.getElementById(
            "editPigeonPhoto"
        );


    photoInput.addEventListener(
        "change",
        () => {

            const file =
                photoInput.files?.[0];

            const preview =
                document.getElementById(
                    "editPhotoPreview"
                );


            if (!file) {

                preview.innerHTML = "";

                return;
            }


            try {

                validatePhoto(file);


                const objectUrl =
                    URL.createObjectURL(file);


                preview.innerHTML = `

                    <small>
                        Preview foto baru:
                    </small>

                    <img
                        src="${escapeAttribute(objectUrl)}"
                        alt="Preview foto baru"
                        style="
                            width:100%;
                            max-width:240px;
                            height:180px;
                            object-fit:cover;
                            display:block;
                            border-radius:12px;
                            margin-top:8px;
                        "
                    >

                `;


            } catch (error) {

                photoInput.value = "";

                preview.innerHTML = "";

                alert(error.message);
            }
        }
    );


    document
        .getElementById("editForm")
        .addEventListener(
            "submit",
            event => {

                event.preventDefault();

                updateLivestock(
                    item,
                    modal
                );
            }
        );
}


/* =========================================================
   UPDATE DATA
   ========================================================= */

async function updateLivestock(
    oldItem,
    modal
) {

    const button =
        modal.querySelector(
            'button[type="submit"]'
        );


    const item = {

        id:
            oldItem.id,

        ringNumber:
            document
                .getElementById("editRing")
                .value
                .trim(),

        companionRing:
            document
                .getElementById("editCompanion")
                .value
                .trim(),

        hatchDate:
            document
                .getElementById("editDate")
                .value,

        fatherLineage:
            document
                .getElementById("editFather")
                .value
                .trim(),

        motherLineage:
            document
                .getElementById("editMother")
                .value
                .trim(),

        description:
            document
                .getElementById("editDescription")
                .value
                .trim(),

        photoUrl:
            oldItem.photoUrl || ""
    };


    const newPhoto =
        document
            .getElementById(
                "editPigeonPhoto"
            )
            ?.files?.[0];


    if (
        !item.ringNumber ||
        !item.hatchDate ||
        !item.fatherLineage ||
        !item.motherLineage
    ) {

        alert(
            "Mohon lengkapi data yang wajib diisi."
        );

        return;
    }


    try {

        if (newPhoto) {

            validatePhoto(newPhoto);
        }


        if (button) {

            button.disabled = true;

            button.textContent =
                "⏳ MEMPERBARUI...";
        }


        let newPhotoUrl =
            item.photoUrl;


        /*
         * Upload foto baru
         */
        if (newPhoto) {

            newPhotoUrl =
                await uploadPigeonPhoto(
                    newPhoto,
                    item.ringNumber
                );
        }


        item.photoUrl =
            newPhotoUrl;


        /*
         * Update database
         */
        const {
            error
        } = await db
            .from(TABLE)
            .update(
                toRow(item)
            )
            .eq(
                "id",
                item.id
            );


        if (error) {

            /*
             * Jika database gagal,
             * hapus foto baru.
             */
            if (
                newPhoto &&
                newPhotoUrl &&
                newPhotoUrl !==
                    oldItem.photoUrl
            ) {

                await deletePigeonPhotoByUrl(
                    newPhotoUrl
                );
            }


            if (
                error.code ===
                "23505"
            ) {

                throw new Error(
                    "Nomor seri ring tersebut sudah digunakan oleh data lain."
                );
            }


            throw error;
        }


        /*
         * Database sudah berhasil.
         * Sekarang hapus foto lama.
         */
        if (
            newPhoto &&
            oldItem.photoUrl &&
            oldItem.photoUrl !==
                newPhotoUrl
        ) {

            await deletePigeonPhotoByUrl(
                oldItem.photoUrl
            );
        }


        modal.remove();


        alert(
            newPhoto
                ? "Data dan foto berhasil diperbarui."
                : "Data berhasil diperbarui."
        );


    } catch (error) {

        alert(
            explainError(
                error,
                "Data tidak dapat diperbarui."
            )
        );


        if (button) {

            button.disabled = false;

            button.textContent =
                "💾 UPDATE DATA";
        }
    }
}


/* =========================================================
   SEMUA TERNAKAN
   ========================================================= */

async function showAllLivestock() {

    try {

        const data =
            await getData();


        const modal =
            document.createElement("div");

        modal.className =
            "modal-overlay";

        modal.id =
            "allModal";


        modal.innerHTML = `

            <div class="modal all-modal">


                <div class="modal-header">

                    <button
                        type="button"
                        class="close-button"
                        id="closeAll"
                    >×</button>

                    <p>
                        FM FARM KEEPERS
                    </p>

                    <h2>
                        SEMUA TERNAKAN
                    </h2>

                </div>


                <div class="all-summary">

                    <strong id="allCount">
                        ${data.length}
                    </strong>

                    <span>
                        Total Data Ternakan
                    </span>

                </div>


                <div class="list-search">

                    <input
                        type="text"
                        id="listSearch"
                        placeholder="Cari nomor ring..."
                        autocomplete="off"
                    >

                </div>


                <div
                    id="livestockList"
                ></div>


            </div>
        `;


        document.body.appendChild(modal);


        document
            .getElementById("closeAll")
            .addEventListener(
                "click",
                () => modal.remove()
            );


        function render(keyword) {

            const q =
                keyword
                    .trim()
                    .toLowerCase();


            const filtered =
                data.filter(item =>

                    item.ringNumber
                        .toLowerCase()
                        .includes(q)

                    ||

                    item.companionRing
                        .toLowerCase()
                        .includes(q)

                    ||

                    item.fatherLineage
                        .toLowerCase()
                        .includes(q)

                    ||

                    item.motherLineage
                        .toLowerCase()
                        .includes(q)
                );


            document
                .getElementById(
                    "allCount"
                )
                .textContent =
                filtered.length;


            renderLivestockList(
                filtered,
                modal
            );
        }


        render("");


        document
            .getElementById(
                "listSearch"
            )
            .addEventListener(
                "input",
                event => {

                    render(
                        event.target.value
                    );
                }
            );


    } catch (error) {

        alert(
            explainError(
                error,
                "Gagal mengambil daftar ternakan."
            )
        );
    }
}


/* =========================================================
   LIST TERNAKAN
   ========================================================= */

function renderLivestockList(
    data,
    parent
) {

    const list =
        parent.querySelector(
            "#livestockList"
        );


    if (!data.length) {

        list.innerHTML = `

            <div class="empty-list">

                <div>
                    🕊️
                </div>

                <strong>
                    Data tidak ditemukan
                </strong>

                <span>
                    Coba gunakan nomor ring lain.
                </span>

            </div>
        `;

        return;
    }


    list.innerHTML =
        [...data]
            .map(item => `

                <button
                    type="button"
                    class="livestock-card"
                    data-id="${escapeAttribute(
                        item.id
                    )}"
                >


                    ${
                        item.photoUrl
                            ? `

                                <img
                                    src="${escapeAttribute(
                                        item.photoUrl
                                    )}"
                                    alt=""
                                    style="
                                        width:58px;
                                        height:58px;
                                        object-fit:cover;
                                        border-radius:12px;
                                        flex-shrink:0;
                                    "
                                    onerror="
                                        this.style.display='none'
                                    "
                                >

                            `
                            : ""
                    }


                    <div class="livestock-main">

                        <strong>
                            ${escapeHTML(
                                item.ringNumber
                            )}
                        </strong>

                        <span>
                            ${formatDate(
                                item.hatchDate
                            )}
                        </span>

                    </div>


                    <div class="livestock-lineage">

                        ${escapeHTML(
                            item.fatherLineage ||
                            "-"
                        )}

                    </div>


                    <div class="livestock-arrow">
                        ›
                    </div>


                </button>

            `)
            .join("");


    list
        .querySelectorAll(
            ".livestock-card"
        )
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    const item =
                        data.find(
                            x =>
                                String(x.id) ===
                                card.dataset.id
                        );


                    if (item) {

                        parent.remove();

                        showDetail(item);
                    }
                }
            );
        });
}


/* =========================================================
   BACKUP
   ========================================================= */

async function backupData() {

    try {

        const data =
            await getData();


        if (!data.length) {

            alert(
                "Belum ada data ternakan untuk dibackup."
            );

            return;
        }


        const backup = {

            app:
                "FM FARM KEEPERS",

            version:
                3,

            backupDate:
                new Date().toISOString(),

            totalData:
                data.length,

            data:
                data
        };


        const blob =
            new Blob(
                [
                    JSON.stringify(
                        backup,
                        null,
                        2
                    )
                ],
                {
                    type:
                        "application/json"
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            url;


        link.download =
            "FM-FARM-KEEPERS-BACKUP-" +
            new Date()
                .toISOString()
                .slice(0, 10) +
            ".json";


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        URL.revokeObjectURL(
            url
        );


        alert(
            "Backup berhasil dibuat.\n\n" +
            data.length +
            " data ternakan tersimpan."
        );


    } catch (error) {

        alert(
            explainError(
                error,
                "Backup gagal dibuat."
            )
        );
    }
}


/* =========================================================
   RESTORE
   ========================================================= */

function selectRestoreFile() {

    const input =
        document.getElementById(
            "restoreFile"
        );


    if (input) {

        input.click();
    }
}


async function restoreData(event) {

    const file =
        event.target.files?.[0];


    if (!file) return;


    try {

        const text =
            await file.text();


        const backup =
            JSON.parse(text);


        if (
            !backup ||
            backup.app !==
                "FM FARM KEEPERS" ||
            !Array.isArray(
                backup.data
            )
        ) {

            throw new Error(
                "Format backup tidak valid."
            );
        }


        const rows =
            backup.data
                .filter(
                    item =>
                        item &&
                        item.ringNumber
                )
                .map(
                    item =>
                        toRow({
                            ...item,
                            photoUrl:
                                item.photoUrl ||
                                ""
                        })
                );


        if (!rows.length) {

            alert(
                "Tidak ada data valid di file backup."
            );

            return;
        }


        const {
            error
        } = await db
            .from(TABLE)
            .upsert(
                rows,
                {
                    onConflict:
                        "no_seri_ring",
                    ignoreDuplicates:
                        true
                }
            );


        if (error) {

            throw error;
        }


        alert(
            "Restore selesai.\n\n" +
            "Data dalam backup: " +
            backup.data.length +
            "\n" +
            "Data diproses: " +
            rows.length
        );


    } catch (error) {

        alert(
            explainError(
                error,
                "File backup tidak dapat direstore."
            )
        );


    } finally {

        event.target.value = "";
    }
}


/* =========================================================
   EVENT LISTENER
   ========================================================= */

function init() {

    if (!setupSupabase()) {

        return;
    }


    /*
     * TAMBAH TERNAKAN
     */
    document
        .getElementById(
            "addButton"
        )
        ?.addEventListener(
            "click",
            showAddForm
        );


    /*
     * CARI
     */
    document
        .getElementById(
            "searchButton"
        )
        ?.addEventListener(
            "click",
            searchLivestock
        );


    /*
     * SEMUA TERNAKAN
     */
    document
        .getElementById(
            "allButton"
        )
        ?.addEventListener(
            "click",
            showAllLivestock
        );


    /*
     * BACKUP
     */
    document
        .getElementById(
            "backupButton"
        )
        ?.addEventListener(
            "click",
            backupData
        );


    /*
     * RESTORE
     */
    document
        .getElementById(
            "restoreButton"
        )
        ?.addEventListener(
            "click",
            selectRestoreFile
        );


    document
        .getElementById(
            "restoreFile"
        )
        ?.addEventListener(
            "change",
            restoreData
        );


    /*
     * ENTER DI KOLOM PENCARIAN
     */
    document
        .getElementById(
            "searchRing"
        )
        ?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    searchLivestock();
                }
            }
        );
}


/* =========================================================
   JALANKAN APLIKASI
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);