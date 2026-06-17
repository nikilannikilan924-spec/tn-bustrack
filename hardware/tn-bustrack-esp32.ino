// ============================================================
//  TN BusTrack — ESP32 Full Firmware
//  Hardware: ESP32 38-pin + NEO-6M + HC-SR04 x2 + Relay
//  Connection: Phone Hotspot → Railway Server
// ============================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <ArduinoJson.h>

// ── CHANGE THESE 3 LINES ────────────────────────────────────
const char* WIFI_SSID     = "YourHotspotName";
const char* WIFI_PASSWORD = "YourPassword";
const char* BUS_ID        = "TN07 828 1122";   // any name works
// ────────────────────────────────────────────────────────────

// ── SERVER URLs ─────────────────────────────────────────────
const char* GPS_URL    = "https://tn-bustrack-production.up.railway.app/api/buses/update";
const char* COUNT_URL  = "https://tn-bustrack-production.up.railway.app/api/buses/count";
const char* CONFIG_URL = "https://tn-bustrack-production.up.railway.app/api/config/";
// ────────────────────────────────────────────────────────────

// ── PIN DEFINITIONS ─────────────────────────────────────────
#define GPS_RX_PIN    16
#define GPS_TX_PIN    17
#define TRIG_A        12
#define ECHO_A        14
#define TRIG_B        27
#define ECHO_B        15
#define RELAY_PIN     13
#define LED_PIN        2
#define RESET_BTN     32
// ────────────────────────────────────────────────────────────

// ── BUS CONFIG (loaded from server) ─────────────────────────
int    totalSeats    = 42;
String routeName     = "Default Route";
String driverName    = "Unknown";

// ── PASSENGER COUNT ─────────────────────────────────────────
volatile int  insideCount     = 0;
volatile int  seatsAvailable  = 42;
volatile bool countChanged    = false;

// ── SENSOR STATE ────────────────────────────────────────────
volatile bool     sensorA_active = false;
volatile bool     sensorB_active = false;
volatile uint32_t sensorA_time   = 0;
volatile uint32_t sensorB_time   = 0;

// ── GPS ──────────────────────────────────────────────────────
TinyGPSPlus      gps;
HardwareSerial   gpsSerial(1);
double  currentLat  = 11.341023;
double  currentLng  = 77.717284;
double  currentSpd  = 0.0;
bool    gpsFixed    = false;

// ── TIMING ──────────────────────────────────────────────────
unsigned long lastGPSSend     = 0;
unsigned long lastConfigFetch = 0;
unsigned long lastWiFiCheck   = 0;

// ────────────────────────────────────────────────────────────
//  INTERRUPT SERVICE ROUTINES
// ────────────────────────────────────────────────────────────
void IRAM_ATTR onEchoA() {
  sensorA_active = true;
  sensorA_time   = millis();
}
void IRAM_ATTR onEchoB() {
  sensorB_active = true;
  sensorB_time   = millis();
}

// ────────────────────────────────────────────────────────────
//  LED HELPER
// ────────────────────────────────────────────────────────────
void blinkLED(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(120);
    digitalWrite(LED_PIN, LOW);
    delay(120);
  }
}

// ────────────────────────────────────────────────────────────
//  GET DISTANCE (cm) FROM HC-SR04
// ────────────────────────────────────────────────────────────
long getDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 25000);
  if (duration == 0) return 999;

  long dist = (duration * 0.034) / 2;
  if (dist < 3 || dist > 200) return 999;
  return dist;
}

// ────────────────────────────────────────────────────────────
//  WIFI CONNECT
// ────────────────────────────────────────────────────────────
void connectWiFi() {
  Serial.print("Connecting to hotspot: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected! ");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    blinkLED(3);
  } else {
    Serial.println("\nWiFi FAILED! Will retry...");
    blinkLED(5);
  }
}

// ────────────────────────────────────────────────────────────
//  FETCH CONFIG FROM SERVER
// ────────────────────────────────────────────────────────────
void fetchConfig() {
  if (WiFi.status() != WL_CONNECTED) return;

  String url = String(CONFIG_URL) + String(BUS_ID);
  HTTPClient http;
  http.begin(url);
  http.setTimeout(5000);

  int code = http.GET();
  if (code == 200) {
    String body = http.getString();
    StaticJsonDocument<512> doc;
    if (!deserializeJson(doc, body)) {
      totalSeats   = doc["totalSeats"] | 42;
      routeName    = doc["routeName"]  | "Default";
      driverName   = doc["driverName"] | "Unknown";
      seatsAvailable = totalSeats - insideCount;

      Serial.println("Config loaded ");
      Serial.println("Seats: " + String(totalSeats));
      Serial.println("Route: " + routeName);
    }
  } else {
    Serial.println("Config fetch skipped (using defaults)");
  }
  http.end();
}

