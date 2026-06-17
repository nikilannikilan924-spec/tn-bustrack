// ============================================================
//  TN BusTrack — ESP32 Firmware (no extra libs required)
//  Hardware: ESP32 + NEO-6M + HC-SR04 x2 + Relay
// ============================================================

#include <WiFi.h>
#include <HTTPClient.h>

// ── CHANGE THESE 3 LINES ────────────────────────────────────
const char* WIFI_SSID     = "YourHotspotName";   // phone hotspot name
const char* WIFI_PASSWORD = "YourPassword";       // hotspot password
const char* BUS_ID        = "TN07 828 1122";      // any name works
// ────────────────────────────────────────────────────────────

// ── SERVER URLs ─────────────────────────────────────────────
const char* GPS_URL    = "https://tn-bustrack-production.up.railway.app/api/buses/update";
const char* COUNT_URL  = "https://tn-bustrack-production.up.railway.app/api/buses/count";
const char* CONFIG_URL = "https://tn-bustrack-production.up.railway.app/api/config/";
// ────────────────────────────────────────────────────────────

// ── PIN DEFINITIONS ─────────────────────────────────────────
#define GPS_RX 16
#define GPS_TX 17
#define TRIG_A 12
#define ECHO_A 14
#define TRIG_B 27
#define ECHO_B 15
#define RELAY_A 13
#define RELAY_B 4
#define THRESHOLD 30
// ────────────────────────────────────────────────────────────

// ── BUS CONFIG ──────────────────────────────────────────────
int totalSeats = 42;
String routeName = "Default";

// ── GPS ─────────────────────────────────────────────────────
float gpsLat = 0, gpsLng = 0;
int gpsSpeed = 0;
unsigned long lastGpsFix = 0;
bool gpsFixed = false;
HardwareSerial gps(2);

// ── PASSENGER COUNT ─────────────────────────────────────────
int passengers = 0;
int state = 0;
unsigned long lastSend = 0;

// ────────────────────────────────────────────────────────────
//  READ DISTANCE (HC-SR04)
// ────────────────────────────────────────────────────────────
long readDistance(int trig, int echo) {
  digitalWrite(trig, LOW);
  delayMicroseconds(2);
  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long duration = pulseIn(echo, HIGH, 30000);
  if (duration == 0) return 999;
  long d = (duration * 0.034) / 2;
  return d > 500 ? 999 : d;
}

// ────────────────────────────────────────────────────────────
//  PARSE NMEA LAT/LNG
// ────────────────────────────────────────────────────────────
void parseLatLng(const String& latStr, const String& lngStr, char latDir, char lngDir) {
  if (latStr.length() == 0 || lngStr.length() == 0) return;
  float lat = atof(latStr.c_str());
  int latDeg = int(lat / 100);
  gpsLat = latDeg + (lat - latDeg * 100) / 60;
  if (latDir == 'S') gpsLat = -gpsLat;

  float lng = atof(lngStr.c_str());
  int lngDeg = int(lng / 100);
  gpsLng = lngDeg + (lng - lngDeg * 100) / 60;
  if (lngDir == 'W') gpsLng = -gpsLng;
}

// ────────────────────────────────────────────────────────────
//  READ GPS (raw NMEA parsing, no library needed)
// ────────────────────────────────────────────────────────────
void readGps() {
  while (gps.available()) {
    String line = gps.readStringUntil('\n');

    if (line.startsWith("$GPGGA") || line.startsWith("$GNGGA")) {
      char buf[80];
      line.toCharArray(buf, 80);
      char* ptr = buf;
      int field = 0;
      char latStr[16] = "", lngStr[16] = "", latDir = 'N', lngDir = 'E';
      int fix = 0;
      while (char* token = strtok(ptr, ",")) {
        ptr = NULL;
        if (field == 2) strcpy(latStr, token);
        if (field == 3 && strlen(token) > 0) latDir = token[0];
        if (field == 4) strcpy(lngStr, token);
        if (field == 5 && strlen(token) > 0) lngDir = token[0];
        if (field == 6) fix = atoi(token);
        field++;
      }
      parseLatLng(latStr, lngStr, latDir, lngDir);
      if (fix > 0) {
        gpsFixed = true;
        lastGpsFix = millis();
      }
    }

    if (line.startsWith("$GPGLL") || line.startsWith("$GNGLL")) {
      char buf[80];
      line.toCharArray(buf, 80);
      char* ptr = buf;
      int field = 0;
      char latStr[16] = "", lngStr[16] = "", latDir = 'N', lngDir = 'E';
      char status = 'V';
      while (char* token = strtok(ptr, ",")) {
        ptr = NULL;
        if (field == 1) strcpy(latStr, token);
        if (field == 2 && strlen(token) > 0) latDir = token[0];
        if (field == 3) strcpy(lngStr, token);
        if (field == 4 && strlen(token) > 0) lngDir = token[0];
        if (field == 6) status = token[0];
        field++;
      }
      if (status == 'A') {
        parseLatLng(latStr, lngStr, latDir, lngDir);
        gpsFixed = true;
        lastGpsFix = millis();
      }
    }

    if (line.startsWith("$GPVTG") || line.startsWith("$GNVTG")) {
      char buf[80];
      line.toCharArray(buf, 80);
      char* ptr = buf;
      int field = 0;
      while (char* token = strtok(ptr, ",")) {
        ptr = NULL;
        if (field == 7) { gpsSpeed = round(atof(token) * 1.852); break; }
        field++;
      }
    }
  }
}

