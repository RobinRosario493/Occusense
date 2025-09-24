import cv2
import time
from datetime import datetime
from collections import defaultdict
import os
import uuid # Used for unique log IDs

# Azure SDKs
from azure.storage.blob import BlobServiceClient
from azure.cosmos import CosmosClient, PartitionKey, exceptions

# YOLO Model
from ultralytics import YOLO

# ----------------------------- Config -----------------------------
CAMERA_INDEX = 1
TARGET_WIDTH = 640
TARGET_HEIGHT = 480

WEIGHTS = "yolov10s.pt"
TRACKER_CFG = "bytetrack.yaml"

CONF_THRES = 0.60
IOU_THRES  = 0.45
LINE_POS_X_REL   = 0.40
DEBOUNCE_SEC     = 1.0
MAX_STAY_LOST_SEC = 2.0
PROXIMITY_THRESHOLD = 50

OUTPUT_DIR = "synopsis_videos"
os.makedirs(OUTPUT_DIR, exist_ok=True)


# ---------------------- Azure Blob Storage (for Videos) ----------------------
AZURE_CONNECTION_STRING = (
    "DefaultEndpointsProtocol=https;"
    "AccountName=occupancyrrrr2025;"
    "AccountKey=mKyEDavJ0Z22Jdzj/nz6QxbiTO9GJ/lWQb4sIfDZR1qR6ZN5G+QlUsqxTIYX00Hpf1vTCN99a6Xq+AStkuF2FA==;"
    "EndpointSuffix=core.windows.net"
)
AZURE_VIDEO_CONTAINER = "occupancy-data"
blob_service_client = BlobServiceClient.from_connection_string(AZURE_CONNECTION_STRING)


# ----------------------------- Azure Cosmos DB (for Data) -----------------------------
# Your credentials have been added below
COSMOS_ENDPOINT = "https://occusense.documents.azure.com:443/"
COSMOS_KEY = "DtLdeXmjYUMwCBRPchPcV4QGuD9QwulW38Fb69e0kLBTwSrXGTo3LrA4wwKZxbXsWGfzDJ872CMgACDbtZlsiA=="

COSMOS_DATABASE_NAME = "OccupancyDB"
LOGS_CONTAINER_NAME = "LogsContainer"
OCCUPANCY_CONTAINER_NAME = "OccupancyContainer"

# Initialize Cosmos DB Client
try:
    cosmos_client = CosmosClient(COSMOS_ENDPOINT, credential=COSMOS_KEY)
    database_client = cosmos_client.get_database_client(COSMOS_DATABASE_NAME)
    logs_container = database_client.get_container_client(LOGS_CONTAINER_NAME)
    occupancy_container = database_client.get_container_client(OCCUPANCY_CONTAINER_NAME)
    print("✅ Successfully connected to Azure Cosmos DB.")
except Exception as e:
    print(f"❌ ERROR: Could not connect to Cosmos DB. Check your Endpoint and Key. Error: {e}")
    cosmos_client = None


# ----------------------------- Azure Helper Functions -----------------------------

def log_event_cosmos(track_id, event_type):
    """Creates a new log document in the 'LogsContainer'."""
    if not cosmos_client: return

    try:
        log_item = {
            'id': str(uuid.uuid4()), # Unique ID for each log entry
            'track_id': track_id,
            'event': event_type,
            'timestamp': datetime.utcnow().isoformat() + 'Z' # Use UTC time
        }
        logs_container.create_item(body=log_item)
        print(f"📄 [COSMOS DB] Logged '{event_type}' for track_id: {track_id}")
    except exceptions.CosmosHttpResponseError as e:
        print(f"❌ ERROR logging event to Cosmos DB: {e.message}")
    except Exception as e:
        print(f"❌ An unexpected error occurred while logging event: {e}")


def upsert_occupancy_cosmos(count):
    """Creates or updates the live occupancy document in the 'OccupancyContainer'."""
    if not cosmos_client: return

    try:
        occupancy_item = {
            'id': 'live_count', # A single, fixed document ID to always update
            'occupancy': count,
            'last_updated': datetime.utcnow().isoformat() + 'Z'
        }
        occupancy_container.upsert_item(body=occupancy_item)
        print(f"📊 [COSMOS DB] Occupancy updated: {count} people")
    except exceptions.CosmosHttpResponseError as e:
        print(f"❌ ERROR upserting occupancy to Cosmos DB: {e.message}")
    except Exception as e:
        print(f"❌ An unexpected error occurred while upserting occupancy: {e}")


