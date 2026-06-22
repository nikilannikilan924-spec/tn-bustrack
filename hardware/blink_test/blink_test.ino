#include <WiFi.h>
#include <HTTPClient.h>
const char* ssid = "SSID";
const char* password = "Nikilan31";
const char* locationUrl = "https://tn-bustrack-production.up.railway.app/api/bus/location";
const char* passengerUrl = "https://tn-bustrack-production.up.railway.app/api/bus/passengers";
String busId = "M31";
#define GPS_RX 16
#define GPS_TX 17
HardwareSerial gps(2);
#define TRIG_A 12
#define ECHO_A 14
#define TRIG_B 27
#define ECHO_B 15
#define THRESHOLD 30
#define RELAY_A 13
#define RELAY_B 4
#define SEND_INTERVAL 3000
#define SCAN_INTERVAL 100
float gpsLat = 0, gpsLng = 0;
float gpsSpeed = 0;
unsigned long lastGpsFix = 0;
bool gpsFixed = false;
enum SensorState { S_IDLE, S_WENT_HIGH, S_WENT_LOW };
struct USS {
  int trig, echo, relay;
  SensorState state;
  unsigned long t;
  float dist;
  bool blocked;
  unsigned long blockedSince;
} sa = {TRIG_A, ECHO_A, RELAY_A, S_IDLE, 0, 999, false, 0},
  sb = {TRIG_B, ECHO_B, RELAY_B, S_IDLE, 0, 999, false, 0};
