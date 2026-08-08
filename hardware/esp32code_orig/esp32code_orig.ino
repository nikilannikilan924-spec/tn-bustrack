// ============================================================
//  TN BusTrack — ESP32 Firmware v3 (fast updates)
//  Hardware: ESP32 + NEO-6M + HC-SR04 x2
//  Features: WiFi config portal, GPS filter, fast updates
// ============================================================

#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <HTTPClient.h>

String busId = "M31";

const char* FALLBACK_SSID = "SSID";
const char* FALLBACK_PASS = "Nikilan31";

const char* GPS_URL    = "https://tn-bustrack-production-da58.up.railway.app/api/buses/update";
const char* COUNT_URL  = "https://tn-bustrack-production-da58.up.railway.app/api/buses/count";
const char* CONFIG_URL = "https://tn-bustrack-production-da58.up.railway.app/api/config/";

#define GPS_RX 16
#define GPS_TX 17
#define TRIG_A 12
#define ECHO_A 14
#define TRIG_B 27
#define ECHO_B 15
#define LED_BUILTIN 2

int totalSeats = 42;
String routeName = "";

float gpsLat = 0, gpsLng = 0;
int gpsSpeed = 0;
unsigned long lastGpsFix = 0;
bool gpsFixed = false;
HardwareSerial gps(2);

#define GPS_FILTER_SIZE 5
float latHistory[GPS_FILTER_SIZE] = {0};
float lngHistory[GPS_FILTER_SIZE] = {0};
int gpsFilterIndex = 0;

void addGpsSample(float lat, float lng) {
  latHistory[gpsFilterIndex] = lat;
  lngHistory[gpsFilterIndex] = lng;
  gpsFilterIndex = (gpsFilterIndex + 1) % GPS_FILTER_SIZE;
}

void getFilteredGps(float& outLat, float& outLng) {
  float sumLat = 0, sumLng = 0;
  int count = 0;
  for (int i = 0; i < GPS_FILTER_SIZE; i++) {
    if (latHistory[i] != 0 || lngHistory[i] != 0) {
      sumLat += latHistory[i];
      sumLng += lngHistory[i];
      count++;
    }
  }
  if (count > 0) {
    outLat = sumLat / count;
    outLng = sumLng / count;
  }
}

bool validCoord(float lat, float lng) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !(lat == 0 && lng == 0);
}

Preferences prefs;
WebServer portalServer(80);
bool configMode = false;

void saveWifiCreds(const String& ssid, const String& pass, const String& id) {
  prefs.begin("tn-bustrack", false);
  prefs.putString("ssid", ssid);
  prefs.putString("pass", pass);
  prefs.putString("busid", id);
  prefs.end();
}

bool loadWifiCreds(String& ssid, String& pass, String& id) {
  prefs.begin("tn-bustrack", true);
  ssid = prefs.getString("ssid", "");
  pass = prefs.getString("pass", "");
  id = prefs.getString("busid", "M31");
  prefs.end();
  return ssid.length() > 0;
}

String portalHtml() {
  return "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>"
    "<style>body{font-family:sans-serif;text-align:center;padding:20px;background:#f0f4f8}"
    "h1{color:#0EA5E9;font-size:24px}.card{background:#fff;border-radius:16px;padding:24px;"
    "max-width:400px;margin:20px auto;box-shadow:0 4px 12px rgba(0,0,0,0.1)}"
    "input{width:100%;padding:12px;margin:8px 0;border:2px solid #e2e8f0;border-radius:10px;"
    "font-size:16px;box-sizing:border-box}button{width:100%;padding:14px;background:#0EA5E9;"
    "color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:bold;cursor:pointer}"
    "button:hover{background:#0284C7}.status{color:#64748b;font-size:14px;margin-top:12px}"
    "</style></head><body>"
    "<h1>TN BusTrack Setup</h1>"
    "<div class='card'>"
    "<form method='POST' action='/save'>"
    "<p style='text-align:left;font-size:14px;color:#64748b;margin:0 0 4px'>WiFi SSID</p>"
    "<input name='ssid' placeholder='Enter WiFi name' required>"
    "<p style='text-align:left;font-size:14px;color:#64748b;margin:8px 0 4px'>WiFi Password</p>"
    "<input type='password' name='pass' placeholder='Enter WiFi password'>"
    "<p style='text-align:left;font-size:14px;color:#64748b;margin:8px 0 4px'>Bus ID (from /setup page)</p>"
    "<input name='busid' value='M31' placeholder='e.g. M31'>"
    "<button type='submit'>Connect</button>"
    "</form>"
    "<p class='status'>ESP32 will reboot and connect to your WiFi</p>"
    "</div></body></html>";
}

