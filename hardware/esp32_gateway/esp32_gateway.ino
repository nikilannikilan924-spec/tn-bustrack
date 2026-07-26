#include <WiFi.h>
#include <WiFiClientSecure.h>

const char* SSID = "SSID";
const char* PASSWORD = "Nikilan31";
const char* BUS_ID = "M31B";
const char* API_HOST = "tn-bustrack-production-4b42.up.railway.app";

#define LED_PIN 2
#define UART_RX_PIN 16

WiFiClientSecure client;
int passengers = 0;
int totalIn = 0;
int totalOut = 0;
unsigned long lastSend = 0;

void blinkPattern(int n, int t) {
  for (int i = 0; i < n; i++) {
    digitalWrite(LED_PIN, HIGH); delay(t);
    digitalWrite(LED_PIN, LOW); delay(t);
  }
}

void sendToAPI() {
  if (WiFi.status() != WL_CONNECTED) return;

  char body[128];
  snprintf(body, sizeof(body), "{\"busId\":\"%s\",\"inside\":%d}", BUS_ID, passengers);

  if (client.connect(API_HOST, 443)) {
    client.printf("POST /api/buses/count HTTP/1.1\r\n"
      "Host: %s\r\n"
      "Content-Type: application/json\r\n"
      "Content-Length: %d\r\n"
      "Connection: close\r\n\r\n%s",
      API_HOST, strlen(body), body);
    while (client.connected()) client.read();
    client.stop();
    blinkPattern(1, 50);
  }
}

void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial2.begin(115200, SERIAL_8N1, UART_RX_PIN, -1);

  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASSWORD);
  for (int i = 0; i < 40; i++) {
    if (WiFi.status() == WL_CONNECTED) break;
    blinkPattern(1, 100);
    delay(250);
  }

  client.setInsecure();
  client.setTimeout(5000);

  blinkPattern(2, 200);
  digitalWrite(LED_PIN, HIGH);
}

void loop() {
  while (Serial2.available()) {
    String line = Serial2.readStringUntil('\n');
    if (line.startsWith("COUNT:")) {
      sscanf(line.c_str(), "COUNT:%d,%d,%d", &passengers, &totalIn, &totalOut);
      digitalWrite(LED_PIN, LOW);
      delay(50);
      digitalWrite(LED_PIN, HIGH);
    }
  }

  if (millis() - lastSend > 5000) {
    lastSend = millis();
    sendToAPI();
  }
}