unsigned long lastSensorScan = 0;
unsigned long lastSend = 0;
int passengers = 0;
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("WiFi");
  WiFi.begin(ssid, password);
  for (int i = 0; i < 40; i++) {
    if (WiFi.status() == WL_CONNECTED) break;
    delay(500); Serial.print(".");
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " OK" : " FAIL");
}
void tickSensor(USS &s) {
  unsigned long now = micros();
  switch (s.state) {
    case S_IDLE:
      if (now - lastSensorScan >= 50000) {
        lastSensorScan = now;
        digitalWrite(s.trig, HIGH);
        s.state = S_WENT_HIGH; s.t = now;
      }
      break;
    case S_WENT_HIGH:
      if (now - s.t >= 10) { digitalWrite(s.trig, LOW); s.state = S_WENT_LOW; s.t = now; }
      break;
    case S_WENT_LOW:
      if (digitalRead(s.echo) == HIGH) { s.t = now; }
      else if (now - s.t > 30000) { s.dist = 999; s.state = S_IDLE; }
      else {
        unsigned long dt = now - s.t;
        if (dt > 2) { s.dist = dt * 0.034 / 2; s.state = S_IDLE; }
      }
      break;
  }
}
void checkPass(USS &s, int dir) {
  bool near = s.dist < THRESHOLD && s.dist > 0;
  unsigned long now = millis();
  if (near && !s.blocked) { s.blocked = true; s.blockedSince = now; }
  else if (!near && s.blocked) {
    if (now - s.blockedSince >= 150) {
      passengers += dir;
      if (passengers < 0) passengers = 0;
      Serial.print(dir > 0 ? "ENTER " : "EXIT ");
      Serial.println(passengers);
      digitalWrite(s.relay, LOW); delay(50); digitalWrite(s.relay, HIGH);
    }
    s.blocked = false;
  }
}
void parseNMEA(String line) {
  if (line.length() < 6) return;
  if (!line.startsWith("$GP") && !line.startsWith("$GN")) return;
  String type = line.substring(3, 6);
  if (type != "GGA" && type != "GLL" && type != "RMC") return;
  int ci = 0, commas[12];
  for (int i = 0; i < 12; i++) {
    int idx = line.indexOf(',', ci);
    commas[i] = (idx < 0) ? -1 : idx; ci = idx + 1;
  }
  float lat = 0, lng = 0;
  bool hasPos = false;
  if (type == "RMC") {
    if (commas[3] >= 0 && commas[4] >= 0 && commas[5] >= 0 && commas[6] >= 0) {
      String latStr = line.substring(commas[3] + 1, commas[4]);
      String ns = line.substring(commas[4] + 1, commas[5]);
      String lngStr = line.substring(commas[5] + 1, commas[6]);
      String ew = line.substring(commas[6] + 1, commas[7]);
      if (latStr.length() > 0 && lngStr.length() > 0) {
        float lt = atof(latStr.c_str());
        int ld = int(lt / 100);
        lat = ld + (lt - ld * 100) / 60;
        if (ns[0] == 'S') lat = -lat;
        float ln = atof(lngStr.c_str());
        int nd = int(ln / 100);
        lng = nd + (ln - nd * 100) / 60;
        if (ew[0] == 'W') lng = -lng;
        hasPos = true;
      }
      if (commas[7] >= 0) {
        String s = line.substring(commas[7] + 1, commas[8]);
        if (s.length() > 0) gpsSpeed = round(atof(s.c_str()) * 1.852);
      }
    }
  } else {
    int li = (type == "GGA") ? 2 : 1;
    if (commas[li] >= 0 && commas[li+3] >= 0) {
      String latStr = line.substring(commas[li] + 1, commas[li+1]);
      String ns = line.substring(commas[li+1] + 1, commas[li+2]);
      String lngStr = line.substring(commas[li+2] + 1, commas[li+3]);
      String ew = line.substring(commas[li+3] + 1, commas[li+4]);
      if (latStr.length() > 0 && lngStr.length() > 0) {
        float lt = atof(latStr.c_str());
        int ld = int(lt / 100);
        lat = ld + (lt - ld * 100) / 60;
        if (ns[0] == 'S') lat = -lat;
        float ln = atof(lngStr.c_str());
        int nd = int(ln / 100);
        lng = nd + (ln - nd * 100) / 60;
        if (ew[0] == 'W') lng = -lng;
        hasPos = true;
      }
    }
  }
  if (hasPos && lat >= 1 && lat <= 90 && lng >= 50 && lng <= 200) {
    gpsLat = lat; gpsLng = lng;
    gpsFixed = true; lastGpsFix = millis();
  }
}
void readGps() {
  while (gps.available()) {
    String line = gps.readStringUntil('\n');
    line.trim();
    parseNMEA(line);
  }
}
void sendLocation() {
  if (busId.length() == 0 || !gpsFixed) return;
  char body[300];
  snprintf(body, sizeof(body),
    "{\"busId\":\"%s\",\"latitude\":%.6f,\"longitude\":%.6f,\"speed\":%.0f,\"passengersInside\":%d}",
    busId.c_str(), gpsLat, gpsLng, gpsSpeed, passengers);
  HTTPClient http;
  http.begin(locationUrl);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(String(body));
  http.end();
  Serial.print("POST ");
  Serial.print(code);
  Serial.print(" GPS: "); Serial.print(gpsLat, 4);
  Serial.print(", "); Serial.print(gpsLng, 4);
  Serial.print(" "); Serial.print(gpsSpeed, 0);
  Serial.print("km/h Pass:"); Serial.println(passengers);
}
void sendPassengersOnly() {
  if (busId.length() == 0) return;
  char body[120];
  snprintf(body, sizeof(body),
    "{\"busId\":\"%s\",\"passengersInside\":%d}",
    busId.c_str(), passengers);
  HTTPClient http;
  http.begin(passengerUrl);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(String(body));
  http.end();
  Serial.print("PASS "); Serial.print(code);
  Serial.print(" Count:"); Serial.println(passengers);
}
void setup() {
  Serial.begin(115200);
  Serial.println("\n=== TN BusTrack ===");
  Serial.println(busId);
  pinMode(TRIG_A, OUTPUT); pinMode(ECHO_A, INPUT);
  pinMode(TRIG_B, OUTPUT); pinMode(ECHO_B, INPUT);
  pinMode(RELAY_A, OUTPUT); pinMode(RELAY_B, OUTPUT);
  digitalWrite(RELAY_A, HIGH); digitalWrite(RELAY_B, HIGH);
  digitalWrite(TRIG_A, LOW); digitalWrite(TRIG_B, LOW);
  gps.begin(115200, SERIAL_8N1, GPS_RX, GPS_TX);
  delay(500);
  connectWiFi();
}
void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  readGps();
  if (gpsFixed && millis() - lastGpsFix > 15000) { gpsFixed = false; gpsSpeed = 0; }
  tickSensor(sa); tickSensor(sb);
  unsigned long now = millis();
  if (now - lastSensorScan >= SCAN_INTERVAL) { checkPass(sa, 1); checkPass(sb, -1); }
  if (now - lastSend >= SEND_INTERVAL) {
    lastSend = now;
    if (gpsFixed) sendLocation(); else sendPassengersOnly();
  }
}