void handlePortalRoot() {
  portalServer.send(200, "text/html", portalHtml());
}

void handlePortalSave() {
  if (portalServer.hasArg("ssid")) {
    String portalSSID = portalServer.arg("ssid");
    String portalPass = portalServer.hasArg("pass") ? portalServer.arg("pass") : "";
    String id = portalServer.hasArg("busid") ? portalServer.arg("busid") : "M31";
    id.trim();
    saveWifiCreds(portalSSID, portalPass, id);
    portalServer.send(200, "text/html",
      "<!DOCTYPE html><html><body style='font-family:sans-serif;text-align:center;padding:40px;background:#f0f4f8'>"
      "<h1 style='color:#22C55E'>Saved!</h1>"
      "<p>Connecting to <b>" + portalSSID + "</b>...</p>"
      "<p style='color:#64748b'>ESP32 will reboot as bus <b>" + id + "</b>. Close this page.</p>"
      "</body></html>");
    delay(1000);
    ESP.restart();
  } else {
    portalServer.send(200, "text/html", "<h1>Error: SSID required</h1>");
  }
}

void startConfigPortal() {
  configMode = true;
  WiFi.mode(WIFI_AP);
  WiFi.softAP("TN-BusTrack-Setup", NULL);
  portalServer.on("/", handlePortalRoot);
  portalServer.on("/save", handlePortalSave);
  portalServer.begin();
  Serial.println("\n=== CONFIG MODE ===");
  Serial.println("Connect WiFi to 'TN-BusTrack-Setup'");
  Serial.println("Open http://192.168.4.1 in browser");
  digitalWrite(LED_BUILTIN, LOW);
}

unsigned long lastWifiCheck = 0;
const unsigned long WIFI_CHECK_INTERVAL = 5000;
bool wifiReconnecting = false;

bool tryConnect(const char* ssid, const char* pass) {
  Serial.print("Connecting to ");
  Serial.print(ssid);
  Serial.print("...");
  WiFi.mode(WIFI_STA);
  WiFi.setTxPower(WIFI_POWER_11dBm);
  WiFi.begin(ssid, pass);
  WiFi.setAutoReconnect(true);
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
    digitalWrite(LED_BUILTIN, HIGH);
    return true;
  }
  return false;
}

bool connectWifi() {
  String ssid, pass, id;
  if (loadWifiCreds(ssid, pass, id)) {
    if (id.length() > 0) busId = id;
    if (tryConnect(ssid.c_str(), pass.c_str())) return true;
    Serial.println("Saved WiFi failed");
  } else {
    Serial.println("No saved WiFi credentials");
  }
  if (strlen(FALLBACK_SSID) > 0 && strcmp(FALLBACK_SSID, "YOUR_HOTSPOT_NAME") != 0) {
    Serial.println("Trying fallback hotspot...");
    if (tryConnect(FALLBACK_SSID, FALLBACK_PASS)) return true;
  }
  Serial.println("\nAll WiFi attempts failed!");
  return false;
}

