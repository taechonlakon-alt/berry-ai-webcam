"use client";

import { useEffect, useRef, useState } from "react";
import { predictRipeness } from "@/ai/model";

const RIPENESS_LEVELS = [
  { level: 1, label: "ยังไม่สุก (Green)", color: "from-emerald-400 to-green-600", text: "text-emerald-500", desc: "ผลสีเขียว แข็ง มีรสเปรี้ยว" },
  { level: 2, label: "เริ่มเปลี่ยนสี (White)", color: "from-pink-100 to-rose-200", text: "text-pink-400", desc: "ผลสีขาว เริ่มอวบและตึง" },
  { level: 3, label: "เริ่มแดง (Early-Turn)", color: "from-pink-300 to-rose-400", text: "text-rose-400", desc: "เริ่มมีสีแดงประปราย หวานอมเปรี้ยว" },
  { level: 4, label: "เกือบสุกครึ่ง (Turning)", color: "from-red-300 to-red-500", text: "text-red-400", desc: "สีแดงเริ่มปกคลุมมากขึ้น" },
  { level: 5, label: "สุกครึ่งผล (Half-Ripe)", color: "from-red-500 to-red-600", text: "text-red-500", desc: "แดงเกินครึ่งผล เนื้อเริ่มนิ่ม" },
  { level: 6, label: "สุกพร้อมทาน (Full)", color: "from-red-600 to-rose-900", text: "text-red-700", desc: "สีแดงสดทั้งผล หวานอร่อย" },
];

