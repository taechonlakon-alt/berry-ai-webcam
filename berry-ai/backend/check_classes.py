from ultralytics import YOLO

model = YOLO("best.pt")
print("Model classes:")
print(model.names)
