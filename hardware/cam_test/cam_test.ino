#include <esp_camera.h>
#include <WiFi.h>
#include <DNSServer.h>
#include <esp_heap_caps.h>
#include "esp_http_server.h"
#include "tensorflow/lite/micro/micro_mutable_op_resolver.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/schema/schema_generated.h"
#include "person_detect_model_data.h"

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

DNSServer dnsServer;
httpd_handle_t httpd = NULL;

constexpr int kImgWidth = 96;
constexpr int kImgHeight = 96;
constexpr int kInputSize = kImgWidth * kImgHeight;
constexpr int kTensorArenaSize = 120 * 1024;
uint8_t* tensor_arena = nullptr;

const float CONFIDENCE_THRESHOLD = 0.5f;

tflite::MicroMutableOpResolver<20> resolver;
const tflite::Model* model = nullptr;
tflite::MicroInterpreter* interpreter = nullptr;
TfLiteTensor* input = nullptr;

#define NUM_ZONES 3
#define TRACK_TIMEOUT_FRAMES 6
#define LINE_Y (kImgHeight / 2)

struct Track {
  int id;
  int cy;
  int prevY;
  int framesSinceUpdate;
  bool active;
  bool countedIn;
  bool countedOut;
};

Track tracks[NUM_ZONES];
int nextTrackId = 0;
volatile int passengers = 0;
int totalIn = 0;
int totalOut = 0;
int totalFrames = 0;
int detectFrames = 0;

void blinkPattern(int n, int t) {
  for (int i = 0; i < n; i++) {
    digitalWrite(LED_PIN, HIGH); delay(t);
    digitalWrite(LED_PIN, LOW); delay(t);
  }
}

void blinkError(int n) {
  while (1) {
    blinkPattern(n, 300);
    delay(1500);
  }
}

void startServer();

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
  char json[128];
  snprintf(json, sizeof(json), "{\"p\":%d,\"i\":%d,\"o\":%d,\"f\":%d,\"d\":%d,\"ly\":%d}",
    passengers, totalIn, totalOut, totalFrames, detectFrames, LINE_Y);
  httpd_resp_set_type(req, "application/json");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_send(req, json, strlen(json));
  return ESP_OK;
}

static esp_err_t root_handler(httpd_req_t* req) {
  const char* html =
    "<!DOCTYPE html><html><head><meta name=viewport content='width=device-width,initial-scale=1'>"
    "<style>body{margin:0;background:#111;color:#0f0;font-family:monospace;text-align:center}"
    "canvas{width:100%;max-width:320px;image-rendering:pixelated}"
    ".net{font-size:72px;font-weight:bold;color:#0f0}"
    ".in{color:#0f0;font-size:24px}.out{color:#f00;font-size:24px}"
    ".label{color:#888;font-size:14px}"
    ".stat{color:#888;font-size:12px}"
    "button{background:#0f0;color:#000;border:none;padding:10px 30px;font-size:18px;border-radius:8px;margin:10px;cursor:pointer}"
    "</style></head><body>"
    "<div class=label>NET</div>"
    "<div class=net id=count>0</div>"
    "<div style='display:flex;justify-content:center;gap:40px;margin:10px 0'>"
    "<div><div class=label>IN</div><div class=in id=in>0</div></div>"
    "<div><div class=label>OUT</div><div class=out id=out>0</div></div>"
    "</div>"
    "<canvas id=c></canvas>"
    "<button onclick='fetch(\"/reset\")'>Reset</button>"
    "<div class=stat id=stat></div>"
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
    "document.getElementById('in').textContent=j.i;"
    "document.getElementById('out').textContent=j.o;"
    "document.getElementById('stat').textContent='detect '+(j.d*100/j.f).toFixed(0)+'%'"
    "}"
    "setInterval(update,500);update()"
    "</script></body></html>";
  httpd_resp_set_type(req, "text/html");
  httpd_resp_send(req, html, strlen(html));
  return ESP_OK;
}

static esp_err_t reset_handler(httpd_req_t* req) {
  passengers = 0; totalIn = 0; totalOut = 0; totalFrames = 0; detectFrames = 0; nextTrackId = 0;
  for (int i = 0; i < NUM_ZONES; i++) { tracks[i].active = false; tracks[i].countedIn = false; tracks[i].countedOut = false; }
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
  };
  if (httpd_start(&httpd, &config) == ESP_OK)
    for (int i = 0; i < 4; i++) httpd_register_uri_handler(httpd, &r[i]);
}

void downscale(uint8_t* src, int sw, int sh, uint8_t* dst) {
  for (int y = 0; y < kImgHeight; y++)
    for (int x = 0; x < kImgWidth; x++)
      dst[y * kImgWidth + x] = src[(y * sh / kImgHeight) * sw + (x * sw / kImgWidth)];
}

