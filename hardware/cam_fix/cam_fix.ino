#include <esp_camera.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <DNSServer.h>
#include "esp_http_server.h"

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
#define LED_PIN 2
#define BUTTON_PIN 0

DNSServer dnsServer;
httpd_handle_t httpd = NULL;

volatile int passengers = 0;
int totalFrames = 0;

const char* BUS_ID = "M31";
const char* WIFI_SSID = "SSID";
const char* WIFI_PASS = "Nikilan31";
const char* API_HOST = "tn-bustrack-production-4b42.up.railway.app";

void blinkPattern(int n, int t) {
  for (int i = 0; i < n; i++) {
    digitalWrite(LED_PIN, LOW); delay(t);
    digitalWrite(LED_PIN, HIGH); delay(t);
  }
}

void startServer();
void sendCount();

static esp_err_t cam_handler(httpd_req_t* req) {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) { httpd_resp_send_err(req, HTTPD_500_INTERNAL_SERVER_ERROR, "Camera error"); return ESP_FAIL; }
  int w = fb->width, h = fb->height;
  int bmpSize = 54 + w * h;
  uint8_t* bmp = (uint8_t*)malloc(bmpSize);
  if (!bmp) { esp_camera_fb_return(fb); httpd_resp_send_err(req, HTTPD_500_INTERNAL_SERVER_ERROR, "OOM"); return ESP_FAIL; }
  bmp[0]=0x42; bmp[1]=0x4D; bmp[2]=bmpSize&0xFF; bmp[3]=(bmpSize>>8)&0xFF;
  bmp[4]=(bmpSize>>16)&0xFF; bmp[5]=(bmpSize>>24)&0xFF;
  for(int i=6;i<18;i++) bmp[i]=0; bmp[10]=54;
  bmp[14]=40; bmp[18]=w&0xFF; bmp[19]=(w>>8)&0xFF;
  bmp[20]=(w>>16)&0xFF; bmp[21]=(w>>24)&0xFF;
  bmp[22]=h&0xFF; bmp[23]=(h>>8)&0xFF;
  bmp[24]=(h>>16)&0xFF; bmp[25]=(h>>24)&0xFF;
  bmp[26]=1; bmp[28]=8;
  for(int i=30;i<54;i++) bmp[i]=0;
  for(int y=0;y<h;y++) for(int x=0;x<w;x++) bmp[54+y*w+x] = fb->buf[(h-1-y)*w+x];
  esp_camera_fb_return(fb);
  httpd_resp_set_type(req, "image/bmp");
  httpd_resp_set_hdr(req, "Cache-Control", "no-cache");
  httpd_resp_send(req, (const char*)bmp, bmpSize);
  free(bmp);
  return ESP_OK;
}

static esp_err_t status_handler(httpd_req_t* req) {
  char json[64];
  snprintf(json, sizeof(json), "{\"p\":%d,\"f\":%d}", passengers, totalFrames);
  httpd_resp_set_type(req, "application/json");
  httpd_resp_send(req, json, strlen(json));
  return ESP_OK;
}

static esp_err_t inc_handler(httpd_req_t* req) {
  passengers++;
  char json[32];
  snprintf(json, sizeof(json), "{\"p\":%d}", passengers);
  httpd_resp_set_type(req, "application/json");
  httpd_resp_send(req, json, strlen(json));
  return ESP_OK;
}

static esp_err_t root_handler(httpd_req_t* req) {
  const char* html =
    "<!DOCTYPE html><html><head><meta name=viewport content='width=device-width,initial-scale=1'>"
    "<style>body{margin:0;background:#111;color:#0f0;font-family:monospace;text-align:center}"
    "canvas{width:100%;max-width:320px;image-rendering:pixelated}"
    ".count{font-size:72px;font-weight:bold;margin:10px 0;color:#0f0}"
    ".label{color:#888;font-size:14px;margin-bottom:20px}"
    "button{background:#0f0;color:#000;border:none;padding:10px 30px;font-size:18px;border-radius:8px;margin:10px;cursor:pointer}"
    "</style></head><body>"
    "<div class=label>Passengers</div>"
    "<div class=count id=count>0</div>"
    "<canvas id=c></canvas>"
    "<button onclick='fetch(\"/inc\")'>+1</button>"
    "<button onclick='fetch(\"/reset\")'>Reset</button>"
    "<script>"
    "let c=document.getElementById('c'),ctx=c.getContext('2d');"
    "async function update(){"
    "try{let r=await fetch('/cam'),b=await r.arrayBuffer();"
    "let w=new DataView(b).getUint16(18,1),h=new DataView(b).getUint16(22,1);"
    "c.width=w;c.height=h;"
    "let d=new Uint8ClampedArray(w*h*4);"
    "for(let i=0;i<w*h;i++){let v=b[54+i];d[i*4]=v;d[i*4+1]=v;d[i*4+2]=v;d[i*4+3]=255}"
    "ctx.putImageData(new ImageData(d,w,h),0,0)"
    "}catch(e){}"
    "let s=await fetch('/status');let j=await s.json();"
    "document.getElementById('count').textContent=j.p;"
    "}"
    "setInterval(update,500);update()"
    "</script></body></html>";
  httpd_resp_set_type(req, "text/html");
  httpd_resp_send(req, html, strlen(html));
  return ESP_OK;
}

