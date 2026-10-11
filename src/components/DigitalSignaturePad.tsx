import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, CheckSquare, Square, ShieldCheck } from 'lucide-react';
import { soundService } from '../services/sound';

interface DigitalSignaturePadProps {
  juriName: string;
  onSignatureChange: (signatureDataUrl: string, paktaAgreed: boolean) => void;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  juriName,
  onSignatureChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [paktaAgreed, setPaktaAgreed] = useState(false);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill background with subtle off-white/dark tint for clean signature export
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#fef08a'; // Golden / amber ink
  }, []);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(prev => (prev ? prev : true));
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onSignatureChange(dataUrl, paktaAgreed);
    }
  };

  const clearCanvas = () => {
    soundService.playClick();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSignatureChange('', paktaAgreed);
  };

  const togglePakta = () => {
    soundService.playClick();
    const nextVal = !paktaAgreed;
    setPaktaAgreed(nextVal);
    const canvas = canvasRef.current;
    const dataUrl = hasSignature && canvas ? canvas.toDataURL('image/png') : '';
    onSignatureChange(dataUrl, nextVal);
  };

  return (
    <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PenTool className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs sm:text-sm font-bold text-amber-100">
            Tanda Tangan Digital Dewan Juri
          </h4>
        </div>
        <button
          type="button"
          onClick={clearCanvas}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-stone-300 hover:text-red-400 bg-stone-800 hover:bg-stone-700/80 rounded-lg transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Hapus</span>
        </button>
      </div>

      <div className="relative border border-stone-700 rounded-xl overflow-hidden bg-stone-950">
        <canvas
          ref={canvasRef}
          width={500}
          height={180}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-36 sm:h-44 block cursor-crosshair touch-none"
        />

        {!hasSignature && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <span className="text-xs text-stone-500/80 tracking-wide select-none">
              Goreskan tanda tangan Anda di sini (Sentuh / Mouse)
            </span>
          </div>
        )}

        <div className="absolute bottom-2 right-3 pointer-events-none text-right">
          <p className="text-[10px] text-stone-500 font-medium">Juri: {juriName}</p>
        </div>
      </div>

      {/* Pakta Integritas Checkbox */}
      <div
        onClick={togglePakta}
        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
          paktaAgreed
            ? 'bg-amber-950/30 border-amber-500/60 text-amber-100'
            : 'bg-stone-950/40 border-stone-800 text-stone-300 hover:border-stone-700'
        }`}
      >
        <div className="mt-0.5 text-amber-400 shrink-0">
          {paktaAgreed ? (
            <CheckSquare className="w-4 h-4 text-amber-400" />
          ) : (
            <Square className="w-4 h-4 text-stone-500" />
          )}
        </div>
        <div className="text-xs leading-relaxed">
          <strong className="block text-amber-300 font-semibold mb-0.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 inline" />
            Pakta Integritas Penilaian Digital
          </strong>
          <span className="text-stone-300/90 text-[11px]">
            Saya menyatakan dengan sungguh-sungguh bahwa seluruh skor, catatan, dan rekam waktu yang saya berikan adalah objektif, independen, dan tanpa intervensi pihak mana pun.
          </span>
        </div>
      </div>
    </div>
  );
};