void checkWiFi() {
  if (configMode) return;
  if (WiFi.status() == WL_CONNECTED) {
    if (wifiReconnecting) {
      wifiReconnecting = false;
      Serial.println("WiFi reconnected");
      fetchConfig();
    }
    return;
  }
  if (millis() - lastWifiCheck < WIFI_CHECK_INTERVAL) return;
  lastWifiCheck = millis();
  if (!wifiReconnecting) {
    wifiReconnecting = true;
    Serial.print("WiFi lost, reconnecting...");
  }
  WiFi.reconnect();
  Serial.print(".");
}

const int THRESHOLD = 40;
int passengers = 0;
int state = 0;
int pendingPassengers = -1;
int debounce = 0;
unsigned long stateStart = 0;

unsigned long lastGpsSend = 0;
unsigned long lastCountSend = 0;
const unsigned long GPS_INTERVAL = 4000;
const unsigned long COUNT_INTERVAL = 3000;

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

void parseLatLng(const String& latStr, const String& lngStr, char latDir, char lngDir) {
  if (latStr.length() == 0 || lngStr.length() == 0) return;
  float lat = atof(latStr.c_str());
  int latDeg = int(lat / 100);
  float parsedLat = latDeg + (lat - latDeg * 100) / 60;
  if (latDir == 'S') parsedLat = -parsedLat;

  float lng = atof(lngStr.c_str());
  int lngDeg = int(lng / 100);
  float parsedLng = lngDeg + (lng - lngDeg * 100) / 60;
  if (lngDir == 'W') parsedLng = -parsedLng;

  if (validCoord(parsedLat, parsedLng)) {
    addGpsSample(parsedLat, parsedLng);
    float filteredLat, filteredLng;
    getFilteredGps(filteredLat, filteredLng);
    gpsLat = filteredLat;
    gpsLng = filteredLng;
    gpsFixed = true;
    lastGpsFix = millis();
  }
}

unsigned long lastGpsData = 0;
unsigned long lastGpsDebug = 0;

