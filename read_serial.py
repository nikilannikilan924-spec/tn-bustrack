import sys
sys.path.insert(0, 'C:/Users/NIKILAN/AppData/Local/Arduino15/packages/esp32/tools/esptool_py/5.3.0')
import serial
import time

s = serial.Serial('COM7', 115200, timeout=0.3)
time.sleep(2)
s.reset_input_buffer()
t = time.time()
while time.time() - t < 10:
    try:
        d = s.read(1024)
        if d:
            sys.stdout.buffer.write(d)
            sys.stdout.flush()
    except:
        pass
s.close()
