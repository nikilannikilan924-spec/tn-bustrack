// ============================================================
//  TN BusTrack — ESP32-S3 CAM AI Passenger Counter
//  Board: ESP32-S3-WROOM N16R8 (16MB flash, 8MB PSRAM)
//  Peripherals: OV2640 + NEO-M8N GPS + SIM7600 4G
//  Framework: TensorFlow Lite Micro + AT commands
// ============================================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <esp_camera.h>

// ── TENSORFLOW LITE ───────────────────────────────────────
#include "tensorflow/lite/micro/micro_mutable_op_resolver.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/schema/schema_generated.h"
#include "person_detect_model_data.h"

// ── SIM7600 4G (direct AT commands) ─────────────────────

// ── WATCHDOG ──────────────────────────────────────────────
#include "esp_task_wdt.h"

// ── HARDWARE CONFIG ───────────────────────────────────────
const char* BUS_ID    = "M31";
const int   TOTAL_SEATS = 42;

// ── WIFI (fallback) ──────────────────────────────────────
const char* WIFI_SSID     = "SSID";
const char* WIFI_PASSWORD = "Nikilan31";

// ── SIM7600 APN ───────────────────────────────────────────
const char* APN       = "airtelgprs.com";
const char* GPRS_USER = "";
const char* GPRS_PASS = "";

// ── SERVER ─────────────────────────────────────────────────
const char* COUNT_URL = "https://tn-bustrack-production-c340.up.railway.app/api/buses/count";
const char* GPS_URL   = "https://tn-bustrack-production-c340.up.railway.app/api/buses/update";

// ── PIN MAPPING ────────────────────────────────────────────
// Camera OV2640 (ESP32-S3 CAM standard pins)
#define PWDN_GPIO_NUM     -1
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM     15
#define SIOD_GPIO_NUM     4
#define SIOC_GPIO_NUM     5
#define Y2_GPIO_NUM       11
#define Y3_GPIO_NUM       9
#define Y4_GPIO_NUM       8
#define Y5_GPIO_NUM       10
#define Y6_GPIO_NUM       12
#define Y7_GPIO_NUM       18
#define Y8_GPIO_NUM       17
#define Y9_GPIO_NUM       16
#define VSYNC_GPIO_NUM    6
#define HREF_GPIO_NUM     7
#define PCLK_GPIO_NUM     13

// GPS NEO-M8N on UART1
#define GPS_TX_PIN 1
#define GPS_RX_PIN 2

// SIM7600 on UART2
#define SIM_TX_PIN 14
#define SIM_RX_PIN 21
#define SIM_PWRKEY 48
#define SIM_BAUD 115200

// LED indicator
#define LED_PIN 2

// ── TFLITE SETTINGS ────────────────────────────────────────
constexpr int kImgWidth = 96;
constexpr int kImgHeight = 96;
constexpr int kInputSize = kImgWidth * kImgHeight;
constexpr int kTensorArenaSize = 120 * 1024;
alignas(16) uint8_t tensor_arena[kTensorArenaSize];

// ── PERSON DETECTION ──────────────────────────────────────
const float CONFIDENCE_THRESHOLD = 0.7f;

struct Detection {
  int x1, y1, x2, y2;
  float score;
};

tflite::MicroMutableOpResolver<20> resolver;
const tflite::Model* model = nullptr;
tflite::MicroInterpreter* interpreter = nullptr;
TfLiteTensor* input = nullptr;

// ── TRACKING ──────────────────────────────────────────────
#define MAX_TRACKS 16
#define TRACK_TIMEOUT_FRAMES 8
#define LINE_Y (kImgHeight / 2)
#define CENTROID_DISTANCE_THRESH 20

struct Track {
  int id;
  int cx, cy;
  int prevY;
  int framesSinceUpdate;
  bool active;
  bool counted;
};

Track tracks[MAX_TRACKS];
int nextTrackId = 0;
int passengers = 0;
int pendingPassengers = -1;
unsigned long lastCountTime = 0;
unsigned long lastCountSend = 0;
unsigned long lastGpsSend = 0;

