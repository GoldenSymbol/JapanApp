import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api, apiUpload, apiDownload, ApiError } from '../api';
import { Drawer } from '../components/Drawer';
import { FolderIcon, DotsIcon, TrashIcon, ShareIcon, LinkIcon, UploadIcon, FileIcon, EditIcon } from '../components/Icons';

interface FolderEntry { id: string; name: string; colorKey: string; fileCount: number; }
interface FileEntry { id: string; fileName: string; contentType: string; size: number; uploadedByName: string; uploadedAt: string; }

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function Documents() {
  const [folders, setFolders] = useState<FolderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [filesByFolder, setFilesByFolder] = useState<Record<string, FileEntry[]>>({});
  const [uploadingFolderId, setUploadingFolderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetFolder = useRef<string | null>(null);

  const [menuFile, setMenuFile] = useState<FileEntry | null>(null);
  const [busyAction, setBusyAction] = useState(false);
  const [toast, setToast] = useState('');

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }

  async function refreshFolders() {
    const data = await api('/documents/folders');
    setFolders(data.folders);
  }
  async function refreshFiles(folderId: string) {
    const data = await api(`/documents/folders/${folderId}/files`);
    setFilesByFolder((f) => ({ ...f, [folderId]: data.files }));
  }

  useEffect(() => {
    refreshFolders().finally(() => setLoading(false));
  }, []);

  function toggleFolder(id: string) {
    if (editing) return;
    if (openFolderId === id) { setOpenFolderId(null); return; }
    setOpenFolderId(id);
    if (!filesByFolder[id]) refreshFiles(id);
  }

  async function addFolder() {
    if (!newFolderName.trim()) return;
    await api('/documents/folders', { method: 'POST', json: { name: newFolderName.trim() } });
    setNewFolderName('');
    setAdding(false);
    await refreshFolders();
  }
  function flushRename(id: string) {
    const value = nameDrafts[id];
    if (value === undefined || !value.trim()) return;
    api(`/documents/folders/${id}`, { method: 'PATCH', json: { name: value.trim() } }).then(refreshFolders);
  }
  async function deleteFolder(id: string) {
    setConfirmDeleteId(null);
    if (openFolderId === id) setOpenFolderId(null);
    await api(`/documents/folders/${id}`, { method: 'DELETE' });
    await refreshFolders();
  }

  function startUpload(folderId: string) {
    uploadTargetFolder.current = folderId;
    fileInputRef.current?.click();
  }
  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const folderId = uploadTargetFolder.current;
    e.target.value = '';
    if (!file || !folderId) return;
    setUploadingFolderId(folderId);
    try {
      const form = new FormData();
      form.append('file', file);
      await apiUpload(`/documents/folders/${folderId}/files`, form);
      await Promise.all([refreshFolders(), refreshFiles(folderId)]);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'שגיאה בהעלאת הקובץ');
    } finally {
      setUploadingFolderId(null);
    }
  }

  async function deleteFile(file: FileEntry, folderId: string) {
    setMenuFile(null);
    await api(`/documents/files/${file.id}`, { method: 'DELETE' });
    await Promise.all([refreshFolders(), refreshFiles(folderId)]);
  }

  async function shareFile(file: FileEntry) {
    setBusyAction(true);
    try {
      const blob = await apiDownload(`/documents/files/${file.id}/download`);
      const webFile = new File([blob], file.fileName, { type: file.contentType });
      const canShareFiles = (navigator as any).canShare?.({ files: [webFile] });
      if (canShareFiles) {
        await navigator.share({ files: [webFile], title: file.fileName });
      } else if (navigator.share) {
        const { url } = await api(`/documents/files/${file.id}/link`);
        await navigator.share({ title: file.fileName, url });
      } else {
        const { url } = await api(`/documents/files/${file.id}/link`);
        await navigator.clipboard.writeText(url);
        showToast('השיתוף לא נתמך בדפדפן זה — הקישור הועתק');
      }
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') showToast('שגיאה בשיתוף הקובץ');
    } finally {
      setBusyAction(false);
      setMenuFile(null);
    }
  }

  async function copyLink(file: FileEntry) {
    setBusyAction(true);
    try {
      const { url } = await api(`/documents/files/${file.id}/link`);
      await navigator.clipboard.writeText(url);
      showToast('הקישור הועתק');
    } catch {
      showToast('שגיאה בהעתקת הקישור');
    } finally {
      setBusyAction(false);
      setMenuFile(null);
    }
  }

  function startRename(file: FileEntry) {
    setRenameValue(file.fileName);
    setRenaming(true);
  }
  async function saveRename(folderId: string) {
    if (!menuFile || !renameValue.trim()) return;
    setBusyAction(true);
    try {
      await api(`/documents/files/${menuFile.id}`, { method: 'PATCH', json: { fileName: renameValue.trim() } });
      await refreshFiles(folderId);
    } catch {
      showToast('שגיאה בשינוי השם');
    } finally {
      setBusyAction(false);
      setMenuFile(null);
      setRenaming(false);
    }
  }

  // Preview uses the same signed URL as "copy link" — an <img>/<iframe> can't carry an
  // Authorization header, so the backend's own auth-gated /download route isn't usable here.
  async function openPreview(file: FileEntry) {
    setPreviewFile(file);
    setPreviewLoading(true);
    try {
      const { url } = await api(`/documents/files/${file.id}/link`);
      setPreviewUrl(url);
    } catch {
      showToast('שגיאה בפתיחת הקובץ');
      setPreviewFile(null);
    } finally {
      setPreviewLoading(false);
    }
  }
  function closePreview() {
    setPreviewFile(null);
    setPreviewUrl('');
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '6px 0 calc(102px + env(safe-area-inset-bottom))' }}>
      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={onFileChosen} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '12px 22px 20px' }}>
        <div>
          <div style={{ font: "600 30px/1.15 'Noto Sans Hebrew',sans-serif", letterSpacing: '-.5px' }}>מסמכי הטיול</div>
          <div style={{ font: "400 12.5px/1.4 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 7 }}>
            {folders.length} תיקיות
          </div>
        </div>
        <div className="pill" onClick={() => { setEditing((v) => !v); setOpenFolderId(null); }}
          style={{ cursor: 'pointer', border: `1px solid ${editing ? 'var(--accent)' : 'var(--border)'}`, color: editing ? 'var(--accent)' : 'var(--text)', padding: '8px 14px' }}>
          {editing ? 'סיום' : 'עריכה'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 22px' }}>
        {!loading && folders.length === 0 && !editing && (
          <div style={{ border: '1px dashed var(--border)', borderRadius: 18, padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ font: "600 16px/1.4 'Noto Sans Hebrew',sans-serif" }}>עוד אין תיקיות מסמכים</div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {folders.map((f) => (
            <motion.div key={f.id} layout
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              className="card" style={{ background: 'var(--card)', padding: 0, overflow: 'hidden' }}>

              {editing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16 }}>
                  <div style={{ width: 38, height: 38, flex: 'none', borderRadius: 12, background: f.colorKey, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <FolderIcon />
                  </div>
                  <input className="field" style={{ flex: 1, fontWeight: 600 }}
                    value={nameDrafts[f.id] ?? f.name}
                    onChange={(e) => setNameDrafts((d) => ({ ...d, [f.id]: e.target.value }))}
                    onBlur={() => flushRename(f.id)} />
                  <div onClick={() => setConfirmDeleteId(f.id)} style={{ color: 'var(--danger)', cursor: 'pointer', padding: 8 }}>
                    <TrashIcon />
                  </div>
                </div>
              ) : (
                <>
                  <div onClick={() => toggleFolder(f.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, cursor: 'pointer' }}>
                    <div style={{ width: 44, height: 44, flex: 'none', borderRadius: 13, background: f.colorKey, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <FolderIcon />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: "600 16px 'Noto Sans Hebrew',sans-serif" }}>{f.name}</div>
                      <div style={{ font: "400 12px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 3 }}>{f.fileCount} קבצים</div>
                    </div>
                    <div style={{ color: 'var(--text-dim)', transform: openFolderId === f.id ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>‹</div>
                  </div>

                  <AnimatePresence initial={false}>
                    {openFolderId === f.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-soft)' }}>
                          <div className="btn btn-outline" style={{ marginTop: 14, textAlign: 'center', padding: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: uploadingFolderId === f.id ? 0.6 : 1 }}
                            onClick={() => startUpload(f.id)}>
                            <UploadIcon /> {uploadingFolderId === f.id ? 'מעלה...' : 'העלאת קובץ'}
                          </div>

                          {(filesByFolder[f.id] || []).length === 0 ? (
                            <div style={{ font: "400 12.5px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', textAlign: 'center', padding: '18px 0 4px' }}>
                              אין עדיין קבצים בתיקייה
                            </div>
                          ) : (
                            <div style={{ marginTop: 10 }}>
                              {(filesByFolder[f.id] || []).map((file) => (
                                <div key={file.id} onClick={() => openPreview(file)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderTop: '1px solid var(--border-soft)', cursor: 'pointer' }}>
                                  <div style={{ color: 'var(--text-dim)', flex: 'none' }}><FileIcon /></div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ font: "500 13.5px 'Noto Sans Hebrew',sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.fileName}</div>
                                    <div style={{ font: "400 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 2 }}>{fmtDate(file.uploadedAt)}</div>
                                  </div>
                                  <div onClick={(e) => { e.stopPropagation(); setMenuFile(file); }} style={{ color: 'var(--text-dim)', cursor: 'pointer', padding: 8, flex: 'none' }}>
                                    <DotsIcon />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {editing && !adding && (
          <div className="btn btn-ghost" style={{ borderStyle: 'dashed', textAlign: 'center', padding: 18, borderRadius: 20 }} onClick={() => setAdding(true)}>
            + הוסף תיקייה
          </div>
        )}
        {editing && adding && (
          <div className="card" style={{ border: '1px dashed var(--border)', background: 'transparent' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <input className="field" placeholder="שם התיקייה" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addFolder()} />
              <div style={{ display: 'flex', gap: 7 }}>
                <div className="btn btn-accent" style={{ flex: 1, textAlign: 'center' }} onClick={addFolder}>הוסף</div>
                <div className="btn btn-outline" style={{ flex: 1, textAlign: 'center' }} onClick={() => { setAdding(false); setNewFolderName(''); }}>ביטול</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Per-file action menu */}
      <Drawer open={!!menuFile} onClose={() => { setMenuFile(null); setRenaming(false); }}>
        {menuFile && !renaming && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ font: "600 14px 'Noto Sans Hebrew',sans-serif", padding: '0 4px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{menuFile.fileName}</div>
            <div onClick={() => !busyAction && shareFile(menuFile)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 4px', cursor: 'pointer', opacity: busyAction ? 0.5 : 1 }}>
              <ShareIcon /><span style={{ font: "500 14.5px 'Noto Sans Hebrew',sans-serif" }}>שיתוף</span>
            </div>
            <div onClick={() => !busyAction && copyLink(menuFile)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 4px', cursor: 'pointer', opacity: busyAction ? 0.5 : 1 }}>
              <LinkIcon /><span style={{ font: "500 14.5px 'Noto Sans Hebrew',sans-serif" }}>העתקת קישור</span>
            </div>
            <div onClick={() => !busyAction && startRename(menuFile)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 4px', cursor: 'pointer', opacity: busyAction ? 0.5 : 1 }}>
              <EditIcon /><span style={{ font: "500 14.5px 'Noto Sans Hebrew',sans-serif" }}>שינוי שם</span>
            </div>
            <div onClick={() => deleteFile(menuFile, openFolderId!)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 4px', cursor: 'pointer', color: 'var(--danger)' }}>
              <TrashIcon /><span style={{ font: "500 14.5px 'Noto Sans Hebrew',sans-serif" }}>מחיקה</span>
            </div>
          </div>
        )}
        {menuFile && renaming && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ font: "600 14px 'Noto Sans Hebrew',sans-serif", padding: '0 4px' }}>שינוי שם קובץ</div>
            <input className="field" value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveRename(openFolderId!)} autoFocus />
            <div style={{ display: 'flex', gap: 7 }}>
              <div className="btn btn-accent" style={{ flex: 1, textAlign: 'center', opacity: busyAction ? 0.6 : 1 }} onClick={() => !busyAction && saveRename(openFolderId!)}>שמירה</div>
              <div className="btn btn-outline" style={{ flex: 1, textAlign: 'center' }} onClick={() => setRenaming(false)}>ביטול</div>
            </div>
          </div>
        )}
      </Drawer>

      {/* File preview */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(12px + env(safe-area-inset-top)) 18px 12px',
              borderBottom: '1px solid var(--border-soft)', flex: 'none',
            }}>
              <div onClick={closePreview} style={{ cursor: 'pointer', fontSize: 20, color: 'var(--text-dim)', padding: 4 }}>✕</div>
              <div style={{ font: "600 14px 'Noto Sans Hebrew',sans-serif", flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {previewFile.fileName}
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
              {previewLoading ? (
                <div style={{ font: "400 13px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)' }}>טוען...</div>
              ) : previewFile.contentType?.startsWith('image/') ? (
                <img src={previewUrl} alt={previewFile.fileName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : previewFile.contentType === 'application/pdf' ? (
                <iframe src={previewUrl} title={previewFile.fileName} style={{ width: '100%', height: '100%', border: 'none' }} />
              ) : (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <div style={{ font: "400 13px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginBottom: 16 }}>
                    אין תצוגה מקדימה זמינה לסוג הקובץ הזה
                  </div>
                  <a href={previewUrl} target="_blank" rel="noreferrer" className="btn btn-accent" style={{ padding: '11px 22px', display: 'inline-block' }}>
                    פתיחת הקובץ
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm folder delete */}
      <AnimatePresence>
        {confirmDeleteId && (
          <motion.div className="drawer-overlay" style={{ alignItems: 'center' }} onClick={() => setConfirmDeleteId(null)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <motion.div onClick={(e) => e.stopPropagation()}
              style={{ width: 'calc(100% - 52px)', maxWidth: 400, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 22, padding: 22 }}
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: 'spring', damping: 26, stiffness: 380 }}>
              <div style={{ font: "600 18px/1.3 'Noto Sans Hebrew',sans-serif" }}>למחוק את התיקייה?</div>
              <div style={{ font: "400 12.5px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 9 }}>
                כל הקבצים שבתוכה יימחקו לצמיתות עבור כל משתתפי הטיול.
              </div>
              <div style={{ display: 'flex', gap: 9, marginTop: 20 }}>
                <div className="btn btn-outline" style={{ flex: 1, textAlign: 'center' }} onClick={() => setConfirmDeleteId(null)}>ביטול</div>
                <div className="btn btn-accent" style={{ flex: 1, textAlign: 'center', background: 'var(--danger)' }} onClick={() => deleteFolder(confirmDeleteId)}>מחק תיקייה</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            style={{
              position: 'fixed', bottom: 'calc(96px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)',
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 999, padding: '10px 18px',
              font: "500 12.5px 'Noto Sans Hebrew',sans-serif", boxShadow: '0 8px 24px rgba(0,0,0,.3)', zIndex: 60, whiteSpace: 'nowrap',
            }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