export default function StrawberryCameraApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [predictedLevel, setPredictedLevel] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [autoScanEnabled, setAutoScanEnabled] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  // ใช้ useRef เพื่อเก็บสถานะว่าโหลดรอบปัจุบันเสร็จหรือยัง ป้องกันการยิง request ซ้ำซ้อน
  const processingRef = useRef(false);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  useEffect(() => {
    const startCamera = async () => {
      try {
        if (stream) stream.getTracks().forEach((track) => track.stop());
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: false,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setErrorMsg("");
      } catch (err: any) {
        setErrorMsg("ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาต");
      }
    };
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const handleScan = async () => {
    if (!videoRef.current || processingRef.current || !stream) return;

    // ถ้าเป็นการกดด้วยมือ ให้เปิด auto-scan ด้วยเลยเป็นการเริ่มทำงาน
    if (!autoScanEnabled) {
      setAutoScanEnabled(true);
    }

    setIsScanning(true);
    processingRef.current = true;

    try {
      const result = await predictRipeness(videoRef.current);
      if (result) {
        setPredictedLevel(result);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อ AI");
      setAutoScanEnabled(false); // ปิด auto-scan ถ้าระบบล่ม
    } finally {
      setIsScanning(false);
      processingRef.current = false;
    }
  };

  // Auto-scan Effect (ทุก 1.5 วิ)
  useEffect(() => {
    let scanInterval: NodeJS.Timeout;

    if (autoScanEnabled && stream && !errorMsg) {
      scanInterval = setInterval(() => {
        if (!processingRef.current) {
          handleScan();
        }
      }, 1500); // ความเร็วในการดึงภาพเช็ค (1.5 วิ)
    }

    return () => {
      if (scanInterval) clearInterval(scanInterval);
    };
  }, [autoScanEnabled, stream, errorMsg]);

  const activeLevel = predictedLevel ? RIPENESS_LEVELS[predictedLevel - 1] : null;

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden font-sans text-white select-none">

      {/* 1. Camera Feed (Background) */}
      <div className="absolute inset-0 z-0 bg-neutral-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-700 ${stream ? "opacity-100" : "opacity-0"}`}
        />
        {/* Soft dark gradient overlays to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

        {/* Scan Animation Overlay */}
        {isScanning && (
          <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden flex flex-col items-center justify-center">
            <div className="w-[80vw] h-[80vw] max-w-sm max-h-sm border-[1.5px] border-white/40 rounded-[2.5rem] relative">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-red-500 shadow-[0_0_20px_#ef4444] animate-[radar_1.5s_ease-in-out_infinite]" />
            </div>
          </div>
        )}

        {/* Viewfinder Frame (subtle) */}
        {!autoScanEnabled && !isScanning && !predictedLevel && (
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center transition-opacity duration-300">
            <div className="w-[80vw] h-[80vw] max-w-sm max-h-sm rounded-[2.5rem] border-[1px] border-white/20 flex flex-col justify-between p-6">
              <div className="flex justify-between">
                <div className="w-8 h-8 border-t-2 border-l-2 border-white/50 rounded-tl-2xl" />
                <div className="w-8 h-8 border-t-2 border-r-2 border-white/50 rounded-tr-2xl" />
              </div>
              <div className="flex justify-between">
                <div className="w-8 h-8 border-b-2 border-l-2 border-white/50 rounded-bl-2xl" />
                <div className="w-8 h-8 border-b-2 border-r-2 border-white/50 rounded-br-2xl" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Top Navigation */}
      <div className="absolute top-0 left-0 right-0 z-40 p-6 flex justify-between items-start">
        <div className="flex flex-col gap-1 drop-shadow-md">
          <h1 className="text-xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-200">
            Berry Lens
          </h1>
          <p className="text-xs text-white/60 font-medium tracking-wider uppercase">AI Quality Check</p>
        </div>
        <button
          onClick={() => setShowInfo(true)}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 active:scale-90 transition-transform shadow-lg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
        </button>
      </div>

      {errorMsg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500/80 backdrop-blur-xl px-5 py-2.5 rounded-full border border-red-400/50 shadow-2xl">
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* 3. Sliding Result Card */}
      <div className={`absolute bottom-36 left-0 right-0 z-40 px-6 transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${predictedLevel ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"
        }`}>
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-5 rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] flex items-center gap-5">
          <div className={`w-16 h-16 rounded-[1.25rem] bg-gradient-to-br ${activeLevel?.color} p-0.5 shadow-lg`}>
            <div className="w-full h-full bg-black/20 rounded-[1.15rem] flex items-center justify-center backdrop-blur-sm">
              <span className="text-3xl font-bold text-white drop-shadow-md">{activeLevel?.level}</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-white/20 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full text-white/90">Level {activeLevel?.level}</span>
            </div>
            <h3 className={`text-xl font-semibold tracking-tight ${activeLevel?.text}`}>{activeLevel?.label}</h3>
            <p className="text-sm text-white/70 mt-0.5 leading-snug">{activeLevel?.desc}</p>
          </div>

          <button onClick={() => {
            setPredictedLevel(null);
            setAutoScanEnabled(false);
          }} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 active:scale-90 transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>
      </div>

      {/* 4. Bottom Camera Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pb-10 pt-6 px-10 flex items-center justify-between">
        <div className="w-12" /> {/* Spacer */}

        {/* Auto-Scan Toggle Button */}
        <button
          onClick={() => setAutoScanEnabled(!autoScanEnabled)}
          disabled={!!errorMsg}
          className={`relative flex items-center justify-center group active:scale-[0.97] transition-all duration-300 ${autoScanEnabled ? 'opacity-80' : ''}`}
        >
          {/* Shutter Outer Ring */}
          <div className="w-20 h-20 rounded-full border-[3px] border-white/60 bg-transparent flex items-center justify-center backdrop-blur-sm transition-all group-active:border-white/40">
            {/* Auto-Scan Inner Status */}
            <div className={`w-[4.2rem] h-[4.2rem] rounded-full transition-all duration-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center justify-center ${autoScanEnabled
              ? "bg-red-500 scale-75 rounded-[1.2rem]"
              : "bg-white hover:bg-neutral-200 group-active:scale-95 group-active:bg-neutral-300"
              }`}>
              {autoScanEnabled ? (
                <div className="w-4 h-4 rounded-sm bg-white" /> // ไอคอน Stop
              ) : null}
            </div>
          </div>
        </button>

        {/* Flip Camera Button */}
        <button
          onClick={toggleCamera}
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 16.5A6.5 6.5 0 0 1 12 23a6.49 6.49 0 0 1-5.71-3.32" /><path d="M5.4 17.5 4 19.6" /><path d="M4 19.6 1.9 18" /><path d="M4 3.5A6.5 6.5 0 0 1 12 1a6.49 6.49 0 0 1 5.71 3.32" /><path d="M18.6 6.5 20 4.4" /><path d="M20 4.4 22.1 6" /></svg>
        </button>
      </div>

      {/* 5. Info Modal (Levels Guide) */}
      {showInfo && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full bg-[#111] rounded-t-[2.5rem] border-t border-white/10 pb-10 pt-4 px-6 shadow-2xl animate-in slide-in-from-bottom-full duration-500 cubic-bezier(0.16, 1, 0.3, 1)">
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold tracking-tight text-white">ระดับความสุก</h2>
              <button onClick={() => setShowInfo(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 active:scale-90">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pb-6 scrollbar-hide">
              {RIPENESS_LEVELS.map((level) => (
                <div key={level.level} className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${level.color} p-0.5 flex-shrink-0`}>
                    <div className="w-full h-full bg-black/20 rounded-[0.65rem] flex items-center justify-center backdrop-blur-sm font-bold text-lg">
                      {level.level}
                    </div>
                  </div>
                  <div>
                    <h4 className={`font-semibold ${level.text}`}>{level.label}</h4>
                    <p className="text-xs text-white/60">{level.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Animations styling embedded */}
      <style jsx global>{`
        @keyframes radar {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
