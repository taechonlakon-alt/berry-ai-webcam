/**
 * ไฟล์เชื่อมต่อกับโมเดล AI ผ่านตัวกลาง (Python FastAPI Server)
 * เซิร์ฟเวอร์ Python จะรันอยู่ที่ localhost:8000
 */

export interface PredictionBox {
    xc: number;
    yc: number;
    w: number;
    h: number;
}

export interface PredictionResult {
    level: number;
    box: PredictionBox;
}

export async function predictRipeness(imageElement: HTMLVideoElement): Promise<PredictionResult | null> {
    try {
        // 1. นำภาพจาก Video เข้า Canvas เพื่อแปลงเป็นรูปภาพ
        const canvas = document.createElement("canvas");
        canvas.width = imageElement.videoWidth;
        canvas.height = imageElement.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

        // 2. แปลง Canvas เป็น Blob (JPEG)
        const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9);
        });

        if (!blob) return null;

        // 3. แนบไฟล์ส่งไปให้ API (FastAPI)
        const formData = new FormData();
        formData.append("image", blob, "scan.jpg");

        // 4. ยิง Request ไปที่ Python Backend
        const response = await fetch("https://berry-ai-webcam.onrender.com/predict", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        // รูปแบบข้อมูลที่ Python คืนค่ามา เช่น:
        // { "class_id": 1, "class_name": "Full-Ripe", "confidence": 0.85, "box": { xc, yc, w, h } }
        if (!data.class_name || !data.box) {
            console.warn(data.message);
            return null;
        }

        // แมปชื่อคลาสจาก YOLO กลับไปเป็นตัวเลขระดับความสุก (1-6) สำหรับหน้าจอ UI
        const ripnessMap: Record<string, number> = {
            "Green": 1,
            "White": 2,
            "Early-Turning": 3,
            "Turning": 4,
            "Half-Ripe": 5,
            "Full-Ripe": 6
        };

        const level = ripnessMap[data.class_name] || null;
        if (level === null) return null;

        return {
            level,
            box: data.box as PredictionBox
        };
    } catch (error) {
        console.error("Prediction failed:", error);
        throw error;
    }
}