const unsigned long COUNT_COOLDOWN = 1000;
const unsigned long COUNT_INTERVAL = 2000;
const unsigned long GPS_INTERVAL_MOVING  = 5000;
const unsigned long GPS_INTERVAL_STOPPED = 20000;

// ── SERIAL PORTS ──────────────────────────────────────────
HardwareSerial gpsSerial(1);
HardwareSerial simSerial(2);

// ── GPS DATA ──────────────────────────────────────────────
float gpsLat = 0, gpsLng = 0;
float gpsSpeed = 0;
int gpsSats = 0;
float gpsHdop = 99.0f;
bool gpsFixed = false;
unsigned long lastGpsFix = 0;

// ── NETWORK STATE ─────────────────────────────────────────
WiFiClientSecure wifiClient;
bool useWiFi = false;
bool useGPRS = false;
String signalType = "none";
int simCsq = 0;

// ── BATTERY ───────────────────────────────────────────────
float batteryVoltage = 0.0f;

// ── TIMING ────────────────────────────────────────────────
unsigned long lastFrameTime = 0;
unsigned long lastDebugPrint = 0;
unsigned long loopCount = 0;

// ============================================================
//  CAMERA
// ============================================================
bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_GRAYSCALE;
  config.frame_size = FRAMESIZE_QQVGA;
  config.jpeg_quality = 10;
  config.fb_count = 2;
  config.grab_mode = CAMERA_GRAB_LATEST;
  config.fb_location = CAMERA_FB_IN_DRAM;
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x\n", err);
    return false;
  }
  sensor_t* s = esp_camera_sensor_get();
  s->set_framesize(s, FRAMESIZE_QQVGA);
  s->set_pixformat(s, PIXFORMAT_GRAYSCALE);
  s->set_hmirror(s, 0);
  s->set_vflip(s, 0);
  Serial.println("Camera OK — QQVGA Grayscale");
  return true;
}

void downscale(uint8_t* src, int sw, int sh, uint8_t* dst) {
  for (int y = 0; y < kImgHeight; y++) {
    for (int x = 0; x < kImgWidth; x++) {
      dst[y * kImgWidth + x] = src[(y * sh / kImgHeight) * sw + (x * sw / kImgWidth)];
    }
  }
}

// ============================================================
//  TFLITE SETUP
// ============================================================
void setupTFLite() {
  resolver.AddConv2D();
  resolver.AddDepthwiseConv2D();
  resolver.AddAveragePool2D();
  resolver.AddSoftmax();
  resolver.AddFullyConnected();
  resolver.AddRelu();
  resolver.AddMaxPool2D();
  resolver.AddQuantize();
  resolver.AddPad();
  resolver.AddConcatenation();
  resolver.AddReshape();

  model = tflite::GetModel(g_person_detect_model_data);
  if (model->version() != TFLITE_SCHEMA_VERSION) {
    Serial.println("Model schema version mismatch!");
    Serial.print("Expected: "); Serial.print(TFLITE_SCHEMA_VERSION);
    Serial.print(" Got: "); Serial.println(model->version());
    while (1) { delay(100); }
  }
  static tflite::MicroInterpreter static_interpreter(
    model, resolver, tensor_arena, kTensorArenaSize
  );
  interpreter = &static_interpreter;
  TfLiteStatus alloc = interpreter->AllocateTensors();
  if (alloc != kTfLiteOk) {
    Serial.println("TFLite AllocateTensors failed!");
    while (1) { delay(100); }
  }
  input = interpreter->input(0);
  Serial.print("TFLite OK — input dims: ");
  Serial.print(input->dims->data[0]); Serial.print("x");
  Serial.print(input->dims->data[1]); Serial.print("x");
  Serial.print(input->dims->data[2]); Serial.print("x");
  Serial.println(input->dims->data[3]);
}

// ============================================================
//  PERSON DETECTION & TRACKING
// ============================================================

