// ============================================================
//  TN BusTrack — ESP32 Firmware v2 (fast response)
//  Hardware: ESP32 + NEO-6M + HC-SR04 x2 + Relay
// ============================================================

#include <WiFi.h>
#include <HTTPClient.h>

// ── CHANGE THESE 3 LINES ────────────────────────────────────
const char* WIFI_SSID     = "SSID";
const char* WIFI_PASSWORD = "Nikilan31";
const char* BUS_ID        = "M31";
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

bool validCoord(float lat, float lng) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !(lat == 0 && lng == 0);
}

// ── PASSENGER COUNT ─────────────────────────────────────────
int passengers = 0;
int state = 0;
int pendingPassengers = -1; // -1 means no pending update
int debounce = 0;          // consecutive stable readings counter

// ── TIMING ──────────────────────────────────────────────────
unsigned long lastGpsSend = 0;
unsigned long lastCountSend = 0;
const unsigned long GPS_INTERVAL = 8000;  // send GPS every 8s
const unsigned long COUNT_INTERVAL = 2000; // send count change within 2s

// ── SENSOR READING ──────────────────────────────────────────
long readDistance(int trig, int echo) {
  digitalWrite(trig, LOW); delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);

  unsigned long t = micros();
  while (digitalRead(echo) == LOW && micros() - t < 10000);
  if (digitalRead(echo) == LOW) return 999;
  t = micros();
  while (digitalRead(echo) == HIGH && micros() - t < 10000);
  if (digitalRead(echo) == HIGH) return 999;

  long d = ((micros() - t) * 0.034) / 2;
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
      if (fix > 0) {
        parseLatLng(latStr, lngStr, latDir, lngDir);
        if (validCoord(gpsLat, gpsLng)) {
          gpsFixed = true;
          lastGpsFix = millis();
        }
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
        if (validCoord(gpsLat, gpsLng)) {
          gpsFixed = true;
          lastGpsFix = millis();
        }
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
  http.setTimeout(3000);
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
bool httpPost(const char* url, const String& body) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(3000);

  int code = http.POST(body);
  http.end();

  return (code == 200 || code == 201);
}

void sendLocation() {
  String body = "{\"busId\":\"" + String(BUS_ID) + "\""
    + ",\"lat\":" + String(gpsLat, 6)
    + ",\"lng\":" + String(gpsLng, 6)
    + ",\"speed\":" + String(gpsSpeed)
    + ",\"seats\":" + String(totalSeats - passengers)
    + ",\"inside\":" + String(passengers)
    + ",\"route\":\"" + routeName + "\""
    + ",\"gpsFixed\":" + (gpsFixed ? "true" : "false")
    + "}";

  bool ok = httpPost(GPS_URL, body);

  Serial.print("↑ ");
  if (ok) {
    Serial.print("OK ");
  } else {
    Serial.print("FAIL ");
  }
  if (gpsFixed) {
    Serial.print(String(gpsLat, 4) + "," + String(gpsLng, 4));
    Serial.print(" " + String(gpsSpeed) + "km/h");
  } else {
    Serial.print("GPS:searching...");
  }
  Serial.println(" Pass:" + String(passengers));
}

void sendCount() {
  String body = "{\"busId\":\"" + String(BUS_ID) + "\""
    + ",\"inside\":" + String(passengers)
    + ",\"seats\":" + String(totalSeats - passengers)
    + "}";

  bool ok = httpPost(COUNT_URL, body);
  Serial.println("↑ COUNT " + String(ok ? "OK" : "FAIL") + " Pass:" + String(passengers));
}

// ────────────────────────────────────────────────────────────
//  SETUP
// ────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  gps.begin(115200, SERIAL_8N1, GPS_RX, GPS_TX);

  pinMode(TRIG_A, OUTPUT);
  pinMode(ECHO_A, INPUT);
  pinMode(TRIG_B, OUTPUT);
  pinMode(ECHO_B, INPUT);

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

  bool a = dA > THRESHOLD && dA < 999;
  bool b = dB > THRESHOLD && dB < 999;

  if (state == 3) {
    if (!a && !b) { debounce = 0; state = 0; }
  } else if (state == 0) {
    if (a && !b) { if (++debounce >= 2) { debounce = 0; state = 1; } }
    else if (b && !a) { if (++debounce >= 2) { debounce = 0; state = 2; } }
    else { debounce = 0; }
  } else if (a && b) {
    if (++debounce >= 2) {
      debounce = 0;
      if (state == 1) { passengers++; state = 3; pendingPassengers = passengers; Serial.print("ENTER "); Serial.println(passengers); }
      else if (state == 2) { passengers--; if (passengers < 0) passengers = 0; state = 3; pendingPassengers = passengers; Serial.print("EXIT "); Serial.println(passengers); }
    }
  } else { debounce = 0; }

  unsigned long now = millis();

  // Clear fix if stale (>30s since last valid GPS)
  if (gpsFixed && now - lastGpsFix > 30000) {
    gpsFixed = false;
    gpsLat = 0;
    gpsLng = 0;
    Serial.println("GPS fix lost");
  }

  // Send count update promptly when passengers change
  if (pendingPassengers >= 0 && (now - lastCountSend > COUNT_INTERVAL)) {
    lastCountSend = now;
    sendCount();
    pendingPassengers = -1;
  }

  // Send GPS + count periodically
  if (now - lastGpsSend > GPS_INTERVAL) {
    lastGpsSend = now;
    sendLocation();
  }

  // Fast loop — sensor responds immediately
  delay(5);
}
