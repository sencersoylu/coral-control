const net = require('net');
require('dotenv').config();
const express = require('express');

const app = express();
const http = require('http');
const { io } = require('socket.io-client');
const cors = require('cors');
const { linearConversion } = require('./src/helpers');
const db = require('./src/models');
const demo = 0;
const { ProfileUtils, ProfileManager } = require('./profile_manager');
const dayjs = require('dayjs')
let server = http.Server(app);
const bodyParser = require("body-parser");


const connections = []; // view soket bağlantılarının tutulduğu array
let isWorking = 0;
let isConnectedPLC = 0;
let sensorCalibrationData = {}; // Object to store all sensor calibration data
db.sequelize.sync();

init();
const allRoutes = require('./src/routes');

let sensorData = {};

let socket = null;
app.use(allRoutes);

let sessionStatus = {
    status: 0, // 0: session durumu yok, 1: session başlatıldı, 2: session duraklatıldı, 3: session durduruldu
    zaman: 0,
    dalisSuresi: 10,
    cikisSuresi: 10,
    hedeflenen: [],
    cikis: 0,
    grafikdurum: 0,
    adim: 0,    
    adimzaman: [],
    maxadim: [],
    hedef: 0,
    lastdurum: 0,
    wait: 0,
    p2counter: 0,
    tempadim: 0,
    profile: [],
    minimumvalve: 12,
    otomanuel:0,
    alarmzaman:0,
    diffrencesayac:0,
    higho:0,
    highoc:0,
    higho2: 0,
    pauseTime: 0,
    starttime: 0,
    pausetime: 0,
    ilksure: 0,
    ilkfsw: 0,
    fswd: 0,
    pauseDepteh: 0,
    doorSensorStatus: 0,
    doorStatus: 0,
    pressure: 0,
    o2: 0,
    bufferdifference: [],
    olcum: [],
    ventil: 0,
    main_fsw: 0,
    pcontrol: 0,
    comp_offset: 12,
    comp_gain: 8,
    comp_depth: 100,
    decomp_offset: 10,
    decomp_gain: 6,
    decomp_depth: 100,
    chamberStatus: 1,
    chamberStatusText: '',
    chamberStatusTime: null,
    setDerinlik: 0,
    dalisSuresi: 0,
    cikisSuresi: 0,
    toplamSure: 0,
    eop: 0,
    uyariyenile: 0,
    uyariyenile: 0,

    
}

let alarmStatus = {
    status: 0,
    type: '',
    text: '',
    time: 0,
    duration: 0
}