int detectPeople(uint8_t* image, Detection* detections, int maxDetections) {
  for (int i = 0; i < kInputSize; i++) {
    input->data.int8[i] = static_cast<int8_t>(image[i] - 128);
  }

  TfLiteStatus invoke = interpreter->Invoke();
  if (invoke != kTfLiteOk) {
    Serial.println("Invoke failed!");
    return 0;
  }

  TfLiteTensor* output = interpreter->output(0);
  int numDetections = 0;

  // The standard person detection model has 1 output:
  // [1, 1, 1, 3] — 3 values: person_score, no_person_score, person_index
  // Or sometimes [1, N] for detection boxes
  // We need to handle multiple output formats

  int outCount = output->dims->data[output->dims->size - 1];
  if (outCount == 3) {
    // Standard person detection model output:
    // [person_score, no_person_score, person_index]
    float personScore = 0;
    if (output->type == kTfLiteInt8) {
      personScore = (output->data.int8[0] + 128) / 255.0f;
    } else if (output->type == kTfLiteUInt8) {
      personScore = output->data.uint8[0] / 255.0f;
    } else if (output->type == kTfLiteFloat32) {
      personScore = output->data.f[0];
    }

    if (personScore >= CONFIDENCE_THRESHOLD) {
      detections[0].x1 = 0; detections[0].y1 = 0;
      detections[0].x2 = kImgWidth; detections[0].y2 = kImgHeight;
      detections[0].score = personScore;
      numDetections = 1;
    }
  } else {
    // Multi-box detection model with N boxes
    if (output->type == kTfLiteInt8 || output->type == kTfLiteUInt8) {
      int numBoxes = (outCount >= 4) ? (outCount / 4) : 0;
      if (numBoxes > maxDetections) numBoxes = maxDetections;
      for (int i = 0; i < numBoxes; i++) {
        float score;
        if (output->type == kTfLiteInt8) {
          score = (output->data.int8[i] + 128) / 255.0f;
        } else {
          score = output->data.uint8[i] / 255.0f;
        }
        if (score >= CONFIDENCE_THRESHOLD) {
          detections[numDetections].x1 = 0;
          detections[numDetections].y1 = 0;
          detections[numDetections].x2 = kImgWidth;
          detections[numDetections].y2 = kImgHeight;
          detections[numDetections].score = score;
          numDetections++;
        }
      }
    } else if (output->type == kTfLiteFloat32) {
      int numBoxes = (outCount >= 4) ? (outCount / 4) : 0;
      if (numBoxes > maxDetections) numBoxes = maxDetections;
      for (int i = 0; i < numBoxes; i++) {
        float score = output->data.f[i];
        if (score >= CONFIDENCE_THRESHOLD) {
          detections[numDetections].x1 = 0;
          detections[numDetections].y1 = 0;
          detections[numDetections].x2 = kImgWidth;
          detections[numDetections].y2 = kImgHeight;
          detections[numDetections].score = score;
          numDetections++;
        }
      }
    }
  }
  return numDetections;
}

float euclideanDist(int x1, int y1, int x2, int y2) {
  return sqrt(pow(x2 - x1, 2) + pow(y2 - y1, 2));
}

void resetTracks() {
  for (int i = 0; i < MAX_TRACKS; i++) {
    tracks[i].active = false;
  }
}

int findOrCreateTrack(int cx, int cy) {
  int bestMatch = -1;
  float bestDist = CENTROID_DISTANCE_THRESH;

  for (int i = 0; i < MAX_TRACKS; i++) {
    if (tracks[i].active) {
      float d = euclideanDist(tracks[i].cx, tracks[i].cy, cx, cy);
      if (d < bestDist) {
        bestDist = d;
        bestMatch = i;
      }
    }
  }

  if (bestMatch >= 0) {
    tracks[bestMatch].prevY = tracks[bestMatch].cy;
    tracks[bestMatch].cx = cx;
    tracks[bestMatch].cy = cy;
    tracks[bestMatch].framesSinceUpdate = 0;
    return tracks[bestMatch].id;
  }

  // Create new track
  for (int i = 0; i < MAX_TRACKS; i++) {
    if (!tracks[i].active) {
      tracks[i].id = nextTrackId++;
      tracks[i].cx = cx;
      tracks[i].cy = cy;
      tracks[i].prevY = cy;
      tracks[i].framesSinceUpdate = 0;
      tracks[i].active = true;
      tracks[i].counted = false;
      return tracks[i].id;
    }
  }
  return -1;
}

