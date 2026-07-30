#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

#define TRIG_A 12
#define ECHO_A 14
#define TRIG_B 27
#define ECHO_B 15
#define LED 2

const char* SSID = "SSID";
const char* PASS = "Nikilan31";
const char* BUS_ID = "M31";
const char* HOST = "tn-bustrack-production-4b42.up.railway.app";

WiFiClientSecure client;
int passengers = 0, state = 0;
unsigned long lastSend = 0;
unsigned long aAt = 0, bAt = 0;

long readDist(int trig, int echo) {
  digitalWrite(trig, LOW); delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(5);
  digitalWrite(trig, LOW);
  unsigned long t = micros();
  while (digitalRead(echo) == LOW && micros() - t < 5000);
  if (digitalRead(echo) == LOW) return 999;
  t = micros();
  while (digitalRead(echo) == HIGH && micros() - t < 5000);
  if (digitalRead(echo) == HIGH) return 999;
  long d = ((micros() - t) * 0.034) / 2;
  return d > 300 ? 999 : d;
}

bool triggered(long d) { return d > 5 && d < 35; }

void sendCount() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.begin("https://" + String(HOST) + "/api/buses/count");
  http.addHeader("Content-Type", "application/json");
  http.POST("{\"busId\":\"" + String(BUS_ID) + "\",\"inside\":" + String(passengers) + "}");
  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_A, OUTPUT); pinMode(ECHO_A, INPUT);
  pinMode(TRIG_B, OUTPUT); pinMode(ECHO_B, INPUT);
  pinMode(LED, OUTPUT); digitalWrite(LED, LOW);
  WiFi.mode(WIFI_STA); WiFi.begin(SSID, PASS);
  for (int i = 0; i < 30; i++) {
    if (WiFi.status() == WL_CONNECTED) break;
    delay(500);
  }
  digitalWrite(LED, HIGH);
  client.setInsecure();
}

void loop() {
  long dA = readDist(TRIG_A, ECHO_A);
  long dB = readDist(TRIG_B, ECHO_B);
  unsigned long now = millis();

  bool a = triggered(dA);
  bool b = triggered(dB);

  if (a && !aAt) aAt = now;
  if (!a) aAt = 0;
  if (b && !bAt) bAt = now;
  if (!b) bAt = 0;

  bool aOK = a && (now - aAt > 30);
  bool bOK = b && (now - bAt > 30);
  bool aOld = a && (now - aAt > 800);
  bool bOld = b && (now - bAt > 800);

  if (aOld || bOld) { state = 0; aAt = 0; bAt = 0; }

  if (state == 0) {
    if (aOK && !bOK) state = 1;
    else if (bOK && !aOK) state = 2;
  } else if (state == 1 && bOK) {
    passengers++; Serial.println(passengers);
    sendCount(); lastSend = now; state = 0; aAt = 0; bAt = 0;
  } else if (state == 2 && aOK) {
    passengers--; if (passengers < 0) passengers = 0;
    Serial.println(passengers);
    sendCount(); lastSend = now; state = 0; aAt = 0; bAt = 0;
  } else if (state > 0 && !aOK && !bOK) {
    state = 0; aAt = 0; bAt = 0;
  }

  if (now - lastSend > 3000) { lastSend = now; sendCount(); }
}