async function init() {
	console.log('**************** APP START ****************');
	
app.use(cors());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// ***********************************************************
// ***********************************************************
// SERVER CONFIGS
// ***********************************************************
// ***********************************************************
    server.listen(4001, () => console.log(`Listening on port 4001`));
    
    await loadSensorCalibrationData();



    try {
       socket = io.connect('http://localhost:4000', {reconnect: true});
        socket.on('connect', function() {
            console.log('Connected to server');
            doorOpen();
            compValve(0);
            decompValve(0);
            //socket.emit('writeRegister', JSON.stringify({address: "R03904", value: 8000}));
        });
        socket.on('disconnect', function() {
            console.log('Disconnected from server');
        });
        socket.on('data', async function(data) {
            console.log('Received message:', data);
            const dataObject = JSON.parse(data);
            //console.log("length",dataObject.data.length);
            if (dataObject.data.length > 1) {
                sessionStatus.doorSensorStatus = dataObject.data[10];


                sensorData["pressure"] = linearConversion(sensorCalibrationData["pressure"].sensorLowerLimit, sensorCalibrationData["pressure"].sensorUpperLimit, sensorCalibrationData["pressure"].sensorAnalogLower, sensorCalibrationData["pressure"].sensorAnalogUpper, dataObject.data[1], sensorCalibrationData["pressure"].sensorDecimal);
                sessionStatus.pressure = sensorData["pressure"];
                sessionStatus.main_fsw = sensorData["pressure"] * 33.4;
            
                sensorData["o2"] = 21.1;

            
                sensorData["temperature"] = linearConversion(sensorCalibrationData["temperature"].sensorLowerLimit, sensorCalibrationData["temperature"].sensorUpperLimit, sensorCalibrationData["temperature"].sensorAnalogLower, sensorCalibrationData["temperature"].sensorAnalogUpper, dataObject.data[4], sensorCalibrationData["temperature"].sensorDecimal);


            
                sensorData["humidity"] = linearConversion(sensorCalibrationData["humidity"].sensorLowerLimit, sensorCalibrationData["humidity"].sensorUpperLimit, sensorCalibrationData["humidity"].sensorAnalogLower, sensorCalibrationData["humidity"].sensorAnalogUpper, dataObject.data[5], sensorCalibrationData["humidity"].sensorDecimal);



                if (dataObject.data[1] < 2000) {
                    sessionStatus.chamberStatus = 0;
                    sessionStatus.chamberStatusText = 'Pressure sensor problem';
                    sessionStatus.chamberStatusTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
                } else if (dataObject.data[4] < 2000) {
                    sessionStatus.chamberStatus = 0;
                    sessionStatus.chamberStatusText = 'Temperature sensor problem';
                    sessionStatus.chamberStatusTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
                } else if (dataObject.data[5] < 2000) {
                    sessionStatus.chamberStatus = 0;
                    sessionStatus.chamberStatusText = 'Humidity sensor problem';
                    sessionStatus.chamberStatusTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
                } else {
                    sessionStatus.chamberStatus = 1;
                    sessionStatus.chamberStatusText = 'Chamber is ready';
                    sessionStatus.chamberStatusTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
                }
                console.log(sessionStatus.chamberStatus, sessionStatus.chamberStatusText, sessionStatus.chamberStatusTime);
            } else {
                console.log("chamberStatus problem");
                sessionStatus.chamberStatus = 0;
                sessionStatus.chamberStatusText = 'Chamber is communication problem. Please contact to support.';
                sessionStatus.chamberStatusTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
            }
            socket.emit('sensorData', {
                pressure: sensorData["pressure"],
                o2: sensorData["o2"],
                temperature: sensorData["temperature"],
                humidity: sensorData["humidity"],
                sessionStatus: sessionStatus,
                doorStatus: sessionStatus.doorStatus,
            });

            // Read all sensor calibration data and store in object
           
        });

        socket.on('chamberControl', function (data) {
            console.log("chamberControl",data)
            const dt = data
            console.log(dt);
            if (dt.type == 'alarm') {
                alarmStatus = dt.data.alarmStatus;
            } else if (dt.type == 'alarmClear') {
                alarmClear();
            }
            else if (dt.type == 'sessionStart') {
            sessionStatus.dalisSuresi = dt.data.dalisSuresi;
            sessionStatus.cikisSuresi = dt.data.cikisSuresi;
            sessionStatus.toplamSure = dt.data.toplamSure;
            sessionStatus.setDerinlik = dt.data.setDerinlik;

            console.log(sessionStatus.dalisSuresi, sessionStatus.setDerinlik, "air");


            const quickProfile = ProfileUtils.createQuickProfile([
                [sessionStatus.dalisSuresi, sessionStatus.setDerinlik, "air"],
                [sessionStatus.toplamSure - (sessionStatus.dalisSuresi + sessionStatus.cikisSuresi), sessionStatus.setDerinlik, "air"],
                [sessionStatus.cikisSuresi, 0, "air"]
            ]);
            sessionStatus.profile = quickProfile.toTimeBasedArrayBySeconds();

            console.log(sessionStatus.profile);
                
                sessionStatus.status = 1;
                
                socket.emit('chamberControl', {
                    type: 'sessionStarting',
                    data: {
                        
                    }
                });

            
            } else if (dt.type == 'sessionPause') {
                  sessionStatus.status = 2;
            sessionStatus.otomanuel = 1;
            sessionStatus.pauseTime = sessionStatus.zaman;
                sessionStatus.pauseDepth = sensorData["pressure"];
                compValve(0);
                decompValve(0);
                
            } else if (dt.type == 'sessionResume') {
                // Calculate resume parameters
                const pauseEndTime = sessionStatus.zaman;
                const currentPressure = sensorData["pressure"];
                const stepDuration = pauseEndTime - sessionStatus.pauseTime;
                
                // Call session resume function to recalculate profile
                sessionResume(
                    sessionStatus.pauseTime,
                    pauseEndTime,
                    currentPressure,
                    sessionStatus.pauseDepth,
                    stepDuration
                );
                
                sessionStatus.status = 1;
                sessionStatus.otomanuel = 0;
                
                socket.emit('chamberControl', {
                    type: 'sessionResumed',
                    data: {
                        profile: sessionStatus.profile,
                        currentTime: sessionStatus.zaman
                    }
                });
            } else if (dt.type == 'sessionStop') {
                sessionStop();
                socket.emit('chamberControl', {
                    type: 'sessionStopped',
                    data: {
                        profile: sessionStatus.profile,
                        currentTime: sessionStatus.zaman
                    }
                });
            } else if (dt.type == 'doorClose') {
                console.log("doorClose");
                doorClose();
            } else if (dt.type == 'doorOpen') {
                console.log("doorOpen");
                doorOpen();
            } else if (dt.type == "compValve") {
                console.log("CompValve : ", dt.data.vana);
                compValve(dt.data.vana);
            } else if (dt.type == "decompValve") {
                console.log("deCompValve : ", dt.data.vana);
                decompValve(dt.data.vana);
            } else if (dt.type == "drainOn") {
                console.log("drainOn");
                drainOn();
            } else if (dt.type == "drainOff") {
                console.log("drainOff");
                drainOff();
            }
        })
        
        socket.on('sessionStart', function (data) {
            console.log("sessionStart", data);
            const dt = JSON.parse(data);
            sessionStatus.dalisSuresi = dt.dalisSuresi;
            sessionStatus.cikisSuresi = dt.cikisSuresi;
            sessionStatus.toplamSure = dt.toplamSure;
            sessionStatus.setDerinlik = dt.setDerinlik;
            sessionStatus.status = 1;

            console.log(sessionStatus.dalisSuresi, sessionStatus.setDerinlik, "air");

            const profile = new ProfileManager();

            const quickProfile = ProfileUtils.createQuickProfile([
                [sessionStatus.dalisSuresi, sessionStatus.setDerinlik, "air"],
                [sessionStatus.toplamSure - (sessionStatus.dalisSuresi + sessionStatus.cikisSuresi), sessionStatus.setDerinlik, "air"],
                [sessionStatus.cikisSuresi, 0, "air"]
            ]);
            console.log(quickProfile);
            sessionStatus.profile = quickProfile.toTimeBasedArrayBySeconds();

            console.log(sessionStatus.profile);
            
        });

        socket.on('sessionPause', function(data) {
            sessionStatus.status = 2;
            sessionStatus.otomanuel = 1;
            sessionStatus.pauseTime = sessionStatus.zaman;
            sessionStatus.pauseDepth = sensorData["pressure"];
        });

        socket.on('sessionResume', function(data) {
            // Calculate resume parameters
            const pauseEndTime = sessionStatus.zaman;
            const currentPressure = sensorData["pressure"];
            const stepDuration = pauseEndTime - sessionStatus.pauseTime;
            
            // Call session resume function to recalculate profile
            sessionResume(
                sessionStatus.pauseTime,
                pauseEndTime,
                currentPressure,
                sessionStatus.pauseDepth,
                stepDuration
            );
            
            sessionStatus.status = 1;
            sessionStatus.otomanuel = 0;
        });

        socket.on('sessionStop', function(data) {
            sessionStop();
        });

      
        
      
		// Removed commented service code
	} catch (err) {
		console.log(err);
	}
}

