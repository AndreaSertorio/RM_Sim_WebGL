// Rendi 'db' una variabile globale se vuoi. Oppure lasciala così.
var db;

// Definisci openDB come globale (se serve), oppure lascialo interno:
function openDB() {
    let request = indexedDB.open("MRISimulatorDB", 1);
    request.onupgradeneeded = function(event) {
        db = event.target.result;
        if (!db.objectStoreNames.contains("protocols")) {
            db.createObjectStore("protocols", { keyPath: "name" });
        }
        if (!db.objectStoreNames.contains("sequences")) {
            db.createObjectStore("sequences", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("quiz")) {
            db.createObjectStore("quiz", { keyPath: "questionText" });
        }
    };
    request.onsuccess = function(event) {
        db = event.target.result;
        console.log("IndexedDB aperto con successo.");
        // Chiama la funzione window.checkAndLoadDefaults, definita sotto
        window.checkAndLoadDefaults();
    };
    request.onerror = function(event) {
        console.error("Errore nell'apertura del database: ", event.target.errorCode);
    };
}

// ------------------------------------------------------------------------
// 1) Definisci checkAndLoadDefaults come window.checkAndLoadDefaults
// ------------------------------------------------------------------------
window.checkAndLoadDefaults = function() {
    if (!db) {
        console.error("Database non aperto, impossibile checkAndLoadDefaults!");
        return;
    }
    let transaction = db.transaction(["protocols", "sequences", "quiz"], "readonly");
    let protocolStore = transaction.objectStore("protocols");
    let sequenceStore = transaction.objectStore("sequences");
    let quizStore = transaction.objectStore("quiz");

    let protocolRequest = protocolStore.getAll();
    let sequenceRequest = sequenceStore.getAll();
    let quizRequest = quizStore.getAll();

    protocolRequest.onsuccess = function() {
        if (protocolRequest.result.length === 0) {
            console.log("Caricamento protocolli default...");
            loadDefaultsFromJSON("MRIProtocolData.json", "protocols");
        }
    };

    sequenceRequest.onsuccess = function() {
        if (sequenceRequest.result.length === 0) {
            console.log("Caricamento sequenze default...");
            loadDefaultsFromJSON("MRISequenceData.json", "sequences");
        }
    };

    quizRequest.onsuccess = function() {
        if (quizRequest.result.length === 0) {
            console.log("Caricamento quiz default...");
            loadDefaultsFromJSON("quiz_data.json", "quiz");
        }
    };
};

// ------------------------------------------------------------------------
// 2) Se vuoi, definisci una clearAllData
// ------------------------------------------------------------------------
window.clearAllData = function() {
    if (!db) {
        console.error("Database non aperto, impossibile clearAllData!");
        return;
    }
    console.log("clearAllData: pulizia di 'protocols' e 'sequences'...");
    let transaction = db.transaction(["protocols","sequences"], "readwrite");
    let protocolsStore = transaction.objectStore("protocols");
    let sequencesStore = transaction.objectStore("sequences");
    protocolsStore.clear();
    sequencesStore.clear();

    transaction.oncomplete = function() {
        console.log("IndexedDB: data cleared, ricarico i default...");
        // Richiamiamo la load
        window.checkAndLoadDefaults();
    };
};

// ------------------------------------------------------------------------
// 3) Helper: loadDefaultsFromJSON (rimane uguale, basta che non sia window.*? a scelta)
// ------------------------------------------------------------------------
function loadDefaultsFromJSON(filename, storeName) {
    fetch("StreamingAssets/" + filename)
        .then(response => response.json())
        .then(data => {
            let transaction = db.transaction([storeName], "readwrite");
            let store = transaction.objectStore(storeName);
            if (Array.isArray(data)) {
                data.forEach(item => store.put(item));
            } else if (data.protocols) {
                data.protocols.forEach(item => store.put(item));
            } else if (data.sequences) {
                data.sequences.forEach(item => store.put(item));
            }
            console.log(`${storeName} inizializzato con dati default.`);
        })
        .catch(error => console.error(`Errore nel caricamento di ${filename}:`, error));
}

// ------------------------------------------------------------------------
// 4) Definisci saveData come window.saveData
// ------------------------------------------------------------------------
window.saveData = function(storeName, key, jsonData) {
    if (!db) {
        console.error("Database non aperto!");
        return;
    }
    let transaction = db.transaction([storeName], "readwrite");
    let store = transaction.objectStore(storeName);
    let request = store.put({ key: key, data: JSON.parse(jsonData) });

    request.onsuccess = function() {
        console.log(`${storeName}: dato salvato con successo!`);
    };
    request.onerror = function(event) {
        console.error(`Errore nel salvataggio in ${storeName}:`, event.target.errorCode);
    };
};

// ------------------------------------------------------------------------
// 5) Definisci loadData come window.loadData
// ------------------------------------------------------------------------
window.loadData = function(storeName, key, gameObject, callbackMethod) {
    if (!db) {
        console.error("Database non aperto!");
        return;
    }
    let transaction = db.transaction([storeName], "readonly");
    let store = transaction.objectStore(storeName);
    let request = store.get(key);

    request.onsuccess = function() {
        if (request.result) {
            unityInstance.SendMessage(gameObject, callbackMethod, JSON.stringify(request.result.data));
        } else {
            unityInstance.SendMessage(gameObject, callbackMethod, "{}");
        }
    };
    request.onerror = function(event) {
        console.error(`Errore nel caricamento da ${storeName}:`, event.target.errorCode);
    };
};

// Apri il database
openDB();
