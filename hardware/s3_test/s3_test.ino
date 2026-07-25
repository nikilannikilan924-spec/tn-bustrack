
#include <esp_camera.h>
#include <WiFi.h>

#define PWDN_GPIO_NUM     -1
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM     15
#define SIOD_GPIO_NUM     4
#define SIOC_GPIO_NUM     5
#define Y2_GPIO_NUM       11
#define Y3_GPIO_NUM       9
#define Y4_GPIO_NUM       8
#define Y5_GPIO_NUM       10
#define Y6_GPIO_NUM       12
#define Y7_GPIO_NUM       18
#define Y8_GPIO_NUM       17
#define Y9_GPIO_NUM       16
#define VSYNC_GPIO_NUM    6
#define HREF_GPIO_NUM     7
#define PCLK_GPIO_NUM     13

#define GPS_TX 1
#define GPS_RX 2
#define SIM_TX 14
#define SIM_RX 21
#define SIM_PWRKEY 48
#define LED 2

HardwareSerial gpsSerial(1);
HardwareSerial simSerial(2);

bool initCamera() {
  camera_config_t c;
  c.ledc_channel = LEDC_CHANNEL_0;
  c.ledc_timer = LEDC_TIMER_0;
  c.pin_d0 = Y2_GPIO_NUM; c.pin_d1 = Y3_GPIO_NUM;
  c.pin_d2 = Y4_GPIO_NUM; c.pin_d3 = Y5_GPIO_NUM;
  c.pin_d4 = Y6_GPIO_NUM; c.pin_d5 = Y7_GPIO_NUM;
  c.pin_d6 = Y8_GPIO_NUM; c.pin_d7 = Y9_GPIO_NUM;
  c.pin_xclk = XCLK_GPIO_NUM; c.pin_pclk = PCLK_GPIO_NUM;
  c.pin_vsync = VSYNC_GPIO_NUM; c.pin_href = HREF_GPIO_NUM;
  c.pin_sccb_sda = SIOD_GPIO_NUM; c.pin_sccb_scl = SIOC_GPIO_NUM;
  c.pin_pwdn = PWDN_GPIO_NUM; c.pin_reset = RESET_GPIO_NUM;
  c.xclk_freq_hz = 10000000;
  c.pixel_format = PIXFORMAT_GRAYSCALE;
  c.frame_size = FRAMESIZE_QQVGA;
  c.jpeg_quality = 10;
  c.fb_count = 1;
  c.grab_mode = CAMERA_GRAB_LATEST;
  return esp_camera_init(&c) == ESP_OK;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println();
  Serial.println("=== TN BusTrack S3 CAM Hardware Test ===");
  pinMode(LED, OUTPUT);
  digitalWrite(LED, HIGH);

  Serial.print("PSRAM: ");
  Serial.println(psramFound() ? "OK" : "NOT FOUND");

  Serial.print("Camera: ");
  Serial.println(initCamera() ? "OK" : "FAIL");

  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  Serial.println("GPS Serial started on UART1 (RX=2, TX=1)");

  simSerial.begin(115200, SERIAL_8N1, SIM_RX, SIM_TX);
  Serial.println("SIM7600 Serial started on UART2 (RX=21, TX=14)");

  Serial.println("Ready.");
}

void loop() {
  digitalWrite(LED, !digitalRead(LED));
  while (gpsSerial.available()) {
    String line = gpsSerial.readStringUntil('
');
    if (line.startsWith("") || line.startsWith("")) {
      Serial.println(line.substring(0, 60) + "...");
    }
  }
  if (simSerial.available()) {
    String r = simSerial.readString();
    Serial.print("SIM: ");
    Serial.println(r.substring(0, 80));
  }
  if (Serial.available()) {
    char c = Serial.read();
    if (c == 'a') {
      simSerial.println("AT");
      Serial.println("Sent AT");
    }
  }
  delay(100);
}
