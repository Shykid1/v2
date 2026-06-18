import time
import dht
from machine import Pin, ADC
from config import (
    PIN_TRIG, PIN_ECHO, PIN_DHT, PIN_BATT_ADC, PIT_DEPTH_CM,
    PIN_CHRG, PIN_STDBY,
)

# HC-SR04 echo timeout: 38ms = max distance (~6.5 m), well beyond 4 m pit
_ECHO_TIMEOUT_US = 38_000

# Voltage divider correction: hardware uses 100k/100k divider, so ADC reads
# half the actual battery voltage. Multiply raw mV by 2.
_VDIV_FACTOR = 2


def read_fill_level():
    """Return (fill_cm, fill_pct) using 3-sample HC-SR04 median filter.

    fill_cm  — distance from sensor to liquid surface (cm)
    fill_pct — percentage of pit capacity used (0–100)
    """
    trig = Pin(PIN_TRIG, Pin.OUT)
    echo = Pin(PIN_ECHO, Pin.IN)
    samples = []

    for _ in range(3):
        # Generate 10 µs trigger pulse
        trig.off()
        time.sleep_us(2)
        trig.on()
        time.sleep_us(10)
        trig.off()

        # Wait for echo to go HIGH (with timeout)
        deadline = time.ticks_add(time.ticks_us(), _ECHO_TIMEOUT_US)
        while echo.value() == 0:
            if time.ticks_diff(deadline, time.ticks_us()) <= 0:
                samples.append(PIT_DEPTH_CM)  # treat timeout as empty pit
                break
        else:
            t_start = time.ticks_us()
            deadline = time.ticks_add(t_start, _ECHO_TIMEOUT_US)
            while echo.value() == 1:
                if time.ticks_diff(deadline, time.ticks_us()) <= 0:
                    samples.append(PIT_DEPTH_CM)
                    break
            else:
                elapsed_us = time.ticks_diff(time.ticks_us(), t_start)
                distance_cm = (elapsed_us * 0.0343) / 2
                samples.append(distance_cm)

        time.sleep_ms(60)

    samples.sort()
    measured_cm = samples[1]  # median of 3
    fill_pct = max(0.0, min(100.0, (1 - measured_cm / PIT_DEPTH_CM) * 100))
    return round(measured_cm, 1), round(fill_pct, 1)


def read_dht():
    """Return (temperature_c, humidity_pct) from DHT22.

    Retries once on CRC failure — DHT22 commonly fails the first read
    after a cold boot due to internal capacitor charge time.
    """
    sensor = dht.DHT22(Pin(PIN_DHT))
    for attempt in range(2):
        try:
            sensor.measure()
            return round(sensor.temperature(), 1), round(sensor.humidity(), 1)
        except OSError:
            if attempt == 0:
                time.sleep_ms(2000)  # DHT22 minimum inter-measurement delay
    # If both attempts fail, return safe sentinel values
    return 0.0, 0.0


def read_battery():
    """Return battery voltage in millivolts (integer).

    GPIO 34 is ADC1 channel 6. 11 dB attenuation gives a 0–3.9 V range.
    The voltage divider halves the real battery voltage before the ADC pin,
    so we multiply the derived mV by _VDIV_FACTOR.

    Valid battery range: 2800–4200 mV (18650 cell).
    """
    adc = ADC(Pin(PIN_BATT_ADC))
    adc.atten(ADC.ATTN_11DB)
    # Average 4 readings to reduce ADC noise
    raw = sum(adc.read() for _ in range(4)) // 4
    # 12-bit ADC: 0–4095 maps to 0–3900 mV at 11 dB
    adc_mv = (raw * 3900) // 4095
    battery_mv = adc_mv * _VDIV_FACTOR
    return max(0, min(5000, battery_mv))


def read_charging_status() -> dict:
    """Return TP4056 charge controller state by reading CHRG and STDBY pins.

    Both pins are open-drain active-LOW outputs on the TP4056:
      CHRG  LOW  → charging in progress (solar input present, battery not full)
      STDBY LOW  → charge complete (battery full)
      Both HIGH  → no solar input (night, overcast, broken panel, or disconnected)

    Wire CHRG → GPIO 32 and STDBY → GPIO 33 with internal pull-ups enabled.
    Do NOT connect these pins directly to 5 V — they are 3.3 V logic safe when
    the TP4056 is powered from the same 3.3 V rail or through the battery.

    Returns a dict with:
      charging          bool  — solar is actively charging the battery
      charge_complete   bool  — battery is full
      solar_present     bool  — solar panel is delivering power (charging or full)
    """
    chrg  = Pin(PIN_CHRG,  Pin.IN, Pin.PULL_UP)
    stdby = Pin(PIN_STDBY, Pin.IN, Pin.PULL_UP)

    # Small settling delay after enabling pull-ups
    time.sleep_ms(5)

    charging        = chrg.value()  == 0
    charge_complete = stdby.value() == 0
    solar_present   = charging or charge_complete

    return {
        "charging":        charging,
        "charge_complete": charge_complete,
        "solar_present":   solar_present,
    }
