# Device identity — burned per node at flash time.
# PIT_CODE binds this sensor to a Pit in the SaniChain v2 database; HMAC_KEY must
# match the corresponding devices.hmacKey row.
DEVICE_ID = "SANI-ESP32-001"
PIT_CODE  = "PIT-00001"
HMAC_KEY  = b"REPLACE_WITH_DEVICE_HMAC_KEY_HERE"

# Backend API (SaniChain v2)
API_HOST = "api.sanichain.app"
API_PORT = 80
API_PATH = "/api/readings"

# APN — AirtelTigo Ghana default; change to "internet.mtn" for MTN
APN = "internet"

# GPIO pin assignments
PIN_TRIG     = 5   # HC-SR04 trigger
PIN_ECHO     = 18  # HC-SR04 echo
PIN_DHT      = 4   # DHT22 data
PIN_BATT_ADC = 34  # Battery voltage (ADC1 channel 6)
# HARDWARE REQUIREMENT: GPIO 34 must be driven through a 100k/100k voltage
# divider (battery+ → 100k → GPIO34 → 100k → GND). sensors.py applies
# _VDIV_FACTOR = 2 to correct.
PIN_SIM_PWRKEY = 23  # SIM800L PWRKEY (pull HIGH 1s to toggle power)
PIN_CHRG       = 32  # TP4056 CHRG  — LOW = currently charging from solar
PIN_STDBY      = 33  # TP4056 STDBY — LOW = charge complete (battery full)

# SIM800L UART
UART_ID   = 1
UART_TX   = 17
UART_RX   = 16
UART_BAUD = 9600

# Pit calibration — overwrite with field measurement on installation
PIT_DEPTH_CM = 200

# Wake / sleep intervals (hours)
SLEEP_NORMAL_H   = 6
SLEEP_ALERT_H    = 1
SLEEP_CRITICAL_H = 12
FILL_ALERT_PCT   = 80

# Battery thresholds (millivolts)
BATT_LOW_MV      = 3500
BATT_CRITICAL_MV = 3200

# Timeouts
GPRS_TIMEOUT_S = 60
HTTP_TIMEOUT_S = 30
MAX_RETRIES    = 3

# Flash offline queue cap (number of payloads)
QUEUE_MAX = 48