void ageTracks() {
  for (int i = 0; i < MAX_TRACKS; i++) {
    if (tracks[i].active) {
      tracks[i].framesSinceUpdate++;
      if (tracks[i].framesSinceUpdate > TRACK_TIMEOUT_FRAMES) {
        tracks[i].active = false;
      }
    }
  }
}

int updateTracking(Detection* detections, int numDetections) {
  int crossings = 0;

  // Mark all tracks as unmatched for this frame
  for (int i = 0; i < numDetections; i++) {
    int cx = (detections[i].x1 + detections[i].x2) / 2;
    int cy = (detections[i].y1 + detections[i].y2) / 2;
    int trackId = findOrCreateTrack(cx, cy);
    if (trackId >= 0) {
      // Find the track object
      for (int t = 0; t < MAX_TRACKS; t++) {
        if (tracks[t].active && tracks[t].id == trackId && !tracks[t].counted) {
          // Check virtual line crossing
          if ((tracks[t].prevY <= LINE_Y && tracks[t].cy > LINE_Y) ||
              (tracks[t].prevY >= LINE_Y && tracks[t].cy < LINE_Y)) {
            tracks[t].counted = true;
            crossings++;
            if (tracks[t].cy > LINE_Y) {
              // Moving downward = entering (lower Y = higher in image for camera)
              // With camera at top of doorway: moving down in image = person entering
              passengers++;
              pendingPassengers = passengers;
              Serial.print("ENTER cx="); Serial.print(cx);
              Serial.print(" cy="); Serial.print(cy);
              Serial.print(" prevY="); Serial.print(tracks[t].prevY);
              Serial.print(" total="); Serial.println(passengers);
            }
          }
          break;
        }
      }
    }
  }

  ageTracks();
  return crossings;
}

// ============================================================
//  GPS
// ============================================================
void parseGGA(const char* line) {
  char buf[100];
  strncpy(buf, line, sizeof(buf) - 1);
  buf[sizeof(buf) - 1] = 0;
  char* ptr = buf;
  int field = 0;
  char latStr[16] = "", lngStr[16] = "", latDir = 'N', lngDir = 'E';
  int fix = 0;
  int sats = 0;
  float hdop = 99.0f;

  char* token = strtok(ptr, ",");
  while (token) {
    switch (field) {
      case 2: strncpy(latStr, token, 15); break;
      case 3: if (strlen(token) > 0) latDir = token[0]; break;
      case 4: strncpy(lngStr, token, 15); break;
      case 5: if (strlen(token) > 0) lngDir = token[0]; break;
      case 6: fix = atoi(token); break;
      case 7: sats = atoi(token); break;
      case 8: hdop = atof(token); break;
    }
    field++;
    token = strtok(NULL, ",");
  }

  gpsSats = sats;
  gpsHdop = hdop;

  if (fix > 0 && strlen(latStr) > 0 && strlen(lngStr) > 0) {
    float lat = atof(latStr);
    int d = int(lat / 100);
    gpsLat = d + (lat - d * 100) / 60;
    if (latDir == 'S') gpsLat = -gpsLat;

    float lng = atof(lngStr);
    d = int(lng / 100);
    gpsLng = d + (lng - d * 100) / 60;
    if (lngDir == 'W') gpsLng = -gpsLng;

    if (sats >= 4 && hdop < 2.5f) {
      gpsFixed = true;
      lastGpsFix = millis();
    } else {
      gpsFixed = false;
    }
  }
}

void readGPS() {
  while (gpsSerial.available()) {
    String line = gpsSerial.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) continue;

    if (line.startsWith("$GNGGA") || line.startsWith("$GPGGA")) {
      parseGGA(line.c_str());
    }

    if (line.startsWith("$GPVTG") || line.startsWith("$GNVTG")) {
      char buf[100];
      line.toCharArray(buf, 99);
      char* ptr = buf;
      int field = 0;
      char* token = strtok(ptr, ",");
      while (token) {
        if (field == 7) {
          gpsSpeed = atof(token) * 1.852f;
          break;
        }
        field++;
        token = strtok(NULL, ",");
      }
    }
  }
}

