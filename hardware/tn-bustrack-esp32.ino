#include <WiFi.h>
#include <HTTPClient.h>

// WiFi credentials
const char* ssid = "No Hotspot";
const char* password = "31313131";

// Server URL - Railway deployment
const char* serverUrl = "https://tn-bustrack-production.up.railway.app/api/bus/passengers";

// Bus ID from seed data
const char* busId = "bus-828-1";

// HC-SR04 pins
#define TRIG_A 12
#define ECHO_A 14
#define TRIG_B 27
#define ECHO_B 15

#define THRESHOLD 30

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

int passengers = 0;
int lastSent = -1;
int state = 0;

void sendPassengerCount() {
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  String body = "{\"busId\":\"" + String(busId) + "\",\"passengersInside\":" + String(passengers) + "}";
  int code = http.POST(body);

  Serial.print("POST /api/bus/passengers -> ");
  Serial.println(code);

  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_A, OUTPUT);
  pinMode(ECHO_A, INPUT);
  pinMode(TRIG_B, OUTPUT);
  pinMode(ECHO_B, INPUT);

  Serial.print("Connecting to WiFi");
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
  } else {
    Serial.println("\nWiFi failed!");
  }
}

void loop() {
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
      Serial.print("ENTER ");
      Serial.println(passengers);
    } else if (state == 2) {
      passengers--;
      state = 3;
      Serial.print("EXIT  ");
      Serial.println(passengers);
    }

    if (state == 3 && passengers != lastSent && WiFi.status() == WL_CONNECTED) {
      lastSent = passengers;
      sendPassengerCount();
    }
  }

  delay(100);
}