// ────────────────────────────────────────────────────────────
//  SEND GPS DATA TO SERVER
// ────────────────────────────────────────────────────────────
void sendGPSData() {
  if (WiFi.status() != WL_CONNECTED) return;

  StaticJsonDocument<256> doc;
  doc["busId"]    = BUS_ID;
  doc["lat"]      = currentLat;
  doc["lng"]      = currentLng;
  doc["speed"]    = currentSpd;
  doc["seats"]    = seatsAvailable;
  doc["inside"]   = insideCount;
  doc["route"]    = routeName;
  doc["gpsFixed"] = gpsFixed;

  String json;
  serializeJson(doc, json);

  HTTPClient http;
  http.begin(GPS_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(4000);

  int code = http.POST(json);

  if (code == 200 || code == 201) {
    Serial.println("GPS sent   LAT:" + String(currentLat, 6) +
                   "  LNG:" + String(currentLng, 6) +
                   "  Seats:" + String(seatsAvailable));
    digitalWrite(RELAY_PIN, LOW);
    delay(80);
    digitalWrite(RELAY_PIN, HIGH);
  } else {
    Serial.println("GPS send failed: " + String(code));
  }
  http.end();
}

// ────────────────────────────────────────────────────────────
//  SEND COUNT ONLY
// ────────────────────────────────────────────────────────────
void sendCountOnly() {
  if (WiFi.status() != WL_CONNECTED) return;

  StaticJsonDocument<128> doc;
  doc["busId"]  = BUS_ID;
  doc["inside"] = insideCount;
  doc["seats"]  = seatsAvailable;

  String json;
  serializeJson(doc, json);

  HTTPClient http;
  http.begin(COUNT_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(3000);
  http.POST(json);
  http.end();

  Serial.println("Count sent instantly   Inside:" +
                 String(insideCount) + "  Seats:" +
                 String(seatsAvailable));
}

// ────────────────────────────────────────────────────────────
//  PROCESS PASSENGER COUNT
// ────────────────────────────────────────────────────────────
void processCount() {
  uint32_t now = millis();

  if (sensorA_active && sensorB_active) {
    uint32_t diff = (sensorA_time < sensorB_time)
                    ? sensorB_time - sensorA_time
                    : sensorA_time - sensorB_time;

    if (diff < 3000) {
      if (sensorA_time < sensorB_time) {
        insideCount++;
        seatsAvailable = max(0, totalSeats - insideCount);
        Serial.println(" ENTERED  Inside:" + String(insideCount) +
                       "  Seats:" + String(seatsAvailable));
        blinkLED(1);
        countChanged = true;
      } else {
        insideCount = max(0, insideCount - 1);
        seatsAvailable = totalSeats - insideCount;
        Serial.println(" EXITED   Inside:" + String(insideCount) +
                       "  Seats:" + String(seatsAvailable));
        blinkLED(2);
        countChanged = true;
      }
    }
    sensorA_active = false;
    sensorB_active = false;
    sensorA_time   = 0;
    sensorB_time   = 0;
  }

  if (sensorA_active && now - sensorA_time > 4000) {
    sensorA_active = false;
    sensorA_time   = 0;
  }
  if (sensorB_active && now - sensorB_time > 4000) {
    sensorB_active = false;
    sensorB_time   = 0;
  }
}

// ────────────────────────────────────────────────────────────
//  SETUP
// ────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n============================");
  Serial.println("  TN BusTrack Firmware v2.0");
  Serial.println("============================");

  pinMode(LED_PIN,   OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(TRIG_A,    OUTPUT);
  pinMode(ECHO_A,    INPUT);
  pinMode(TRIG_B,    OUTPUT);
  pinMode(ECHO_B,    INPUT);
  pinMode(RESET_BTN, INPUT_PULLUP);
  digitalWrite(RELAY_PIN, HIGH);

  attachInterrupt(digitalPinToInterrupt(ECHO_A), onEchoA, RISING);
  attachInterrupt(digitalPinToInterrupt(ECHO_B), onEchoB, RISING);

  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("GPS serial started");

  connectWiFi();
  fetchConfig();

  Serial.println("\n System ready!");
  Serial.println("Bus: " + String(BUS_ID));
  Serial.println("Seats: " + String(totalSeats));
  Serial.println("Take GPS near window for fix...\n");
  blinkLED(3);
}

// ────────────────────────────────────────────────────────────
//  MAIN LOOP
// ────────────────────────────────────────────────────────────
void loop() {
  uint32_t now = millis();

  while (gpsSerial.available()) {
    gps.encode(gpsSerial.read());
  }
  if (gps.location.isValid()) {
    currentLat = gps.location.lat();
    currentLng = gps.location.lng();
    currentSpd = gps.speed.kmph();
    if (!gpsFixed) {
      gpsFixed = true;
      Serial.println(" GPS FIXED!  LAT:" + String(currentLat, 6) +
                     "  LNG:" + String(currentLng, 6));
      blinkLED(5);
    }
  }

  processCount();

  if (countChanged) {
    countChanged = false;
    sendCountOnly();
  }

  if (now - lastGPSSend >= 2000) {
    sendGPSData();
    lastGPSSend = now;
  }

  if (now - lastConfigFetch >= 300000) {
    fetchConfig();
    lastConfigFetch = now;
  }

  if (now - lastWiFiCheck >= 30000) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi dropped, reconnecting...");
      connectWiFi();
    }
    lastWiFiCheck = now;
  }

  if (digitalRead(RESET_BTN) == LOW) {
    uint32_t held = millis();
    while (digitalRead(RESET_BTN) == LOW) delay(50);
    if (millis() - held > 3000) {
      insideCount    = 0;
      seatsAvailable = totalSeats;
      Serial.println(" Count RESET to 0");
      blinkLED(5);
      countChanged = true;
    }
  }
}