// ============================================================
//  NETWORK
// ============================================================
bool connectWiFi() {
  Serial.print("Connecting WiFi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  for (int i = 0; i < 30; i++) {
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println(" OK");
      Serial.print("IP: "); Serial.println(WiFi.localIP());
      wifiClient.setInsecure();
      return true;
    }
    delay(500);
    Serial.print(".");
  }
  Serial.println(" FAIL");
  return false;
}

String simSendAT(const String& cmd, int timeout = 2000) {
  simSerial.println(cmd);
  unsigned long start = millis();
  String response = "";
  while (millis() - start < timeout) {
    while (simSerial.available()) {
      char c = simSerial.read();
      response += c;
    }
    if (response.indexOf("OK") >= 0 || response.indexOf("ERROR") >= 0) {
      break;
    }
    delay(10);
  }
  response.trim();
  return response;
}

bool simWaitFor(const String& target, int timeout = 10000) {
  unsigned long start = millis();
  String buf = "";
  while (millis() - start < timeout) {
    while (simSerial.available()) {
      char c = simSerial.read();
      buf += c;
      if (buf.indexOf(target) >= 0) return true;
      if (buf.length() > 200) buf = buf.substring(buf.length() - 100);
    }
    delay(10);
  }
  return false;
}

bool connectSIM7600() {
  Serial.print("Booting SIM7600");
  simSerial.begin(SIM_BAUD, SERIAL_8N1, SIM_RX_PIN, SIM_TX_PIN);
  delay(100);

  // Pulse PWRKEY (active low for >1s)
  pinMode(SIM_PWRKEY, OUTPUT);
  digitalWrite(SIM_PWRKEY, LOW);
  delay(1500);
  digitalWrite(SIM_PWRKEY, HIGH);
  delay(500);

  // Wait for module to boot
  delay(2000);

  // Test AT
  for (int i = 0; i < 10; i++) {
    String r = simSendAT("AT", 1000);
    if (r.indexOf("OK") >= 0) {
      Serial.println(" OK");
      break;
    }
    Serial.print(".");
    delay(1000);
    if (i == 9) {
      Serial.println(" SIM7600 no response");
      return false;
    }
  }

  // Disable echo
  simSendAT("ATE0", 1000);

  // Get IMEI
  String imei = simSendAT("AT+CGSN", 2000);
  Serial.print("IMEI: ");
  int imeiStart = imei.indexOf("\n") + 1;
  Serial.println(imei.substring(imeiStart).substring(0, 15));

  // Check SIM
  String cpin = simSendAT("AT+CPIN?", 2000);
  if (cpin.indexOf("READY") < 0) {
    Serial.println("SIM not ready: " + cpin);
    return false;
  }

  // Wait for network registration
  Serial.print("Registering network");
  for (int i = 0; i < 30; i++) {
    String creg = simSendAT("AT+CREG?", 1000);
    if (creg.indexOf("+CREG:") >= 0) {
      int regStatus = 0;
      int idx = creg.indexOf(",");
      if (idx >= 0) regStatus = creg.substring(idx + 1).toInt();
      if (regStatus == 1 || regStatus == 5) {
        Serial.println(" OK");
        break;
      }
    }
    Serial.print(".");
    delay(1000);
    if (i == 29) {
      Serial.println(" No network registration");
      return false;
    }
  }

  // Attach GPRS
  simSendAT("AT+CGATT=1", 5000);
  simSendAT("AT+CGDCONT=1,\"IP\",\"" + String(APN) + "\"", 2000);
  String cgact = simSendAT("AT+CGACT=1,1", 5000);
  if (cgact.indexOf("ERROR") >= 0) {
    Serial.println("GPRS attach failed");
    return false;
  }

  // Get signal quality
  String csq = simSendAT("AT+CSQ", 2000);
  if (csq.indexOf("+CSQ:") >= 0) {
    int startIdx = csq.indexOf(":") + 1;
    int commaIdx = csq.indexOf(",", startIdx);
    simCsq = csq.substring(startIdx, commaIdx).toInt();
    Serial.print("Signal: ");
    Serial.print(simCsq);
    Serial.println("/31");
  }

  Serial.println("GPRS connected");
  return true;
}

