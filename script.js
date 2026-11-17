// =====================================================
// MQTT CONFIGURATION
// =====================================================

const MQTT_HOST = "wss://broker.hivemq.com:8884/mqtt";
const MQTT_TOPIC = "ta/shelter_nav_2026/kelompok01/data";

const clientId =
    "web-shelter-" + Math.random().toString(16).substring(2, 10);


// =====================================================
// KONFIGURASI SENSOR
// =====================================================

// Nilai ADC GPIO 34 adalah 0 - 4095
const WATER_THRESHOLD = 2500;


// =====================================================
// DATA SENSOR
// =====================================================

let temperature = 0;
let humidity = 0;
let doorOpen = false;
let waterDetected = false;

let mqttConnected = false;


// =====================================================
// ELEMENT HTML
// =====================================================

const temperatureEl = document.getElementById("temperature");
const humidityEl = document.getElementById("humidity");

const temperatureBar = document.getElementById("temperatureBar");
const humidityBar = document.getElementById("humidityBar");

const temperatureStatus =
    document.getElementById("temperatureStatus");

const humidityStatus =
    document.getElementById("humidityStatus");

const doorStatus =
    document.getElementById("doorStatus");

const waterStatus =
    document.getElementById("waterStatus");

const alarmPanel =
    document.getElementById("alarmPanel");

const alarmStatus =
    document.getElementById("alarmStatus");

const door =
    document.getElementById("door");

const doorAlert =
    document.getElementById("doorAlert");

const waterVisual =
    document.getElementById("waterVisual");

const beacon =
    document.getElementById("beacon");

const activityLog =
    document.getElementById("activityLog");

const lastUpdate =
    document.getElementById("lastUpdate");


// =====================================================
// MQTT CONNECT
// =====================================================

console.log("Menghubungkan ke MQTT...");

const mqttClient = mqtt.connect(MQTT_HOST, {
    clientId: clientId,
    clean: true,
    connectTimeout: 10000,
    reconnectPeriod: 3000
});


// =====================================================
// MQTT CONNECTED
// =====================================================

mqttClient.on("connect", function () {

    console.log("MQTT TERHUBUNG");

    mqttConnected = true;

    mqttClient.subscribe(MQTT_TOPIC, function (err) {

        if (err) {

            console.error(
                "Gagal subscribe:",
                err
            );

            addLog(
                "Gagal subscribe MQTT",
                "danger"
            );

            return;
        }

        console.log(
            "Subscribe:",
            MQTT_TOPIC
        );

        addLog(
            "Website terhubung ke MQTT",
            "safe"
        );
    });
});


// =====================================================
// MQTT ERROR
// =====================================================

mqttClient.on("error", function (error) {

    console.error(
        "MQTT Error:",
        error
    );

    mqttConnected = false;

    addLog(
        "MQTT error / koneksi gagal",
        "danger"
    );
});


// =====================================================
// MQTT OFFLINE
// =====================================================

mqttClient.on("offline", function () {

    console.log("MQTT OFFLINE");

    mqttConnected = false;

    addLog(
        "MQTT offline",
        "danger"
    );
});


// =====================================================
// MQTT MESSAGE
// =====================================================

mqttClient.on("message", function (topic, message) {

    console.log(
        "Pesan MQTT:",
        message.toString()
    );

    // Payload ESP32:
    //
    // 27.5,61.2,1,850
    //
    // suhu, kelembapan, pintu, air

    const data = message.toString().split(",");

    if (data.length < 4) {

        console.warn(
            "Format data MQTT tidak sesuai"
        );

        return;
    }


    // ---------------------------------------------
    // Ambil data sensor
    // ---------------------------------------------

    const suhu = parseFloat(data[0]);
    const kelembapan = parseFloat(data[1]);
    const nilaiPintu = parseInt(data[2]);
    const nilaiAir = parseInt(data[3]);


    // ---------------------------------------------
    // Validasi
    // ---------------------------------------------

    if (
        isNaN(suhu) ||
        isNaN(kelembapan) ||
        isNaN(nilaiPintu) ||
        isNaN(nilaiAir)
    ) {

        console.warn(
            "Data sensor tidak valid"
        );

        return;
    }


    // ---------------------------------------------
    // Simpan data
    // ---------------------------------------------

    temperature = suhu;
    humidity = kelembapan;

    // HIGH = pintu terbuka
    doorOpen = nilaiPintu === 1;

    // Nilai air tinggi = genangan
    waterDetected =
        nilaiAir >= WATER_THRESHOLD;


    // ---------------------------------------------
    // Update dashboard
    // ---------------------------------------------

    updateTemperature();
    updateHumidity();
    updateDoor();
    updateWater();
    updateAlarm();
    updateLastUpdate();


    // ---------------------------------------------
    // Log sensor
    // ---------------------------------------------

    addLog(
        `Data diterima | T:${suhu.toFixed(1)}°C | H:${kelembapan.toFixed(1)}% | Air:${nilaiAir}`,
        "safe"
    );

});


// =====================================================
// UPDATE TEMPERATURE
// =====================================================

