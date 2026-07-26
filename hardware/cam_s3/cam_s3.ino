#include <esp_camera.h>
#include <esp_heap_caps.h>
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

#define UART_TX_PIN 14
#define UART_RX_PIN 15

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
int lastSentCount = -1;

void blinkError(int n) {
  pinMode(LED_PIN, OUTPUT);
  while (1) {
    for (int i = 0; i < n; i++) {
      digitalWrite(LED_PIN, HIGH); delay(300);
      digitalWrite(LED_PIN, LOW); delay(300);
    }
    delay(1500);
  }
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
  if (interpreter->AllocateTensors() != kTfLiteOk) blinkError(5);
  input = interpreter->input(0);
}

void downscale(uint8_t* src, int sw, int sh, uint8_t* dst) {
  for (int y = 0; y < kImgHeight; y++)
    for (int x = 0; x < kImgWidth; x++)
      dst[y * kImgWidth + x] = src[(y * sh / kImgHeight) * sw + (x * sw / kImgWidth)];
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

void sendCount() {
  char buf[32];
  snprintf(buf, sizeof(buf), "COUNT:%d,%d,%d\n", passengers, totalIn, totalOut);
  Serial1.print(buf);
}

void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

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

  setupTFLite();

  Serial1.begin(115200, SERIAL_8N1, UART_RX_PIN, UART_TX_PIN);

  for (int i = 0; i < NUM_ZONES; i++) { tracks[i].active = false; tracks[i].countedIn = false; tracks[i].countedOut = false; }

  digitalWrite(LED_PIN, HIGH);
}

void loop() {
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

  if (passengers != lastSentCount) {
    lastSentCount = passengers;
    sendCount();
  }
}