bool connectNetwork() {
  if (connectWiFi()) {
    useWiFi = true;
    useGPRS = false;
    signalType = "WiFi";
    return true;
  }

  if (connectSIM7600()) {
    useWiFi = false;
    useGPRS = true;
    signalType = "4G";
    Serial.print("Signal: ");
    Serial.print(simCsq);
    Serial.println("/31 (4G)");
    return true;
  }

  signalType = "none";
  return false;
}

// ============================================================
//  HTTP
// ============================================================
bool httpPost(const char* url, const String& body) {
  if (useWiFi) {
    if (WiFi.status() != WL_CONNECTED) return false;
    return httpPostWiFi(url, body);
  } else if (useGPRS) {
    return httpPostGPRS(url, body);
  }
  return false;
}

bool httpPostWiFi(const char* url, const String& body) {
  WiFiClient& c = wifiClient;
  if (!c.connect("tn-bustrack-production-c340.up.railway.app", 443)) {
    return false;
  }
  String request = "POST " + String(url) + " HTTP/1.1\r\n";
  request += "Host: tn-bustrack-production-c340.up.railway.app\r\n";
  request += "Content-Type: application/json\r\n";
  request += "Content-Length: " + String(body.length()) + "\r\n";
  request += "Connection: close\r\n\r\n";
  request += body;
  c.print(request);
  c.stop();
  return true;
}

bool httpPostGPRS(const char* path, const String& body) {
  int len = body.length();
  simSerial.println("AT+CHTTPSSL=1");
  delay(200);
  simSerial.println("AT+HTTPINIT");
  delay(500);
  simSerial.println("AT+HTTPPARA=\"CID\",1");
  delay(200);
  String fullUrl = "https://tn-bustrack-production-c340.up.railway.app";
  fullUrl += path;
  simSerial.print("AT+HTTPPARA=\"URL\",\"");
  simSerial.print(fullUrl);
  simSerial.println("\"");
  delay(200);
  simSerial.println("AT+HTTPPARA=\"CONTENT\",\"application/json\"");
  delay(200);
  simSerial.print("AT+HTTPDATA=");
  simSerial.print(len);
  simSerial.println(",15000");
  delay(500);
  for (int i = 0; i < len; i++) {
    simSerial.print(body.charAt(i));
    if (i % 100 == 0 && i > 0) {
      delay(50);
    }
  }
  delay(500);
  simSerial.println();
  delay(500);
  simSerial.println("AT+HTTPACTION=1");
  delay(2000);
  simSerial.println("AT+HTTPTERM");
  return true;
}

// ============================================================
//  DATA SENDING
// ============================================================
void sendLocation() {
  unsigned long interval = (gpsSpeed > 5) ? GPS_INTERVAL_MOVING : GPS_INTERVAL_STOPPED;
  if (millis() - lastGpsSend < interval) return;
  lastGpsSend = millis();

  if (!gpsFixed && millis() - lastGpsFix > 60000) {
    gpsLat = 0;
    gpsLng = 0;
  }

  int availableSeats = TOTAL_SEATS - passengers;
  if (availableSeats < 0) availableSeats = 0;

  String body = "{";
  body += "\"busId\":\"" + String(BUS_ID) + "\"";
  body += ",\"lat\":" + String(gpsLat, 6);
  body += ",\"lng\":" + String(gpsLng, 6);
  body += ",\"speed\":" + String(gpsSpeed, 1);
  body += ",\"passengers\":" + String(passengers);
  body += ",\"availableSeats\":" + String(availableSeats);
  body += ",\"gpsFixed\":" + String(gpsFixed ? "true" : "false");
  body += ",\"signal\":\"" + signalType + "\"";
  body += ",\"satellites\":" + String(gpsSats);
  body += ",\"hdop\":" + String(gpsHdop, 1);
  body += ",\"batteryVoltage\":" + String(batteryVoltage, 2);
  body += "}";

  bool ok = httpPost("/api/buses/update", body);
  if (ok) {
    Serial.print("GPS↑ OK ");
  } else {
    Serial.print("GPS↑ FAIL ");
  }
  Serial.print(String(gpsLat, 4) + "," + String(gpsLng, 4));
  Serial.print(" spd=" + String(gpsSpeed, 0) + "km/h");
  Serial.print(" p=" + String(passengers));
  Serial.print(" sat=" + String(gpsSats));
  Serial.print(" hdop=" + String(gpsHdop, 1));
  Serial.println(" sig=" + signalType);
}