static esp_err_t reset_handler(httpd_req_t* req) {
  passengers = 0; totalFrames = 0;
  httpd_resp_set_type(req, "application/json");
  httpd_resp_send(req, "{\"ok\":true}", 10);
  return ESP_OK;
}

void startServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;
  config.lru_purge_enable = true;
  httpd_uri_t r[] = {
    { .uri = "/", .method = HTTP_GET, .handler = root_handler },
    { .uri = "/cam", .method = HTTP_GET, .handler = cam_handler },
    { .uri = "/status", .method = HTTP_GET, .handler = status_handler },
    { .uri = "/reset", .method = HTTP_GET, .handler = reset_handler },
    { .uri = "/inc", .method = HTTP_GET, .handler = inc_handler },
  };
  if (httpd_start(&httpd, &config) == ESP_OK)
    for (int i = 0; i < 5; i++) httpd_register_uri_handler(httpd, &r[i]);
}

bool registered = false;

void registerBus() {
  WiFiClientSecure cl;
  cl.setInsecure();
  if (!cl.connect(API_HOST, 443)) return;
  String body = "{\"busId\":\"" + String(BUS_ID) + "\",\"lat\":13.0827,\"lng\":80.2707,\"speed\":0,\"seats\":42,\"inside\":" + String(passengers) + ",\"route\":\"Route 31\"}";
  cl.print("POST /api/buses/update HTTP/1.1\r\nHost: " + String(API_HOST) +
    "\r\nContent-Type: application/json\r\nContent-Length: " + body.length() +
    "\r\nConnection: close\r\n\r\n" + body);
  while (cl.available()) cl.read();
  cl.stop();
  registered = true;
}

void sendCount() {
  WiFiClientSecure cl;
  cl.setInsecure();
  if (!cl.connect(API_HOST, 443)) return;
  String body = "{\"busId\":\"" + String(BUS_ID) + "\",\"inside\":" + String(passengers) + "}";
  cl.print("POST /api/buses/count HTTP/1.1\r\nHost: " + String(API_HOST) +
    "\r\nContent-Type: application/json\r\nContent-Length: " + body.length() +
    "\r\nConnection: close\r\n\r\n" + body);
  cl.stop();
}

void setup() {
  pinMode(LED_PIN, OUTPUT); pinMode(BUTTON_PIN, INPUT_PULLUP);
  digitalWrite(LED_PIN, LOW); delay(200);

  camera_config_t c;
  c.ledc_channel = LEDC_CHANNEL_0; c.ledc_timer = LEDC_TIMER_0;
  c.pin_d0 = Y2_GPIO_NUM; c.pin_d1 = Y3_GPIO_NUM;
  c.pin_d2 = Y4_GPIO_NUM; c.pin_d3 = Y5_GPIO_NUM;
  c.pin_d4 = Y6_GPIO_NUM; c.pin_d5 = Y7_GPIO_NUM;
  c.pin_d6 = Y8_GPIO_NUM; c.pin_d7 = Y9_GPIO_NUM;
  c.pin_xclk = XCLK_GPIO_NUM; c.pin_pclk = PCLK_GPIO_NUM;
  c.pin_vsync = VSYNC_GPIO_NUM; c.pin_href = HREF_GPIO_NUM;
  c.pin_sccb_sda = SIOD_GPIO_NUM; c.pin_sccb_scl = SIOC_GPIO_NUM;
  c.pin_pwdn = PWDN_GPIO_NUM; c.pin_reset = RESET_GPIO_NUM;
  c.xclk_freq_hz = 20000000; c.pixel_format = PIXFORMAT_GRAYSCALE;
  c.frame_size = FRAMESIZE_QQVGA; c.jpeg_quality = 10;
  c.fb_count = 2; c.grab_mode = CAMERA_GRAB_LATEST;
  c.fb_location = CAMERA_FB_IN_DRAM;

  esp_err_t err = esp_camera_init(&c);
  if (err != ESP_OK) { while (1) { blinkPattern(1, 100); delay(1000); } }

  IPAddress apIP(192, 168, 4, 1);
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));
  if (!WiFi.softAP("ESP32-S3-CAM", "12345678"))
    while (1) { blinkPattern(3, 100); delay(1000); }
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  dnsServer.start(53, "*", apIP);
  startServer();
  digitalWrite(LED_PIN, HIGH);
}

void loop() {
  dnsServer.processNextRequest();
  totalFrames++;

  if (digitalRead(BUTTON_PIN) == LOW) { passengers = 0; delay(300); }

  static unsigned long lastSend = 0;
  if (WiFi.status() == WL_CONNECTED) {
    if (!registered && millis() > 3000) { registerBus(); }
    if (millis() - lastSend > 3000) { lastSend = millis(); sendCount(); }
  }

  delay(100);
}