void setupTFLite() {
  tensor_arena = (uint8_t*)heap_caps_malloc(kTensorArenaSize, MALLOC_CAP_SPIRAM);
  if (!tensor_arena) tensor_arena = (uint8_t*)malloc(kTensorArenaSize);
  if (!tensor_arena) blinkError(5);

  resolver.AddConv2D(); resolver.AddDepthwiseConv2D(); resolver.AddAveragePool2D();
  resolver.AddSoftmax(); resolver.AddFullyConnected(); resolver.AddRelu();
  resolver.AddMaxPool2D(); resolver.AddQuantize(); resolver.AddPad();
  resolver.AddConcatenation(); resolver.AddReshape();

  model = tflite::GetModel(g_person_detect_model_data);

  static tflite::MicroInterpreter si(model, resolver, tensor_arena, kTensorArenaSize);
  interpreter = &si;
  if (interpreter->AllocateTensors() != kTfLiteOk)
    while (1) { blinkPattern(5, 100); delay(1000); }
  input = interpreter->input(0);
}

bool detectPersonInZone(uint8_t* fullFrame, int srcW, int srcH, int zone) {
  int zoneH = srcH / NUM_ZONES;
  int zy = zone * zoneH;
  for (int y = 0; y < kImgHeight; y++) {
    int sy = zy + y * zoneH / kImgHeight; if (sy >= srcH) sy = srcH - 1;
    for (int x = 0; x < kImgWidth; x++)
      input->data.int8[y * kImgWidth + x] = static_cast<int8_t>(fullFrame[sy * srcW + x * srcW / kImgWidth] - 128);
  }

  if (interpreter->Invoke() != kTfLiteOk) return false;
  TfLiteTensor* o = interpreter->output(0);
  int n = o->dims->data[o->dims->size - 1];
  if (n != 3) return false;
  float s = 0;
  if (o->type == kTfLiteInt8) s = (o->data.int8[0] + 128) / 255.0f;
  else if (o->type == kTfLiteUInt8) s = o->data.uint8[0] / 255.0f;
  else if (o->type == kTfLiteFloat32) s = o->data.f[0];
  return s >= CONFIDENCE_THRESHOLD;
}

void updateTracking(bool* det) {
  for (int z = 0; z < NUM_ZONES; z++) {
    int zoneH = kImgHeight / NUM_ZONES;
    int cy = zoneH * z + zoneH / 2;

    if (!det[z]) {
      if (tracks[z].active && ++tracks[z].framesSinceUpdate > TRACK_TIMEOUT_FRAMES)
        tracks[z].active = false;
      continue;
    }

    if (!tracks[z].active) {
      tracks[z].id = nextTrackId++; tracks[z].cy = cy;
      tracks[z].prevY = cy; tracks[z].framesSinceUpdate = 0;
      tracks[z].active = true;
      tracks[z].countedIn = false; tracks[z].countedOut = false;
    } else {
      tracks[z].prevY = tracks[z].cy; tracks[z].cy = cy;
      tracks[z].framesSinceUpdate = 0;

      if (!tracks[z].countedIn && tracks[z].prevY <= LINE_Y && tracks[z].cy > LINE_Y) {
        tracks[z].countedIn = true; totalIn++; passengers++;
      }
      if (!tracks[z].countedOut && tracks[z].prevY >= LINE_Y && tracks[z].cy < LINE_Y) {
        tracks[z].countedOut = true; totalOut++;
        if (passengers > 0) passengers--;
      }
    }
  }
}

void setup() {
  pinMode(LED_PIN, OUTPUT);
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
  if (err != ESP_OK) blinkError(1);

  sensor_t* s = esp_camera_sensor_get();
  if (s) { s->set_framesize(s, FRAMESIZE_QQVGA); s->set_pixformat(s, PIXFORMAT_GRAYSCALE); }

  IPAddress apIP(192, 168, 4, 1);
  WiFi.disconnect(true);
  WiFi.mode(WIFI_AP);
  delay(100);
  WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));
  if (!WiFi.softAP("ESP32-S3-CAM", "12345678"))
    blinkError(3);

  setupTFLite();

  dnsServer.start(53, "*", apIP);
  startServer();
  for (int i = 0; i < NUM_ZONES; i++) { tracks[i].active = false; tracks[i].countedIn = false; tracks[i].countedOut = false; }
  blinkPattern(2, 150);
  digitalWrite(LED_PIN, HIGH);
}

void loop() {
  dnsServer.processNextRequest();
  totalFrames++;

  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) return;

  static uint8_t img[kInputSize];
  downscale(fb->buf, fb->width, fb->height, img);
  esp_camera_fb_return(fb);

  bool det[NUM_ZONES] = {false};
  bool any = false;
  for (int z = 0; z < NUM_ZONES; z++)
    if ((det[z] = detectPersonInZone(img, kImgWidth, kImgHeight, z))) any = true;

  if (any) { detectFrames++; updateTracking(det); }
}
