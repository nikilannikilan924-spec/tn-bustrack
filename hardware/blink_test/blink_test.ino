#include <WiFi.h>
#include <HTTPClient.h>

// WiFi credentials
const char* ssid = "SSID";
const char* password = "Nikilan31";

// Railway URL
const char* configUrl = "https://tn-bustrack-production.up.railway.app/api/device/config";
const char* locationUrl = "https://tn-bustrack-production.up.railway.app/api/bus/location";
const char* passengerUrl = "https://tn-bustrack-production.up.railway.app/api/bus/passengers";

// Bus config (fetched from server)
String busId = "";
int seatCapacity = 50;

// GPS - NEO-6M on UART2 (GPIO16 RX, GPIO17 TX)
#define GPS_RX 16
#define GPS_TX 17
HardwareSerial gps(2);

// HC-SR04 pins
#define TRIG_A 12
#define ECHO_A 14
#define TRIG_B 27
#define ECHO_B 15
#define THRESHOLD 30

// Relay pins (LOW = ON)
#define RELAY_A 13
#define RELAY_B 4

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

// GPS variables
float gpsLat = 0, gpsLng = 0;
int gpsSpeed = 0;
unsigned long lastGpsFix = 0;
bool gpsFixed = false;
int gpsFixCount = 0;

// Parse NMEA lat/lng from DDMM.MMMM to decimal degrees
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

void readGps() {
  while (gps.available()) {
    String line = gps.readStringUntil('\n');

    // Parse $GPGGA or $GNGGA (same format, different prefix)
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
        gpsFixCount++;
      }
    }

    // Parse $GPGLL or $GNGLL for position
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
        if (field == 6) status = token[0]; // A=active/valid
        field++;
      }
      if (status == 'A') {
        parseLatLng(latStr, lngStr, latDir, lngDir);
        gpsFixed = true;
        lastGpsFix = millis();
        gpsFixCount++;
      }
    }

    // Parse $GPVTG or $GNVTG for speed
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

// Extract value between quotes after key in JSON
String extractJsonStr(const String& json, const String& key) {
  String search = "\"" + key + "\":\"";
  int start = json.indexOf(search);
  if (start < 0) return "";
  start += search.length();
  int end = json.indexOf("\"", start);
  if (end < 0) return "";
  return json.substring(start, end);
}

// Fetch bus config from server
bool fetchConfig() {
  HTTPClient http;
  http.begin(configUrl);
  int code = http.GET();
  if (code != 200) { http.end(); return false; }

  String body = http.getString();
  http.end();

  if (body.indexOf("\"configured\":true") < 0 && body.indexOf("\"configured\": true") < 0) {
    return false;
  }

  busId = extractJsonStr(body, "id");
  if (busId.length() == 0) return false;

  Serial.print("Fetched bus ID: ");
  Serial.println(busId);
  return true;
}

int passengers = 0;
int lastSent = -1;
int state = 0;
unsigned long lastSend = 0;

// Send full location + passenger data
void sendLocation() {
  if (busId.length() == 0) return;

  HTTPClient http;
  http.begin(locationUrl);
  http.addHeader("Content-Type", "application/json");

  String body = "{\"busId\":\"" + busId + "\",\"latitude\":" + String(gpsLat, 6)
    + ",\"longitude\":" + String(gpsLng, 6)
    + ",\"speed\":" + String(gpsSpeed)
    + ",\"passengersInside\":" + String(passengers) + "}";
  int code = http.POST(body);

  Serial.print("POST location -> ");
  Serial.print(code);
  if (gpsFixed) {
    Serial.print(" | GPS: ");
    Serial.print(gpsLat, 4);
    Serial.print(", ");
    Serial.print(gpsLng, 4);
    Serial.print(" | ");
    Serial.print(gpsSpeed);
    Serial.print(" km/h");
  } else {
    Serial.print(" | GPS: searching...");
  }
  Serial.print(" | Pass: ");
  Serial.println(passengers);

  http.end();
}

// Send only passenger count (fallback when no GPS fix)
void sendPassengersOnly() {
  if (busId.length() == 0) return;

  HTTPClient http;
  http.begin(passengerUrl);
  http.addHeader("Content-Type", "application/json");

  String body = "{\"busId\":\"" + busId + "\",\"passengersInside\":" + String(passengers) + "}";
  int code = http.POST(body);

  Serial.print("POST passengers -> ");
  Serial.print(code);
  Serial.print(" | Count: ");
  Serial.println(passengers);

  http.end();
}

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

  // Connect WiFi
  Serial.print("Connecting to \"");
  Serial.print(ssid);
  Serial.println("\"");
  WiFi.begin(ssid, password);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) {
    delay(500);
    Serial.print(".");
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());

    Serial.println("Fetching config...");
    if (fetchConfig()) {
      Serial.println("Config OK. Starting loop.");
    } else {
      Serial.println("No bus configured! Use /setup in the app first.");
    }
  } else {
    Serial.println("\nWiFi failed!");
  }
}

void loop() {
  // Read GPS
  readGps();

  // Read HC-SR04 sensors
  long dA = readDistance(TRIG_A, ECHO_A);
  long dB = readDistance(TRIG_B, ECHO_B);
  bool a = dA < THRESHOLD;
  bool b = dB < THRESHOLD;

  // Passenger counting
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
      digitalWrite(RELAY_A, LOW); delay(100); digitalWrite(RELAY_A, HIGH);
    } else if (state == 2) {
      passengers--;
      state = 3;
      Serial.print("EXIT  "); Serial.println(passengers);
      digitalWrite(RELAY_B, LOW); delay(100); digitalWrite(RELAY_B, HIGH);
    }
  }

  // Send data every 10 seconds
  if (WiFi.status() == WL_CONNECTED && millis() - lastSend > 10000) {
    lastSend = millis();
    if (gpsFixed && millis() - lastGpsFix < 30000) {
      sendLocation();      // GPS fix → send full location + passengers
    } else {
      sendPassengersOnly(); // No GPS → send just passenger count
    }
  }

  // GPS debug every 5s
  static unsigned long lastGpsDebug = 0;
  if (millis() - lastGpsDebug > 5000) {
    lastGpsDebug = millis();
    if (gpsFixed) {
      Serial.print("GPS FIX: ");
      Serial.print(gpsLat, 4);
      Serial.print(", ");
      Serial.print(gpsLng, 4);
      Serial.print(" | ");
      Serial.print(gpsSpeed);
      Serial.println(" km/h");
    } else {
      int bytes = gps.available();
      // Print raw NMEA for debugging
      if (bytes > 0) {
        String raw = gps.readStringUntil('\n');
        raw.trim();
        if (raw.length() > 6) {
          Serial.print("RAW: ");
          Serial.println(raw.substring(0, 60));
        }
      } else {
        Serial.println("GPS: no data");
      }
    }
  }

  delay(100);
}
