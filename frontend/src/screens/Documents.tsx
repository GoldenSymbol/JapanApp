import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api, apiUpload, apiDownload, ApiError } from '../api';
import { Drawer } from '../components/Drawer';
import { FolderIcon, DotsIcon, TrashIcon, ShareIcon, LinkIcon, UploadIcon, FileIcon, EditIcon } from '../components/Icons';
import { PdfCanvas } from '../components/PdfCanvas';
import { useLanguage } from '../state/LanguageContext';
import { useTripData } from '../state/TripDataContext';

interface FileEntry { id: string; fileName: string; contentType: string; size: number; uploadedByName: string; uploadedAt: string; }

function fmtDate(iso: string, lang: 'he' | 'en') {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function Documents() {
  const { t, lang } = useLanguage();
  const { documentFolders: folders, refreshDocumentFolders: refreshFolders, loading } = useTripData();
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
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfNumPages, setPdfNumPages] = useState(1);
  const [pdfError, setPdfError] = useState(false);

  // Hand-rolled pinch-zoom/pan for the image preview: the app's own viewport meta disables
  // page-level pinch zoom everywhere (that's what stops inputs from auto-zooming on focus), so
  // native browser pinch-to-zoom isn't available here — this reproduces it scoped to just the
  // previewed image via a CSS transform driven by pointer events.
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [gesturing, setGesturing] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  function resetZoom() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }
  function onImagePointerDown(e: React.PointerEvent) {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setGesturing(true);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      panStart.current = null;
    } else if (pointers.current.size === 1) {
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
  }
  function onImagePointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      setZoom(Math.min(4, Math.max(1, pinchStart.current.zoom * (dist / pinchStart.current.dist))));
    } else if (pointers.current.size === 1 && panStart.current && zoom > 1) {
      setPan({ x: panStart.current.panX + (e.clientX - panStart.current.x), y: panStart.current.panY + (e.clientY - panStart.current.y) });
    }
  }
  function onImagePointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) {
      panStart.current = null;
      setGesturing(false);
      if (zoom < 1.05) resetZoom();
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }

  async function refreshFiles(folderId: string) {
    const data = await api(`/documents/folders/${folderId}/files`);
    setFilesByFolder((f) => ({ ...f, [folderId]: data.files }));
  }

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
      showToast(e instanceof ApiError ? e.message : t('documents.uploadError'));
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
        showToast(t('documents.shareUnsupported'));
      }
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') showToast(t('documents.shareError'));
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
      showToast(t('documents.linkCopied'));
    } catch {
      showToast(t('documents.linkCopyError'));
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
      showToast(t('documents.renameError'));
    } finally {
      setBusyAction(false);
      setMenuFile(null);
      setRenaming(false);
    }
  }

  // Preview uses the same signed URL as "copy link" — an <img>/<iframe> can't carry an
  // Authorization header, so the backend's own auth-gated /download route isn't usable here.
  async function openPreview(file: FileEntry) {
    resetZoom();
    setPdfPage(1);
    setPdfNumPages(1);
    setPdfError(false);
    setPreviewFile(file);
    setPreviewLoading(true);
    try {
      const { url } = await api(`/documents/files/${file.id}/link`);
      setPreviewUrl(url);
    } catch {
      showToast(t('documents.openError'));
      setPreviewFile(null);
    } finally {
      setPreviewLoading(false);
    }
  }
  function closePreview() {
    setPreviewFile(null);
    setPreviewUrl('');
    resetZoom();
  }
  function changePdfPage(delta: number) {
    resetZoom();
    setPdfPage((p) => Math.min(pdfNumPages, Math.max(1, p + delta)));
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '6px 0 calc(102px + env(safe-area-inset-bottom))' }}>
      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={onFileChosen} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '12px 22px 20px' }}>
        <div>
          <div style={{ font: "600 30px/1.15 'Noto Sans Hebrew',sans-serif", letterSpacing: '-.5px' }}>{t('documents.title')}</div>
          <div style={{ font: "400 12.5px/1.4 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 7 }}>
            {t('documents.folderCount', { count: folders.length })}
          </div>
        </div>
        <div className="pill" onClick={() => { setEditing((v) => !v); setOpenFolderId(null); }}
          style={{ cursor: 'pointer', border: `1px solid ${editing ? 'var(--accent)' : 'var(--border)'}`, color: editing ? 'var(--accent)' : 'var(--text)', padding: '8px 14px' }}>
          {editing ? t('common.done') : t('common.edit')}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 22px' }}>
        {!loading && folders.length === 0 && !editing && (
          <div style={{ border: '1px dashed var(--border)', borderRadius: 18, padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ font: "600 16px/1.4 'Noto Sans Hebrew',sans-serif" }}>{t('documents.emptyTitle')}</div>
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
                      <div style={{ font: "400 12px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 3 }}>{t('documents.fileCount', { count: f.fileCount })}</div>
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
                            <UploadIcon /> {uploadingFolderId === f.id ? t('documents.uploading') : t('documents.uploadFile')}
                          </div>

                          {(filesByFolder[f.id] || []).length === 0 ? (
                            <div style={{ font: "400 12.5px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', textAlign: 'center', padding: '18px 0 4px' }}>
                              {t('documents.noFiles')}
                            </div>
                          ) : (
                            <div style={{ marginTop: 10 }}>
                              {(filesByFolder[f.id] || []).map((file) => (
                                <div key={file.id} onClick={() => openPreview(file)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderTop: '1px solid var(--border-soft)', cursor: 'pointer' }}>
                                  <div style={{ color: 'var(--text-dim)', flex: 'none' }}><FileIcon /></div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ font: "500 13.5px 'Noto Sans Hebrew',sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.fileName}</div>
                                    <div style={{ font: "400 11px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 2 }}>{fmtDate(file.uploadedAt, lang)}</div>
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
            {t('documents.addFolder')}
          </div>
        )}
        {editing && adding && (
          <div className="card" style={{ border: '1px dashed var(--border)', background: 'transparent' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <input className="field" placeholder={t('documents.folderNamePlaceholder')} value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addFolder()} />
              <div style={{ display: 'flex', gap: 7 }}>
                <div className="btn btn-accent" style={{ flex: 1, textAlign: 'center' }} onClick={addFolder}>{t('common.add')}</div>
                <div className="btn btn-outline" style={{ flex: 1, textAlign: 'center' }} onClick={() => { setAdding(false); setNewFolderName(''); }}>{t('common.cancel')}</div>
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
              <ShareIcon /><span style={{ font: "500 14.5px 'Noto Sans Hebrew',sans-serif" }}>{t('documents.share')}</span>
            </div>
            <div onClick={() => !busyAction && copyLink(menuFile)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 4px', cursor: 'pointer', opacity: busyAction ? 0.5 : 1 }}>
              <LinkIcon /><span style={{ font: "500 14.5px 'Noto Sans Hebrew',sans-serif" }}>{t('documents.copyLink')}</span>
            </div>
            <div onClick={() => !busyAction && startRename(menuFile)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 4px', cursor: 'pointer', opacity: busyAction ? 0.5 : 1 }}>
              <EditIcon /><span style={{ font: "500 14.5px 'Noto Sans Hebrew',sans-serif" }}>{t('documents.rename')}</span>
            </div>
            <div onClick={() => deleteFile(menuFile, openFolderId!)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 4px', cursor: 'pointer', color: 'var(--danger)' }}>
              <TrashIcon /><span style={{ font: "500 14.5px 'Noto Sans Hebrew',sans-serif" }}>{t('documents.deleteFile')}</span>
            </div>
          </div>
        )}
        {menuFile && renaming && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ font: "600 14px 'Noto Sans Hebrew',sans-serif", padding: '0 4px' }}>{t('documents.renameTitle')}</div>
            <input className="field" value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveRename(openFolderId!)} autoFocus />
            <div style={{ display: 'flex', gap: 7 }}>
              <div className="btn btn-accent" style={{ flex: 1, textAlign: 'center', opacity: busyAction ? 0.6 : 1 }} onClick={() => !busyAction && saveRename(openFolderId!)}>{t('common.save')}</div>
              <div className="btn btn-outline" style={{ flex: 1, textAlign: 'center' }} onClick={() => setRenaming(false)}>{t('common.cancel')}</div>
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
              {previewFile.contentType === 'application/pdf' && !pdfError && pdfNumPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
                  <div onClick={() => pdfPage > 1 && changePdfPage(-1)} style={{ cursor: pdfPage > 1 ? 'pointer' : 'default', opacity: pdfPage > 1 ? 1 : 0.3, fontSize: 18, padding: 4 }}>›</div>
                  <div dir="ltr" style={{ font: "500 12.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)' }}>{pdfPage} / {pdfNumPages}</div>
                  <div onClick={() => pdfPage < pdfNumPages && changePdfPage(1)} style={{ cursor: pdfPage < pdfNumPages ? 'pointer' : 'default', opacity: pdfPage < pdfNumPages ? 1 : 0.3, fontSize: 18, padding: 4 }}>‹</div>
                </div>
              )}
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {previewLoading ? (
                <div style={{ font: "400 13px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)' }}>{t('documents.loadingPreview')}</div>
              ) : (previewFile.contentType?.startsWith('image/') || (previewFile.contentType === 'application/pdf' && !pdfError)) ? (
                <div
                  onPointerDown={onImagePointerDown} onPointerMove={onImagePointerMove}
                  onPointerUp={onImagePointerUp} onPointerCancel={onImagePointerUp}
                  onDoubleClick={() => (zoom > 1 ? resetZoom() : setZoom(2))}
                  style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none' }}>
                  <div style={{
                    width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transition: gesturing ? 'none' : 'transform .2s ease-out',
                  }}>
                    {previewFile.contentType?.startsWith('image/') ? (
                      <img src={previewUrl} alt={previewFile.fileName} draggable={false}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', userSelect: 'none' }} />
                    ) : (
                      <PdfCanvas url={previewUrl} page={pdfPage} onNumPages={setPdfNumPages} onError={() => setPdfError(true)} />
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <div style={{ font: "400 13px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginBottom: 16 }}>
                    {t('documents.noPreview')}
                  </div>
                  <a href={previewUrl} target="_blank" rel="noreferrer" className="btn btn-accent" style={{ padding: '11px 22px', display: 'inline-block' }}>
                    {t('documents.openFile')}
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
              <div style={{ font: "600 18px/1.3 'Noto Sans Hebrew',sans-serif" }}>{t('documents.deleteFolderTitle')}</div>
              <div style={{ font: "400 12.5px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 9 }}>
                {t('documents.deleteFolderDesc')}
              </div>
              <div style={{ display: 'flex', gap: 9, marginTop: 20 }}>
                <div className="btn btn-outline" style={{ flex: 1, textAlign: 'center' }} onClick={() => setConfirmDeleteId(null)}>{t('common.cancel')}</div>
                <div className="btn btn-accent" style={{ flex: 1, textAlign: 'center', background: 'var(--danger)' }} onClick={() => deleteFolder(confirmDeleteId)}>{t('documents.deleteFolderConfirm')}</div>
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
