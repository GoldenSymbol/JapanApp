import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { adminDb, adminBucket } from "../firebaseAdmin.js";
import { requireAuth, type AuthedRequest } from "../auth.js";
import { getMyTrip, createNotification } from "../context.js";
import { getUserName } from "../users.js";

export const documentsRouter = Router();

// Small, cheap document uploads only (hotel/ticket/flight/booking confirmations) — not a photo/
// video dump. 15MB comfortably covers a scanned PDF or a photographed confirmation.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const FOLDER_COLORS = ["#D9564B", "#6FA8DC", "#7FB069", "#D9A441", "#C77DBB", "#4EA8A0", "#B98AE3"];
const DEFAULT_FOLDERS = ["טיסות", "מלונות", "כרטיסים", "הזמנות"];

function tripRef(tripId: string) {
  return adminDb.collection("trips").doc(tripId);
}

async function requireTrip(req: AuthedRequest, res: any): Promise<any> {
  const trip = await getMyTrip(req.userId!);
  if (!trip) {
    res.status(404).json({ error: "no_trip" });
    return null;
  }
  return trip;
}

async function fetchFolders(tripId: string) {
  const snap = await tripRef(tripId).collection("documentFolders").orderBy("orderIndex", "asc").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
}

// A brand-new trip has no folders yet — seed the four requested defaults once, the first time
// anyone asks for the folder list. Editable/deletable afterward like any other folder; this is
// just a starting point, not a fixed set of categories.
async function ensureDefaultFolders(tripId: string) {
  const existing = await tripRef(tripId).collection("documentFolders").limit(1).get();
  if (!existing.empty) return;
  const batch = adminDb.batch();
  DEFAULT_FOLDERS.forEach((name, i) => {
    const ref = tripRef(tripId).collection("documentFolders").doc();
    batch.set(ref, { name, colorKey: FOLDER_COLORS[i % FOLDER_COLORS.length], orderIndex: i, createdAt: new Date() });
  });
  await batch.commit();
}

documentsRouter.get("/documents/folders", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  await ensureDefaultFolders(trip.id);
  const [folders, docsSnap] = await Promise.all([
    fetchFolders(trip.id),
    tripRef(trip.id).collection("documents").get(),
  ]);
  const countByFolder = new Map<string, number>();
  for (const doc of docsSnap.docs) {
    const folderId = doc.data().folderId;
    countByFolder.set(folderId, (countByFolder.get(folderId) || 0) + 1);
  }
  res.json({
    folders: folders.map((f) => ({ id: f.id, name: f.name, colorKey: f.colorKey, fileCount: countByFolder.get(f.id) || 0 })),
  });
});

documentsRouter.post("/documents/folders", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "invalid_input" });
  const existing = await fetchFolders(trip.id);
  const maxOrder = existing.reduce((m, f) => Math.max(m, f.orderIndex ?? -1), -1);
  const colorKey = FOLDER_COLORS[(maxOrder + 1) % FOLDER_COLORS.length];
  await tripRef(trip.id).collection("documentFolders").doc(randomUUID()).set({
    name, colorKey, orderIndex: maxOrder + 1, createdAt: new Date(),
  });
  res.json({ folders: await fetchFolders(trip.id) });
});

documentsRouter.patch("/documents/folders/:id", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "invalid_input" });
  await tripRef(trip.id).collection("documentFolders").doc(String(req.params.id)).update({ name });
  res.json({ folders: await fetchFolders(trip.id) });
});

documentsRouter.delete("/documents/folders/:id", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const folderId = String(req.params.id);
  const filesSnap = await tripRef(trip.id).collection("documents").where("folderId", "==", folderId).get();
  await Promise.all(filesSnap.docs.map((doc) => adminBucket.file(doc.data().storagePath).delete().catch(() => {})));
  const batch = adminDb.batch();
  filesSnap.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(tripRef(trip.id).collection("documentFolders").doc(folderId));
  await batch.commit();
  res.json({ folders: await fetchFolders(trip.id) });
});