// ────────────────────────────────────────────────────────────
//  SIMPLE JSON PARSER (no library needed)
// ────────────────────────────────────────────────────────────
String extractJsonStr(const String& json, const String& key) {
  String search = "\"" + key + "\":\"";
  int start = json.indexOf(search);
  if (start < 0) return "";
  start += search.length();
  int end = json.indexOf("\"", start);
  if (end < 0) return "";
  return json.substring(start, end);
}

int extractJsonInt(const String& json, const String& key) {
  String search = "\"" + key + "\":";
  int start = json.indexOf(search);
  if (start < 0) return 0;
  start += search.length();
  int end = json.indexOf(",", start);
  if (end < 0) end = json.indexOf("}", start);
  if (end < 0) return 0;
  return json.substring(start, end).toInt();
}

// ────────────────────────────────────────────────────────────
//  FETCH BUS CONFIG FROM SERVER
// ────────────────────────────────────────────────────────────
void fetchConfig() {
  if (WiFi.status() != WL_CONNECTED) return;

  String url = String(CONFIG_URL) + String(BUS_ID);
  HTTPClient http;
  http.begin(url);
  int code = http.GET();

  if (code == 200) {
    String body = http.getString();
    int seats = extractJsonInt(body, "totalSeats");
    if (seats > 0) totalSeats = seats;
    String name = extractJsonStr(body, "routeName");
    if (name.length() > 0) routeName = name;

    Serial.print("Config loaded — Seats: ");
    Serial.print(totalSeats);
    Serial.print("  Route: ");
    Serial.println(routeName);
  } else {
    Serial.println("Config not found, using defaults");
  }
  http.end();
}

// ────────────────────────────────────────────────────────────
//  SEND GPS + COUNT TO SERVER
// ────────────────────────────────────────────────────────────
void sendLocation() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(GPS_URL);
  http.addHeader("Content-Type", "application/json");

  String body = "{\"busId\":\"" + String(BUS_ID) + "\""
    + ",\"lat\":" + String(gpsLat, 6)
    + ",\"lng\":" + String(gpsLng, 6)
    + ",\"speed\":" + String(gpsSpeed)
    + ",\"seats\":" + String(totalSeats - passengers)
    + ",\"inside\":" + String(passengers)
    + ",\"route\":\"" + routeName + "\""
    + ",\"gpsFixed\":" + (gpsFixed ? "true" : "false")
    + "}";

  int code = http.POST(body);

  Serial.print("GPS ");
  if (code == 200 || code == 201) {
    Serial.print("OK  ");
  } else {
    Serial.print("FAIL ");
  }
  if (gpsFixed) {
    Serial.print(" LAT:" + String(gpsLat, 4));
    Serial.print(" LNG:" + String(gpsLng, 4));
    Serial.print(" " + String(gpsSpeed) + "km/h");
  } else {
    Serial.print(" GPS:searching...");
  }
  Serial.print(" Pass:" + String(passengers));
  Serial.print(" Seats:" + String(totalSeats - passengers));
  Serial.println();

  http.end();
}

// ────────────────────────────────────────────────────────────
//  SEND COUNT ONLY (instant)
// ────────────────────────────────────────────────────────────
void sendCountOnly() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(COUNT_URL);
  http.addHeader("Content-Type", "application/json");

  String body = "{\"busId\":\"" + String(BUS_ID) + "\""
    + ",\"inside\":" + String(passengers)
    + ",\"seats\":" + String(totalSeats - passengers)
    + "}";

  int code = http.POST(body);
  Serial.println("Count sent -> " + String(code) + "  Inside:" + String(passengers));
  http.end();
}

// ────────────────────────────────────────────────────────────
//  SETUP
// ────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  gps.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);

  pinMode(TRIG_A, OUTPUT);
  pinMode(ECHO_A, INPUT);
  pinMode(TRIG_B, OUTPUT);
  pinMode(ECHO_B, INPUT);
  pinMode(RELAY_A, OUTPUT);
  pinMode(RELAY_B, OUTPUT);
  digitalWrite(RELAY_A, HIGH);
  digitalWrite(RELAY_B, HIGH);

  Serial.print("Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) {
    delay(500);
    Serial.print(".");
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected");
    Serial.print("IP: "); Serial.println(WiFi.localIP());
    fetchConfig();
  } else {
    Serial.println("\nWiFi failed!");
  }

  Serial.print("Bus ID: ");
  Serial.println(BUS_ID);
  Serial.println("Ready.\n");
}

// ────────────────────────────────────────────────────────────
//  MAIN LOOP
// ────────────────────────────────────────────────────────────
void loop() {
  readGps();

  long dA = readDistance(TRIG_A, ECHO_A);
  long dB = readDistance(TRIG_B, ECHO_B);
  bool a = dA < THRESHOLD;
  bool b = dB < THRESHOLD;

  if (state == 3) {
    if (!a && !b) state = 0;
    delay(100);
    return;
  }

  if (!a && !b) {
    state = 0;
  } else if (state == 0) {
    if (a && !b) state = 1;
    else if (b && !a) state = 2;
  } else if (a && b) {
    if (state == 1) {
      passengers++;
      state = 3;
      Serial.print("ENTER "); Serial.println(passengers);
      sendCountOnly();
      digitalWrite(RELAY_A, LOW); delay(100); digitalWrite(RELAY_A, HIGH);
    } else if (state == 2) {
      passengers--; if (passengers < 0) passengers = 0;
      state = 3;
      Serial.print("EXIT  "); Serial.println(passengers);
      sendCountOnly();
      digitalWrite(RELAY_B, LOW); delay(100); digitalWrite(RELAY_B, HIGH);
    }
  }

  if (WiFi.status() == WL_CONNECTED && millis() - lastSend > 10000) {
    lastSend = millis();
    sendLocation();
  }

  delay(100);
}