def upload_video_to_blob(file_path):
    """Uploads the final video summary to Azure Blob Storage."""
    if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
        print(f"❌ Video file not found or is empty. Skipping upload: {file_path}")
        return

    try:
        container_client = blob_service_client.get_container_client(AZURE_VIDEO_CONTAINER)
        # Create container if it doesn't exist
        try:
            container_client.create_container()
            print(f"✅ Container '{AZURE_VIDEO_CONTAINER}' created.")
        except Exception:
            print(f"✅ Container '{AZURE_VIDEO_CONTAINER}' already exists.")

        blob_name = os.path.basename(file_path)
        blob_client = container_client.get_blob_client(blob_name)

        print(f"📤 Uploading {blob_name} to Azure Blob Storage...")
        with open(file_path, "rb") as data:
            blob_client.upload_blob(data, overwrite=True, timeout=120)
        print(f"✅ Video uploaded successfully: {AZURE_VIDEO_CONTAINER}/{blob_name}")

    except Exception as e:
        print(f"❌ FAILED to upload video to Blob Storage: {e}")


# ----------------------------- Main Tracking Functions -----------------------------
def draw_arrow(frame, cx, y, direction="right", color=(0,0,255)):
    if direction=="right":
        cv2.arrowedLine(frame, (cx-20, y), (cx+20, y), color, 3, tipLength=0.5)
    else:
        cv2.arrowedLine(frame, (cx+20, y), (cx-20, y), color, 3, tipLength=0.5)

def is_nearby(cx, people_inside, prev_cx):
    return any(abs(cx - prev_cx.get(other, cx)) < PROXIMITY_THRESHOLD for other in people_inside)

def main():
    print("🚀 Starting Occupancy Monitoring System...")
    
    if not cosmos_client:
        print("Halting execution due to Cosmos DB connection failure.")
        return

    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open camera index {CAMERA_INDEX}")

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, TARGET_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, TARGET_HEIGHT)
    FPS = 15.0

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    summary_path = os.path.join(OUTPUT_DIR, f"summary_{timestamp}.mp4")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    summary_writer = cv2.VideoWriter(summary_path, fourcc, FPS, (TARGET_WIDTH, TARGET_HEIGHT))

    model = YOLO(WEIGHTS)

    people_inside = set()
    prev_cx = {}
    last_event_time = defaultdict(lambda: 0.0)
    last_seen = defaultdict(lambda: time.time())
    last_occ_push = 0.0

    print(f"\n📹 Camera configured. Tracking started...")
    print("Press 'q' in the display window to quit.")

    while True:
        ok, frame = cap.read()
        if not ok:
            print("[WARN] Camera frame not read; exiting loop.")
            break

        frame = cv2.resize(frame, (TARGET_WIDTH, TARGET_HEIGHT))
        h, w = frame.shape[:2]
        line_x = int(w * LINE_POS_X_REL)
        cv2.line(frame, (line_x, 0), (line_x, h), (255, 0, 0), 2)

        results = model.track(
            frame, persist=True, imgsz=640, conf=CONF_THRES, iou=IOU_THRES,
            classes=[0], tracker=TRACKER_CFG, verbose=False
        )

        if results and results[0].boxes is not None:
            for box in results[0].boxes:
                if box.id is None: continue
                tid = int(box.id.item())
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                cx = (x1 + x2) // 2
                cy = (y1 + y2) // 2
                now = time.time()
                last_seen[tid] = now

                if tid not in prev_cx:
                    prev_cx[tid] = cx
                    continue

                # --- ENTRY LOGIC ---
                if prev_cx[tid] < line_x <= cx and tid not in people_inside:
                    if now - last_event_time[tid] > DEBOUNCE_SEC and not is_nearby(cx, people_inside, prev_cx):
                        log_event_cosmos(tid, "entry")
                        people_inside.add(tid)
                        last_event_time[tid] = now
                        draw_arrow(frame, cx, cy, direction="right", color=(0,255,0))

                # --- EXIT LOGIC ---
                elif prev_cx[tid] > line_x >= cx and tid in people_inside:
                    if now - last_event_time[tid] > DEBOUNCE_SEC:
                        log_event_cosmos(tid, "exit")
                        people_inside.discard(tid)
                        last_event_time[tid] = now
                        draw_arrow(frame, cx, cy, direction="left", color=(0,0,255))
                
                prev_cx[tid] = cx
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(frame, f"ID {tid}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        # Remove lost IDs
        current_time = time.time()
        lost_ids = [tid for tid, t in last_seen.items() if current_time - t > MAX_STAY_LOST_SEC]
        for tid in lost_ids:
            people_inside.discard(tid)
            prev_cx.pop(tid, None)
            last_event_time.pop(tid, None)
            last_seen.pop(tid, None)

        # Update occupancy in Cosmos DB periodically
        if current_time - last_occ_push >= 1.0: # Update every 1 second
            upsert_occupancy_cosmos(len(people_inside))
            last_occ_push = current_time

        # Display HUD
        cv2.putText(frame, f"People Inside: {len(people_inside)}", (10, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)

        # Record video
        summary_writer.write(frame)
        cv2.imshow("Occupancy Tracking - Cosmos DB", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # --- Cleanup and Final Upload ---
    summary_writer.release()
    cap.release()
    cv2.destroyAllWindows()
    print(f"\n[SYSTEM] Local video saved: {summary_path}")

    # Final upload of the generated video
    upload_video_to_blob(summary_path)

if __name__ == "__main__":
    main()