void readGps() {
  if (gps.available()) lastGpsData = millis();
  while (gps.available()) {
    String line = gps.readStringUntil('\n');
    if (line.length() > 0 && line[0] != '$') continue;

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
      if (fix > 0) parseLatLng(latStr, lngStr, latDir, lngDir);
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
      if (status == 'A') parseLatLng(latStr, lngStr, latDir, lngDir);
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

void fetchConfig() {
  if (WiFi.status() != WL_CONNECTED) return;
  String url = String(CONFIG_URL) + String(busId);
  HTTPClient http;
  http.begin(url);
  http.setTimeout(5000);
  int code = http.GET();
  if (code == 200) {
    String body = http.getString();
    int seats = extractJsonInt(body, "totalSeats");
    if (seats > 0) totalSeats = seats;
    String name = extractJsonStr(body, "routeName");
    if (name.length() > 0) routeName = name;
    Serial.print("Config loaded -- Seats: ");
    Serial.print(totalSeats);
    if (routeName.length() > 0) { Serial.print("  Route: "); Serial.println(routeName); }
    else { Serial.println("  Route: (configure at /setup)"); }
  } else {
    Serial.println("Config not found -- create bus at /setup on Railway");
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
  float sendLat = gpsLat, sendLng = gpsLng;
  getFilteredGps(sendLat, sendLng);
  if (!gpsFixed) { sendLat = gpsLat; sendLng = gpsLng; }
  String body = "{\"busId\":\"" + String(busId) + "\""
    + ",\"lat\":" + String(sendLat, 6)
    + ",\"lng\":" + String(sendLng, 6)
    + ",\"speed\":" + String(gpsSpeed)
    + ",\"seats\":" + String(totalSeats - passengers)
    + ",\"inside\":" + String(passengers)
    + ",\"route\":\"" + routeName + "\""
    + ",\"gpsFixed\":" + (gpsFixed ? "true" : "false") + "}";
  bool ok = httpPost(GPS_URL, body);
  if (ok) Serial.print("! ");
  else Serial.print("! FAIL ");
  if (gpsFixed) { Serial.print(String(sendLat, 4) + "," + String(sendLng, 4) + " " + String(gpsSpeed) + "km/h"); }
  else { Serial.print("GPS:searching..."); }
  Serial.println(" P:" + String(passengers));
}

void sendCount() {
  String body = "{\"busId\":\"" + String(busId) + "\""
    + ",\"inside\":" + String(passengers)
    + ",\"seats\":" + String(totalSeats - passengers) + "}";
  bool ok = httpPost(COUNT_URL, body);
  if (ok) Serial.print("C! ");
  else Serial.print("C! FAIL ");
  Serial.println(String(passengers) + "P");
}

void setup() {
  Serial.begin(115200);
  gps.begin(115200, SERIAL_8N1, GPS_RX, GPS_TX);
  pinMode(TRIG_A, OUTPUT);
  pinMode(ECHO_A, INPUT);
  pinMode(TRIG_B, OUTPUT);
  pinMode(ECHO_B, INPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(0, INPUT_PULLUP);
  digitalWrite(LED_BUILTIN, LOW);
  Serial.println("\n=== TN BusTrack v3 (fast) ===");
  Serial.print("Bus ID: "); Serial.println(busId);
  Serial.println("Hold BOOT button to reset passenger count");
  if (!connectWifi()) { startConfigPortal(); return; }
  fetchConfig();
  sendCount();
  sendLocation();
  Serial.println("Ready.\n");
}

void loop() {
  if (configMode) { portalServer.handleClient(); return; }
  unsigned long now = millis();
  checkWiFi();
  readGps();

  if (digitalRead(0) == LOW) {
    delay(50);
    if (digitalRead(0) == LOW) {
      passengers = 0;
      Serial.println("Count reset");
      while (digitalRead(0) == LOW) delay(10);
      sendCount();
    }
  }

  if (!gpsFixed && now - lastGpsDebug > 10000) {
    lastGpsDebug = now;
    unsigned long gpsAge = now - lastGpsData;
    if (lastGpsData > 0 && gpsAge < 3000) {
      Serial.println("GPS: data received, no 3D fix yet");
    } else if (lastGpsData > 0) {
      Serial.print("GPS: no data for "); Serial.print(gpsAge / 1000); Serial.println("s");
    }
  }

  long dA = readDistance(TRIG_A, ECHO_A);
  long dB = readDistance(TRIG_B, ECHO_B);
  bool a = dA > THRESHOLD && dA < 999;
  bool b = dB > THRESHOLD && dB < 999;

  if (state == 3) { if (!a && !b) { debounce = 0; state = 0; } }
  else if (state == 0) {
    if (a && !b) { if (++debounce >= 2) { debounce = 0; state = 1; stateStart = now; } }
    else if (b && !a) { if (++debounce >= 2) { debounce = 0; state = 2; stateStart = now; } }
    else { debounce = 0; }
  } else if (a && b) {
    if (++debounce >= 2) {
      debounce = 0; stateStart = now;
      if (state == 1) { passengers++; state = 3; pendingPassengers = passengers; Serial.print("IN "); Serial.println(passengers); }
      else if (state == 2) { passengers--; if (passengers < 0) passengers = 0; state = 3; pendingPassengers = passengers; Serial.print("OUT "); Serial.println(passengers); }
    }
  } else if (state > 0 && state < 3 && now - stateStart > 2000) { debounce = 0; state = 0; }
  else { debounce = 0; }

  if (gpsFixed && now - lastGpsFix > 30000) {
    gpsFixed = false; gpsLat = 0; gpsLng = 0;
  }

  if (now - lastCountSend > COUNT_INTERVAL) {
    lastCountSend = now; sendCount();
    if (pendingPassengers >= 0) pendingPassengers = -1;
  }
  if (now - lastGpsSend > GPS_INTERVAL) {
    lastGpsSend = now; sendLocation();
  }
  delay(5);
}