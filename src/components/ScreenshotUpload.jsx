import { useRef, useEffect } from 'react';
import { SCREENSHOT_ACCEPT, SCREENSHOT_TYPES } from '../utils/constants.js';

const PASTE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export function ScreenshotUpload({ screenshots, onScreenshotsChange, disabled }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (disabled) return;

    function handlePaste(e) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageBlobs = [];
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file && PASTE_IMAGE_TYPES.includes(file.type)) {
            imageBlobs.push(file);
          }
        }
      }
      if (imageBlobs.length === 0) return;
      e.preventDefault();
      const newEntries = [];
      let done = 0;
      imageBlobs.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = () => {
          newEntries.push({
            name: file.name || `Pasted image ${index + 1}`,
            dataUrl: reader.result,
          });
          done++;
          if (done === imageBlobs.length) {
            onScreenshotsChange(prev => [...prev, ...newEntries]);
          }
        };
        reader.readAsDataURL(file);
      });
    }

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [disabled, onScreenshotsChange]);

  function handleChange(e) {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => SCREENSHOT_TYPES.includes(f.type));
    if (valid.length === 0 && files.length > 0) {
      alert('Please use PNG, JPG, JPEG or WebP images.');
      e.target.value = '';
      return;
    }
    const newUrls = [];
    let done = 0;
    valid.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        newUrls.push({ name: file.name, dataUrl: reader.result });
        done++;
        if (done === valid.length) {
          onScreenshotsChange([...screenshots, ...newUrls]);
        }
      };
      reader.readAsDataURL(file);
    });
    if (valid.length === 0) {
      e.target.value = '';
      return;
    }
    e.target.value = '';
  }

  function remove(index) {
    onScreenshotsChange(screenshots.filter((_, i) => i !== index));
  }

  return (
    <div className="upload-card" role="region" aria-label="Screenshots upload">
      <label className="upload-label">
        <span className="upload-title">Upload Screenshots</span>
        <span className="upload-hint">PNG, JPG, JPEG, WebP — or paste with Ctrl+V</span>
        <input
          ref={inputRef}
          type="file"
          accept={SCREENSHOT_ACCEPT}
          multiple
          onChange={handleChange}
          disabled={disabled}
          className="upload-input"
        />
      </label>
      {screenshots.length > 0 && (
        <ul className="screenshot-list">
          {screenshots.map((s, i) => (
            <li key={i} className="screenshot-item">
              <img src={s.dataUrl} alt={s.name} className="screenshot-thumb" />
              <span className="screenshot-name">{s.name}</span>
              <button type="button" className="btn-remove" onClick={() => remove(i)} aria-label="Remove">
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