async function loadSensorCalibrationData() {
    try {
        const allSensors = await db.sensors.findAll({attributes: ['sensorID', 'sensorName', 'sensorText', 'sensorMemory', 'sensorSymbol', 'sensorOffset', 'sensorLowerLimit', 'sensorUpperLimit', 'sensorAnalogUpper', 'sensorAnalogLower', 'sensorDecimal']});
        allSensors.forEach(sensor => {
            sensorCalibrationData[sensor.sensorName] = {
                sensorName: sensor.sensorName,
                sensorText: sensor.sensorText,
                sensorMemory: sensor.sensorMemory,
                sensorSymbol: sensor.sensorSymbol,
                sensorOffset: sensor.sensorOffset,
                sensorLowerLimit: Number(sensor.sensorLowerLimit),
                sensorUpperLimit: Number(sensor.sensorUpperLimit),
                sensorAnalogUpper: Number(sensor.sensorAnalogUpper),
                sensorAnalogLower: Number(sensor.sensorAnalogLower),
                sensorDecimal: Number(sensor.sensorDecimal)
            };
        });
        console.log(sensorCalibrationData);
    } catch (error) {
        console.error('Error reading sensor calibration data:', error);
    }
}
        
      
setInterval(() => {
   
    // //read();
    // if (sessionStatus.status == 1) {
    //     sessionStatus.zaman++;
    //     console.log(sessionStatus.zaman);
    //     console.log(sessionStatus.profile[sessionStatus.zaman]);
    // }
    read();
}, 1000);


