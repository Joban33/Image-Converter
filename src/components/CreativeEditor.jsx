import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';

const CreativeEditor = ({ imageFile, onSave, onCancel }) => {
    const canvasEl = useRef(null);
    const [canvas, setCanvas] = useState(null);
    const [activeTool, setActiveTool] = useState('select'); // select, draw
    const [brushColor, setBrushColor] = useState('#38bdf8');
    const [brushSize, setBrushSize] = useState(5);

    useEffect(() => {
        if (!canvasEl.current || !imageFile) return;

        // Initialize Fabric Canvas
        const newCanvas = new fabric.Canvas(canvasEl.current, {
            isDrawingMode: false,
            selection: true,
        });

        // Load Image
        const imgObj = new Image();
        const url = URL.createObjectURL(imageFile);
        imgObj.src = url;
        imgObj.onload = () => {
            const fabricImg = new fabric.Image(imgObj);

            // Scale image to fit within a reasonable max width/height while maintaining aspect ratio
            const maxW = 800;
            const maxH = 600;
            const scale = Math.min(maxW / fabricImg.width, maxH / fabricImg.height);

            fabricImg.scale(scale);

            newCanvas.setDimensions({
                width: fabricImg.width * scale,
                height: fabricImg.height * scale
            });

            newCanvas.backgroundImage = fabricImg;
            newCanvas.renderAll();
            URL.revokeObjectURL(url);
        };

        setCanvas(newCanvas);

        return () => {
            newCanvas.dispose();
        };
    }, [imageFile]);

    // Tool Handlers
    useEffect(() => {
        if (!canvas) return;

        if (activeTool === 'draw') {
            canvas.isDrawingMode = true;
            const brush = new fabric.PencilBrush(canvas);
            brush.color = brushColor;
            brush.width = parseInt(brushSize);
            canvas.freeDrawingBrush = brush;
        } else {
            canvas.isDrawingMode = false;
        }
    }, [activeTool, canvas, brushColor, brushSize]);

    const addText = () => {
        if (!canvas) return;
        const text = new fabric.IText('Double click to edit', {
            left: 50,
            top: 50,
            fontFamily: 'Outfit',
            fill: '#ffffff',
            fontSize: 40,
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.5)', blur: 5, offsetX: 2, offsetY: 2 })
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        setActiveTool('select');
    };

    const addSticker = (emoji) => {
        if (!canvas) return;
        const text = new fabric.Text(emoji, {
            left: 100,
            top: 100,
            fontSize: 60,
            selectable: true
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        setActiveTool('select');
    };

    const deleteSelected = () => {
        if (!canvas) return;
        const activeObj = canvas.getActiveObject();
        if (activeObj) {
            canvas.remove(activeObj);
        }
    };

    const handleSave = () => {
        if (!canvas) return;
        const dataUrl = canvas.toDataURL({
            format: 'png',
            quality: 1,
            multiplier: 1
        });
        onSave(dataUrl);
    };

    return (
        <div className="creative-editor">
            <div className="creative-toolbar">
                <div className="tool-group">
                    <button
                        className={`tool-btn ${activeTool === 'select' ? 'active' : ''}`}
                        onClick={() => setActiveTool('select')}
                        title="Select / Move"
                    >
                        👆 Move
                    </button>
                    <button
                        className={`tool-btn ${activeTool === 'draw' ? 'active' : ''}`}
                        onClick={() => setActiveTool('draw')}
                        title="Free Draw"
                    >
                        🖌️ Draw
                    </button>
                    <button className="tool-btn" onClick={addText} title="Add Text">
                        T Text
                    </button>
                    <button className="tool-btn" onClick={deleteSelected} title="Delete Selected">
                        🗑️ Delete
                    </button>
                </div>

                {activeTool === 'draw' && (
                    <div className="tool-options">
                        <input
                            type="color"
                            value={brushColor}
                            onChange={(e) => setBrushColor(e.target.value)}
                            title="Brush Color"
                        />
                        <input
                            type="range"
                            min="1"
                            max="50"
                            value={brushSize}
                            onChange={(e) => setBrushSize(e.target.value)}
                            title="Brush Size"
                        />
                    </div>
                )}

                <div className="sticker-bar">
                    {['😎', '🔥', '✨', '❤️', '🎉', '🌈', '👑', '💡'].map(emoji => (
                        <button key={emoji} className="sticker-btn" onClick={() => addSticker(emoji)}>
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>

            <div className="canvas-wrapper">
                <canvas ref={canvasEl} />
            </div>

            <div className="creative-actions">
                <button className="btn-secondary" onClick={onCancel}>Cancel</button>
                <button className="btn-primary" onClick={handleSave}>Save Masterpiece ✨</button>
            </div>
        </div>
    );
};

export default CreativeEditor;