documentsRouter.get("/documents/folders/:folderId/files", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  // Filtering by folderId and sorting by uploadedAt together would need a composite index —
  // sorting the (small, per-folder) result in memory instead avoids that entirely, same as the
  // rest of this app (see itinerary.ts's comment on this exact tradeoff).
  const snap = await tripRef(trip.id).collection("documents").where("folderId", "==", String(req.params.folderId)).get();
  const files = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id, fileName: d.fileName, contentType: d.contentType, size: d.size,
      uploadedByName: d.uploadedByName, uploadedAt: d.uploadedAt?.toDate?.().toISOString() ?? null,
    };
  });
  files.sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
  res.json({ files });
});

documentsRouter.post("/documents/folders/:folderId/files", requireAuth, upload.single("file"), async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const file = req.file;
  if (!file) return res.status(400).json({ error: "no_file" });
  const folderId = String(req.params.folderId);
  const folderDoc = await tripRef(trip.id).collection("documentFolders").doc(folderId).get();
  if (!folderDoc.exists) return res.status(404).json({ error: "folder_not_found" });

  const docId = randomUUID();
  // Keeping the original filename fully readable in the path (not just the doc id) makes the
  // stored object browsable/debuggable directly in the GCS console if ever needed.
  const storagePath = `trips/${trip.id}/documents/${docId}-${file.originalname.replace(/[^\w.\-]+/g, "_")}`;
  await adminBucket.file(storagePath).save(file.buffer, { contentType: file.mimetype, resumable: false });

  const uploadedByName = await getUserName(req.userId!);
  await tripRef(trip.id).collection("documents").doc(docId).set({
    folderId, fileName: file.originalname, storagePath, contentType: file.mimetype, size: file.size,
    uploadedBy: req.userId, uploadedByName, uploadedAt: new Date(),
  });
  await createNotification({
    tripId: trip.id, actorUserId: req.userId!, type: "new_document",
    titleKey: "notif.newDocument",
    titleParams: { uploader: uploadedByName || "", fileName: file.originalname },
    targetScreen: "documents",
  });
  res.json({ ok: true, id: docId });
});

async function requireOwnedFile(req: AuthedRequest, res: any, trip: any) {
  const doc = await tripRef(trip.id).collection("documents").doc(String(req.params.id)).get();
  if (!doc.exists) {
    res.status(404).json({ error: "not_found" });
    return null;
  }
  return doc;
}

// Renames the file as displayed in the app only — the underlying Storage object keeps its
// original path (which already embeds the original filename for GCS-console browsability, see
// the upload handler above). No need to move/copy the actual object for a display-name change.
documentsRouter.patch("/documents/files/:id", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const doc = await requireOwnedFile(req, res, trip);
  if (!doc) return;
  const fileName = String(req.body?.fileName || "").trim();
  if (!fileName) return res.status(400).json({ error: "invalid_input" });
  await doc.ref.update({ fileName });
  res.json({ ok: true });
});

documentsRouter.delete("/documents/files/:id", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const doc = await requireOwnedFile(req, res, trip);
  if (!doc) return;
  await adminBucket.file(doc.data()!.storagePath).delete().catch(() => {});
  await doc.ref.delete();
  res.json({ ok: true });
});

// A signed URL good for 7 days — long enough to be useful if someone pastes it into a chat to
// forward a confirmation, short enough that a copied link doesn't become a permanent, un-revocable
// public leak of a private trip document.
documentsRouter.get("/documents/files/:id/link", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const doc = await requireOwnedFile(req, res, trip);
  if (!doc) return;
  const [url] = await adminBucket.file(doc.data()!.storagePath).getSignedUrl({
    action: "read", expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ url });
});

// Streams the file bytes back through the backend (auth-gated, unlike a raw Storage URL) so the
// frontend can turn it into a real File object for navigator.share({ files: [...] }) — a native
// share sheet attachment, not just a link.
documentsRouter.get("/documents/files/:id/download", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const doc = await requireOwnedFile(req, res, trip);
  if (!doc) return;
  const d = doc.data()!;
  res.setHeader("Content-Type", d.contentType || "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(d.fileName)}"`);
  adminBucket.file(d.storagePath).createReadStream()
    .on("error", () => res.status(404).end())
    .pipe(res);
});