void sendCount() {
  if (millis() - lastCountSend < COUNT_INTERVAL) return;
  lastCountSend = millis();

  String body = "{";
  body += "\"busId\":\"" + String(BUS_ID) + "\"";
  body += ",\"passengers\":" + String(passengers);
  body += "}";

  bool ok = httpPost("/api/buses/count", body);
  Serial.print("COUNT↑ ");
  Serial.print(ok ? "OK" : "FAIL");
  Serial.print(" p=");
  Serial.println(passengers);
}

// ============================================================
//  WATCHDOG
// ============================================================
void setupWatchdog() {
  esp_task_wdt_config_t wdtConfig = {
    .timeout_ms = 10000,
    .idle_core_mask = 0,
    .trigger_panic = true,
  };
  esp_task_wdt_init(&wdtConfig);
  esp_task_wdt_add(NULL);
}

// ============================================================
//  SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n=== TN BusTrack S3 CAM v1 ===");
  Serial.println("Board: ESP32-S3 N16R8");
  Serial.print("Bus ID: "); Serial.println(BUS_ID);
  Serial.print("PSRAM: "); Serial.println(psramFound() ? "OK" : "NOT FOUND");

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  setupWatchdog();

  if (!psramFound()) {
    Serial.println("WARNING: PSRAM not found — tensor arena may be limited");
  }

  if (!initCamera()) {
    Serial.println("FATAL: Camera init failed");
    while (1) { delay(1000); }
  }

  setupTFLite();

  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("GPS: 9600 baud");

  if (!connectNetwork()) {
    Serial.println("WARNING: No network — will retry in loop");
  }

  resetTracks();
  digitalWrite(LED_PIN, HIGH);
  Serial.println("System ready.\n");
}

// ============================================================
//  MAIN LOOP
// ============================================================
void loop() {
  esp_task_wdt_reset();
  unsigned long now = millis();
  loopCount++;

  readGPS();

  // GPS fix timeout
  if (gpsFixed && now - lastGpsFix > 30000) {
    gpsFixed = false;
    Serial.println("GPS fix lost");
  }

  // Grab camera frame
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera frame grab failed");
    delay(10);
    return;
  }

  // Downscale to 96x96 for TFLite
  uint8_t* smallImg = (uint8_t*)ps_malloc(kInputSize);
  if (!smallImg) {
    Serial.println("ps_malloc failed");
    esp_camera_fb_return(fb);
    delay(10);
    return;
  }

  downscale(fb->buf, fb->width, fb->height, smallImg);
  esp_camera_fb_return(fb);

  // Run person detection
  Detection detections[5];
  int numDetections = detectPeople(smallImg, detections, 5);

  // Update tracking
  if (numDetections > 0) {
    updateTracking(detections, numDetections);
  }

  free(smallImg);

  // Send count immediately if someone entered/exited
  if (pendingPassengers >= 0) {
    sendCount();
    pendingPassengers = -1;
  }

  // Periodic GPS upload
  sendLocation();

  // Periodic status debug
  if (now - lastDebugPrint > 10000) {
    lastDebugPrint = now;
    Serial.print("STATUS: p="); Serial.print(passengers);
    Serial.print(" gps="); Serial.print(gpsFixed ? "OK" : "NO");
    Serial.print(" net="); Serial.print(signalType);
    Serial.print(" fps=");
    float fps = loopCount / ((now - lastFrameTime) / 1000.0f);
    Serial.print(fps, 1);
    Serial.println("Hz");
    lastFrameTime = now;
    loopCount = 0;

    // Retry network if lost
    if (!useWiFi && !useGPRS) {
      connectNetwork();
    }
    if (useWiFi && WiFi.status() != WL_CONNECTED) {
      useWiFi = false;
      connectNetwork();
    }
    if (useGPRS) {
      String r = simSendAT("AT+CGACT?", 1000);
      if (r.indexOf("+CGACT: 1,1") < 0) {
        useGPRS = false;
        connectNetwork();
      }
    }
  }

  delay(50);
}
