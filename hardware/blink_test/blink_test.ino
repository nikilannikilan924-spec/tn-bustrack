#include <WiFi.h>
#include <HTTPClient.h>
const char* WIFI_SSID     = "SSID";        // CHANGE THIS
const char* WIFI_PASSWORD = "Nikilan31";   // CHANGE THIS
const char* BUS_ID        = "M31";
const char* GPS_URL    = "https://tn-bustrack-production.up.railway.app/api/buses/update";
const char* COUNT_URL  = "https://tn-bustrack-production.up.railway.app/api/buses/count";
const char* CONFIG_URL = "https://tn-bustrack-production.up.railway.app/api/config/";
#define GPS_RX 16
#define GPS_TX 17
#define TRIG_A 12
#define ECHO_A 14
#define TRIG_B 27
#define ECHO_B 15
#define THRESHOLD 50
int totalSeats = 42;
String routeName = "Default";
float gpsLat = 0, gpsLng = 0;
int gpsSpeed = 0;
unsigned long lastGpsFix = 0;
bool gpsFixed = false;
HardwareSerial gps(2);
int passengers = 0, state = 0, pendingPassengers = -1, debounce = 0;
unsigned long lastGpsSend = 0, lastCountSend = 0;
const unsigned long GPS_INTERVAL = 8000, COUNT_INTERVAL = 2000;
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
bool validCoord(float lat, float lng) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !(lat == 0 && lng == 0);
}
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
    if (line.startsWith("$GPGGA") || line.startsWith("$GNGGA")) {
      char buf[80]; line.toCharArray(buf, 80);
      char* ptr = buf; int field = 0, fix = 0;
      char latS[16]="", lngS[16]="", latDir='N', lngDir='E';
      while (char* t = strtok(ptr, ",")) {
        ptr = NULL;
        if (field == 2) strcpy(latS, t);
        if (field == 3 && strlen(t) > 0) latDir = t[0];
        if (field == 4) strcpy(lngS, t);
        if (field == 5 && strlen(t) > 0) lngDir = t[0];
        if (field == 6) fix = atoi(t);
        field++;
      }
      if (fix > 0) {
        parseLatLng(latS, lngS, latDir, lngDir);
        if (validCoord(gpsLat, gpsLng)) { gpsFixed = true; lastGpsFix = millis(); }
      }
    }
    if (line.startsWith("$GPVTG") || line.startsWith("$GNVTG")) {
      char buf[80]; line.toCharArray(buf, 80);
      char* ptr = buf; int field = 0;
      while (char* t = strtok(ptr, ",")) { ptr = NULL; if (field == 7) { gpsSpeed = round(atof(t) * 1.852); break; } field++; }
    }
  }
}
int extractJsonInt(const String& json, const String& key) {
  String search = "\"" + key + "\":";
  int start = json.indexOf(search);
  if (start < 0) return 0;
  start += search.length();
  int end = json.indexOf(",", start);
  if (end < 0) end = json.indexOf("}", start);
  return json.substring(start, end).toInt();
}
void fetchConfig() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.begin(String(CONFIG_URL) + String(BUS_ID));
  http.setTimeout(3000);
  if (http.GET() == 200) {
    String body = http.getString();
    int seats = extractJsonInt(body, "totalSeats");
    if (seats > 0) totalSeats = seats;
  }
  http.end();
}
bool httpPost(const char* url, const String& body) {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);
  int code = http.POST(body);
  http.end();
  return (code == 200 || code == 201);
}
void sendLocation() {
  String body = "{\"busId\":\"" + String(BUS_ID) + "\",\"lat\":" + String(gpsLat, 6) + ",\"lng\":" + String(gpsLng, 6) + ",\"speed\":" + String(gpsSpeed) + ",\"seats\":" + String(totalSeats - passengers) + ",\"inside\":" + String(passengers) + ",\"route\":\"" + routeName + "\",\"gpsFixed\":" + (gpsFixed ? "true" : "false") + "}";
  bool ok = httpPost(GPS_URL, body);
  Serial.print("> " + String(ok ? "OK" : "FAIL") + " ");
  if (gpsFixed) { Serial.print(String(gpsLat, 4) + "," + String(gpsLng, 4) + " " + String(gpsSpeed) + "km/h"); }
  else { Serial.print("GPS:searching..."); }
  Serial.println(" Pass:" + String(passengers));
}
void sendCount() {
  String body = "{\"busId\":\"" + String(BUS_ID) + "\",\"inside\":" + String(passengers) + ",\"seats\":" + String(totalSeats - passengers) + "}";
  Serial.println("> COUNT " + String(httpPost(COUNT_URL, body) ? "OK" : "FAIL") + " Pass:" + String(passengers));
}
void setup() {
  Serial.begin(115200);
  gps.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  pinMode(TRIG_A, OUTPUT); pinMode(ECHO_A, INPUT);
  pinMode(TRIG_B, OUTPUT); pinMode(ECHO_B, INPUT);
  Serial.print("WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) { delay(500); Serial.print("."); tries++; }
  if (WiFi.status() == WL_CONNECTED) { Serial.println(" OK"); Serial.print("IP: "); Serial.println(WiFi.localIP()); fetchConfig(); }
  else { Serial.println(" FAILED!"); }
  Serial.print("Bus: "); Serial.println(BUS_ID);
  Serial.println("Ready.");
}
void loop() {
  readGps();
  long dA = readDistance(TRIG_A, ECHO_A);
  long dB = readDistance(TRIG_B, ECHO_B);
  bool a = dA > THRESHOLD && dA < 999;
  bool b = dB > THRESHOLD && dB < 999;
  if (state == 3) { if (!a && !b) { debounce = 0; state = 0; } }
  else if (state == 0) {
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
  if (gpsFixed && now - lastGpsFix > 30000) { gpsFixed = false; gpsLat = 0; gpsLng = 0; Serial.println("GPS LOST"); }
  if (pendingPassengers >= 0 && (now - lastCountSend > COUNT_INTERVAL)) { lastCountSend = now; sendCount(); pendingPassengers = -1; }
  if (now - lastGpsSend > GPS_INTERVAL) { lastGpsSend = now; sendLocation(); }
  delay(5);
}