function read() {
    // Sensor değerlerini al

    console.log(sessionStatus.status, sessionStatus.zaman, sessionStatus.grafikdurum);

    
    if (sessionStatus.status > 0)
        sessionStatus.zaman++;
    if (sessionStatus.status == 1 && sessionStatus.doorStatus == 0) {
        console.log("door closing")
        alarmSet('sessionStarting', 'Session Starting', 0);
        doorClose();

    }

    

	// Sistem aktifse kontrol et
    if (sessionStatus.status > 0 && sessionStatus.doorStatus == 1 && sessionStatus.zaman > 5 ) {
        
       

        // Hedef basıncı belirle
        if (sessionStatus.profile.length > sessionStatus.zaman) {
            sessionStatus.hedef = sessionStatus.profile[sessionStatus.zaman][1] * 33.4;
        } else {
            sessionStatus.hedef = sessionStatus.profile[sessionStatus.profile.length - 1] * 33.4;
        }

        // Çıkış durumunda hedefi sıfırla
        if (sessionStatus.zaman > sessionStatus.profile.length || sessionStatus.cikis == 1) {
            sessionStatus.hedef = 0;
        }
        console.log("hedef : ", sessionStatus.hedef.toFixed(2))

        // Grafik durumunu belirle (yükseliş/iniş/düz)
        sessionStatus.lastdurum = sessionStatus.grafikdurum;
        
        // Check if current and next profile points exist
        if (sessionStatus.profile[sessionStatus.zaman] && sessionStatus.profile[sessionStatus.zaman + 1]) {
            if (sessionStatus.profile[sessionStatus.zaman][1] > sessionStatus.profile[sessionStatus.zaman + 1][1]) {
                sessionStatus.grafikdurum = 0; // İniş
            } else if (sessionStatus.profile[sessionStatus.zaman][1] < sessionStatus.profile[sessionStatus.zaman + 1][1]) {
                sessionStatus.grafikdurum = 1; // Çıkış  
            } else {
                sessionStatus.grafikdurum = 2; // Düz
            }
        } else {
            // If at end of profile, maintain current state or set to descent
            sessionStatus.grafikdurum = 0; // Default to descent when at end
        }

        // Adım kontrolü
        if (sessionStatus.grafikdurum != sessionStatus.lastdurum && sessionStatus.wait == 0) {
            sessionStatus.p2counter = 0;
        }
		
        sessionStatus.adim = sessionStatus.profile[sessionStatus.zaman][2];

        // Gecikme kontrolü - Yükseliş sırasında hedef basınca ulaşılamadıysa
        // if (sessionStatus.main_fsw < sessionStatus.maxadim[sessionStatus.adim] &&
        //     sessionStatus.zaman == (sessionStatus.adimzaman[sessionStatus.adim] * 60 - 2) &&
        //     sessionStatus.grafikdurum == 1 &&
        //     sessionStatus.otomanuel == 0 ) {
			
        //     sessionStatus.wait = 1;
        //     sessionStatus.waitstarttime = sessionStatus.zaman;
        //     sessionStatus.targetmax = sessionStatus.maxadim[sessionStatus.adim];
        //     sessionStatus.counter = 0;
        //     sessionStatus.tempadim = sessionStatus.adim;
        // }

        // // Gecikme kontrolü - İniş sırasında hedef basıncın üzerindeyse
        // if (sessionStatus.main_fsw > sessionStatus.maxadim[sessionStatus.adim] &&
        //     sessionStatus.zaman == (sessionStatus.adimzaman[sessionStatus.adim] * 60 - 2) &&
        //     sessionStatus.grafikdurum == 0 &&
        //     sessionStatus.otomanuel == 0 ) {
			
        //     sessionStatus.wait = 2;
        //     sessionStatus.waitstarttime = sessionStatus.zaman;
        //     sessionStatus.targetmax = sessionStatus.maxadim[sessionStatus.adim];
        //     sessionStatus.counter = 0;
        //     sessionStatus.tempadim = sessionStatus.adim;
        // }

        // // Gecikme bitirme kontrolü
        // if (sessionStatus.main_fsw > sessionStatus.targetmax - 0.5 && sessionStatus.wait == 1 && sessionStatus.counter != 0) {
        //     sessionStatus.wait = 0;
        //     sessionStatus.waitstoptime = sessionStatus.zaman;
        //     sessionStatus.p2counter = 0;
        //     //grafikupdate(sessionStatus.adim, sessionStatus.counter);
        //     sessionStatus.adim = sessionStatus.tempadim + 1;
        // }

        // if (sessionStatus.main_fsw < sessionStatus.targetmax + 0.5 && sessionStatus.wait == 2 && sessionStatus.counter != 0) {
        //     sessionStatus.wait = 0;
        //     sessionStatus.p2counter = 0;
        //     sessionStatus.waitstoptime = sessionStatus.zaman + 1;
        //     //grafikupdate(sessionStatus.adim, sessionStatus.counter);
        //     sessionStatus.adim = sessionStatus.tempadim - 1;
        // }

        // Gecikme sırasında hedefi güncelle
        // if (sessionStatus.wait == 1 || sessionStatus.wait == 2) {
        //     if (sessionStatus.wait == 2) sessionStatus.grafikdurum = 0;
        //     sessionStatus.hedeflenen[sessionStatus.zaman + 1] = sessionStatus.targetmax;
        //     sessionStatus.counter++;
        // }

        // Zaman hesaplamaları
        var s = sessionStatus.zaman % 60;
        var m = parseInt(sessionStatus.zaman / 60);
		
        sessionStatus.p2counter++;
		
        // Global değişkenleri güncelle
        sessionStatus.fsw = sessionStatus.main_fsw;
        sessionStatus.fswd = sessionStatus.main_fswd;

        // Fark hesaplama
        var difference = parseFloat(sessionStatus.hedef) - parseFloat(sessionStatus.main_fsw);
        sessionStatus.bufferdifference[sessionStatus.zaman] = difference;
        sessionStatus.olcum.push(sessionStatus.main_fsw);

        console.log("difference :", difference)
        
        console.log("pressure :", sessionStatus.pressure ,sessionStatus.fsw.toFixed(2))

        // İlk basınç kaydı
        if (sessionStatus.zaman == 1) {
            sessionStatus.ilkbasinc = sessionStatus.fsw;
        }

        // Uyarı kontrolü
        if (sessionStatus.zaman > 0) {
            
            
            // Periyodik uyarılar
            // if (sessionStatus.zaman % sessionStatus.sesliuyari == 0 && sessionStatus.uyaridurum == 0) {
            //     showalert('Operator Shouldnt Away From The Panel !', 0);
            //     sessionStatus.uyaridurum = 1;
            // }
            // if (sessionStatus.zaman % sessionStatus.goreseluyari == 0 && sessionStatus.uyaridurum == 0) {
            //     showalert('Operator Shouldnt Away From The Panel !', 1);
            //     sessionStatus.uyaridurum = 1;
            // }

            // Sapma uyarısı
            if (Math.abs(sessionStatus.bufferdifference[sessionStatus.zaman]) > 5) {
                sessionStatus.diffrencesayac++;
            }
            if (sessionStatus.diffrencesayac > 10 && sessionStatus.otomanuel == 0 && (sessionStatus.alarmzaman + 300 < sessionStatus.zaman || sessionStatus.alarmzaman == 0)) {
                alarmSet('deviation', 'Deviation !', 0);
                sessionStatus.alarmzaman = sessionStatus.zaman;
                sessionStatus.diffrencesayac = 0;
                sessionStatus.uyaridurum = 1;
            }

            // Otomatik kontrol
            if (sessionStatus.otomanuel == 0 && sessionStatus.cikis == 0 && sessionStatus.wait == 0) {
                // O2/Hava kontrolü
                // if (sessionStatus.type2[sessionStatus.adim - 1] == 'air') {
                //     ohavad('a');
                // } else if (sessionStatus.type2[sessionStatus.adim - 1] == 'o') {
                //     ohavad('o');
                // }

                // PID kontrolü için ortalama fark hesapla
                var avgDifference = (sessionStatus.bufferdifference[sessionStatus.zaman] + sessionStatus.bufferdifference[sessionStatus.zaman - 1] + sessionStatus.bufferdifference[sessionStatus.zaman - 2]) / 3;

                console.log("avgDiff" , avgDifference.toFixed(2))
				
                // Kompresör kontrolü
                sessionStatus.pcontrol = sessionStatus.comp_offset + sessionStatus.comp_gain * difference + sessionStatus.fsw / sessionStatus.comp_depth;
                if (sessionStatus.pcontrol < sessionStatus.minimumvalve) sessionStatus.pcontrol = sessionStatus.minimumvalve;
				
				

                // Dekompresyon kontrolü
                var control = sessionStatus.decomp_offset - sessionStatus.decomp_gain * difference + sessionStatus.decomp_depth / sessionStatus.fsw;

                // Vana kontrolü
                if (sessionStatus.ventil == 0) {
                    if (sessionStatus.grafikdurum == 1) { // Yükseliş
                        if (difference > 0.1) {
                            compValve(sessionStatus.pcontrol);
                            decompValve(0);
                        } else if (avgDifference < -0.6) {
                            compValve(sessionStatus.minimumvalve);
                            decompValve(0);
                        }
                    } else if (sessionStatus.grafikdurum == 2) { // Düz
                        if (difference > 0.1) {
                            compValve(sessionStatus.pcontrol);
                            if (sessionStatus.ventil != 1) decompValve(0);
                        } else if (difference < -1) {
                            compValve(0);
                            decompValve(control);
                        }
                    } else { // İniş
                        compValve(0);
                        decompValve(Math.abs(control));
                    }
                }
            }

            // Ventilasyon kontrolü
            if ((sessionStatus.ventil == 1 || sessionStatus.ventil == 2 || sessionStatus.ventil == 3) && sessionStatus.otomanuel == 0 ) {
                if (difference < 0 && difference > -0.3) {
                    sessionStatus.pcontrol = 5 * (sessionStatus.vanacikis / 9);
                } else if (difference < 0.5 && difference > 0) {
                    sessionStatus.pcontrol = 2 * (sessionStatus.vanacikis / 3);
                } else if (difference > 0.5) {
                    var avgDiff = (sessionStatus.bufferdifference[sessionStatus.zaman] + sessionStatus.bufferdifference[sessionStatus.zaman - 1] + sessionStatus.bufferdifference[sessionStatus.zaman - 2]) / 3;
                    sessionStatus.pcontrol = sessionStatus.comp_offset + sessionStatus.comp_gain * avgDiff + sessionStatus.fsw / sessionStatus.comp_depth;
                    if (sessionStatus.pcontrol < 15) sessionStatus.pcontrol = 16;
                }
                compValve(sessionStatus.pcontrol);
                decompValve(sessionStatus.vanacikis);
            }

            // Çıkış durumu
            if (sessionStatus.cikis == 1) decompValve(90);

            // Yüksek oksijen kontrolü
            if (sessionStatus.higho == 1 && sessionStatus.ventil != 1) {
                sessionStatus.ventil = 1;
                sessionStatus.vanacikis = 30;
                if (sessionStatus.ohava == 1) ohavad('a');
                alarmSet('highO2', 'High O2 Level. Ventilation Started.', 0);
            }

            console.log(sessionStatus.zaman, sessionStatus.hedeflenen.length, sessionStatus.cikis, sessionStatus.eop, sessionStatus.main_fsw);  
            // Seans sonu kontrolü
            if ((sessionStatus.zaman > sessionStatus.profile.length || sessionStatus.cikis == 1) && sessionStatus.eop == 0 && sessionStatus.main_fsw <= 2) {
                alarmSet('endOfSession', 'End Of The Session Duration', 0);
                sessionStatus.durum = 0;
                sessionStatus.uyariyenile = 1;
                sessionStatus.uyaridurum = 1;
                sessionStatus = {
    status: 0, // 0: session durumu yok, 1: session başlatıldı, 2: session duraklatıldı, 3: session durduruldu
    zaman: 0,
    dalisSuresi: 10,
    cikisSuresi: 10,
    hedeflenen: [],
    cikis: 0,
    grafikdurum: 0,
    adim: 0,    
    adimzaman: [],
    maxadim: [],
    hedef: 0,
    lastdurum: 0,
    wait: 0,
    p2counter: 0,
    tempadim: 0,
    profile: [],
    minimumvalve: 12,
    otomanuel:0,
    alarmzaman:0,
    diffrencesayac:0,
    higho:0,
    highoc:0,
    higho2: 0,
    pauseTime: 0,
    starttime: 0,
    pausetime: 0,
    ilksure: 0,
    ilkfsw: 0,
    fswd: 0,
    pauseDepteh: 0,
    doorSensorStatus: 0,
    doorStatus: 0,
    pressure: 0,
    o2: 0,
    bufferdifference: [],
    olcum: [],
    ventil: 0,
    main_fsw: 0,
    pcontrol: 0,
    comp_offset: 12,
    comp_gain: 8,
    comp_depth: 100,
    decomp_offset: 10,
    decomp_gain: 6,
    decomp_depth: 100,
    chamberStatus: 1,
    chamberStatusText: '',
    chamberStatusTime: null,
    setDerinlik: 0,
    dalisSuresi: 0,
    cikisSuresi: 0,
    toplamSure: 0,
    eop: 0,
    uyariyenile: 0,
    uyariyenile: 0,

    
}
                doorOpen();
            }
        }

        // Görüntüleme değeri hesapla
        var displayValue = sessionStatus.main_fsw;
        if (Math.abs(difference) < 2.5) {
            displayValue = sessionStatus.profile[sessionStatus.zaman][1];
        }

        // Zaman görüntüleme
        var m_display = zeroPad(parseInt(sessionStatus.zaman / 60), 2);
        var s_display = zeroPad(sessionStatus.zaman % 60, 2);
        //document.getElementById('time').innerHTML = '<h3>' + m_display + ':' + s_display + '</h3>';
        //document.getElementById('carpan').innerHTML = sessionStatus.pcontrol + '-' + sessionStatus.manuelcompangel + '-' + sessionStatus.starttime + '-' + sessionStatus.pausetime;
	

        // Sensör verilerini kaydet
	

        // Gauge güncelle

        // Yüksek oksijen kontrolü
        if (sessionStatus.mainov > sessionStatus.higho2) {
            sessionStatus.highoc++;
            if (sessionStatus.highoc > 5) {
                sessionStatus.higho = 1;
            }
        } else {
            sessionStatus.highoc = 0;
            if (sessionStatus.ventil != 0 && sessionStatus.higho == 1) {
                sessionStatus.higho = 0;
                sessionStatus.ventil = 0;
            }
        }
    }
}



