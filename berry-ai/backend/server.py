from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import io
from PIL import Image

app = FastAPI(title="Berry Lens AI API")

# อนุญาตให้ Next.js (หน้าเว็บ) เรียก API นี้ได้
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # หรือใส่ ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# โหลดโมเดล
model = YOLO("best.pt")

@app.get("/")
def read_root():
    return {"message": "Berry Lens AI API is running! 🍓"}

@app.post("/predict")
async def predict_ripeness(image: UploadFile = File(...)):
    try:
        # อ่านไฟล์รูป
        contents = await image.read()
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # ค้นหาคำทำนาย
        results = model.predict(source=img, conf=0.25) # ปรับ confidence ได้ตามต้องการ
        
        if len(results) == 0 or len(results[0].boxes) == 0:
            return {"level": None, "confidence": 0, "message": "ไม่พบสตรอว์เบอร์รี"}
        
        # หากเจอสิ่งของหลายชิ้น ค้นหาชิ้นที่มั่นใจที่สุด
        boxes = results[0].boxes
        best_box = max(boxes, key=lambda b: b.conf[0].item())
        
        class_id = int(best_box.cls[0].item())
        confidence = float(best_box.conf[0].item())
        class_name = model.names[class_id]
        
        # ส่งข้อมูลกลับไปให้ UI ประมวลผลต่อ
        return {
            "class_id": class_id,
            "class_name": class_name,
            "confidence": confidence,
            "message": "success"
        }

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    # รันเซิฟเวอร์ที่พอร์ต 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