function updateTemperature() {

    if (!temperatureEl) return;

    temperatureEl.textContent =
        temperature.toFixed(1) + " °C";


    if (temperatureBar) {

        let percentage =
            (temperature / 50) * 100;

        percentage =
            Math.max(0, Math.min(100, percentage));

        temperatureBar.style.width =
            percentage + "%";
    }


    if (temperatureStatus) {

        if (temperature < 28) {

            temperatureStatus.textContent =
                "NORMAL";

            temperatureStatus.className =
                "status-label safe";

        }
        else if (temperature <= 32) {

            temperatureStatus.textContent =
                "WASPADA";

            temperatureStatus.className =
                "status-label warning";

        }
        else {

            temperatureStatus.textContent =
                "BAHAYA";

            temperatureStatus.className =
                "status-label danger";
        }
    }
}


// =====================================================
// UPDATE HUMIDITY
// =====================================================

function updateHumidity() {

    if (!humidityEl) return;

    humidityEl.textContent =
        humidity.toFixed(1) + " %";


    if (humidityBar) {

        let percentage =
            Math.max(
                0,
                Math.min(100, humidity)
            );

        humidityBar.style.width =
            percentage + "%";
    }


    if (humidityStatus) {

        if (humidity <= 70) {

            humidityStatus.textContent =
                "NORMAL";

            humidityStatus.className =
                "status-label safe";

        }
        else if (humidity <= 80) {

            humidityStatus.textContent =
                "WASPADA";

            humidityStatus.className =
                "status-label warning";

        }
        else {

            humidityStatus.textContent =
                "TINGGI";

            humidityStatus.className =
                "status-label danger";
        }
    }
}


// =====================================================
// UPDATE DOOR
// =====================================================

function updateDoor() {

    if (!door) return;


    if (doorOpen) {

        // -----------------------------
        // PINTU TERBUKA
        // -----------------------------

        door.classList.add("open");

        if (doorAlert) {

            doorAlert.textContent =
                "⚠ PINTU TERBUKA";

            doorAlert.style.display =
                "block";
        }


        if (doorStatus) {

            doorStatus.textContent =
                "TERBUKA";

            doorStatus.className =
                "status-label danger";
        }

        addLog(
            "Akses pintu terdeteksi TERBUKA",
            "danger"
        );

    }
    else {

        // -----------------------------
        // PINTU TERTUTUP
        // -----------------------------

        door.classList.remove("open");

        if (doorAlert) {

            doorAlert.textContent =
                "";

            doorAlert.style.display =
                "none";
        }


        if (doorStatus) {

            doorStatus.textContent =
                "TERTUTUP";

            doorStatus.className =
                "status-label safe";
        }
    }
}


// =====================================================
// UPDATE WATER
// =====================================================

function updateWater() {

    if (!waterVisual) return;


    if (waterDetected) {

        // ---------------------------------
        // GENANGAN TERDETEKSI
        // ---------------------------------

        waterVisual.classList.add("active");

        waterVisual.style.display =
            "block";


        if (waterStatus) {

            waterStatus.textContent =
                "TERDETEKSI";

            waterStatus.className =
                "status-label danger";
        }


        addLog(
            "Genangan air TERDETEKSI",
            "danger"
        );

    }
    else {

        // ---------------------------------
        // AIR NORMAL
        // ---------------------------------

        waterVisual.classList.remove("active");

        waterVisual.style.display =
            "none";


        if (waterStatus) {

            waterStatus.textContent =
                "NORMAL";

            waterStatus.className =
                "status-label safe";
        }
    }
}


// =====================================================
// UPDATE ALARM
// =====================================================

function updateAlarm() {

    const alarmActive =
        doorOpen || waterDetected || temperature > 32;


    if (!alarmPanel) return;


    if (alarmActive) {

        alarmPanel.classList.add("active");


        if (alarmStatus) {

            alarmStatus.textContent =
                "ALARM AKTIF";

            alarmStatus.className =
                "status-label danger";
        }


        if (beacon) {

            beacon.classList.add("danger");
        }

    }
    else {

        alarmPanel.classList.remove("active");


        if (alarmStatus) {

            alarmStatus.textContent =
                "NORMAL";

            alarmStatus.className =
                "status-label safe";
        }


        if (beacon) {

            beacon.classList.remove("danger");
        }
    }
}


// =====================================================
// LAST UPDATE
// =====================================================

function updateLastUpdate() {

    if (!lastUpdate) return;

    const now =
        new Date();

    lastUpdate.textContent =
        now.toLocaleTimeString("id-ID");
}


// =====================================================
// LOG
// =====================================================

function addLog(message, type = "safe") {

    if (!activityLog) return;


    const item =
        document.createElement("div");

    item.className =
        "log-item " + type;


    const time =
        new Date().toLocaleTimeString("id-ID");


    item.innerHTML = `
        <span>${time}</span>
        <span>${message}</span>
    `;


    activityLog.prepend(item);


    // Maksimal 20 log
    while (
        activityLog.children.length > 20
    ) {

        activityLog.removeChild(
            activityLog.lastChild
        );
    }
}


// =====================================================
// INITIAL LOG
// =====================================================

addLog(
    "Dashboard monitoring dimulai",
    "safe"
);

addLog(
    "Menunggu koneksi ESP32 melalui MQTT...",
    "warning"
);