function linearInterpolation(startValue, endValue, duration) {
    const result = [];
    
    // Her saniye için değer hesapla
    for (let t = 0; t <= duration * 60; t++) {
        // Doğrusal interpolasyon formülü: start + (end - start) * (t / duration)
        const progress = t / (duration * 60);
        const value = startValue + (endValue - startValue) * progress;
        
        result.push({
            time: t,
            value: Math.round(value * 1000) / 1000 // 3 ondalık basamağa yuvarla
        });
    }
    
    return result;
}

function profileGenerate(dalisSuresi, cikisSuresi, toplamSure, derinlik) {
    const result = [];
    const dalis = linearInterpolation(0,derinlik,dalisSuresi);
    const cikis = linearInterpolation(derinlik,0,cikisSuresi);
    const tedaviSuresi = dalisSuresi + cikisSuresi;
    for (let i = 0; i < tedaviSuresi; i++) {
        result.push(dalis[i].value);
    }
    return result;
}

function alarmSet(type, text, duration) {
  alarmStatus.status = 1;
  alarmStatus.type = type;
  alarmStatus.text = text;
  alarmStatus.time = dayjs();
  alarmStatus.duration = duration;
  
    socket.emit('chamberControl', {
        type: 'alarm',
        data: {
             alarmStatus
        }
    })
}

