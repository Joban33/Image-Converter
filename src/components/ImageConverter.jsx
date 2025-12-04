import React, { useState, useRef, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { removeBackground } from '@imgly/background-removal';
import confetti from 'canvas-confetti';
import CreativeEditor from './CreativeEditor';

const ImageConverter = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // Loading States
  const [isConverting, setIsConverting] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [isPortraitProcessing, setIsPortraitProcessing] = useState(false);

  // Mode State
  const [activeMode, setActiveMode] = useState('converter'); // converter, compressor, enhancer, resizer, crop, social, creative

  // Feature Configs
  const [targetFormat, setTargetFormat] = useState('image/jpeg');
  const [quality, setQuality] = useState(0.9);
  const [resizeConfig, setResizeConfig] = useState({ width: '', height: '', maintainRatio: true });

  // Enhancer Configs
  const [adjustments, setAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sharpen: 0,
    vignette: 0
  });
  const [debouncedAdjustments, setDebouncedAdjustments] = useState(adjustments);
  const [activeFilter, setActiveFilter] = useState('none');

  // Easy Crop Configs
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState(undefined); // undefined = Free (Fixed from null)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // Social Studio Configs
  const [socialTemplate, setSocialTemplate] = useState('instagram_sq');
  const [socialBg, setSocialBg] = useState('blur');
  const [socialFit, setSocialFit] = useState('fit');
  const [socialStyle, setSocialStyle] = useState({
    padding: 0,
    radius: 0,
    shadow: 0,
    border: 0
  });
  const [socialText, setSocialText] = useState('');

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // --- Debouncing ---
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedAdjustments(adjustments);
    }, 100); // 100ms debounce
    return () => clearTimeout(handler);
  }, [adjustments]);

  // --- Preview & Memory Management ---
  useEffect(() => {
    if (selectedFiles.length > 0) {
      const url = URL.createObjectURL(selectedFiles[0]);
      setPreviewUrl(url);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFiles]);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // --- File Handling ---
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) addFiles(files);
  };
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) addFiles(files);
  };
  const addFiles = (newFiles) => {
    const uniqueFiles = newFiles.filter(newFile =>
      !selectedFiles.some(existing => existing.name === newFile.name && existing.size === newFile.size)
    );
    setSelectedFiles(prev => [...prev, ...uniqueFiles]);
  };
  const removeFile = (index) => setSelectedFiles(prev => prev.filter((_, i) => i !== index));

  // --- Creative Studio Handler ---
  const handleCreativeSave = (dataUrl) => {
    // Convert DataURL to File
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `creative_masterpiece_${Date.now()}.png`, { type: 'image/png' });
        setSelectedFiles([file]);
        setActiveMode('converter'); // Go back to main view
        triggerConfetti();
      });
  };

  // --- AI Features ---
  const handleRemoveBackground = async () => {
    if (selectedFiles.length === 0) return;
    setIsRemovingBg(true);
    try {
      const file = selectedFiles[0];
      const blob = await removeBackground(file);
      const newFile = new File([blob], `nobg_${file.name}`, { type: 'image/png' });
      setSelectedFiles([newFile]);
      triggerConfetti();
    } catch (error) {
      console.error("Background removal failed:", error);
      alert("AI Background Removal failed. Please check your connection or try a different image.");
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleAIPortrait = async () => {
    if (selectedFiles.length === 0) return;
    setIsPortraitProcessing(true);
    try {
      const file = selectedFiles[0];
      const blob = await removeBackground(file);
      const subjectImg = await createImageFromBlob(blob);
      const originalImg = await createImageFromBlob(file);

      const canvas = document.createElement('canvas');
      canvas.width = originalImg.width;
      canvas.height = originalImg.height;
      const ctx = canvas.getContext('2d');

      // Draw Blurred Background
      ctx.filter = 'blur(15px) brightness(0.9)';
      ctx.drawImage(originalImg, 0, 0);
      ctx.filter = 'none';

      // Draw Subject
      ctx.drawImage(subjectImg, 0, 0);

      canvas.toBlob((resultBlob) => {
        const newFile = new File([resultBlob], `portrait_${file.name}`, { type: 'image/png' });
        setSelectedFiles([newFile]);
        triggerConfetti();
      }, 'image/png');

    } catch (error) {
      console.error("Portrait Mode failed:", error);
      alert("AI Portrait Mode failed. Please check your connection.");
    } finally {
      setIsPortraitProcessing(false);
    }
  };

  const createImageFromBlob = (blob) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = URL.createObjectURL(blob);
    });
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#38bdf8', '#818cf8', '#f472b6', '#fbbf24']
    });
  };

  // --- Processing Logic ---
  const handleConvert = async () => {
    if (selectedFiles.length === 0 || !canvasRef.current) return;
    setIsConverting(true);
    try {
      for (const file of selectedFiles) {
        await processAndDownload(file);
      }
      triggerConfetti();
    } catch (error) {
      console.error("Conversion failed:", error);
      alert("An error occurred during processing.");
    } finally {
      setIsConverting(false);
    }
  };

  const processAndDownload = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.src = url;

      img.onload = () => {
        try {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');

          if (activeMode === 'social') {
            drawSocialCard(ctx, canvas, img);
          } else {
            let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
            let targetWidth = img.width, targetHeight = img.height;

            if (activeMode === 'crop' && croppedAreaPixels) {
              sx = croppedAreaPixels.x;
              sy = croppedAreaPixels.y;
              sWidth = croppedAreaPixels.width;
              sHeight = croppedAreaPixels.height;
              targetWidth = sWidth;
              targetHeight = sHeight;
            }

            if (activeMode === 'resizer' && (resizeConfig.width || resizeConfig.height)) {
              if (resizeConfig.width && resizeConfig.height) {
                targetWidth = parseInt(resizeConfig.width);
                targetHeight = parseInt(resizeConfig.height);
              } else if (resizeConfig.width) {
                targetWidth = parseInt(resizeConfig.width);
                if (resizeConfig.maintainRatio) targetHeight = (sHeight / sWidth) * targetWidth;
              } else if (resizeConfig.height) {
                targetHeight = parseInt(resizeConfig.height);
                if (resizeConfig.maintainRatio) targetWidth = (sWidth / sHeight) * targetHeight;
              }
            }

            canvas.width = targetWidth;
            canvas.height = targetHeight;

            // Use DEBOUNCED adjustments for final output
            let filterString = getFilterString(activeFilter);
            filterString += ` brightness(${debouncedAdjustments.brightness}%) contrast(${debouncedAdjustments.contrast}%) saturate(${debouncedAdjustments.saturation}%)`;
            ctx.filter = filterString;
            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
            ctx.filter = 'none';

            if (debouncedAdjustments.vignette > 0) {
              const grad = ctx.createRadialGradient(targetWidth / 2, targetHeight / 2, targetWidth / 3, targetWidth / 2, targetHeight / 2, targetWidth);
              grad.addColorStop(0, 'rgba(0,0,0,0)');
              grad.addColorStop(1, `rgba(0,0,0,${debouncedAdjustments.vignette / 100})`);
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, targetWidth, targetHeight);
            }

            if (debouncedAdjustments.sharpen > 0) {
              const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
              const sharpenedData = applySharpen(imageData, targetWidth, targetHeight, debouncedAdjustments.sharpen / 100);
              ctx.putImageData(sharpenedData, 0, 0);
            }
          }

          if (targetFormat === 'image/x-icon' && activeMode === 'converter') {
            convertToICO(canvas, file.name);
          } else {
            const finalQuality = activeMode === 'compressor' ? quality : 0.92;
            const dataUrl = canvas.toDataURL(targetFormat, finalQuality);
            downloadFile(dataUrl, file.name, targetFormat);
          }

          URL.revokeObjectURL(url);
          resolve();
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image"));
      };
    });
  };

  const drawSocialCard = (ctx, canvas, img) => {
    let w = 1080, h = 1080;
    switch (socialTemplate) {
      case 'instagram_sq': w = 1080; h = 1080; break;
      case 'instagram_port': w = 1080; h = 1350; break;
      case 'story': w = 1080; h = 1920; break;
      case 'linkedin': w = 1200; h = 627; break;
      case 'twitter': w = 1200; h = 675; break;
      default: w = 1080; h = 1080;
    }
    canvas.width = w;
    canvas.height = h;

    if (socialBg === 'blur') {
      ctx.filter = 'blur(40px) brightness(0.8)';
      const scale = Math.max(w / img.width, h / img.height);
      const x = (w / 2) - (img.width / 2) * scale;
      const y = (h / 2) - (img.height / 2) * scale;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      ctx.filter = 'none';
    } else if (socialBg === 'white') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    } else if (socialBg === 'black') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
    } else if (socialBg === 'gradient_1') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#8EC5FC');
      grad.addColorStop(1, '#E0C3FC');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else if (socialBg === 'gradient_2') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#FA8BFF');
      grad.addColorStop(0.5, '#2BD2FF');
      grad.addColorStop(1, '#2BFF88');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    const paddingPx = (socialStyle.padding / 100) * (Math.min(w, h) / 2);
    const availW = w - (paddingPx * 2);
    const availH = h - (paddingPx * 2);

    let drawW, drawH, drawX, drawY;

    if (socialFit === 'fill') {
      const scale = Math.max(availW / img.width, availH / img.height);
      drawW = img.width * scale;
      drawH = img.height * scale;
      drawX = paddingPx + (availW - drawW) / 2;
      drawY = paddingPx + (availH - drawH) / 2;
    } else {
      const scale = Math.min(availW / img.width, availH / img.height);
      drawW = img.width * scale;
      drawH = img.height * scale;
      drawX = paddingPx + (availW - drawW) / 2;
      drawY = paddingPx + (availH - drawH) / 2;
    }

    if (socialStyle.shadow > 0) {
      ctx.shadowColor = `rgba(0, 0, 0, ${socialStyle.shadow / 100})`;
      ctx.shadowBlur = 50;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 20;
    }

    ctx.save();
    roundedRect(ctx, drawX, drawY, drawW, drawH, socialStyle.radius);
    ctx.clip();
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();

    ctx.shadowColor = 'transparent';

    if (socialStyle.border > 0) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = socialStyle.border;
      roundedRect(ctx, drawX, drawY, drawW, drawH, socialStyle.radius);
      ctx.stroke();
    }

    if (socialText) {
      ctx.font = 'bold 60px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      ctx.fillText(socialText, w / 2, h - 50);
    }
  };

  const roundedRect = (ctx, x, y, w, h, r) => {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  const downloadFile = (dataUrl, originalName, format) => {
    const link = document.createElement('a');
    const ext = format.split('/')[1];
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));

    let suffix = '_converted';
    if (activeMode === 'compressor') suffix = '_compressed';
    if (activeMode === 'enhancer') suffix = '_enhanced';
    if (activeMode === 'resizer') suffix = '_resized';
    if (activeMode === 'crop') suffix = '_cropped';
    if (activeMode === 'social') suffix = '_social';

    link.download = `${nameWithoutExt}${suffix}.${ext}`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const convertToICO = (canvas, originalName) => {
    canvas.toBlob((blob) => {
      const reader = new FileReader();
      reader.onload = () => {
        const pngData = new Uint8Array(reader.result);
        const fileSize = pngData.length;
        const header = new Uint8Array([0, 0, 1, 0, 1, 0]);
        const entry = new Uint8Array(16);
        const w = canvas.width > 255 ? 0 : canvas.width;
        const h = canvas.height > 255 ? 0 : canvas.height;
        entry[0] = w; entry[1] = h; entry[2] = 0; entry[3] = 0; entry[4] = 1; entry[5] = 0; entry[6] = 32; entry[7] = 0;
        entry[8] = fileSize & 0xFF; entry[9] = (fileSize >> 8) & 0xFF; entry[10] = (fileSize >> 16) & 0xFF; entry[11] = (fileSize >> 24) & 0xFF;
        entry[12] = 22; entry[13] = 0; entry[14] = 0; entry[15] = 0;
        const icoData = new Uint8Array(header.length + entry.length + fileSize);
        icoData.set(header, 0); icoData.set(entry, header.length); icoData.set(pngData, header.length + entry.length);
        const icoBlob = new Blob([icoData], { type: 'image/x-icon' });
        const url = URL.createObjectURL(icoBlob);
        const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
        const link = document.createElement('a');
        link.download = `${nameWithoutExt}.ico`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };
      reader.readAsArrayBuffer(blob);
    }, 'image/png');
  };

  const applySharpen = (imageData, w, h, strength) => {
    const data = imageData.data;
    const buff = new Uint8ClampedArray(data);
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let val = 0;
          val += buff[((y - 1) * w + (x - 1)) * 4 + c] * kernel[0];
          val += buff[((y - 1) * w + x) * 4 + c] * kernel[1];
          val += buff[((y - 1) * w + (x + 1)) * 4 + c] * kernel[2];
          val += buff[(y * w + (x - 1)) * 4 + c] * kernel[3];
          val += buff[(y * w + x) * 4 + c] * kernel[4];
          val += buff[(y * w + (x + 1)) * 4 + c] * kernel[5];
          val += buff[((y + 1) * w + (x - 1)) * 4 + c] * kernel[6];
          val += buff[((y + 1) * w + x) * 4 + c] * kernel[7];
          val += buff[((y + 1) * w + (x + 1)) * 4 + c] * kernel[8];
          const original = buff[(y * w + x) * 4 + c];
          data[(y * w + x) * 4 + c] = original * (1 - strength) + val * strength;
        }
      }
    }
    return imageData;
  };

  const getFilterString = (filter) => {
    switch (filter) {
      case 'grayscale': return 'grayscale(100%)';
      case 'sepia': return 'sepia(100%)';
      case 'invert': return 'invert(100%)';
      case 'blur': return 'blur(3px)';
      case 'vintage': return 'sepia(50%) contrast(120%) saturate(80%)';
      case 'technicolor': return 'saturate(200%) contrast(120%)';
      case 'polaroid': return 'contrast(120%) brightness(110%) saturate(80%) sepia(20%)';
      case 'hdr': return 'contrast(150%) saturate(150%) brightness(110%)';
      case 'cinematic': return 'contrast(120%) brightness(90%) saturate(110%) hue-rotate(-10deg)';
      case 'soft': return 'brightness(110%) contrast(90%) saturate(90%) blur(0.5px)';
      default: return '';
    }
  };

  const triggerFileInput = () => fileInputRef.current.click();

  const getActionButtonText = () => {
    if (isConverting || isRemovingBg || isPortraitProcessing) return 'Making Magic... ✨';
    switch (activeMode) {
      case 'converter': return 'Make Magic (Convert) ✨';
      case 'compressor': return 'Squeeze It (Compress) 🍊';
      case 'enhancer': return 'Beautify It (Enhance) 💖';
      case 'resizer': return 'Resize It 📏';
      case 'crop': return 'Snip Snip (Crop) ✂️';
      case 'social': return 'Create Masterpiece 🎨';
      case 'creative': return 'Save Masterpiece 🎨';
      default: return 'Convert';
    }
  };

  // --- Loading Overlay Component ---
  const LoadingOverlay = () => (
    <div className="loading-overlay">
      <div className="spinner"></div>
      <h3>Making Magic... ✨</h3>
      <p>Please wait while we process your image.</p>
    </div>
  );

  return (
    <div className="converter-card">
      {(isConverting || isRemovingBg || isPortraitProcessing) && <LoadingOverlay />}

      <div className="tabs">
        {['converter', 'compressor', 'enhancer', 'resizer', 'crop', 'social', 'creative'].map(mode => (
          <button
            key={mode}
            className={`tab-btn ${activeMode === mode ? 'active' : ''}`}
            onClick={() => setActiveMode(mode)}
          >
            {mode === 'creative' ? 'Creative Studio 🎨' : mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {activeMode === 'creative' ? (
        selectedFiles.length > 0 ? (
          <CreativeEditor
            imageFile={selectedFiles[0]}
            onSave={handleCreativeSave}
            onCancel={() => setActiveMode('converter')}
          />
        ) : (
          <div
            className={`drop-zone ${isDragging ? 'drag-active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
          >
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" multiple style={{ display: 'none' }} />
            <svg className="icon-upload" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <p>Click or Drag Images Here to Start Creating</p>
          </div>
        )
      ) : (
        <>
          <div
            className={`drop-zone ${isDragging ? 'drag-active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
          >
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" multiple style={{ display: 'none' }} />
            <svg className="icon-upload" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <p>Click or Drag Images Here</p>
          </div>

          {previewUrl && (
            <div className="preview-area">
              {activeMode === 'crop' ? (
                <div className="crop-container">
                  <Cropper
                    image={previewUrl}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={aspect}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    onRotationChange={setRotation}
                  />
                </div>
              ) : (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="preview-image"
                  style={{
                    filter: `${getFilterString(activeFilter)} brightness(${debouncedAdjustments.brightness}%) contrast(${debouncedAdjustments.contrast}%) saturate(${debouncedAdjustments.saturation}%)`,
                  }}
                />
              )}
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div className="file-list">
              {selectedFiles.map((file, index) => (
                <div key={index} className="file-item">
                  <span className="file-name">{file.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="file-meta">{(file.size / 1024).toFixed(1)} KB</span>
                    <button className="remove-btn" onClick={() => removeFile(index)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mode-content">

            {activeMode === 'converter' && (
              <div className="control-group">
                <label>Target Format</label>
                <select value={targetFormat} onChange={(e) => setTargetFormat(e.target.value)}>
                  <option value="image/jpeg">JPG</option>
                  <option value="image/png">PNG</option>
                  <option value="image/webp">WEBP</option>
                  <option value="image/bmp">BMP</option>
                  <option value="image/x-icon">ICO (Favicon)</option>
                </select>
              </div>
            )}

            {activeMode === 'compressor' && (
              <div className="control-group">
                <label>Compression Level: {Math.round(quality * 100)}% Quality</label>
                <input type="range" min="0.1" max="1.0" step="0.1" value={quality} onChange={(e) => setQuality(parseFloat(e.target.value))} />
              </div>
            )}

            {activeMode === 'resizer' && (
              <div className="control-group">
                <label>Target Dimensions (px)</label>
                <div className="input-row">
                  <input type="number" placeholder="Width" value={resizeConfig.width} onChange={(e) => setResizeConfig({ ...resizeConfig, width: e.target.value })} />
                  <span style={{ color: 'var(--text-secondary)' }}>×</span>
                  <input type="number" placeholder="Height" value={resizeConfig.height} onChange={(e) => setResizeConfig({ ...resizeConfig, height: e.target.value })} />
                </div>
              </div>
            )}

            {activeMode === 'enhancer' && (
              <>
                <button className="premium-btn" onClick={handleAIPortrait} disabled={isPortraitProcessing}>
                  {isPortraitProcessing ? 'Processing...' : '📸 AI Portrait Mode (Pro)'}
                </button>
                <button className="magic-btn" onClick={handleRemoveBackground} disabled={isRemovingBg}>
                  {isRemovingBg ? 'Removing Background...' : '✨ Remove Background (AI)'}
                </button>

                <div className="control-group">
                  <label>Pro Filters</label>
                  <div className="filter-options">
                    {['none', 'hdr', 'cinematic', 'soft', 'vintage', 'technicolor', 'polaroid'].map(filter => (
                      <button
                        key={filter}
                        className={`filter-btn ${activeFilter === filter ? 'active' : ''}`}
                        onClick={() => setActiveFilter(filter)}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="control-group">
                  <label><span>Vignette</span> <span>{adjustments.vignette}%</span></label>
                  <input type="range" min="0" max="100" value={adjustments.vignette} onChange={(e) => setAdjustments({ ...adjustments, vignette: e.target.value })} />
                </div>

                <div className="control-group">
                  <label><span>Brightness</span> <span>{adjustments.brightness}%</span></label>
                  <input type="range" min="0" max="200" value={adjustments.brightness} onChange={(e) => setAdjustments({ ...adjustments, brightness: e.target.value })} />
                </div>
                <div className="control-group">
                  <label><span>Contrast</span> <span>{adjustments.contrast}%</span></label>
                  <input type="range" min="0" max="200" value={adjustments.contrast} onChange={(e) => setAdjustments({ ...adjustments, contrast: e.target.value })} />
                </div>
                <div className="control-group">
                  <label><span>Saturation</span> <span>{adjustments.saturation}%</span></label>
                  <input type="range" min="0" max="200" value={adjustments.saturation} onChange={(e) => setAdjustments({ ...adjustments, saturation: e.target.value })} />
                </div>
                <div className="control-group">
                  <label><span>Sharpen Strength</span> <span>{adjustments.sharpen}%</span></label>
                  <input type="range" min="0" max="100" value={adjustments.sharpen} onChange={(e) => setAdjustments({ ...adjustments, sharpen: e.target.value })} />
                </div>
              </>
            )}

            {activeMode === 'crop' && (
              <>
                <div className="control-group">
                  <label>Zoom</label>
                  <input type="range" min="1" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(e.target.value)} />
                </div>
                <div className="control-group">
                  <label>Rotation</label>
                  <input type="range" min="0" max="360" value={rotation} onChange={(e) => setRotation(e.target.value)} />
                </div>
                <div className="control-group">
                  <label>Aspect Ratio</label>
                  <div className="aspect-ratios">
                    <button className={`aspect-btn ${aspect === undefined ? 'active' : ''}`} onClick={() => setAspect(undefined)}>Free</button>
                    <button className={`aspect-btn ${aspect === 1 ? 'active' : ''}`} onClick={() => setAspect(1)}>Square (1:1)</button>
                    <button className={`aspect-btn ${aspect === 16 / 9 ? 'active' : ''}`} onClick={() => setAspect(16 / 9)}>16:9</button>
                    <button className={`aspect-btn ${aspect === 4 / 3 ? 'active' : ''}`} onClick={() => setAspect(4 / 3)}>4:3</button>
                  </div>
                </div>
              </>
            )}

            {activeMode === 'social' && (
              <>
                <div className="control-group">
                  <label>Template</label>
                  <div className="template-grid">
                    {[
                      { id: 'instagram_sq', label: 'IG Post (1:1)' },
                      { id: 'instagram_port', label: 'IG Portrait (4:5)' },
                      { id: 'story', label: 'Story (9:16)' },
                      { id: 'linkedin', label: 'LinkedIn' },
                      { id: 'twitter', label: 'Twitter' }
                    ].map(t => (
                      <button
                        key={t.id}
                        className={`template-btn ${socialTemplate === t.id ? 'active' : ''}`}
                        onClick={() => setSocialTemplate(t.id)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="control-group">
                  <label>Image Fit</label>
                  <div className="toggle-row">
                    <button className={`toggle-btn ${socialFit === 'fit' ? 'active' : ''}`} onClick={() => setSocialFit('fit')}>Fit (Contain)</button>
                    <button className={`toggle-btn ${socialFit === 'fill' ? 'active' : ''}`} onClick={() => setSocialFit('fill')}>Fill (Cover)</button>
                  </div>
                </div>

                <div className="control-group">
                  <label>Background</label>
                  <div className="color-picker-row">
                    {['blur', 'white', 'black', 'gradient_1', 'gradient_2'].map(bg => (
                      <button
                        key={bg}
                        className={`color-btn ${socialBg === bg ? 'active' : ''}`}
                        onClick={() => setSocialBg(bg)}
                        style={{
                          background: bg === 'blur' ? 'grey' :
                            bg === 'white' ? '#fff' :
                              bg === 'black' ? '#000' :
                                bg === 'gradient_1' ? 'linear-gradient(45deg, #8EC5FC, #E0C3FC)' :
                                  'linear-gradient(45deg, #FA8BFF, #2BFF88)'
                        }}
                        title={bg}
                      />
                    ))}
                  </div>
                </div>

                <div className="control-group">
                  <label><span>Padding</span> <span>{socialStyle.padding}%</span></label>
                  <input type="range" min="0" max="50" value={socialStyle.padding} onChange={(e) => setSocialStyle({ ...socialStyle, padding: e.target.value })} />
                </div>
                <div className="control-group">
                  <label><span>Roundness</span> <span>{socialStyle.radius}px</span></label>
                  <input type="range" min="0" max="100" value={socialStyle.radius} onChange={(e) => setSocialStyle({ ...socialStyle, radius: e.target.value })} />
                </div>
                <div className="control-group">
                  <label><span>Shadow</span> <span>{socialStyle.shadow}%</span></label>
                  <input type="range" min="0" max="100" value={socialStyle.shadow} onChange={(e) => setSocialStyle({ ...socialStyle, shadow: e.target.value })} />
                </div>
                <div className="control-group">
                  <label>Caption / Watermark</label>
                  <input type="text" placeholder="Add text..." value={socialText} onChange={(e) => setSocialText(e.target.value)} />
                </div>
              </>
            )}

          </div>

          <div className="actions">
            <button className="btn-convert" onClick={handleConvert} disabled={selectedFiles.length === 0 || isConverting || isRemovingBg || isPortraitProcessing}>
              {getActionButtonText()}
            </button>
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
        </>
      )}
    </div>
  );
};

export default ImageConverter;