function alarmClear() {
    alarmStatus.status = 0;
    alarmStatus.type = '';
    alarmStatus.text = '';
    alarmStatus.time = 0;
    alarmStatus.duration = 0;
    socket.emit('chamberControl', {
        type: 'alarmClear',
        data: {
            alarmStatus
        }
    })
}

function doorClose() {
    if (sessionStatus.doorSensorStatus == 0) {
        alarmSet('doorIsOpen', 'Please Close The Door', 10);
        sessionStatus.doorStatus = 0;
    } else {
        socket.emit('writeBit', { register: "M0100", value: 1 });
        sessionStatus.doorStatus = 1;
    }
}

function doorOpen() {
    console.log("door Opening")
    socket.emit('writeBit', { register: "M0100", value: 0 });
    sessionStatus.doorStatus = 0;
}



function zeroPad(num, numZeros) {
	var n = Math.abs(num);
	var zeros = Math.max(0, numZeros - Math.floor(n).toString().length);
	var zeroString = Math.pow(10, zeros).toString().substr(1);
	if (num < 0) {
		zeroString = '-' + zeroString;
	}

	return zeroString + n;
}

function compValve(angle) {
	if (angle > 90) angle = 90;
	if (angle < 0) angle = 0;
    angle = Math.round(angle);
    console.log("compValve",angle)

	// var send = angle * 364.08; //(32767/90derece)
	// send = send.toFixed(0);
	// Plc.writeUint({
	// 	addr: '%QB34',
	// 	strlen: 2,
	// 	val: send,
	// });

	var send = linearConversion(2500, 16383, 0, 90, angle, 0); //(32767/90derece)

   
    socket.emit('writeRegister', JSON.stringify({register: "R01000", value: send}));

}

function drainOn() {
    socket.emit('writeBit', { register: "M0120", value: 1 });
}

function drainOff() {
    socket.emit('writeBit', { register: "M0120", value: 0 });
}

function decompValve(angle) {
	
    angle = Math.round(angle);
    console.log("decompvalve ", angle)

	if (angle > 90) angle = 90;
	if (angle < 0) angle = 0;

	// var send = angle * 364.08; //(32767/90derece)
	// send = send.toFixed(0);
	// Plc.writeUint({
	// 	addr: '%QB38',
	// 	strlen: 2,
	// 	val: send,
	// });

	var send = linearConversion(2500, 16383, 0, 90, angle, 0); //(32767/90derece)

    
    socket.emit('writeRegister', JSON.stringify({register: "R01001", value: send}));

}

function sessionResume(pauseStartTime, pauseEndTime, currentPressure, initialPressure, stepDuration) {
    // Calculate elapsed pause time
    const pauseDuration = pauseEndTime - pauseStartTime;
    
    // Get current step in profile
    const currentStep = sessionStatus.profile[pauseStartTime];
    const nextStep = sessionStatus.profile[pauseStartTime + 1];
    
    if (!currentStep || !nextStep) {
        console.log("Invalid step data for resume");
        return;
    }
    
    const currentDepth = currentStep[1];
    const nextDepth = nextStep[1];
    const depthDifference = nextDepth - currentDepth;
    
    // Handle ascending profile (depth increasing)
    if (depthDifference > 0) {
        const originalDuration = currentStep[0];
        const originalTargetDepth = currentStep[1];
        
        // Calculate slope from previous step
        let slope = 0;
        if (pauseStartTime > 0) {
            const prevStep = sessionStatus.profile[pauseStartTime - 1];
            slope = (originalTargetDepth - prevStep[1]) / originalDuration;
        }
        
        // Calculate time needed to reach target from current position
        const remainingDepthChange = originalTargetDepth - currentPressure;
        const timeToTarget = remainingDepthChange / slope;
        
        // Update current step duration
        sessionStatus.profile[pauseStartTime] = [
            Number((stepDuration / 60).toFixed(4)),
            initialPressure,
            currentStep[2]
        ];
        
        // Insert pause segment
        sessionStatus.profile.splice(pauseStartTime + 1, 0, [
            Number((pauseDuration / 60).toFixed(4)),
            currentPressure,
            'air'
        ]);
        
        // Insert recovery segment to reach original target
        sessionStatus.profile.splice(pauseStartTime + 2, 0, [
            Number(timeToTarget.toFixed(4)),
            originalTargetDepth,
            'air'
        ]);
    }
    // Handle flat profile (same depth)
    else if (depthDifference === 0) {
        const originalDuration = currentStep[0];
        const originalTargetDepth = currentStep[1];
        
        // Calculate slope from first step
        let slope = 0;
        if (sessionStatus.profile[0]) {
            slope = sessionStatus.profile[0][1] / sessionStatus.profile[0][0];
        }
        
        const timeToTarget = (originalTargetDepth - currentPressure) / slope;
        
        // Update current step
        sessionStatus.profile[pauseStartTime] = [
            Number((stepDuration / 60).toFixed(4)),
            initialPressure,
            currentStep[2]
        ];
        
        // Insert pause segment
        sessionStatus.profile.splice(pauseStartTime + 1, 0, [
            Number((pauseDuration / 60).toFixed(4)),
            currentPressure,
            'air'
        ]);
        
        // Insert recovery segment
        sessionStatus.profile.splice(pauseStartTime + 2, 0, [
            Number(Math.abs(timeToTarget).toFixed(4)),
            originalTargetDepth,
            'air'
        ]);
        
        // Insert remaining flat segment
        const remainingFlatTime = originalDuration - (stepDuration / 60);
        sessionStatus.profile.splice(pauseStartTime + 3, 0, [
            Number(Math.abs(remainingFlatTime).toFixed(4)),
            originalTargetDepth,
            currentStep[2]
        ]);
    }
    // Handle descending profile (depth decreasing)
    else if (depthDifference < 0) {
        const originalDuration = currentStep[0];
        const originalTargetDepth = currentStep[1];
        
        // Calculate slope from last decompression step
        let slope = 0;
        const profileLength = sessionStatus.profile.length;
        if (profileLength >= 2) {
            const lastStep = sessionStatus.profile[profileLength - 2];
            const finalStep = sessionStatus.profile[profileLength - 1];
            slope = lastStep[1] / finalStep[0];
        }
        
        const depthChangeNeeded = currentPressure - originalTargetDepth;
        const timeToTarget = depthChangeNeeded / slope;
        
        // Update current step
        sessionStatus.profile[pauseStartTime] = [
            Number((stepDuration / 60).toFixed(4)),
            initialPressure,
            currentStep[2]
        ];
        
        // Insert pause segment
        sessionStatus.profile.splice(pauseStartTime + 1, 0, [
            Number((pauseDuration / 60).toFixed(4)),
            currentPressure,
            'air'
        ]);
        
        // Insert recovery segment
        sessionStatus.profile.splice(pauseStartTime + 2, 0, [
            Number(Math.abs(timeToTarget).toFixed(4)),
            originalTargetDepth,
            currentStep[2]
        ]);
    }
    
    // Reset control variables
    sessionStatus.p2counter = 0;
    sessionStatus.adim = 0;
    
    console.log("Profile updated for session resume:", sessionStatus.profile);
}

function sessionStop() {
    console.log("Session stop initiated at time:", sessionStatus.zaman);
    
    // Set exit mode (equivalent to cikis=3 in PHP)
    sessionStatus.cikis = 3;
    sessionStatus.status = 3;
    sessionStatus.otomanuel = 0;
    
    // Convert profile to hedeflenen array format (depth values only)
    let hedeflenen = [];
    for (let i = 0; i < sessionStatus.profile.length; i++) {
        hedeflenen[i] = sessionStatus.profile[i][1];
    }
    
    const currentTime = sessionStatus.zaman; // baslangic in PHP
    const arraylength = hedeflenen.length;
    
    // Find the last point where profile was ascending or flat
    // (equivalent to finding where $status > 0 || $status == 0 in PHP)
    let breakTime = currentTime;
    for (let i = arraylength - 1; i > 1; i--) {
        const status = hedeflenen[i] - hedeflenen[i - 1];
        if (status > 0 || status == 0) {
            breakTime = i + 1;
            break;
        }
    }
    
    console.log("Break time found at:", breakTime);
    
    // Calculate slope (egim in PHP)
    const egim = hedeflenen[breakTime] - hedeflenen[arraylength - 1];
    
    // Calculate time span (s in PHP)  
    const s = arraylength - breakTime;
    
    // Calculate required decompression time (gerekensure in PHP)
    const currentPressure = hedeflenen[currentTime - 1] || sessionStatus.main_fsw;
    const gerekensure = Math.round(currentPressure / (egim / s));
    
    console.log("Calculated decompression parameters:", {
        egim: egim,
        timeSpan: s,
        currentPressure: currentPressure,
        requiredTime: gerekensure
    });
    
    // Create new decompression profile
    let m = currentPressure;
    const slopePerSecond = egim / s;
    
    // Clear the profile from current time onwards
    sessionStatus.profile = sessionStatus.profile.slice(0, currentTime);
    
    // Generate smooth decompression to surface
    for (let i = currentTime; i <= currentTime + gerekensure; i++) {
        m = m - slopePerSecond;
        if (m < 0) m = 0;
        
        // Add to profile in [duration, depth, gas] format
        sessionStatus.profile[i] = [
            Number((1/60).toFixed(4)), // 1 second duration converted to minutes
            Number(m.toFixed(2)), 
            'air'
        ];
    }
    
    // Ensure final point is exactly 0
    if (sessionStatus.profile.length > 0) {
        const lastIndex = sessionStatus.profile.length - 1;
        sessionStatus.profile[lastIndex][1] = 0;
    }
    
    console.log("Updated profile for emergency stop:", sessionStatus.profile.slice(currentTime - 5, currentTime + 10));
    
    // Set exit flag for valve control
    sessionStatus.cikis = 1;
    
    alarmSet('sessionStop', 'Emergency session stop initiated. Decompressing to surface.', 0);
}

